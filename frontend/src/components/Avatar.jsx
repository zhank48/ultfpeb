import React, { useState } from 'react';
import PropTypes from 'prop-types';
import { User } from 'lucide-react';

const Avatar = ({ 
  src, 
  alt = 'Avatar', 
  size = 'medium', 
  shape = 'circle',
  fallbackText,
  showFallbackIcon = true,
  className = '',
  onClick,
  ...props 
}) => {
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-sm',
    medium: 'w-12 h-12 text-base',
    large: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-24 h-24 text-2xl'
  };

  const shapeClasses = {
    circle: 'rounded-full',
    square: 'rounded-lg',
    rounded: 'rounded-md'
  };

  const baseClasses = [
    'inline-flex items-center justify-center bg-gray-100 overflow-hidden',
    sizeClasses[size],
    shapeClasses[shape],
    onClick ? 'cursor-pointer hover:opacity-80 transition-opacity' : '',
    className
  ].filter(Boolean).join(' ');

  // Get initials from fallback text
  const getInitials = (text) => {
    if (!text) return '';
    return text
      .split(' ')
      .map(word => word.charAt(0))
      .join('')
      .toUpperCase()
      .slice(0, 2);
  };

  const handleImageLoad = () => {
    setImageLoading(false);
  };

  const handleImageError = () => {
    setImageError(true);
    setImageLoading(false);
  };

  // Build image URL with proper backend endpoint
  const getImageUrl = (imageSrc) => {
    if (!imageSrc) return null;
    
    // If it's already a full URL, use it as is
    if (imageSrc.startsWith('http://') || imageSrc.startsWith('https://')) {
      return imageSrc;
    }
    
    // If it's a relative path, build the full URL
    const baseUrl = window.location.origin.includes('localhost') 
      ? 'http://localhost:3001' 
      : window.location.origin;
    return `${baseUrl}/${imageSrc.replace(/^\/+/, '')}`;
  };

  const imageUrl = getImageUrl(src);

  return (
    <div 
      className={baseClasses}
      onClick={onClick}
      {...props}
    >
      {imageUrl && !imageError && (
        <>
          {imageLoading && (
            <div className="absolute inset-0 bg-gray-200 animate-pulse rounded-inherit" />
          )}
          <img
            src={imageUrl}
            alt={alt}
            className={`w-full h-full object-cover ${imageLoading ? 'opacity-0' : 'opacity-100'} transition-opacity`}
            onLoad={handleImageLoad}
            onError={handleImageError}
          />
        </>
      )}
      
      {(!imageUrl || imageError) && (
        <div className="flex items-center justify-center w-full h-full">
          {fallbackText ? (
            <span className="font-medium text-gray-600 select-none">
              {getInitials(fallbackText)}
            </span>
          ) : showFallbackIcon ? (
            <User className="w-1/2 h-1/2 text-gray-400" />
          ) : null}
        </div>
      )}
    </div>
  );
};

Avatar.Group = ({ children, max = 3, size = 'medium', className = '', ...props }) => {
  const avatars = React.Children.toArray(children);
  const visibleAvatars = avatars.slice(0, max);
  const remainingCount = avatars.length - max;

  const sizeClasses = {
    xs: 'w-6 h-6 text-xs',
    small: 'w-8 h-8 text-sm', 
    medium: 'w-12 h-12 text-base',
    large: 'w-16 h-16 text-lg',
    xl: 'w-20 h-20 text-xl',
    '2xl': 'w-24 h-24 text-2xl'
  };

  return (
    <div className={`flex -space-x-2 ${className}`} {...props}>
      {visibleAvatars.map((avatar, index) => (
        <div key={index} className="ring-2 ring-white">
          {React.cloneElement(avatar, { size })}
        </div>
      ))}
      {remainingCount > 0 && (
        <div className={`
          ${sizeClasses[size]} 
          rounded-full bg-gray-200 ring-2 ring-white 
          flex items-center justify-center text-gray-600 font-medium
        `}>
          +{remainingCount}
        </div>
      )}
    </div>
  );
};

Avatar.propTypes = {
  src: PropTypes.string,
  alt: PropTypes.string,
  size: PropTypes.oneOf(['xs', 'small', 'medium', 'large', 'xl', '2xl']),
  shape: PropTypes.oneOf(['circle', 'square', 'rounded']),
  fallbackText: PropTypes.string,
  showFallbackIcon: PropTypes.bool,
  className: PropTypes.string,
  onClick: PropTypes.func
};

Avatar.Group.propTypes = {
  children: PropTypes.node.isRequired,
  max: PropTypes.number,
  size: PropTypes.oneOf(['xs', 'small', 'medium', 'large', 'xl', '2xl']),
  className: PropTypes.string
};

export default Avatar;