'use client';

import { useSocketContext } from '@/providers/SocketProvider';
import { useEffect } from 'react';

export function useSocket(event?: string, callback?: (data: any) => void) {
  const { socket, isConnected } = useSocketContext();

  useEffect(() => {
    if (!socket || !event || !callback) return;

    socket.on(event, callback);

    return () => {
      socket.off(event, callback);
    };
  }, [socket, event, callback]);

  return { socket, isConnected };
}
