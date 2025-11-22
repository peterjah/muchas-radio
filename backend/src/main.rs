mod api;
mod models;
mod mpd_manager;
mod state;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use log::info;
use std::env;
use std::fs;
use std::path::PathBuf;

use crate::mpd_manager::start_mpd_monitor;
use crate::state::AppState;

/// Generate MPD configuration from template
fn generate_mpd_config() -> std::io::Result<PathBuf> {
    let base_dir = env::var("MPD_BASE_DIR")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| {
            env::current_dir()
                .expect("Failed to get current directory")
        });
    
    let music_dir = env::var("MPD_MUSIC_DIR")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| base_dir.join("uploads"));
    
    let playlist_dir = env::var("MPD_PLAYLIST_DIR")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| base_dir.join("playlists"));
    
    let data_dir = env::var("MPD_DATA_DIR")
        .ok()
        .map(PathBuf::from)
        .unwrap_or_else(|| base_dir.clone());
    
    let bind_address = env::var("MPD_BIND_ADDRESS").unwrap_or_else(|_| "127.0.0.1".to_string());
    let mpd_port = env::var("MPD_PORT").unwrap_or_else(|_| "6600".to_string());
    let stream_port = env::var("MPD_STREAM_PORT").unwrap_or_else(|_| "8001".to_string());
    
    // Create directories if they don't exist
    fs::create_dir_all(&music_dir)?;
    fs::create_dir_all(&playlist_dir)?;
    fs::create_dir_all(&data_dir)?;
    
    // Read template
    let template_path = base_dir.join("mpd.conf.template");
    let template = fs::read_to_string(&template_path)
        .map_err(|e| {
            std::io::Error::new(
                e.kind(),
                format!("Failed to read mpd.conf.template from {}: {}", template_path.display(), e)
            )
        })?;
    
    // Replace placeholders
    let config = template
        .replace("{{MUSIC_DIR}}", &music_dir.to_string_lossy())
        .replace("{{PLAYLIST_DIR}}", &playlist_dir.to_string_lossy())
        .replace("{{DATA_DIR}}", &data_dir.to_string_lossy())
        .replace("{{BIND_ADDRESS}}", &bind_address)
        .replace("{{MPD_PORT}}", &mpd_port)
        .replace("{{STREAM_PORT}}", &stream_port);
    
    // Write generated config
    let config_path = data_dir.join("mpd.conf");
    fs::write(&config_path, config)?;
    
    info!("Generated MPD config at: {}", config_path.display());
    info!("  Music directory: {}", music_dir.display());
    info!("  Playlist directory: {}", playlist_dir.display());
    info!("  Data directory: {}", data_dir.display());
    
    Ok(config_path)
}

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    info!("Starting Muchas Radio Backend...");
    
    // Generate MPD configuration
    let config_path = generate_mpd_config()?;
    info!("MPD configuration ready. Start MPD with: mpd {}", config_path.display());
    
    // Connect to MPD
    let mpd_host = env::var("MPD_HOST").unwrap_or_else(|_| "127.0.0.1".to_string());
    let mpd_port = env::var("MPD_PORT")
        .ok()
        .and_then(|s| s.parse().ok())
        .unwrap_or(6600);
    
    info!("Connecting to MPD at {}:{}", mpd_host, mpd_port);
    
    let mpd_addr = format!("{}:{}", mpd_host, mpd_port);
    let connection = match tokio::net::TcpStream::connect(&mpd_addr).await {
        Ok(conn) => conn,
        Err(e) => {
            eprintln!("Failed to connect to MPD: {}", e);
            eprintln!("Make sure MPD is running: mpd backend/mpd.conf");
            std::process::exit(1);
        }
    };
    
    let (mpd_client, _events) = match mpd_client::Client::connect(connection).await {
        Ok(client_tuple) => {
            info!("Successfully connected to MPD");
            client_tuple
        }
        Err(e) => {
            eprintln!("Failed to connect to MPD: {}", e);
            eprintln!("Make sure MPD is running: mpd backend/mpd.conf");
            std::process::exit(1);
        }
    };
    
    // Create application state
    let app_state = web::Data::new(AppState::new(mpd_client));
    
    // Start MPD monitor
    start_mpd_monitor(app_state.get_ref().clone()).await;
    
    let bind_addr = env::var("BIND_ADDR").unwrap_or_else(|_| "127.0.0.1:8080".to_string());
    info!("Starting HTTP server on {}", bind_addr);
    
    HttpServer::new(move || {
        let cors = Cors::permissive();
        
        App::new()
            .app_data(app_state.clone())
            .wrap(Logger::default())
            .wrap(cors)
            .service(api::upload::upload_music)
            .service(api::playlist::get_current)
            .service(api::playlist::get_queue_list)
            .service(api::playlist::add_to_queue)
            .service(api::playlist::play)
            .service(api::stream::websocket)
            .service(api::stream::stream_proxy)
    })
    .workers(2)  // Limit worker threads to reduce resource usage
    .max_connections(1000)  // Limit maximum connections
    .max_connection_rate(256)  // Limit connection rate
    .bind(&bind_addr)?
    .run()
    .await
}
