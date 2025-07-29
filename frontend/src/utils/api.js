import axios from 'axios';
import authManager from './auth.js';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';

// Create axios instance
const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 30000 // Increased to 30 seconds
});

// Request interceptor to add auth headers
api.interceptors.request.use(
  (config) => {
    const token = authManager.getToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor for error handling and token refresh
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    const originalRequest = error.config;

    // If token expired and we haven't already tried to refresh
    if (error.response?.status === 401 && 
        error.response?.data?.code === 'TOKEN_EXPIRED' && 
        !originalRequest._retry) {
      
      originalRequest._retry = true;
      console.log('Token expired, attempting refresh...');

      try {
        const refreshed = await authManager.refreshToken();
        
        if (refreshed) {
          // Retry original request with new token
          const newToken = authManager.getToken();
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          return api(originalRequest);
        } else {
          // Refresh failed, redirect to login
          authManager.handleAuthFailure();
          return Promise.reject(error);
        }
      } catch (refreshError) {
        console.error('Token refresh failed:', refreshError);
        authManager.handleAuthFailure();
        return Promise.reject(error);
      }
    }

    // Handle other auth errors
    if (error.response?.status === 401) {
      console.log('Authentication failed');
      authManager.handleAuthFailure();
    }

    return Promise.reject(error);
  }
);

// Timeout wrapper for critical API calls
const withTimeout = (promise, timeoutMs = 15000) => {
  return Promise.race([
    promise,
    new Promise((_, reject) => {
      setTimeout(() => {
        reject(new Error(`Request timeout after ${timeoutMs}ms`));
      }, timeoutMs);
    })
  ]);
};

// Auth API
export const authAPI = {
  login: (credentials) => api.post('/auth/login', credentials),
  register: (userData) => api.post('/auth/register', userData),
  verify: () => api.get('/auth/verify'),
};

// Users API
export const usersAPI = {
  getAll: () => api.get('/users'),
  getProfile: () => api.get('/users/profile'),
  create: (userData) => api.post('/users', userData),
  update: (id, userData) => api.put(`/users/${id}`, userData),
  updatePassword: (id, passwordData) => api.put(`/users/${id}/password`, passwordData),
  uploadPhoto: (id, formData) => api.put(`/users/${id}/photo`, formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  delete: (id) => api.delete(`/users/${id}`),
  deactivate: (id) => api.patch(`/users/${id}/deactivate`),
  reactivate: (id) => api.patch(`/users/${id}/reactivate`),
};

// Visitors API
export const visitorsAPI = {
  getAll: (params) => api.get('/visitors', { params }),
  getById: (id) => api.get(`/visitors/${id}`),
  create: (formData) => api.post('/visitors/check-in', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
  }),
  update: (id, data) => api.put(`/visitors/${id}`, data),
  checkOut: (id, data = {}) => api.patch(`/visitors/${id}/checkout`, data),
  delete: (id, reason = null) => {
    const data = reason ? { reason } : {};
    return api.delete(`/visitors/${id}`, { data });
  },
  softDelete: (id) => api.patch(`/visitors/${id}/soft-delete`),
  restore: (id) => api.patch(`/visitors/${id}/restore`),
  permanentDelete: (id) => api.delete(`/visitors/${id}/permanent`),
  getStats: () => api.get('/visitors/stats'),
  downloadDocx: (id) => api.get(`/visitors/${id}/report`, {
    responseType: 'blob'
  }),
};

// Feedback API
export const feedbackAPI = {
  create: async (feedbackData) => {
    const response = await api.post('/feedback', feedbackData);
    return response.data; // Unwrap the nested structure
  },
  getAll: async () => {
    const response = await api.get('/feedback');
    return response.data; // Unwrap the nested structure
  },
  getByVisitorId: async (visitorId) => {
    const response = await api.get(`/feedback/visitor/${visitorId}`);
    return response.data; // Unwrap the nested structure
  },
  getStats: async () => {
    const response = await api.get('/feedback/stats');
    return response.data; // Unwrap the nested structure
  },
  getCategories: async () => {
    const response = await api.get('/feedback/categories');
    return response.data; // Unwrap the nested structure
  },
  delete: async (id) => {
    const response = await api.delete(`/feedback/${id}`);
    return response.data; // Unwrap the nested structure
  },
};

