import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, User, Calendar, FileText } from 'lucide-react';
import { visitorManagementAPI } from '../utils/visitorManagementAPI.js';

export function DeletionRequestModal({ isOpen, onClose, visitor, currentUser, onSuccess }) {
  const [reason, setReason] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState('');

  const handleClose = () => {
    if (!isSubmitting) {
      setReason('');
      setError('');
      onClose();
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!reason.trim()) {
      setError('Alasan penghapusan wajib diisi');
      return;
    }

    if (reason.trim().length < 10) {
      setError('Alasan penghapusan minimal 10 karakter');
      return;
    }

    setIsSubmitting(true);
    setError('');

    try {
      await visitorManagementAPI.createDeletionRequest({
        visitor_id: visitor.id,
        reason: reason.trim()
      });
      onSuccess('Permintaan penghapusan data berhasil diajukan');
      handleClose();
    } catch (error) {
      console.error('Error creating deletion request:', error);
      setError(error.response?.data?.message || 'Gagal mengajukan permintaan penghapusan');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen || !visitor) return null;

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
      padding: '20px',
      zIndex: 1000
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '90vh',
        overflowY: 'auto'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '20px'
        }}>
          <h3 style={{
            fontSize: '18px',
            fontWeight: '600',
            color: '#495057',
            margin: 0
          }}>
            Ajukan Penghapusan Data Visitor
          </h3>
          <button
            onClick={handleClose}
            disabled={isSubmitting}
            style={{
              background: 'none',
              border: 'none',
              color: '#6c757d',
              cursor: 'pointer',
              padding: '4px'
            }}
          >
            <X size={20} />
          </button>
        </div>

        {/* Visitor Information */}
        <div style={{
          backgroundColor: '#f8f9fa',
          padding: '20px',
          borderRadius: '8px',
          border: '1px solid #dee2e6',
          marginBottom: '20px'
        }}>
          <h4 style={{
            fontSize: '16px',
            fontWeight: '600',
            color: '#495057',
            marginBottom: '16px',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <User size={18} />
            Informasi Visitor yang Akan Dihapus
          </h4>
          
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6c757d',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                Nama Lengkap
              </label>
              <div style={{
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500'
              }}>
                {visitor.full_name}
              </div>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6c757d',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                Email
              </label>
              <div style={{
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500'
              }}>
                {visitor.email || 'Tidak tersedia'}
              </div>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6c757d',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                Nomor Telepon
              </label>
              <div style={{
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500'
              }}>
                {visitor.phone_number || 'Tidak tersedia'}
              </div>
            </div>
            
            <div>
              <label style={{
                display: 'block',
                fontSize: '12px',
                fontWeight: '600',
                color: '#6c757d',
                marginBottom: '4px',
                textTransform: 'uppercase'
              }}>
                Tanggal Check-in
              </label>
              <div style={{
                fontSize: '14px',
                color: '#495057',
                fontWeight: '500',
                display: 'flex',
                alignItems: 'center',
                gap: '4px'
              }}>
                <Calendar size={12} />
                {new Date(visitor.check_in_time).toLocaleDateString('id-ID')}
              </div>
            </div>
          </div>
        </div>

        {/* Warning */}
        <div style={{
          backgroundColor: '#f8d7da',
          padding: '16px',
          borderRadius: '8px',
          border: '1px solid #f5c2c7',
          marginBottom: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center' }}>
            <AlertTriangle size={16} style={{ color: '#721c24', marginRight: '8px', flexShrink: '0' }} />
            <div style={{
              fontSize: '14px',
              color: '#721c24',
              lineHeight: '1.4'
            }}>
              <strong>Peringatan:</strong> Permintaan penghapusan ini akan dikirim kepada admin untuk direview. 
              Jika disetujui, data visitor akan dihapus secara permanen dan tidak dapat dikembalikan.
            </div>
          </div>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{
              display: 'block',
              fontSize: '14px',
              fontWeight: '600',
              color: '#495057',
              marginBottom: '8px'
            }}>
              <FileText size={16} style={{ marginRight: '6px', verticalAlign: 'middle' }} />
              Alasan Penghapusan <span style={{ color: '#dc3545' }}>*</span>
            </label>
            <textarea
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan alasan mengapa data visitor ini perlu dihapus..."
              rows={4}
              style={{
                width: '100%',
                padding: '12px 16px',
                border: error ? '1px solid #dc3545' : '1px solid #ced4da',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                resize: 'none',
                backgroundColor: 'white'
              }}
              disabled={isSubmitting}
              maxLength={500}
            />
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginTop: '4px'
            }}>
              <div style={{
                fontSize: '12px',
                color: error ? '#dc3545' : '#6c757d'
              }}>
                {error || 'Minimal 10 karakter'}
              </div>
              <div style={{
                fontSize: '12px',
                color: '#6c757d'
              }}>
                {reason.length}/500
              </div>
            </div>
          </div>

          {/* Current User Info */}
          <div style={{
            backgroundColor: '#e7f3ff',
            padding: '12px 16px',
            borderRadius: '6px',
            border: '1px solid #b8daff',
            marginBottom: '20px'
          }}>
            <div style={{
              fontSize: '12px',
              color: '#004085',
              fontWeight: '600',
              marginBottom: '4px'
            }}>
              Permintaan akan diajukan oleh:
            </div>
            <div style={{
              fontSize: '14px',
              color: '#004085'
            }}>
              {currentUser?.name} ({currentUser?.role})
            </div>
          </div>

          {/* Action Buttons */}
          <div style={{
            display: 'flex',
            justifyContent: 'flex-end',
            gap: '12px'
          }}>
            <button
              type="button"
              onClick={handleClose}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                opacity: isSubmitting ? 0.7 : 1
              }}
            >
              Batal
            </button>
            
            <button
              type="submit"
              disabled={isSubmitting || !reason.trim() || reason.trim().length < 10}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#dc3545',
                color: 'white',
                opacity: (isSubmitting || !reason.trim() || reason.trim().length < 10) ? 0.5 : 1
              }}
            >
              {isSubmitting ? (
                <>
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #f3f3f3',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                  Mengajukan...
                </>
              ) : (
                <>
                  <Trash2 size={16} />
                  Ajukan Penghapusan
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default DeletionRequestModal;