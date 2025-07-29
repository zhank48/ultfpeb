import React, { useState, useEffect, useMemo } from 'react';
import { 
  User, 
  Users, 
  UserCheck, 
  UserX, 
  Search, 
  Filter, 
  RefreshCw, 
  Trash2, 
  RotateCcw, 
  AlertTriangle, 
  CheckCircle, 
  XCircle, 
  Clock, 
  FileText, 
  ChevronLeft, 
  ChevronRight,
  Edit
} from 'lucide-react';
import { visitorsAPI, deletionRequestsAPI, visitorActionsAPI } from '../utils/api';
import { useVisitorContext } from '../contexts/VisitorContext';
import { EditVisitorModal } from '../components/EditVisitorModal.jsx';

function VisitorDataManagementPage() {
  // Visitor context for real-time updates
  const { visitorDataVersion } = useVisitorContext();

  // State management
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [visitors, setVisitors] = useState([]);
  const [deletionRequests, setDeletionRequests] = useState([]);
  const [visitorActions, setVisitorActions] = useState([]);
  const [activeTab, setActiveTab] = useState('visitors');
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [requestFilter, setRequestFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  // Modal states
  const [showRequestDeleteModal, setShowRequestDeleteModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showRestoreModal, setShowRestoreModal] = useState(false);
  const [showApproveModal, setShowApproveModal] = useState(false);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [deleteReason, setDeleteReason] = useState('');
  const [rejectReason, setRejectReason] = useState('');

  // Alert system
  const [alertType, setAlertType] = useState(null);
  const [alertMessage, setAlertMessage] = useState('');

  // Inline styles for CoreUI Light design
  const buttonStyle = {
    padding: '8px 16px',
    borderRadius: '8px',
    border: 'none',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'inline-flex',
    alignItems: 'center',
    transition: 'all 0.2s ease',
    textDecoration: 'none'
  };

  const inputStyle = {
    width: '100%',
    padding: '10px 12px',
    border: '1px solid #ced4da',
    borderRadius: '8px',
    fontSize: '14px',
    transition: 'border-color 0.2s ease',
    outline: 'none'
  };

  const tableHeaderStyle = {
    padding: '16px 12px',
    textAlign: 'left',
    fontSize: '14px',
    fontWeight: '600',
    color: '#495057',
    borderBottom: '2px solid #dee2e6'
  };

  const tableCellStyle = {
    padding: '12px',
    fontSize: '14px',
    color: '#495057',
    borderBottom: '1px solid #e9ecef'
  };

  const badgeStyle = {
    display: 'inline-flex',
    alignItems: 'center',
    padding: '4px 8px',
    borderRadius: '12px',
    fontSize: '12px',
    fontWeight: '500'
  };

  // Alert functions
  const showSuccess = (message) => {
    setAlertType('success');
    setAlertMessage(message);
    setTimeout(() => setAlertType(null), 3000);
  };

  const showError = (message) => {
    setAlertType('error');
    setAlertMessage(message);
    setTimeout(() => setAlertType(null), 5000);
  };

  // Data loading
  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      
      console.log('🔄 VisitorDataManagementPage: Starting data load...');
      console.log('👤 VisitorDataManagementPage: Current user from context:', visitorDataVersion);
      
      const [visitorsResponse, requestsResponse, actionsResponse] = await Promise.all([
        visitorsAPI.getAll().catch(err => {
          console.error('❌ Visitors API error:', err);
          return { data: [] };
        }),
        deletionRequestsAPI.getAll().catch(err => {
          console.error('❌ Deletion requests API error:', err);
          return { data: [] };
        }),
        visitorActionsAPI.getAll().catch(err => {
          console.error('❌ Visitor actions API error:', err);
          return { data: { data: [] } };
        })
      ]);
      
      console.log('👥 VisitorDataManagementPage: Loaded visitors:', visitorsResponse.data?.length || 0);
      console.log('📋 VisitorDataManagementPage: Loaded deletion requests:', requestsResponse.data?.length || 0);
      console.log('⚡ VisitorDataManagementPage: Raw actions response:', actionsResponse);
      console.log('📊 VisitorDataManagementPage: Actions response data keys:', Object.keys(actionsResponse.data || {}));
      console.log('📋 VisitorDataManagementPage: Actions response.data:', actionsResponse.data);
      console.log('🎯 VisitorDataManagementPage: Actions response.data.data:', actionsResponse.data?.data);
      console.log('⚡ VisitorDataManagementPage: Loaded visitor actions count:', actionsResponse.data?.data?.length || 0);
      
      setVisitors(visitorsResponse.data || []);
      setDeletionRequests(requestsResponse.data || []);
      
      // Handle different response formats for visitor actions
      let visitorActionsData = [];
      if (actionsResponse.data?.data) {
        visitorActionsData = actionsResponse.data.data;
      } else if (Array.isArray(actionsResponse.data)) {
        visitorActionsData = actionsResponse.data;
      } else if (actionsResponse.data?.success && actionsResponse.data?.data) {
        visitorActionsData = actionsResponse.data.data;
      }
      
      console.log('🔧 VisitorDataManagementPage: Final visitor actions data:', visitorActionsData);
      console.log('📊 VisitorDataManagementPage: Final count:', visitorActionsData.length);
      
      setVisitorActions(visitorActionsData);
    } catch (error) {
      console.error('Error loading data:', error);
      setError('Gagal memuat data. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // Reload data when visitor context changes (from other components)
  useEffect(() => {
    if (visitorDataVersion > 0) {
      loadData();
    }
  }, [visitorDataVersion]);

  // Data filtering and processing
  const filteredData = useMemo(() => {
    if (activeTab === 'visitors') {
      // Include ALL visitors (active and soft-deleted)
      return visitors.filter(visitor => {
        const matchesSearch = searchTerm === '' || 
          visitor.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          visitor.phone?.includes(searchTerm) ||
          visitor.email?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = statusFilter === 'all' ||
          (statusFilter === 'active' && !visitor.deleted_at) ||
          (statusFilter === 'deleted' && visitor.deleted_at);

        return matchesSearch && matchesStatus;
      });
    } else if (activeTab === 'actions') {
      // Show visitor actions (edit/delete requests)
      return visitorActions.filter(action => {
        const matchesSearch = searchTerm === '' ||
          action.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.action_type?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.original_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.original_data?.name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = requestFilter === 'all' || action.status === requestFilter;

        return matchesSearch && matchesStatus;
      });
    } else {
      // Deletion requests tab - show visitor actions with delete type
      return visitorActions.filter(action => {
        const isDeleteAction = action.action_type === 'delete';
        
        const matchesSearch = searchTerm === '' ||
          action.visitor_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.original_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.original_data?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
          action.requested_by_name?.toLowerCase().includes(searchTerm.toLowerCase());

        const matchesStatus = requestFilter === 'all' || action.status === requestFilter;

        return isDeleteAction && matchesSearch && matchesStatus;
      });
    }
  }, [activeTab, visitors, deletionRequests, visitorActions, searchTerm, statusFilter, requestFilter]);

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Statistics
  const stats = useMemo(() => {
    const totalVisitors = visitors.length;
    const activeVisitors = visitors.filter(v => !v.deleted_at).length;
    const deletedVisitors = visitors.filter(v => v.deleted_at).length;
    const totalRequests = deletionRequests.length;
    const pendingRequests = deletionRequests.filter(r => r.status === 'pending').length;
    const approvedRequests = deletionRequests.filter(r => r.status === 'approved').length;
    const rejectedRequests = deletionRequests.filter(r => r.status === 'rejected').length;
    
    // New visitor actions stats
    const totalActions = visitorActions.length;
    const pendingActions = visitorActions.filter(a => a.status === 'pending').length;
    const approvedActions = visitorActions.filter(a => a.status === 'approved').length;
    const rejectedActions = visitorActions.filter(a => a.status === 'rejected').length;
    const editActions = visitorActions.filter(a => a.action_type === 'edit').length;
    const deleteActions = visitorActions.filter(a => a.action_type === 'delete').length;

    return {
      totalVisitors,
      activeVisitors,
      deletedVisitors,
      totalRequests,
      pendingRequests,
      approvedRequests,
      rejectedRequests,
      totalActions,
      pendingActions,
      approvedActions,
      rejectedActions,
      editActions,
      deleteActions
    };
  }, [visitors, deletionRequests, visitorActions]);

  // Helper functions
  const getVisitorStatusBadge = (deletedAt) => {
    if (deletedAt) {
      return (
        <span style={{
          ...badgeStyle,
          backgroundColor: '#f8d7da',
          color: '#721c24'
        }}>
          <UserX style={{ width: '12px', height: '12px', marginRight: '4px' }} />
          Dihapus
        </span>
      );
    }
    return (
      <span style={{
        ...badgeStyle,
        backgroundColor: '#d4edda',
        color: '#155724'
      }}>
        <UserCheck style={{ width: '12px', height: '12px', marginRight: '4px' }} />
        Aktif
      </span>
    );
  };

  const getRequestStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: '#fff3cd', color: '#856404', icon: Clock, text: 'Menunggu' },
      approved: { bg: '#d4edda', color: '#155724', icon: CheckCircle, text: 'Disetujui' },
      rejected: { bg: '#f8d7da', color: '#721c24', icon: XCircle, text: 'Ditolak' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span style={{
        ...badgeStyle,
        backgroundColor: config.bg,
        color: config.color
      }}>
        <Icon style={{ width: '12px', height: '12px', marginRight: '4px' }} />
        {config.text}
      </span>
    );
  };

  const getActionStatusBadge = (status) => {
    const statusConfig = {
      pending: { bg: '#fff3cd', color: '#856404', icon: Clock, text: 'Menunggu' },
      approved: { bg: '#d4edda', color: '#155724', icon: CheckCircle, text: 'Disetujui' },
      rejected: { bg: '#f8d7da', color: '#721c24', icon: XCircle, text: 'Ditolak' }
    };
    
    const config = statusConfig[status] || statusConfig.pending;
    const Icon = config.icon;
    
    return (
      <span style={{
        ...badgeStyle,
        backgroundColor: config.bg,
        color: config.color
      }}>
        <Icon style={{ width: '12px', height: '12px', marginRight: '4px' }} />
        {config.text}
      </span>
    );
  };

  // Action handlers
  const handleRequestDelete = (visitor) => {
    setSelectedVisitor(visitor);
    setShowRequestDeleteModal(true);
  };

  const handleDelete = (visitor) => {
    setSelectedVisitor(visitor);
    setShowDeleteModal(true);
  };

  const handleRestore = (visitor) => {
    setSelectedVisitor(visitor);
    setShowRestoreModal(true);
  };

  const handleEditVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setShowEditModal(true);
  };

  const handleEditSuccess = () => {
    setShowEditModal(false);
    setSelectedVisitor(null);
    showSuccess('Data visitor berhasil diperbarui');
    loadData(); // Refresh data
  };

  const handleApproveRequest = (request) => {
    setSelectedRequest(request);
    setShowApproveModal(true);
  };

  const handleRejectRequest = (request) => {
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

  // New action handlers for visitor actions
  const handleApproveAction = async (action) => {
    try {
      const response = await visitorActionsAPI.approve(action.id, {
        notes: 'Disetujui oleh admin'
      });
      
      if (response.data.success) {
        showSuccess('Aksi berhasil disetujui');
        loadData(); // Refresh data
      } else {
        showError(response.data.message || 'Gagal menyetujui aksi');
      }
    } catch (error) {
      console.error('Error approving action:', error);
      showError('Terjadi kesalahan saat menyetujui aksi');
    }
  };

  const handleRejectAction = async (action) => {
    const reason = prompt('Masukkan alasan penolakan:');
    if (!reason) return;
    
    try {
      const response = await visitorActionsAPI.reject(action.id, {
        notes: reason
      });
      
      if (response.data.success) {
        showSuccess('Aksi berhasil ditolak');
        loadData(); // Refresh data
      } else {
        showError(response.data.message || 'Gagal menolak aksi');
      }
    } catch (error) {
      console.error('Error rejecting action:', error);
      showError('Terjadi kesalahan saat menolak aksi');
    }
  };

  // API calls
  const submitDeleteRequest = async () => {
    if (!deleteReason.trim()) {
      showError('Alasan penghapusan harus diisi');
      return;
    }

    try {
      await deletionRequestsAPI.create({
        visitor_id: selectedVisitor.id,
        reason: deleteReason
      });
      showSuccess('Permintaan penghapusan berhasil diajukan');
      setShowRequestDeleteModal(false);
      loadData();
    } catch (error) {
      console.error('Error creating deletion request:', error);
      showError('Gagal mengajukan permintaan penghapusan');
    }
  };

  const submitDelete = async () => {
    try {
      await visitorsAPI.delete(selectedVisitor.id);
      showSuccess('Data pengunjung berhasil dihapus');
      setShowDeleteModal(false);
      loadData();
    } catch (error) {
      console.error('Error deleting visitor:', error);
      showError('Gagal menghapus data pengunjung');
    }
  };

  const submitRestore = async () => {
    try {
      await visitorsAPI.restore(selectedVisitor.id);
      showSuccess('Data pengunjung berhasil dipulihkan');
      setShowRestoreModal(false);
      loadData();
    } catch (error) {
      console.error('Error restoring visitor:', error);
      showError('Gagal memulihkan data pengunjung');
    }
  };

  const submitApproveRequest = async () => {
    try {
      await deletionRequestsAPI.approve(selectedRequest.id);
      showSuccess('Permintaan penghapusan disetujui');
      setShowApproveModal(false);
      loadData();
    } catch (error) {
      console.error('Error approving request:', error);
      showError('Gagal menyetujui permintaan');
    }
  };

  const submitRejectRequest = async () => {
    if (!rejectReason.trim()) {
      showError('Alasan penolakan harus diisi');
      return;
    }

    try {
      await deletionRequestsAPI.reject(selectedRequest.id, { reason: rejectReason });
      showSuccess('Permintaan penghapusan ditolak');
      setShowRejectModal(false);
      loadData();
    } catch (error) {
      console.error('Error rejecting request:', error);
      showError('Gagal menolak permintaan');
    }
  };

  // Loading state
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: '#f8f9fa'
      }}>
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '32px',
          textAlign: 'center',
          boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
        }}>
          <RefreshCw style={{ 
            width: '48px', 
            height: '48px', 
            color: '#007bff', 
            margin: '0 auto 16px',
            animation: 'spin 1s linear infinite' 
          }} />
          <p style={{ color: '#495057', fontSize: '18px', fontWeight: '500' }}>Memuat data...</p>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ marginBottom: '24px' }}>
          <div style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            flexWrap: 'wrap',
            gap: '16px'
          }}>
            <div>
              <h1 style={{
                fontSize: '28px',
                fontWeight: '600',
                color: '#212529',
                margin: '0 0 8px 0',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Users size={32} style={{ color: '#0d6efd' }} />
                Visitor Data Management
              </h1>
              <p style={{
                color: '#6c757d',
                margin: '0',
                fontSize: '16px'
              }}>
                Manage and view all visitor data records
              </p>
            </div>
            <button
              onClick={loadData}
              disabled={loading}
              style={{
                padding: '10px 16px',
                backgroundColor: loading ? '#6c757d' : '#198754',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: loading ? 'not-allowed' : 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '6px'
              }}
            >
              <RefreshCw size={16} style={{
                animation: loading ? 'spin 1s linear infinite' : 'none'
              }} />
              {loading ? 'Loading...' : 'Refresh Data'}
            </button>
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            border: '1px solid #f5c6cb',
            borderRadius: '8px',
            padding: '16px',
            marginBottom: '24px',
            display: 'flex',
            alignItems: 'flex-start'
          }}>
            <AlertTriangle style={{ width: '20px', height: '20px', color: '#721c24', marginRight: '12px', marginTop: '2px' }} />
            <div style={{ flex: 1 }}>
              <h3 style={{ margin: '0 0 8px 0', fontSize: '14px', fontWeight: '500', color: '#721c24' }}>
                Terjadi Kesalahan
              </h3>
              <p style={{ margin: '0 0 12px 0', fontSize: '14px', color: '#721c24' }}>
                {error}
              </p>
              <button
                onClick={loadData}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#721c24',
                  color: 'white',
                  padding: '6px 12px',
                  fontSize: '12px'
                }}
              >
                Coba Lagi
              </button>
            </div>
          </div>
        )}

        {/* Stats Cards */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px',
          padding: '20px',
          marginBottom: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
          border: '1px solid #dee2e6'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#e3f2fd',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <User style={{ width: '24px', height: '24px', color: '#1976d2' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Total Pengunjung</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.totalVisitors}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#e8f5e8',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <UserCheck style={{ width: '24px', height: '24px', color: '#2e7d32' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Aktif</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.activeVisitors}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <UserX style={{ width: '24px', height: '24px', color: '#d32f2f' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Terhapus</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.deletedVisitors}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#fff8e1',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <Clock style={{ width: '24px', height: '24px', color: '#f57c00' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Menunggu</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.pendingRequests}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#e8f5e8',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <CheckCircle style={{ width: '24px', height: '24px', color: '#2e7d32' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Disetujui</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.approvedRequests}
                </p>
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            padding: '16px',
            border: '1px solid #e5e7eb'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <div style={{
                backgroundColor: '#ffebee',
                borderRadius: '8px',
                padding: '12px',
                marginRight: '16px'
              }}>
                <XCircle style={{ width: '24px', height: '24px', color: '#d32f2f' }} />
              </div>
              <div>
                <p style={{ margin: 0, fontSize: '14px', color: '#6c757d' }}>Ditolak</p>
                <p style={{ margin: 0, fontSize: '24px', fontWeight: '600', color: '#495057' }}>
                  {stats.rejectedRequests}
                </p>
              </div>
            </div>
          </div>
          </div>
        </div>

        {/* Tab Navigation */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '12px 12px 0 0',
          border: '1px solid #e9ecef',
          borderBottom: 'none'
        }}>
          <div style={{
            display: 'flex',
            borderBottom: '1px solid #e9ecef'
          }}>
            <button
              onClick={() => setActiveTab('visitors')}
              style={{
                flex: 1,
                padding: '16px 24px',
                backgroundColor: activeTab === 'visitors' ? '#007bff' : 'transparent',
                color: activeTab === 'visitors' ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '12px 0 0 0',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <Users style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Data Pengunjung ({stats.totalVisitors})
            </button>
            <button
              onClick={() => setActiveTab('actions')}
              style={{
                flex: 1,
                padding: '16px 24px',
                backgroundColor: activeTab === 'actions' ? '#007bff' : 'transparent',
                color: activeTab === 'actions' ? 'white' : '#6c757d',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <AlertTriangle style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Permintaan Aksi ({stats.totalActions})
            </button>
            <button
              onClick={() => setActiveTab('requests')}
              style={{
                flex: 1,
                padding: '16px 24px',
                backgroundColor: activeTab === 'requests' ? '#007bff' : 'transparent',
                color: activeTab === 'requests' ? 'white' : '#6c757d',
                border: 'none',
                borderRadius: '0 12px 0 0',
                cursor: 'pointer',
                fontSize: '16px',
                fontWeight: '500',
                transition: 'all 0.2s',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}
            >
              <FileText style={{ width: '20px', height: '20px', marginRight: '8px' }} />
              Data Penghapusan Pengunjung ({stats.deleteActions})
            </button>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: 'white',
          padding: '20px',
          border: '1px solid #e9ecef',
          borderTop: 'none',
          borderBottom: 'none'
        }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#495057',
                fontSize: '14px' 
              }}>
                Cari Data
              </label>
              <div style={{ position: 'relative' }}>
                <Search style={{
                  position: 'absolute',
                  left: '12px',
                  top: '50%',
                  transform: 'translateY(-50%)',
                  color: '#6c757d',
                  width: '16px',
                  height: '16px'
                }} />
                <input
                  type="text"
                  placeholder="Cari berdasarkan nama, telepon..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  style={{
                    ...inputStyle,
                    paddingLeft: '40px'
                  }}
                />
              </div>
            </div>
              
            {activeTab === 'visitors' ? (
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Status Pengunjung
                </label>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">Semua Status</option>
                  <option value="active">Aktif</option>
                  <option value="deleted">Terhapus</option>
                </select>
              </div>
            ) : (
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Status Permintaan
                </label>
                <select
                  value={requestFilter}
                  onChange={(e) => setRequestFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">Semua Status</option>
                  <option value="pending">Menunggu</option>
                  <option value="approved">Disetujui</option>
                  <option value="rejected">Ditolak</option>
                </select>
              </div>
            )}
          </div>
        </div>

        {/* Table Container */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '0 0 12px 12px',
          border: '1px solid #e9ecef',
          overflow: 'hidden',
          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
        }}>
          <div style={{
            overflowX: 'auto'
          }}>
            <table style={{
              width: '100%',
              borderCollapse: 'separate',
              borderSpacing: '0'
            }}>
              <thead>
                <tr style={{
                  backgroundColor: '#f8f9fa',
                  borderBottom: '2px solid #dee2e6'
                }}>
                  <th style={tableHeaderStyle}>No</th>
                  {activeTab === 'actions' ? (
                    <>
                      <th style={tableHeaderStyle}>Tipe Aksi</th>
                      <th style={tableHeaderStyle}>Nama Visitor</th>
                      <th style={tableHeaderStyle}>Diminta Oleh</th>
                      <th style={tableHeaderStyle}>Alasan</th>
                      <th style={tableHeaderStyle}>Status</th>
                      <th style={tableHeaderStyle}>Tanggal</th>
                      <th style={tableHeaderStyle}>Tindakan</th>
                    </>
                  ) : (
                    <>
                      <th style={tableHeaderStyle}>Nama</th>
                      <th style={tableHeaderStyle}>Telepon</th>
                      <th style={tableHeaderStyle}>Email</th>
                      <th style={tableHeaderStyle}>Asal Daerah</th>
                      {activeTab === 'visitors' ? (
                        <>
                          <th style={tableHeaderStyle}>Status</th>
                          <th style={tableHeaderStyle}>Tindakan</th>
                        </>
                      ) : (
                        <>
                          <th style={tableHeaderStyle}>Diminta Oleh</th>
                          <th style={tableHeaderStyle}>Alasan</th>
                          <th style={tableHeaderStyle}>Status</th>
                          <th style={tableHeaderStyle}>Tindakan</th>
                        </>
                      )}
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {currentItems.map((item, index) => (
                  <tr key={item.id} style={{
                    borderBottom: '1px solid #e9ecef',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.parentElement.style.backgroundColor = '#f8f9fa'}
                  onMouseLeave={(e) => e.target.parentElement.style.backgroundColor = 'transparent'}
                  >
                    <td style={tableCellStyle}>{indexOfFirstItem + index + 1}</td>
                    {activeTab === 'actions' ? (
                      <>
                        <td style={tableCellStyle}>
                          <div style={{
                            ...badgeStyle,
                            backgroundColor: item.action_type === 'edit' ? '#e3f2fd' : '#ffebee',
                            color: item.action_type === 'edit' ? '#1976d2' : '#d32f2f'
                          }}>
                            {item.action_type === 'edit' ? '✏️ Edit' : '🗑️ Hapus'}
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ fontWeight: '500', color: '#495057' }}>
                            {item.visitor_name || 'N/A'}
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ fontSize: '13px' }}>
                            <div style={{ fontWeight: '500' }}>{item.requested_by_name}</div>
                            <div style={{ color: '#6c757d' }}>{item.requested_by_role}</div>
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ 
                            maxWidth: '200px', 
                            overflow: 'hidden', 
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }}>
                            {item.reason || 'Tidak ada alasan'}
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          {getActionStatusBadge(item.status)}
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ fontSize: '13px', color: '#6c757d' }}>
                            {new Date(item.created_at).toLocaleDateString('id-ID')}
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            {item.status === 'pending' && (
                              <>
                                <button
                                  onClick={() => handleApproveAction(item)}
                                  style={{
                                    ...buttonStyle,
                                    backgroundColor: '#28a745',
                                    color: 'white',
                                    padding: '6px 12px',
                                    fontSize: '12px'
                                  }}
                                >
                                  <CheckCircle style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                  Setujui
                                </button>
                                <button
                                  onClick={() => handleRejectAction(item)}
                                  style={{
                                    ...buttonStyle,
                                    backgroundColor: '#dc3545',
                                    color: 'white',
                                    padding: '6px 12px',
                                    fontSize: '12px'
                                  }}
                                >
                                  <XCircle style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                  Tolak
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </>
                    ) : (
                      <>
                        <td style={tableCellStyle}>
                          <div style={{ fontWeight: '500', color: '#495057' }}>
                            {activeTab === 'visitors' ? item.full_name || item.name : (item.visitor_name || item.visitor?.full_name || item.visitor?.name)}
                          </div>
                        </td>
                        <td style={tableCellStyle}>
                          {activeTab === 'visitors' ? item.phone : (item.visitor_phone || item.visitor?.phone)}
                        </td>
                        <td style={tableCellStyle}>
                          {activeTab === 'visitors' ? item.email : (item.visitor_email || item.visitor?.email)}
                        </td>
                        <td style={tableCellStyle}>
                          {activeTab === 'visitors' ? item.origin_area : (item.visitor_origin || item.visitor?.origin_area)}
                        </td>
                        {activeTab === 'visitors' ? (
                          <>
                            <td style={tableCellStyle}>
                              {getVisitorStatusBadge(item.deleted_at)}
                            </td>
                            <td style={tableCellStyle}>
                              <div style={{ display: 'flex', gap: '8px' }}>
                                {!item.deleted_at ? (
                                  <>
                                    <button
                                      onClick={() => handleEditVisitor(item)}
                                      style={{
                                        ...buttonStyle,
                                        backgroundColor: '#007bff',
                                        color: 'white',
                                        padding: '6px 12px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <Edit style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                      Edit
                                    </button>
                                    <button
                                      onClick={() => handleRequestDelete(item)}
                                      style={{
                                        ...buttonStyle,
                                        backgroundColor: '#dc3545',
                                        color: 'white',
                                        padding: '6px 12px',
                                        fontSize: '12px'
                                      }}
                                    >
                                      <Trash2 style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                      Ajukan Hapus
                                    </button>
                                  </>
                                ) : (
                                  <button
                                    onClick={() => handleRestore(item)}
                                    style={{
                                      ...buttonStyle,
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      padding: '6px 12px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <RotateCcw style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                    Pulihkan
                                  </button>
                                )}
                              </div>
                            </td>
                          </>
                        ) : (
                          <>
                            <td style={tableCellStyle}>
                              <div style={{ fontSize: '13px' }}>
                                <div style={{ fontWeight: '500' }}>{item.requested_by_name || 'N/A'}</div>
                                <div style={{ color: '#6c757d' }}>{item.requested_by_role || 'N/A'}</div>
                              </div>
                            </td>
                            <td style={tableCellStyle}>
                              <div style={{
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap',
                                fontSize: '14px',
                                color: '#6c757d'
                              }}>
                                {item.reason || 'Tidak ada alasan'}
                              </div>
                            </td>
                            <td style={tableCellStyle}>
                              {getRequestStatusBadge(item.status)}
                            </td>
                            <td style={tableCellStyle}>
                              {item.status === 'pending' && (
                                <div style={{ display: 'flex', gap: '8px' }}>
                                  <button
                                    onClick={() => handleApproveAction(item)}
                                    style={{
                                      ...buttonStyle,
                                      backgroundColor: '#28a745',
                                      color: 'white',
                                      padding: '6px 12px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <CheckCircle style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                    Setujui
                                  </button>
                                  <button
                                    onClick={() => handleRejectAction(item)}
                                    style={{
                                      ...buttonStyle,
                                      backgroundColor: '#dc3545',
                                      color: 'white',
                                      padding: '6px 12px',
                                      fontSize: '12px'
                                    }}
                                  >
                                    <XCircle style={{ width: '14px', height: '14px', marginRight: '4px' }} />
                                    Tolak
                                  </button>
                                </div>
                              )}
                            </td>
                          </>
                        )}
                      </>
                    )}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{
              padding: '20px',
              borderTop: '1px solid #dee2e6',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              backgroundColor: '#f8f9fa'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Menampilkan {indexOfFirstItem + 1} - {Math.min(indexOfLastItem, filteredData.length)} dari {filteredData.length} data
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    ...buttonStyle,
                    backgroundColor: currentPage === 1 ? '#e9ecef' : '#007bff',
                    color: currentPage === 1 ? '#6c757d' : 'white',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                >
                  <ChevronLeft style={{ width: '16px', height: '16px' }} />
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  const isActive = page === currentPage;
                  
                  if (totalPages <= 7 || page <= 3 || page >= totalPages - 2 || Math.abs(page - currentPage) <= 1) {
                    return (
                      <button
                        key={page}
                        onClick={() => setCurrentPage(page)}
                        style={{
                          ...buttonStyle,
                          backgroundColor: isActive ? '#007bff' : 'white',
                          color: isActive ? 'white' : '#007bff',
                          border: '1px solid #007bff',
                          padding: '8px 12px',
                          fontSize: '14px',
                          minWidth: '40px'
                        }}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === 4 && currentPage > 5) {
                    return <span key={page} style={{ padding: '8px 4px', color: '#6c757d' }}>...</span>;
                  } else if (page === totalPages - 3 && currentPage < totalPages - 4) {
                    return <span key={page} style={{ padding: '8px 4px', color: '#6c757d' }}>...</span>;
                  }
                  return null;
                })}

                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    ...buttonStyle,
                    backgroundColor: currentPage === totalPages ? '#e9ecef' : '#007bff',
                    color: currentPage === totalPages ? '#6c757d' : 'white',
                    padding: '8px 12px',
                    fontSize: '14px'
                  }}
                >
                  <ChevronRight style={{ width: '16px', height: '16px' }} />
                </button>
              </div>
            </div>
          )}
        </div>

        {/* Success/Error Alert */}
        {alertType && (
          <div style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: alertType === 'success' ? '#d4edda' : '#f8d7da',
            border: `1px solid ${alertType === 'success' ? '#c3e6cb' : '#f5c6cb'}`,
            borderRadius: '8px',
            padding: '16px',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            zIndex: 1000,
            maxWidth: '400px'
          }}>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              {alertType === 'success' ? (
                <CheckCircle style={{ width: '20px', height: '20px', color: '#155724', marginRight: '8px' }} />
              ) : (
                <XCircle style={{ width: '20px', height: '20px', color: '#721c24', marginRight: '8px' }} />
              )}
              <span style={{ 
                color: alertType === 'success' ? '#155724' : '#721c24',
                fontSize: '14px',
                fontWeight: '500'
              }}>
                {alertMessage}
              </span>
            </div>
          </div>
        )}
      </div>

      {/* Modals */}
      {/* Request Delete Modal */}
      {showRequestDeleteModal && (
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
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#fef3cd',
                borderRadius: '50%',
                padding: '12px',
                marginRight: '16px'
              }}>
                <AlertTriangle style={{ width: '24px', height: '24px', color: '#856404' }} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Ajukan Permintaan Penghapusan
              </h3>
            </div>
            
            <p style={{
              marginBottom: '20px',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Anda akan mengajukan permintaan penghapusan untuk pengunjung: <strong>{selectedVisitor?.full_name || selectedVisitor?.name}</strong>
            </p>
            
            <textarea
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
              placeholder="Masukkan alasan penghapusan..."
              style={{
                ...inputStyle,
                width: '100%',
                minHeight: '100px',
                resize: 'vertical',
                marginBottom: '20px'
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowRequestDeleteModal(false)}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Batal
              </button>
              <button
                onClick={submitDeleteRequest}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Ajukan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Restore Modal */}
      {showRestoreModal && (
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
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#d4edda',
                borderRadius: '50%',
                padding: '12px',
                marginRight: '16px'
              }}>
                <RotateCcw style={{ width: '24px', height: '24px', color: '#155724' }} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Pulihkan Data Pengunjung
              </h3>
            </div>
            
            <p style={{
              marginBottom: '20px',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Apakah Anda yakin ingin memulihkan data pengunjung <strong>{selectedVisitor?.full_name || selectedVisitor?.name}</strong>?
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowRestoreModal(false)}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Batal
              </button>
              <button
                onClick={submitRestore}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Pulihkan
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Approve Request Modal */}
      {showApproveModal && (
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
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#d4edda',
                borderRadius: '50%',
                padding: '12px',
                marginRight: '16px'
              }}>
                <CheckCircle style={{ width: '24px', height: '24px', color: '#155724' }} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Setujui Permintaan Penghapusan
              </h3>
            </div>
            
            <p style={{
              marginBottom: '20px',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Apakah Anda yakin ingin menyetujui permintaan penghapusan data pengunjung <strong>{selectedRequest?.visitor_name || selectedRequest?.visitor?.full_name || selectedRequest?.visitor?.name}</strong>?
            </p>
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowApproveModal(false)}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Batal
              </button>
              <button
                onClick={submitApproveRequest}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#28a745',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Setujui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Request Modal */}
      {showRejectModal && (
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
          zIndex: 1050
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            maxWidth: '500px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <div style={{
              display: 'flex',
              alignItems: 'center',
              marginBottom: '20px'
            }}>
              <div style={{
                backgroundColor: '#f8d7da',
                borderRadius: '50%',
                padding: '12px',
                marginRight: '16px'
              }}>
                <XCircle style={{ width: '24px', height: '24px', color: '#721c24' }} />
              </div>
              <h3 style={{
                margin: 0,
                fontSize: '18px',
                fontWeight: '600',
                color: '#495057'
              }}>
                Tolak Permintaan Penghapusan
              </h3>
            </div>
            
            <p style={{
              marginBottom: '20px',
              color: '#6c757d',
              fontSize: '14px'
            }}>
              Anda akan menolak permintaan penghapusan data pengunjung <strong>{selectedRequest?.visitor_name || selectedRequest?.visitor?.full_name || selectedRequest?.visitor?.name}</strong>.
            </p>
            
            <textarea
              value={rejectReason}
              onChange={(e) => setRejectReason(e.target.value)}
              placeholder="Masukkan alasan penolakan..."
              style={{
                ...inputStyle,
                width: '100%',
                minHeight: '80px',
                resize: 'vertical',
                marginBottom: '20px'
              }}
            />
            
            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowRejectModal(false)}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#6c757d',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Batal
              </button>
              <button
                onClick={submitRejectRequest}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#dc3545',
                  color: 'white',
                  padding: '10px 20px'
                }}
              >
                Tolak
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Visitor Modal */}
      {showEditModal && selectedVisitor && (
        <EditVisitorModal
          isOpen={showEditModal}
          onClose={() => setShowEditModal(false)}
          visitor={selectedVisitor}
          onSuccess={handleEditSuccess}
        />
      )}
    </div>
  );
}

export default VisitorDataManagementPage;
