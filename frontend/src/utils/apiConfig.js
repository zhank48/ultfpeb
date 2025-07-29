// API Configuration Utility
const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
const BASE_URL = API_BASE_URL.replace('/api', '');

export const apiConfig = {
  // API endpoints
  baseURL: API_BASE_URL,
  
  // Static file URLs
  getImageUrl: (path) => {
    if (!path) return null;
    if (path.startsWith('http')) return path;
    if (path.startsWith('data:')) return path;
    if (path.startsWith('/uploads')) return `${BASE_URL}${path}`;
    return `${BASE_URL}/uploads/${path}`;
  },
  
  // Upload URLs for different types
  getUploadUrl: (type, filename) => {
    if (!filename) return null;
    if (filename.startsWith('http')) return filename;
    if (filename.startsWith('data:')) return filename;
    return `${BASE_URL}/uploads/${type}/${encodeURIComponent(filename)}`;
  }
};

export const getApiConfig = () => apiConfig;

export default apiConfig;
