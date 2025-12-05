use crate::models::{CurrentTrack, PlaybackState, QueueItem, Track};
use crate::state::AppState;
use log::{error, info, warn};
use mpd_client::commands;
use mpd_client::commands::SongPosition;
use mpd_client::responses::{PlayState, SongInQueue};
use mpd_client::tag::Tag;
use std::path::Path;

/// Remove the last track from the MPD queue
/// If delete_file is true, also deletes the file from disk
pub async fn remove_last_track_from_queue(state: &AppState, delete_file: bool) -> Result<Option<String>, String> {
    let client = state.mpd_client.lock().await;
    
    // Get the queue
    let queue = client
        .command(commands::Queue)
        .await
        .map_err(|e| format!("Failed to get queue: {}", e))?;
    
    if let Some((last_pos, last_song)) = queue.iter().enumerate().last() {
        let filename = last_song.song.url.to_string();
        info!("Removing last track from queue: {} (position {})", filename, last_pos);
        
        // Remove the track from the queue
        client
            .command(commands::Delete::position(SongPosition(last_pos)))
            .await
            .map_err(|e| format!("Failed to remove track from queue: {}", e))?;
        
        // Also remove from metadata
        let track_id = {
            let file_stem = Path::new(&filename)
                .file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or(&filename);
            
            file_stem
                .split('_')
                .next()
                .unwrap_or(file_stem)
                .to_string()
        };
        
        {
            let mut metadata = state.tracks_metadata.write().await;
            metadata.remove(&track_id);
        }
        
        // Optionally delete the file from disk
        if delete_file {
            let file_path = Path::new("uploads").join(&filename);
            if let Err(e) = std::fs::remove_file(&file_path) {
                warn!("Failed to delete file {:?}: {}", file_path, e);
            } else {
                info!("Deleted file from disk: {:?}", file_path);
            }
        }
        
        // Notify clients of queue update
        drop(client); // Release lock before async call
        let queue_update = serde_json::json!({
            "type": "queue_update",
            "data": {}
        });
        state.broadcast_message(&queue_update.to_string()).await;
        
        Ok(Some(filename))
    } else {
        warn!("Queue is empty, cannot remove last track");
        Ok(None)
    }
}

pub async fn add_file_to_mpd(state: &AppState, filename: &str) -> Result<(), String> {
    let client = state.mpd_client.lock().await;
    
    client
        .command(commands::Update::new())
        .await
        .map_err(|e| format!("Failed to update MPD database: {}", e))?;
    
    // Wait a bit for the database to update
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    // Get current status and current song to determine where to insert the track
    let status = client
        .command(commands::Status)
        .await
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    // Get the queue BEFORE adding to find current song position
    let queue_before = client
        .command(commands::Queue)
        .await
        .map_err(|e| format!("Failed to get queue: {}", e))?;
    
    // Get current song to find its position in the queue
    let current_song = client.command(commands::CurrentSong).await.ok().flatten();
    
    // Determine the target position: right after current song, or 0 if nothing is playing
    let target_position = if let Some(song) = current_song {
        // Find the position of the current song in the queue
        match queue_before.iter().position(|s| s.id == song.id) {
            Some(current_pos) => {
                info!("Current song at position {}, target position will be {}", current_pos, current_pos + 1);
                // Insert right after the currently playing track
                current_pos + 1
            }
            None => {
                warn!("Current song not found in queue, inserting at position 0");
                0
            }
        }
    } else {
        // Nothing is playing, insert at the beginning
        info!("No current song, inserting at position 0");
        0
    };
    
    // Add the track to the queue (it will be added at the end initially)
    client
        .command(commands::Add::uri(filename))
        .await
        .map_err(|e| format!("Failed to add file to queue: {}", e))?;
    
    // Get the queue again to find the newly added track
    let queue_after = client
        .command(commands::Queue)
        .await
        .map_err(|e| format!("Failed to get queue: {}", e))?;
    
    info!("Queue length before: {}, after: {}", queue_before.len(), queue_after.len());
    
    // Find the newly added track (it should be at the end)
    if let Some((last_pos, last_song)) = queue_after.iter().enumerate().last() {
        // Check if this is the track we just added by matching the filename
        let song_filename = last_song.song.url.to_string();
        if song_filename == filename {
            let last_position = last_pos;
            
            info!("Found new track at position {}, target position: {}", last_position, target_position);
            
            // Only move if it's not already at the target position
            // Ensure target position is within valid bounds (0 to queue length)
            let valid_target = target_position.min(queue_after.len());
            
            if last_position != valid_target {
                info!("Moving track from position {} to position {}", last_position, valid_target);
                // Move the track to the target position using the song ID
                client
                    .command(
                        commands::Move::id(last_song.id)
                            .to_position(SongPosition(valid_target))
                    )
                    .await
                    .map_err(|e| {
                        error!("Failed to move track: {}", e);
                        format!("Failed to move track to next position: {}", e)
                    })?;
                
                // Verify the move worked by checking the queue again
                let queue_verify = client
                    .command(commands::Queue)
                    .await
                    .map_err(|e| format!("Failed to verify queue after move: {}", e))?;
                
                if let Some((verify_pos, _)) = queue_verify.iter().enumerate().find(|(_, s)| s.id == last_song.id) {
                    if verify_pos == valid_target {
                        info!("Successfully moved track to position {} (next track)", valid_target);
                    } else {
                        warn!("Move command completed but track is at position {} instead of {}", verify_pos, valid_target);
                    }
                } else {
                    warn!("Could not verify track position after move");
                }
            } else {
                info!("Track already at target position {}", valid_target);
            }
        } else {
            warn!("Could not find newly added track by filename: {}", filename);
        }
    } else {
        warn!("Queue is empty after adding track");
    }
    
    // Auto-play if not already playing
    if status.state == PlayState::Stopped {
        client
            .command(commands::Play::current())
            .await
            .map_err(|e| format!("Failed to start playback: {}", e))?;
        info!("Started playback");
    }
    
    Ok(())
}

