use actix_web::{get, web, HttpRequest, HttpResponse, Result};
use actix_ws::Message;
use futures::StreamExt;
use log::{error, info};
use uuid::Uuid;

use crate::state::{AppState, SessionWrapper};

#[get("/api/ws")]
pub async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;
    
    let session_id = Uuid::new_v4();
    info!("WebSocket connection established: {}", session_id);
    
    // Add session to state with unique ID
    {
        let mut sessions = state.ws_sessions.lock().await;
        sessions.push(SessionWrapper {
            id: session_id,
            session: session.clone(),
        });
    }
    
    // Spawn task to handle incoming messages
    let state_clone = state.get_ref().clone();
    actix_web::rt::spawn(async move {
        while let Some(Ok(msg)) = msg_stream.next().await {
            match msg {
                Message::Ping(bytes) => {
                    if session.pong(&bytes).await.is_err() {
                        break;
                    }
                }
                Message::Text(_) => {
                    // Can handle client messages here if needed
                }
                Message::Close(_) => {
                    info!("WebSocket connection closed: {}", session_id);
                    break;
                }
                _ => {}
            }
        }
        
        // Remove session from state when connection closes
        state_clone.remove_session(session_id).await;
        info!("WebSocket session removed: {}", session_id);
    });
    
    Ok(response)
}

#[get("/api/stream")]
pub async fn stream_proxy(state: web::Data<AppState>) -> Result<HttpResponse> {
    use actix_web::body::BodyStream;
    use futures::stream::StreamExt;
    
    // Get MPD stream URL from environment or use default
    let mpd_host = std::env::var("MPD_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let stream_port = std::env::var("MPD_STREAM_PORT").unwrap_or_else(|_| "8001".to_string());
    let stream_url = format!("http://{}:{}", mpd_host, stream_port);
    
    // Use shared HTTP client instead of creating a new one each time
    match state.http_client.get(&stream_url).send().await {
        Ok(response) => {
            let mut builder = HttpResponse::Ok();
            
            // Copy content-type header
            if let Some(content_type) = response.headers().get("content-type") {
                if let Ok(content_type_str) = content_type.to_str() {
                    builder.insert_header(("content-type", content_type_str));
                }
            }
            
            // Add CORS headers
            builder.insert_header(("Access-Control-Allow-Origin", "*"));
            
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
            error!("Failed to connect to MPD stream: {}", e);
            Ok(HttpResponse::ServiceUnavailable().json(serde_json::json!({
                "error": "Stream unavailable"
            })))
        }
    }
}

