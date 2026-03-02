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

// Response interceptor
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      window.location.href = '/login';
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
