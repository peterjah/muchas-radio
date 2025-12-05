use actix_multipart::Multipart;
use actix_web::{post, web, HttpRequest, HttpResponse, Result};
use futures::{StreamExt, TryStreamExt};
use log::{error, info, warn};
use std::io::Write;
use std::path::PathBuf;
use uuid::Uuid;

use crate::models::{Track, UploadResponse};
use crate::mpd_manager::{add_file_to_mpd, remove_last_track_from_queue};
use crate::state::AppState;

const MAX_FILE_SIZE: usize = 100 * 1024 * 1024; // 100 MB
const DEFAULT_MAX_TOTAL_STORAGE: u64 = 300 * 1024 * 1024; // 300 MB default total storage limit

/// Get the maximum total storage size from environment variable or use default
/// Environment variable: MAX_TOTAL_STORAGE (in bytes, or with suffix like "500MB", "1GB")
pub fn get_max_total_storage() -> u64 {
    match std::env::var("MAX_TOTAL_STORAGE") {
        Ok(val) => {
            // Try to parse as number with optional suffix
            let val = val.trim().to_uppercase();
            if let Some(mb_pos) = val.find("MB") {
                if let Ok(num) = val[..mb_pos].trim().parse::<u64>() {
                    return num * 1024 * 1024;
                }
            } else if let Some(gb_pos) = val.find("GB") {
                if let Ok(num) = val[..gb_pos].trim().parse::<u64>() {
                    return num * 1024 * 1024 * 1024;
                }
            } else if let Ok(num) = val.parse::<u64>() {
                return num;
            }
            warn!("Invalid MAX_TOTAL_STORAGE format: '{}', using default", val);
            DEFAULT_MAX_TOTAL_STORAGE
        }
        Err(_) => DEFAULT_MAX_TOTAL_STORAGE,
    }
}

/// Calculate the total size of all files in the uploads directory
pub fn get_uploads_directory_size() -> std::io::Result<u64> {
    let uploads_dir = PathBuf::from("uploads");
    let mut total_size = 0u64;
    
    if uploads_dir.exists() && uploads_dir.is_dir() {
        for entry in std::fs::read_dir(uploads_dir)? {
            let entry = entry?;
            let metadata = entry.metadata()?;
            if metadata.is_file() {
                total_size += metadata.len();
            }
        }
    }
    
    Ok(total_size)
}

/// Get the oldest file in the uploads directory (by modification time)
fn get_oldest_file() -> std::io::Result<Option<PathBuf>> {
    let uploads_dir = PathBuf::from("uploads");
    let mut oldest_file: Option<(PathBuf, std::time::SystemTime)> = None;
    
    if uploads_dir.exists() && uploads_dir.is_dir() {
        for entry in std::fs::read_dir(uploads_dir)? {
            let entry = entry?;
            let path = entry.path();
            
            // Skip .gitkeep and other hidden files
            if let Some(filename) = path.file_name() {
                if filename.to_string_lossy().starts_with('.') {
                    continue;
                }
            }
            
            let metadata = entry.metadata()?;
            if metadata.is_file() {
                let modified = metadata.modified()?;
                
                match &oldest_file {
                    None => oldest_file = Some((path, modified)),
                    Some((_, oldest_time)) => {
                        if modified < *oldest_time {
                            oldest_file = Some((path, modified));
                        }
                    }
                }
            }
        }
    }
    
    Ok(oldest_file.map(|(path, _)| path))
}

/// Try to free up space by deleting oldest files until there's enough room
fn free_up_space(needed_size: usize) -> std::io::Result<bool> {
    let max_storage = get_max_total_storage();
    let mut freed = 0u64;
    let current_size = get_uploads_directory_size()?;
    let needed_total = needed_size as u64;
    
    // If already enough space, no need to delete
    if current_size + needed_total <= max_storage {
        return Ok(true);
    }
    
    let to_free = (current_size + needed_total) - max_storage;
    
    info!("Need to free up {} bytes to accommodate new upload", to_free);
    
    // Keep deleting oldest files until we have enough space
    while freed < to_free {
        match get_oldest_file()? {
            Some(path) => {
                let file_size = std::fs::metadata(&path)?.len();
                
                info!("Deleting old file to free space: {:?} ({} bytes)", path, file_size);
                
                if let Err(e) = std::fs::remove_file(&path) {
                    error!("Failed to delete file {:?}: {}", path, e);
                    return Ok(false);
                }
                
                freed += file_size;
            }
            None => {
                warn!("No more files to delete but still need {} bytes", to_free - freed);
                return Ok(false);
            }
        }
    }
    
    info!("Successfully freed {} bytes", freed);
    Ok(true)
}

