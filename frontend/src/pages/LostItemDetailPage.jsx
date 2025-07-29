import { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Webcam from 'react-webcam';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Package, 
  ArrowLeft,
  Calendar,
  MapPin,
  User,
  Phone,
  FileText,
  Download,
  Edit3,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Camera,
  Hash,
  Tag,
  Users,
  Building,
  Trash2,
  RotateCcw,
  X,
  Save,
  Eraser,
  Upload,
  Undo2
} from 'lucide-react';
import { formatDateTime } from '../utils/index.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

// CSS untuk kalibrasi signature canvas dan animasi
const signatureCanvasStyles = `
  .signature-canvas {
    touch-action: none;
    cursor: crosshair;
  }
  .signature-canvas canvas {
    display: block;
    margin: 0 auto;
  }
  @keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
  }
`;

// Inject CSS styles
const styleSheet = document.createElement("style");
styleSheet.type = "text/css";
styleSheet.innerText = signatureCanvasStyles;
if (!document.head.querySelector('style[data-signature-canvas]')) {
  styleSheet.setAttribute('data-signature-canvas', 'true');
  document.head.appendChild(styleSheet);
}

export function LostItemDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { alert } = useGlobalAlert();
  const { user } = useAuth();
  const webcamRef = useRef(null);
  const signatureRef = useRef(null);

  // Fungsi untuk kalibrasi signature canvas
  const calibrateSignatureCanvas = () => {
    if (signatureRef.current) {
      const canvas = signatureRef.current.getCanvas();
      const rect = canvas.getBoundingClientRect();
      const scaleX = canvas.width / rect.width;
      const scaleY = canvas.height / rect.height;
      
      // Set canvas scale untuk kalibrasi yang tepat
      canvas.style.width = rect.width + 'px';
      canvas.style.height = rect.height + 'px';
      
      // Force canvas resize untuk kalkulasi yang tepat
      setTimeout(() => {
        signatureRef.current.resizeCanvas();
      }, 100);
    }
  };

  // Fungsi untuk flip gambar kembali ke normal setelah capture dari mirror webcam
  const flipImageHorizontally = (imageSrc) => {
    return new Promise((resolve) => {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const img = new Image();
      
      img.onload = () => {
        canvas.width = img.width;
        canvas.height = img.height;
        
        // Flip horizontal
        ctx.scale(-1, 1);
        ctx.drawImage(img, -img.width, 0);
        
        resolve(canvas.toDataURL('image/jpeg', 0.8));
      };
      
      img.src = imageSrc;
    });
  };
  const [item, setItem] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [changeHistory, setChangeHistory] = useState([]);
  const [tempEditValues, setTempEditValues] = useState({});
  const [returnForm, setReturnForm] = useState({
    claimer_name: '',
    claimer_contact: '',
    claimer_id_number: '',
    relationship_to_owner: 'owner',
    return_notes: '',
    return_photo: null,
    return_signature: null
  });
  const [returnPhoto, setReturnPhoto] = useState(null);
  const [returnSignature, setReturnSignature] = useState(null);

  useEffect(() => {
    if (id) {
      fetchItemDetail();
      fetchItemHistory();
    }
  }, [id]);

  // Kalibrasi signature canvas saat modal signature terbuka
  useEffect(() => {
    if (showSignatureModal) {
      const timer = setTimeout(() => {
        calibrateSignatureCanvas();
      }, 300);
      return () => clearTimeout(timer);
    }
  }, [showSignatureModal]);

  const fetchItemDetail = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      console.log('🔑 Token for lost item detail request:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Lost item detail API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Lost item detail API response:', data);
        console.log('📋 Item field structure check:');
        console.log('  - handover_photo_url:', data.data?.handover_photo_url ? 'EXISTS' : 'NULL');
        console.log('  - handover_signature_data:', data.data?.handover_signature_data ? 'EXISTS' : 'NULL');
        console.log('  - return_photo_url:', data.data?.return_photo_url ? 'EXISTS' : 'NULL');
        console.log('  - return_signature_data:', data.data?.return_signature_data ? 'EXISTS' : 'NULL');
        
        // Debug: Log actual return photo URL value
        if (data.data?.return_photo_url) {
          console.log('🔍 return_photo_url actual value:', data.data.return_photo_url);
          console.log('🔍 return_photo_url type:', typeof data.data.return_photo_url);
          console.log('🔍 return_photo_url length:', data.data.return_photo_url.length);
          console.log('🔍 Is base64?', data.data.return_photo_url.startsWith('data:image/'));
          console.log('🔍 Is relative URL?', data.data.return_photo_url.startsWith('/'));
          console.log('🔍 Full URL will be:', data.data.return_photo_url.startsWith('http') ? data.data.return_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${data.data.return_photo_url}`);
        }
        
        setItem(data.data);
      } else {
        const errorData = await response.json();
        console.error('❌ Lost item detail API error:', errorData);
        alert.error('Barang tidak ditemukan');
        navigate('/app/lost-items/data');
      }
    } catch (error) {
      console.error('❌ Error fetching item detail:', error);
      alert.error('Gagal memuat detail barang');
    } finally {
      setIsLoading(false);
    }
  };

  const fetchItemHistory = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}/history`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Item history loaded from API:', data.data);
        setChangeHistory(data.data || []);
      } else {
        console.error('❌ Failed to load item history');
        setChangeHistory([]);
      }
    } catch (error) {
      console.error('❌ Error loading item history:', error);
      setChangeHistory([]);
    }
  };

  const handleRevertItem = async (historyId) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}/revert/${historyId}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        alert.success('Barang berhasil dikembalikan ke keadaan sebelumnya');
        fetchItemDetail();
        fetchItemHistory();
      } else {
        alert.error('Gagal mengembalikan barang ke keadaan sebelumnya');
      }
    } catch (error) {
      console.error('Error reverting item:', error);
      alert.error('Terjadi kesalahan saat mengembalikan barang');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleStatusUpdate = async (newStatus) => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          status: newStatus,
          updated_by: user?.id
        })
      });

      if (response.ok) {
        alert.success(`Status barang berhasil diubah ke ${newStatus === 'found' ? 'ditemukan' : newStatus === 'returned' ? 'dikembalikan' : newStatus === 'disposed' ? 'dibuang' : newStatus}`);
        fetchItemDetail();
        fetchItemHistory();
      } else {
        alert.error('Gagal mengubah status');
      }
    } catch (error) {
      console.error('Error updating status:', error);
      alert.error('Error updating status');
    } finally {
      setIsUpdating(false);
    }
  };


  // Helper function to get field labels
  const getFieldLabel = (fieldName) => {
    const labels = {
      'item_name': 'Nama Barang',
      'category': 'Kategori',
      'description': 'Deskripsi',
      'condition_status': 'Kondisi',
      'found_location': 'Lokasi Ditemukan',
      'finder_name': 'Nama Penemu',
      'finder_contact': 'Kontak Penemu',
      'notes': 'Catatan Tambahan'
    };
    return labels[fieldName] || fieldName;
  };


  // Handle toggle edit mode for all fields
  const handleEditToggle = () => {
    if (isEditing) {
      // Cancel editing - reset to original values
      setTempEditValues({});
      setIsEditing(false);
    } else {
      // Start editing - initialize temp values with current item data
      setTempEditValues({
        item_name: item.item_name || '',
        category: item.category || '',
        description: item.description || '',
        condition_status: item.condition_status || '',
        found_location: item.found_location || '',
        finder_name: item.finder_name || '',
        finder_contact: item.finder_contact || '',
        notes: item.notes || ''
      });
      setIsEditing(true);
    }
  };

  // Handle save all edits
  const handleSaveAllEdits = async () => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      
      // Prepare update data with only changed fields
      const updateData = {};
      const fieldsToUpdate = ['item_name', 'category', 'description', 'condition_status', 'found_location', 'finder_name', 'finder_contact', 'notes'];
      
      fieldsToUpdate.forEach(field => {
        if (tempEditValues[field] !== undefined && tempEditValues[field] !== item[field]) {
          updateData[field] = tempEditValues[field]?.trim();
        }
      });

      // Validate required fields
      if (updateData.item_name === '') {
        alert.error('Nama barang tidak boleh kosong');
        return;
      }
      
      if (updateData.finder_contact && updateData.finder_contact.length < 8) {
        alert.error('Kontak penemu minimal 8 karakter');
        return;
      }

      // Add updated_by info
      updateData.updated_by = user?.id || user?.name || 'Unknown';

      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(updateData)
      });

      if (response.ok) {
        // Update item state
        setItem(prev => ({ ...prev, ...updateData }));
        alert.success('Berhasil memperbarui data barang');
        
        setIsEditing(false);
        setTempEditValues({});
        fetchItemDetail(); // Refresh data
        fetchItemHistory(); // Refresh history from database
      } else {
        const errorData = await response.json();
        alert.error(errorData.message || 'Gagal memperbarui data');
      }
    } catch (error) {
      console.error('Error updating item:', error);
      alert.error('Terjadi kesalahan saat memperbarui data');
    } finally {
      setIsUpdating(false);
    }
  };

  // Handle cancel all edits
  const handleCancelAllEdits = () => {
    setTempEditValues({});
    setIsEditing(false);
  };

  // Render editable field component
  const renderEditableField = (fieldName, value, label, type = 'text', options = null) => {
    return (
      <div>
        <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
          {label}
        </label>
        <div style={{ marginTop: '4px' }}>
          {isEditing ? (
            <>
              {type === 'select' && options ? (
                <select
                  value={tempEditValues[fieldName] !== undefined ? tempEditValues[fieldName] : value || ''}
                  onChange={(e) => setTempEditValues({...tempEditValues, [fieldName]: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #0d6efd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    backgroundColor: 'white'
                  }}
                >
                  <option value="">Pilih {label}</option>
                  {options.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              ) : type === 'textarea' ? (
                <textarea
                  value={tempEditValues[fieldName] !== undefined ? tempEditValues[fieldName] : value || ''}
                  onChange={(e) => setTempEditValues({...tempEditValues, [fieldName]: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #0d6efd',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '60px',
                    resize: 'vertical'
                  }}
                />
              ) : (
                <input
                  type={type}
                  value={tempEditValues[fieldName] !== undefined ? tempEditValues[fieldName] : value || ''}
                  onChange={(e) => setTempEditValues({...tempEditValues, [fieldName]: e.target.value})}
                  style={{
                    width: '100%',
                    padding: '8px',
                    border: '2px solid #0d6efd',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              )}
            </>
          ) : (
            <div 
              style={{
                padding: '8px',
                fontSize: '14px',
                color: '#212529',
                minHeight: type === 'textarea' ? '60px' : '32px',
                whiteSpace: type === 'textarea' ? 'pre-wrap' : 'nowrap',
                overflow: 'hidden',
                textOverflow: 'ellipsis',
                display: 'flex',
                alignItems: type === 'textarea' ? 'flex-start' : 'center',
                backgroundColor: '#f8f9fa',
                borderRadius: '4px',
                border: '1px solid #dee2e6'
              }}
            >
              {value || <span style={{ color: '#6c757d', fontStyle: 'italic' }}>Tidak ada data</span>}
            </div>
          )}
        </div>
      </div>
    );
  };


  const handleReturnSave = async () => {
    try {
      setIsUpdating(true);
      const token = localStorage.getItem('token');
      
      const formData = {
        claimer_name: returnForm.claimer_name,
        claimer_contact: returnForm.claimer_contact,
        claimer_id_number: returnForm.claimer_id_number || null,
        relationship_to_owner: returnForm.relationship_to_owner,
        return_notes: returnForm.return_notes || null,
        return_photo: returnForm.return_photo,
        return_signature: returnForm.return_signature,
        return_date: new Date().toISOString().split('T')[0],
        updated_by: user?.id
      };

      console.log('🔄 Submitting return form data:', {
        ...formData,
        return_photo: formData.return_photo ? 'BASE64_DATA_PRESENT' : 'NULL',
        return_signature: formData.return_signature ? 'BASE64_DATA_PRESENT' : 'NULL'
      });
      
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}/return`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(formData)
      });

      if (response.ok) {
        alert.success('Item marked as returned successfully');
        setShowReturnModal(false);
        setReturnPhoto(null);
        setReturnSignature(null);
        setShowWebcam(false);
        setShowSignatureModal(false);
        setReturnForm({
          claimer_name: '',
          claimer_contact: '',
          claimer_id_number: '',
          relationship_to_owner: 'owner',
          return_notes: '',
          return_photo: null,
          return_signature: null
        });
        fetchItemDetail();
        fetchItemHistory();
      } else {
        const errorData = await response.json();
        console.error('❌ Return submission error:', errorData);
        alert.error(`Failed to mark as returned: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('❌ Error processing return:', error);
      alert.error('Error processing return');
    } finally {
      setIsUpdating(false);
    }
  };


  const handleDownloadHandoverDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}/handover-document`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `handover-document-${item?.item_name}-${id}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        alert.success('Handover document downloaded successfully!');
      } else {
        const errorData = await response.json();
        alert.error(`Failed to download handover document: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading handover document:', error);
      alert.error('Error downloading handover document');
    }
  };

  const handleDownloadReturnDocument = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL}/lost-items/${id}/return-document`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `return-document-${item?.item_name}-${id}.docx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
        
        // Show success message
        alert.success('Return document downloaded successfully!');
      } else {
        const errorData = await response.json();
        alert.error(`Failed to download return document: ${errorData.message || 'Unknown error'}`);
      }
    } catch (error) {
      console.error('Error downloading return document:', error);
      alert.error('Error downloading return document');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'found': return { bg: '#dcfce7', color: '#166534' };
      case 'returned': return { bg: '#dbeafe', color: '#1e40af' };
      case 'disposed': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'found': return <Clock size={16} />;
      case 'returned': return <CheckCircle size={16} />;
      case 'disposed': return <AlertCircle size={16} />;
      default: return <Package size={16} />;
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        padding: '24px', 
        backgroundColor: '#f8f9fa', 
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <Package size={48} style={{ color: '#6c757d', marginBottom: '16px' }} />
          <div style={{ color: '#6c757d', fontSize: '16px' }}>Loading item details...</div>
        </div>
      </div>
    );
  }

  if (!item) {
    return (
      <div style={{ 
        padding: '24px', 
        backgroundColor: '#f8f9fa', 
        minHeight: 'calc(100vh - 60px)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center'
      }}>
        <div style={{ textAlign: 'center' }}>
          <AlertCircle size={48} style={{ color: '#dc3545', marginBottom: '16px' }} />
          <div style={{ color: '#dc3545', fontSize: '16px' }}>Item not found</div>
        </div>
      </div>
    );
  }

  const statusColor = getStatusColor(item.status);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'center', gap: '16px' }}>
        <button
          onClick={() => navigate('/app/lost-items/data')}
          style={{
            padding: '8px',
            backgroundColor: 'white',
            border: '1px solid #dee2e6',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}
        >
          <ArrowLeft size={20} style={{ color: '#6c757d' }} />
        </button>
        
        <div style={{ flex: 1 }}>
          <h1 style={{ 
            fontSize: '28px', 
            fontWeight: '600', 
            color: '#212529', 
            margin: 0,
            marginBottom: '4px'
          }}>
            {item.item_name}
          </h1>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <span style={{
              padding: '4px 12px',
              borderRadius: '16px',
              fontSize: '12px',
              fontWeight: '600',
              textTransform: 'uppercase',
              backgroundColor: statusColor.bg,
              color: statusColor.color,
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}>
              {getStatusIcon(item.status)}
              {item.status}
            </span>
            <span style={{ color: '#6c757d', fontSize: '14px' }}>
              ID: #{item.id}
            </span>
          </div>
        </div>

        <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
          <button
            onClick={handleDownloadHandoverDocument}
            style={{
              padding: '10px 16px',
              backgroundColor: '#6f42c1',
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
            <Download size={16} />
            Dokumen Penyerahan
          </button>

          {item?.status === 'returned' && (
            <button
              onClick={handleDownloadReturnDocument}
              style={{
                padding: '10px 16px',
                backgroundColor: '#fd7e14',
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
              <Download size={16} />
              Dokumen Pengembalian
            </button>
          )}
          
          {!isEditing ? (
            <button 
              onClick={() => handleEditToggle()}
              style={{
                padding: '10px 16px',
                backgroundColor: '#0d6efd',
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
              <Edit3 size={16} />
              Edit Barang
            </button>
          ) : (
            <div style={{ display: 'flex', gap: '8px' }}>
              <button 
                onClick={() => handleSaveAllEdits()}
                disabled={isUpdating}
                style={{
                  padding: '10px 16px',
                  backgroundColor: isUpdating ? '#6c757d' : '#198754',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                {isUpdating ? (
                  <div style={{
                    width: '16px',
                    height: '16px',
                    border: '2px solid #ffffff40',
                    borderTop: '2px solid #ffffff',
                    borderRadius: '50%',
                    animation: 'spin 1s linear infinite'
                  }}></div>
                ) : (
                  <Save size={16} />
                )}
                {isUpdating ? 'Menyimpan...' : 'Simpan Semua'}
              </button>
              <button 
                onClick={() => handleCancelAllEdits()}
                disabled={isUpdating}
                style={{
                  padding: '10px 16px',
                  backgroundColor: '#dc3545',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isUpdating ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <X size={16} />
                Batal
              </button>
            </div>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px' }}>
        {/* Main Content */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Item Information */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Package size={18} style={{ color: '#0d6efd' }} />
              Informasi Barang
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                {renderEditableField('item_name', item.item_name, 'Nama Barang')}
              </div>

              <div>
                {renderEditableField('category', item.category, 'Kategori', 'select', [
                  { value: 'Elektronik', label: 'Elektronik' },
                  { value: 'Dokumen', label: 'Dokumen' },
                  { value: 'Aksesoris', label: 'Aksesoris' },
                  { value: 'Pakaian', label: 'Pakaian' },
                  { value: 'Tas/Dompet', label: 'Tas/Dompet' },
                  { value: 'Kunci', label: 'Kunci' },
                  { value: 'Lainnya', label: 'Lainnya' }
                ])}
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                {renderEditableField('description', item.description, 'Deskripsi', 'textarea')}
              </div>

              <div>
                {renderEditableField('condition_status', item.condition_status, 'Kondisi', 'select', [
                  { value: 'excellent', label: 'Sangat Baik' },
                  { value: 'good', label: 'Baik' },
                  { value: 'fair', label: 'Cukup' },
                  { value: 'poor', label: 'Buruk' }
                ])}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                  Status
                </label>
                <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                  <span style={{
                    padding: '4px 8px',
                    borderRadius: '12px',
                    fontSize: '12px',
                    fontWeight: '600',
                    backgroundColor: statusColor.bg,
                    color: statusColor.color
                  }}>
                    {item.status === 'found' ? 'Ditemukan' :
                     item.status === 'returned' ? 'Dikembalikan' :
                     item.status === 'disposed' ? 'Dibuang' : item.status}
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* Found Information */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h3 style={{ 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <MapPin size={18} style={{ color: '#0d6efd' }} />
              Informasi Penemuan
            </h3>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
              <div>
                {renderEditableField('found_location', item.found_location, 'Lokasi Ditemukan')}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                  Tanggal & Waktu Ditemukan
                </label>
                <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                  {item.found_date ? new Date(item.found_date).toLocaleDateString('id-ID') : '28 Juni 2025'} - {item.found_time || '14:30'}
                </div>
              </div>

              <div>
                {renderEditableField('finder_name', item.finder_name, 'Nama Penemu')}
              </div>

              <div>
                {renderEditableField('finder_contact', item.finder_contact, 'Kontak Penemu')}
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                  Ditemukan Oleh (Staff)
                </label>
                <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                  {item.found_by || item.input_by_name || 'Admin ULT'}
                </div>
              </div>

              <div>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                  Tanggal Registrasi
                </label>
                <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                  {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '28 Juni 2025'}
                </div>
              </div>

              <div style={{ gridColumn: '1 / -1' }}>
                {renderEditableField('notes', item.notes, 'Catatan Tambahan', 'textarea')}
              </div>
            </div>

            {/* Photo Documentation */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                📸 Dokumentasi Foto Barang Ditemukan
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: '#f9fafb'
              }}>
                {item.handover_photo_url ? (
                  <>
                    <img 
                      src={item.handover_photo_url.startsWith('http') || item.handover_photo_url.startsWith('data:') ? item.handover_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.handover_photo_url}`}
                      alt="Barang Ditemukan" 
                      style={{
                        maxWidth: '300px',
                        maxHeight: '300px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db',
                        objectFit: 'cover'
                      }}
                      onError={(e) => {
                        console.log('Error loading handover photo:', item.handover_photo_url);
                        console.log('Full URL tried:', item.handover_photo_url.startsWith('http') || item.handover_photo_url.startsWith('data:') ? item.handover_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.handover_photo_url}`);
                        try {
                          if (e && e.target && e.target.style) {
                            e.target.style.display = 'none';
                          }
                        } catch (error) {
                          console.error('Error in onError handler:', error);
                        }
                      }}
                    />
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                      Item photo taken when found (handover documentation)
                    </p>
                  </>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    padding: '40px 20px'
                  }}>
                    <Camera size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                    <p style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '500' }}>
                      Handover Item Photo
                    </p>
                    <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                      Item photo taken when found (handover documentation)
                    </p>
                  </div>
                )}
              </div>
            </div>

            {/* Signature */}
            <div style={{ marginTop: '20px' }}>
              <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                ✍️ Tanda Tangan Digital Barang Ditemukan
              </label>
              <div style={{
                border: '2px dashed #d1d5db',
                borderRadius: '8px',
                padding: '16px',
                textAlign: 'center',
                backgroundColor: '#f9fafb'
              }}>
                {item.handover_signature_data ? (
                  <>
                    <img 
                      src={item.handover_signature_data} 
                      alt="Tanda Tangan Penyerahan" 
                      style={{
                        maxWidth: '400px',
                        maxHeight: '120px',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db'
                      }}
                      onError={(e) => {
                        console.log('Error loading handover signature');
                        try {
                          if (e && e.target && e.target.style) {
                            e.target.style.display = 'none';
                          }
                        } catch (error) {
                          console.error('Error in onError handler:', error);
                        }
                      }}
                    />
                    <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                      Digital signature captured during handover process
                    </p>
                  </>
                ) : (
                  <div style={{ 
                    display: 'flex', 
                    flexDirection: 'column', 
                    alignItems: 'center',
                    padding: '40px 20px'
                  }}>
                    <Edit3 size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                    <p style={{ color: '#6b7280', fontSize: '12px' }}>
                      Digital signature captured during handover process
                    </p>
                  </div>
                )}
              </div>
            </div>

            {item.notes && (
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                  Catatan Tambahan
                </label>
                <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px', lineHeight: '1.5' }}>
                  {item.notes}
                </div>
              </div>
            )}
          </div>

          {/* Informasi Pengembalian (jika sudah dikembalikan) */}
          {item.status === 'returned' && (
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
              border: '1px solid #dee2e6'
            }}>
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#212529',
                marginBottom: '20px',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <CheckCircle size={18} style={{ color: '#198754' }} />
                Informasi Pengembalian
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                    Nama Pengambil
                  </label>
                  <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                    {item.claimer_name || 'John Doe'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                    Kontak Pengambil
                  </label>
                  <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                    {item.claimer_contact || '081234567891'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                    Tanggal Pengembalian
                  </label>
                  <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                    {item.return_date ? new Date(item.return_date).toLocaleDateString('id-ID') : '29 Juni 2025'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                    Returned By
                  </label>
                  <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                    {item.returned_by || 'Receptionist ULT'}
                  </div>
                </div>

                <div>
                  <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase' }}>
                    Return Operator
                  </label>
                  <div style={{ fontSize: '16px', color: '#212529', marginTop: '4px' }}>
                    {item.return_operator_name || item.return_operator || 'System Admin'}
                  </div>
                </div>
              </div>

              {/* Return Photo Documentation */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                  📷 Return Item Photo Documentation
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  {item.return_photo_url ? (
                    <>
                      <img 
                        src={item.return_photo_url.startsWith('http') || item.return_photo_url.startsWith('data:') ? item.return_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.return_photo_url}`}
                        alt="Return Item" 
                        style={{
                          maxWidth: '300px',
                          maxHeight: '300px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db',
                          objectFit: 'cover'
                        }}
                        onError={(e) => {
                          console.log('❌ Error loading return photo:', item.return_photo_url);
                          console.log('❌ Full URL tried:', item.return_photo_url.startsWith('http') ? item.return_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.return_photo_url}`);
                          console.log('❌ Image error event:', e);
                          console.log('❌ Image element:', e.target);
                          console.log('❌ Image src:', e.target.src);
                          console.log('❌ Image naturalWidth:', e.target.naturalWidth);
                          console.log('❌ Image naturalHeight:', e.target.naturalHeight);
                          console.log('❌ Image complete:', e.target.complete);
                          
                          // Try to fetch the URL directly to see the actual error
                          fetch(e.target.src)
                            .then(response => {
                              console.log('🌐 Direct fetch response status:', response.status);
                              console.log('🌐 Direct fetch response headers:', response.headers);
                              return response.text();
                            })
                            .then(text => {
                              console.log('🌐 Direct fetch response body (first 200 chars):', text.substring(0, 200));
                            })
                            .catch(fetchError => {
                              console.log('🌐 Direct fetch error:', fetchError);
                            });
                          
                          try {
                            if (e && e.target && e.target.style) {
                              e.target.style.display = 'none';
                            }
                          } catch (error) {
                            console.error('Error in onError handler:', error);
                          }
                        }}
                      />
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                        Photo taken during return process
                      </p>
                    </>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      padding: '40px 20px'
                    }}>
                      <Camera size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                      <p style={{ color: '#9ca3af', fontSize: '14px', fontWeight: '500' }}>
                        Return Item
                      </p>
                      <p style={{ color: '#6b7280', fontSize: '12px', marginTop: '4px' }}>
                        Photo taken during return process
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Return Signature */}
              <div style={{ marginTop: '20px' }}>
                <label style={{ fontSize: '12px', fontWeight: '600', color: '#6c757d', textTransform: 'uppercase', marginBottom: '12px', display: 'block' }}>
                  ✍️ Tanda Tangan Digital Pengembalian Barang
                </label>
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  padding: '16px',
                  textAlign: 'center',
                  backgroundColor: '#f9fafb'
                }}>
                  {item.return_signature_data ? (
                    <>
                      <img 
                        src={item.return_signature_data} 
                        alt="Tanda Tangan Pengembalian" 
                        style={{
                          maxWidth: '400px',
                          maxHeight: '120px',
                          borderRadius: '8px',
                          border: '1px solid #d1d5db'
                        }}
                        onError={(e) => {
                          console.log('Error loading return signature');
                          try {
                            if (e && e.target && e.target.style) {
                              e.target.style.display = 'none';
                            }
                          } catch (error) {
                            console.error('Error in onError handler:', error);
                          }
                        }}
                      />
                      <p style={{ color: '#6b7280', fontSize: '14px', marginTop: '8px' }}>
                        Tanda tangan diambil saat proses pengembalian
                      </p>
                    </>
                  ) : (
                    <div style={{ 
                      display: 'flex', 
                      flexDirection: 'column', 
                      alignItems: 'center',
                      padding: '40px 20px'
                    }}>
                      <Edit3 size={48} style={{ color: '#9ca3af', marginBottom: '12px' }} />
                      <p style={{ color: '#6b7280', fontSize: '12px' }}>
                        Tanda tangan diambil saat proses pengembalian
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {/* Photos */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Camera size={16} style={{ color: '#0d6efd' }} />
              Item Photos
            </h4>
            
            {/* Found Photo */}
            <div style={{ marginBottom: item.status === 'returned' && item.return_photo_url ? '20px' : '0' }}>
              <label style={{ 
                fontSize: '12px', 
                fontWeight: '600', 
                color: '#6c757d', 
                marginBottom: '8px', 
                display: 'block',
                textTransform: 'uppercase'
              }}>
                📸 Foto Ditemukan
              </label>
              {item.handover_photo_url ? (
                <img 
                  src={item.handover_photo_url.startsWith('http') || item.handover_photo_url.startsWith('data:') ? item.handover_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.handover_photo_url}`}
                  alt="Foto barang ditemukan"
                  style={{
                    width: '100%',
                    borderRadius: '8px',
                    border: '1px solid #dee2e6'
                  }}
                  onError={(e) => {
                    console.log('Error loading found photo:', item.handover_photo_url);
                    console.log('Full URL tried:', item.handover_photo_url.startsWith('http') || item.handover_photo_url.startsWith('data:') ? item.handover_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.handover_photo_url}`);
                    try {
                      if (e && e.target && e.target.style) {
                        e.target.style.display = 'none';
                      }
                    } catch (error) {
                      console.error('Error in onError handler:', error);
                    }
                  }}
                />
              ) : (
                <div style={{
                  width: '100%',
                  aspectRatio: '4/3',
                  border: '2px dashed #d1d5db',
                  borderRadius: '8px',
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  justifyContent: 'center',
                  backgroundColor: '#f9fafb',
                  color: '#9ca3af'
                }}>
                  <Camera size={32} style={{ marginBottom: '8px' }} />
                  <p style={{ fontSize: '12px', textAlign: 'center' }}>
                    No found photo
                  </p>
                </div>
              )}
            </div>

            {/* Return Photo */}
            {item.status === 'returned' && (
              <div>
                <label style={{ 
                  fontSize: '12px', 
                  fontWeight: '600', 
                  color: '#6c757d', 
                  marginBottom: '8px', 
                  display: 'block',
                  textTransform: 'uppercase'
                }}>
                  📷 Return Photo
                </label>
                {item.return_photo_url ? (
                  <img 
                    src={item.return_photo_url.startsWith('http') || item.return_photo_url.startsWith('data:') ? item.return_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.return_photo_url}`}
                    alt="Return item photo"
                    style={{
                      width: '100%',
                      borderRadius: '8px',
                      border: '1px solid #dee2e6'
                    }}
                    onError={(e) => {
                      console.log('❌ Error loading return photo (sidebar):', item.return_photo_url);
                      console.log('❌ Full URL tried (sidebar):', item.return_photo_url.startsWith('http') || item.return_photo_url.startsWith('data:') ? item.return_photo_url : `${import.meta.env.VITE_API_URL.replace("/api", "")}${item.return_photo_url}`);
                      console.log('❌ Image error event (sidebar):', e);
                      try {
                        if (e && e.target && e.target.style) {
                          e.target.style.display = 'none';
                        }
                      } catch (error) {
                        console.error('Error in onError handler:', error);
                      }
                    }}
                  />
                ) : (
                  <div style={{
                    width: '100%',
                    aspectRatio: '4/3',
                    border: '2px dashed #d1d5db',
                    borderRadius: '8px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    backgroundColor: '#f9fafb',
                    color: '#9ca3af'
                  }}>
                    <Camera size={32} style={{ marginBottom: '8px' }} />
                    <p style={{ fontSize: '12px', textAlign: 'center' }}>
                      No return photo
                    </p>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Quick Actions */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '16px'
            }}>
              Quick Actions
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {item.status === 'found' && (
                <button
                  onClick={() => setShowReturnModal(true)}
                  disabled={isUpdating}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#198754',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <CheckCircle size={16} />
                  Proses Pengembalian
                </button>
              )}

              {item.status === 'found' && (
                <button
                  onClick={() => handleStatusUpdate('disposed')}
                  disabled={isUpdating}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#ffc107',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <Trash2 size={16} />
                  Mark as Disposed
                </button>
              )}

              {item.status !== 'found' && (
                <button
                  onClick={() => handleStatusUpdate('found')}
                  disabled={isUpdating}
                  style={{
                    padding: '10px 16px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    fontSize: '14px',
                    fontWeight: '600',
                    cursor: isUpdating ? 'not-allowed' : 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px'
                  }}
                >
                  <RotateCcw size={16} />
                  Kembalikan ke Status Ditemukan
                </button>
              )}
            </div>
          </div>

          {/* Item Statistics */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '16px'
            }}>
              Timeline Barang
            </h4>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <div style={{ 
                  width: '8px', 
                  height: '8px', 
                  borderRadius: '50%', 
                  backgroundColor: '#0d6efd' 
                }}></div>
                <div style={{ fontSize: '14px', color: '#374151' }}>
                  <strong>Terdaftar:</strong> {item.created_at ? new Date(item.created_at).toLocaleDateString('id-ID') : '28 Juni 2025'}
                </div>
              </div>

              {item.status === 'returned' && (
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div style={{ 
                    width: '8px', 
                    height: '8px', 
                    borderRadius: '50%', 
                    backgroundColor: '#198754' 
                  }}></div>
                  <div style={{ fontSize: '14px', color: '#374151' }}>
                    <strong>Dikembalikan:</strong> {item.return_date ? new Date(item.return_date).toLocaleDateString('id-ID') : '29 Juni 2025'}
                  </div>
                </div>
              )}

              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '8px' }}>
                Hari sejak ditemukan: {item.created_at ? Math.floor((new Date() - new Date(item.created_at)) / (1000 * 60 * 60 * 24)) : '1'} hari
              </div>
            </div>
          </div>

          {/* Riwayat Perubahan Data */}
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            padding: '24px',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
            border: '1px solid #dee2e6'
          }}>
            <h4 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529',
              marginBottom: '16px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <FileText size={16} style={{ color: '#8b5cf6' }} />
              Riwayat Perubahan Data
            </h4>

            <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
              {changeHistory.length === 0 ? (
                <div style={{ 
                  textAlign: 'center', 
                  color: '#6c757d', 
                  padding: '20px',
                  fontSize: '14px'
                }}>
                  Belum ada perubahan data
                </div>
              ) : (
                changeHistory.map((entry) => (
                  <div 
                    key={entry.id}
                    style={{
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      padding: '12px',
                      marginBottom: '8px',
                      backgroundColor: '#f8f9fa'
                    }}
                  >
                    <div style={{ 
                      display: 'flex', 
                      justifyContent: 'space-between', 
                      alignItems: 'start',
                      marginBottom: '6px'
                    }}>
                      <div>
                        <div style={{ 
                          fontSize: '13px', 
                          fontWeight: '600',
                          color: '#1e293b',
                          marginBottom: '2px'
                        }}>
                          📝 {entry.action_type === 'updated' ? 'Data diperbarui' : 
                              entry.action_type === 'status_changed' ? 'Status diubah' : 
                              entry.action_type === 'returned' ? 'Barang dikembalikan' : 
                              entry.action_type === 'created' ? 'Data dibuat' : 
                              entry.action_type}
                        </div>
                        <div style={{ 
                          fontSize: '11px', 
                          color: '#6c757d'
                        }}>
                          {new Date(entry.created_at).toLocaleString('id-ID')} • {entry.user_name || entry.user_full_name || 'Unknown'}
                        </div>
                      </div>
                    </div>
                    
                    {entry.changed_fields && (
                      <div style={{
                        backgroundColor: 'white',
                        border: '1px solid #e9ecef',
                        borderRadius: '4px',
                        padding: '8px',
                        fontSize: '11px',
                        fontFamily: 'monospace'
                      }}>
                        <div style={{ marginBottom: '4px', fontWeight: '600' }}>
                          Field yang diubah: {entry.changed_fields}
                        </div>
                        {entry.notes && (
                          <div style={{ color: '#6c757d', fontStyle: 'italic' }}>
                            Catatan: {entry.notes}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>


      {/* Return Modal */}
      {showReturnModal && (
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
            maxWidth: '800px',
            width: '90%',
            maxHeight: '90%',
            overflow: 'auto'
          }}>
            <div style={{ 
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '20px',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <h3 style={{ 
                fontSize: '22px', 
                fontWeight: '700', 
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                color: '#1e293b'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '40px',
                  height: '40px',
                  backgroundColor: '#dcfce7',
                  borderRadius: '12px',
                  boxShadow: '0 4px 8px rgba(34, 197, 94, 0.2)'
                }}>
                  <CheckCircle size={22} style={{ color: '#16a34a' }} />
                </div>
                Proses Pengembalian Barang
              </h3>
              <button
                onClick={() => setShowReturnModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  padding: '8px',
                  cursor: 'pointer',
                  borderRadius: '8px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#f3f4f6';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = 'transparent';
                }}
              >
                <X size={20} style={{ color: '#6b7280' }} />
              </button>
            </div>
            
            {/* Claimer Information Section */}
            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px'
                }}>
                  <User size={18} style={{ color: '#0d6efd' }} />
                </div>
                Informasi Pengambil
              </h4>
              
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', marginBottom: '20px' }}>
                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#1e293b',
                    marginBottom: '10px',
                    letterSpacing: '0.3px'
                  }}>
                    Nama Lengkap <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={returnForm.claimer_name}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, claimer_name: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: '#fafafa'
                    }}
                    placeholder="Masukkan nama lengkap pengambil"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0d6efd';
                      e.target.style.backgroundColor = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(13, 110, 253, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.backgroundColor = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div>
                  <label style={{ 
                    display: 'block', 
                    fontSize: '14px', 
                    fontWeight: '600', 
                    color: '#1e293b',
                    marginBottom: '10px',
                    letterSpacing: '0.3px'
                  }}>
                    Nomor Kontak <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="tel"
                    value={returnForm.claimer_contact}
                    onChange={(e) => setReturnForm(prev => ({ ...prev, claimer_contact: e.target.value }))}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      border: '2px solid #e2e8f0',
                      borderRadius: '12px',
                      fontSize: '14px',
                      transition: 'all 0.2s ease',
                      outline: 'none',
                      backgroundColor: '#fafafa'
                    }}
                    placeholder="081234567890"
                    onFocus={(e) => {
                      e.target.style.borderColor = '#0d6efd';
                      e.target.style.backgroundColor = 'white';
                      e.target.style.boxShadow = '0 0 0 3px rgba(13, 110, 253, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e2e8f0';
                      e.target.style.backgroundColor = '#fafafa';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>                    Nomor ID
                </label>
                <input
                  type="text"
                  value={returnForm.claimer_id_number}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, claimer_id_number: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    backgroundColor: '#fafafa'
                  }}
                  placeholder="Masukkan nomor ID/mahasiswa (opsional)"
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.backgroundColor = 'white';
                    e.target.style.boxShadow = '0 0 0 3px rgba(13, 110, 253, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#fafafa';
                    e.target.style.boxShadow = 'none';
                  }}
                />
              </div>

              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>                    Hubungan dengan Pemilik
                </label>
                <select
                  value={returnForm.relationship_to_owner}
                  onChange={(e) => setReturnForm(prev => ({ ...prev, relationship_to_owner: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    backgroundColor: '#fafafa',
                    transition: 'all 0.2s ease',
                    outline: 'none',
                    cursor: 'pointer'
                  }}
                  onFocus={(e) => {
                    e.target.style.borderColor = '#0d6efd';
                    e.target.style.backgroundColor = 'white';
                    e.target.style.boxShadow = '0 0 0 3px rgba(13, 110, 253, 0.1)';
                  }}
                  onBlur={(e) => {
                    e.target.style.borderColor = '#e2e8f0';
                    e.target.style.backgroundColor = '#fafafa';
                    e.target.style.boxShadow = 'none';
                  }}
                >
                  <option value="owner">Pemilik Barang</option>
                  <option value="family">Anggota Keluarga</option>
                  <option value="friend">Teman/Rekan</option>
                  <option value="representative">Perwakilan Resmi</option>
                  <option value="other">Lainnya</option>
                </select>
              </div>
            </div>

            {/* Photo Capture Section */}
            <div style={{ marginBottom: '28px' }}>
              <h4 style={{ 
                fontSize: '18px', 
                fontWeight: '700', 
                marginBottom: '20px',
                color: '#1e293b',
                display: 'flex',
                alignItems: 'center',
                gap: '10px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  width: '32px',
                  height: '32px',
                  backgroundColor: '#eff6ff',
                  borderRadius: '8px'
                }}>
                  <Camera size={18} style={{ color: '#0d6efd' }} />
                </div>
                📸 Dokumentasi Pengambilan
              </h4>
              
              <div style={{ marginBottom: '20px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>
                  Foto Pengambilan Barang <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                {!showWebcam && !returnPhoto ? (
                  <div style={{ 
                    display: 'flex', 
                    gap: '16px', 
                    flexWrap: 'wrap',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <button
                      type="button"
                      onClick={() => setShowWebcam(true)}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 24px',
                        backgroundColor: '#0d6efd',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(13, 110, 253, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#0b5ed7';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 6px 16px rgba(13, 110, 253, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#0d6efd';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(13, 110, 253, 0.3)';
                      }}
                    >
                      <Camera size={16} />
                      Ambil Foto
                    </button>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          const reader = new FileReader();
                          reader.onload = (event) => {
                            setReturnPhoto(event.target.result);
                            setReturnForm(prev => ({ ...prev, return_photo: event.target.result }));
                          };
                          reader.readAsDataURL(file);
                        }
                      }}
                      style={{ display: 'none' }}
                      id="return-photo-upload"
                    />
                    <label
                      htmlFor="return-photo-upload"
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '14px 24px',
                        backgroundColor: '#6c757d',
                        color: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        fontSize: '14px',
                        fontWeight: '600',
                        cursor: 'pointer',
                        transition: 'all 0.2s ease',
                        boxShadow: '0 4px 12px rgba(108, 117, 125, 0.3)'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#565e64';
                        e.target.style.transform = 'translateY(-1px)';
                        e.target.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.4)';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#6c757d';
                        e.target.style.transform = 'translateY(0)';
                        e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                      }}
                    >
                      <Upload size={16} />
                      Unggah Foto
                    </label>
                  </div>
                ) : null}

                {showWebcam && (
                  <div style={{ marginTop: '12px' }}>
                    <div style={{
                      border: '2px solid #e5e7eb',
                      borderRadius: '8px',
                      overflow: 'hidden',
                      marginBottom: '12px'
                    }}>
                      <Webcam
                        ref={webcamRef}
                        audio={false}
                        screenshotFormat="image/jpeg"
                        style={{ 
                          width: '100%', 
                          height: 'auto',
                          transform: 'scaleX(-1)'
                        }}
                        videoConstraints={{
                          width: 640,
                          height: 480,
                          facingMode: 'user'
                        }}
                      />
                    </div>
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={async () => {
                          const imageSrc = webcamRef.current.getScreenshot();
                          const flippedImage = await flipImageHorizontally(imageSrc);
                          setReturnPhoto(flippedImage);
                          setReturnForm(prev => ({ ...prev, return_photo: flippedImage }));
                          setShowWebcam(false);
                        }}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#10b981',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Ambil Foto
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowWebcam(false)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#6b7280',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '14px'
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {returnPhoto && (
                  <div style={{ 
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <img
                      src={returnPhoto}
                      alt="Return photo"
                      style={{
                        width: '200px',
                        height: '150px',
                        objectFit: 'cover',
                        borderRadius: '8px',
                        border: '1px solid #d1d5db'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReturnPhoto(null);
                        setReturnForm(prev => ({ ...prev, return_photo: null }));
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>

              {/* Signature Section */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '6px'
                }}>
                  Tanda Tangan Pengambil <span style={{ color: '#ef4444' }}>*</span>
                </label>
                
                {!showSignatureModal && !returnSignature ? (
                  <div style={{
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center'
                  }}>
                    <button
                      type="button"
                      onClick={() => {
                        setShowSignatureModal(true);
                        // Kalibrasi canvas setelah modal terbuka
                        setTimeout(() => {
                          calibrateSignatureCanvas();
                        }, 200);
                      }}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '12px 20px',
                        backgroundColor: '#3b82f6',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        fontSize: '14px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        transition: 'background-color 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.backgroundColor = '#2563eb'}
                      onMouseOut={(e) => e.target.style.backgroundColor = '#3b82f6'}
                    >
                      <Edit3 size={16} />
                      Tambah Tanda Tangan
                    </button>
                  </div>
                ) : null}

                {showSignatureModal && (
                  <div style={{
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    padding: '16px',
                    backgroundColor: '#f9fafb',
                    marginTop: '12px'
                  }}>
                    <p style={{ 
                      fontSize: '14px', 
                      color: '#6b7280', 
                      marginBottom: '12px',
                      textAlign: 'center'
                    }}>
                      Silakan tanda tangan di kotak di bawah ini
                    </p>
                    <div style={{
                      border: '2px solid #d1d5db',
                      borderRadius: '12px',
                      backgroundColor: 'white',
                      padding: '8px',
                      display: 'flex',
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}>
                      <SignatureCanvas
                        ref={signatureRef}
                        canvasProps={{
                          width: 500,
                          height: 200,
                          style: {
                            width: '500px',
                            height: '200px',
                            borderRadius: '8px',
                            border: '2px solid #e2e8f0',
                            cursor: 'crosshair'
                          },
                          className: 'signature-canvas'
                        }}
                        backgroundColor="white"
                        penColor="#1e293b"
                        minWidth={1.5}
                        maxWidth={2.5}
                        throttle={8}
                        velocityFilterWeight={0.8}
                        dotSize={function() {
                          return (this.minWidth + this.maxWidth) / 2;
                        }}
                      />
                    </div>
                    <div style={{ 
                      display: 'flex', 
                      gap: '12px', 
                      marginTop: '16px', 
                      justifyContent: 'center',
                      flexWrap: 'wrap'
                    }}>
                      <button
                        type="button"
                        onClick={() => {
                          const signatureData = signatureRef.current.toDataURL('image/png', 1.0);
                          setReturnSignature(signatureData);
                          setReturnForm(prev => ({ ...prev, return_signature: signatureData }));
                          setShowSignatureModal(false);
                        }}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#16a34a',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(34, 197, 94, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#15803d';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#16a34a';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                        }}
                      >
                        <Save size={16} />
                        Simpan Tanda Tangan
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          signatureRef.current.clear();
                        }}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(245, 158, 11, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#d97706';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(245, 158, 11, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#f59e0b';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(245, 158, 11, 0.3)';
                        }}
                      >
                        <Eraser size={16} />
                        Hapus
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(false)}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '10px',
                          cursor: 'pointer',
                          fontSize: '14px',
                          fontWeight: '600',
                          transition: 'all 0.2s ease',
                          boxShadow: '0 4px 12px rgba(108, 117, 125, 0.3)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.backgroundColor = '#565e64';
                          e.target.style.transform = 'translateY(-1px)';
                          e.target.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.4)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.backgroundColor = '#6c757d';
                          e.target.style.transform = 'translateY(0)';
                          e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.3)';
                        }}
                      >
                        Batal
                      </button>
                    </div>
                  </div>
                )}

                {returnSignature && (
                  <div style={{ 
                    marginTop: '12px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <img
                      src={returnSignature}
                      alt="Return signature"
                      style={{
                        width: '200px',
                        height: '75px',
                        objectFit: 'contain',
                        borderRadius: '6px',
                        border: '1px solid #d1d5db',
                        backgroundColor: 'white'
                      }}
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setReturnSignature(null);
                        setReturnForm(prev => ({ ...prev, return_signature: null }));
                      }}
                      style={{
                        padding: '6px 12px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '12px'
                      }}
                    >
                      Remove
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Notes Section */}
            <div style={{ marginBottom: '28px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '10px',
                letterSpacing: '0.3px'
              }}>
                Catatan Pengembalian
              </label>
              <textarea
                value={returnForm.return_notes}
                onChange={(e) => setReturnForm(prev => ({ ...prev, return_notes: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  minHeight: '110px',
                  resize: 'vertical',
                  transition: 'all 0.2s ease',
                  outline: 'none',
                  backgroundColor: '#fafafa',
                  fontFamily: 'inherit'
                }}
                placeholder="Catatan opsional tentang proses pengembalian, kondisi barang, dll..."
                onFocus={(e) => {
                  e.target.style.borderColor = '#0d6efd';
                  e.target.style.backgroundColor = 'white';
                  e.target.style.boxShadow = '0 0 0 3px rgba(13, 110, 253, 0.1)';
                }}
                onBlur={(e) => {
                  e.target.style.borderColor = '#e2e8f0';
                  e.target.style.backgroundColor = '#fafafa';
                  e.target.style.boxShadow = 'none';
                }}
              />
            </div>
            
            {/* Action Buttons */}
            <div style={{ 
              display: 'flex', 
              gap: '16px', 
              justifyContent: 'center',
              paddingTop: '24px',
              borderTop: '2px solid #f1f5f9'
            }}>
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnPhoto(null);
                  setReturnSignature(null);
                  setShowWebcam(false);
                  setShowSignatureModal(false);
                  setReturnForm({
                    claimer_name: '',
                    claimer_contact: '',
                    claimer_id_number: '',
                    relationship_to_owner: 'owner',
                    return_notes: '',
                    return_photo: null,
                    return_signature: null
                  });
                }}
                style={{
                  padding: '14px 28px',
                  backgroundColor: '#6c757d',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  boxShadow: '0 4px 12px rgba(108, 117, 125, 0.25)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.backgroundColor = '#565e64';
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(108, 117, 125, 0.35)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.backgroundColor = '#6c757d';
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(108, 117, 125, 0.25)';
                }}
              >
                Batal
              </button>
              <button
                onClick={handleReturnSave}
                disabled={isUpdating || !returnForm.claimer_name || !returnForm.claimer_contact || !returnPhoto || !returnSignature}
                style={{
                  padding: '14px 28px',
                  backgroundColor: (isUpdating || !returnForm.claimer_name || !returnForm.claimer_contact || !returnPhoto || !returnSignature) ? '#9ca3af' : '#16a34a',
                  color: 'white',
                  border: 'none',
                  borderRadius: '12px',
                  cursor: (isUpdating || !returnForm.claimer_name || !returnForm.claimer_contact || !returnPhoto || !returnSignature) ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '600',
                  transition: 'all 0.2s ease',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  boxShadow: (isUpdating || !returnForm.claimer_name || !returnForm.claimer_contact || !returnPhoto || !returnSignature) ? 'none' : '0 4px 12px rgba(34, 197, 94, 0.3)'
                }}
                onMouseEnter={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#15803d';
                    e.target.style.transform = 'translateY(-1px)';
                    e.target.style.boxShadow = '0 6px 16px rgba(34, 197, 94, 0.4)';
                  }
                }}
                onMouseLeave={(e) => {
                  if (!e.target.disabled) {
                    e.target.style.backgroundColor = '#16a34a';
                    e.target.style.transform = 'translateY(0)';
                    e.target.style.boxShadow = '0 4px 12px rgba(34, 197, 94, 0.3)';
                  }
                }}
              >
                <CheckCircle size={16} />
                {isUpdating ? 'Memproses Pengembalian...' : 'Proses Pengembalian'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
