use crate::models::{CurrentTrack, PlaybackState, QueueItem, Track};
use crate::state::AppState;
use log::{error, info};
use mpd_client::commands;
use mpd_client::commands::SongPosition;
use mpd_client::responses::{PlayState, SongInQueue};
use mpd_client::tag::Tag;
use std::path::Path;

pub async fn add_file_to_mpd(state: &AppState, filename: &str) -> Result<(), String> {
    let client = state.mpd_client.lock().await;
    
    client
        .command(commands::Update::new())
        .await
        .map_err(|e| format!("Failed to update MPD database: {}", e))?;
    
    // Wait a bit for the database to update
    tokio::time::sleep(tokio::time::Duration::from_millis(500)).await;
    
    client
        .command(commands::Add::uri(filename))
        .await
        .map_err(|e| format!("Failed to add file to queue: {}", e))?;
    
    // Auto-play if not already playing
    let status = client
        .command(commands::Status)
        .await
        .map_err(|e| format!("Failed to get status: {}", e))?;
        
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
    
    let mut items = Vec::new();
    for (pos, song) in queue.into_iter().enumerate() {
        let track = song_in_queue_to_track(&song, state).await;
        items.push(QueueItem {
            position: pos as u32,
            track,
        });
    }
    
    Ok(items)
}


async fn song_in_queue_to_track(song: &SongInQueue, state: &AppState) -> Track {
    let filename = song.song.url.to_string();
    let file_stem = Path::new(&filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(&filename);
    
    // Extract the UUID part from the filename (format: {uuid}_{original_filename})
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
    
    // Otherwise, extract from MPD tags
    Track {
        id: track_id.clone(),
        filename: filename.clone(),
        title: song.song.tags.get(&Tag::Title).and_then(|t| t.first()).map(|s| s.to_string()),
        artist: song.song.tags.get(&Tag::Artist).and_then(|t| t.first()).map(|s| s.to_string()),
        album: song.song.tags.get(&Tag::Album).and_then(|t| t.first()).map(|s| s.to_string()),
        duration: song.song.duration.map(|d| d.as_secs_f64()),
        added_by: "Unknown".to_string(),
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
    tokio::spawn(async move {
        loop {
            tokio::time::sleep(tokio::time::Duration::from_secs(2)).await;
            
            match get_current_track(&state).await {
                Ok(current) => {
                    // Check if playlist has ended (stopped state with no current track but queue has items)
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
                                            error!("Failed to restart playlist: {}", e);
                                        } else {
                                            info!("Playlist ended, restarting from beginning");
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

