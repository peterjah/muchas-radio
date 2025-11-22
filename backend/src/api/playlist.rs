use actix_web::{get, post, web, HttpResponse, Result};
use log::error;

use crate::models::AddToQueueRequest;
use crate::mpd_manager::{add_file_to_mpd, get_current_track, get_queue};
use crate::state::AppState;

#[get("/api/current")]
pub async fn get_current(state: web::Data<AppState>) -> Result<HttpResponse> {
    match get_current_track(&state).await {
        Ok(current) => Ok(HttpResponse::Ok().json(current)),
        Err(e) => {
            error!("Failed to get current track: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e
            })))
        }
    }
}

#[get("/api/queue")]
pub async fn get_queue_list(state: web::Data<AppState>) -> Result<HttpResponse> {
    match get_queue(&state).await {
        Ok(queue) => Ok(HttpResponse::Ok().json(queue)),
        Err(e) => {
            error!("Failed to get queue: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e
            })))
        }
    }
}

#[post("/api/queue/add")]
pub async fn add_to_queue(
    state: web::Data<AppState>,
    request: web::Json<AddToQueueRequest>,
) -> Result<HttpResponse> {
    // Find the track in metadata
    let metadata = state.tracks_metadata.read().await;
    let track = match metadata.get(&request.track_id) {
        Some(t) => t.clone(),
        None => {
            return Ok(HttpResponse::NotFound().json(serde_json::json!({
                "error": "Track not found"
            })));
        }
    };
    
    match add_file_to_mpd(&state, &track.filename).await {
        Ok(_) => {
            // Notify via WebSocket
            let queue_update = serde_json::json!({
                "type": "queue_update",
                "data": {}
            });
            state.broadcast_message(&queue_update.to_string()).await;
            
            Ok(HttpResponse::Ok().json(serde_json::json!({
                "success": true
            })))
        }
        Err(e) => {
            error!("Failed to add to queue: {}", e);
            Ok(HttpResponse::InternalServerError().json(serde_json::json!({
                "error": e
            })))
        }
    }
}

