// In production: same-origin via CloudFront (/api/* → EC2:5000)
// In development: direct to local backend
export const API_URL = import.meta.env.VITE_API_URL
  || (import.meta.env.DEV ? 'http://localhost:5000/api' : '/api');

export const SOCKET_URL = import.meta.env.VITE_SOCKET_URL
  || (import.meta.env.DEV ? 'http://localhost:5000' : '');
