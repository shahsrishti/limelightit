import axios from 'axios';
import { config } from '@/config';

const apiClient = axios.create({
  baseURL: config.api.baseUrl,
  timeout: config.api.timeout,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: true, // Required for httpOnly refresh token cookie
});

// Request interceptor — attach JWT to every request
apiClient.interceptors.request.use(
  (requestConfig) => {
    if (typeof window !== 'undefined') {
      const token = localStorage.getItem(config.auth.accessTokenKey);
      if (token) {
        requestConfig.headers.Authorization = `Bearer ${token}`;
      }
    }
    return requestConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor — handle token expiry globally
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        // Attempt refresh token rotation
        const { data } = await axios.post(
          `${config.api.baseUrl}/auth/refresh`,
          {},
          { withCredentials: true }
        );

        const newToken = data.data.accessToken;
        localStorage.setItem(config.auth.accessTokenKey, newToken);
        originalRequest.headers.Authorization = `Bearer ${newToken}`;

        return apiClient(originalRequest);
      } catch {
        // Refresh failed — clear session and redirect to login
        if (typeof window !== 'undefined') {
          localStorage.removeItem(config.auth.accessTokenKey);
          localStorage.removeItem(config.auth.userKey);
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default apiClient;
