import axios from 'axios';
import { getApiConfig } from './apiConfig.js';

const apiConfig = getApiConfig();

// Create axios instance with default config
const api = axios.create({
  baseURL: `${apiConfig.baseURL}/visitor-management`,
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add request interceptor to include auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Add response interceptor for error handling
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      // Token expired or invalid - let AuthContext handle the redirect
      localStorage.removeItem('token');
      localStorage.removeItem('currentUser');
      // Don't force redirect here, let React Router handle it
      console.warn('Authentication failed, token removed');
    }
    return Promise.reject(error);
  }
);

export const visitorManagementAPI = {
  /**
   * Get visitors based on role and view type
   * @param {Object} params - Query parameters
   * @param {string} params.viewType - View type (active, pending_deletion, etc.)
   * @param {string} params.search - Search term
   * @param {string} params.location - Location filter
   * @param {string} params.startDate - Start date filter
   * @param {string} params.endDate - End date filter
   * @param {number} params.limit - Limit results
   */
  getVisitors: async (params = {}) => {
    try {
      const cleanParams = Object.fromEntries(
        Object.entries(params).filter(([_, value]) => value !== undefined && value !== '')
      );
      
      const response = await api.get('/', { params: cleanParams });
      return response;
    } catch (error) {
      console.error('Error fetching visitors:', error);
      throw error;
    }
  },

  /**
   * Create visitor edit request
   * @param {Object} requestData
   * @param {number} requestData.visitor_id - Visitor ID
   * @param {string} requestData.reason - Reason for edit
   * @param {Object} requestData.edit_data - Data to be edited
   */
  createEditRequest: async (requestData) => {
    try {
      const response = await api.post('/edit-request', requestData);
      return response;
    } catch (error) {
      console.error('Error creating edit request:', error);
      throw error;
    }
  },

  /**
   * Create visitor deletion request
   * @param {Object} requestData
   * @param {number} requestData.visitor_id - Visitor ID
   * @param {string} requestData.reason - Reason for deletion
   */
  createDeletionRequest: async (requestData) => {
    try {
      const response = await api.post('/deletion-request', requestData);
      return response;
    } catch (error) {
      console.error('Error creating deletion request:', error);
      throw error;
    }
  },


  /**
   * Approve edit request (Admin only)
   * @param {number} requestId - Request ID
   */
  approveEditRequest: async (requestId) => {
    try {
      const response = await api.post(`/approve-edit/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error approving edit request:', error);
      throw error;
    }
  },

  /**
   * Approve deletion request (Admin only)
   * @param {number} requestId - Request ID
   */
  approveDeletionRequest: async (requestId) => {
    try {
      const response = await api.post(`/approve-deletion/${requestId}`);
      return response;
    } catch (error) {
      console.error('Error approving deletion request:', error);
      throw error;
    }
  },


  /**
   * Reject request (Admin only)
   * @param {string} requestType - 'edit' or 'deletion'
   * @param {number} requestId - Request ID
   * @param {Object} rejectionData
   * @param {string} rejectionData.rejection_reason - Reason for rejection
   */
  rejectRequest: async (requestType, requestId, rejectionData = {}) => {
    try {
      const response = await api.post(`/reject/${requestType}/${requestId}`, rejectionData);
      return response;
    } catch (error) {
      console.error('Error rejecting request:', error);
      throw error;
    }
  },

  /**
   * Get dashboard statistics
   */
  getStats: async () => {
    try {
      const response = await api.get('/stats');
      return response;
    } catch (error) {
      console.error('Error fetching stats:', error);
      throw error;
    }
  },

  /**
   * Get visitor details by ID
   * @param {number} visitorId - Visitor ID
   */
  getVisitorById: async (visitorId) => {
    try {
      const response = await api.get(`/visitor/${visitorId}`);
      return response;
    } catch (error) {
      console.error('Error fetching visitor details:', error);
      throw error;
    }
  },

  /**
   * Get pending requests for current user (Receptionist)
   */
  getMyRequests: async () => {
    try {
      const response = await api.get('/my-requests');
      return response;
    } catch (error) {
      console.error('Error fetching user requests:', error);
      throw error;
    }
  },

  /**
   * Get audit trail for a specific visitor
   * @param {number} visitorId - Visitor ID
   */
  getVisitorAuditTrail: async (visitorId) => {
    try {
      const response = await api.get(`/audit/${visitorId}`);
      return response;
    } catch (error) {
      console.error('Error fetching audit trail:', error);
      throw error;
    }
  },

  /**
   * Bulk approve requests (Admin only)
   * @param {Array} requestIds - Array of request IDs
   * @param {string} requestType - 'edit' or 'deletion'
   */
  bulkApprove: async (requestIds, requestType) => {
    try {
      const response = await api.post('/bulk-approve', {
        request_ids: requestIds,
        request_type: requestType
      });
      return response;
    } catch (error) {
      console.error('Error bulk approving requests:', error);
      throw error;
    }
  },

  /**
   * Bulk reject requests (Admin only)
   * @param {Array} requestIds - Array of request IDs
   * @param {string} requestType - 'edit' or 'deletion'
   * @param {string} rejectionReason - Reason for rejection
   */
  bulkReject: async (requestIds, requestType, rejectionReason = '') => {
    try {
      const response = await api.post('/bulk-reject', {
        request_ids: requestIds,
        request_type: requestType,
        rejection_reason: rejectionReason
      });
      return response;
    } catch (error) {
      console.error('Error bulk rejecting requests:', error);
      throw error;
    }
  },

  /**
   * Get deletion requests (Admin only)
   */
  getDeletionRequests: async () => {
    try {
      // Use visitor-management deletion-requests API endpoint
      const deletionApi = axios.create({
        baseURL: `${apiConfig.baseURL}/visitor-management`,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const response = await deletionApi.get('/deletion-requests');
      return response;
    } catch (error) {
      console.error('Error fetching deletion requests:', error);
      throw error;
    }
  },

  /**
   * Check if visitor has pending deletion request
   */
  checkVisitorDeletionStatus: async (visitorId) => {
    try {
      const deletionApi = axios.create({
        baseURL: `${apiConfig.baseURL}/visitor-management`,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const response = await deletionApi.get(`/deletion-requests/visitor/${visitorId}/status`);
      return response;
    } catch (error) {
      console.error('Error checking visitor deletion status:', error);
      throw error;
    }
  },

  /**
   * Batch check visitor deletion statuses for multiple visitors
   */
  batchCheckVisitorDeletionStatus: async (visitorIds) => {
    try {
      const deletionApi = axios.create({
        baseURL: `${apiConfig.baseURL}/visitor-management`,
        timeout: 30000,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
      });
      
      const response = await deletionApi.post('/batch-status-check', { visitorIds });
      return response;
    } catch (error) {
      console.error('Error batch checking visitor deletion status:', error);
      throw error;
    }
  },

  /**
   * Export visitors data
   * @param {Object} filters - Export filters
   * @param {string} format - Export format ('excel', 'pdf', 'csv')
   */
  exportVisitors: async (filters = {}, format = 'excel') => {
    try {
      const response = await api.get('/export', {
        params: { ...filters, format },
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('Error exporting visitors:', error);
      throw error;
    }
  },






  /**
   * Get activity logs for admin dashboard
   */
  getActivityLogs: async () => {
    try {
      const response = await api.get('/activity-logs');
      return response;
    } catch (error) {
      console.error('Error fetching activity logs:', error);
      throw error;
    }
  }
};

export default visitorManagementAPI;