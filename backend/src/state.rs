use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;
use crate::models::Track;
use mpd_client::Client as MpdClient;
use uuid::Uuid;

pub struct SessionWrapper {
    pub id: Uuid,
    pub session: actix_ws::Session,
}

#[derive(Clone)]
pub struct AppState {
    pub mpd_client: Arc<Mutex<MpdClient>>,
    pub tracks_metadata: Arc<RwLock<HashMap<String, Track>>>,
    pub ws_sessions: Arc<Mutex<Vec<SessionWrapper>>>,
    pub http_client: reqwest::Client,
}

impl AppState {
    pub fn new(mpd_client: MpdClient) -> Self {
        // Create a single HTTP client with optimized connection pool settings
        let http_client = reqwest::Client::builder()
            .pool_max_idle_per_host(2)  // Limit idle connections
            .pool_idle_timeout(std::time::Duration::from_secs(30))
            .build()
            .expect("Failed to create HTTP client");
            
        Self {
            mpd_client: Arc::new(Mutex::new(mpd_client)),
            tracks_metadata: Arc::new(RwLock::new(HashMap::new())),
            ws_sessions: Arc::new(Mutex::new(Vec::new())),
            http_client,
        }
    }
    
    pub async fn broadcast_message(&self, message: &str) {
        let mut sessions = self.ws_sessions.lock().await;
        let mut to_remove = Vec::new();
        
        for (idx, wrapper) in sessions.iter_mut().enumerate() {
            if wrapper.session.text(message.to_string()).await.is_err() {
                to_remove.push(idx);
            }
        }
        
        // Remove failed sessions in reverse order
        for idx in to_remove.iter().rev() {
            sessions.remove(*idx);
        }
    }
    
    pub async fn remove_session(&self, session_id: Uuid) {
        let mut sessions = self.ws_sessions.lock().await;
        sessions.retain(|wrapper| wrapper.id != session_id);
    }
    
    pub async fn get_session_count(&self) -> usize {
        let sessions = self.ws_sessions.lock().await;
        sessions.len()
    }
}

