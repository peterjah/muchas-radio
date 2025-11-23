import { useEffect, useRef, useState, useCallback } from 'react';
import type { WebSocketMessage } from '../types';

const WS_URL = import.meta.env.VITE_WS_URL || 'ws://localhost:8080';

export const useWebSocket = (onMessage: (message: WebSocketMessage) => void) => {
  const [isConnected, setIsConnected] = useState(false);
  const wsRef = useRef<WebSocket | null>(null);
  const reconnectTimeoutRef = useRef<number | undefined>(undefined);
  const isConnectingRef = useRef(false);
  const onMessageRef = useRef(onMessage);

  // Keep onMessage ref up to date without triggering reconnections
  useEffect(() => {
    onMessageRef.current = onMessage;
  }, [onMessage]);

  const connect = useCallback(() => {
    // Prevent multiple simultaneous connection attempts
    if (isConnectingRef.current || (wsRef.current && wsRef.current.readyState === WebSocket.OPEN)) {
      return;
    }

    // Close existing connection if any
    if (wsRef.current) {
      wsRef.current.close();
      wsRef.current = null;
    }

    try {
      isConnectingRef.current = true;
      const ws = new WebSocket(`${WS_URL}/api/ws`);
      
      ws.onopen = () => {
        console.log('WebSocket connected');
        setIsConnected(true);
        isConnectingRef.current = false;
      };
      
      ws.onmessage = (event) => {
        try {
          const message: WebSocketMessage = JSON.parse(event.data);
          onMessageRef.current(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };
      
      ws.onclose = () => {
        console.log('WebSocket disconnected');
        setIsConnected(false);
        isConnectingRef.current = false;
        
        // Clear any existing reconnect timeout
        if (reconnectTimeoutRef.current) {
          clearTimeout(reconnectTimeoutRef.current);
        }
        
        // Attempt to reconnect after 3 seconds
        reconnectTimeoutRef.current = window.setTimeout(() => {
          console.log('Attempting to reconnect...');
          connect();
        }, 3000);
      };
      
      ws.onerror = (error) => {
        console.error('WebSocket error:', error);
        isConnectingRef.current = false;
      };
      
      wsRef.current = ws;
    } catch (error) {
      console.error('Failed to connect WebSocket:', error);
      isConnectingRef.current = false;
    }
  }, []); // No dependencies - stable function

  useEffect(() => {
    connect();
    
    return () => {
      // Cleanup on unmount
      if (reconnectTimeoutRef.current) {
        clearTimeout(reconnectTimeoutRef.current);
      }
      if (wsRef.current) {
        wsRef.current.close();
        wsRef.current = null;
      }
      isConnectingRef.current = false;
    };
  }, [connect]);

  return { isConnected };
};

