import React, { useState, useEffect } from 'react';
import { X, XCircle, AlertTriangle, UserX } from 'lucide-react';

export const DeletionRejectionModal = ({ isOpen, onClose, request, onReject }) => {
  const [reason, setReason] = useState('');
  const [isRejecting, setIsRejecting] = useState(false);
  const [error, setError] = useState('');

  // Reset form when modal opens/closes
  useEffect(() => {
    if (isOpen) {
      setReason('');
      setError('');
      setIsRejecting(false);
    }
  }, [isOpen]);

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('Alasan penolakan wajib diisi');
      return;
    }

    setIsRejecting(true);
    setError('');

    try {
      await onReject(request.id, reason.trim());
      // Reset form state
      setReason('');
      setError('');
      setIsRejecting(false);
      // Close modal
      onClose();
    } catch (error) {
      console.error('Error rejecting deletion request:', error);
      setError('Gagal menolak permintaan');
      setIsRejecting(false);
    }
  };

  const handleClose = () => {
    if (!isRejecting) {
      setReason('');
      setError('');
      onClose();
    }
  };

  if (!isOpen || !request) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <div className="flex items-center space-x-3">
            <div className="flex-shrink-0 w-8 h-8 bg-red-100 rounded-full flex items-center justify-center">
              <XCircle className="w-4 h-4 text-red-600" />
            </div>
            <div>
              <h3 className="text-lg font-semibold text-gray-900">
                Tolak Penghapusan Data
              </h3>
              <p className="text-sm text-gray-500">
                Berikan alasan penolakan permintaan penghapusan
              </p>
            </div>
          </div> 
          <button
            onClick={handleClose}
            disabled={isRejecting}
            className="text-gray-400 hover:text-gray-600 transition-colors disabled:opacity-50"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="px-6 py-4">
          {/* Visitor Info */}
          <div className="bg-red-50 rounded-lg p-4 mb-6">
            <div className="flex items-center space-x-3">
              <div className="flex-shrink-0 w-10 h-10 bg-red-200 rounded-full flex items-center justify-center">
                <UserX className="w-5 h-5 text-red-700" />
              </div>
              <div className="min-w-0 flex-1">
                <p className="text-sm font-medium text-red-900 truncate">
                  {request.visitor_name}
                </p>
                <p className="text-sm text-red-700 truncate">
                  {request.visitor_email}
                </p>
                <p className="text-xs text-red-600">
                  Diminta oleh: {request.requested_by_name}
                </p>
              </div>
            </div>
          </div>

          {/* Original Request Reason */}
          {request.reason && (
            <div className="mb-6">
              <p className="text-sm font-medium text-gray-700 mb-2">Alasan Permintaan:</p>
              <div className="bg-gray-50 rounded-md p-3">
                <p className="text-sm text-gray-600">{request.reason}</p>
              </div>
            </div>
          )}

          {/* Rejection Reason Field */}
          <div className="mb-6">
            <label htmlFor="rejectionReason" className="block text-sm font-medium text-gray-700 mb-2">
              Alasan Penolakan <span className="text-red-500">*</span>
            </label>
            <textarea
              id="rejectionReason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Jelaskan mengapa permintaan penghapusan ini ditolak..."
              rows={4}
              className="w-full px-3 py-2 border border-gray-300 rounded-md shadow-sm placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 resize-none"
              disabled={isRejecting}
            />
            <p className="mt-1 text-xs text-gray-500">
              Alasan ini akan dikirim kepada pemohon.
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="bg-red-50 border border-red-200 rounded-md p-3 mb-6">
              <p className="text-sm text-red-600">{error}</p>
            </div>
          )}

          {/* Info Notice */}
          <div className="bg-yellow-50 border border-yellow-200 rounded-md p-3">
            <div className="flex">
              <AlertTriangle className="w-4 h-4 text-yellow-600 mt-0.5 mr-2 flex-shrink-0" />
              <div className="text-sm text-yellow-800">
                <p className="font-medium">Informasi:</p>
                <p>Permintaan yang ditolak akan dicatat dan pemohon akan diberitahu.</p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-200 flex flex-col-reverse sm:flex-row sm:justify-end sm:space-x-3 space-y-3 space-y-reverse sm:space-y-0">
          <button
            type="button"
            onClick={handleClose}
            disabled={isRejecting}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-gray-700 bg-white border border-gray-300 rounded-md shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            Batal
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={isRejecting || !reason.trim()}
            className="w-full sm:w-auto px-4 py-2 text-sm font-medium text-white bg-red-600 border border-transparent rounded-md shadow-sm hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center"
          >
            {isRejecting ? (
              <>
                <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                Menolak...
              </>
            ) : (
              <>
                <XCircle className="w-4 h-4 mr-2" />
                Tolak Permintaan
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};