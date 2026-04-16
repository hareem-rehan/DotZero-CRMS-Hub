import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT interceptor — attach token from localStorage
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const raw = localStorage.getItem('auth-store');
    if (raw) {
      try {
        const state = JSON.parse(raw) as { state?: { token?: string } };
        const token = state?.state?.token;
        if (token) {
          config.headers['Authorization'] = `Bearer ${token}`;
        }
      } catch {
        // ignore parse errors
      }
    }
  }
  return config;
});

// 401 interceptor — clear auth and redirect to login on session expiry
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (typeof window !== 'undefined' && error?.response?.status === 401) {
      localStorage.removeItem('auth-store');
      window.location.href = '/login';
    }
    return Promise.reject(error);
  },
);
