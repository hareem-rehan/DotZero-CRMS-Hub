import axios from 'axios';

export const apiClient = axios.create({
  baseURL: process.env['NEXT_PUBLIC_API_URL'] ?? 'http://localhost:4000/api/v1',
  headers: {
    'Content-Type': 'application/json',
  },
});

// JWT interceptor — token attached in useAuthStore setup (P-02B)
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