// Complaints API
export const complaintsAPI = {
  // Public endpoints
  submit: async (complaintData) => {
    const response = await api.post('/complaints/submit', complaintData);
    return response.data;
  },
  submitWithFile: async (formData) => {
    const response = await api.post('/complaints/submit', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      }
    });
    return response.data;
  },
  getCategories: async () => {
    const response = await api.get('/complaints/categories/list');
    return response.data;
  },
  getFields: async () => {
    const response = await api.get('/complaints/fields/list');
    return response.data;
  },
  
  // Admin endpoints
  getAll: async () => {
    const response = await api.get('/complaints');
    return response.data;
  },
  getById: async (id) => {
    const response = await api.get(`/complaints/${id}`);
    return response.data;
  },
  updateStatus: async (id, statusData) => {
    const response = await api.patch(`/complaints/${id}/status`, statusData);
    return response.data;
  },
  addResponse: async (id, responseData) => {
    const response = await api.post(`/complaints/${id}/responses`, responseData);
    return response.data;
  },
  getStats: async () => {
    const response = await api.get('/complaints/stats/overview');
    return response.data;
  },
  
  // Field management endpoints
  getAllFields: async () => {
    const response = await api.get('/complaints/fields/all');
    return response.data;
  },
  createField: async (fieldData) => {
    const response = await api.post('/complaints/fields', fieldData);
    return response.data;
  },
  updateField: async (id, fieldData) => {
    const response = await api.put(`/complaints/fields/${id}`, fieldData);
    return response.data;
  },
  deleteField: async (id) => {
    const response = await api.delete(`/complaints/fields/${id}`);
    return response.data;
  },
  toggleFieldStatus: async (id, isActive) => {
    const response = await api.patch(`/complaints/fields/${id}/toggle`, { is_active: isActive });
    return response.data;
  },
  updateFieldOrder: async (id, order) => {
    const response = await api.patch(`/complaints/fields/${id}/order`, { field_order: order });
    return response.data;
  }
};

// Complaint Management API (Admin only)
export const complaintManagementAPI = {
  // Fields management
  getFields: async () => {
    const response = await api.get('/complaint-management/fields');
    return response.data;
  },
  createField: async (fieldData) => {
    const response = await api.post('/complaint-management/fields', fieldData);
    return response.data;
  },
  updateField: async (id, fieldData) => {
    const response = await api.put(`/complaint-management/fields/${id}`, fieldData);
    return response.data;
  },
  deleteField: async (id) => {
    const response = await api.delete(`/complaint-management/fields/${id}`);
    return response.data;
  },
  
  // Categories management
  getCategories: async () => {
    const response = await api.get('/complaint-management/categories');
    return response.data;
  },
  createCategory: async (categoryData) => {
    const response = await api.post('/complaint-management/categories', categoryData);
    return response.data;
  },
  updateCategory: async (id, categoryData) => {
    const response = await api.put(`/complaint-management/categories/${id}`, categoryData);
    return response.data;
  },
  deleteCategory: async (id) => {
    const response = await api.delete(`/complaint-management/categories/${id}`);
    return response.data;
  },
  
  // Statistics
  getStats: async () => {
    const response = await api.get('/complaint-management/stats');
    return response.data;
  },
  
  // Export/Import
  exportComplaints: async (format = 'json', filters = {}) => {
    const response = await api.get('/complaint-management/export', {
      params: { format, ...filters }
    });
    return response.data;
  },
  
  importData: async (type, data) => {
    const response = await api.post('/complaint-management/import', { type, data });
    return response.data;
  }
};

// Dashboard API
export const dashboardAPI = {
  getStats: (params) => api.get('/dashboard/stats', { params }),
  exportData: (params) => api.get('/dashboard/export', { params }),
};



