mod api;
mod models;
mod mpd_manager;
mod state;

use actix_cors::Cors;
use actix_web::{middleware::Logger, web, App, HttpServer};
use log::info;
use std::env;

use crate::mpd_manager::start_mpd_monitor;
use crate::state::AppState;

#[actix_web::main]
async fn main() -> std::io::Result<()> {
    // Initialize logger
    env_logger::init_from_env(env_logger::Env::new().default_filter_or("info"));
    
    info!("Starting Muchas Radio Backend...");
    
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
            eprintln!("Failed to connect to MPD at {}: {}", mpd_addr, e);
            eprintln!("Make sure the MPD service is running and accessible at {}:{}", mpd_host, mpd_port);
            std::process::exit(1);
        }
    };
    
    let (mpd_client, _events) = match mpd_client::Client::connect(connection).await {
        Ok(client_tuple) => {
            info!("Successfully connected to MPD at {}:{}", mpd_host, mpd_port);
            client_tuple
        }
        Err(e) => {
            eprintln!("Failed to connect to MPD at {}: {}", mpd_addr, e);
            eprintln!("Make sure the MPD service is running and accessible at {}:{}", mpd_host, mpd_port);
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
