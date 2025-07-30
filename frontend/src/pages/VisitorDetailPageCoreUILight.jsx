import { useState, useEffect } from 'react';
import { useParams, useNavigate, useSearchParams } from 'react-router-dom';
import { visitorsAPI, feedbackAPI } from '../utils/api.js';
import { visitorManagementAPI } from '../utils/visitorManagementAPI.js';
import { formatDateTime } from '../utils/index.js';
import FeedbackModal from '../components/FeedbackModal.jsx';
import DeletionRequestModal from '../components/DeletionRequestModal.jsx';
import { SafeImage } from '../components/SafeImage.jsx';
import { getPhotoUrl, getVisitorPhotoUrl } from '../utils/imageUtils.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { getCurrentUser } from '../utils/auth.js';
import {
  ArrowLeft,
  User,
  Phone,
  Mail,
  Building2,
  MapPin,
  Calendar,
  Clock,
  FileText,
  Download,
  UserX,
  Eye,
  CheckCircle,
  XCircle,
  Trash2,
  FileCheck,
  AlertTriangle,
  Edit,
  CreditCard,
  Save
} from 'lucide-react';

export function VisitorDetailPageCoreUILight() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const { confirm, alert } = useGlobalAlert();

  // Document types state
  const [documentTypes, setDocumentTypes] = useState([
    'Surat Keterangan',
    'Transkrip Nilai', 
    'Sertifikat',
    'Ijazah',
    'Surat Rekomendasi',
    'Legalisir Dokumen',
    'Surat Keterangan Lulus',
    'Lainnya'
  ]);
  const [visitor, setVisitor] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isCheckingOut, setIsCheckingOut] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [isModalClosing, setIsModalClosing] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [showDeletionRequestModal, setShowDeletionRequestModal] = useState(false);
  
  // Deletion status states
  const [deletionStatus, setDeletionStatus] = useState({
    hasPendingDeletion: false,
    deletionRequest: null
  });
  const [isCheckingDeletionStatus, setIsCheckingDeletionStatus] = useState(true);
  
  // Document processing states
  const [showDocumentModal, setShowDocumentModal] = useState(false);
  const [documentData, setDocumentData] = useState({
    requestDocument: false,
    documentType: '',
    customDocumentType: '', // For "Lainnya" option
    documentName: '',
    documentNumber: '',
    documentDetails: ''
  });

  // Inline editing states
  const [isEditing, setIsEditing] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isSaving, setIsSaving] = useState(false);
  const [editHistory, setEditHistory] = useState([]);
  // Custom input states for "Lainnya" option
  const [customInputs, setCustomInputs] = useState({
    purpose: '',
    unit: '',
    person_to_meet: ''
  });

  // Configuration states for dynamic dropdowns
  const [configurations, setConfigurations] = useState({
    purposes: [],
    units: [],
    personToMeet: []
  });
  const [isLoadingConfigurations, setIsLoadingConfigurations] = useState(false);

  // Helper functions for edit history API management

  const fetchEditHistoryFromAPI = async (visitorId) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visitors/${visitorId}/edit-history`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Loaded edit history from API:', data.message);
          return data.data || [];
        } else {
          console.warn('⚠️ API returned error:', data.message);
          return [];
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API error:', response.status, errorData.message);
        return [];
      }
    } catch (error) {
      console.error('❌ Error fetching edit history from API:', error);
      return [];
    }
  };

  const saveEditHistoryToAPI = async (visitorId, historyEntry) => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visitors/${visitorId}/edit-history`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(historyEntry)
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          console.log('✅ Saved edit history to API:', data.message);
          return true;
        } else {
          console.warn('⚠️ Failed to save to API:', data.message);
          return false;
        }
      } else {
        const errorData = await response.json().catch(() => ({ message: 'Unknown error' }));
        console.error('❌ API save error:', response.status, errorData.message);
        return false;
      }
    } catch (error) {
      console.error('❌ Error saving edit history to API:', error);
      return false;
    }
  };

  // Get current user
  useEffect(() => {
    const user = getCurrentUser();
    setCurrentUser(user);
  }, []);

  // Helper function to check if current user is admin
  const isAdmin = () => {
    return currentUser?.role === 'Admin' || currentUser?.role === 'Manager';
  };

  // Helper function to check if current user can delete directly
  const canDeleteDirectly = () => {
    // Admin can delete any visitor
    if (isAdmin()) return true;

    // Non-admin can only delete visitors they created
    return visitor && currentUser && visitor.input_by_user_id === currentUser.id;
  };

  // Function to check visitor deletion status
  const checkVisitorDeletionStatus = async (visitorId) => {
    try {
      setIsCheckingDeletionStatus(true);
      const response = await visitorManagementAPI.checkVisitorDeletionStatus(visitorId);
      
      if (response.data.success) {
        const newDeletionStatus = {
          hasPendingDeletion: response.data.data.hasPendingDeletion,
          deletionRequest: response.data.data.deletionRequest
        };
        
        setDeletionStatus(newDeletionStatus);
        
        // If visitor now has pending deletion and user is currently editing, cancel editing
        if (newDeletionStatus.hasPendingDeletion && isEditing) {
          setIsEditing(false);
          setEditFormData({});
          alert.warning('Peringatan', 'Mode edit dibatalkan karena data visitor sedang dalam usulan penghapusan');
        }
      }
    } catch (error) {
      console.error('Error checking deletion status:', error);
      // Set default status if error occurs
      setDeletionStatus({
        hasPendingDeletion: false,
        deletionRequest: null
      });
    } finally {
      setIsCheckingDeletionStatus(false);
    }
  };

  // Helper function to check if current user can request deletion
  const canRequestDeletion = () => {
    // Only non-admin users who are NOT the owner can request deletion
    return currentUser &&
          ['Receptionist', 'Operator', 'Staff'].includes(currentUser.role) &&
          visitor &&
          visitor.input_by_user_id !== currentUser.id;
  };

  // Helper function to format custom input fields
  const formatCustomInput = (value) => {
    if (value && value.startsWith('Other: ')) {
      return value.substring(7); // Remove "Other: " prefix
    }
    return value || 'Tidak ada data';
  };


  const loadEditHistory = async () => {
    if (!id) return;
    
    try {
      // Load edit history from API only
      const apiHistory = await fetchEditHistoryFromAPI(id);
      setEditHistory(apiHistory);
    } catch (error) {
      console.error('Error loading edit history from API:', error);
      setEditHistory([]);
    }
  };

  useEffect(() => {
    fetchVisitorDetail();
    fetchConfigurations();
    loadEditHistory();
    // Check deletion status for this visitor
    if (id) {
      checkVisitorDeletionStatus(id);
    }
  }, [id]);

  useEffect(() => {
    if (visitor) {
      // Silent update - removed excessive logging
    }
  }, [visitor]);

  const fetchVisitorDetail = async () => {
    try {
      setIsLoading(true);
      setError('');

      // Try authenticated endpoint first
      try {
        const response = await visitorsAPI.getById(id);
        if (response && response.data && response.data.success) {
          const visitorData = response.data.data;
          setVisitor(visitorData);
          return;
        }
      } catch (authError) {
        console.log('Auth endpoint error:', authError.response?.status);
        // If 404, visitor doesn't exist
        if (authError.response?.status === 404) {
          setError('Visitor not found');
          setIsLoading(false);
          return;
        }
        // For other errors, try public endpoint
      }
        // Fallback to public endpoint
      try {
        const response = await fetch(`${import.meta.env.VITE_API_URL}/visitors/public/${id}?t=${Date.now()}`, {
          method: 'GET',
          cache: 'no-cache',
          headers: {
            'Content-Type': 'application/json',
          }
        });
        if (response.ok) {
          const data = await response.json();

          // Temporary fix: ensure document request fields exist
          if (!data.hasOwnProperty('request_document')) {
            console.warn('⚠️ request_document field missing, adding default');
            data.request_document = false;
          }
          if (!data.hasOwnProperty('document_type')) {
            data.document_type = null;
          }
          if (!data.hasOwnProperty('document_name')) {
            data.document_name = null;
          }
          if (!data.hasOwnProperty('document_number')) {
            data.document_number = null;
          }

          setVisitor(data);
          return;
        }
      } catch (publicError) {
        console.error('Public endpoint also failed:', publicError);
      }

      setError('Visitor not found');
    } catch (error) {
      console.error('Error fetching visitor:', error);
      setError('Failed to load visitor details');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchConfigurations = async () => {
    try {
      setIsLoadingConfigurations(true);
      const response = await fetch(`${import.meta.env.VITE_API_URL}/configurations`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
          'Content-Type': 'application/json',
        }
      });

      if (response.ok) {
        const data = await response.json();
        if (data.success) {
          setConfigurations({
            purposes: data.data.purposes || [],
            units: data.data.units || [],
            personToMeet: data.data.personToMeet || []
          });

          // Update document types if available from server
          if (data.data.documentTypes && data.data.documentTypes.length > 0) {
            const serverDocumentTypes = data.data.documentTypes.map(item => item.value || item.name || item);
            setDocumentTypes([...serverDocumentTypes, 'Lainnya']);
          }
        }
      } else {
        console.warn('Failed to fetch configurations, using fallback');
        // Set fallback configurations if API fails
        setConfigurations({
          purposes: [
            { id: 1, name: 'Konsultasi', value: 'Konsultasi' },
            { id: 2, name: 'Pertemuan', value: 'Pertemuan' },
            { id: 3, name: 'Permintaan Dokumen', value: 'Permintaan Dokumen' },
            { id: 4, name: 'Lainnya', value: 'Lainnya' }
          ],
          units: [
            { id: 1, name: 'Dekan', value: 'Dekan' },
            { id: 2, name: 'Wakil Dekan Bidang Akademik (WD 1)', value: 'Wakil Dekan Bidang Akademik (WD 1)' },
            { id: 3, name: 'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)', value: 'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)' },
            { id: 4, name: 'Wakil Dekan Bidang Kemahasiswaan (WD 3)', value: 'Wakil Dekan Bidang Kemahasiswaan (WD 3)' }
          ],
          personToMeet: [
            { id: 1, name: 'Dekan', value: 'Dekan' },
            { id: 2, name: 'Wakil Dekan', value: 'Wakil Dekan' },
            { id: 3, name: 'Dosen', value: 'Dosen' },
            { id: 4, name: 'Staff', value: 'Staff' }
          ]
        });
      }
    } catch (error) {
      console.error('Error fetching configurations:', error);
      // Set fallback configurations
      setConfigurations({
        purposes: [
          { id: 1, name: 'Konsultasi', value: 'Konsultasi' },
          { id: 2, name: 'Pertemuan', value: 'Pertemuan' },
          { id: 3, name: 'Permintaan Dokumen', value: 'Permintaan Dokumen' },
          { id: 4, name: 'Lainnya', value: 'Lainnya' }
        ],
        units: [
          { id: 1, name: 'Dekan', value: 'Dekan' },
          { id: 2, name: 'Wakil Dekan Bidang Akademik (WD 1)', value: 'Wakil Dekan Bidang Akademik (WD 1)' },
          { id: 3, name: 'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)', value: 'Wakil Dekan bidang Sumberdaya, Keuangan, dan Umum (WD 2)' },
          { id: 4, name: 'Wakil Dekan Bidang Kemahasiswaan (WD 3)', value: 'Wakil Dekan Bidang Kemahasiswaan (WD 3)' }
        ],
        personToMeet: [
          { id: 1, name: 'Dekan', value: 'Dekan' },
          { id: 2, name: 'Wakil Dekan', value: 'Wakil Dekan' },
          { id: 3, name: 'Dosen', value: 'Dosen' },
          { id: 4, name: 'Staff', value: 'Staff' }
        ]
      });
    } finally {
      setIsLoadingConfigurations(false);
    }
  };

  const handleCheckOut = async () => {
    // Show document processing modal first
    setShowDocumentModal(true);
  };

  const proceedWithCheckout = async () => {
    setShowDocumentModal(false);
    
    try {
      setIsCheckingOut(true);
      setError('');

      // Prepare checkout data with document info and visitor updates
      const checkoutData = {
        visitor_id: id
      };
      
      // Add any pending edits from the form (including identity fields)
      if (editFormData && Object.keys(editFormData).length > 0) {
        // Map frontend field names to backend field names
        if (editFormData.name) checkoutData.full_name = editFormData.name;
        if (editFormData.phone) checkoutData.phone_number = editFormData.phone;
        if (editFormData.email) checkoutData.email = editFormData.email;
        if (editFormData.id_type) checkoutData.id_type = editFormData.id_type;
        if (editFormData.id_number) checkoutData.id_number = editFormData.id_number;
        if (editFormData.institution) checkoutData.institution = editFormData.institution;
        if (editFormData.address) checkoutData.address = editFormData.address;
        if (editFormData.purpose) {
          checkoutData.purpose = editFormData.purpose === 'Other' && customInputs.purpose ? 
            `Other: ${customInputs.purpose}` : editFormData.purpose;
        }
        if (editFormData.person_to_meet) {
          checkoutData.person_to_meet = editFormData.person_to_meet === 'Other' && customInputs.person_to_meet ? 
            `Other: ${customInputs.person_to_meet}` : editFormData.person_to_meet;
        }
        if (editFormData.unit) {
          checkoutData.location = editFormData.unit === 'Other' && customInputs.unit ? 
            `Other: ${customInputs.unit}` : editFormData.unit;
        }
      }
      
      // Add document data if requested
      if (documentData.requestDocument) {
        checkoutData.request_document = true;
        checkoutData.document_type = documentData.documentType === 'Lainnya' 
          ? documentData.customDocumentType 
          : documentData.documentType;
        checkoutData.document_name = documentData.documentName;
        checkoutData.document_number = documentData.documentNumber;
        checkoutData.document_details = documentData.documentDetails;
      }

      const response = await visitorsAPI.checkOut(id, checkoutData);
      
      if (response && response.data && response.data.success) {
        // Update local state with the complete visitor data from backend
        setVisitor(response.data.data.visitor);
        
        // Clear any editing states since data is now saved
        setIsEditing(false);
        setEditFormData({});
        setCustomInputs({
          purpose: '',
          unit: '',
          person_to_meet: ''
        });

        setMessage('Visitor checked out successfully!');

        // Show feedback modal after successful checkout
        setTimeout(() => {
          setMessage('');
          setShowFeedbackModal(true);
        }, 1500);
      } else {
        setError(response?.data?.message || 'Failed to check out visitor');
      }
    } catch (error) {
      console.error('Check-out error:', error);
      setError(error.response?.data?.message || 'Failed to check out visitor');
    } finally {
      setIsCheckingOut(false);
    }
  };

  const handleDownloadReport = async () => {
    try {
      setMessage('Generating report, please wait...');

      const response = await visitorsAPI.downloadDocx(id);

      // Check if response contains data
      if (!response || !response.data) {
        throw new Error('No data received from server');
      }

      // Create safe filename
      const safeName = visitor.name ? visitor.name.replace(/[^\w\s-]/gi, '').replace(/\s+/g, '-') : 'visitor';
      const fileName = `visitor-report-${safeName}-${id}-${Date.now()}.docx`;

      // Create blob with proper content type
      const blob = new Blob([response.data], {
        type: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      });

      // Handle download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      link.style.display = 'none';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage('Report berhasil diunduh!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('Error downloading report:', error);

      // More specific error messages
      let errorMessage = 'Gagal mengunduh report';
      if (error.response?.status === 404) {
        errorMessage = 'Data visitor tidak ditemukan';
      } else if (error.response?.status === 503) {
        errorMessage = 'Layanan pembuatan dokumen tidak tersedia';
      } else if (error.response?.status === 500) {
        errorMessage = 'Kesalahan server saat membuat report';
      } else if (error.message.includes('No data')) {
        errorMessage = 'Tidak ada data yang diterima dari server';
      }

      setError(errorMessage);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDownloadDocumentRequest = async () => {
    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/visitors/${id}/document-request`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`,
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Response error:', errorText);
        throw new Error(`Failed to download document request: ${response.status} ${response.statusText}`);
      }

      const blob = await response.blob();
      const fileName = `tanda-terima-${visitor.name.replace(/\s+/g, '-')}-${id}.docx`;

      // Handle download
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      setMessage('Tanda terima dokumen berhasil diunduh!');
      setTimeout(() => setMessage(''), 3000);
    } catch (error) {
      console.error('❌ Error downloading document request:', error);
      setError(`Gagal mengunduh tanda terima dokumen: ${error.message}`);
      setTimeout(() => setError(''), 5000);
    }
  };

  const handleDirectDeleteVisitor = async () => {
    let deleteReason = null;

    // For non-admin users (receptionists), require a reason
    if (!isAdmin()) {
      const reasonResult = await confirm(
        'Please provide a reason for deleting this visitor record:',
        {
          title: 'Delete Visitor - Reason Required',
          type: 'input',
          inputPlaceholder: 'Enter reason for deletion (minimum 10 characters)...',
          inputValidator: (value) => {
            if (!value || value.trim().length < 10) {
              return 'Reason must be at least 10 characters';
            }
            return true;
          },
          showCancelButton: true,
          confirmText: 'Submit Deletion Request',
          cancelText: 'Cancel'
        }
      );

      if (!reasonResult.isConfirmed || !reasonResult.value) {
        return;
      }

      deleteReason = reasonResult.value.trim();
    } else {
      // For admin, just confirm deletion
      const confirmDelete = await confirm(
        `Are you sure you want to delete visitor "${visitor.name}"? This action cannot be undone.`,
        {
          title: 'Delete Visitor',
          type: 'warning',
          confirmText: 'Delete',
          confirmColor: 'danger'
        }
      );

      if (!confirmDelete) {
        return;
      }
    }

    try {
      setIsDeleting(true);
      setError('');

      const response = await visitorsAPI.delete(id, deleteReason);
      if (response && response.data && response.data.success) {
        const message = response.data.message;

        if (deleteReason) {
          // For receptionist - deletion request submitted
          setMessage(message);
          setTimeout(() => {
            navigate('/app/visitors', {
              state: {
                message: `Deletion request for "${visitor.name}" has been submitted for admin review.`,
                type: 'info'
              }
            });
          }, 2000);
        } else {
          // For admin - direct deletion
          setMessage('Visitor deleted successfully!');
          setTimeout(() => {
            navigate('/app/visitors', {
              state: {
                message: `Visitor "${visitor.name}" has been deleted successfully.`,
                type: 'success'
              }
            });
          }, 1500);
        }
      } else {
        setError(response?.data?.message || 'Failed to delete visitor');
      }
    } catch (error) {
      console.error('Delete error:', error);
      setError(error.response?.data?.message || 'Failed to delete visitor');
    } finally {
      setIsDeleting(false);
    }
  };


  // Handle delete action via modal
  const handleDeleteVisitorModal = async () => {
    try {
      const result = await confirm(
        `Apakah Anda yakin ingin menghapus data visitor "${visitor.name || visitor.full_name}"?`,
        {
          title: 'Hapus Data Visitor',
          confirmButtonText: 'Ya, Hapus',
          cancelButtonText: 'Batal',
          icon: 'warning'
        }
      );
      
      console.log('Delete confirmation result:', result);
      
      if (result) {
        setShowEditDeleteModal(true);
        console.log('Opening delete modal...');
      } else {
        console.log('Delete cancelled by user');
      }
    } catch (error) {
      console.error('Error showing delete confirmation:', error);
      // Fallback - directly show modal if confirmation fails
      setShowEditDeleteModal(true);
    }
  };

  // Handle inline edit toggle
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing
      setIsEditing(false);
      setEditFormData({});
    } else {
      // Start editing
      setIsEditing(true);
      setEditFormData({
        name: visitor.name || '',
        phone: visitor.phone || '',
        email: visitor.email || '',
        id_type: visitor.id_type || '',
        id_number: visitor.id_number || '',
        institution: visitor.institution || '',
        address: visitor.address || '',
        purpose: visitor.purpose || '',
        person_to_meet: visitor.person_to_meet || '',
        unit: visitor.unit || '',
        notes: visitor.notes || ''
      });
      // Reset custom inputs
      setCustomInputs({
        purpose: '',
        unit: '',
        person_to_meet: ''
      });
    }
  };

  // Handle custom input changes for "Lainnya" option
  const handleCustomInputChange = (field, value) => {
    setCustomInputs(prev => ({
      ...prev,
      [field]: value
    }));
  };

  // Handle dropdown selection with "Lainnya" support
  const handleDropdownChange = (field, value) => {
    setEditFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Reset custom input if not "Other"
    if (value !== 'Other') {
      setCustomInputs(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Handle inline edit save
  const handleSaveEdit = async () => {
    if (!editFormData.name || !editFormData.phone) {
      setError('Nama dan nomor telepon wajib diisi');
      setTimeout(() => setError(''), 3000);
      return;
    }

    setIsSaving(true);
    try {
      // Map frontend field names to backend expected field names
      const backendData = {
        full_name: editFormData.name || 'Unknown',
        phone_number: editFormData.phone || '00000000',
        institution: editFormData.institution || '',
        // Handle custom purpose
        purpose: editFormData.purpose === 'Other' && customInputs.purpose ? 
          `Other: ${customInputs.purpose}` : editFormData.purpose || 'General Visit',
        // Handle custom person to meet
        person_to_meet: editFormData.person_to_meet === 'Other' && customInputs.person_to_meet ? 
          `Other: ${customInputs.person_to_meet}` : editFormData.person_to_meet || 'Staff',
        // Handle custom unit (maps to location in backend)
        location: editFormData.unit === 'Other' && customInputs.unit ? 
          `Other: ${customInputs.unit}` : editFormData.unit || 'Main Office',
        notes: editFormData.notes || '',
        email: editFormData.email || '',
        address: editFormData.address || '',
        id_type: editFormData.id_type || '',
        id_number: editFormData.id_number || ''
      };

      const response = await visitorsAPI.update(visitor.id, backendData);
      if (response && response.data && response.data.success) {
        // Update local visitor data
        setVisitor(prev => ({ ...prev, ...editFormData }));

        // Add to edit history
        const historyEntry = {
          changes: backendData,
          original: {
            full_name: visitor.name || visitor.full_name,
            phone_number: visitor.phone || visitor.phone_number,
            institution: visitor.institution,
            purpose: visitor.purpose,
            person_to_meet: visitor.person_to_meet,
            location: visitor.unit || visitor.location,
            email: visitor.email,
            address: visitor.address
          }
        };
        
        // Save to API - NO fallback to localStorage
        const saveSuccess = await saveEditHistoryToAPI(visitor.id, historyEntry);
        
        if (saveSuccess) {
          // If API save successful, reload from API to get all history
          console.log('✅ Edit history saved to API successfully');
          await loadEditHistory();
        } else {
          // Show error if API save fails - NO localStorage fallback
          console.error('❌ Failed to save edit history to API');
          setError('Gagal menyimpan riwayat edit. Silakan coba lagi.');
          setTimeout(() => setError(''), 5000);
          setIsSaving(false);
          return; // Exit early, don't proceed with UI updates
        }

        setIsEditing(false);
        setEditFormData({});
        setMessage('Data visitor berhasil diperbarui!');
        setTimeout(() => setMessage(''), 3000);

        // Refresh data from server
        fetchVisitorDetail();
      }
    } catch (error) {
      console.error('Error updating visitor:', error);
      setError('Gagal memperbarui data visitor');
      setTimeout(() => setError(''), 3000);
    } finally {
      setIsSaving(false);
    }
  };

  // Handle delete action with SweetAlert confirmation
  const handleDeleteVisitorConfirm = async () => {
    const result = await confirm(
      `Apakah Anda yakin ingin menghapus data visitor "${visitor.name || visitor.full_name}"?`,
      {
        title: 'Hapus Data Visitor',
        type: 'warning',
        html: `
          <div style="text-align: left; margin-top: 15px;">
            <p><strong>Visitor:</strong> ${visitor.name || visitor.full_name}</p>
            <p><strong>Institusi:</strong> ${visitor.institution}</p>
            <p><strong>Telepon:</strong> ${visitor.phone || visitor.phone_number}</p>
          </div>
          <div style="background-color: #fff3cd; padding: 12px; border-radius: 6px; margin-top: 15px;">
            <small><strong>Catatan:</strong> Data akan dikirim sebagai permintaan hapus untuk persetujuan admin.</small>
          </div>
        `,
        confirmText: 'Ya, Hapus',
        cancelText: 'Batal',
        confirmColor: 'danger'
      }
    );

    if (result) {
      setShowEditDeleteModal(true);
    }
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      if (!visitor || !visitor.id) {
        setError('Visitor data not available. Please refresh the page.');
        return;
      }

      const response = await feedbackAPI.create({
        visitor_id: visitor.id,
        visitor_name: visitor.full_name || visitor.name,
        ...feedbackData
      });

      if (response && response.success) {
        // Mark modal as closing
        setIsModalClosing(true);

        // Show success message immediately
        setMessage('Thank you for your feedback!');

        // Close the modal and navigate after a short delay
        setTimeout(() => {
          setShowFeedbackModal(false);
          setIsModalClosing(false);

          // Navigate to dashboard after modal closes
          setTimeout(() => {
            navigate('/app/dashboard', {
              state: {
                message: 'Visitor checked out successfully! Thank you for the feedback.',
                type: 'success'
              }
            });
          }, 300);
        }, 1000);
      } else {
        throw new Error(response?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      setError('Failed to submit feedback. Please try again.');

      // Mark modal as closing
      setIsModalClosing(true);

      // Close modal and navigate even if feedback submission fails
      setTimeout(() => {
        setShowFeedbackModal(false);
        setIsModalClosing(false);

        setTimeout(() => {
          navigate('/app/dashboard', {
            state: {
              message: 'Visitor checked out successfully!',
              type: 'success'
            }
          });
        }, 300);
      }, 2000);
    }
  };

  const handleFeedbackClose = () => {
    if (!isModalClosing) {
      setIsModalClosing(true);
      setShowFeedbackModal(false);

      // Navigate back to dashboard instead of visitors page
      setTimeout(() => {
        setIsModalClosing(false);
        navigate('/app/dashboard', {
          state: {
            message: 'Visitor checked out successfully!',
            type: 'success'
          }
        });
      }, 300);
    }
  };

  // Styles
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px',
    overflow: 'hidden'
  };

  const cardHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #dee2e6'
  };

  const cardBodyStyle = {
    padding: '24px'
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
    transition: 'background-color 0.2s ease',
    textDecoration: 'none'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '4px'
  };

  const valueStyle = {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500'
  };

  if (isLoading) {
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
            <p style={{ color: '#6c757d', fontSize: '16px' }}>Memuat detail pengunjung...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !visitor) {
    return (
      <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
        <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #f5c6cb'
          }}>
            {error || 'Pengunjung tidak ditemukan'}
          </div>
          <button
            onClick={() => navigate('/app/visitors')}
            style={{
              ...buttonStyle,
              backgroundColor: '#6c757d',
              color: 'white'
            }}
          >
            <ArrowLeft size={16} />
            Kembali ke Daftar Pengunjung
          </button>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh', position: 'relative' }}>
      {/* Deletion Status Overlay */}
      {deletionStatus.hasPendingDeletion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(220, 53, 69, 0.1)',
          zIndex: 998,
          pointerEvents: 'none'
        }}>
          <div style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%) rotate(-45deg)',
            fontSize: '80px',
            fontWeight: 'bold',
            color: 'rgba(220, 53, 69, 0.15)',
            userSelect: 'none',
            whiteSpace: 'nowrap'
          }}>
            USULAN PENGHAPUSAN DATA
          </div>
        </div>
      )}
      
      {/* Deletion Status Banner */}
      {deletionStatus.hasPendingDeletion && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          backgroundColor: '#721c24',
          color: 'white',
          padding: '12px 24px',
          zIndex: 999,
          textAlign: 'center',
          fontSize: '14px',
          fontWeight: '600',
          boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
            <AlertTriangle size={16} />
            DATA VISITOR INI SEDANG DALAM USULAN PENGHAPUSAN
            {deletionStatus.deletionRequest && (
              <span style={{ fontWeight: '400', marginLeft: '8px' }}>
                (Diajukan oleh: {deletionStatus.deletionRequest.requested_by_name || 'User tidak diketahui'} pada {new Date(deletionStatus.deletionRequest.created_at).toLocaleDateString('id-ID')})
              </span>
            )}
          </div>
        </div>
      )}

      <div style={{ 
        maxWidth: '1200px', 
        margin: '0 auto',
        marginTop: deletionStatus.hasPendingDeletion ? '60px' : '0'
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'flex-start',
          marginBottom: '24px',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          <div>
            <button
              onClick={() => navigate('/app/visitors')}
              style={{
                background: 'none',
                border: 'none',
                color: '#6c757d',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                marginBottom: '8px',
                padding: '4px 0'
              }}
            >
              <ArrowLeft size={16} />
              Back to Visitors
            </button>
            <h1 style={{
              fontSize: '28px',
              fontWeight: '600',
              color: '#495057',
              margin: '0 0 8px 0'
            }}>
              Visitor Details
            </h1>
            <p style={{
              color: '#6c757d',
              margin: '0',
              fontSize: '16px'
            }}>
              View detailed information about {visitor.name}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', alignItems: 'center' }}>
            {/* Download Report Button */}
            <button
              onClick={handleDownloadReport}
              style={{
                ...buttonStyle,
                backgroundColor: '#198754',
                color: 'white'
              }}
            >
              <Download size={16} />
              Download Report
            </button>

            {/* Download Tanda Terima Button - Show if visitor requested document (regardless of checkout status) */}
            {visitor &&
              (visitor.request_document == 1 ||
               visitor.request_document === true ||
               (visitor.purpose && visitor.purpose.toLowerCase().includes('permintaan dokumen'))) && (
              <button
                onClick={handleDownloadDocumentRequest}
                style={{
                  ...buttonStyle,
                  backgroundColor: '#237e95ff',
                  color: 'white'
                }}
                title="Download Tanda Terima Dokumen"
              >
                <FileCheck size={16} />
                Download Tanda Terima
              </button>
            )}

            {/* Edit Button */}
            <button
              onClick={handleEditToggle}
              disabled={isSaving || deletionStatus.hasPendingDeletion}
              style={{
                ...buttonStyle,
                backgroundColor: (isSaving || deletionStatus.hasPendingDeletion) ? '#6c757d' : (isEditing ? '#28a745' : '#0d6efd'),
                color: 'white',
                cursor: (isSaving || deletionStatus.hasPendingDeletion) ? 'not-allowed' : 'pointer',
                opacity: (isSaving || deletionStatus.hasPendingDeletion) ? 0.6 : 1
              }}
              title={
                deletionStatus.hasPendingDeletion 
                  ? 'Data tidak dapat diedit karena sedang dalam usulan penghapusan'
                  : (isEditing ? 'Batal edit data' : 'Edit data visitor')
              }
            >
              <Edit size={16} />
              {isEditing ? 'Batal Edit' : 'Edit Data'}
            </button>

            {/* Save Button - only show when editing */}
            {isEditing && (
              <button
                onClick={handleSaveEdit}
                disabled={isSaving}
                style={{
                  ...buttonStyle,
                  backgroundColor: isSaving ? '#6c757d' : '#28a745',
                  color: 'white',
                  cursor: isSaving ? 'not-allowed' : 'pointer',
                  opacity: isSaving ? 0.6 : 1
                }}
                title="Simpan perubahan data"
              >
                {isSaving ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Menyimpan...
                  </>
                ) : (
                  <>
                    <Save size={16} />
                    Simpan
                  </>
                )}
              </button>
            )}

            {/* Delete Button */}
            <button
              onClick={() => setShowDeletionRequestModal(true)}
              disabled={isEditing}
              style={{
                ...buttonStyle,
                backgroundColor: isEditing ? '#6c757d' : '#dc3545',
                color: 'white',
                cursor: isEditing ? 'not-allowed' : 'pointer',
                opacity: isEditing ? 0.6 : 1
              }}
              title="Hapus data visitor ini"
            >
              <Trash2 size={16} />
              Delete Data
            </button>

            {!visitor?.check_out_time && (
              <button
                onClick={handleCheckOut}
                disabled={isCheckingOut}
                style={{
                  ...buttonStyle,
                  backgroundColor: isCheckingOut ? '#6c757d' : '#ff6b35',
                  color: 'white',
                  cursor: isCheckingOut ? 'not-allowed' : 'pointer',
                  opacity: isCheckingOut ? 0.6 : 1
                }}
              >
                {isCheckingOut ? (
                  <>
                    <div style={{
                      width: '16px',
                      height: '16px',
                      border: '2px solid transparent',
                      borderTop: '2px solid white',
                      borderRadius: '50%',
                      animation: 'spin 1s linear infinite'
                    }}></div>
                    Checking Out...
                  </>
                ) : (
                  <>
                    <UserX size={16} />
                    Check Out
                  </>
                )}
              </button>
            )}
          </div>
        </div>

        {/* Messages */}
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

        {error && (
          <div style={{
            backgroundColor: '#f8d7da',
            color: '#721c24',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: '1px solid #f5c6cb'
          }}>
            {error}
          </div>
        )}

        <div style={{
          display: 'grid',
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '350px 1fr',
          gap: '24px'
        }}>
          {/* Left Column - Photo & Status */}
          <div>
            {/* Visitor Photo & Status */}
            <div style={cardStyle}>
              <div style={cardBodyStyle}>
                <div style={{ textAlign: 'center' }}>
                  <SafeImage
                    src={getVisitorPhotoUrl(visitor)}
                    alt={visitor.name}
                    fallbackText={visitor.name}
                    style={{
                      width: '150px',
                      height: '150px',
                      borderRadius: '50%',
                      objectFit: 'cover',
                      margin: '0 auto 20px',
                      border: '4px solid #dee2e6'
                    }}
                  />

                  <h2 style={{
                    fontSize: '24px',
                    fontWeight: '600',
                    color: '#495057',
                    margin: '0 0 16px 0'
                  }}>
                    {visitor.name}
                  </h2>
                    {visitor.check_out_time ? (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: '#d1e7dd',
                        color: '#0f5132',
                        marginBottom: '12px'
                      }}>
                        <CheckCircle style={{ width: '16px', height: '16px' }} />
                        Checked Out
                      </span>
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        lineHeight: '1.4'
                      }}>
                        <div>Check-in: {formatDateTime(visitor.check_in_time)}</div>
                        <div>Check-out: {formatDateTime(visitor.check_out_time)}</div>
                      </div>
                    </div>
                  ) : (
                    <div style={{ textAlign: 'center', marginTop: '16px' }}>
                      <span style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        borderRadius: '20px',
                        fontSize: '14px',
                        fontWeight: '500',
                        backgroundColor: '#ffe0b2',
                        color: '#e65100',
                        marginBottom: '12px'
                      }}>
                        <Eye style={{ width: '16px', height: '16px' }} />
                        Active Visit
                      </span>
                      <div style={{
                        fontSize: '12px',
                        color: '#6c757d',
                        lineHeight: '1.4'
                      }}>
                        Check-in: {formatDateTime(visitor.check_in_time)}
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
            {/* Operator Information Section */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0 }}>
                  <User size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Informasi Operator
                </h3>
              </div>
              <div style={cardBodyStyle}>
                {/* Check-in Operator */}
                <div style={{ marginBottom: '20px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '8px' }}>
                  <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495752ff', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <CheckCircle size={16} style={{ color: '#28a745' }} />
                    Operator Check-in
                  </h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div>
                      <span style={labelStyle}>Nama Operator</span>
                      <p style={valueStyle}>{visitor.input_by_name || 'Tidak ada data'}</p>
                    </div>
                    {/* <div>
                      <span style={labelStyle}>Role</span>
                      <p style={valueStyle}>{visitor.input_by_role || visitor.operator_role || visitor.input_user_role || 'Tidak ada data'}</p>
                    </div> */}
                    {/* <div>
                      <span style={labelStyle}>Email</span>
                      <p style={valueStyle}>{visitor.input_by_email || visitor.operator_email || visitor.input_user_email || 'Tidak ada data'}</p>
                    </div> */}
                    <div>
                      <span style={labelStyle}>Waktu Check-in</span>
                      <p style={valueStyle}>{visitor.check_in_time ? formatDateTime(visitor.check_in_time) : 'Tidak ada data'}</p>
                    </div>
                  </div>
                </div>

                {/* Check-out Operator */}
                {visitor.check_out_time && (
                  <div style={{ padding: '16px', backgroundColor: '#fff3cd', borderRadius: '8px' }}>
                    <h4 style={{ fontSize: '14px', fontWeight: '600', color: '#495057', margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <XCircle size={16} style={{ color: '#e65100' }} />
                      Operator Check-out
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                      <div>
                        <span style={labelStyle}>Nama Operator</span>
                        <p style={valueStyle}>{visitor.checkout_by_name || 'Tidak ada data'}</p>
                      </div>
                      {/* <div>
                        <span style={labelStyle}>Role</span>
                        <p style={valueStyle}>{visitor.checkout_by_role || visitor.checkout_user_role || 'Tidak ada data'}</p>
                      </div> */}
                      {/* <div>
                        <span style={labelStyle}>Email</span>
                        <p style={valueStyle}>{visitor.checkout_by_email || visitor.checkout_user_email || 'Tidak ada data'}</p>
                      </div> */}
                      <div>
                        <span style={labelStyle}>Waktu Check-out</span>
                        <p style={valueStyle}>{visitor.check_out_time ? formatDateTime(visitor.check_out_time) : 'Tidak ada data'}</p>
                      </div>
                    </div>
                  </div>
                )}

                {/* No checkout operator info if not checked out */}
                {!visitor.check_out_time && (
                  <div style={{ padding: '16px', backgroundColor: '#e2e3e5', borderRadius: '8px', textAlign: 'center' }}>
                    <p style={{ color: '#69fe82ff', margin: 0, fontSize: '14px' }}>
                      <Clock size={16} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                      Visitor belum check-out
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Right Column - Visitor Details */}
          <div>
            {/* Personal Information */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0 }}>
                  <User size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Informasi Pribadi
                </h3>
              </div>
              <div style={cardBodyStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Nama Lengkap</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.name}
                        onChange={(e) => setEditFormData({ ...editFormData, name: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      />
                    ) : (
                      <p style={valueStyle}>{visitor.name}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>No. Telepon</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.phone}
                        onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      />
                    ) : (
                      <p style={valueStyle}>
                        {visitor.phone || visitor.phone_number || 'Tidak ada data'}
                        {visitor.phone_number && visitor.phone_number_verified && (
                          <CheckCircle size={14} color="#28a745" style={{ marginLeft: '4px', verticalAlign: 'middle' }} title="Verified" />
                        )}
                        {visitor.phone_number && !visitor.phone_number_verified && (
                          <AlertTriangle size={14} color="#ffc107" style={{ marginLeft: '4px', verticalAlign: 'middle' }} title="Unverified" />
                        )}
                      </p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Email</span>
                    {isEditing ? (
                      <input
                        type="email"
                        value={editFormData.email}
                        onChange={(e) => setEditFormData({ ...editFormData, email: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      />
                    ) : (
                      <p style={valueStyle}>{visitor.email || 'Tidak ada data'}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Jenis Identitas</span>
                    {isEditing ? (
                      <select
                        value={editFormData.id_type || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, id_type: e.target.value })}
                        style={{ 
                          ...valueStyle, 
                          width: '100%', 
                          padding: '8px', 
                          borderRadius: '4px', 
                          border: '1px solid #ced4da',
                          backgroundColor: 'white',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="">Pilih Jenis Identitas</option>
                        <option value="KTP">KTP</option>
                        <option value="SIM">SIM</option>
                        <option value="Passport">Passport</option>
                        <option value="Kartu Pelajar">Kartu Pelajar</option>
                        <option value="Kartu Mahasiswa">Kartu Mahasiswa</option>
                        <option value="Lainnya">Lainnya</option>
                      </select>
                    ) : (
                      <p style={valueStyle}>{visitor.id_type || 'Tidak ada data'}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Nomor Identitas</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.id_number || ''}
                        onChange={(e) => setEditFormData({ ...editFormData, id_number: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                        placeholder="Masukkan nomor identitas"
                      />
                    ) : (
                      <p style={valueStyle}>{visitor.id_number || 'Tidak ada data'}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Institusi</span>
                    {isEditing ? (
                      <input
                        type="text"
                        value={editFormData.institution}
                        onChange={(e) => setEditFormData({ ...editFormData, institution: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da' }}
                      />
                    ) : (
                      <p style={valueStyle}>{formatCustomInput(visitor.institution)}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Alamat</span>
                    {isEditing ? (
                      <textarea
                        value={editFormData.address}
                        onChange={(e) => setEditFormData({ ...editFormData, address: e.target.value })}
                        style={{ ...valueStyle, width: '100%', padding: '8px', borderRadius: '4px', border: '1px solid #ced4da', minHeight: '60px' }}
                      />
                    ) : (
                      <p style={valueStyle}>{visitor.address || 'Tidak ada data'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Visit Details */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0 }}>
                  <Calendar size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Detail Kunjungan
                </h3>
              </div>
              <div style={cardBodyStyle}>
                <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Tujuan Kunjungan</span>
                    {isEditing ? (
                      <>
                        <select
                          value={editFormData.purpose}
                          onChange={(e) => handleDropdownChange('purpose', e.target.value)}
                          style={{ 
                            ...valueStyle, 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '4px', 
                            border: '1px solid #ced4da',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                          disabled={isLoadingConfigurations}
                        >
                          <option value="">Pilih Tujuan Kunjungan</option>
                          {configurations.purposes.map((purpose) => (
                            <option key={purpose.id} value={purpose.value}>
                              {purpose.name}
                            </option>
                          ))}
                          <option value="Other">Lainnya</option>
                        </select>
                        {editFormData.purpose === 'Other' && (
                          <input
                            type="text"
                            placeholder="Masukkan tujuan kunjungan..."
                            value={customInputs.purpose}
                            onChange={(e) => handleCustomInputChange('purpose', e.target.value)}
                            style={{
                              ...valueStyle,
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ced4da',
                              marginTop: '8px'
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <p style={valueStyle}>{formatCustomInput(visitor.purpose)}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Bertemu Dengan</span>
                    {isEditing ? (
                      <>
                        <select
                          value={editFormData.person_to_meet}
                          onChange={(e) => handleDropdownChange('person_to_meet', e.target.value)}
                          style={{ 
                            ...valueStyle, 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '4px', 
                            border: '1px solid #ced4da',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                          disabled={isLoadingConfigurations}
                        >
                          <option value="">Pilih Orang yang Ditemui</option>
                          {configurations.personToMeet.map((person) => (
                            <option key={person.id} value={person.value}>
                              {person.name}
                            </option>
                          ))}
                          <option value="Other">Lainnya</option>
                        </select>
                        {editFormData.person_to_meet === 'Other' && (
                          <input
                            type="text"
                            placeholder="Masukkan nama orang yang ditemui..."
                            value={customInputs.person_to_meet}
                            onChange={(e) => handleCustomInputChange('person_to_meet', e.target.value)}
                            style={{
                              ...valueStyle,
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ced4da',
                              marginTop: '8px'
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <p style={valueStyle}>{formatCustomInput(visitor.person_to_meet)}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Unit/Departemen</span>
                    {isEditing ? (
                      <>
                        <select
                          value={editFormData.unit}
                          onChange={(e) => handleDropdownChange('unit', e.target.value)}
                          style={{ 
                            ...valueStyle, 
                            width: '100%', 
                            padding: '8px', 
                            borderRadius: '4px', 
                            border: '1px solid #ced4da',
                            backgroundColor: 'white',
                            cursor: 'pointer'
                          }}
                          disabled={isLoadingConfigurations}
                        >
                          <option value="">Pilih Unit/Departemen</option>
                          {configurations.units.map((unit) => (
                            <option key={unit.id} value={unit.value}>
                              {unit.name}
                            </option>
                          ))}
                          <option value="Other">Lainnya</option>
                        </select>
                        {editFormData.unit === 'Other' && (
                          <input
                            type="text"
                            placeholder="Masukkan nama unit/departemen..."
                            value={customInputs.unit}
                            onChange={(e) => handleCustomInputChange('unit', e.target.value)}
                            style={{
                              ...valueStyle,
                              width: '100%',
                              padding: '8px',
                              borderRadius: '4px',
                              border: '1px solid #ced4da',
                              marginTop: '8px'
                            }}
                          />
                        )}
                      </>
                    ) : (
                      <p style={valueStyle}>{formatCustomInput(visitor.unit || visitor.location)}</p>
                    )}
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Waktu Check-in</span>
                    <p style={valueStyle}>
                      {visitor.check_in_time ? formatDateTime(visitor.check_in_time) : '-'}
                    </p>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Waktu Check-out</span>
                    <p style={valueStyle}>
                      {visitor.check_out_time ? formatDateTime(visitor.check_out_time) : 'Belum Check-out'}
                    </p>
                  </div>
                  <div style={{ marginBottom: '8px' }}>
                    <span style={labelStyle}>Catatan</span>
                    {isEditing ? (
                      <textarea
                        value={editFormData.notes || ''}
                        onChange={(e) => setEditFormData(prev => ({ ...prev, notes: e.target.value }))}
                        rows={3}
                        style={{ width: '100%', padding: '8px 12px', border: '1px solid #dee2e6', borderRadius: '4px', fontSize: '14px', resize: 'vertical' }}
                      />
                    ) : (
                      <p style={valueStyle}>{visitor.notes || 'Tidak ada catatan'}</p>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Document Request Details Section */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0 }}>
                  <FileText size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Detail Permintaan Dokumen
                </h3>
              </div>
              <div style={cardBodyStyle}>
                {visitor?.request_document || visitor?.document_type || visitor?.document_name ? (
                  <div style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '1fr 1fr', gap: '20px' }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={labelStyle}>Status Permintaan</span>
                      <p style={{
                        ...valueStyle,
                        color: visitor?.request_document ? '#28a745' : '#6c757d',
                        fontWeight: '600'
                      }}>
                        {visitor?.request_document ? 'Ada Permintaan Dokumen' : 'Tidak Ada Permintaan'}
                      </p>
                    </div>

                    {visitor?.request_document && (
                      <>
                        <div style={{ marginBottom: '8px' }}>
                          <span style={labelStyle}>Tipe Dokumen</span>
                          <p style={valueStyle}>{visitor?.document_type || 'Tidak ada data'}</p>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <span style={labelStyle}>Nama Dokumen</span>
                          <p style={valueStyle}>{visitor?.document_name || 'Tidak ada data'}</p>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <span style={labelStyle}>Nomor Dokumen</span>
                          <p style={valueStyle}>{visitor?.document_number || 'Tidak ada data'}</p>
                        </div>

                        <div style={{ marginBottom: '8px', gridColumn: 'span 2' }}>
                          <span style={labelStyle}>Detail Permintaan</span>
                          <p style={valueStyle}>{visitor?.document_details || 'Tidak ada detail tambahan'}</p>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <span style={labelStyle}>Tanggal Permintaan</span>
                          <p style={valueStyle}>
                            {visitor?.check_out_time ? formatDateTime(visitor.check_out_time) : 'Belum checkout'}
                          </p>
                        </div>

                        <div style={{ marginBottom: '8px' }}>
                          <span style={labelStyle}>Status Pemrosesan</span>
                          <span style={{
                            display: 'inline-block',
                            padding: '4px 12px',
                            borderRadius: '20px',
                            fontSize: '12px',
                            fontWeight: '600',
                            backgroundColor: visitor?.document_status === 'completed' ? '#d1edcc' : 
                                           visitor?.document_status === 'processing' ? '#fff3cd' : '#f8d7da',
                            color: visitor?.document_status === 'completed' ? '#155724' : 
                                   visitor?.document_status === 'processing' ? '#856404' : '#721c24'
                          }}>
                            {visitor?.document_status === 'completed' ? 'Selesai' :
                             visitor?.document_status === 'processing' ? 'Dalam Proses' : 
                             visitor?.document_status === 'pending' ? 'Menunggu' : 'Baru'}
                          </span>
                        </div>
                      </>
                    )}
                  </div>
                ) : (
                  <div style={{ 
                    textAlign: 'center', 
                    padding: '40px 20px',
                    color: '#6c757d'
                  }}>
                    <FileText size={48} style={{ color: '#dee2e6', marginBottom: '16px' }} />
                    <p style={{ fontSize: '16px', fontWeight: '500', margin: '0 0 8px 0' }}>
                      Tidak ada permintaan dokumen
                    </p>
                    <p style={{ fontSize: '14px', margin: 0 }}>
                      Visitor ini tidak meminta pemrosesan dokumen saat check-out
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Edit History - Always show if there's any history */}
            <div style={cardStyle}>
              <div style={cardHeaderStyle}>
                <h3 style={{ fontSize: '18px', fontWeight: '600', color: '#495057', margin: 0 }}>
                  <Clock size={20} style={{ verticalAlign: 'middle', marginRight: '8px' }} />
                  Riwayat Perubahan Data
                </h3>
              </div>
              <div style={cardBodyStyle}>
                {editHistory.length > 0 ? (
                  editHistory.map(entry => (
                    <div key={entry.id} style={{ marginBottom: '12px', paddingBottom: '12px', borderBottom: '1px solid #eee' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                        <p style={{ fontSize: '14px', color: '#495057', margin: 0 }}>
                          Pada {formatDateTime(entry.timestamp)} oleh <strong>{entry.user}</strong>
                        </p>
                        {entry.user_role && (
                          <span style={{
                            fontSize: '12px',
                            padding: '2px 8px',
                            borderRadius: '12px',
                            backgroundColor: entry.user_role === 'Admin' ? '#dc3545' : '#0d6efd',
                            color: 'white',
                            fontWeight: '500'
                          }}>
                            {entry.user_role}
                          </span>
                        )}
                      </div>
                      <ul style={{ margin: 0, paddingLeft: '20px', fontSize: '13px', color: '#6c757d' }}>
                        {Object.entries(entry.changes).map(([key, value]) => {
                          const originalValue = entry.original[key];
                          if (value !== originalValue) {
                            const fieldNames = {
                              name: 'Nama',
                              phone: 'Telepon',
                              email: 'Email',
                              institution: 'Institusi',
                              purpose: 'Tujuan Kunjungan',
                              person_to_meet: 'Bertemu Dengan',
                              unit: 'Unit/Departemen',
                              address: 'Alamat',
                              notes: 'Catatan'
                            };
                            return (
                              <li key={key}>
                                <strong>{fieldNames[key] || key}:</strong> Dari "{originalValue || 'kosong'}" menjadi "{value || 'kosong'}"
                              </li>
                            );
                          }
                          return null;
                        })}
                      </ul>
                    </div>
                  ))
                ) : (
                  <div style={{ textAlign: 'center', padding: '20px', color: '#6c757d' }}>
                    <Clock size={24} style={{ marginBottom: '8px', opacity: 0.5 }} />
                    <p style={{ margin: 0, fontSize: '14px' }}>Belum ada riwayat perubahan data</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Feedback Modal */}
      {showFeedbackModal && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          visitorId={visitor.id}
          visitorName={visitor.name}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
          isClosing={isModalClosing}
        />
      )}
      
      {/* Debug Info */}
      {process.env.NODE_ENV === 'development' && (
        <div style={{
          position: 'fixed',
          top: '10px',
          right: '10px',
          background: 'rgba(0,0,0,0.8)',
          color: 'white',
          padding: '10px',
          borderRadius: '5px',
          fontSize: '12px',
          zIndex: 9999
        }}>
          showFeedbackModal: {showFeedbackModal ? 'true' : 'false'}
        </div>
      )}

      {/* Deletion Request Modal */}
      <DeletionRequestModal
        isOpen={showDeletionRequestModal}
        onClose={() => setShowDeletionRequestModal(false)}
        visitor={visitor}
        currentUser={currentUser}
        onSuccess={(message) => {
          setMessage(message);
          setTimeout(() => setMessage(''), 5000);
        }}
      />

      {/* Document Processing Modal */}
      {showDocumentModal && (
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
            padding: '32px',
            maxWidth: '500px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto',
            boxShadow: '0 20px 40px rgba(0, 0, 0, 0.3)'
          }}>
            <h3 style={{
              fontSize: '24px',
              fontWeight: '700',
              color: '#495057',
              margin: '0 0 24px 0',
              textAlign: 'center'
            }}>
              Check-out Visitor
            </h3>
            
            <div style={{
              backgroundColor: '#f8f9fa',
              padding: '20px',
              borderRadius: '8px',
              marginBottom: '24px'
            }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#495057', margin: '0 0 12px 0' }}>
                Informasi Visitor
              </h4>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>
                <strong>Nama:</strong> {visitor?.name || visitor?.full_name}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>
                <strong>Institusi:</strong> {visitor?.institution}
              </p>
              <p style={{ margin: '4px 0', fontSize: '14px', color: '#6c757d' }}>
                <strong>Check-in:</strong> {visitor?.check_in_time ? formatDateTime(visitor.check_in_time) : '-'}
              </p>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ fontSize: '16px', fontWeight: '600', color: '#495057', margin: '0 0 16px 0' }}>
                Detail Permintaan Dokumen
              </h4>
              
              <div style={{ marginBottom: '16px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  <input
                    type="checkbox"
                    checked={documentData.requestDocument}
                    onChange={(e) => setDocumentData(prev => ({
                      ...prev,
                      requestDocument: e.target.checked,
                      documentType: e.target.checked ? prev.documentType : '',
                      customDocumentType: e.target.checked ? prev.customDocumentType : '',
                      documentName: e.target.checked ? prev.documentName : '',
                      documentNumber: e.target.checked ? prev.documentNumber : '',
                      documentDetails: e.target.checked ? prev.documentDetails : ''
                    }))}
                    style={{ width: '16px', height: '16px' }}
                  />
                  Visitor meminta pemrosesan dokumen
                </label>
              </div>

              {documentData.requestDocument && (
                <>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#495057',
                      marginBottom: '6px'
                    }}>
                      Tipe Dokumen *
                    </label>
                    <select
                      value={documentData.documentType}
                      onChange={(e) => setDocumentData(prev => ({ 
                        ...prev, 
                        documentType: e.target.value,
                        customDocumentType: e.target.value !== 'Lainnya' ? '' : prev.customDocumentType
                      }))}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px',
                        backgroundColor: 'white'
                      }}
                      required
                    >
                      <option value="">Pilih tipe dokumen</option>
                      {documentTypes.map(type => (
                        <option key={type} value={type}>{type}</option>
                      ))}
                    </select>
                  </div>

                  {documentData.documentType === 'Lainnya' && (
                    <div style={{ marginBottom: '16px' }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '14px', 
                        fontWeight: '500', 
                        color: '#495057',
                        marginBottom: '6px'
                      }}>
                        Dokumen Lainnya *
                      </label>
                      <input
                        type="text"
                        value={documentData.customDocumentType}
                        onChange={(e) => setDocumentData(prev => ({ ...prev, customDocumentType: e.target.value }))}
                        placeholder="Sebutkan jenis dokumen lainnya..."
                        style={{
                          width: '100%',
                          padding: '10px 12px',
                          border: '1px solid #ced4da',
                          borderRadius: '6px',
                          fontSize: '14px'
                        }}
                        required
                      />
                    </div>
                  )}

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#495057',
                      marginBottom: '6px'
                    }}>
                      Nama Dokumen *
                    </label>
                    <input
                      type="text"
                      value={documentData.documentName}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, documentName: e.target.value }))}
                      placeholder="Contoh: SK-CPT A.N Enjang Suherlan"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#495057',
                      marginBottom: '6px'
                    }}>
                      Nomor Dokumen *
                    </label>
                    <input
                      type="text"
                      value={documentData.documentNumber}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, documentNumber: e.target.value }))}
                      placeholder="Contoh: qkwpeoopqwiepoiqweop"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px'
                      }}
                      required
                    />
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '14px', 
                      fontWeight: '500', 
                      color: '#495057',
                      marginBottom: '6px'
                    }}>
                      Detail Permintaan Dokumen
                    </label>
                    <textarea
                      value={documentData.documentDetails}
                      onChange={(e) => setDocumentData(prev => ({ ...prev, documentDetails: e.target.value }))}
                      placeholder="Jelaskan detail tambahan atau catatan khusus untuk permintaan dokumen..."
                      rows={3}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #ced4da',
                        borderRadius: '6px',
                        fontSize: '14px',
                        resize: 'vertical'
                      }}
                    />
                  </div>
                </>
              )}
            </div>

            <div style={{
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowDocumentModal(false)}
                style={{
                  padding: '10px 20px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: 'pointer'
                }}
              >
                Batal
              </button>
              <button
                onClick={proceedWithCheckout}
                disabled={documentData.requestDocument && (
                  !documentData.documentType || 
                  (documentData.documentType === 'Lainnya' && !documentData.customDocumentType) ||
                  !documentData.documentName ||
                  !documentData.documentNumber
                )}
                style={{
                  padding: '10px 20px',
                  backgroundColor: documentData.requestDocument && (
                    !documentData.documentType || 
                    (documentData.documentType === 'Lainnya' && !documentData.customDocumentType) ||
                    !documentData.documentName ||
                    !documentData.documentNumber
                  ) ? '#6c757d' : '#ff6b35',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  fontSize: '14px',
                  fontWeight: '500',
                  cursor: documentData.requestDocument && (
                    !documentData.documentType || 
                    (documentData.documentType === 'Lainnya' && !documentData.customDocumentType) ||
                    !documentData.documentName ||
                    !documentData.documentNumber
                  ) ? 'not-allowed' : 'pointer',
                  opacity: documentData.requestDocument && (
                    !documentData.documentType || 
                    (documentData.documentType === 'Lainnya' && !documentData.customDocumentType) ||
                    !documentData.documentName ||
                    !documentData.documentNumber
                  ) ? 0.6 : 1
                }}
              >
                Lanjutkan Check-out
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}