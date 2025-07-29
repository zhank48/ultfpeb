import React, { createContext, useContext, useState, useCallback } from 'react';

const VisitorContext = createContext();

export const VisitorProvider = ({ children }) => {
  const [visitorDataVersion, setVisitorDataVersion] = useState(0);

  // Function to trigger refresh of visitor data across all components
  const refreshVisitorData = useCallback(() => {
    setVisitorDataVersion(prev => prev + 1);
  }, []);

  const value = {
    visitorDataVersion,
    refreshVisitorData
  };

  return (
    <VisitorContext.Provider value={value}>
      {children}
    </VisitorContext.Provider>
  );
};

export const useVisitorContext = () => {
  const context = useContext(VisitorContext);
  if (!context) {
    throw new Error('useVisitorContext must be used within a VisitorProvider');
  }
  return context;
};
