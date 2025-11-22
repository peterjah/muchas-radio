export interface Track {
  id: string;
  filename: string;
  title: string | null;
  artist: string | null;
  album: string | null;
  duration: number | null;
  added_by: string;
  added_at: string;
}

export interface QueueItem {
  position: number;
  track: Track;
}

export type PlaybackState = 'playing' | 'paused' | 'stopped';

export interface CurrentTrack {
  track: Track | null;
  elapsed: number | null;
  state: PlaybackState;
}

export interface UploadResponse {
  success: boolean;
  track_id: string;
  filename: string;
}

export interface WebSocketMessage {
  type: 'current_track' | 'queue_update';
  data: any;
}

