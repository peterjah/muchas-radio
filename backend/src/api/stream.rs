use actix_web::{get, web, HttpRequest, HttpResponse, Result};
use actix_ws::Message;
use futures::StreamExt;
use log::{error, info};

use crate::state::AppState;

#[get("/api/ws")]
pub async fn websocket(
    req: HttpRequest,
    body: web::Payload,
    state: web::Data<AppState>,
) -> Result<HttpResponse> {
    let (response, mut session, mut msg_stream) = actix_ws::handle(&req, body)?;
    
    info!("WebSocket connection established");
    
    // Add session to state
    {
        let mut sessions = state.ws_sessions.lock().await;
        sessions.push(session.clone());
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
                    info!("WebSocket connection closed");
                    break;
                }
                _ => {}
            }
        }
        
        // Remove session from state when connection closes
        let mut sessions = state_clone.ws_sessions.lock().await;
        sessions.retain(|s| !std::ptr::eq(s, &session));
    });
    
    Ok(response)
}

#[get("/api/stream")]
pub async fn stream_proxy() -> Result<HttpResponse> {
    use actix_web::body::BodyStream;
    use futures::stream::StreamExt;
    
    // Create streaming proxy to MPD HTTP stream
    let client = reqwest::Client::new();
    
    match client.get("http://localhost:8001").send().await {
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

