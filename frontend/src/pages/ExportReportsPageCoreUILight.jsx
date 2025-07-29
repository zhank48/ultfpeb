import { useState, useEffect, useCallback } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { visitorsAPI, feedbackAPI } from '../utils/api.js';
import { useVisitorContext } from '../contexts/VisitorContext.jsx';
import { formatDateTime } from '../utils/index.js';

import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
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
  Phone,
  MapPin,
  Trash2,
  UserPlus,
  FileSpreadsheet,
  RefreshCw,
  X
} from 'lucide-react';
import * as XLSX from 'xlsx';

export function ExportReportsPageCoreUILight() {
  const navigate = useNavigate();
  const location = useLocation();
  const { visitorDataVersion } = useVisitorContext();
  // Default brand data since BrandContext is removed
  const brandData = {
    brandName: 'ULT FPEB',
    shortName: 'ULT FPEB',
    logoUrl: '/logoultfpeb.png',
    primaryColor: '#fd591c',
    secondaryColor: '#df2128'
  };
  const { confirm } = useGlobalAlert();
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportLoading, setExportLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [feedbacks, setFeedbacks] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState(null);
  const [feedbackCategories, setFeedbackCategories] = useState([]);
  const [filterFeedback, setFilterFeedback] = useState('all');
  const [filterFeedbackCategory, setFilterFeedbackCategory] = useState('all');
  // Enhanced filter states
  const [filterPurpose, setFilterPurpose] = useState('all');
  const [filterUnit, setFilterUnit] = useState('all');
  const [filterPersonToMeet, setFilterPersonToMeet] = useState('all');
  const [filterInstitution, setFilterInstitution] = useState('all');
  
  const [dateFilter, setDateFilter] = useState({
    startDate: '',
    endDate: '',
    preset: 'all'
  });
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [openDropdown, setOpenDropdown] = useState(null);

  // Date preset options
  const datePresets = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'yesterday', label: 'Yesterday' },
    { value: 'this_week', label: 'This Week' },
    { value: 'last_week', label: 'Last Week' },
    { value: 'this_month', label: 'This Month' },
    { value: 'last_month', label: 'Last Month' },
    { value: 'last_7_days', label: 'Last 7 Days' },
    { value: 'last_30_days', label: 'Last 30 Days' },
    { value: 'custom', label: 'Custom Range' }
  ];

  // Enhanced dynamic filter options
  const [dynamicFilterOptions, setDynamicFilterOptions] = useState({
    purposes: [],
    units: [],
    personsToMeet: [],
    institutions: []
  });

  // Get unique values for filter dropdowns
  const getUniqueFilterOptions = (field) => {
    const uniqueValues = [...new Set(visitors.map(visitor => visitor[field]).filter(Boolean))].sort();
    return uniqueValues.map(value => ({ value, label: value }));
  };

  // Update dynamic filter options when visitors data changes
  useEffect(() => {
    if (visitors.length > 0) {
      setDynamicFilterOptions({
        purposes: getUniqueFilterOptions('purpose'),
        units: getUniqueFilterOptions('unit'),
        personsToMeet: getUniqueFilterOptions('person_to_meet'),
        institutions: getUniqueFilterOptions('institution')
      });
    }
  }, [visitors]);

  const purposeOptions = dynamicFilterOptions.purposes;
  const unitOptions = dynamicFilterOptions.units;
  const personToMeetOptions = dynamicFilterOptions.personsToMeet;
  const institutionOptions = dynamicFilterOptions.institutions;

  // Helper function to calculate duration
  const calculateDuration = (checkIn, checkOut) => {
    if (!checkIn) return '-';
    const inTime = new Date(checkIn);
    const outTime = checkOut ? new Date(checkOut) : new Date();

    const durationMs = outTime - inTime;
    const hours = Math.floor(durationMs / (1000 * 60 * 60));
    const minutes = Math.floor((durationMs % (1000 * 60 * 60)) / (1000 * 60));
    const seconds = Math.floor((durationMs % (1000 * 60)) / 1000);

    let durationString = '';
    if (hours > 0) durationString += `${hours}h `;
    if (minutes > 0) durationString += `${minutes}m `;
    if (seconds > 0 && hours === 0 && minutes === 0) durationString += `${seconds}s`; 

    return durationString.trim() || '0s';
  };

  // Function to get date range label based on current dateFilter state
  const getDateRangeLabel = useCallback(() => {
    if (dateFilter.preset !== 'all') {
      const presetLabel = datePresets.find(p => p.value === dateFilter.preset)?.label;
      if (presetLabel === 'Custom Range' && dateFilter.startDate && dateFilter.endDate) {
        return `${new Date(dateFilter.startDate).toLocaleDateString('id-ID')} - ${new Date(dateFilter.endDate).toLocaleDateString('id-ID')}`;
      }
      return presetLabel;
    }
    if (dateFilter.startDate && dateFilter.endDate) {
        return `${new Date(dateFilter.startDate).toLocaleDateString('id-ID')} - ${new Date(dateFilter.endDate).toLocaleDateString('id-ID')}`;
    }
    return "All Time";
  }, [dateFilter, datePresets]); 

  // Function to get date range based on preset
  const getDateRangeFromPreset = useCallback((preset) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    
    switch (preset) {
      case 'today':
        return {
          startDate: today.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      
      case 'yesterday':
        const yesterday = new Date(today);
        yesterday.setDate(yesterday.getDate() - 1);
        return {
          startDate: yesterday.toISOString().split('T')[0],
          endDate: yesterday.toISOString().split('T')[0]
        };
      
      case 'this_week':
        const startOfWeek = new Date(today);
        startOfWeek.setDate(today.getDate() - today.getDay());
        return {
          startDate: startOfWeek.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      
      case 'last_week':
        const lastWeekEnd = new Date(today);
        lastWeekEnd.setDate(today.getDate() - today.getDay() - 1);
        const lastWeekStart = new Date(lastWeekEnd);
        lastWeekStart.setDate(lastWeekEnd.getDate() - 6);
        return {
          startDate: lastWeekStart.toISOString().split('T')[0],
          endDate: lastWeekEnd.toISOString().split('T')[0]
        };
      
      case 'this_month':
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        return {
          startDate: startOfMonth.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      
      case 'last_month':
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const lastMonthEnd = new Date(now.getFullYear(), now.getMonth(), 0);
        return {
          startDate: lastMonthStart.toISOString().split('T')[0],
          endDate: lastMonthEnd.toISOString().split('T')[0]
        };
      
      case 'last_7_days':
        const sevenDaysAgo = new Date(today);
        sevenDaysAgo.setDate(today.getDate() - 7);
        return {
          startDate: sevenDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      
      case 'last_30_days':
        const thirtyDaysAgo = new Date(today);
        thirtyDaysAgo.setDate(today.getDate() - 30);
        return {
          startDate: thirtyDaysAgo.toISOString().split('T')[0],
          endDate: today.toISOString().split('T')[0]
        };
      
      default:
        return { startDate: '', endDate: '' };
    }
  }, []);

  const handleDatePresetChange = (preset) => {
    if (preset === 'custom') {
      setDateFilter(prev => ({ ...prev, preset }));
    } else {
      const dateRange = getDateRangeFromPreset(preset);
      setDateFilter({
        preset,
        startDate: dateRange.startDate,
        endDate: dateRange.endDate
      });
    }
    setCurrentPage(1);
  };

  const clearDateFilter = () => {
    setDateFilter({
      startDate: '',
      endDate: '',
      preset: 'all'
    });
    setCurrentPage(1);
  };

  // Clear all filters function
  const clearAllFilters = () => {
    setSearchTerm('');
    setFilterStatus('all');
    setFilterFeedback('all'); // ⭐ BARU
    setFilterFeedbackCategory('all'); // ⭐ BARU
    setFilterPurpose('all');
    setFilterUnit('all');
    setFilterPersonToMeet('all');
    setFilterInstitution('all');
    clearDateFilter();
  };

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      
      // Try authenticated endpoint first (might include deleted visitors if admin)
      try {
        const response = await visitorsAPI.getAll({ include_deleted: true });
        console.log('Auth response:', response?.data);
        if (response && response.data && response.data.success) {
          // The authenticated endpoint returns {success: true, data: [...visitors...]}
          const visitorsData = response.data.data;
          console.log('Visitors data from auth:', visitorsData?.length, 'visitors');
          setVisitors(Array.isArray(visitorsData) ? visitorsData : []);
          return;
        } else if (response && response.data && Array.isArray(response.data)) {
          console.log('Direct array response:', response.data.length, 'visitors');
          setVisitors(response.data);
          return;
        }
      } catch (authError) {
        console.log('Auth endpoint failed, trying public endpoint:', authError.message);
      }
      
      // Fallback to public endpoint
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/visitors/public`); 
        if (response.ok) {
          const data = await response.json();
          console.log('Public endpoint data:', data?.length, 'visitors');
          setVisitors(Array.isArray(data) ? data : []);
          return;
        }
      } catch (publicError) {
        console.error('Public endpoint also failed:', publicError.message);
      }
      
      console.error('All endpoints failed, setting empty visitors array');
      setVisitors([]);
      
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setVisitors([]);
    } finally {
      setLoading(false);
    }
  };

  // DITAMBAHKAN: Helper functions for feedback display
  const getRatingDescription = (rating) => {
    const descriptions = {
      1: 'Sangat Tidak Puas',
      2: 'Tidak Puas', 
      3: 'Cukup Puas',
      4: 'Puas',
      5: 'Sangat Puas'
    };
    return descriptions[rating] || 'No Rating';
  };

  const getFeedbackRatingLabel = (rating) => {
    if (!rating) return 'No Rating';
    return `${'★'.repeat(rating)}${'☆'.repeat(5 - rating)} (${rating}/5)`;
  };

  const getFeedbackRatingWithText = (rating) => {
    if (!rating) return 'No Rating';
    const stars = '★'.repeat(rating) + '☆'.repeat(5 - rating);
    const description = getRatingDescription(rating);
    return `${stars} - ${description}`;
  };

  const getFeedbackCategoryLabel = (categoryId) => {
    if (!categoryId) return 'No Category';
    
    // Find category by ID from feedbackCategories
    const category = feedbackCategories.find(cat => cat.id === categoryId);
    return category ? category.name : `Category ${categoryId}`;
  };

  // Fetch feedback categories function
  const fetchFeedbackCategories = async () => {
    try {
      const response = await feedbackAPI.getCategories();
      if (response?.data) {
        if (response.data.success && Array.isArray(response.data.data)) {
          setFeedbackCategories(response.data.data);
        } else if (Array.isArray(response.data)) {
          setFeedbackCategories(response.data);
        }
      }
    } catch (error) {
      console.error('Error fetching feedback categories:', error);
      // Set fallback categories
      setFeedbackCategories([
        { id: 1, name: 'Pelayanan Umum' },
        { id: 2, name: 'Fasilitas' },
        { id: 3, name: 'Kemudahan Akses' },
        { id: 4, name: 'Keramahan Staff' },
        { id: 5, name: 'Waktu Pelayanan' },
        { id: 6, name: 'Informasi' },
        { id: 7, name: 'Saran Perbaikan' },
        { id: 8, name: 'Laboratorium' }
      ]);
    }
  };

  // Fetch feedbacks function
  const fetchFeedbacks = async () => {
    try {
      setFeedbackLoading(true);
      setFeedbackError(null);
      
      // Debug: Check if we have a token
      const token = localStorage.getItem('token');
      console.log('🔑 Token for feedback request:', token ? 'Present' : 'Missing');
      
      try {
        // Try authenticated endpoint first
        const response = await feedbackAPI.getAll();
        console.log('📊 Feedback API response:', response?.data);
        
        if (response?.data) {
          // Handle different response formats
          if (response.data.success) {
            setFeedbacks(Array.isArray(response.data.data) ? response.data.data : []);
          } else if (Array.isArray(response.data)) {
            setFeedbacks(response.data);
          } else {
            setFeedbacks([]);
          }
          return;
        }
      } catch (authError) {
        console.log('Auth feedback endpoint failed, trying public endpoint:', authError.message);
      }
      
      try {
        // Fallback to public endpoint for testing
        const response = await fetch(`${import.meta.env.VITE_API_URL}/feedback/public`);
        if (response.ok) {
          const data = await response.json();
          if (data.success && Array.isArray(data.data)) {
            setFeedbacks(data.data);
          } else {
            setFeedbacks([]);
          }
          return;
        }
      } catch (publicError) {
        console.error('Public feedback endpoint also failed:', publicError.message);
      }
      
      // If both fail, use dummy feedback data for testing
      
      console.log('📊 Loaded', dummyFeedbacks.length, 'dummy feedbacks for testing');
      setFeedbacks(dummyFeedbacks);
      
    } catch (error) {
      console.error('Error fetching feedbacks:', error);
      
      // More user-friendly error messages
      if (error.response?.status === 500) {
        setFeedbackError('Server error while loading feedback data');
      } else if (error.response?.status === 404) {
        setFeedbackError('Feedback service not available');
      } else if (error.response?.status === 401) {
        setFeedbackError('Authentication required for feedback data');
      } else if (error.code === 'NETWORK_ERROR') {
        setFeedbackError('Network error - please check if backend is running');
      } else {
        setFeedbackError('Unable to load feedback data');
      }
      
      setFeedbacks([]); // Keep empty array so visitors still show
    } finally {
      setFeedbackLoading(false);
    }
  };

  useEffect(() => {
    if (location.state?.message) {
      setMessage(location.state.message);
      setTimeout(() => setMessage(''), 5000);
    }
    
  // ⭐ BARU - Fetch both visitors and feedbacks in parallel
  Promise.all([
    fetchVisitors(),
    // Load feedback categories first
    fetchFeedbackCategories(),
    // Make feedback optional - don't fail if it errors
    fetchFeedbacks().catch(error => {
      console.warn('Feedback service unavailable, continuing without feedback data:', error.message);
    })
  ]).catch(error => {
    console.error('Error fetching data:', error);
  });

    const handleClickOutside = (event) => {
      if (openDropdown && !event.target.closest('[data-dropdown]')) {
        setOpenDropdown(null);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [openDropdown, location.state?.message]);

  // Refresh visitor data when context changes
  useEffect(() => {
    if (visitorDataVersion > 0) {
      console.log('VisitorContext changed, refreshing export reports data...');
      Promise.all([
        fetchVisitors(),
        fetchFeedbacks().catch(error => {
          console.warn('Feedback service unavailable, continuing without feedback data:', error.message);
        })
      ]).catch(error => {
        console.error('Error fetching data:', error);
      });
    }
  }, [visitorDataVersion]);

  const handleBackendExport = async () => {
    const params = new URLSearchParams();
    
    if (searchTerm) params.append('search', searchTerm);
    if (filterStatus !== 'all') params.append('status', filterStatus);
    if (filterPurpose !== 'all') params.append('purpose', filterPurpose);
    if (filterUnit !== 'all') params.append('unit', filterUnit);
    if (filterPersonToMeet !== 'all') params.append('person_to_meet', filterPersonToMeet);
    if (dateFilter.startDate) params.append('startDate', dateFilter.startDate);
    if (dateFilter.endDate) params.append('endDate', dateFilter.endDate);
    
    params.append('format', 'excel');
    params.append('type', 'visitors');

    const baseUrl = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';
    const exportUrl = `${baseUrl}/api/visitors/export?${params.toString()}`;

    try {
      const response = await fetch(exportUrl, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json' 
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        throw new Error(`HTTP ${response.status}: ${errorText || response.statusText}`);
      }

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      
      const currentDate = new Date().toISOString().split('T')[0];
      const filterSuffix = dateFilter.preset !== 'all' ? `_${dateFilter.preset}` : '';
      a.download = `visitors_report_${currentDate}${filterSuffix}.xlsx`;
      
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);

      setMessage(`✅ Laporan Excel dari backend berhasil diunduh!`);
      setTimeout(() => setMessage(''), 5000);

    } catch (error) {
      console.error('Backend export failed:', error);
      setMessage('❌ Gagal mengekspor laporan dari backend. Silakan coba lagi.');
      setTimeout(() => setMessage(''), 5000);
      throw error; 
    }
  };

  const handleExportExcel = async () => {
    setExportLoading(true);
    try {
      const dataToExport = filteredVisitors.map((visitor, index) => {
        const visitorFeedback = feedbacks.find(f => f.visitor_id === visitor.id);
        
        return {
          'No': index + 1,
          'Nama Pengunjung': visitor.name || visitor.full_name || '',
          'No. Telepon': visitor.phone || '',
          'Email': visitor.email || '',
          'Institusi': visitor.institution || '',
          'Tujuan Kunjungan': visitor.purpose || '',
          'Unit/Bagian': visitor.unit || '',
          'Bertemu Dengan': visitor.person_to_meet || '',
          'Waktu Check-in': visitor.check_in_time ? formatDateTime(visitor.check_in_time) : '',
          'Waktu Check-out': visitor.check_out_time ? formatDateTime(visitor.check_out_time) : 'Belum Check-out',
          'Durasi Kunjungan': calculateDuration(visitor.check_in_time, visitor.check_out_time),
          'Status': visitor.check_out_time ? 'Selesai' : 'Aktif',
          'Rating Feedback': visitorFeedback ? `${visitorFeedback.rating}/5` : 'Tidak ada',
          'Deskripsi Rating': visitorFeedback ? getRatingDescription(visitorFeedback.rating) : 'Tidak ada',
          'Kategori Feedback': visitorFeedback ? getFeedbackCategoryLabel(visitorFeedback.category) : 'Tidak ada',
          'Teks Feedback': visitorFeedback?.feedback_text || 'Tidak ada feedback',
          'Operator Check-in': visitor.input_by_name || visitor.operator_name || 'Unknown',
          'Role Check-in': visitor.input_by_role || visitor.operator_role || 'Staff',
          'Operator Check-out': visitor.checkout_by_name || visitor.checkout_operator_name || (visitor.check_out_time ? 'Unknown' : 'Belum Check-out'),
          'Role Check-out': visitor.checkout_by_role || visitor.checkout_operator_role || (visitor.check_out_time ? 'Staff' : 'Belum Check-out'),
          'Tanggal': visitor.check_in_time ? new Date(visitor.check_in_time).toLocaleDateString('id-ID') : ''
        };
      });

      const wb = XLSX.utils.book_new();
      const ws = XLSX.utils.json_to_sheet(dataToExport);

      // Enhanced column widths for new columns (21 columns now)
      const colWidths = [
        { wch: 5 },   // No
        { wch: 20 },  // Nama
        { wch: 15 },  // Telepon
        { wch: 25 },  // Email
        { wch: 25 },  // Institusi
        { wch: 20 },  // Tujuan
        { wch: 15 },  // Unit
        { wch: 20 },  // Bertemu Dengan
        { wch: 18 },  // Check-in
        { wch: 18 },  // Check-out
        { wch: 15 },  // Durasi
        { wch: 10 },  // Status
        { wch: 12 },  // Rating
        { wch: 18 },  // Deskripsi Rating
        { wch: 20 },  // Kategori Feedback
        { wch: 30 },  // Teks Feedback
        { wch: 18 },  // Operator Check-in
        { wch: 15 },  // Role Check-in
        { wch: 18 },  // Operator Check-out
        { wch: 15 },  // Role Check-out
        { wch: 12 }   // Tanggal
      ];
      ws['!cols'] = colWidths;

      const title = `Laporan Pengunjung ULT FPEB`;
      const subtitle = `Periode: ${getDateRangeLabel()}`; 
      const exportDate = `Diekspor pada: ${new Date().toLocaleString('id-ID')}`;
      
      XLSX.utils.sheet_add_aoa(ws, [
        [title],
        [subtitle],
        [exportDate],
        [''], 
      ], { origin: 'A1' });

      const range = XLSX.utils.decode_range(ws['!ref']);
      range.e.r += 4; 
      ws['!ref'] = XLSX.utils.encode_range(range);

      XLSX.utils.book_append_sheet(wb, ws, 'Data Pengunjung');

      const currentDate = new Date().toISOString().split('T')[0];
      const filterSuffix = dateFilter.preset !== 'all' ? `_${dateFilter.preset}` : '';
      const filename = `laporan_pengunjung_${currentDate}${filterSuffix}.xlsx`;

      XLSX.writeFile(wb, filename);

      setMessage(`✅ Laporan Excel berhasil diekspor! (${filteredVisitors.length} record)`);
      setTimeout(() => setMessage(''), 5000);

    } catch (error) {
      console.error('Error exporting Excel (frontend generation failed):', error);
      
      try {
        setMessage('Frontend export failed, attempting backend export...');
        await handleBackendExport(); 
      } catch (backendError) {
        console.error('Backend export also failed:', backendError);
        setMessage('❌ Gagal mengekspor laporan. Silakan coba lagi.');
        setTimeout(() => setMessage(''), 5000);
      }
    } finally {
      setExportLoading(false);
    }
  };

  const handleViewDetails = (visitorId) => {
    try {
      setOpenDropdown(null);
      navigate(`/app/visitors/${visitorId}`);
    } catch (error) {
      console.error('Navigation error:', error);
      window.location.href = `/app/visitors/${visitorId}`;
    }
  };

  const handleDownloadReport = async (visitorId, visitorName) => {
    try {
      const response = await visitorsAPI.downloadDocx(visitorId);
      const fileName = `visitor-report-${visitorId}.docx`;
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      setMessage('DOCX report downloaded successfully!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error downloading report:', error);
      setMessage('Error downloading report');
      setTimeout(() => setMessage(''), 3000);
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
          fetchVisitors(); 
          setMessage('Visitor record deleted successfully!');
          setTimeout(() => setMessage(''), 3000);
        } else {
            setMessage(`Error deleting visitor: ${response.data.message || 'Unknown error'}`);
            setTimeout(() => setMessage(''), 3000);
        }
      } catch (error) {
        console.error('Error deleting visitor:', error);
        setMessage('Error deleting visitor');
        setTimeout(() => setMessage(''), 3000);
      }
    }
  };

  const handleCheckOut = async (visitorId) => {
    try {
      const response = await visitorsAPI.checkOut(visitorId);
      if (response.data.success) {
        fetchVisitors(); 
        setMessage('Visitor checked out successfully!');
        setTimeout(() => setMessage(''), 3000);
      } else {
          setMessage(`Error checking out visitor: ${response.data.message || 'Unknown error'}`);
          setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error checking out visitor:', error);
      setMessage('Error checking out visitor');
      setTimeout(() => setMessage(''), 3000);
    }
  };

  // Enhanced filtering function
  const filteredVisitors = Array.isArray(visitors) ? visitors.filter(visitor => {
    const matchesSearch = visitor?.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                            visitor?.phone?.includes(searchTerm) ||
                            visitor?.institution?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || 
                            (filterStatus === 'active' && !visitor?.check_out_time) ||
                            (filterStatus === 'completed' && visitor?.check_out_time);
    
    const matchesPurpose = filterPurpose === 'all' || visitor?.purpose === filterPurpose;
    
    const matchesUnit = filterUnit === 'all' || visitor?.unit === filterUnit;
    
    const matchesPersonToMeet = filterPersonToMeet === 'all' || visitor?.person_to_meet === filterPersonToMeet;
    
    const matchesInstitution = filterInstitution === 'all' || visitor?.institution === filterInstitution;
    
    let matchesDate = true;
    if (dateFilter.startDate && dateFilter.endDate && visitor?.check_in_time) {
      const visitorDate = new Date(visitor.check_in_time).toISOString().split('T')[0];
      matchesDate = visitorDate >= dateFilter.startDate && visitorDate <= dateFilter.endDate;
    }

    // ⭐ BARU - Get feedback for this visitor
    const visitorFeedback = feedbacks.find(f => f.visitor_id === visitor.id);
    const matchesFeedback = filterFeedback === 'all' || 
                         (filterFeedback === 'with-feedback' && visitorFeedback) ||
                         (filterFeedback === 'without-feedback' && !visitorFeedback) ||
                         (visitorFeedback && visitorFeedback.rating && visitorFeedback.rating.toString() === filterFeedback);
    
    // ⭐ BARU - Feedback category filter
    const matchesFeedbackCategory = filterFeedbackCategory === 'all' || 
                                 (visitorFeedback && visitorFeedback.category && 
                                  (visitorFeedback.category === parseInt(filterFeedbackCategory) || 
                                   visitorFeedback.category === filterFeedbackCategory));
    
    // ⭐ DIPERBARUI - ditambahkan institution filter
    return matchesSearch && matchesStatus && matchesPurpose && matchesUnit && matchesPersonToMeet && matchesInstitution && matchesDate && matchesFeedback && matchesFeedbackCategory;
  }) : [];

  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const currentVisitors = filteredVisitors.slice(startIndex, startIndex + itemsPerPage);

  const stats = {
    total: filteredVisitors.length,
    active: filteredVisitors.filter(v => !v?.check_out_time).length,
    completed: filteredVisitors.filter(v => v?.check_out_time).length,
    today: filteredVisitors.filter(v => {
      if (!v?.check_in_time) return false;
      const today = new Date().toDateString();
      return new Date(v.check_in_time).toDateString() === today;
    }).length
  };

  // Styles (provided as is, consider using Tailwind for responsiveness)
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const cardHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #dee2e6'
  };

  const cardBodyStyle = {
    padding: '24px'
  };

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #d8dbe0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
  };

  const buttonStyle = {
    padding: '12px 24px',
    border: 'none',
    borderRadius: '6px',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'background-color 0.2s ease'
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
              borderTop: `4px solid ${brandData.primaryColor || '#0d6efd'}`,
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
            
            /* Custom table styling for better appearance */
            .table {
              --cui-table-striped-bg: #f8f9fa;
              --cui-table-hover-bg: #e9ecef;
            }
            
            .table th {
              background-color: #f1f3f4 !important;
              border-bottom: 2px solid #dee2e6 !important;
              font-size: 12px !important;
              padding: 12px 8px !important;
              vertical-align: middle !important;
              white-space: nowrap !important;
            }
            
            .table td {
              padding: 4px 8px !important;
              vertical-align: middle !important;
              border-bottom: 1px solid #e9ecef !important;
              font-size: 12px !important;
            }
            
            .table tbody tr:hover {
              background-color: #f8f9fa !important;
            }
            
            .table-responsive {
              border-radius: 8px;
              overflow: hidden;
            }
          `}
        </style>
      </div>
    );
  }

  // Check if any filter is active
  const hasActiveFilters = dateFilter.preset !== 'all' || searchTerm || filterStatus !== 'all' || filterFeedback !== 'all' || filterFeedbackCategory !== 'all' ||
                          filterPurpose !== 'all' || filterUnit !== 'all' || filterPersonToMeet !== 'all' || filterInstitution !== 'all';

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1600px', margin: '0 auto' }}>
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
              color: '#495057', 
              margin: '0 0 8px 0' 
            }}>
              Export Reports
            </h1>
            <p style={{ 
              color: '#6c757d', 
              margin: '0',
              fontSize: '16px' 
            }}>
              Export and manage visitor reports with advanced filtering
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <button
              onClick={fetchVisitors}
              disabled={loading}
              style={{
                ...buttonStyle,
                backgroundColor: '#6c757d',
                color: 'white'
              }}
            >
              <RefreshCw size={16} />
              Refresh
            </button>
            <button
              onClick={handleExportExcel}
              disabled={exportLoading || filteredVisitors.length === 0}
              style={{
                ...buttonStyle,
                backgroundColor: exportLoading || filteredVisitors.length === 0 ? '#6c757d' : '#198754',
                color: 'white',
                opacity: exportLoading || filteredVisitors.length === 0 ? 0.6 : 1
              }}
            >
              <FileSpreadsheet size={16} />
              {exportLoading ? 'Exporting...' : 'Export Excel'}
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            backgroundColor: message.includes('Error') || message.includes('Failed') ? '#f8d7da' : '#d1e7dd',
            color: message.includes('Error') || message.includes('Failed') ? '#721c24' : '#0f5132',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: `1px solid ${message.includes('Error') || message.includes('Failed') ? '#f5c6cb' : '#badbcc'}`
          }}>
            {message}
          </div>
        )}

        {/* Feedback Error Message */}
        {feedbackError && (
          <div style={{
            backgroundColor: '#fff3cd',
            color: '#664d03',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #ffecb5',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <span>⚠️</span>
            <div>
              <strong>Feedback data unavailable:</strong> {feedbackError}
              <br />
              <small>Visitor data is still available, but feedback information cannot be displayed.</small>
            </div>
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
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: brandData.primaryColor || '#0d6efd' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  {hasActiveFilters ? 'Filtered Visitors' : 'Total Visitors'}
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {stats.total}
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
                <Users size={24} style={{ color: brandData.primaryColor || '#0d6efd' }} />
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
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: brandData.successColor || '#198754' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Active Visitors
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {stats.active}
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
                <Clock size={24} style={{ color: brandData.successColor || '#198754' }} />
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
            <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: brandData.warningColor || '#ffc107' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div style={{ flex: 1 }}>
                <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                  Completed Visits
                </div>
                <div style={{ fontSize: '28px', fontWeight: '700', color: '#212529' }}>
                  {stats.completed}
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
                <CheckCircle size={24} style={{ color: brandData.warningColor || '#ffc107' }} />
              </div>
            </div>
          </div>

          <div style={{
            ...cardStyle,
            background: `linear-gradient(135deg, ${brandData.errorColor || '#dc3545'} 0%, ${brandData.errorColor || '#b02a37'} 100%)`,
            color: 'white'
          }}>
            <div style={cardBodyStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {stats.today}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Today</div>
                </div>
                <Calendar size={32} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Enhanced Filters */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
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
              Filter Visitors
            </h3>
          </div>
          <div style={cardBodyStyle}>
            {/* Search and Basic Filters */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px',
              marginBottom: '24px'
            }}>
              <div style={{ position: 'relative' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Search Visitors
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
                    placeholder="Search by name, phone, institution..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    style={{
                      ...inputStyle,
                      paddingLeft: '40px'
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
                  style={inputStyle}
                >
                  <option value="all">All Status</option>
                  <option value="active">Active Visitors</option>
                  <option value="completed">Completed Visits</option>
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Feedback Filter
                </label>
                <select
                  value={filterFeedback}
                  onChange={(e) => setFilterFeedback(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Feedback</option>
                  <option value="with-feedback">With Feedback</option>
                  <option value="without-feedback">Without Feedback</option>
                  <option value="1">1 Star</option>
                  <option value="2">2 Stars</option>
                  <option value="3">3 Stars</option>
                  <option value="4">4 Stars</option>
                  <option value="5">5 Stars</option>
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Feedback Category
                </label>
                <select
                  value={filterFeedbackCategory}
                  onChange={(e) => setFilterFeedbackCategory(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Categories</option>
                  {feedbackCategories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Advanced Filters */}
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
              gap: '20px',
              marginBottom: '24px',
              borderTop: '1px solid #dee2e6',
              paddingTop: '24px'
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Purpose of Visit
                </label>
                <select
                  value={filterPurpose}
                  onChange={(e) => setFilterPurpose(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Purposes</option>
                  {purposeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Unit to Visit
                </label>
                <select
                  value={filterUnit}
                  onChange={(e) => setFilterUnit(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Units</option>
                  {unitOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Person to Meet
                </label>
                <select
                  value={filterPersonToMeet}
                  onChange={(e) => setFilterPersonToMeet(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Persons</option>
                  {personToMeetOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Institution
                </label>
                <select
                  value={filterInstitution}
                  onChange={(e) => setFilterInstitution(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Institutions</option>
                  {institutionOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Date Filters */}
            <div style={{ borderTop: '1px solid #dee2e6', paddingTop: '24px' }}>
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  marginBottom: '8px', 
                  fontWeight: '500', 
                  color: '#495057',
                  fontSize: '14px' 
                }}>
                  Date Range
                </label>
                <select
                  value={dateFilter.preset}
                  onChange={(e) => handleDatePresetChange(e.target.value)}
                  style={inputStyle}
                >
                  {datePresets.map(preset => (
                    <option key={preset.value} value={preset.value}>
                      {preset.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Custom Date Range */}
              {dateFilter.preset === 'custom' && (
                <div style={{ 
                  display: 'grid', 
                  gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
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
                      Start Date
                    </label>
                    <input
                      type="date"
                      value={dateFilter.startDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, startDate: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                  <div>
                    <label style={{ 
                      display: 'block', 
                      marginBottom: '8px', 
                      fontWeight: '500', 
                      color: '#495057',
                      fontSize: '14px' 
                    }}>
                      End Date
                    </label>
                    <input
                      type="date"
                      value={dateFilter.endDate}
                      onChange={(e) => setDateFilter(prev => ({ ...prev, endDate: e.target.value }))}
                      style={inputStyle}
                    />
                  </div>
                </div>
              )}

              {/* Active Filters Display */}
              {hasActiveFilters && (
                <div style={{ marginTop: '16px' }}>
                  <div style={{ 
                    display: 'flex', 
                    flexWrap: 'wrap', 
                    gap: '8px', 
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#495057' 
                    }}>
                      Active Filters:
                    </span>
                    
                    {searchTerm && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#e3f2fd',
                        color: '#1565c0',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Search: "{searchTerm}"
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setSearchTerm('')}
                        />
                      </span>
                    )}
                    
                    {filterStatus !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#f3e5f5',
                        color: '#7b1fa2',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Status: {filterStatus}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterStatus('all')}
                        />
                      </span>
                    )}

                    {filterPurpose !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#fff3e0',
                        color: '#ef6c00',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Purpose: {filterPurpose}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterPurpose('all')}
                        />
                      </span>
                    )}

                    {filterUnit !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#e8eaf6',
                        color: '#3f51b5',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Unit: {filterUnit}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterUnit('all')}
                        />
                      </span>
                    )}

                    {filterPersonToMeet !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#fce4ec',
                        color: '#c2185b',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Person: {filterPersonToMeet}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterPersonToMeet('all')}
                        />
                      </span>
                    )}

                    {filterInstitution !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#f3e5f5',
                        color: '#7b1fa2',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Institution: {filterInstitution}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterInstitution('all')}
                        />
                      </span>
                    )}
                    
                    {dateFilter.preset !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#e8f5e8',
                        color: '#2e7d32',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Date: {datePresets.find(p => p.value === dateFilter.preset)?.label}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={clearDateFilter}
                        />
                      </span>
                    )}

                    {filterFeedback !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#e8f5e8',
                        color: '#2e7d32',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Feedback: {filterFeedback === 'with-feedback' ? 'With Feedback' : 
                                  filterFeedback === 'without-feedback' ? 'Without Feedback' : 
                                  `${filterFeedback} Stars`}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterFeedback('all')}
                        />
                      </span>
                    )}

                    {filterFeedbackCategory !== 'all' && (
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '4px',
                        padding: '4px 8px',
                        backgroundColor: '#fff3cd',
                        color: '#856404',
                        borderRadius: '4px',
                        fontSize: '12px',
                        fontWeight: '500'
                      }}>
                        Category: {(() => {
                          const category = feedbackCategories.find(cat => cat.id === parseInt(filterFeedbackCategory));
                          return category ? category.name : filterFeedbackCategory;
                        })()}
                        <X 
                          size={12} 
                          style={{ cursor: 'pointer' }}
                          onClick={() => setFilterFeedbackCategory('all')}
                        />
                      </span>
                    )}
                  </div>
                  
                  <button
                    onClick={clearAllFilters}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#dc3545',
                      color: 'white',
                      padding: '8px 16px',
                      fontSize: '12px'
                    }}
                  >
                    <X size={14} />
                    Clear All Filters
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Visitors Table */}
        <div style={cardStyle}>
          <div style={cardHeaderStyle}>
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
              Visitor List ({filteredVisitors.length} records)
            </h3>
          </div>
          
          {currentVisitors.length > 0 ? (
            <div style={{ 
              position: 'relative',
              backgroundColor: 'white',
              borderRadius: '0 0 8px 8px',
              overflow: 'hidden'
            }}>
              {/* Enhanced Table Container with Better Scrolling */}            <div style={{ 
              overflowX: 'auto', 
              overflowY: 'visible',
              maxHeight: '70vh',
              position: 'relative',
              border: '1px solid #dee2e6',
              borderTop: 'none',
              borderRadius: '0 0 8px 8px',
              scrollbarWidth: 'thin',
              scrollbarColor: '#cbd5e0 #f7fafc'
            }}>
                <table style={{
                  width: '100%',
                  minWidth: '1800px',
                  borderCollapse: 'separate',
                  borderSpacing: 0,
                  fontSize: '13px',
                  backgroundColor: 'white',
                  tableLayout: 'fixed'
                }}>
                  {/* Enhanced Table Header */}
                  <thead style={{
                    position: 'sticky',
                    top: 0,
                    zIndex: 10,
                    backgroundColor: '#f8f9fa',
                    borderBottom: '2px solid #dee2e6'
                  }}>
                    <tr>
                      <th style={{
                        width: '50px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>No.</th>
                      <th style={{
                        width: '180px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Visitor Name</th>
                      <th style={{
                        width: '120px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Phone</th>
                      <th style={{
                        width: '160px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Institution</th>
                      <th style={{
                        width: '140px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Purpose</th>
                      <th style={{
                        width: '120px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Unit</th>
                      <th style={{
                        width: '140px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Person to Meet</th>
                      <th style={{
                        width: '130px',
                        padding: '12px 10px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Check-in</th>
                      <th style={{
                        width: '130px',
                        padding: '12px 10px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Check-out</th>
                      <th style={{
                        width: '80px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Duration</th>
                      <th style={{
                        width: '90px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Status</th>
                      <th style={{
                        width: '100px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Rating</th>
                      <th style={{
                        width: '90px',
                        padding: '12px 8px',
                        textAlign: 'center',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                        top: 0
                      }}>Category</th>
                      <th style={{
                        width: '200px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        borderRight: '1px solid #dee2e6',
                        position: 'sticky',
                      }}>Feedback</th>
                      <th style={{
                        width: '120px',
                        padding: '12px 10px',
                        textAlign: 'left',
                        fontWeight: '600',
                        fontSize: '12px',
                        color: '#495057',
                        backgroundColor: '#f1f3f4',
                        position: 'sticky',
                        top: 0
                      }}>Operator</th>
                    </tr>
                  </thead>
                  
                  {/* Enhanced Table Body */}
                  <tbody>
                    {currentVisitors.map((visitor, index) => {
                      const isCheckedOut = !!visitor.check_out_time;
                      const visitorFeedback = feedbacks.find(f => f.visitor_id === visitor.id);
                      const rowIndex = startIndex + index + 1;
                      
                      return (
                        <tr 
                          key={visitor.id} 
                          style={{
                            backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa',
                            borderBottom: '1px solid #dee2e6',
                            transition: 'background-color 0.2s ease'
                          }}
                          onMouseEnter={(e) => e.currentTarget.style.backgroundColor = '#e3f2fd'}
                          onMouseLeave={(e) => e.currentTarget.style.backgroundColor = index % 2 === 0 ? 'white' : '#f8f9fa'}
                        >
                          <td style={{
                            padding: '10px 8px',
                            textAlign: 'center',
                            fontWeight: '500',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef'
                          }}>{rowIndex}</td>
                          
                          <td style={{
                            padding: '10px',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '180px'
                          }}>
                            <div style={{ 
                              fontWeight: '600', 
                              color: '#495057', 
                              fontSize: '13px', 
                              marginBottom: '2px',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.name || visitor.full_name || 'N/A'}>
                              {visitor.name || visitor.full_name || 'N/A'}
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#6c757d',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.email || 'No email'}>
                              {visitor.email || 'No email'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                          }} title={visitor.phone || 'N/A'}>
                            {visitor.phone || 'N/A'}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '160px'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.institution || 'N/A'}>
                              {visitor.institution || 'N/A'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '140px'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.purpose || 'N/A'}>
                              {visitor.purpose || 'N/A'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '120px'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.unit || 'N/A'}>
                              {visitor.unit || 'N/A'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '140px'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.person_to_meet || 'N/A'}>
                              {visitor.person_to_meet || 'N/A'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '12px',
                            color: '#495057',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            <div style={{
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.check_in_time ? formatDateTime(visitor.check_in_time) : 'N/A'}>
                              {visitor.check_in_time ? formatDateTime(visitor.check_in_time) : 'N/A'}
                            </div>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '12px',
                            color: '#495057',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            {isCheckedOut ? (
                              <div style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={formatDateTime(visitor.check_out_time)}>
                                {formatDateTime(visitor.check_out_time)}
                              </div>
                            ) : (
                              <span style={{ 
                                color: '#fd7e14', 
                                fontWeight: '600', 
                                fontSize: '12px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '4px'
                              }}>
                                <Clock size={12} /> Active
                              </span>
                            )}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '12px',
                            fontWeight: '500',
                            color: '#495057',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            {calculateDuration(visitor.check_in_time, visitor.check_out_time)}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            <span style={{ 
                              padding: '4px 8px', 
                              borderRadius: '12px', 
                              fontSize: '11px', 
                              fontWeight: '600',
                              backgroundColor: isCheckedOut ? '#d1e7dd' : '#fff3cd',
                              color: isCheckedOut ? '#0f5132' : '#664d03',
                              display: 'inline-block',
                              whiteSpace: 'nowrap'
                            }}>
                              {isCheckedOut ? 'Completed' : 'Active'}
                            </span>
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            {visitorFeedback ? (
                              <div style={{ 
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '3px'
                              }}>
                                <div style={{ fontSize: '14px', color: '#ffc107', letterSpacing: '1px' }}>
                                  {'★'.repeat(visitorFeedback.rating)}{'☆'.repeat(5 - visitorFeedback.rating)}
                                </div>
                                <div style={{ fontSize: '10px', color: '#6c757d', fontWeight: '500' }}>
                                  ({visitorFeedback.rating}/5)
                                </div>
                                <div style={{ 
                                  fontSize: '9px', 
                                  color: '#495057', 
                                  fontWeight: '600',
                                  textAlign: 'center',
                                  padding: '2px 4px',
                                  backgroundColor: '#f8f9fa',
                                  borderRadius: '3px',
                                  whiteSpace: 'nowrap'
                                }}>
                                  {getRatingDescription(visitorFeedback.rating)}
                                </div>
                              </div>
                            ) : (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#6c757d', 
                                fontStyle: 'italic' 
                              }}>
                                No rating
                              </div>
                            )}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            textAlign: 'center',
                            borderRight: '1px solid #e9ecef'
                          }}>
                            {visitorFeedback ? (
                              <span style={{
                                padding: '3px 8px',
                                borderRadius: '10px',
                                fontSize: '10px',
                                fontWeight: '600',
                                backgroundColor: '#e2e3e5',
                                color: '#495057',
                                display: 'inline-block',
                                whiteSpace: 'nowrap'
                              }}>
                                {getFeedbackCategoryLabel(visitorFeedback.category)}
                              </span>
                            ) : (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#6c757d', 
                                fontStyle: 'italic' 
                              }}>
                                No category
                              </div>
                            )}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            borderRight: '1px solid #e9ecef',
                            maxWidth: '200px'
                          }}>
                            {visitorFeedback && visitorFeedback.feedback_text ? (
                              <div 
                                style={{ 
                                  fontSize: '12px', 
                                  color: '#495057',
                                  lineHeight: '1.4',
                                  overflow: 'hidden',
                                  textOverflow: 'ellipsis',
                                  whiteSpace: 'nowrap'
                                }}
                                title={visitorFeedback.feedback_text}
                              >
                                {visitorFeedback.feedback_text}
                              </div>
                            ) : (
                              <div style={{ 
                                fontSize: '11px', 
                                color: '#6c757d', 
                                fontStyle: 'italic' 
                              }}>
                                No feedback
                              </div>
                            )}
                          </td>
                          
                          <td style={{
                            padding: '10px',
                            fontSize: '13px',
                            color: '#495057',
                            maxWidth: '120px'
                          }}>
                            <div style={{ fontWeight: '500', marginBottom: '2px' }}>
                              <div style={{
                                overflow: 'hidden',
                                textOverflow: 'ellipsis',
                                whiteSpace: 'nowrap'
                              }} title={visitor.input_by_name || visitor.operator_name || 'Unknown'}>
                                {visitor.input_by_name || visitor.operator_name || 'Unknown'}
                              </div>
                            </div>
                            <div style={{ 
                              fontSize: '11px', 
                              color: '#6c757d',
                              overflow: 'hidden',
                              textOverflow: 'ellipsis',
                              whiteSpace: 'nowrap'
                            }} title={visitor.input_by_role || visitor.operator_role || 'Staff'}>
                              {visitor.input_by_role || visitor.operator_role || 'Staff'}
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            <div style={{ 
              textAlign: 'center', 
              padding: '60px 20px',
              backgroundColor: 'white',
              borderRadius: '0 0 8px 8px'
            }}>
              <Users size={48} style={{ opacity: 0.3, marginBottom: '16px' }} />
              <h4 style={{ margin: '0 0 8px 0', color: '#495057' }}>No visitors found</h4>
              <p style={{ margin: '0', fontSize: '14px', color: '#6c757d' }}>
                {hasActiveFilters 
                  ? 'Try adjusting your filters to see more results.' 
                  : 'No visitors available in the system.'
                }
              </p>
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div style={{ 
              padding: '24px', 
              borderTop: '1px solid #dee2e6', 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center',
              flexWrap: 'wrap',
              gap: '16px'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredVisitors.length)} of {filteredVisitors.length} visitors
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <button
                  onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                  disabled={currentPage === 1}
                  style={{ 
                    ...buttonStyle, 
                    backgroundColor: currentPage === 1 ? (brandData.secondaryColor || '#6c757d') : (brandData.primaryColor || '#0d6efd'), 
                    color: 'white', 
                    padding: '8px 16px',
                    opacity: currentPage === 1 ? 0.6 : 1,
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                  }}
                >
                  Previous
                </button>
                <span style={{ fontSize: '14px', color: '#495057' }}>
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                  disabled={currentPage === totalPages}
                  style={{ 
                    ...buttonStyle, 
                    backgroundColor: currentPage === totalPages ? (brandData.secondaryColor || '#6c757d') : (brandData.primaryColor || '#0d6efd'), 
                    color: 'white', 
                    padding: '8px 16px',
                    opacity: currentPage === totalPages ? 0.6 : 1,
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer'
                  }}
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}