import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '../components/context/UserContext';
import { emitWorkerDataRefresh } from '../utils/workerRefresh';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user?._id) return;

    const socketUrl = (import.meta.env.VITE_SOCKET_URL || import.meta.env.VITE_API_URL || 'http://localhost:5000')
      .replace(/\/api\/?$/, '');

    // Connect to Socket.IO server
    socketRef.current = io(socketUrl, {
      withCredentials: true
    });

    // Listen for worker-specific events
    socketRef.current.on(`worker-${user._id}`, (data) => {
      emitWorkerDataRefresh({
        scope: 'worker',
        reason: 'socket-event',
        type: data?.type || 'unknown'
      });

      if (data.type === 'APPROVAL_APPROVED') {
        // Dispatch custom event for components to listen
        window.dispatchEvent(new CustomEvent('approvalUpdate', { detail: data }));
      }
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [user?._id]);

  return socketRef.current;
};
