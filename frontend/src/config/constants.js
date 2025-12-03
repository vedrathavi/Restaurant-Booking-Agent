// Backend host URL (from Vite env) used by the Axios client
export const HOST = import.meta.env.VITE_SERVER_URL || "http://localhost:4000";
// API endpoints configuration
export const API_ENDPOINTS = {
  HEALTH: "/health",
  BOOKINGS: "/api/bookings",
  CHAT: "/api/chat",
  WEATHER: "/api/weather",
};
