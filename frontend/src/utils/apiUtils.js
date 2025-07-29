// API Utility dengan timeout handling
export const API_BASE_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';
export const DEFAULT_TIMEOUT = 10000; // 10 seconds

// Create a fetch wrapper with timeout
export const fetchWithTimeout = async (url, options = {}, timeout = DEFAULT_TIMEOUT) => {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeout);
  
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      }
    });
    
    clearTimeout(id);
    
    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }
    
    return response;
  } catch (error) {
    clearTimeout(id);
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - Server may be slow or unavailable');
    }
    
    throw error;
  }
};

// API methods with timeout handling
export const apiCall = {
  get: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetchWithTimeout(url, {
      method: 'GET',
      ...options
    });
    return response.json();
  },
  
  post: async (endpoint, data, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetchWithTimeout(url, {
      method: 'POST',
      body: JSON.stringify(data),
      ...options
    });
    return response.json();
  },
  
  put: async (endpoint, data, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetchWithTimeout(url, {
      method: 'PUT',
      body: JSON.stringify(data),
      ...options
    });
    return response.json();
  },
  
  delete: async (endpoint, options = {}) => {
    const url = `${API_BASE_URL}${endpoint}`;
    const response = await fetchWithTimeout(url, {
      method: 'DELETE',
      ...options
    });
    return response.json();
  }
};

// Auth helper
export const getAuthHeaders = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// API calls with auth
export const authApiCall = {
  get: async (endpoint, options = {}) => {
    return apiCall.get(endpoint, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
  },
  
  post: async (endpoint, data, options = {}) => {
    return apiCall.post(endpoint, data, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
  },
  
  put: async (endpoint, data, options = {}) => {
    return apiCall.put(endpoint, data, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
  },
  
  delete: async (endpoint, options = {}) => {
    return apiCall.delete(endpoint, {
      ...options,
      headers: {
        ...getAuthHeaders(),
        ...options.headers
      }
    });
  }
};

// Health check
export const checkServerHealth = async () => {
  try {
    const response = await fetchWithTimeout(`${API_BASE_URL}/health`, {}, 5000);
    return { status: 'ok', data: await response.json() };
  } catch (error) {
    return { status: 'error', error: error.message };
  }
};

export default apiCall;
