// frontend/src/api/axios.js
import axios from 'axios';

const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL || 'http://localhost:5000/api',
  timeout: 30_000,
  headers: {
    'Content-Type': 'application/json'
  },
  // if you ever need cookies/session auth, enable withCredentials: true
  // withCredentials: true
});

// Request interceptor: attach token from localStorage (safe)
api.interceptors.request.use(
  (config) => {
    try {
      const token = localStorage.getItem('token');
      if (token) {
        config.headers = config.headers || {};
        config.headers.Authorization = `Bearer ${token}`;
      } else {
        // ensure header not left over
        if (config.headers && config.headers.Authorization) delete config.headers.Authorization;
      }
    } catch (err) {
      // keep silent - don't break requests for small localStorage errors
      // console.warn('axios request interceptor error', err);
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor: global error handling (logout on 401/403)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    // If there's no response (network error), just pass on
    if (!error || !error.response) return Promise.reject(error);

    const { status } = error.response;
    if (status === 401 || status === 403) {
      try {
        // remove local auth state and redirect to login
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        // Optionally show a message briefly then redirect
        // You could integrate a toast here if the app uses one
      } catch (e) {
        // ignore
      }

      // Redirect to login page to force fresh authentication
      // If your app uses a router base path, adjust as needed.
      // Using location.replace so back-button doesn't return to protected page.
      window.location.replace('/login');
      return Promise.reject(error);
    }

    return Promise.reject(error);
  }
);

/**
 * Helper for programmatically setting/clearing token (optional)
 * Use this from AuthContext after login/logout to keep axios defaults in sync.
 */
export function setAuthToken(token) {
  if (token) {
    localStorage.setItem('token', token);
    api.defaults.headers.common = api.defaults.headers.common || {};
    api.defaults.headers.common.Authorization = `Bearer ${token}`;
  } else {
    localStorage.removeItem('token');
    if (api.defaults.headers && api.defaults.headers.common) {
      delete api.defaults.headers.common.Authorization;
    }
  }
}

export default api;
