import axios from 'axios';
import { auth } from './firebase';

const BASE_URL = import.meta.env.VITE_API_BASE_URL || '/api';

// Warn in dev if the env var is missing — common cause of 404s on Vercel
if (!import.meta.env.VITE_API_BASE_URL && import.meta.env.PROD) {
  console.error(
    '[WealthWise] VITE_API_BASE_URL is not set. ' +
    'Add it to your Vercel environment variables pointing to your Render backend URL, e.g. https://wealthwise-api.onrender.com/api'
  );
}

const api = axios.create({
  baseURL: BASE_URL,
  timeout: 35000, // 35s — covers Render free tier cold start (~30s)
});

// Attach the Firebase ID token to every request
api.interceptors.request.use(async (config) => {
  const user = auth.currentUser;
  if (user) {
    const token = await user.getIdToken();
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Normalise error responses
api.interceptors.response.use(
  (res) => res,
  (err) => {
    const message =
      err.response?.data?.error ||
      err.response?.data?.message ||
      err.message ||
      'Request failed';
    return Promise.reject(new Error(message));
  }
);

export default api;
