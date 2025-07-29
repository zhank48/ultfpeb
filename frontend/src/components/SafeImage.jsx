import { useState } from 'react';
import { User, Eye } from 'lucide-react';
import { ImagePreviewModal } from './ImagePreviewModal';

export function SafeImage({ 
  src, 
  alt, 
  fallbackText, 
  style, 
  className, 
  enablePreview = true,
  previewTitle,
  ...props 
}) {
  const [imageError, setImageError] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  const handleImageError = (e) => {
    // Silently handle image errors - fallback will show instead
    setImageError(true);
  };

  const handleImageLoad = () => {
    setImageLoaded(true);
    setImageError(false);
  };

  const handleImageClick = () => {
    if (enablePreview && isValidSrc && !imageError) {
      setShowPreview(true);
    }
  };

  // Check if src is empty, null, undefined, or invalid
  const isValidSrc = src && 
    src !== 'null' && 
    src !== 'undefined' && 
    src !== '' && 
    src.trim() !== '';

  // If there's no valid src or image failed to load, show fallback
  if (!isValidSrc || imageError) {
    return (
      <div 
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: style?.backgroundColor || '#0d6efd',
          color: 'white',
          fontSize: style?.fontSize || '16px',
          fontWeight: '600',
          ...style
        }}
        className={className}
        {...props}
      >
        {fallbackText ? fallbackText.charAt(0).toUpperCase() : <User size={Math.min(parseInt(style?.width) / 4, 16) || 16} />}
      </div>
    );
  }

  return (
    <>
      {!imageLoaded && (
        <div 
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            backgroundColor: '#f8f9fa',
            color: '#6c757d',
            fontSize: '12px',
            ...style
          }}
          className={className}
        >
          Loading...
        </div>
      )}
      <div
        style={{
          position: 'relative',
          display: 'inline-block',
          cursor: enablePreview ? 'pointer' : 'default'
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={handleImageClick}
      >
        <img
          src={src}
          alt={alt}
          onLoad={handleImageLoad}
          onError={handleImageError}
          style={{
            ...style,
            display: imageLoaded ? 'block' : 'none',
            transition: 'transform 0.2s ease, filter 0.2s ease',
            transform: isHovered && enablePreview ? 'scale(1.05)' : 'scale(1)',
            filter: isHovered && enablePreview ? 'brightness(1.1)' : 'brightness(1)'
          }}
          className={className}
          {...props}
        />
        
        {/* Preview Overlay */}
        {enablePreview && isHovered && imageLoaded && (
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              backgroundColor: 'rgba(0, 0, 0, 0.3)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: style?.borderRadius || '0',
              transition: 'opacity 0.2s ease'
            }}
          >
            <div
              style={{
                backgroundColor: 'rgba(0, 0, 0, 0.7)',
                color: 'white',
                padding: '8px 12px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '12px',
                fontWeight: '500'
              }}
            >
              <Eye size={14} />
              Preview
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      <ImagePreviewModal
        isOpen={showPreview}
        onClose={() => setShowPreview(false)}
        imageUrl={src}
        alt={alt}
        title={previewTitle || 'Image Preview'}
      />
    </>
  );
}
