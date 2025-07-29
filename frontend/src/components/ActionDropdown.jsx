import { useState, useRef, useEffect } from 'react';
import { MoreVertical } from 'lucide-react';

export function ActionDropdown({ 
  children, 
  isOpen, 
  onToggle, 
  triggerProps = {},
  dropdownProps = {} 
}) {
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        onToggle(false);
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => document.removeEventListener('mousedown', handleClickOutside);
    }
  }, [isOpen, onToggle]);  const handleToggle = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onToggle(!isOpen);
  };
  return (
    <div ref={dropdownRef} style={{ position: 'relative' }} data-dropdown>
      <button
        type="button"
        onClick={handleToggle}
        data-dropdown
        style={{
          padding: '8px',
          border: 'none',
          backgroundColor: 'transparent',
          borderRadius: '6px',
          cursor: 'pointer',
          color: '#6c757d',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          ...triggerProps.style
        }}
        {...triggerProps}
      >
        <MoreVertical style={{ width: '16px', height: '16px' }} />
      </button>
      
      {isOpen && (
        <div 
          data-dropdown
          style={{
            position: 'absolute',
            right: '0',
            top: '100%',
            minWidth: '180px',
            backgroundColor: 'white',
            borderRadius: '8px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6',
            zIndex: 1000,
            marginTop: '4px',
            ...dropdownProps.style
          }}
          {...dropdownProps}
        >
          <div style={{ padding: '8px 0' }} data-dropdown>
            {children}
          </div>
        </div>
      )}
    </div>
  );
}

export function DropdownItem({ 
  icon: Icon, 
  children, 
  onClick, 
  danger = false,
  href,
  ...props 
}) {
  const handleClick = (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    if (onClick) {
      const result = onClick(e);
      // If onClick returns false, don't proceed with navigation
      if (result === false) return;
    }
    
    // Handle navigation if href is provided
    if (href && typeof window !== 'undefined') {
      window.location.href = href;
    }
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: '8px',
        width: '100%',
        padding: '8px 16px',
        border: 'none',
        backgroundColor: 'transparent',
        fontSize: '14px',
        color: danger ? '#dc3545' : '#495057',
        cursor: 'pointer',
        transition: 'background-color 0.15s ease'
      }}
      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
      {...props}
    >
      {Icon && <Icon style={{ width: '16px', height: '16px' }} />}
      {children}
    </button>
  );
}
