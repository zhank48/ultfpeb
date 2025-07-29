import React from 'react';
import { X, Download, ZoomIn, ZoomOut, RotateCw } from 'lucide-react';

export function ImagePreviewModal({ 
  isOpen, 
  onClose, 
  imageUrl, 
  alt = 'Preview Image',
  title = 'Image Preview'
}) {
  const [scale, setScale] = React.useState(1);
  const [rotation, setRotation] = React.useState(0);

  // Reset transformations when modal opens
  React.useEffect(() => {
    if (isOpen) {
      setScale(1);
      setRotation(0);
    }
  }, [isOpen]);

  // Handle keyboard events
  React.useEffect(() => {
    const handleKeyPress = (e) => {
      if (!isOpen) return;
      
      switch (e.key) {
        case 'Escape':
          onClose();
          break;
        case '+':
        case '=':
          setScale(prev => Math.min(prev + 0.25, 3));
          break;
        case '-':
          setScale(prev => Math.max(prev - 0.25, 0.5));
          break;
        case 'r':
        case 'R':
          setRotation(prev => (prev + 90) % 360);
          break;
        default:
          break;
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [isOpen, onClose]);

  const handleDownload = () => {
    const link = document.createElement('a');
    link.href = imageUrl;
    link.download = alt.replace(/\s+/g, '_') + '.png';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget) {
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div 
      className="image-preview-modal"
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.9)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 2000,
        cursor: 'zoom-out'
      }}
      onClick={handleBackdropClick}
    >
      {/* Header Controls */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '16px 24px',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        zIndex: 2001
      }}>
        <div>
          <h3 style={{
            color: 'white',
            margin: 0,
            fontSize: '18px',
            fontWeight: '600'
          }}>
            {title}
          </h3>
          <p style={{
            color: '#ccc',
            margin: '4px 0 0 0',
            fontSize: '14px'
          }}>
            {alt}
          </p>
        </div>

        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          {/* Zoom Out */}
          <button
            onClick={() => setScale(prev => Math.max(prev - 0.25, 0.5))}
            disabled={scale <= 0.5}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: scale <= 0.5 ? 0.5 : 1
            }}
            title="Zoom Out (-)"
          >
            <ZoomOut size={16} />
          </button>

          {/* Scale Indicator */}
          <span style={{
            color: 'white',
            fontSize: '14px',
            minWidth: '60px',
            textAlign: 'center'
          }}>
            {Math.round(scale * 100)}%
          </span>

          {/* Zoom In */}
          <button
            onClick={() => setScale(prev => Math.min(prev + 0.25, 3))}
            disabled={scale >= 3}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              opacity: scale >= 3 ? 0.5 : 1
            }}
            title="Zoom In (+)"
          >
            <ZoomIn size={16} />
          </button>

          {/* Rotate */}
          <button
            onClick={() => setRotation(prev => (prev + 90) % 360)}
            style={{
              background: 'rgba(255, 255, 255, 0.1)',
              border: '1px solid rgba(255, 255, 255, 0.2)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Rotate (R)"
          >
            <RotateCw size={16} />
          </button>

          {/* Download */}
          <button
            onClick={handleDownload}
            style={{
              background: 'rgba(40, 167, 69, 0.8)',
              border: '1px solid rgba(40, 167, 69, 0.3)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Download Image"
          >
            <Download size={16} />
          </button>

          {/* Close */}
          <button
            onClick={onClose}
            style={{
              background: 'rgba(220, 53, 69, 0.8)',
              border: '1px solid rgba(220, 53, 69, 0.3)',
              borderRadius: '6px',
              color: 'white',
              padding: '8px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center'
            }}
            title="Close (Esc)"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Image Container */}
      <div style={{
        maxWidth: '90vw',
        maxHeight: '90vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'grab'
      }}>
        <img
          src={imageUrl}
          alt={alt}
          style={{
            maxWidth: '100%',
            maxHeight: '100%',
            transform: `scale(${scale}) rotate(${rotation}deg)`,
            transition: 'transform 0.2s ease',
            borderRadius: '8px',
            boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)'
          }}
          onError={(e) => {
            e.target.style.display = 'none';
          }}
        />
      </div>

      {/* Footer Controls/Help */}
      <div style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.8)',
        padding: '12px 24px',
        textAlign: 'center',
        zIndex: 2001
      }}>
        <p style={{
          color: '#ccc',
          margin: 0,
          fontSize: '12px'
        }}>
          <strong>Keyboard shortcuts:</strong> Esc (close) • +/- (zoom) • R (rotate) • Click outside to close
        </p>
      </div>
    </div>
  );
}