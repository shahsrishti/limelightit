'use client';

import { useSocketContext } from '@/providers/SocketProvider';
import { useEffect, useRef } from 'react';

/**
 * Subscribe to a Socket.IO event with automatic cleanup.
 *
 * Uses a ref to hold the callback so that inline functions defined
 * in JSX don't cause the listener to be removed and re-added on every render.
 */
export function useSocket(event?: string, callback?: (data: any) => void) {
  const { socket, isConnected } = useSocketContext();

  // Keep callback in a ref so we don't need it in the dependency array
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!socket || !event) return;

    const handler = (data: any) => {
      callbackRef.current?.(data);
    };

    socket.on(event, handler);

    return () => {
      socket.off(event, handler);
    };
    // Intentionally only re-subscribe when socket instance or event name changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [socket, event]);

  return { socket, isConnected };
}
