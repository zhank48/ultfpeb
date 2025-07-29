import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  Eye,
  AlertCircle,
  Plus,
  Edit,
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Download,
  Upload,
  FileText,
  Image,
  Star,
  ChevronDown,
  ChevronUp,
  MoreHorizontal,
  RefreshCw,
  Bell,
  Target,
  Zap,
  User,
  Mail,
  Phone,
  Calendar as CalendarIcon,
  Tag,
  Flag,
  MessageCircle,
  Reply,
  Check,
  X,
  Archive
} from 'lucide-react';
import { complaintsAPI, complaintManagementAPI } from '../utils/api.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { AccessibleModal } from '../components/AccessibleModal.jsx';

export function ComplaintManagementPageImproved() {
  const { alert, confirm } = useGlobalAlert();
  
  // Core state
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Filter & Search
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterPriority, setFilterPriority] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [dateRange, setDateRange] = useState({ start: '', end: '' });
  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);
  
  // Selection & Bulk Actions
  const [selectedComplaints, setSelectedComplaints] = useState([]);
  const [showBulkActions, setShowBulkActions] = useState(false);
  
  // Modals
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showResponseModal, setShowResponseModal] = useState(false);
  const [showStatsModal, setShowStatsModal] = useState(false);
  
  // Configuration
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [showConfigModal, setShowConfigModal] = useState(false);
  
  // Stats
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    urgent: 0,
    overdue: 0,
    todayCount: 0,
    avgResponseTime: 0
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(20);
  
  // Response form
  const [responseData, setResponseData] = useState({
    status: '',
    response: '',
    internal_notes: ''
  });

  useEffect(() => {
    fetchComplaints();
    fetchCategories();
    fetchStats();
  }, []);

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      const response = await complaintsAPI.getAll();
      if (response.success) {
        setComplaints(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching complaints:', error);
      setError('Gagal memuat data aduan');
    } finally {
      setLoading(false);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await complaintManagementAPI.getCategories();
      if (response.success) {
        setCategories(response.data || []);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchStats = async () => {
    try {
      const response = await complaintsAPI.getStats();
      if (response.success) {
        setStats(response.data || {});
      }
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  // Enhanced filtering
  const filteredComplaints = complaints.filter(complaint => {
    const matchesSearch = 
      complaint.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.complainant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.ticket_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
    const matchesPriority = filterPriority === 'all' || complaint.priority === filterPriority;
    const matchesCategory = filterCategory === 'all' || complaint.category_id?.toString() === filterCategory;

    let matchesDate = true;
    if (dateRange.start && dateRange.end) {
      const complaintDate = new Date(complaint.created_at);
      const startDate = new Date(dateRange.start);
      const endDate = new Date(dateRange.end);
      matchesDate = complaintDate >= startDate && complaintDate <= endDate;
    }

    return matchesSearch && matchesStatus && matchesPriority && matchesCategory && matchesDate;
  });

  // Pagination
  const totalPages = Math.ceil(filteredComplaints.length / itemsPerPage);
  const paginatedComplaints = filteredComplaints.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  // Priority colors and labels
  const getPriorityConfig = (priority) => {
    const configs = {
      low: { color: '#10b981', bg: '#d1fae5', label: 'Rendah' },
      medium: { color: '#f59e0b', bg: '#fef3c7', label: 'Sedang' },
      high: { color: '#f97316', bg: '#fed7aa', label: 'Tinggi' },
      urgent: { color: '#ef4444', bg: '#fecaca', label: 'Urgent' }
    };
    return configs[priority] || configs.medium;
  };

  // Status colors and labels
  const getStatusConfig = (status) => {
    const configs = {
      open: { color: '#3b82f6', bg: '#dbeafe', label: 'Terbuka', icon: MessageCircle },
      in_progress: { color: '#f59e0b', bg: '#fef3c7', label: 'Diproses', icon: Clock },
      resolved: { color: '#10b981', bg: '#d1fae5', label: 'Selesai', icon: CheckCircle },
      closed: { color: '#6b7280', bg: '#f3f4f6', label: 'Ditutup', icon: Archive }
    };
    return configs[status] || configs.open;
  };

  // Time helpers
  const getTimeAgo = (date) => {
    const now = new Date();
    const past = new Date(date);
    const diffMs = now - past;
    const diffHours = Math.floor(diffMs / (1000 * 60 * 60));
    const diffDays = Math.floor(diffHours / 24);

    if (diffDays > 0) return `${diffDays} hari lalu`;
    if (diffHours > 0) return `${diffHours} jam lalu`;
    return 'Baru saja';
  };

  const isOverdue = (complaint) => {
    if (complaint.status === 'resolved' || complaint.status === 'closed') return false;
    
    const created = new Date(complaint.created_at);
    const now = new Date();
    const diffHours = (now - created) / (1000 * 60 * 60);
    
    // SLA: Urgent = 4 hours, High = 24 hours, Medium = 48 hours, Low = 72 hours
    const slaHours = {
      urgent: 4,
      high: 24,
      medium: 48,
      low: 72
    };
    
    return diffHours > (slaHours[complaint.priority] || 48);
  };

  // Selection handlers
  const handleSelectComplaint = (complaintId) => {
    setSelectedComplaints(prev => 
      prev.includes(complaintId)
        ? prev.filter(id => id !== complaintId)
        : [...prev, complaintId]
    );
  };

  const handleSelectAll = () => {
    if (selectedComplaints.length === paginatedComplaints.length) {
      setSelectedComplaints([]);
    } else {
      setSelectedComplaints(paginatedComplaints.map(c => c.id));
    }
  };

  // Bulk actions
  const handleBulkStatusUpdate = async (newStatus) => {
    const confirmed = await confirm(
      `Mengubah status ${selectedComplaints.length} aduan menjadi "${getStatusConfig(newStatus).label}"?`,
      { title: 'Konfirmasi Bulk Update' }
    );
    
    if (!confirmed) return;

    try {
      setLoading(true);
      // Implement bulk update API call here
      // await complaintsAPI.bulkUpdateStatus(selectedComplaints, newStatus);
      
      alert.success(`${selectedComplaints.length} aduan berhasil diupdate`);
      setSelectedComplaints([]);
      fetchComplaints();
    } catch (error) {
      alert.error('Gagal mengupdate aduan');
    } finally {
      setLoading(false);
    }
  };

  // Individual actions
  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      const response = await complaintsAPI.updateStatus(complaintId, { status: newStatus });
      if (response.success) {
        alert.success('Status berhasil diupdate');
        fetchComplaints();
      }
    } catch (error) {
      alert.error('Gagal mengupdate status');
    }
  };

  const handleQuickResponse = (complaint) => {
    setSelectedComplaint(complaint);
    setResponseData({
      status: complaint.status === 'open' ? 'in_progress' : complaint.status,
      response: '',
      internal_notes: ''
    });
    setShowResponseModal(true);
  };

  const submitResponse = async () => {
    if (!responseData.response.trim()) {
      alert.error('Response wajib diisi');
      return;
    }

    try {
      // Update status first if changed
      if (responseData.status && responseData.status !== selectedComplaint.status) {
        await complaintsAPI.updateStatus(selectedComplaint.id, {
          status: responseData.status
        });
      }

      // Add response with correct field name
      const responsePayload = {
        response_text: responseData.response,
        is_internal: responseData.internal_notes ? true : false
      };

      const response = await complaintsAPI.addResponse(selectedComplaint.id, responsePayload);
      if (response.success) {
        alert.success('Response berhasil dikirim');
        setShowResponseModal(false);
        setResponseData({ status: '', response: '', internal_notes: '' });
        fetchComplaints();
      }
    } catch (error) {
      console.error('Error submitting response:', error);
      alert.error('Gagal mengirim response: ' + (error.response?.data?.message || error.message));
    }
  };

  // Styles
  const styles = {
    container: {
      padding: '24px',
      backgroundColor: '#f8fafc',
      minHeight: '100vh'
    },
    header: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      marginBottom: '24px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
    },
    statsGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
      gap: '16px',
      marginBottom: '32px'
    },
    statCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      padding: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      transition: 'all 0.3s ease',
      cursor: 'pointer'
    },
    filterSection: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '24px',
      marginBottom: '24px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)'
    },
    searchBar: {
      display: 'flex',
      gap: '16px',
      alignItems: 'center',
      marginBottom: '16px',
      flexWrap: 'wrap'
    },
    searchInput: {
      flex: 1,
      minWidth: '300px',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      outline: 'none',
      transition: 'border-color 0.3s ease'
    },
    filterSelect: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '14px',
      backgroundColor: 'white',
      cursor: 'pointer',
      outline: 'none'
    },
    button: {
      padding: '12px 20px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '14px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      outline: 'none'
    },
    primaryButton: {
      backgroundColor: '#3b82f6',
      color: 'white',
      boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)'
    },
    secondaryButton: {
      backgroundColor: '#f1f5f9',
      color: '#475569',
      border: '2px solid #e2e8f0'
    },
    tableContainer: {
      backgroundColor: 'white',
      borderRadius: '16px',
      overflow: 'hidden',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.08)'
    },
    table: {
      width: '100%',
      borderCollapse: 'collapse'
    },
    th: {
      padding: '16px 20px',
      backgroundColor: '#f8fafc',
      borderBottom: '2px solid #e2e8f0',
      fontWeight: '600',
      fontSize: '14px',
      color: '#374151',
      textAlign: 'left'
    },
    td: {
      padding: '16px 20px',
      borderBottom: '1px solid #f1f5f9',
      fontSize: '14px',
      verticalAlign: 'top'
    },
    priorityBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '4px',
      padding: '4px 8px',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '600'
    },
    statusBadge: {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '6px',
      padding: '6px 12px',
      borderRadius: '12px',
      fontSize: '12px',
      fontWeight: '600'
    },
    actionButton: {
      padding: '8px 12px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '12px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(8px)',
      zIndex: 9999,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '16px',
      width: '100%',
      maxWidth: '800px',
      maxHeight: '90vh',
      overflowY: 'auto',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    modalHeader: {
      padding: '24px 32px',
      borderBottom: '2px solid #f1f5f9',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center'
    },
    modalBody: {
      padding: '32px'
    }
  };

  return (
    <div style={styles.container}>
      {/* Header */}
      <div style={styles.header}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px'
        }}>
          <div>
            <h1 style={{
              fontSize: '32px',
              fontWeight: '700',
              color: '#1f2937',
              margin: '0 0 8px 0',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <MessageSquare size={36} style={{ color: '#3b82f6' }} />
              Manajemen Aduan
            </h1>
            <p style={{
              color: '#6b7280',
              fontSize: '16px',
              margin: 0
            }}>
              Kelola dan respons semua aduan dari pengguna
            </p>
          </div>
          
          {/* Action Buttons */}
          <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
            <button
              onClick={() => window.location.href = '/app/complaint-statistics'}
              style={{
                ...styles.button,
                ...styles.primaryButton,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#3b82f6',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#2563eb'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#3b82f6'}
            >
              <BarChart3 size={18} />
              Statistik
            </button>
            
            <button
              onClick={() => window.location.href = '/app/complaint-fields-config'}
              style={{
                ...styles.button,
                ...styles.secondaryButton,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '1px solid #d1d5db',
                padding: '10px 16px',
                borderRadius: '8px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#e5e7eb';
                e.target.style.borderColor = '#9ca3af';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#f3f4f6';
                e.target.style.borderColor = '#d1d5db';
              }}
            >
              <Settings size={18} />
              Konfigurasi Field
            </button>

            <button
              onClick={() => window.location.href = '/app/complaint-form'}
              style={{
                ...styles.button,
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                backgroundColor: '#10b981',
                color: 'white',
                border: 'none',
                padding: '10px 16px',
                borderRadius: '8px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => e.target.style.backgroundColor = '#059669'}
              onMouseLeave={(e) => e.target.style.backgroundColor = '#10b981'}
            >
              <MessageSquare size={18} />
              Test Form
            </button>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={fetchComplaints}
              style={{ ...styles.button, ...styles.primaryButton }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
          </div>
        </div>

        {/* Stats Cards */}
        <div style={styles.statsGrid}>
          <div style={{
            ...styles.statCard,
            background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.total || 0}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Aduan</div>
              </div>
              <MessageSquare size={32} style={{ opacity: 0.8 }} />
            </div>
          </div>

          <div style={{
            ...styles.statCard,
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.resolved || 0}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Selesai</div>
              </div>
              <CheckCircle size={32} style={{ opacity: 0.8 }} />
            </div>
          </div>

          <div style={{
            ...styles.statCard,
            background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.in_progress || 0}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Diproses</div>
              </div>
              <Clock size={32} style={{ opacity: 0.8 }} />
            </div>
          </div>

          <div style={{
            ...styles.statCard,
            background: 'linear-gradient(135deg, #ef4444 0%, #dc2626 100%)',
            color: 'white'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <div style={{ fontSize: '32px', fontWeight: '700', marginBottom: '4px' }}>
                  {stats.urgent || 0}
                </div>
                <div style={{ fontSize: '14px', opacity: 0.9 }}>Urgent</div>
              </div>
              <Zap size={32} style={{ opacity: 0.8 }} />
            </div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={styles.filterSection}>
        <div style={styles.searchBar}>
          <div style={{ position: 'relative', flex: 1, minWidth: '300px' }}>
            <Search size={20} style={{
              position: 'absolute',
              left: '16px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#9ca3af'
            }} />
            <input
              type="text"
              placeholder="Cari berdasarkan nama, subjek, atau nomor tiket..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                ...styles.searchInput,
                paddingLeft: '48px'
              }}
            />
          </div>
          
          <select
            value={filterStatus}
            onChange={(e) => setFilterStatus(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">Semua Status</option>
            <option value="open">Terbuka</option>
            <option value="in_progress">Diproses</option>
            <option value="resolved">Selesai</option>
            <option value="closed">Ditutup</option>
          </select>

          <select
            value={filterPriority}
            onChange={(e) => setFilterPriority(e.target.value)}
            style={styles.filterSelect}
          >
            <option value="all">Semua Prioritas</option>
            <option value="urgent">Urgent</option>
            <option value="high">Tinggi</option>
            <option value="medium">Sedang</option>
            <option value="low">Rendah</option>
          </select>

          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            style={{ ...styles.button, ...styles.secondaryButton }}
          >
            <Filter size={16} />
            Filter Lanjut
            {showAdvancedFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {/* Advanced Filters */}
        {showAdvancedFilters && (
          <div style={{
            paddingTop: '16px',
            borderTop: '1px solid #e5e7eb',
            display: 'grid',
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
            gap: '16px'
          }}>
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Kategori
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={styles.filterSelect}
              >
                <option value="all">Semua Kategori</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Tanggal Mulai
              </label>
              <input
                type="date"
                value={dateRange.start}
                onChange={(e) => setDateRange(prev => ({ ...prev, start: e.target.value }))}
                style={styles.filterSelect}
              />
            </div>
            
            <div>
              <label style={{ display: 'block', fontSize: '14px', fontWeight: '500', marginBottom: '4px' }}>
                Tanggal Akhir
              </label>
              <input
                type="date"
                value={dateRange.end}
                onChange={(e) => setDateRange(prev => ({ ...prev, end: e.target.value }))}
                style={styles.filterSelect}
              />
            </div>
          </div>
        )}
      </div>

      {/* Bulk Actions */}
      {selectedComplaints.length > 0 && (
        <div style={{
          backgroundColor: '#dbeafe',
          border: '2px solid #3b82f6',
          borderRadius: '12px',
          padding: '16px 24px',
          marginBottom: '24px',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center'
        }}>
          <div style={{ color: '#1d4ed8', fontWeight: '600' }}>
            {selectedComplaints.length} aduan dipilih
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => handleBulkStatusUpdate('in_progress')}
              style={{
                ...styles.actionButton,
                backgroundColor: '#fef3c7',
                color: '#92400e'
              }}
            >
              <Clock size={14} />
              Proses
            </button>
            <button
              onClick={() => handleBulkStatusUpdate('resolved')}
              style={{
                ...styles.actionButton,
                backgroundColor: '#d1fae5',
                color: '#065f46'
              }}
            >
              <CheckCircle size={14} />
              Selesai
            </button>
            <button
              onClick={() => setSelectedComplaints([])}
              style={{
                ...styles.actionButton,
                backgroundColor: '#f3f4f6',
                color: '#6b7280'
              }}
            >
              <X size={14} />
              Batal
            </button>
          </div>
        </div>
      )}

      {/* Complaints Table */}
      <div style={styles.tableContainer}>
        <table style={styles.table}>
          <thead>
            <tr>
              <th style={{ ...styles.th, width: '40px' }}>
                <input
                  type="checkbox"
                  checked={selectedComplaints.length === paginatedComplaints.length && paginatedComplaints.length > 0}
                  onChange={handleSelectAll}
                  style={{ cursor: 'pointer' }}
                />
              </th>
              <th style={styles.th}>Tiket</th>
              <th style={styles.th}>Pengadu</th>
              <th style={styles.th}>Subjek</th>
              <th style={styles.th}>Prioritas</th>
              <th style={styles.th}>Status</th>
              <th style={styles.th}>Waktu</th>
              <th style={styles.th}>Aksi</th>
            </tr>
          </thead>
          <tbody>
            {paginatedComplaints.map((complaint) => {
              const priorityConfig = getPriorityConfig(complaint.priority);
              const statusConfig = getStatusConfig(complaint.status);
              const overdue = isOverdue(complaint);
              
              return (
                <tr 
                  key={complaint.id}
                  style={{
                    backgroundColor: selectedComplaints.includes(complaint.id) ? '#f0f9ff' : 'white',
                    ...(overdue ? { borderLeft: '4px solid #ef4444' } : {})
                  }}
                >
                  <td style={styles.td}>
                    <input
                      type="checkbox"
                      checked={selectedComplaints.includes(complaint.id)}
                      onChange={() => handleSelectComplaint(complaint.id)}
                      style={{ cursor: 'pointer' }}
                    />
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '4px' }}>
                      {complaint.ticket_number || `COMP-${String(complaint.id).padStart(6, '0')}`}
                    </div>
                    {overdue && (
                      <div style={{
                        fontSize: '11px',
                        color: '#ef4444',
                        fontWeight: '600',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <AlertTriangle size={12} />
                        OVERDUE
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{ fontWeight: '600', color: '#1f2937', marginBottom: '2px' }}>
                      {complaint.complainant_name || complaint.name}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {complaint.complainant_email || complaint.email}
                    </div>
                    {complaint.complainant_phone && (
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        {complaint.complainant_phone}
                      </div>
                    )}
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{
                      fontWeight: '600',
                      color: '#1f2937',
                      marginBottom: '4px',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {complaint.subject}
                    </div>
                    <div style={{
                      fontSize: '12px',
                      color: '#6b7280',
                      maxWidth: '200px',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {complaint.description}
                    </div>
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{
                      ...styles.priorityBadge,
                      backgroundColor: priorityConfig.bg,
                      color: priorityConfig.color
                    }}>
                      <Star size={12} fill="currentColor" />
                      {priorityConfig.label}
                    </div>
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{
                      ...styles.statusBadge,
                      backgroundColor: statusConfig.bg,
                      color: statusConfig.color
                    }}>
                      <statusConfig.icon size={14} />
                      {statusConfig.label}
                    </div>
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{ fontSize: '12px', color: '#6b7280' }}>
                      {getTimeAgo(complaint.created_at)}
                    </div>
                    <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                      {new Date(complaint.created_at).toLocaleDateString('id-ID')}
                    </div>
                  </td>
                  
                  <td style={styles.td}>
                    <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                      <button
                        onClick={() => {
                          setSelectedComplaint(complaint);
                          setShowDetailModal(true);
                        }}
                        style={{
                          ...styles.actionButton,
                          backgroundColor: '#dbeafe',
                          color: '#1d4ed8'
                        }}
                      >
                        <Eye size={12} />
                        Detail
                      </button>
                      
                      {complaint.status !== 'resolved' && (
                        <button
                          onClick={() => handleQuickResponse(complaint)}
                          style={{
                            ...styles.actionButton,
                            backgroundColor: '#d1fae5',
                            color: '#065f46'
                          }}
                        >
                          <Reply size={12} />
                          Respons
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>

        {/* Pagination */}
        {totalPages > 1 && (
          <div style={{
            padding: '20px 24px',
            borderTop: '1px solid #f1f5f9',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>
            <div style={{ color: '#6b7280', fontSize: '14px' }}>
              Menampilkan {((currentPage - 1) * itemsPerPage) + 1} - {Math.min(currentPage * itemsPerPage, filteredComplaints.length)} dari {filteredComplaints.length} aduan
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button
                onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                disabled={currentPage === 1}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  opacity: currentPage === 1 ? 0.5 : 1,
                  cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                }}
              >
                Sebelumnya
              </button>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                padding: '0 16px',
                fontSize: '14px',
                color: '#6b7280'
              }}>
                Halaman {currentPage} dari {totalPages}
              </div>
              <button
                onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                disabled={currentPage === totalPages}
                style={{
                  ...styles.button,
                  ...styles.secondaryButton,
                  opacity: currentPage === totalPages ? 0.5 : 1,
                  cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                }}
              >
                Selanjutnya
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Quick Response Modal */}
      <AccessibleModal
        isOpen={showResponseModal && selectedComplaint}
        onClose={() => setShowResponseModal(false)}
        title={
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Reply size={20} />
            Respons Cepat - {selectedComplaint?.ticket_number}
          </div>
        }
        size="medium"
      >
              <div style={{
                backgroundColor: '#f8fafc',
                borderRadius: '12px',
                padding: '16px',
                marginBottom: '24px'
              }}>
                <div style={{ fontWeight: '600', marginBottom: '8px' }}>
                  {selectedComplaint?.subject}
                </div>
                <div style={{ fontSize: '14px', color: '#6b7280', lineHeight: '1.5' }}>
                  {selectedComplaint?.description}
                </div>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Update Status
                </label>
                <select
                  value={responseData.status}
                  onChange={(e) => setResponseData(prev => ({ ...prev, status: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    outline: 'none',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="open">Terbuka</option>
                  <option value="in_progress">Diproses</option>
                  <option value="resolved">Selesai</option>
                  <option value="closed">Ditutup</option>
                </select>
              </div>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Response untuk Pengadu <span style={{ color: '#ef4444' }}>*</span>
                </label>
                <textarea
                  value={responseData.response}
                  onChange={(e) => setResponseData(prev => ({ ...prev, response: e.target.value }))}
                  placeholder="Tulis response yang akan dikirim ke pengadu..."
                  style={{
                    width: '100%',
                    minHeight: '120px',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{ marginBottom: '24px' }}>
                <label style={{
                  display: 'block',
                  fontSize: '14px',
                  fontWeight: '600',
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Catatan Internal (Opsional)
                </label>
                <textarea
                  value={responseData.internal_notes}
                  onChange={(e) => setResponseData(prev => ({ ...prev, internal_notes: e.target.value }))}
                  placeholder="Catatan internal untuk tim..."
                  style={{
                    width: '100%',
                    minHeight: '80px',
                    padding: '12px 16px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '12px',
                    fontSize: '14px',
                    fontFamily: 'inherit',
                    resize: 'vertical',
                    outline: 'none'
                  }}
                />
              </div>
              
              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={() => setShowResponseModal(false)}
                  style={{ ...styles.button, ...styles.secondaryButton }}
                >
                  Batal
                </button>
                <button
                  onClick={submitResponse}
                  style={{ ...styles.button, ...styles.primaryButton }}
                >
                  <Send size={16} />
                  Kirim Response
                </button>
              </div>
      </AccessibleModal>

      {/* Loading */}
      {loading && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(4px)',
          zIndex: 10000,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '16px',
            padding: '32px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            gap: '16px'
          }}>
            <RefreshCw size={32} style={{ color: '#3b82f6', animation: 'spin 1s linear infinite' }} />
            <div style={{ color: '#1f2937', fontWeight: '600' }}>Memproses...</div>
          </div>
        </div>
      )}
    </div>
  );
}