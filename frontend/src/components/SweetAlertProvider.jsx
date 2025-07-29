import React, { createContext, useContext } from 'react';
import { sweetAlert } from '../utils/sweetAlert.js';

const SweetAlertContext = createContext();

export const SweetAlertProvider = ({ children }) => {
  return (
    <SweetAlertContext.Provider value={sweetAlert}>
      {children}
    </SweetAlertContext.Provider>
  );
};

export const useSweetAlert = () => {
  const context = useContext(SweetAlertContext);
  if (!context) {
    throw new Error('useSweetAlert must be used within a SweetAlertProvider');
  }
  return context;
};

// Alias for easier migration
export const useGlobalAlert = () => {
  const sweetAlert = useSweetAlert();
  
  return {
    alert: sweetAlert,
    confirm: sweetAlert.confirm,
    success: sweetAlert.success,
    error: sweetAlert.error
  };
};
