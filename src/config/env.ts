// Signaling server and backend configuration
// Set these in your .env file (Vite uses VITE_ prefix)

export const ENV = {
  // Signaling server WebSocket URL
  SIGNALING_URL: import.meta.env.VITE_SIGNALING_URL || 'http://localhost:3001',

  // Your backend API base URL (for fetching JWT, message history, etc.)
  API_BASE_URL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000/api',

  // ICE servers for WebRTC
  ICE_SERVERS: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'stun:stun1.l.google.com:19302' },
  ],
} as const;
