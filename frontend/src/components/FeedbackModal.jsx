import React, { useState, useEffect } from 'react';
import { X, Star, Send, Loader2 } from 'lucide-react';
import { feedbackAPI } from '../utils/api';
import { useGlobalAlert } from './SweetAlertProvider.jsx';

const FeedbackModal = ({ isOpen, onClose, onSubmit, visitorId, visitorName }) => {
  // FeedbackModal render
  const { alert } = useGlobalAlert();
  
  const [rating, setRating] = useState(0);
  const [hoveredRating, setHoveredRating] = useState(0);
  const [selectedCategory, setSelectedCategory] = useState('');
  const [feedback, setFeedback] = useState('');
  const [categories, setCategories] = useState([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // Load categories when modal opens
  useEffect(() => {
    if (isOpen) {
      loadCategories();
    }
  }, [isOpen]);

  const loadCategories = async () => {
    try {
      setIsLoading(true);
      const response = await feedbackAPI.getCategories();
      // Categories API response received
      
      // Handle different response structures
      let categoriesData = [];
      if (response.data) {
        if (Array.isArray(response.data)) {
          categoriesData = response.data;
        } else if (response.data.data && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        } else if (response.data.success && Array.isArray(response.data.data)) {
          categoriesData = response.data.data;
        }
      }
      
      // Processed categories data
      setCategories(Array.isArray(categoriesData) ? categoriesData : []);
    } catch (error) {
      console.error('Error loading categories:', error);
      // Fallback categories if API fails
      setCategories([
        { id: 1, name: 'Pelayanan Umum', description: 'Feedback tentang kualitas pelayanan secara umum' },
        { id: 2, name: 'Fasilitas', description: 'Feedback tentang fasilitas dan infrastruktur' },
        { id: 3, name: 'Kemudahan Akses', description: 'Feedback tentang kemudahan akses dan prosedur' },
        { id: 4, name: 'Keramahan Staff', description: 'Feedback tentang keramahan dan profesionalisme staff' },
        { id: 5, name: 'Kecepatan Layanan', description: 'Feedback tentang kecepatan dan efisiensi layanan' }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!rating || !selectedCategory) {
      alert.warning('Mohon pilih rating dan kategori feedback');
      return;
    }

    try {
      setIsSubmitting(true);
      
      const feedbackData = {
        rating: rating,
        category: parseInt(selectedCategory),
        feedback_text: feedback.trim() || null
      };

      // Submitting feedback
      
      // Call the parent onSubmit function instead of calling API directly
      await onSubmit(feedbackData);
      
      // Reset form
      setRating(0);
      setHoveredRating(0);
      setSelectedCategory('');
      setFeedback('');
      
      // Close modal after successful submission
      // Feedback submitted successfully, closing modal
      
    } catch (error) {
      console.error('❌ Error submitting feedback:', error);
      alert.error('Gagal mengirim feedback. Silakan coba lagi.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleClose = () => {
    if (!isSubmitting) {
      // Reset form when closing
      setRating(0);
      setHoveredRating(0);
      setSelectedCategory('');
      setFeedback('');
      onClose();
    }
  };

  if (!isOpen) return null;

  // Ensure categories is always an array
  const safeCategories = Array.isArray(categories) ? categories : [];

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.5)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '16px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)',
        maxWidth: '28rem',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '24px',
          borderBottom: '1px solid #e5e7eb'
        }}>
          <h2 style={{
            fontSize: '20px',
            fontWeight: '600',
            color: '#111827',
            margin: 0
          }}>
            Berikan Feedback
          </h2>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              color: '#9ca3af',
              backgroundColor: 'transparent',
              border: 'none',
              cursor: isSubmitting ? 'not-allowed' : 'pointer',
              opacity: isSubmitting ? 0.5 : 1,
              padding: '4px',
              borderRadius: '4px',
              transition: 'color 0.2s'
            }}
            onMouseEnter={(e) => e.target.style.color = '#6b7280'}
            onMouseLeave={(e) => e.target.style.color = '#9ca3af'}
          >
            <X style={{ width: '24px', height: '24px' }} />
          </button>
        </div>

        {/* Loading State */}
        {isLoading ? (
          <div style={{
            padding: '24px',
            textAlign: 'center'
          }}>
            <Loader2 style={{
              width: '32px',
              height: '32px',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px',
              color: '#2563eb'
            }} />
            <p style={{
              color: '#6b7280',
              margin: 0
            }}>
              Memuat kategori feedback...
            </p>
          </div>
        ) : (
          <form onSubmit={handleSubmit} style={{
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '24px'
          }}>
            {/* Rating */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '12px'
              }}>
                Rating Kepuasan *
              </label>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                {[1, 2, 3, 4, 5].map((star) => (
                  <button
                    key={star}
                    type="button"
                    onClick={() => setRating(star)}
                    onMouseEnter={() => setHoveredRating(star)}
                    onMouseLeave={() => setHoveredRating(0)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      padding: '4px',
                      transition: 'all 0.2s'
                    }}
                  >
                    <Star
                      style={{
                        width: '32px',
                        height: '32px',
                        color: star <= (hoveredRating || rating) ? '#fbbf24' : '#d1d5db',
                        fill: star <= (hoveredRating || rating) ? '#fbbf24' : 'transparent',
                        transition: 'color 0.2s, fill 0.2s'
                      }}
                    />
                  </button>
                ))}
              </div>
              <p style={{
                fontSize: '12px',
                color: '#6b7280',
                marginTop: '4px',
                margin: '4px 0 0 0'
              }}>
                {rating === 0 && 'Pilih rating kepuasan Anda'}
                {rating === 1 && '⭐ Sangat Tidak Puas'}
                {rating === 2 && '⭐⭐ Tidak Puas'}
                {rating === 3 && '⭐⭐⭐ Cukup Puas'}
                {rating === 4 && '⭐⭐⭐⭐ Puas'}
                {rating === 5 && '⭐⭐⭐⭐⭐ Sangat Puas'}
              </p>
            </div>

            {/* Category */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Kategori Feedback *
              </label>
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  backgroundColor: 'white',
                  color: '#374151',
                  cursor: 'pointer',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              >
                <option value="">Pilih kategori feedback</option>
                {safeCategories.map((category) => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            {/* Feedback Text */}
            <div>
              <label style={{
                display: 'block',
                fontSize: '14px',
                fontWeight: '500',
                color: '#374151',
                marginBottom: '8px'
              }}>
                Komentar (Opsional)
              </label>
              <textarea
                value={feedback}
                onChange={(e) => setFeedback(e.target.value)}
                placeholder="Berikan komentar atau saran Anda..."
                rows={4}
                style={{
                  width: '100%',
                  padding: '8px 12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  resize: 'vertical',
                  fontFamily: 'inherit',
                  outline: 'none',
                  boxSizing: 'border-box'
                }}
                onFocus={(e) => e.target.style.borderColor = '#3b82f6'}
                onBlur={(e) => e.target.style.borderColor = '#d1d5db'}
              />
            </div>

            {/* Buttons */}
            <div style={{
              display: 'flex',
              gap: '12px',
              paddingTop: '16px'
            }}>
              <button
                type="button"
                onClick={handleClose}
                disabled={isSubmitting}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  color: '#374151',
                  backgroundColor: '#f9fafb',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: isSubmitting ? 'not-allowed' : 'pointer',
                  opacity: isSubmitting ? 0.5 : 1,
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => !isSubmitting && (e.target.style.backgroundColor = '#f3f4f6')}
                onMouseLeave={(e) => !isSubmitting && (e.target.style.backgroundColor = '#f9fafb')}
              >
                Lewati
              </button>
              <button
                type="submit"
                disabled={!rating || !selectedCategory || isSubmitting}
                style={{
                  flex: 1,
                  padding: '8px 16px',
                  color: 'white',
                  backgroundColor: (!rating || !selectedCategory || isSubmitting) ? '#9ca3af' : '#3b82f6',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: (!rating || !selectedCategory || isSubmitting) ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px',
                  transition: 'background-color 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!(!rating || !selectedCategory || isSubmitting)) {
                    e.target.style.backgroundColor = '#2563eb';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!(!rating || !selectedCategory || isSubmitting)) {
                    e.target.style.backgroundColor = '#3b82f6';
                  }
                }}
              >
                {isSubmitting ? (
                  <>
                    <Loader2 style={{
                      width: '16px',
                      height: '16px',
                      animation: 'spin 1s linear infinite'
                    }} />
                    Mengirim...
                  </>
                ) : (
                  <>
                    <Send style={{ width: '16px', height: '16px' }} />
                    Kirim Feedback
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* CSS Animation for spinning loader */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
};

export default FeedbackModal;
