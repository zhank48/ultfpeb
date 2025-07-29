import { useEffect, useRef } from 'react';

export const useFocusTrap = (isActive) => {
  const containerRef = useRef();

  useEffect(() => {
    if (!isActive || !containerRef.current) return;

    const container = containerRef.current;
    const focusableElements = container.querySelectorAll(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );
    
    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    // Focus first element when trap activates
    if (firstElement) {
      firstElement.focus();
    }

    const handleTabKey = (e) => {
      if (e.key !== 'Tab') return;

      if (e.shiftKey) {
        // Shift + Tab
        if (document.activeElement === firstElement) {
          e.preventDefault();
          lastElement?.focus();
        }
      } else {
        // Tab
        if (document.activeElement === lastElement) {
          e.preventDefault();
          firstElement?.focus();
        }
      }
    };

    const handleEscapeKey = (e) => {
      if (e.key === 'Escape') {
        const closeButton = container.querySelector('[data-modal-close]');
        if (closeButton) {
          closeButton.click();
        }
      }
    };

    document.addEventListener('keydown', handleTabKey);
    document.addEventListener('keydown', handleEscapeKey);

    // Prevent focus outside modal
    const handleFocusOut = (e) => {
      if (!container.contains(e.target)) {
        e.preventDefault();
        firstElement?.focus();
      }
    };

    document.addEventListener('focusin', handleFocusOut);

    return () => {
      document.removeEventListener('keydown', handleTabKey);
      document.removeEventListener('keydown', handleEscapeKey);
      document.removeEventListener('focusin', handleFocusOut);
    };
  }, [isActive]);

  return containerRef;
};