import React from 'react';
import PropTypes from 'prop-types';

const Card = ({ 
  children, 
  className = '', 
  title, 
  subtitle,
  headerAction,
  headerIcon,
  variant = 'default',
  size = 'medium',
  shadow = true,
  padding = true,
  onClick,
  hover = false,
  ...props 
}) => {
  const baseClasses = 'bg-white rounded-lg border';
  
  const variantClasses = {
    default: 'border-gray-200',
    primary: 'border-blue-200 bg-blue-50',
    success: 'border-green-200 bg-green-50',
    warning: 'border-yellow-200 bg-yellow-50',
    danger: 'border-red-200 bg-red-50',
    info: 'border-indigo-200 bg-indigo-50'
  };
  
  const sizeClasses = {
    small: 'text-sm',
    medium: 'text-base',
    large: 'text-lg'
  };
  
  const shadowClasses = shadow ? 'shadow-sm hover:shadow-md transition-shadow duration-200' : '';
  const paddingClasses = padding ? 'p-6' : '';
  const hoverClasses = hover || onClick ? 'cursor-pointer hover:shadow-lg transition-all duration-200' : '';
  
  const cardClasses = [
    baseClasses,
    variantClasses[variant] || variantClasses.default,
    sizeClasses[size],
    shadowClasses,
    paddingClasses,
    hoverClasses,
    className
  ].filter(Boolean).join(' ');

  return (
    <div 
      className={cardClasses}
      onClick={onClick}
      {...props}
    >
      {(title || subtitle || headerAction || headerIcon) && (
        <div className="flex items-center justify-between mb-4 border-b border-gray-100 pb-3">
          <div className="flex items-center gap-3">
            {headerIcon && (
              <div className="flex-shrink-0">
                {headerIcon}
              </div>
            )}
            <div>
              {title && (
                <h3 className="text-lg font-semibold text-gray-900 mb-1">
                  {title}
                </h3>
              )}
              {subtitle && (
                <p className="text-sm text-gray-600">
                  {subtitle}
                </p>
              )}
            </div>
          </div>
          {headerAction && (
            <div className="flex-shrink-0">
              {headerAction}
            </div>
          )}
        </div>
      )}
      
      <div className={!padding ? 'p-6' : ''}>
        {children}
      </div>
    </div>
  );
};

Card.Header = ({ children, className = '', ...props }) => (
  <div className={`border-b border-gray-100 pb-3 mb-4 ${className}`} {...props}>
    {children}
  </div>
);

Card.Body = ({ children, className = '', ...props }) => (
  <div className={`${className}`} {...props}>
    {children}
  </div>
);

Card.Footer = ({ children, className = '', ...props }) => (
  <div className={`border-t border-gray-100 pt-3 mt-4 ${className}`} {...props}>
    {children}
  </div>
);

Card.propTypes = {
  children: PropTypes.node.isRequired,
  className: PropTypes.string,
  title: PropTypes.string,
  subtitle: PropTypes.string,
  headerAction: PropTypes.node,
  headerIcon: PropTypes.node,
  variant: PropTypes.oneOf(['default', 'primary', 'success', 'warning', 'danger', 'info']),
  size: PropTypes.oneOf(['small', 'medium', 'large']),
  shadow: PropTypes.bool,
  padding: PropTypes.bool,
  onClick: PropTypes.func,
  hover: PropTypes.bool
};

export default Card;