pub async fn get_current_track(state: &AppState) -> Result<CurrentTrack, String> {
    let client = state.mpd_client.lock().await;
    
    let status = client
        .command(commands::Status)
        .await
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    let playback_state = match status.state {
        PlayState::Playing => PlaybackState::Playing,
        PlayState::Paused => PlaybackState::Paused,
        PlayState::Stopped => PlaybackState::Stopped,
    };
    
    if let Some(song) = client.command(commands::CurrentSong).await.ok().flatten() {
        let track = song_in_queue_to_track(&song, state).await;
        Ok(CurrentTrack {
            track: Some(track),
            elapsed: status.elapsed.map(|d| d.as_secs_f64()),
            state: playback_state,
        })
    } else {
        Ok(CurrentTrack {
            track: None,
            elapsed: None,
            state: playback_state,
        })
    }
}

pub async fn get_queue(state: &AppState) -> Result<Vec<QueueItem>, String> {
    let client = state.mpd_client.lock().await;
    
    let queue = client
        .command(commands::Queue)
        .await
        .map_err(|e| format!("Failed to get queue: {}", e))?;
    
    // Get current song to determine which tracks are "coming up"
    let current_song = client.command(commands::CurrentSong).await.ok().flatten();
    
    // Find the current song's position in the queue
    let current_position = if let Some(song) = current_song {
        queue.iter()
            .position(|s| s.id == song.id)
            .map(|p| p + 1) // Next position after current
            .unwrap_or(0)
    } else {
        // No current song, show all tracks starting from position 0
        0
    };
    
    // Filter to only show tracks that come after the current one
    // and re-index them starting from 1 (next track)
    let mut items = Vec::new();
    let mut coming_up_index = 1u32;
    
    for (pos, song) in queue.into_iter().enumerate() {
        // Only include tracks that come after the current position
        if pos >= current_position {
            let track = song_in_queue_to_track(&song, state).await;
            items.push(QueueItem {
                position: coming_up_index, // Re-index: 1 = next, 2 = after next, etc.
                track,
            });
            coming_up_index += 1;
        }
    }
    
    Ok(items)
}