#[post("/api/upload")]
pub async fn upload_music(
    mut payload: Multipart,
    state: web::Data<AppState>,
    req: HttpRequest,
) -> Result<HttpResponse> {
    let username = extract_username(&req);
    
    while let Ok(Some(mut field)) = payload.try_next().await {
        let content_disposition = field.content_disposition();
        
        if let Some(filename) = content_disposition.and_then(|cd| cd.get_filename()) {
            // Validate file extension
            let extension = std::path::Path::new(filename)
                .extension()
                .and_then(|s| s.to_str())
                .unwrap_or("");
            
            if !["mp3", "flac", "ogg", "m4a", "wav"].contains(&extension.to_lowercase().as_str()) {
                return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                    "error": "Invalid file type. Supported formats: mp3, flac, ogg, m4a, wav"
                })));
            }
            
            // Check storage limit and free up space if needed
            let max_storage = get_max_total_storage();
            let current_size = get_uploads_directory_size().unwrap_or(0);
            
            // Check if we need to remove the last track from queue
            // This happens when storage is at or near maximum
            if current_size >= max_storage {
                info!("Storage at maximum ({} / {} bytes), removing last track from queue and deleting file", current_size, max_storage);
                if let Err(e) = remove_last_track_from_queue(&state, true).await {
                    warn!("Failed to remove last track from queue: {}", e);
                }
            }
            
            match free_up_space(MAX_FILE_SIZE) {
                Ok(true) => {
                    let current_size = get_uploads_directory_size().unwrap_or(0);
                    info!("Storage check passed. Current size: {} MB / {} MB", 
                          current_size / 1024 / 1024, 
                          max_storage / 1024 / 1024);
                }
                Ok(false) => {
                    // Try removing last track from queue (and deleting file) as a last resort
                    info!("Unable to free up enough space, removing last track from queue and deleting file");
                    if let Err(e) = remove_last_track_from_queue(&state, true).await {
                        warn!("Failed to remove last track from queue: {}", e);
                    }
                    
                    // Try freeing space again after removing from queue
                    match free_up_space(MAX_FILE_SIZE) {
                        Ok(true) => {
                            info!("Successfully freed space after removing track from queue");
                        }
                        Ok(false) | Err(_) => {
                            error!("Unable to free up enough space for upload even after removing track from queue");
                            return Ok(HttpResponse::InsufficientStorage().json(serde_json::json!({
                                "error": format!("Storage limit reached ({}MB). Unable to free up space for new upload.", max_storage / 1024 / 1024)
                            })));
                        }
                    }
                }
                Err(e) => {
                    error!("Error checking storage: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Error checking storage availability"
                    })));
                }
            }
            
            // Generate unique ID and sanitize filename
            let track_id = Uuid::new_v4().to_string();
            let sanitized_filename = sanitize_filename::sanitize(filename);
            let final_filename = format!("{}_{}", track_id, sanitized_filename);
            let filepath = PathBuf::from("uploads").join(&final_filename);
            
            info!("Uploading file: {} as {}", filename, final_filename);
            
            // Create file
            let mut file = match std::fs::File::create(&filepath) {
                Ok(f) => f,
                Err(e) => {
                    error!("Failed to create file: {}", e);
                    return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                        "error": "Failed to save file"
                    })));
                }
            };
            
            let mut total_size = 0usize;
            
            // Read and write file chunks
            while let Some(chunk) = field.next().await {
                let data = chunk.map_err(|e| {
                    error!("Error reading chunk: {}", e);
                    actix_web::error::ErrorInternalServerError("Error reading file")
                })?;
                
                total_size += data.len();
                if total_size > MAX_FILE_SIZE {
                    let _ = std::fs::remove_file(&filepath);
                    return Ok(HttpResponse::BadRequest().json(serde_json::json!({
                        "error": "File too large (max 100MB)"
                    })));
                }
                
                file.write_all(&data).map_err(|e| {
                    error!("Error writing file: {}", e);
                    actix_web::error::ErrorInternalServerError("Error saving file")
                })?;
            }
            
            info!("File saved successfully: {}", final_filename);
            
            // Store metadata
            let track = Track {
                id: track_id.clone(),
                filename: final_filename.clone(),
                title: Some(sanitized_filename.clone()),
                artist: None,
                album: None,
                duration: None,
                added_by: username.clone(),
                added_at: chrono::Utc::now(),
            };
            
            {
                let mut metadata = state.tracks_metadata.write().await;
                metadata.insert(track_id.clone(), track);
            }
            
            // Add to MPD queue
            if let Err(e) = add_file_to_mpd(&state, &final_filename).await {
                error!("Failed to add file to MPD: {}", e);
                return Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                    "error": format!("File uploaded but failed to add to queue: {}", e)
                })));
            }
            
            // Notify via WebSocket
            let queue_update = serde_json::json!({
                "type": "queue_update",
                "data": {}
            });
            state.broadcast_message(&queue_update.to_string()).await;
            
            return Ok(HttpResponse::Ok().json(UploadResponse {
                success: true,
                track_id,
                filename: final_filename,
            }));
        }
    }
    
    Ok(HttpResponse::BadRequest().json(serde_json::json!({
        "error": "No file provided"
    })))
}

fn extract_username(req: &HttpRequest) -> String {
    req.headers()
        .get("X-Username")
        .and_then(|v| v.to_str().ok())
        .map(|s| s.to_string())
        .unwrap_or_else(|| "Anonymous".to_string())
}

