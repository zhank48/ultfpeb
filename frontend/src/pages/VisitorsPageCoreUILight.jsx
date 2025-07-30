import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { visitorsAPI, feedbackAPI } from '../utils/api.js';
import { visitorManagementAPI } from '../utils/visitorManagementAPI.js';
import { useVisitorContext } from '../contexts/VisitorContext.jsx';
import { formatDateTime } from '../utils/index.js';
import { SafeImage } from '../components/SafeImage';
import { getPhotoUrl } from '../utils/imageUtils.js';
import { ActionDropdown, DropdownItem } from '../components/ActionDropdown';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { useAuth } from '../context/AuthContext';
import FeedbackModal from '../components/FeedbackModal.jsx';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Building,
  User,
  Phone,
  MapPin,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  AlertTriangle
} from 'lucide-react';

export function VisitorsPageCoreUILight() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alert, confirm } = useGlobalAlert();
  const { visitorDataVersion } = useVisitorContext();
  const { user } = useAuth();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);
  
  // Modal states for manage visitor
  const [showVisitorManageModal, setShowVisitorManageModal] = useState(false);
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  
  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackVisitor, setFeedbackVisitor] = useState(null);
  
  // Track visitors with pending deletion requests
  const [visitorDeletionStatus, setVisitorDeletionStatus] = useState({});

  // Function to batch check deletion status for multiple visitors
  const checkMultipleVisitorsDeletionStatus = async (visitorIds) => {
    if (!visitorIds || visitorIds.length === 0) return;
    
    try {
      const response = await visitorManagementAPI.batchCheckVisitorDeletionStatus(visitorIds);
      
      if (response.data && response.data.success) {
        const statusMap = response.data.data;
        setVisitorDeletionStatus(prev => ({
          ...prev,
          ...statusMap
        }));
      }
    } catch (error) {
      console.error('Error batch checking visitors deletion status:', error);
      // Fallback to empty status to prevent repeated calls
      const fallbackStatusMap = {};
      visitorIds.forEach(id => {
        fallbackStatusMap[id] = {
          hasPendingDeletion: false,
          deletionRequest: null
        };
      });
      setVisitorDeletionStatus(prev => ({
        ...prev,
        ...fallbackStatusMap
      }));
    }
  };

  // Component mount effect
  useEffect(() => {
    // Show success message if redirected from check-in
    if (location.state?.message) {
      setMessage(location.state.message);
      // Clear message after 5 seconds
      setTimeout(() => setMessage(''), 5000);
    }
    
    fetchVisitors();
  }, []); // Only run on mount

  // Dropdown click outside handler
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown]);

  // Refresh visitor data when context changes
  useEffect(() => {
    if (visitorDataVersion > 0) {
      console.log('VisitorContext changed, refreshing visitor data...');
      fetchVisitors();
    }
  }, [visitorDataVersion]);
  const fetchVisitors = async () => {
    try {
      console.log('Starting fetchVisitors...');
      setLoading(true);
      
      // Try the authenticated endpoint first
      try {
        console.log('Trying authenticated endpoint...');
        const response = await visitorsAPI.getAll({});
        console.log('Auth response:', response);
        if (response && response.data && response.data.success) {
          // The authenticated endpoint returns {success: true, data: [...visitors...]}
          const visitorsData = response.data.data;
          if (Array.isArray(visitorsData)) {
            setVisitors(visitorsData);
            console.log('Set visitors from auth endpoint:', visitorsData.length);
            
            // Check deletion status for all visitors
            const visitorIds = visitorsData.map(v => v.id).filter(id => id);
            if (visitorIds.length > 0) {
              checkMultipleVisitorsDeletionStatus(visitorIds);
            }
            return;
          }
        } else if (response && response.data && Array.isArray(response.data)) {
          // Handle direct array response for backward compatibility
          setVisitors(response.data);
          console.log('Set visitors from auth endpoint (direct array):', response.data.length);
          
          // Check deletion status for all visitors
          const visitorIds = response.data.map(v => v.id).filter(id => id);
          if (visitorIds.length > 0) {
            checkMultipleVisitorsDeletionStatus(visitorIds);
          }
          return;
        }
      } catch (authError) {
        console.log('Auth endpoint failed:', authError.message);
        // Auth endpoint failed, try public endpoint
      }
      
      // Fallback to public endpoint for testing
      try {
        console.log('Trying public endpoint...');
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/visitors/public`);
        console.log('Public response status:', response.status);
        if (response.ok) {
          const data = await response.json();
          console.log('Public data:', data);
          setVisitors(Array.isArray(data) ? data : []);
          console.log('Set visitors from public endpoint:', data.length);
          return;
        }
      } catch (publicError) {
        console.error('Public endpoint also failed:', publicError.message);
      }
      
      // If both fail, set empty array
      console.error('All endpoints failed, setting empty visitors array');
      setVisitors([]);
      
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = (visitorId) => {
    try {
      setOpenDropdown(null);
      navigate(`/app/visitors/${visitorId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      // Fallback navigation
      window.location.href = `/app/visitors/${visitorId}`;
    }
  };  const handleDownloadReport = async (visitorId, visitorName) => {
    try {
      const response = await visitorsAPI.downloadDocx(visitorId);
      const fileName = `visitor-report-${visitorId}.docx`;
      
      // Handle download
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage(`${format.toUpperCase()} report downloaded successfully!`);
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error downloading report:', error);
      alert.error('Error downloading report');
    }
  };

  const handleDeleteVisitor = async (visitorId) => {
    const confirmed = await confirm('Are you sure you want to delete this visitor record?', {
      title: 'Delete Visitor Record',
      confirmButtonText: 'Delete',
      cancelButtonText: 'Cancel'
    });
    if (confirmed) {
      try {
        const response = await visitorsAPI.delete(visitorId);
        if (response.data.success) {
          fetchVisitors(); // Refresh the list
          setMessage('Visitor record deleted successfully!');
          setTimeout(() => setMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error deleting visitor:', error);
        alert.error('Error deleting visitor');
      }
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      const response = await visitorsAPI.checkOut(visitorId);
      if (response.data.success) {
        fetchVisitors(); // Refresh the list
        setMessage('Visitor checked out successfully!');
        
        // Find the visitor data for feedback modal
        const visitor = visitors.find(v => v.id === visitorId);
        if (visitor) {
          setFeedbackVisitor(visitor);
          
          // Show feedback modal after a short delay
          setTimeout(() => {
            setMessage('');
            setShowFeedbackModal(true);
          }, 1500);
        } else {
          setTimeout(() => setMessage(''), 3000);
        }
      }
    } catch (error) {
      console.error('Error checking out visitor:', error);
      alert.error('Error checking out visitor');
    }
  };

  // Manage visitor handlers
  const handleManageVisitor = (visitor) => {
    setSelectedVisitor(visitor);
    setShowVisitorManageModal(true);
    setOpenDropdown(null);
  };

  // Feedback handlers
  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    setFeedbackVisitor(null);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await feedbackAPI.create({
        visitor_id: feedbackVisitor.id,
        visitor_name: feedbackVisitor.full_name || feedbackVisitor.name,
        ...feedbackData
      });

      if (response && response.success) {
        alert.success('Thank you for your feedback!');
        handleFeedbackClose();
      } else {
        throw new Error(response?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert.error('Failed to submit feedback. Please try again.');
    }
  };

  const handleManageSuccess = () => {
    // Refresh visitor data after successful edit/delete request
    setMessage('Aksi berhasil diproses!');
    fetchVisitors();
    setShowVisitorManageModal(false);
    setSelectedVisitor(null);
  };

  // Filter and pagination logic
  const filteredVisitors = Array.isArray(visitors) ? visitors.filter(visitor => {
    // Exclude soft deleted visitors from main visitors page
    if (visitor?.deleted_at) {
      return false;
    }
    
    const matchesSearch = visitor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          visitor?.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                          visitor?.phone?.includes(searchTerm) ||
                          visitor?.phone_number?.includes(searchTerm) ||
                          visitor?.institution?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                          (filterStatus === 'active' && !visitor?.check_out_time) ||
                          (filterStatus === 'completed' && visitor?.check_out_time);
    
    return matchesSearch && matchesStatus;
  }) : [];

  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentVisitors = filteredVisitors.slice(startIndex, startIndex + itemsPerPage);

  // Styles
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
    border: '1px solid #dee2e6',
    marginBottom: '24px'
  };

  const cardHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e5e7eb',
    backgroundColor: '#f8f9fa',
    borderTopLeftRadius: '12px',
    borderTopRightRadius: '12px'
  };

  const cardBodyStyle = {
    padding: '24px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d1d5db',
    borderRadius: '8px',
    fontSize: '14px',
    outline: 'none',
    transition: 'all 0.2s ease',
    backgroundColor: 'white'
  };

  const buttonStyle = {
    padding: '10px 16px',
    border: 'none',
    borderRadius: '8px',
    fontSize: '14px',
    fontWeight: '600',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '6px',
    transition: 'all 0.2s ease'
  };

  // Helper function to validate if an image URL is accessible
  const validateImageUrl = async (url) => {
    try {
      const response = await fetch(url, { method: 'HEAD' });
      return response.ok;
    } catch {
      return false;
    }
  };


  // Enhanced SafeImage wrapper with better error handling
  const VisitorPhoto = ({ visitor, size = 40 }) => {
    const photoUrl = getPhotoUrl(visitor.photo_url, visitor.avatar_url);
    const fallbackName = visitor.name || visitor.full_name || 'V';
    
    return (
      <SafeImage
        src={photoUrl}
        alt={fallbackName}
        fallbackText={fallbackName}
        style={{
          width: `${size}px`,
          height: `${size}px`,
          borderRadius: '50%',
          objectFit: 'cover',
          border: '2px solid #dee2e6',
          backgroundColor: '#0d6efd'
        }}
        onError={(e) => {
          if (import.meta.env.DEV && photoUrl) {
            console.warn(`🖼️ Image failed to load: ${photoUrl}`);
          }
        }}
      />
    );
  };

  if (loading) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{ 
            backgroundColor: 'white',
            borderRadius: '8px',
            padding: '40px',
            textAlign: 'center',
            boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)'
          }}>
            <div style={{
              width: '40px',
              height: '40px',
              border: '4px solid #f3f3f3',
              borderTop: '4px solid #0d6efd',
              borderRadius: '50%',
              animation: 'spin 1s linear infinite',
              margin: '0 auto 16px'
            }}></div>
            <p style={{ color: '#6c757d', fontSize: '16px' }}>Loading visitors...</p>
          </div>
        </div>
        <style>
          {`
            @keyframes spin {
              0% { transform: rotate(0deg); }
              100% { transform: rotate(360deg); }
            }
          `}
        </style>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <style>
        {`
          @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
          }
          
          .visitor-row {
            transition: all 0.2s ease;
          }
          
          .visitor-row:hover {
            background-color: #e3f2fd !important;
            transform: translateY(-1px);
            box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
          }
          
          .visitor-row:active {
            transform: translateY(0);
          }
          
          .visitor-row:hover .view-icon {
            color: #1976d2 !important;
          }

          /* Responsive styles */
          @media (max-width: 1200px) {
            .table-container {
              overflow-x: auto;
            }
            .table-container table {
              min-width: 1000px;
            }
          }

          @media (max-width: 768px) {
            .desktop-table {
              display: none;
            }
            .mobile-cards {
              display: block;
            }
            .mobile-card {
              background: white;
              border-radius: 12px;
              box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
              margin-bottom: 16px;
              padding: 20px;
              transition: all 0.2s ease;
            }
            .mobile-card:hover {
              transform: translateY(-2px);
              box-shadow: 0 4px 16px rgba(0, 0, 0, 0.15);
            }
          }

          @media (min-width: 769px) {
            .desktop-table {
              display: block;
            }
            .mobile-cards {
              display: none;
            }
          }

          .signature-preview {
            width: 60px;
            height: 30px;
            object-fit: contain;
            border: 1px solid #dee2e6;
            border-radius: 4px;
            background: white;
          }

          .photo-signature-container {
            display: flex;
            gap: 8px;
            align-items: center;
          }
        `}
      </style>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
        {/* Header */}
        <div style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', 
          marginBottom: '24px',
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
              Data Pengunjung
            </h1>
            <p style={{ 
              color: '#6c757d', 
              margin: '0',
              fontSize: '16px' 
            }}>
              Kelola dan lihat semua data pengunjung
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => navigate('/app/visitor-management')}
              style={{
                ...buttonStyle,
                backgroundColor: '#198754',
                color: 'white'
              }}
            >
              <Edit size={16} />
              Kelola Data
            </button>
            <button
              onClick={() => navigate('/app/check-in')}
              style={{
                ...buttonStyle,
                backgroundColor: '#0d6efd',
                color: 'white'
              }}
            >
              <UserPlus size={16} />
              Check-in Baru
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            backgroundColor: '#d1e7dd',
            color: '#0f5132',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #badbcc'
          }}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '16px', 
          marginBottom: '24px' 
        }}>
          <div style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#0d6efd' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Total Pengunjung
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {Array.isArray(visitors) ? visitors.length || 0 : 0}
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#e7f3ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Users size={24} style={{ color: '#0d6efd' }} />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#198754' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Active Visitors
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {Array.isArray(visitors) ? visitors.filter(v => !v?.check_out_time).length || 0 : 0}
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#d1e7dd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Clock size={24} style={{ color: '#198754' }} />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#ffc107' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Completed Visits
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {Array.isArray(visitors) ? visitors.filter(v => v?.check_out_time).length || 0 : 0}
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#fff3cd',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <CheckCircle size={24} style={{ color: '#ffc107' }} />
              </div>
            </div>
          </div>

          <div style={{
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            padding: '24px',
            boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
            position: 'relative',
            overflow: 'hidden'
          }}>
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#dc3545' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Today's Visitors
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {Array.isArray(visitors) ? visitors.filter(v => {
                    if (!v?.check_in_time) return false;
                    const today = new Date().toDateString();
                    return new Date(v.check_in_time).toDateString() === today;
                  }).length || 0 : 0}
                </div>
              </div>
              <div style={{
                width: '48px',
                height: '48px',
                backgroundColor: '#f8d7da',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center'
              }}>
                <Calendar size={24} style={{ color: '#dc3545' }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          marginBottom: '24px'
        }}>
          <div style={{
            marginBottom: '20px'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#495057',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Filter size={20} />
              Filter Pengunjung
            </h3>
          </div>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '20px' 
          }}>
            <div style={{ position: 'relative' }}>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#495057',
                fontSize: '14px' 
              }}>
                Cari Pengunjung
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
                    width: '100%',
                    padding: '12px 16px 12px 40px',
                    border: '1px solid #d8dbe0',
                    borderRadius: '6px',
                    fontSize: '14px',
                    outline: 'none',
                    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                  }}
                />
              </div>
            </div>
              
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '8px', 
                fontWeight: '500', 
                color: '#495057',
                fontSize: '14px' 
              }}>
                Status Filter
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '12px 16px',
                  border: '1px solid #d8dbe0',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
                }}
              >
                <option value="all">Semua Status</option>
                <option value="active">Pengunjung Aktif</option>
                <option value="completed">Kunjungan Selesai</option>
              </select>
            </div>
          </div>
        </div>

        {/* Visitors List */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          overflow: 'hidden'
        }}>
          <div style={{
            padding: '20px 24px',
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#495057',
              margin: '0',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Users size={20} />
              Pengunjung ({filteredVisitors.length})
            </h3>
            <div style={{
              fontSize: '14px',
              color: '#6c757d',
              backgroundColor: '#f8f9fa',
              padding: '4px 12px',
              borderRadius: '16px'
            }}>
              {currentVisitors.length} item ditampilkan
            </div>
          </div>
          
          {currentVisitors.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              backgroundColor: 'white'
            }}>
              <Users style={{ 
                width: '64px', 
                height: '64px', 
                color: '#6c757d',
                margin: '0 auto 16px'
              }} />
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#495057',
                margin: '0 0 8px 0'
              }}>
                Tidak ada pengunjung ditemukan
              </h3>
              <p style={{ 
                color: '#6c757d', 
                margin: '0 0 24px 0',
                fontSize: '14px'
              }}>
                Mulai dengan mendaftarkan pengunjung baru.
              </p>
              <button
                onClick={() => navigate('/app/check-in')}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#0d6efd',
                  color: 'white'
                }}
              >
                <UserPlus size={16} />
                Check-in Baru
              </button>
            </div>
          ) : (
            <>
              <div style={{ padding: '0' }}>
                <div style={{ overflowX: 'auto' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ backgroundColor: '#f8f9fa' }}>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '200px'
                        }}>
                          Pengunjung
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '150px'
                        }}>
                          Kontak
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '200px'
                        }}>
                          Detail Kunjungan
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '100px'
                        }}>
                          Status
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '160px'
                        }}>
                          Operator Check-in
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'left', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '160px'
                        }}>
                          Operator Check-out
                        </th>
                        <th style={{ 
                          padding: '16px 20px', 
                          textAlign: 'right', 
                          fontWeight: '600',
                          fontSize: '14px',
                          color: '#495057',
                          borderBottom: '1px solid #dee2e6',
                          width: '120px'
                        }}>
                          Aksi
                        </th>
                      </tr>                    
                      </thead>
                    <tbody>
                      {currentVisitors.map((visitor, index) => {
                        const deletionStatus = visitorDeletionStatus[visitor.id];
                        const hasPendingDeletion = deletionStatus?.hasPendingDeletion || false;
                        
                        return (
                        <tr 
                          key={visitor.id} 
                          className="visitor-row"
                          onClick={() => handleViewDetails(visitor.id)}
                          style={{ 
                            borderBottom: '1px solid #dee2e6',
                            backgroundColor: hasPendingDeletion 
                              ? '#f8d7da' 
                              : (index % 2 === 0 ? 'white' : '#f8f9fa'),
                            cursor: 'pointer',
                            borderLeft: hasPendingDeletion ? '4px solid #dc3545' : 'none',
                            position: 'relative'
                          }}
                          title={
                            hasPendingDeletion 
                              ? `USULAN PENGHAPUSAN - ${visitor.name || visitor.full_name || 'visitor'} sedang dalam usulan penghapusan`
                              : `Click to view details for ${visitor.name || visitor.full_name || 'visitor'}`
                          }
                        >
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                              <div style={{ flexShrink: 0 }}>
                                <div
                                  style={{
                                    borderRadius: '50%'
                                  }}
                                >
                                  <VisitorPhoto visitor={visitor} size={40} />
                                </div>
                              </div>
                              <div style={{ flex: 1 }}>
                                <div style={{ 
                                  fontSize: '14px', 
                                  fontWeight: '600', 
                                  color: '#495057',
                                  marginBottom: '4px',
                                  display: 'flex',
                                  alignItems: 'center',
                                  gap: '8px'
                                }}>
                                  {visitor.name || visitor.full_name || 'No Name'}
                                  {hasPendingDeletion && (
                                    <span style={{
                                      display: 'inline-flex',
                                      alignItems: 'center',
                                      gap: '4px',
                                      backgroundColor: '#721c24',
                                      color: 'white',
                                      fontSize: '10px',
                                      fontWeight: '700',
                                      padding: '2px 6px',
                                      borderRadius: '12px',
                                      textTransform: 'uppercase'
                                    }}>
                                      <AlertTriangle size={10} />
                                      USULAN HAPUS
                                    </span>
                                  )}
                                </div>
                                <div style={{ 
                                  fontSize: '12px', 
                                  color: hasPendingDeletion ? '#721c24' : '#6c757d'
                                }}>
                                  {hasPendingDeletion && deletionStatus?.deletionRequest 
                                    ? `Usulan penghapusan oleh ${deletionStatus.deletionRequest.requested_by_name || 'User tidak diketahui'} • ${formatDateTime(visitor.check_in_time)}`
                                    : formatDateTime(visitor.check_in_time)
                                  }
                                </div>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ 
                              fontSize: '14px', 
                              color: '#495057',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px',
                              marginBottom: '4px'
                            }}>
                              <Phone style={{ width: '14px', height: '14px', color: '#6c757d' }} />
                              {visitor.phone}
                            </div>
                            {visitor.institution && (
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#6c757d',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px'
                              }}>
                                <Building style={{ width: '14px', height: '14px' }} />
                                {visitor.institution}
                              </div>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ fontSize: '14px', color: '#495057' }}>
                              <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                                {visitor.purpose}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '4px' }}>
                                Meet: {visitor.person_to_meet}
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#6c757d',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '4px'
                              }}>
                                <MapPin style={{ width: '12px', height: '12px' }} />
                                {visitor.unit}
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {visitor.check_out_time ? (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#d1e7dd',
                                color: '#0f5132'
                              }}>
                                <CheckCircle style={{ width: '12px', height: '12px' }} />
                                Completed
                              </span>
                            ) : (
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: '#cff4fc',
                                color: '#055160'                              }}>
                                <Clock style={{ width: '12px', height: '12px' }} />
                                Active
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                              <VisitorPhoto 
                                visitor={{
                                  photo_url: visitor.input_by_avatar || visitor.operator_avatar,
                                  name: visitor.input_by_name || visitor.operator_name || 'A'
                                }} 
                                size={32} 
                              />
                              <div>
                                <p style={{ 
                                  margin: 0, 
                                  fontSize: '14px', 
                                  fontWeight: '500', 
                                  color: '#212529' 
                                }}>
                                  {visitor.input_by_name || visitor.operator_name || 'Administrator ULT FPEB'}
                                </p>
                                <p style={{ 
                                  margin: 0, 
                                  fontSize: '12px', 
                                  color: '#6c757d' 
                                }}>
                                  {visitor.input_by_role || visitor.operator_role || 'Admin'}
                                </p>
                              </div>
                            </div>
                          </td>
                          <td style={{ padding: '16px 20px' }}>
                            {visitor.check_out_time ? (
                              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <VisitorPhoto 
                                  visitor={{
                                    photo_url: visitor.checkout_by_avatar,
                                    name: visitor.checkout_by_name || visitor.checkout_operator_name || 'CO'
                                  }} 
                                  size={32} 
                                />
                                <div>
                                  <p style={{ 
                                    margin: 0, 
                                    fontSize: '14px', 
                                    fontWeight: '500', 
                                    color: '#212529' 
                                  }}>
                                    {visitor.checkout_by_name || visitor.checkout_operator_name || 'Administrator ULT FPEB'}
                                  </p>
                                  <p style={{ 
                                    margin: 0, 
                                    fontSize: '12px', 
                                    color: '#6c757d' 
                                  }}>
                                    {visitor.checkout_by_role || visitor.checkout_operator_role || 'Admin'}
                                  </p>
                                </div>
                              </div>
                            ) : (
                              <span style={{
                                fontSize: '12px',
                                color: '#6c757d',
                                fontStyle: 'italic'
                              }}>
                                Not checked out
                              </span>
                            )}
                          </td>
                          <td style={{ padding: '16px 20px', textAlign: 'right' }}>
                            <div 
                              data-dropdown
                              style={{ position: 'relative', display: 'inline-block' }}
                            >
                              <button
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setOpenDropdown(openDropdown === visitor.id ? null : visitor.id);
                                }}
                                style={{
                                  ...buttonStyle,
                                  backgroundColor: 'transparent',
                                  color: '#6c757d',
                                  border: '1px solid #dee2e6',
                                  padding: '8px',
                                  borderRadius: '6px'
                                }}
                              >
                                <MoreVertical size={16} />
                              </button>
                              
                              {openDropdown === visitor.id && (
                                <div style={{
                                  position: 'absolute',
                                  top: '100%',
                                  right: '0',
                                  marginTop: '4px',
                                  backgroundColor: 'white',
                                  border: '1px solid #dee2e6',
                                  borderRadius: '6px',
                                  boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                                  zIndex: 1000,
                                  minWidth: '160px'
                                }}>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleViewDetails(visitor.id);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      textAlign: 'left',
                                      fontSize: '14px',
                                      color: '#495057',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    <Eye size={16} />
                                    View Details
                                  </button>
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleDownloadReport(visitor.id, visitor.name);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      textAlign: 'left',
                                      fontSize: '14px',
                                      color: '#495057',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    <Download size={16} />
                                    Download Report
                                  </button>

                                  {!visitor.check_out_time && (
                                    <button
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        handleCheckOut(visitor.id);
                                      }}
                                      style={{
                                        width: '100%',
                                        padding: '12px 16px',
                                        border: 'none',
                                        backgroundColor: 'transparent',
                                        textAlign: 'left',
                                        fontSize: '14px',
                                        color: '#495057',
                                        cursor: 'pointer',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '8px'
                                      }}
                                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                      onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                    >
                                      <CheckCircle size={16} />
                                      Check Out
                                    </button>
                                  )}
                                  
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      handleManageVisitor(visitor);
                                    }}
                                    style={{
                                      width: '100%',
                                      padding: '12px 16px',
                                      border: 'none',
                                      backgroundColor: 'transparent',
                                      textAlign: 'left',
                                      fontSize: '14px',
                                      color: '#198754',
                                      cursor: 'pointer',
                                      display: 'flex',
                                      alignItems: 'center',
                                      gap: '8px',
                                      borderTop: '1px solid #dee2e6'
                                    }}
                                    onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                                    onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                                  >
                                    <Edit size={16} />
                                    Manage Data
                                  </button>
                                </div>
                              )}
                            </div>
                          </td>
                        </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ 
                  padding: '20px 24px',
                  display: 'flex', 
                  justifyContent: 'space-between', 
                  alignItems: 'center',
                  borderTop: '1px solid #dee2e6'
                }}>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    Showing {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredVisitors.length)} of {filteredVisitors.length} visitors
                  </div>
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={() => setCurrentPage(currentPage - 1)}
                      disabled={currentPage === 1}
                      style={{
                        ...buttonStyle,
                        backgroundColor: currentPage === 1 ? '#f8f9fa' : '#0d6efd',
                        color: currentPage === 1 ? '#6c757d' : 'white',
                        padding: '8px 16px',
                        fontSize: '12px',
                        cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => setCurrentPage(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      style={{
                        ...buttonStyle,
                        backgroundColor: currentPage === totalPages ? '#f8f9fa' : '#0d6efd',
                        color: currentPage === totalPages ? '#6c757d' : 'white',
                        padding: '8px 16px',
                        fontSize: '12px',
                        cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                      }}
                    >
                      Next
                    </button>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
      
      {/* Feedback Modal */}
      {showFeedbackModal && feedbackVisitor && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          visitorId={feedbackVisitor.id}
          visitorName={feedbackVisitor.full_name || feedbackVisitor.name}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}
