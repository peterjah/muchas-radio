import axios from 'axios';
import type { CurrentTrack, QueueItem, UploadResponse } from '../types';

// Use protocol-relative API URL - automatically uses https:// for HTTPS pages
const getApiBaseUrl = (): string => {
  const envUrl = import.meta.env.VITE_API_URL;
  if (envUrl) {
    return envUrl;
  }
  
  // If no env var, use relative URL (same origin)
  return '';
};

const API_BASE_URL = getApiBaseUrl();

const api = axios.create({
  baseURL: API_BASE_URL,
});

// Add username to all requests
api.interceptors.request.use((config) => {
  const username = localStorage.getItem('username');
  if (username) {
    config.headers['X-Username'] = username;
  }
  return config;
});

export const uploadMusic = async (file: File): Promise<UploadResponse> => {
  const formData = new FormData();
  formData.append('file', file);
  
  const response = await api.post<UploadResponse>('/api/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
  });
  
  return response.data;
};

export const getCurrentTrack = async (): Promise<CurrentTrack> => {
  const response = await api.get<CurrentTrack>('/api/current');
  return response.data;
};

export const getQueue = async (): Promise<QueueItem[]> => {
  const response = await api.get<QueueItem[]>('/api/queue');
  return response.data;
};

export const addToQueue = async (trackId: string): Promise<void> => {
  await api.post('/api/queue/add', { track_id: trackId });
};

export type StreamQuality = 'low' | 'medium' | 'high';

export const getStreamUrl = (quality: StreamQuality = 'medium'): string => {
  return `${API_BASE_URL}/api/stream?quality=${quality}`;
};

