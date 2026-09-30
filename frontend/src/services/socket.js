import { io } from 'socket.io-client';

// Resolve backend URL: use same base as the REST API
const SOCKET_URL = import.meta.env.VITE_API_URL
    ? import.meta.env.VITE_API_URL.replace('/api', '')
    : (import.meta.env.MODE === 'production'
        ? 'https://edwl-backend-1.onrender.com'
        : 'http://localhost:5000');

let socket = null;

try {
    socket = io(SOCKET_URL, {
        autoConnect: true,
        reconnection: true,
        reconnectionAttempts: 5,
        reconnectionDelay: 2000,
        transports: ['websocket', 'polling'] // websocket preferred; fallback to polling
    });

    socket.on('connect', () => {
        console.info('[Socket.IO] Connected:', socket.id);
    });

    socket.on('disconnect', (reason) => {
        console.warn('[Socket.IO] Disconnected:', reason);
    });

    socket.on('connect_error', (err) => {
        console.warn('[Socket.IO] Connection error:', err.message);
    });

} catch (error) {
    console.error('[Socket.IO] Initialization failed:', error);
}

export default socket;
