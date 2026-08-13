const getSecureUrl = (url, fallback) => {
  if (!url) return fallback;
  if (typeof window !== 'undefined' && window.location.protocol === 'https:' && url.startsWith('http://') && !url.includes('localhost')) {
    return fallback;
  }
  return url;
};

const rawApiUrl = import.meta.env.VITE_API_URL || (import.meta.env.DEV ? 'http://localhost:5000/api' : 'https://hrms-backend-22uq.onrender.com/api');
const rawSocketUrl = import.meta.env.VITE_SOCKET_URL || (import.meta.env.DEV ? 'http://localhost:5000' : 'https://hrms-backend-22uq.onrender.com');

export const API_URL = getSecureUrl(rawApiUrl, 'https://hrms-backend-22uq.onrender.com/api');
export const SOCKET_URL = getSecureUrl(rawSocketUrl, 'https://hrms-backend-22uq.onrender.com');
