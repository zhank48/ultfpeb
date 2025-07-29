/**
 * Global Alert and Confirm Overrides
 * This utility replaces default browser alert() and confirm() with styled versions
 */

// Store reference to original functions
const originalAlert = window.alert;
const originalConfirm = window.confirm;

// Global alert manager instance
let globalAlertManager = null;

// Set global alert manager (called from AlertProvider)
export const setGlobalAlertManager = (manager) => {
  globalAlertManager = manager;
};

// Enhanced alert function
export const customAlert = (message, type = 'info') => {
  if (globalAlertManager) {
    switch (type) {
      case 'success':
        globalAlertManager.alert.success(message);
        break;
      case 'error':
      case 'danger':
        globalAlertManager.alert.error(message);
        break;
      case 'warning':
        globalAlertManager.alert.warning(message);
        break;
      default:
        globalAlertManager.alert.info(message);
    }
  } else {
    // Fallback to original alert if manager not available
    originalAlert(message);
  }
};

// Enhanced confirm function
export const customConfirm = async (message, options = {}) => {
  if (globalAlertManager) {
    try {
      return await globalAlertManager.confirm(message, options);
    } catch (error) {
      console.warn('Custom confirm failed, falling back to original:', error);
      return originalConfirm(message);
    }
  } else {
    // Fallback to original confirm if manager not available
    return originalConfirm(message);
  }
};

// Override global functions (optional - can be enabled/disabled)
export const enableGlobalOverrides = () => {
  window.alert = customAlert;
  window.confirm = customConfirm;
  console.log('✅ Global alert/confirm overrides enabled');
};

export const disableGlobalOverrides = () => {
  window.alert = originalAlert;
  window.confirm = originalConfirm;
  console.log('ℹ️ Global alert/confirm overrides disabled');
};

// Auto-enable overrides when this module is imported
// enableGlobalOverrides();

export default {
  setGlobalAlertManager,
  customAlert,
  customConfirm,
  enableGlobalOverrides,
  disableGlobalOverrides
};
