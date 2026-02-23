
import axios from 'axios';
import { goto } from '$app/navigation';
import { browser } from '$app/environment';

export const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';
console.log("Current API_URL:", API_URL);

const api = axios.create({
  baseURL: API_URL,
});

// Interceptor para agregar Token
api.interceptors.request.use((config) => {
  if (browser) {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

// Interceptor para manejar errores 401 (No autorizado)
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (browser) {
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        goto('/login');
      }
    }
    return Promise.reject(error);
  }
);

export default api;
