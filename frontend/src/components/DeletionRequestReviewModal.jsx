import React, { useState } from 'react';
import { X, AlertTriangle, Trash2, User, Calendar, FileText, CheckCircle, XCircle } from 'lucide-react';

export function DeletionRequestReviewModal({ isOpen, onClose, request, onApprove, onReject }) {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleClose = () => {
    if (!isSubmitting) {
      setRejectionReason('');
      setShowRejectForm(false);
      onClose();
    }
  };

  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onApprove(request.id);
      handleClose();
    } catch (error) {
      console.error('Error approving request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectionReason.trim()) {
      return;
    }
    
    setIsSubmitting(true);
    try {
      await onReject(request.id, rejectionReason.trim());
      handleClose();
    } catch (error) {
      console.error('Error rejecting request:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const showRejectModal = () => {
    setShowRejectForm(true);
  };

  const hideRejectModal = () => {
    setShowRejectForm(false);
    setRejectionReason('');
  };

  if (!isOpen || !request) return null;

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
            Review Permintaan Penghapusan Data
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

        {!showRejectForm ? (
          <>
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
                Informasi Visitor
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
                    {request.visitor_name || 'Tidak tersedia'}
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
                    {request.visitor_email || 'Tidak tersedia'}
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
                    {request.visitor_phone || 'Tidak tersedia'}
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
                    fontWeight: '500'
                  }}>
                    {request.created_at ? new Date(request.created_at).toLocaleDateString('id-ID') : 'Tidak tersedia'}
                  </div>
                </div>
              </div>
            </div>

            {/* Request Information */}
            <div style={{
              backgroundColor: '#fff3cd',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #ffeaa7',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#856404',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <FileText size={18} />
                Detail Permintaan
              </h4>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '12px',
                  fontWeight: '600',
                  color: '#856404',
                  marginBottom: '4px',
                  textTransform: 'uppercase'
                }}>
                  Alasan Penghapusan
                </label>
                <div style={{
                  fontSize: '14px',
                  color: '#856404',
                  lineHeight: '1.5',
                  backgroundColor: 'rgba(255, 255, 255, 0.7)',
                  padding: '12px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255, 234, 167, 0.5)'
                }}>
                  {request.reason}
                </div>
              </div>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#856404',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    Diajukan Oleh
                  </label>
                  <div style={{
                    fontSize: '14px',
                    color: '#856404',
                    fontWeight: '500'
                  }}>
                    {request.requested_by_name} ({request.requested_by_role})
                  </div>
                </div>
                
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#856404',
                    marginBottom: '4px',
                    textTransform: 'uppercase'
                  }}>
                    Tanggal Pengajuan
                  </label>
                  <div style={{
                    fontSize: '14px',
                    color: '#856404',
                    fontWeight: '500',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px'
                  }}>
                    <Calendar size={12} />
                    {new Date(request.created_at).toLocaleString('id-ID')}
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
              marginBottom: '24px'
            }}>
              <div style={{ display: 'flex', alignItems: 'center' }}>
                <AlertTriangle size={16} style={{ color: '#721c24', marginRight: '8px', flexShrink: '0' }} />
                <div style={{
                  fontSize: '14px',
                  color: '#721c24',
                  lineHeight: '1.4'
                }}>
                  <strong>Peringatan:</strong> Jika disetujui, data visitor akan dihapus secara permanen dan tidak dapat dikembalikan.
                </div>
              </div>
            </div>

            {/* Action Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={handleClose}
                disabled={isSubmitting}
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
                  backgroundColor: '#6c757d',
                  color: 'white',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                Tutup
              </button>
              
              <button
                onClick={showRejectModal}
                disabled={isSubmitting || request.status !== 'pending'}
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
                  opacity: (isSubmitting || request.status !== 'pending') ? 0.5 : 1
                }}
              >
                <XCircle size={16} />
                Tolak
              </button>
              
              <button
                onClick={handleApprove}
                disabled={isSubmitting || request.status !== 'pending'}
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
                  backgroundColor: '#198754',
                  color: 'white',
                  opacity: (isSubmitting || request.status !== 'pending') ? 0.5 : 1
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
                    Memproses...
                  </>
                ) : (
                  <>
                    <CheckCircle size={16} />
                    Setujui
                  </>
                )}
              </button>
            </div>
          </>
        ) : (
          // Rejection Form
          <>
            <div style={{
              backgroundColor: '#f8d7da',
              padding: '20px',
              borderRadius: '8px',
              border: '1px solid #f5c2c7',
              marginBottom: '20px'
            }}>
              <h4 style={{
                fontSize: '16px',
                fontWeight: '600',
                color: '#721c24',
                marginBottom: '16px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <XCircle size={18} />
                Alasan Penolakan
              </h4>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '500',
                  color: '#721c24',
                  marginBottom: '8px'
                }}>
                  Jelaskan alasan penolakan permintaan penghapusan ini:
                </label>
                <textarea
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  placeholder="Masukkan alasan penolakan..."
                  rows={4}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '1px solid #f5c2c7',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    resize: 'none',
                    backgroundColor: 'white'
                  }}
                  disabled={isSubmitting}
                />
                <div style={{
                  fontSize: '12px',
                  color: '#721c24',
                  marginTop: '4px',
                  textAlign: 'right'
                }}>
                  {rejectionReason.length}/500
                </div>
              </div>
              
              <div style={{
                fontSize: '12px',
                color: '#721c24',
                fontStyle: 'italic'
              }}>
                Alasan ini akan dikirimkan kepada operator yang mengajukan permintaan penghapusan.
              </div>
            </div>

            {/* Rejection Buttons */}
            <div style={{
              display: 'flex',
              justifyContent: 'flex-end',
              gap: '12px'
            }}>
              <button
                onClick={hideRejectModal}
                disabled={isSubmitting}
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
                  backgroundColor: '#6c757d',
                  color: 'white',
                  opacity: isSubmitting ? 0.7 : 1
                }}
              >
                Batal
              </button>
              
              <button
                onClick={handleReject}
                disabled={isSubmitting || !rejectionReason.trim()}
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
                  opacity: (isSubmitting || !rejectionReason.trim()) ? 0.5 : 1
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
                    Menolak...
                  </>
                ) : (
                  <>
                    <XCircle size={16} />
                    Tolak Permintaan
                  </>
                )}
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}