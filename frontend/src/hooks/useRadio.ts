import { useQuery, useQueryClient } from '@tanstack/react-query';
import { getCurrentTrack, getQueue } from '../api/client';
import { useWebSocket } from './useWebSocket';
import type { WebSocketMessage } from '../types';

export const useRadio = () => {
  const queryClient = useQueryClient();

  const { data: currentTrack, isLoading: isLoadingCurrent } = useQuery({
    queryKey: ['current'],
    queryFn: getCurrentTrack,
    refetchInterval: 5000, // Fallback polling
  });

  const { data: queue = [], isLoading: isLoadingQueue } = useQuery({
    queryKey: ['queue'],
    queryFn: getQueue,
    refetchInterval: 10000, // Fallback polling
  });

  const handleWebSocketMessage = (message: WebSocketMessage) => {
    console.log('WebSocket message:', message);
    
    switch (message.type) {
      case 'current_track':
        queryClient.setQueryData(['current'], message.data);
        break;
      case 'queue_update':
        queryClient.invalidateQueries({ queryKey: ['queue'] });
        break;
    }
  };

  const { isConnected } = useWebSocket(handleWebSocketMessage);

  return {
    currentTrack,
    queue,
    isLoadingCurrent,
    isLoadingQueue,
    isConnected,
  };
};