/// Extract username from filename
/// Expected format: {uuid}_{username}_{original_filename}
fn extract_username_from_filename(filename: &str) -> Option<String> {
    let file_stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(filename);
    
    // Split by underscore with limit 3 to get: [uuid, username, rest_of_filename]
    // Format: {uuid}_{username}_{original_filename}
    let parts: Vec<&str> = file_stem.splitn(3, '_').collect();
    
    if parts.len() >= 3 {
        let username = parts[1].trim();
        if !username.is_empty() {
            return Some(username.to_string());
        }
    }
    
    None
}

/// Parse artist and title from filename
/// Expected format: {uuid}_{username}_{Artist} - {Title}.mp3
fn parse_metadata_from_filename(filename: &str) -> (Option<String>, Option<String>) {
    // Remove file extension
    let file_stem = Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(filename);
    
    // Remove UUID and username prefix (first two parts separated by underscores)
    // Format: {uuid}_{username}_{original_filename}
    let name_part = file_stem
        .splitn(3, '_')
        .nth(2)
        .unwrap_or(file_stem);
    
    // Try to split on " - " pattern (space-dash-space)
    if let Some(dash_pos) = name_part.find(" - ") {
        let artist = name_part[..dash_pos].trim();
        let title = name_part[dash_pos + 3..].trim();
        
        // Remove leading numbers and dots from artist (e.g., "01 - " or "20. ")
        let clean_artist = artist
            .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == ' ')
            .trim();
        
        (
            if clean_artist.is_empty() { None } else { Some(clean_artist.to_string()) },
            if title.is_empty() { None } else { Some(title.to_string()) }
        )
    } else {
        // No " - " pattern found, use entire name as title
        let clean_name = name_part
            .trim_start_matches(|c: char| c.is_ascii_digit() || c == '.' || c == ' ')
            .trim();
        (None, if clean_name.is_empty() { None } else { Some(clean_name.to_string()) })
    }
}

async fn song_in_queue_to_track(song: &SongInQueue, state: &AppState) -> Track {
    let filename = song.song.url.to_string();
    let file_stem = Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&filename);
    
    // Extract the UUID part from the filename (format: {uuid}_{username}_{original_filename})
    let track_id = file_stem
        .split('_')
        .next()
        .unwrap_or(file_stem)
        .to_string();
    
    // Try to get metadata from our stored data
    let metadata = state.tracks_metadata.read().await;
    if let Some(stored_track) = metadata.get(&track_id) {
        return stored_track.clone();
    }
    
    // Extract from MPD tags first
    let mut title = song.song.tags.get(&Tag::Title).and_then(|t| t.first()).map(|s| s.to_string());
    let mut artist = song.song.tags.get(&Tag::Artist).and_then(|t| t.first()).map(|s| s.to_string());
    
    // If metadata is missing, try to parse from filename
    if title.is_none() || artist.is_none() {
        let (parsed_artist, parsed_title) = parse_metadata_from_filename(&filename);
        if title.is_none() {
            title = parsed_title;
        }
        if artist.is_none() {
            artist = parsed_artist;
        }
    }
    
    // Extract uploader name from filename if not in metadata
    let added_by = extract_username_from_filename(&filename)
        .unwrap_or_else(|| "Unknown".to_string());
    
    Track {
        id: track_id.clone(),
        filename: filename.clone(),
        title,
        artist,
        album: song.song.tags.get(&Tag::Album).and_then(|t| t.first()).map(|s| s.to_string()),
        duration: song.song.duration.map(|d| d.as_secs_f64()),
        added_by,
        added_at: chrono::Utc::now(),
    }
}

pub async fn start_playback(state: &AppState) -> Result<(), String> {
    let client = state.mpd_client.lock().await;
    
    let status = client
        .command(commands::Status)
        .await
        .map_err(|e| format!("Failed to get status: {}", e))?;
    
    match status.state {
        PlayState::Stopped => {
            client
                .command(commands::Play::current())
                .await
                .map_err(|e| format!("Failed to start playback: {}", e))?;
            info!("Started playback");
        }
        PlayState::Paused => {
            client
                .command(commands::Play::current())
                .await
                .map_err(|e| format!("Failed to resume playback: {}", e))?;
            info!("Resumed playback");
        }
        PlayState::Playing => {
            // Already playing
        }
    }
    
    Ok(())
}

