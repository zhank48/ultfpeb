/**
 * Authentication Utility
 * Handles token management and automatic refresh
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';

class AuthManager {
    constructor() {
        this.token = localStorage.getItem('token');
        this.refreshing = false;
        this.refreshPromise = null;
    }

    // Get current token
    getToken() {
        return this.token || localStorage.getItem('token');
    }

    // Set token
    setToken(token) {
        this.token = token;
        if (token) {
            localStorage.setItem('token', token);
        } else {
            localStorage.removeItem('token');
        }
    }

    // Clear token
    clearToken() {
        this.token = null;
        localStorage.removeItem('token');
        localStorage.removeItem('user');
    }

    // Check if token exists
    hasToken() {
        return !!this.getToken();
    }

    // Make authenticated API request
    async apiRequest(url, options = {}) {
        const token = this.getToken();
        
        const config = {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...options.headers,
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };

        try {
            const response = await fetch(`${API_BASE_URL}${url}`, config);
            const data = await response.json();

            // If token expired, try to refresh
            if (!response.ok && data.code === 'TOKEN_EXPIRED') {
                console.log('Token expired, attempting refresh...');
                
                const refreshed = await this.refreshToken();
                if (refreshed) {
                    // Retry original request with new token
                    config.headers['Authorization'] = `Bearer ${this.getToken()}`;
                    const retryResponse = await fetch(`${API_BASE_URL}${url}`, config);
                    return await retryResponse.json();
                } else {
                    // Refresh failed, redirect to login
                    this.handleAuthFailure();
                    throw new Error('Authentication failed');
                }
            }

            return data;
        } catch (error) {
            console.error('API Request failed:', error);
            throw error;
        }
    }

    // Refresh token
    async refreshToken() {
        // Prevent multiple simultaneous refresh attempts
        if (this.refreshing) {
            return this.refreshPromise;
        }

        this.refreshing = true;
        this.refreshPromise = this._performRefresh();

        try {
            const result = await this.refreshPromise;
            return result;
        } finally {
            this.refreshing = false;
            this.refreshPromise = null;
        }
    }

    async _performRefresh() {
        const token = this.getToken();
        
        if (!token) {
            console.log('No token to refresh');
            return false;
        }

        try {
            const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${token}`
                }
            });

            const data = await response.json();

            if (response.ok && data.success) {
                console.log('Token refreshed successfully');
                this.setToken(data.data.token);
                
                // Update user data in localStorage
                if (data.data.user) {
                    localStorage.setItem('user', JSON.stringify(data.data.user));
                }
                
                return true;
            } else {
                console.log('Token refresh failed:', data.message);
                return false;
            }
        } catch (error) {
            console.error('Token refresh error:', error);
            return false;
        }
    }

    // Handle authentication failure
    handleAuthFailure() {
        console.log('Authentication failed, clearing session...');
        this.clearToken();
        
        // Redirect to login page
        if (window.location.pathname !== '/login') {
            window.location.href = '/login';
        }
    }

    // Login
    async login(email, password) {
        try {
            const response = await fetch(`${API_BASE_URL}/auth/login`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify({ email, password })
            });

            const data = await response.json();

            if (response.ok && data.success) {
                this.setToken(data.data.token);
                localStorage.setItem('user', JSON.stringify(data.data.user));
                return { success: true, data: data.data };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Login error:', error);
            return { success: false, message: 'Network error occurred' };
        }
    }

    // Logout
    async logout() {
        this.clearToken();
        window.location.href = '/login';
    }

    // Verify token
    async verifyToken() {
        try {
            const data = await this.apiRequest('/auth/verify');
            
            if (data.success) {
                localStorage.setItem('user', JSON.stringify(data.data.user));
                return { success: true, user: data.data.user };
            } else {
                return { success: false, message: data.message };
            }
        } catch (error) {
            console.error('Token verification error:', error);
            return { success: false, message: 'Token verification failed' };
        }
    }

    // Get current user
    getCurrentUser() {
        const userStr = localStorage.getItem('user');
        return userStr ? JSON.parse(userStr) : null;
    }

    // Check if user has specific role
    hasRole(role) {
        const user = this.getCurrentUser();
        return user && user.role === role;
    }

    // Check if user is admin
    isAdmin() {
        return this.hasRole('Admin');
    }

    // Check if user is receptionist
    isReceptionist() {
        return this.hasRole('Receptionist');
    }
}

// Create singleton instance
const authManager = new AuthManager();

// Export for use in components
export default authManager;

// Helper functions for backward compatibility
export const login = (email, password) => authManager.login(email, password);
export const logout = () => authManager.logout();
export const verifyToken = () => authManager.verifyToken();
export const getCurrentUser = () => authManager.getCurrentUser();
export const hasRole = (role) => authManager.hasRole(role);
export const isAdmin = () => authManager.isAdmin();
export const isReceptionist = () => authManager.isReceptionist();
export const apiRequest = (url, options) => authManager.apiRequest(url, options);
