/// <reference types="vite/client" />
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000';

// Create axios instance
const api = axios.create({
  baseURL: API_URL,
  withCredentials: true,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor
api.interceptors.request.use(
  (config) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — don't redirect on network errors
api.interceptors.response.use(
  (response) => response,
  (error) => {
    const currentPath = window.location.pathname;
    const isAuthPage = currentPath.startsWith('/login')
      || currentPath.startsWith('/register')
      || currentPath.startsWith('/forgot-password')
      || currentPath.startsWith('/reset-password');

    const next = encodeURIComponent(window.location.pathname + window.location.search);

    // Only redirect on actual 401 from a working backend
    // Don't redirect on network errors (ECONNREFUSED etc.)
    if (error.response?.status === 401 && !isAuthPage) {
      window.location.href = `/login?next=${next}`;
    }
    if (error.response?.status === 402 && !currentPath.startsWith('/billing')) {
      window.location.href = `/billing?next=${next}`;
    }
    return Promise.reject(error);
  }
);

// Project CRUD
export async function getProject(id: string) {
  const res = await api.get(`/projects/${id}`);
  return res.data;
}

export async function updateProject(id: string, data: { name?: string; data?: any }) {
  const res = await api.put(`/projects/${id}`, data);
  return res.data;
}

export async function createProject(name: string, data: any = {}) {
  const res = await api.post('/projects', { name, data });
  return res.data;
}

export async function deleteProject(id: string) {
  const res = await api.delete(`/projects/${id}`);
  return res.data;
}

export async function listProjects() {
  const res = await api.get('/projects');
  return res.data;
}

export default api;