pub async fn start_mpd_monitor(state: AppState) {
    use crate::api::upload::{get_max_total_storage, get_uploads_directory_size};
    
    tokio::spawn(async move {
        let mut previous_track_filename: Option<String> = None;
        
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            match get_current_track(&state).await {
                Ok(current) => {
                    // Get the current song to detect changes
                    let client = state.mpd_client.lock().await;
                    let current_song = client.command(commands::CurrentSong).await.ok().flatten();
                    let current_track_filename = current_song.as_ref()
                        .map(|s| s.song.url.to_string());
                    
                    // Check if song has changed (track finished playing)
                    if let (Some(prev_filename), Some(curr_filename)) = (previous_track_filename.as_ref(), current_track_filename.as_ref()) {
                        if prev_filename != curr_filename {
                            // Song has changed, move the previous song to the end
                            info!("Song changed from {} to {}, moving previous track to end", prev_filename, curr_filename);
                            
                            // Get the queue to find the previous song by filename
                            if let Ok(queue) = client.command(commands::Queue).await {
                                if let Some((_, prev_song)) = queue.iter().enumerate().find(|(_, s)| s.song.url.to_string() == *prev_filename) {
                                    let prev_song_id = prev_song.id;
                                    // Check storage space to determine if we should keep the track in queue
                                    let max_storage = get_max_total_storage();
                                    let current_size = get_uploads_directory_size().unwrap_or(0);
                                    
                                    // Only move to end if there's remaining storage space
                                    // If storage is full, the track will stay in its current position
                                    if current_size < max_storage {
                                        // Move the previous song to the end of the queue
                                        let queue_len = queue.len();
                                        let prev_pos_in_queue = queue.iter().position(|s| s.id == prev_song_id).unwrap_or(0);
                                        if prev_pos_in_queue < queue_len - 1 {
                                            // Only move if it's not already at the end
                                            if let Err(e) = client.command(
                                                commands::Move::id(prev_song_id)
                                                    .to_position(SongPosition(queue_len - 1))
                                            ).await {
                                                error!("Failed to move completed track to end: {}", e);
                                            } else {
                                                info!("Moved completed track to end of queue (storage: {}/{} bytes)", current_size, max_storage);
                                                // Notify clients of queue update
                                                let queue_update = serde_json::json!({
                                                    "type": "queue_update",
                                                    "data": {}
                                                });
                                                drop(client); // Release lock before async call
                                                state.broadcast_message(&queue_update.to_string()).await;
                                                continue; // Skip the rest of this iteration
                                            }
                                        }
                                    } else {
                                        info!("Storage full ({}/{} bytes), keeping track in current position", current_size, max_storage);
                                    }
                                }
                            }
                        }
                    }
                    
                    // Update previous track filename
                    previous_track_filename = current_track_filename;
                    drop(client);
                    
                    // Check if queue playback has ended (stopped state with no current track but queue has items)
                    if current.state == PlaybackState::Stopped && current.track.is_none() {
                        // Check if there are tracks in the queue and restart from the beginning
                        {
                            let client = state.mpd_client.lock().await;
                            let queue = client
                                .command(commands::Queue)
                                .await;
                            
                            match queue {
                                Ok(queue_vec) => {
                                    if !queue_vec.is_empty() {
                                        // Play the first song (position 0)
                                        if let Err(e) = client.command(commands::Play::song(SongPosition(0))).await {
                                            error!("Failed to restart queue: {}", e);
                                        } else {
                                            info!("Queue playback ended, restarting from beginning");
                                        }
                                    }
                                }
                                Err(e) => {
                                    error!("Failed to get queue: {}", e);
                                }
                            }
                        }
                        // Get updated current track after restart
                        if let Ok(updated_current) = get_current_track(&state).await {
                            let message = serde_json::json!({
                                "type": "current_track",
                                "data": updated_current
                            });
                            state.broadcast_message(&message.to_string()).await;
                            continue;
                        }
                    }
                    
                    let message = serde_json::json!({
                        "type": "current_track",
                        "data": current
                    });
                    state.broadcast_message(&message.to_string()).await;
                }
                Err(e) => {
                    error!("Failed to get current track: {}", e);
                }
            }
        }
    });
}

