use actix_web::{get, web, HttpRequest, HttpResponse, Result};
use actix_ws::Message;
use futures::StreamExt;
use log::{error, info};
use uuid::Uuid;
use tokio::time::{interval, Duration};
use tokio_stream::wrappers::IntervalStream;

use crate::state::{AppState, SessionWrapper};
use crate::mpd_manager::get_queue;

#[get("/api/ws")]
pub async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse> {
    // Check connection limit before accepting
    const MAX_CONNECTIONS: usize = 100;
    let current_count = state.get_session_count().await;
    if current_count >= MAX_CONNECTIONS {
        error!("WebSocket connection limit reached: {}/{}", current_count, MAX_CONNECTIONS);
        return Ok(HttpResponse::ServiceUnavailable()
            .json(serde_json::json!({"error": "Too many connections"})));
    }
    
    let (response, mut session, msg_stream) = actix_ws::handle(&req, body)?;
    
    let session_id = Uuid::new_v4();
    info!("WebSocket connection established: {} (total: {})", session_id, current_count + 1);
    
    // Add session to state with unique ID
    {
        let mut sessions = state.ws_sessions.lock().await;
        sessions.push(SessionWrapper {
            id: session_id,
            session: session.clone(),
        });
    }
    
    // Spawn single task to handle both incoming messages and periodic pings
    let state_clone = state.get_ref().clone();
    actix_web::rt::spawn(async move {
        let mut msg_stream = msg_stream.fuse();
        let ping_interval = interval(Duration::from_secs(30));
        let mut ping_stream = IntervalStream::new(ping_interval).fuse();
        
        loop {
            tokio::select! {
                // Handle incoming messages
                Some(msg) = msg_stream.next() => {
                    match msg {
                        Ok(Message::Ping(bytes)) => {
                            if session.pong(&bytes).await.is_err() {
                                break;
                            }
                        }
                        Ok(Message::Text(_)) => {
                            // Can handle client messages here if needed
                        }
                        Ok(Message::Close(_)) => {
                            info!("WebSocket connection closed by client: {}", session_id);
                            break;
                        }
                        Err(e) => {
                            info!("WebSocket error: {:?}, closing session {}", e, session_id);
                            break;
                        }
                        _ => {}
                    }
                }
                // Send periodic pings
                Some(_) = ping_stream.next() => {
                    if session.ping(b"").await.is_err() {
                        info!("Failed to send ping to session {}, closing", session_id);
                        break;
                    }
                }
                else => break,
            }
        }
        
        // Remove session from state when connection closes
        state_clone.remove_session(session_id).await;
        info!("WebSocket session removed: {}", session_id);
    });
    
    Ok(response)
}

#[get("/api/stream")]
pub async fn stream_proxy(
    req: HttpRequest,
    state: web::Data<AppState>,
) -> Result<HttpResponse> {
    use actix_web::body::BodyStream;
    use futures::stream::StreamExt;
    
    // Check if queue is empty before attempting to connect
    match get_queue(&state).await {
        Ok(queue) if queue.is_empty() => {
            info!("Stream requested but queue is empty");
            return Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "error": "No music in queue",
                "message": "The stream is unavailable because there are no tracks in the queue. Please upload and add music to the queue first."
            })));
        }
        Err(e) => {
            error!("Failed to check queue status: {}", e);
            // Continue to try connecting anyway
        }
        _ => {
            // Queue has items, proceed with stream connection
        }
    }
    
    // Get quality parameter from query string (low, medium, high)
    // Default to "medium" if not specified
    let quality = req
        .uri()
        .query()
        .and_then(|q| {
            q.split('&')
                .find_map(|pair| {
                    let mut parts = pair.split('=');
                    if parts.next() == Some("quality") {
                        parts.next().map(|v| v.to_string())
                    } else {
                        None
                    }
                })
        })
        .unwrap_or_else(|| "medium".to_string());
    
    // Map quality to port: low=8001, medium=8002, high=8003
    let stream_port = match quality.as_str() {
        "low" => "8001",
        "high" => "8003",
        "medium" | _ => "8002", // default to medium
    };
    
    // Get MPD stream URL from environment or use default
    let mpd_host = std::env::var("MPD_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let stream_url = format!("http://{}:{}", mpd_host, stream_port);
    
    info!("Attempting to connect to MPD stream at: {}", stream_url);
    
    // Use shared HTTP client instead of creating a new one each time
    match state.http_client.get(&stream_url).send().await {
        Ok(response) => {
            let mut builder = HttpResponse::Ok();
            
            // Copy content-type header, default to audio/mpeg if not set
            if let Some(content_type) = response.headers().get("content-type") {
                if let Ok(content_type_str) = content_type.to_str() {
                    builder.insert_header(("content-type", content_type_str));
                }
            } else {
                // Default to MP3 MIME type for LAME encoder
                builder.insert_header(("content-type", "audio/mpeg"));
            }
            
            // Optimize headers for streaming
            builder.insert_header(("Access-Control-Allow-Origin", "*"));
            builder.insert_header(("Cache-Control", "no-cache, no-store, must-revalidate"));
            builder.insert_header(("Pragma", "no-cache"));
            builder.insert_header(("Connection", "keep-alive"));
            builder.insert_header(("Accept-Ranges", "none")); // Streaming doesn't support range requests
            builder.insert_header(("X-Content-Type-Options", "nosniff"));
            
            // Stream the response
            let stream = response.bytes_stream().map(|result| {
                result.map_err(|e| {
                    error!("Stream error: {}", e);
                    actix_web::error::ErrorInternalServerError(e)
                })
            });
            
            Ok(builder.body(BodyStream::new(stream)))
        }
        Err(e) => {
            error!("Failed to connect to MPD stream at {}: {}", stream_url, e);
            
            // Check if it's a connection refused error (common when queue is empty)
            let error_msg = e.to_string();
            let is_connection_error = error_msg.contains("Connection refused") 
                || error_msg.contains("Failed to connect")
                || error_msg.contains("Couldn't connect");
            
            let message = if is_connection_error {
                "Cannot connect to MPD stream. This usually happens when the queue is empty or no music is playing. Please add music to the queue first."
            } else {
                &error_msg
            };
            
            Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "error": "Stream unavailable",
                "message": message,
                "details": format!("Cannot connect to MPD stream at {}: {}", stream_url, e),
                "mpd_host": mpd_host,
                "stream_port": stream_port
            })))
        }
    }
}