// Configurations API
export const configurationsAPI = {
  // Public endpoints
  getAll: () => api.get('/configurations'),
  
  // Admin endpoints
  getCategories: () => api.get('/configurations/categories/list'),
  getConfiguration: (categoryKey) => api.get(`/configurations/manage/${categoryKey}`),
  
  // Groups management
  addGroup: (groupData) => api.post('/configurations/groups', groupData),
  updateGroup: (groupId, groupData) => api.put(`/configurations/groups/${groupId}`, groupData),
  deleteGroup: (groupId) => api.delete(`/configurations/groups/${groupId}`),
  toggleGroup: (groupId) => api.patch(`/configurations/groups/${groupId}/toggle`),
  
  // Options management
  addOption: (optionData) => api.post('/configurations/options', optionData),
  updateOption: (optionId, optionData) => api.put(`/configurations/options/${optionId}`, optionData),
  deleteOption: (optionId) => api.delete(`/configurations/options/${optionId}`),
  toggleOption: (optionId) => api.patch(`/configurations/options/${optionId}/toggle`),
};

// Deletion Requests API
export const deletionRequestsAPI = {
  getAll: (params) => api.get('/visitor-management/deletion-requests', { params }),
  getById: (id) => api.get(`/visitor-management/deletion-requests/${id}`),
  create: (data) => api.post('/visitor-management/deletion-request', data),
  approve: (id, data) => api.post(`/visitor-management/approve-deletion/${id}`, data),
  reject: (id, data) => api.post(`/visitor-management/reject/deletion/${id}`, data),
  getStats: () => api.get('/visitor-management/stats'),
  getAuditLogs: (id) => api.get(`/visitor-management/deletion-requests/${id}/audit-logs`)
};

// Visitor Actions API (New Edit/Delete workflow)
export const visitorActionsAPI = {
  // Get all visitor actions (Admin only)
  getAll: (params) => withTimeout(api.get('/visitor-actions', { params })),
  
  // Get action by ID
  getById: (id) => withTimeout(api.get(`/visitor-actions/${id}`)),
  
  // Create new action (edit/delete request)
  create: (data) => withTimeout(api.post('/visitor-actions', data)),
  
  // Approve action
  approve: (id, data) => withTimeout(api.patch(`/visitor-actions/${id}/approve`, data)),
  
  // Reject action
  reject: (id, data) => withTimeout(api.patch(`/visitor-actions/${id}/reject`, data)),
  
  // Get statistics
  getStats: () => withTimeout(api.get('/visitor-actions/stats'), 5000), // Shorter timeout for stats
  
  // Get history for specific visitor
  getVisitorHistory: (visitorId) => withTimeout(api.get(`/visitor-actions/visitor/${visitorId}/history`))
};

// New Enhanced Visitor Management API
export const visitorManagementAPI = {
  getVisitors: (params) => withTimeout(api.get('/visitor-management', { params })),
  createEditRequest: (data) => withTimeout(api.post('/visitor-management/edit-request', data)),
  createDeletionRequest: (data) => withTimeout(api.post('/visitor-management/deletion-request', data)),
  approveEditRequest: (requestId) => withTimeout(api.post(`/visitor-management/approve-edit/${requestId}`)),
  approveDeletionRequest: (requestId) => withTimeout(api.post(`/visitor-management/approve-deletion/${requestId}`)),
  rejectRequest: (requestType, requestId, data) => withTimeout(api.post(`/visitor-management/reject/${requestType}/${requestId}`, data)),
  getStats: () => withTimeout(api.get('/visitor-management/stats'), 5000),
  getVisitorById: (id) => withTimeout(api.get(`/visitor-management/visitor/${id}`)),
  getMyRequests: () => withTimeout(api.get('/visitor-management/my-requests')),
  getAuditTrail: (visitorId) => withTimeout(api.get(`/visitor-management/audit/${visitorId}`)),
  exportVisitors: (filters, format) => withTimeout(api.get('/visitor-management/export', { 
    params: { ...filters, format }, 
    responseType: 'blob' 
  }), 60000) // Longer timeout for exports
};

export default api;
