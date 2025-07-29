import { useState, useEffect, useRef, useCallback } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import SignatureCanvas from 'react-signature-canvas';
import { 
  Package, 
  Search, 
  Plus, 
  Calendar, 
  MapPin, 
  User, 
  Phone, 
  FileText, 
  Camera, 
  Upload,
  Save,
  RotateCcw,
  CheckCircle,
  Clock,
  AlertCircle,
  Eye,
  Edit3,
  Trash2,
  X,
  Eraser
} from 'lucide-react';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

export function LostItemsManagementPage() {
  const { user } = useAuth();
  const { alert } = useGlobalAlert();
  const navigate = useNavigate();
  const webcamRef = useRef(null);
  const signatureRef = useRef(null);
  const [isLoading, setIsLoading] = useState(false);
  const [lostItems, setLostItems] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  
  // Photo and signature states for registration
  const [handoverImage, setHandoverImage] = useState(null);
  const [handoverSignature, setHandoverSignature] = useState(null);
  const [handoverSignatureData, setHandoverSignatureData] = useState(null);
  
  // Modal states
  const [showWebcam, setShowWebcam] = useState(false);
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);
  
  // Form states for lost item registration
  const [lostItemForm, setLostItemForm] = useState({
    item_name: '',
    description: '',
    found_location: '',
    found_date: new Date().toISOString().split('T')[0],
    found_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
    finder_name: '',
    finder_contact: '',
    category: '',
    condition: 'good',
    handover_photo_url: '',
    notes: ''
  });

  useEffect(() => {
    fetchLostItems();
  }, []);

  const fetchLostItems = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/lost-items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        setLostItems(data.data || []);
      } else {
        console.error('Failed to fetch lost items');
      }
    } catch (error) {
      console.error('Error fetching lost items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleLostItemSubmit = async (e) => {
    e.preventDefault();
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      
      // Validate required fields
      if (!lostItemForm.item_name || !lostItemForm.found_location || !lostItemForm.found_date || !lostItemForm.found_time) {
        alert.warning('Harap lengkapi semua field yang wajib diisi');
        setIsLoading(false);
        return;
      }
      
      // Prepare submission data
      const submitData = {
        item_name: lostItemForm.item_name,
        description: lostItemForm.description,
        category: lostItemForm.category,
        found_location: lostItemForm.found_location,
        found_date: lostItemForm.found_date,
        found_time: lostItemForm.found_time,
        finder_name: lostItemForm.finder_name,
        finder_contact: lostItemForm.finder_contact,
        condition_status: lostItemForm.condition,
        handover_photo_url: handoverImage, // Fixed: match backend parameter name
        handover_signature_data: handoverSignatureData, // Fixed: match backend parameter name
        notes: lostItemForm.notes,
        input_by_user_id: user?.id,
        received_by_operator: user?.name,
        received_by_operator_id: user?.id
      };
      
      console.log('🔄 Submitting lost item data:', submitData);
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/lost-items`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(submitData)
      });

      const responseData = await response.json();
      console.log('📊 Lost item response:', responseData);

      if (response.ok) {
        alert.success('Barang hilang berhasil didaftarkan!');
        // Reset form
        setLostItemForm({
          item_name: '',
          description: '',
          found_location: '',
          found_date: new Date().toISOString().split('T')[0],
          found_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
          finder_name: '',
          finder_contact: '',
          category: '',
          condition: 'good',
          handover_photo_url: '',
          notes: ''
        });
        // Reset photo and signature
        setHandoverImage(null);
        setHandoverSignature(null);
        setHandoverSignatureData(null);
        fetchLostItems();
      } else {
        console.error('❌ Error submitting lost item:', responseData);
        if (responseData.message && responseData.message.includes('Data too long')) {
          alert.error('Error: Ukuran foto atau tanda tangan terlalu besar. Silakan coba lagi dengan gambar yang lebih kecil.');
        } else {
          alert.error(`Error: ${responseData.message || 'Terjadi kesalahan saat mendaftarkan barang'}`);
        }
      }
    } catch (error) {
      console.error('Error submitting lost item:', error);
      alert.error('Terjadi kesalahan');
    } finally {
      setIsLoading(false);
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

  // Helper functions
  const captureHandoverPhoto = useCallback(async () => {
    const imageSrc = webcamRef.current?.getScreenshot();
    if (imageSrc) {
      const flippedImage = await flipImageHorizontally(imageSrc);
      setHandoverImage(flippedImage);
      setShowWebcam(false);
      setShowPhotoModal(false);
    }
  }, []);

  const uploadHandoverPhoto = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setHandoverImage(e.target.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const saveHandoverSignature = () => {
    if (signatureRef.current) {
      const canvas = signatureRef.current.getCanvas();
      const signatureData = canvas.toDataURL();
      setHandoverSignatureData(signatureData);
      setShowSignatureModal(false);
    }
  };

  const clearHandoverSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
    }
  };

  const resetLostItemForm = () => {
    setLostItemForm({
      item_name: '',
      description: '',
      found_location: '',
      found_date: new Date().toISOString().split('T')[0],
      found_time: new Date().toTimeString().split(' ')[0].slice(0, 5),
      finder_name: '',
      finder_contact: '',
      category: '',
      condition: 'good',
      handover_photo_url: '',
      notes: ''
    });
    setHandoverImage(null);
    setHandoverSignature(null);
    setHandoverSignatureData(null);
  };

  // Filter items for search
  const filteredItems = lostItems.filter(item =>
    item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.found_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    item.category?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const categories = [
    { value: '', label: 'Pilih kategori' },
    { value: 'Elektronik', label: 'Elektronik' },
    { value: 'Dokumen', label: 'Dokumen' },
    { value: 'Kunci', label: 'Kunci' },
    { value: 'Dompet/Tas', label: 'Dompet/Tas' },
    { value: 'Aksesoris', label: 'Aksesoris' },
    { value: 'Pakaian', label: 'Pakaian' },
    { value: 'Kacamata', label: 'Kacamata' },
    { value: 'Perhiasan', label: 'Perhiasan' },
    { value: 'Alat Tulis', label: 'Alat Tulis' },
    { value: 'Lainnya', label: 'Lainnya' }
  ];

  const conditions = [
    { value: 'excellent', label: 'Sangat Baik' },
    { value: 'good', label: 'Baik' },
    { value: 'fair', label: 'Cukup' },
    { value: 'poor', label: 'Rusak' }
  ];

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

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <h1 style={{ 
          fontSize: '28px', 
          fontWeight: '600', 
          color: '#212529', 
          margin: 0,
          marginBottom: '8px',
          display: 'flex',
          alignItems: 'center',
          gap: '16px'
        }}>
          <div style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: '48px',
            height: '48px',
            backgroundColor: '#eff6ff',
            borderRadius: '16px',
            boxShadow: '0 4px 12px rgba(13, 110, 253, 0.15)'
          }}>
            <Package size={28} style={{ color: '#0d6efd' }} />
          </div>
          Manajemen Barang Hilang
        </h1>
        <p style={{ color: '#6c757d', fontSize: '16px', margin: 0, paddingLeft: '64px' }}>
          Mendaftarkan dan mengelola barang hilang yang ditemukan di kampus
        </p>
      </div>

      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: '1fr 400px', 
        gap: '24px',
        alignItems: 'start'
      }}>
        {/* Main Form Area */}
        <div style={{
          backgroundColor: 'white',
          borderRadius: '20px',
          padding: '36px',
          boxShadow: '0 8px 32px rgba(0, 0, 0, 0.08)',
          border: '1px solid #e5e7eb',
          transition: 'all 0.3s ease'
        }}>
          {/* Lost Item Registration Form */}
          <form onSubmit={handleLostItemSubmit}>
            <h3 style={{ 
              fontSize: '22px', 
              fontWeight: '700', 
              color: '#1e293b',
              marginBottom: '28px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: '#eff6ff',
                borderRadius: '12px',
                boxShadow: '0 4px 8px rgba(13, 110, 253, 0.2)'
              }}>
                <Package size={22} style={{ color: '#0d6efd' }} />
              </div>
              Daftarkan Barang Hilang
            </h3>

            {/* Basic Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>
                  Nama Barang *
                </label>
                <input
                  type="text"
                  required
                  value={lostItemForm.item_name}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, item_name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fafafa'
                  }}
                  placeholder="Barang apa yang ditemukan?"
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
                  Kategori
                </label>
                <select
                  value={lostItemForm.category}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, category: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fafafa',
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
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#1e293b',
                marginBottom: '10px',
                letterSpacing: '0.3px'
              }}>
                Deskripsi
              </label>
              <textarea
                value={lostItemForm.description}
                onChange={(e) => setLostItemForm(prev => ({ ...prev, description: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '14px 16px',
                  border: '2px solid #e2e8f0',
                  borderRadius: '12px',
                  fontSize: '14px',
                  minHeight: '100px',
                  resize: 'vertical',
                  transition: 'all 0.2s ease',
                  backgroundColor: '#fafafa',
                  fontFamily: 'inherit'
                }}
                placeholder="Deskripsikan barang secara detail..."
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

            {/* Location and Time */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>
                  Lokasi Ditemukan *
                </label>
                <input
                  type="text"
                  required
                  value={lostItemForm.found_location}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, found_location: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fafafa'
                  }}
                  placeholder="Dimana barang ditemukan?"
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
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Tanggal Ditemukan *
                </label>
                <input
                  type="date"
                  required
                  value={lostItemForm.found_date}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, found_date: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Waktu Ditemukan *
                </label>
                <input
                  type="time"
                  required
                  value={lostItemForm.found_time}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, found_time: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                />
              </div>
            </div>

            {/* Finder Information */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '24px', marginBottom: '24px' }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '600', 
                  color: '#1e293b',
                  marginBottom: '10px',
                  letterSpacing: '0.3px'
                }}>
                  Nama Penemu
                </label>
                <input
                  type="text"
                  value={lostItemForm.finder_name}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, finder_name: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '14px 16px',
                    border: '2px solid #e2e8f0',
                    borderRadius: '12px',
                    fontSize: '14px',
                    transition: 'all 0.2s ease',
                    backgroundColor: '#fafafa'
                  }}
                  placeholder="Siapa yang menemukan?"
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
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Kontak Penemu
                </label>
                <input
                  type="text"
                  value={lostItemForm.finder_contact}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, finder_contact: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                  placeholder="Nomor kontak"
                />
              </div>

              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#374151',
                  marginBottom: '8px'
                }}>
                  Kondisi
                </label>
                <select
                  value={lostItemForm.condition}
                  onChange={(e) => setLostItemForm(prev => ({ ...prev, condition: e.target.value }))}
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #d1d5db',
                    borderRadius: '8px',
                    fontSize: '14px'
                  }}
                >
                  {conditions.map(cond => (
                    <option key={cond.value} value={cond.value}>{cond.label}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Photo Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '16px',
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
                📸 Dokumentasi Foto Barang
              </h4>
              
              <div style={{
                border: '2px dashed #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: '#fafafa',
                textAlign: 'center'
              }}>
                {!handoverImage ? (
                  <>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#f1f5f9',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <Camera size={28} style={{ color: '#64748b' }} />
                      </div>
                      
                      <div>
                        <p style={{ 
                          color: '#374151', 
                          fontSize: '16px', 
                          fontWeight: '500',
                          margin: '0 0 4px 0'
                        }}>
                          Ambil Foto Barang
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          Foto dokumentasi barang yang ditemukan
                        </p>
                      </div>
                      
                      <div style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '12px',
                        flexWrap: 'wrap',
                        justifyContent: 'center'
                      }}>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPhotoModal(true);
                            setShowWebcam(true);
                          }}
                          style={{
                            padding: '12px 20px',
                            backgroundColor: '#0d6efd',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '14px',
                            fontWeight: '500',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            transition: 'all 0.2s ease'
                          }}
                          onMouseOver={(e) => e.target.style.backgroundColor = '#0056b3'}
                          onMouseOut={(e) => e.target.style.backgroundColor = '#0d6efd'}
                        >
                          <Camera size={16} />
                          Ambil Foto
                        </button>
                        
                        <span style={{ 
                          color: '#9ca3af', 
                          fontSize: '14px',
                          fontWeight: '500'
                        }}>atau</span>
                        
                        <label style={{
                          padding: '12px 20px',
                          backgroundColor: '#6c757d',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}>
                          <Upload size={16} />
                          Unggah Foto
                          <input 
                            type="file" 
                            accept="image/*" 
                            onChange={uploadHandoverPhoto}
                            style={{ display: 'none' }}
                          />
                        </label>
                      </div>
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      position: 'relative',
                      border: '3px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: 'white'
                    }}>
                      <img 
                        src={handoverImage} 
                        alt="Pratinjau barang" 
                        style={{ 
                          width: '280px', 
                          height: '200px',
                          objectFit: 'cover'
                        }} 
                      />
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#059669',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <CheckCircle size={16} />
                      Foto berhasil diambil
                    </div>
                    
                    <button
                      type="button"
                      onClick={() => setHandoverImage(null)}
                      style={{
                        padding: '8px 16px',
                        backgroundColor: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '12px',
                        fontWeight: '500',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '6px'
                      }}
                    >
                      <X size={14} />
                      Hapus Foto
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Signature Section */}
            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ 
                fontSize: '16px', 
                fontWeight: '600', 
                color: '#374151',
                marginBottom: '16px',
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
                  backgroundColor: '#f0f9f4',
                  borderRadius: '8px'
                }}>
                  <FileText size={18} style={{ color: '#198754' }} />
                </div>
                ✍️ Tanda Tangan Digital
              </h4>
              
              <div style={{
                border: '2px dashed #e5e7eb',
                borderRadius: '12px',
                padding: '20px',
                backgroundColor: '#fafafa',
                textAlign: 'center'
              }}>
                {!handoverSignatureData ? (
                  <>
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '16px'
                    }}>
                      <div style={{
                        width: '64px',
                        height: '64px',
                        backgroundColor: '#f0f9f4',
                        borderRadius: '50%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}>
                        <FileText size={28} style={{ color: '#22c55e' }} />
                      </div>
                      
                      <div>
                        <p style={{ 
                          color: '#374151', 
                          fontSize: '16px', 
                          fontWeight: '500',
                          margin: '0 0 4px 0'
                        }}>
                          Tambah Tanda Tangan
                        </p>
                        <p style={{ 
                          color: '#6b7280', 
                          fontSize: '14px',
                          margin: 0
                        }}>
                          Tanda tangan digital penemu barang
                        </p>
                      </div>
                      
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        style={{
                          padding: '12px 20px',
                          backgroundColor: '#198754',
                          color: 'white',
                          border: 'none',
                          borderRadius: '8px',
                          fontSize: '14px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s ease'
                        }}
                        onMouseOver={(e) => e.target.style.backgroundColor = '#166534'}
                        onMouseOut={(e) => e.target.style.backgroundColor = '#198754'}
                      >
                        <FileText size={16} />
                        Tambah Tanda Tangan
                      </button>
                    </div>
                  </>
                ) : (
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{
                      position: 'relative',
                      border: '3px solid #e5e7eb',
                      borderRadius: '12px',
                      overflow: 'hidden',
                      backgroundColor: 'white',
                      padding: '8px'
                    }}>
                      <img 
                        src={handoverSignatureData} 
                        alt="Pratinjau tanda tangan" 
                        style={{ 
                          maxWidth: '350px', 
                          maxHeight: '120px',
                          objectFit: 'contain'
                        }} 
                      />
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      color: '#059669',
                      fontSize: '14px',
                      fontWeight: '500'
                    }}>
                      <CheckCircle size={16} />
                      Tanda tangan berhasil dibuat
                    </div>
                    
                    <div style={{
                      display: 'flex',
                      gap: '8px'
                    }}>
                      <button
                        type="button"
                        onClick={() => setShowSignatureModal(true)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#f59e0b',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <Edit3 size={14} />
                        Edit
                      </button>
                      
                      <button
                        type="button"
                        onClick={() => setHandoverSignatureData(null)}
                        style={{
                          padding: '8px 16px',
                          backgroundColor: '#ef4444',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          fontSize: '12px',
                          fontWeight: '500',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '6px'
                        }}
                      >
                        <X size={14} />
                        Hapus
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Notes */}
            <div style={{ marginBottom: '24px' }}>
              <label style={{ 
                display: 'block', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#374151',
                marginBottom: '8px'
              }}>
                Catatan Tambahan
              </label>
              <textarea
                value={lostItemForm.notes}
                onChange={(e) => setLostItemForm(prev => ({ ...prev, notes: e.target.value }))}
                style={{
                  width: '100%',
                  padding: '12px',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  minHeight: '80px',
                  resize: 'vertical'
                }}
                placeholder="Informasi tambahan lainnya..."
              />
            </div>

            {/* Form Actions */}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button
                type="submit"
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: isLoading ? '#9ca3af' : '#0d6efd',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <Save size={16} />
                {isLoading ? 'Menyimpan...' : 'Daftarkan Barang'}
              </button>
              
              <button
                type="button"
                onClick={resetLostItemForm}
                disabled={isLoading}
                style={{
                  padding: '12px 24px',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  border: '1px solid #d1d5db',
                  borderRadius: '8px',
                  fontSize: '14px',
                  fontWeight: '600',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px'
                }}
              >
                <RotateCcw size={16} />
                Reset
              </button>
            </div>
          </form>
        </div>

        {/* Sidebar - Recent Items */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
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
              <Package size={16} style={{ color: '#0d6efd' }} />
              Barang Terbaru
            </h4>

            {/* Search field for Barang Terbaru */}
            <div style={{ position: 'relative', marginBottom: '16px' }}>
              <Search 
                size={14} 
                style={{ 
                  position: 'absolute', 
                  left: '10px', 
                  top: '50%', 
                  transform: 'translateY(-50%)', 
                  color: '#6c757d' 
                }} 
              />
              <input
                type="text"
                placeholder="Cari barang..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '8px 12px 8px 32px',
                  border: '1px solid #d1d5db',
                  borderRadius: '6px',
                  fontSize: '12px',
                  backgroundColor: '#f8f9fa'
                }}
              />
            </div>

            <div style={{ maxHeight: '400px', overflowY: 'auto' }}>
              {filteredItems.slice(0, 5).map(item => {
                const statusColor = getStatusColor(item.status);
                return (
                  <div 
                    key={item.id}
                    style={{
                      padding: '12px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      marginBottom: '8px',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onClick={() => navigate(`/app/lost-items/detail/${item.id}`)}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '4px' }}>
                      <h6 style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#212529',
                        margin: 0,
                        lineHeight: '1.2'
                      }}>
                        {item.item_name}
                      </h6>
                      <span style={{
                        padding: '2px 6px',
                        borderRadius: '8px',
                        fontSize: '10px',
                        fontWeight: '600',
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '3px'
                      }}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </div>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      margin: 0,
                      lineHeight: '1.3'
                    }}>
                      📍 {item.found_location}
                    </p>
                    <p style={{ 
                      fontSize: '12px', 
                      color: '#6c757d',
                      margin: 0,
                      marginTop: '2px'
                    }}>
                      📅 {item.found_date ? new Date(item.found_date).toLocaleDateString('id-ID') : 'N/A'}
                    </p>
                  </div>
                );
              })}
              
              {filteredItems.length === 0 && (
                <p style={{ 
                  color: '#9ca3af', 
                  fontSize: '14px', 
                  textAlign: 'center',
                  margin: '20px 0'
                }}>
                  Belum ada barang
                </p>
              )}
            </div>

            <button
              onClick={() => navigate('/app/lost-items/data')}
              style={{
                width: '100%',
                padding: '10px',
                marginTop: '12px',
                backgroundColor: 'transparent',
                color: '#0d6efd',
                border: '1px solid #0d6efd',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px'
              }}
            >
              <Eye size={16} />
              Lihat Semua Barang
            </button>
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
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
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Ambil Foto Barang</h3>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setShowWebcam(false);
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            {showWebcam && (
              <div style={{ textAlign: 'center' }}>
                <Webcam
                  ref={webcamRef}
                  audio={false}
                  screenshotFormat="image/jpeg"
                  width={400}
                  height={300}
                  style={{ 
                    borderRadius: '8px', 
                    marginBottom: '16px',
                    transform: 'scaleX(-1)'
                  }}
                />
                <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                  <button
                    onClick={captureHandoverPhoto}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Ambil Foto
                  </button>
                  <button
                    onClick={() => {
                      setShowPhotoModal(false);
                      setShowWebcam(false);
                    }}
                    style={{
                      padding: '10px 20px',
                      backgroundColor: '#6c757d',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer'
                    }}
                  >
                    Batal
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
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
            width: '90%'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ fontSize: '18px', fontWeight: '600', margin: 0 }}>Tanda Tangan Digital</h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                style={{
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: '4px'
                }}
              >
                <X size={20} />
              </button>
            </div>
            
            <div style={{ textAlign: 'center' }}>
              <p style={{ 
                fontSize: '14px', 
                color: '#6b7280', 
                marginBottom: '16px',
                textAlign: 'center'
              }}>
                Silakan tanda tangan di area kotak di bawah ini
              </p>
              <div style={{ 
                border: '2px dashed #d1d5db', 
                borderRadius: '8px', 
                marginBottom: '16px',
                backgroundColor: '#f9fafb'
              }}>
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    style: { borderRadius: '8px' }
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={saveHandoverSignature}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#198754',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Save size={16} />
                  Simpan Tanda Tangan
                </button>
                <button
                  onClick={clearHandoverSignature}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#ffc107',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Eraser size={16} />
                  Hapus
                </button>
                <button
                  onClick={() => setShowSignatureModal(false)}
                  style={{
                    padding: '10px 20px',
                    backgroundColor: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer'
                  }}
                >
                  Batal
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
