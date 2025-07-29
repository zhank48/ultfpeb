import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trash2, 
  Search, 
  Eye, 
  CheckCircle, 
  XCircle, 
  Clock, 
  AlertTriangle,
  User,
  Calendar,
  Building,
  FileText,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  MessageSquare,
  Shield,
  UserX
} from 'lucide-react';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { getCurrentUser } from '../utils/auth.js';

const VisitorDeletionRequestPage = () => {
  const navigate = useNavigate();
  const currentUser = getCurrentUser();
  const { alert } = useGlobalAlert();

  // State management
  const [loading, setLoading] = useState(true);
  const [requests, setRequests] = useState([]);
  const [filteredRequests, setFilteredRequests] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showPreviewModal, setShowPreviewModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [actionReason, setActionReason] = useState('');
  const [processingAction, setProcessingAction] = useState(false);

  // Load deletion requests
  const loadDeletionRequests = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/visitor-management/deletion-requests`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setRequests(data.data || []);
      } else {
        const errorData = await response.json();
        alert.error('Failed to load deletion requests', errorData.message);
      }
    } catch (error) {
      console.error('Error loading deletion requests:', error);
      alert.error('Error loading deletion requests');
      setRequests([]);
    } finally {
      setLoading(false);
    }
  };

  // Filter requests
  useEffect(() => {
    let filtered = requests;

    if (searchTerm) {
      filtered = filtered.filter(request =>
        request.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        request.reason?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(request => request.status === statusFilter);
    }

    setFilteredRequests(filtered);
    setCurrentPage(1);
  }, [requests, searchTerm, statusFilter]);

  useEffect(() => {
    loadDeletionRequests();
  }, []);

  // Handle approve request
  const handleApproveRequest = async () => {
    if (!selectedRequest || !actionReason.trim()) {
      alert.error('Please provide a reason for approval');
      return;
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/visitor-management/approve-deletion/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert.success('Deletion request approved successfully');
        setShowApproveModal(false);
        setActionReason('');
        setSelectedRequest(null);
        loadDeletionRequests();
      } else {
        const errorData = await response.json();
        alert.error('Failed to approve request', errorData.message);
      }
    } catch (error) {
      console.error('Error approving request:', error);
      alert.error('Error approving request');
    } finally {
      setProcessingAction(false);
    }
  };

  // Handle reject request
  const handleRejectRequest = async () => {
    if (!selectedRequest || !actionReason.trim()) {
      alert.error('Please provide a reason for rejection');
      return;
    }

    try {
      setProcessingAction(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/visitor-management/reject/deletion/${selectedRequest.id}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          rejection_reason: actionReason
        })
      });

      if (response.ok) {
        alert.success('Deletion request rejected successfully');
        setShowRejectModal(false);
        setActionReason('');
        setSelectedRequest(null);
        loadDeletionRequests();
      } else {
        const errorData = await response.json();
        alert.error('Failed to reject request', errorData.message);
      }
    } catch (error) {
      console.error('Error rejecting request:', error);
      alert.error('Error rejecting request');
    } finally {
      setProcessingAction(false);
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return { bg: '#fff3cd', color: '#856404' };
      case 'approved': return { bg: '#d1ecf1', color: '#0c5460' };
      case 'rejected': return { bg: '#f8d7da', color: '#721c24' };
      case 'completed': return { bg: '#d4edda', color: '#155724' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock size={14} />;
      case 'approved': return <CheckCircle size={14} />;
      case 'rejected': return <XCircle size={14} />;
      case 'completed': return <Trash2 size={14} />;
      default: return <AlertTriangle size={14} />;
    }
  };

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredRequests.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredRequests.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#212529', 
              margin: 0,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <UserX size={32} style={{ color: '#dc3545' }} />
              Visitor Deletion Requests
            </h1>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '16px',
              margin: 0
            }}>
              Review and manage visitor data deletion requests from operators
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={loadDeletionRequests}
              style={{
                padding: '10px 16px',
                backgroundColor: '#6c757d',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #dee2e6'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '16px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#6c757d' 
              }} 
            />
            <input
              type="text"
              placeholder="Search visitor name, requester, or reason..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="all">All Status</option>
              <option value="pending">Pending</option>
              <option value="approved">Approved</option>
              <option value="rejected">Rejected</option>
              <option value="completed">Completed</option>
            </select>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#ffc107' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{requests.filter(r => r.status === 'pending').length}</strong> Pending
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ color: '#198754' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{requests.filter(r => r.status === 'approved').length}</strong> Approved
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <XCircle size={16} style={{ color: '#dc3545' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{requests.filter(r => r.status === 'rejected').length}</strong> Rejected
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <UserX size={16} style={{ color: '#6c757d' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{filteredRequests.length}</strong> Total Showing
            </span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '12px',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
        border: '1px solid #dee2e6',
        overflow: 'hidden'
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>
            <UserX size={48} style={{ marginBottom: '16px' }} />
            <div>Loading deletion requests...</div>
          </div>
        ) : currentItems.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>
            <UserX size={48} style={{ marginBottom: '16px' }} />
            <div>No deletion requests found</div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
              gap: '12px',
              padding: '16px 20px',
              backgroundColor: '#f8f9fa',
              borderBottom: '1px solid #dee2e6',
              fontSize: '12px',
              fontWeight: '600',
              color: '#6c757d',
              textTransform: 'uppercase'
            }}>
              <div>Visitor Details</div>
              <div>Requester</div>
              <div>Request Date</div>
              <div>Reason</div>
              <div>Reviewed By</div>
              <div>Status</div>
              <div>Actions</div>
            </div>

            {/* Table Body */}
            <div>
              {currentItems.map((request, index) => {
                const statusColor = getStatusColor(request.status);
                const requestDate = request.created_at ? new Date(request.created_at) : null;

                return (
                  <div 
                    key={request.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1.5fr 1fr 1fr 1fr 1fr 120px',
                      gap: '12px',
                      padding: '16px 20px',
                      borderBottom: index < currentItems.length - 1 ? '1px solid #f1f3f4' : 'none',
                      transition: 'background-color 0.2s',
                      backgroundColor: 'white'
                    }}
                    onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseLeave={(e) => e.currentTarget.style.backgroundColor = 'white'}
                  >
                    {/* Visitor Details */}
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#212529',
                        marginBottom: '4px'
                      }}>
                        {request.visitor_name || 'Unknown Visitor'}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6c757d',
                        lineHeight: '1.4'
                      }}>
                        Phone: {request.visitor_phone || 'N/A'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        Visitor #{request.visitor_id}
                      </div>
                    </div>

                    {/* Requester */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <User size={12} style={{ color: '#6c757d' }} />
                      {request.requested_by_name || 'Unknown'}
                    </div>

                    {/* Request Date */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Calendar size={12} style={{ color: '#6c757d' }} />
                      {requestDate ? requestDate.toLocaleDateString('id-ID') : '-'}
                    </div>

                    {/* Reason */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      <div style={{ 
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                        maxWidth: '150px'
                      }}>
                        {request.reason || 'No reason provided'}
                      </div>
                    </div>

                    {/* Reviewed By */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Shield size={12} style={{ color: '#6c757d' }} />
                      {request.approved_by_name || request.rejected_by_name || '-'}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        padding: '4px 8px',
                        borderRadius: '12px',
                        fontSize: '11px',
                        fontWeight: '600',
                        textTransform: 'uppercase',
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        {getStatusIcon(request.status)}
                        {request.status}
                      </span>
                    </div>

                    {/* Actions */}
                    <div style={{ 
                      display: 'flex', 
                      gap: '4px',
                      alignItems: 'center'
                    }}>
                      <button
                        onClick={() => {
                          setSelectedRequest(request);
                          setShowPreviewModal(true);
                        }}
                        style={{
                          padding: '6px',
                          backgroundColor: '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '4px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center'
                        }}
                        title="Preview Request"
                      >
                        <Eye size={14} />
                      </button>
                      
                      {request.status === 'pending' && (
                        <>
                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowApproveModal(true);
                            }}
                            style={{
                              padding: '6px',
                              backgroundColor: '#198754',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Approve Request"
                          >
                            <CheckCircle size={14} />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedRequest(request);
                              setShowRejectModal(true);
                            }}
                            style={{
                              padding: '6px',
                              backgroundColor: '#dc3545',
                              color: 'white',
                              border: 'none',
                              borderRadius: '4px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center'
                            }}
                            title="Reject Request"
                          >
                            <XCircle size={14} />
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  Showing {indexOfFirstItem + 1} to {Math.min(indexOfLastItem, filteredRequests.length)} of {filteredRequests.length} requests
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                      color: currentPage === 1 ? '#6c757d' : '#374151',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={14} />
                    Previous
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: currentPage === page ? '#0d6efd' : 'white',
                          color: currentPage === page ? 'white' : '#374151',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: currentPage === page ? '600' : 'normal'
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
                      color: currentPage === totalPages ? '#6c757d' : '#374151',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Next
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {/* Preview Modal */}
      {showPreviewModal && selectedRequest && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflow: 'auto'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Deletion Request Preview</h3>
              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ display: 'grid', gap: '16px' }}>
              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Visitor Name
                </label>
                <div style={{ fontSize: '16px', color: '#212529' }}>
                  {selectedRequest.visitor_name || 'Unknown Visitor'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Visitor Phone
                </label>
                <div style={{ fontSize: '16px', color: '#212529' }}>
                  {selectedRequest.visitor_phone || 'N/A'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Requested By
                </label>
                <div style={{ fontSize: '16px', color: '#212529' }}>
                  {selectedRequest.requested_by_name || 'Unknown'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Request Date
                </label>
                <div style={{ fontSize: '16px', color: '#212529' }}>
                  {selectedRequest.created_at ? new Date(selectedRequest.created_at).toLocaleString('id-ID') : 'N/A'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Reason for Deletion
                </label>
                <div style={{ 
                  fontSize: '16px', 
                  color: '#212529',
                  backgroundColor: '#f8f9fa',
                  padding: '12px',
                  borderRadius: '8px',
                  border: '1px solid #dee2e6'
                }}>
                  {selectedRequest.reason || 'No reason provided'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                  Current Status
                </label>
                <div>
                  <span style={{
                    padding: '6px 12px',
                    borderRadius: '16px',
                    fontSize: '12px',
                    fontWeight: '600',
                    textTransform: 'uppercase',
                    backgroundColor: getStatusColor(selectedRequest.status).bg,
                    color: getStatusColor(selectedRequest.status).color,
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}>
                    {getStatusIcon(selectedRequest.status)}
                    {selectedRequest.status}
                  </span>
                </div>
              </div>

              {selectedRequest.rejection_reason && (
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '4px', display: 'block' }}>
                    Rejection Reason
                  </label>
                  <div style={{ 
                    fontSize: '16px', 
                    color: '#212529',
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}>
                    {selectedRequest.rejection_reason}
                  </div>
                </div>
              )}
            </div>

            <div style={{ display: 'flex', gap: '12px', marginTop: '24px', justifyContent: 'flex-end' }}>
              {selectedRequest.status === 'pending' && (
                <>
                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setShowApproveModal(true);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#198754',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <CheckCircle size={16} />
                    Approve
                  </button>

                  <button
                    onClick={() => {
                      setShowPreviewModal(false);
                      setShowRejectModal(true);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#dc3545',
                      color: 'white',
                      border: 'none',
                      borderRadius: '8px',
                      fontSize: '14px',
                      fontWeight: '600',
                      cursor: 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px'
                    }}
                  >
                    <XCircle size={16} />
                    Reject
                  </button>
                </>
              )}

              <button
                onClick={() => setShowPreviewModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Modal */}
      {showApproveModal && selectedRequest && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <CheckCircle size={24} style={{ color: '#198754' }} />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Approve Deletion Request</h3>
            </div>

            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              Are you sure you want to approve the deletion request for visitor <strong>{selectedRequest.visitor_name}</strong>?
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' }}>
                Approval Reason *
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Please provide a reason for approving this deletion request..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowApproveModal(false);
                  setActionReason('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleApproveRequest}
                disabled={processingAction || !actionReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: processingAction || !actionReason.trim() ? '#ccc' : '#198754',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: processingAction || !actionReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <CheckCircle size={16} />
                {processingAction ? 'Approving...' : 'Approve Request'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {showRejectModal && selectedRequest && (
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
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%'
          }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '20px' }}>
              <XCircle size={24} style={{ color: '#dc3545' }} />
              <h3 style={{ margin: 0, fontSize: '20px', fontWeight: '600' }}>Reject Deletion Request</h3>
            </div>

            <p style={{ color: '#6c757d', marginBottom: '20px' }}>
              Are you sure you want to reject the deletion request for visitor <strong>{selectedRequest.visitor_name}</strong>?
            </p>

            <div style={{ marginBottom: '20px' }}>
              <label style={{ fontSize: '14px', fontWeight: '600', color: '#374151', marginBottom: '8px', display: 'block' }}>
                Rejection Reason *
              </label>
              <textarea
                value={actionReason}
                onChange={(e) => setActionReason(e.target.value)}
                placeholder="Please provide a reason for rejecting this deletion request..."
                style={{
                  width: '100%',
                  minHeight: '100px',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontFamily: 'inherit',
                  resize: 'vertical'
                }}
              />
            </div>

            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                onClick={() => {
                  setShowRejectModal(false);
                  setActionReason('');
                }}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer'
                }}
              >
                Cancel
              </button>

              <button
                onClick={handleRejectRequest}
                disabled={processingAction || !actionReason.trim()}
                style={{
                  padding: '10px 20px',
                  backgroundColor: processingAction || !actionReason.trim() ? '#ccc' : '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: processingAction || !actionReason.trim() ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <XCircle size={16} />
                {processingAction ? 'Rejecting...' : 'Reject Request'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default VisitorDeletionRequestPage;