import { useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import { useUser } from '../components/context/UserContext';

export const useSocket = () => {
  const socketRef = useRef(null);
  const { user } = useUser();

  useEffect(() => {
    if (!user?._id) return;

    // Connect to Socket.IO server
    socketRef.current = io(import.meta.env.VITE_API_URL || 'http://localhost:5000', {
      withCredentials: true
    });

    // Listen for worker-specific events
    socketRef.current.on(`worker-${user._id}`, (data) => {
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