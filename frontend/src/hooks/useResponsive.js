import { useState, useEffect } from 'react';

export function useResponsive() {
  const [isMobile, setIsMobile] = useState(false);
  const [isTablet, setIsTablet] = useState(false);
  const [isDesktop, setIsDesktop] = useState(false);

  useEffect(() => {
    const checkScreenSize = () => {
      const width = window.innerWidth;
      
      setIsMobile(width < 768);
      setIsTablet(width >= 768 && width < 1024);
      setIsDesktop(width >= 1024);
    };

    checkScreenSize();
    window.addEventListener('resize', checkScreenSize);
    
    return () => window.removeEventListener('resize', checkScreenSize);
  }, []);

  return {
    isMobile,
    isTablet,
    isDesktop,
    screenWidth: window.innerWidth
  };
}

export function useSidebar() {
  const [sidebarOpen, setSidebarOpen] = useState(true); // Default to true for better UX
  const { isMobile, isTablet, isDesktop } = useResponsive();

  useEffect(() => {
    // Auto control sidebar based on screen size
    if (isDesktop) {
      setSidebarOpen(true); // Auto open on desktop
    } else if (isTablet) {
      setSidebarOpen(false); // Auto close on tablet for more space
    } else {
      setSidebarOpen(false); // Auto close on mobile
    }
  }, [isDesktop, isMobile, isTablet]);
  
  const toggleSidebar = () => {
    console.log('useSidebar toggleSidebar called. Current state:', sidebarOpen);
    setSidebarOpen(!sidebarOpen);
  };

  const closeSidebar = () => {
    setSidebarOpen(false);
  };

  const openSidebar = () => {
    setSidebarOpen(true);
  };

  return {
    sidebarOpen,
    setSidebarOpen,
    toggleSidebar,
    closeSidebar,
    openSidebar,
    isMobile,
    isTablet,
    isDesktop
  };
}
