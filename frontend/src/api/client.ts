import axios from 'axios';
import type { CurrentTrack, QueueItem, UploadResponse } from '../types';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8080';

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

export const getStreamUrl = (): string => {
  return `${API_BASE_URL}/api/stream`;
};

