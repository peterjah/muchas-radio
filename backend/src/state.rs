use std::sync::Arc;
use std::sync::atomic::{AtomicUsize, Ordering};
use tokio::sync::{Mutex, RwLock};
use std::collections::HashMap;
use crate::models::Track;
use mpd_client::Client as MpdClient;
use uuid::Uuid;

pub struct SessionWrapper {
    pub id: Uuid,
    pub session: actix_ws::Session,
}

/// Tracks connections per IP address for rate limiting
pub struct IpConnectionTracker {
    connections: RwLock<HashMap<String, AtomicUsize>>,
    max_per_ip: usize,
}

impl IpConnectionTracker {
    pub fn new(max_per_ip: usize) -> Self {
        Self {
            connections: RwLock::new(HashMap::new()),
            max_per_ip,
        }
    }
    
    /// Try to acquire a connection slot for an IP. Returns true if allowed.
    pub async fn try_acquire(&self, ip: &str) -> bool {
        let connections = self.connections.read().await;
        if let Some(count) = connections.get(ip) {
            let current = count.load(Ordering::SeqCst);
            if current >= self.max_per_ip {
                return false;
            }
            count.fetch_add(1, Ordering::SeqCst);
            return true;
        }
        drop(connections);
        
        // IP not in map, add it
        let mut connections = self.connections.write().await;
        let counter = connections.entry(ip.to_string())
            .or_insert_with(|| AtomicUsize::new(0));
        let current = counter.load(Ordering::SeqCst);
        if current >= self.max_per_ip {
            return false;
        }
        counter.fetch_add(1, Ordering::SeqCst);
        true
    }
    
    /// Release a connection slot for an IP
    pub async fn release(&self, ip: &str) {
        let connections = self.connections.read().await;
        if let Some(count) = connections.get(ip) {
            let prev = count.fetch_sub(1, Ordering::SeqCst);
            // Clean up if this was the last connection (avoid memory leak)
            if prev <= 1 {
                drop(connections);
                let mut connections = self.connections.write().await;
                // Double-check before removing
                if let Some(count) = connections.get(ip) {
                    if count.load(Ordering::SeqCst) == 0 {
                        connections.remove(ip);
                    }
                }
            }
        }
    }
    
    /// Get current connection count for an IP
    pub async fn get_count(&self, ip: &str) -> usize {
        let connections = self.connections.read().await;
        connections.get(ip)
            .map(|c| c.load(Ordering::SeqCst))
            .unwrap_or(0)
    }
    
    /// Get total active connections across all IPs
    pub async fn get_total(&self) -> usize {
        let connections = self.connections.read().await;
        connections.values()
            .map(|c| c.load(Ordering::SeqCst))
            .sum()
    }
}

#[derive(Clone)]
pub struct AppState {
    pub mpd_client: Arc<Mutex<MpdClient>>,
    pub tracks_metadata: Arc<RwLock<HashMap<String, Track>>>,
    pub ws_sessions: Arc<Mutex<Vec<SessionWrapper>>>,
    pub http_client: reqwest::Client,
    pub stream_connections: Arc<IpConnectionTracker>,
}

impl AppState {
    /// Maximum stream connections allowed per IP address
    const MAX_STREAMS_PER_IP: usize = 5;
    
    pub fn new(mpd_client: MpdClient) -> Self {
        // Create a single HTTP client with optimized connection pool settings for streaming
        let http_client = reqwest::Client::builder()
            .pool_max_idle_per_host(20)  // Increased for concurrent stream connections
            .pool_idle_timeout(std::time::Duration::from_secs(60))  // Longer idle timeout
            .tcp_keepalive(std::time::Duration::from_secs(30))  // Enable TCP keep-alive
            .tcp_nodelay(true)  // Disable Nagle's algorithm for lower latency
            .build()
            .expect("Failed to create HTTP client");
            
        Self {
            mpd_client: Arc::new(Mutex::new(mpd_client)),
            tracks_metadata: Arc::new(RwLock::new(HashMap::new())),
            ws_sessions: Arc::new(Mutex::new(Vec::new())),
            http_client,
            stream_connections: Arc::new(IpConnectionTracker::new(Self::MAX_STREAMS_PER_IP)),
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

