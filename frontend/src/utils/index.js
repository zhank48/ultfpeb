import { clsx } from "clsx";
import { twMerge } from "tailwind-merge";

// API Configuration
export const API_BASE_URL = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';

export function cn(...inputs) {
  return twMerge(clsx(inputs));
}

// Format date utilities
export function formatDate(date, options = {}) {
  if (!date) return '';
  
  const defaultOptions = {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    ...options
  };
  
  return new Date(date).toLocaleDateString('id-ID', defaultOptions);
}

export function formatDateTime(date) {
  if (!date) return '';
  
  return new Date(date).toLocaleString('id-ID', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  });
}

// API utilities
export function getAuthHeaders() {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
}

// Storage utilities
export function getStorageItem(key, defaultValue = null) {
  try {
    const item = localStorage.getItem(key);
    return item ? JSON.parse(item) : defaultValue;
  } catch (error) {
    console.error('Error reading from localStorage:', error);
    return defaultValue;
  }
}

export function setStorageItem(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.error('Error writing to localStorage:', error);
  }
}

export function removeStorageItem(key) {
  try {
    localStorage.removeItem(key);
  } catch (error) {
    console.error('Error removing from localStorage:', error);
  }
}
