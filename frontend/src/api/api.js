// api.js
import axios from 'axios';

const resolveBaseURL = () => {
  const configuredUrl = import.meta.env.VITE_API_URL;

  if (typeof window !== 'undefined' && window.location.hostname.endsWith('vercel.app')) {
    return '/api';
  }

  return configuredUrl || 'https://cloth-flow-production.onrender.com/api';
};

const api = axios.create({
  baseURL: resolveBaseURL(),
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

const getCookie = (name) => {
  if (typeof document === 'undefined') return null;
  const value = document.cookie
    .split('; ')
    .find((row) => row.startsWith(`${name}=`))
    ?.split('=')[1];
  return value ? decodeURIComponent(value) : null;
};

const attachCsrfToken = (config = {}) => {
  const method = String(config.method || 'get').toLowerCase();
  if (['post', 'put', 'patch', 'delete'].includes(method)) {
    const csrfToken = getCookie('csrfToken');
    if (csrfToken) {
      config.headers = config.headers || {};
      config.headers['X-CSRF-Token'] = csrfToken;
    }
  }
  return config;
};

// Request interceptor - tokens handled via cookies, enforce fresh data fetches
api.interceptors.request.use(
  (config) => {
    const updatedConfig = attachCsrfToken(config);
    if (String(updatedConfig.method || 'get').toLowerCase() === 'get') {
      updatedConfig.headers = updatedConfig.headers || {};
      updatedConfig.headers['Cache-Control'] = 'no-cache, no-store, must-revalidate';
      updatedConfig.headers['Pragma'] = 'no-cache';
      updatedConfig.headers['Expires'] = '0';

      // Always append timestamp _t to bypass browser cache
      updatedConfig.params = updatedConfig.params || {};
      updatedConfig.params._t = Date.now();
    }
    return updatedConfig;
  },
  (error) => Promise.reject(error)
);

// Response interceptor to handle token refresh
api.interceptors.response.use(
  (response) => response,
  async (error) => {
    const originalRequest = error.config;

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      try {
        await axios.post(
          `${api.defaults.baseURL}/auth/refresh-token`,
          {},
          attachCsrfToken({ withCredentials: true })
        );

        return api(originalRequest);
      } catch {
        // Only redirect if not already on login page
        if (!window.location.pathname.includes('/login')) {
          window.location.href = '/login';
        }
      }
    }

    return Promise.reject(error);
  }
);

export default api;

