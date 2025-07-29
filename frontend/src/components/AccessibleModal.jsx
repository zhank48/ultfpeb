import React, { useEffect } from 'react';
import { createPortal } from 'react-dom';
import { useFocusTrap } from '../hooks/useFocusTrap.js';
import { X } from 'lucide-react';

export const AccessibleModal = ({ 
  isOpen, 
  onClose, 
  title, 
  children, 
  size = 'medium',
  showCloseButton = true 
}) => {
  const focusTrapRef = useFocusTrap(isOpen);

  useEffect(() => {
    if (isOpen) {
      // Prevent body scroll
      document.body.style.overflow = 'hidden';
      // Set aria-hidden on root element but keep modal accessible
      const root = document.getElementById('root');
      if (root) {
        root.setAttribute('aria-hidden', 'true');
      }
    } else {
      // Restore body scroll
      document.body.style.overflow = 'unset';
      // Remove aria-hidden from root
      const root = document.getElementById('root');
      if (root) {
        root.removeAttribute('aria-hidden');
      }
    }

    return () => {
      document.body.style.overflow = 'unset';
      const root = document.getElementById('root');
      if (root) {
        root.removeAttribute('aria-hidden');
      }
    };
  }, [isOpen]);

  if (!isOpen) return null;

  const sizeStyles = {
    small: { maxWidth: '400px' },
    medium: { maxWidth: '600px' },
    large: { maxWidth: '800px' },
    fullscreen: { maxWidth: '95vw', maxHeight: '95vh' }
  };

  const modalContent = (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        backdropFilter: 'blur(4px)',
        zIndex: 9999,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '20px'
      }}
      onClick={(e) => {
        if (e.target === e.currentTarget) {
          onClose();
        }
      }}
      role="dialog"
      aria-modal="true"
      aria-labelledby={title ? "modal-title" : undefined}
    >
      <div
        ref={focusTrapRef}
        style={{
          backgroundColor: 'white',
          borderRadius: '16px',
          boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.25)',
          width: '100%',
          ...sizeStyles[size],
          maxHeight: '90vh',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        {(title || showCloseButton) && (
          <div style={{
            padding: '24px 24px 16px 24px',
            borderBottom: '1px solid #e5e7eb',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            {title && (
              <h2 
                id="modal-title"
                style={{
                  margin: 0,
                  fontSize: '20px',
                  fontWeight: '600',
                  color: '#111827'
                }}
              >
                {title}
              </h2>
            )}
            {showCloseButton && (
              <button
                data-modal-close
                onClick={onClose}
                style={{
                  padding: '8px',
                  border: 'none',
                  backgroundColor: 'transparent',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  color: '#6b7280',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                  e.target.style.color = '#6b7280';
                }}
                aria-label="Close modal"
              >
                <X size={20} />
              </button>
            )}
          </div>
        )}

        {/* Content */}
        <div style={{
          padding: '24px',
          overflowY: 'auto',
          flex: 1
        }}>
          {children}
        </div>
      </div>
    </div>
  );

  return createPortal(modalContent, document.body);
};

export default AccessibleModal;