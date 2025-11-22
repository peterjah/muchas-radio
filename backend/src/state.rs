use std::sync::Arc;
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;
use crate::models::Track;
use mpd_client::Client as MpdClient;

#[derive(Clone)]
pub struct AppState {
    pub mpd_client: Arc<Mutex<MpdClient>>,
    pub tracks_metadata: Arc<RwLock<HashMap<String, Track>>>,
    pub ws_sessions: Arc<Mutex<Vec<actix_ws::Session>>>,
}

impl AppState {
    pub fn new(mpd_client: MpdClient) -> Self {
        Self {
            mpd_client: Arc::new(Mutex::new(mpd_client)),
            tracks_metadata: Arc::new(RwLock::new(HashMap::new())),
            ws_sessions: Arc::new(Mutex::new(Vec::new())),
        }
    }
    
    pub async fn broadcast_message(&self, message: &str) {
        let mut sessions = self.ws_sessions.lock().await;
        let mut to_remove = Vec::new();
        
        for (idx, session) in sessions.iter_mut().enumerate() {
            if session.text(message.to_string()).await.is_err() {
                to_remove.push(idx);
            }
        }
        
        // Remove failed sessions in reverse order
        for idx in to_remove.iter().rev() {
            sessions.remove(*idx);
        }
    }
}

