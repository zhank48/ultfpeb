import { useState, useEffect, useRef } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  AlertTriangle, 
  Send, 
  CheckCircle, 
  ArrowLeft,
  ArrowRight,
  User,
  Mail,
  Phone,
  MessageSquare,
  Camera,
  Upload,
  X,
  Image,
  RefreshCw,
  Shield,
  Clock,
  FileText,
  ChevronRight,
  Star,
  AlertCircle
} from 'lucide-react';
import Webcam from 'react-webcam';
import { complaintsAPI } from '../utils/api.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { DynamicFieldRenderer } from '../components/DynamicFieldRenderer.jsx';

export function ComplaintFormPageImproved() {
  const { alert } = useGlobalAlert();
  const navigate = useNavigate();
  
  // Multi-step form state
  const [currentStep, setCurrentStep] = useState(1);
  const totalSteps = 4;
  
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  
  // Photo states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [photos, setPhotos] = useState([]);
  const MAX_PHOTOS = 3;
  
  // Form validation states
  const [errors, setErrors] = useState({});
  const [touchedFields, setTouchedFields] = useState({});
  
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    category_id: '',
    priority: 'medium',
    subject: '',
    description: '',
    form_data: {},
    urgency_reason: '' // New field for urgent complaints
  });

  const webcamRef = useRef(null);

  useEffect(() => {
    fetchCategories();
    fetchFields();
  }, []);

  const fetchCategories = async () => {
    try {
      const response = await complaintsAPI.getCategories();
      if (response.success && response.data) {
        setCategories(response.data);
      }
    } catch (error) {
      console.error('Error fetching categories:', error);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await complaintsAPI.getFields();
      if (response.success && response.data) {
        setFields(response.data);
      }
    } catch (error) {
      console.error('Error fetching fields:', error);
    }
  };

  // Improved validation with real-time feedback
  const validateStep = (step) => {
    const newErrors = {};
    setTouchedFields({});

    switch (step) {
      case 1:
        if (!formData.visitor_name.trim()) {
          newErrors.visitor_name = 'Nama lengkap wajib diisi';
        } else if (formData.visitor_name.length < 3) {
          newErrors.visitor_name = 'Nama minimal 3 karakter';
        }

        if (!formData.visitor_email.trim()) {
          newErrors.visitor_email = 'Email wajib diisi';
        } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.visitor_email)) {
          newErrors.visitor_email = 'Format email tidak valid';
        }

        if (formData.visitor_phone && !/^[0-9+\-\s()]{10,15}$/.test(formData.visitor_phone)) {
          newErrors.visitor_phone = 'Format nomor telepon tidak valid';
        }
        break;

      case 2:
        if (!formData.category_id) {
          newErrors.category_id = 'Pilih kategori aduan';
        }

        if (!formData.subject.trim()) {
          newErrors.subject = 'Subjek aduan wajib diisi';
        } else if (formData.subject.length < 10) {
          newErrors.subject = 'Subjek minimal 10 karakter';
        }

        if (!formData.description.trim()) {
          newErrors.description = 'Deskripsi aduan wajib diisi';
        } else if (formData.description.length < 20) {
          newErrors.description = 'Deskripsi minimal 20 karakter untuk kejelasan';
        }

        if (formData.priority === 'urgent' && !formData.urgency_reason.trim()) {
          newErrors.urgency_reason = 'Alasan urgensi wajib diisi untuk aduan urgent';
        }

        // Validate dynamic fields
        fields.forEach(field => {
          if (field.is_required && !formData.form_data[field.field_name]) {
            newErrors[field.field_name] = `${field.field_label} wajib diisi`;
          }
        });
        break;

      case 3:
        // Photos are optional, no validation needed
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, totalSteps));
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Real-time validation
    if (touchedFields[field]) {
      const tempData = { ...formData, [field]: value };
      const tempErrors = { ...errors };
      
      // Simple field validation
      switch (field) {
        case 'visitor_name':
          if (!value.trim()) {
            tempErrors.visitor_name = 'Nama lengkap wajib diisi';
          } else if (value.length < 3) {
            tempErrors.visitor_name = 'Nama minimal 3 karakter';
          } else {
            delete tempErrors.visitor_name;
          }
          break;
        case 'visitor_email':
          if (!value.trim()) {
            tempErrors.visitor_email = 'Email wajib diisi';
          } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
            tempErrors.visitor_email = 'Format email tidak valid';
          } else {
            delete tempErrors.visitor_email;
          }
          break;
        case 'subject':
          if (!value.trim()) {
            tempErrors.subject = 'Subjek aduan wajib diisi';
          } else if (value.length < 10) {
            tempErrors.subject = 'Subjek minimal 10 karakter';
          } else {
            delete tempErrors.subject;
          }
          break;
        case 'description':
          if (!value.trim()) {
            tempErrors.description = 'Deskripsi aduan wajib diisi';
          } else if (value.length < 20) {
            tempErrors.description = 'Deskripsi minimal 20 karakter untuk kejelasan';
          } else {
            delete tempErrors.description;
          }
          break;
      }
      
      setErrors(tempErrors);
    }
  };

  const handleFieldBlur = (field) => {
    setTouchedFields(prev => ({ ...prev, [field]: true }));
    
    // Trigger validation for this field
    const tempData = { ...formData };
    handleInputChange(field, tempData[field]);
  };

  const handleSubmit = async () => {
    if (!validateStep(2)) {
      setCurrentStep(2);
      return;
    }

    setLoading(true);
    try {
      const formDataToSend = new FormData();
      
      // Add basic form fields
      formDataToSend.append('complainant_name', formData.visitor_name);
      formDataToSend.append('complainant_email', formData.visitor_email);
      formDataToSend.append('complainant_phone', formData.visitor_phone);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('description', formData.description);
      
      if (formData.urgency_reason) {
        formDataToSend.append('urgency_reason', formData.urgency_reason);
      }
      
      // Add dynamic form data
      if (Object.keys(formData.form_data).length > 0) {
        formDataToSend.append('form_data', JSON.stringify(formData.form_data));
      }
      
      // Add photos
      if (photos.length > 0) {
        photos.forEach((photo) => {
          if (photo.file) {
            formDataToSend.append('complaint_photos', photo.file);
          }
        });
      }
      
      const response = await complaintsAPI.submitWithFile(formDataToSend);
      if (response.success) {
        setSubmitted(true);
        setTicketNumber(response.data.ticket_number);
      } else {
        throw new Error(response.message || 'Gagal mengirim aduan');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert.error('Gagal mengirim aduan. Silakan coba lagi.');
    } finally {
      setLoading(false);
    }
  };

  // Photo functions
  const handlePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    
    files.forEach((file, index) => {
      if (photos.length + index < MAX_PHOTOS) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoData = {
            id: `${Date.now()}-${index}`,
            preview: e.target.result,
            file: file,
            name: file.name
          };
          setPhotos(prev => [...prev, photoData]);
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const capturePhoto = () => {
    if (photos.length >= MAX_PHOTOS) {
      alert.warning(`Maksimal ${MAX_PHOTOS} foto`);
      return;
    }
    
    const imageSrc = webcamRef.current.getScreenshot();
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `foto-aduan-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const photoData = {
          id: `${Date.now()}-camera`,
          preview: imageSrc,
          file: file,
          name: file.name
        };
        setPhotos(prev => [...prev, photoData]);
        setShowWebcam(false);
        setShowPhotoModal(false);
      });
  };

  const removePhoto = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  // Enhanced styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f8fafc',
      padding: '20px'
    },
    card: {
      backgroundColor: 'white',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0, 0, 0, 0.1)',
      margin: '0 auto',
      maxWidth: '800px',
      overflow: 'hidden'
    },
    header: {
      background: 'linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%)',
      color: 'white',
      padding: '32px',
      textAlign: 'center',
      position: 'relative'
    },
    backButton: {
      position: 'absolute',
      top: '24px',
      left: '24px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '12px',
      color: 'white',
      padding: '12px 16px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      fontSize: '14px',
      textDecoration: 'none',
      transition: 'all 0.3s ease',
      backdropFilter: 'blur(10px)'
    },
    progressContainer: {
      backgroundColor: '#f1f5f9',
      padding: '24px 32px',
      borderBottom: '1px solid #e2e8f0'
    },
    progressBar: {
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginBottom: '16px'
    },
    progressStep: {
      display: 'flex',
      alignItems: 'center',
      gap: '12px',
      fontSize: '14px',
      fontWeight: '500'
    },
    stepNumber: {
      width: '32px',
      height: '32px',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '14px',
      fontWeight: '600',
      transition: 'all 0.3s ease'
    },
    stepActive: {
      backgroundColor: '#3b82f6',
      color: 'white'
    },
    stepCompleted: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    stepInactive: {
      backgroundColor: '#e2e8f0',
      color: '#64748b'
    },
    content: {
      padding: '32px'
    },
    formGroup: {
      marginBottom: '24px'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '600',
      color: '#374151',
      marginBottom: '8px'
    },
    input: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      outline: 'none'
    },
    inputFocus: {
      border: '2px solid #3b82f6',
      boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.1)'
    },
    inputError: {
      border: '2px solid #ef4444',
      boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)'
    },
    inputSuccess: {
      border: '2px solid #10b981',
      boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)'
    },
    error: {
      color: '#ef4444',
      fontSize: '14px',
      marginTop: '6px',
      display: 'flex',
      alignItems: 'center',
      gap: '4px'
    },
    textarea: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      minHeight: '120px',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'all 0.3s ease',
      boxSizing: 'border-box',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      outline: 'none',
      cursor: 'pointer'
    },
    priorityGrid: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))',
      gap: '12px',
      marginTop: '8px'
    },
    priorityOption: {
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      textAlign: 'center',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      fontSize: '14px',
      fontWeight: '500'
    },
    priorityActive: {
      border: '2px solid #3b82f6',
      backgroundColor: '#dbeafe',
      color: '#1d4ed8'
    },
    photoGallery: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))',
      gap: '16px',
      marginBottom: '24px'
    },
    photoItem: {
      position: 'relative',
      aspect: '1',
      borderRadius: '12px',
      overflow: 'hidden',
      border: '2px solid #e5e7eb'
    },
    photoImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover'
    },
    removeButton: {
      position: 'absolute',
      top: '8px',
      right: '8px',
      width: '28px',
      height: '28px',
      borderRadius: '50%',
      border: 'none',
      backgroundColor: 'rgba(239, 68, 68, 0.9)',
      color: 'white',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center'
    },
    uploadArea: {
      border: '2px dashed #d1d5db',
      borderRadius: '16px',
      padding: '32px',
      textAlign: 'center',
      backgroundColor: '#f9fafb',
      transition: 'all 0.3s ease'
    },
    uploadButtons: {
      display: 'flex',
      gap: '12px',
      justifyContent: 'center',
      flexWrap: 'wrap',
      marginTop: '16px'
    },
    navigationButtons: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: '24px 32px',
      backgroundColor: '#f8fafc',
      borderTop: '1px solid #e2e8f0'
    },
    button: {
      padding: '12px 24px',
      border: 'none',
      borderRadius: '12px',
      fontSize: '16px',
      fontWeight: '600',
      cursor: 'pointer',
      transition: 'all 0.3s ease',
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
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
    successButton: {
      backgroundColor: '#10b981',
      color: 'white'
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
      padding: '32px',
      maxWidth: '500px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto'
    }
  };

  const stepTitles = [
    'Informasi Personal',
    'Detail Aduan',
    'Lampiran Foto', 
    'Konfirmasi'
  ];

  const getInputStyle = (fieldName) => {
    if (errors[fieldName]) return { ...styles.input, ...styles.inputError };
    if (touchedFields[fieldName] && !errors[fieldName] && formData[fieldName]) {
      return { ...styles.input, ...styles.inputSuccess };
    }
    return styles.input;
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.card}>
          <div style={{
            padding: '64px 32px',
            textAlign: 'center',
            background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)',
            color: 'white'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px'
            }}>
              <CheckCircle size={40} />
            </div>
            <h2 style={{ fontSize: '28px', fontWeight: '700', marginBottom: '16px' }}>
              Aduan Berhasil Dikirim!
            </h2>
            <p style={{ fontSize: '18px', opacity: 0.9, marginBottom: '24px' }}>
              Aduan Anda telah diterima dengan nomor tiket:
            </p>
            <div style={{
              backgroundColor: 'rgba(255, 255, 255, 0.2)',
              padding: '16px 24px',
              borderRadius: '12px',
              fontSize: '24px',
              fontWeight: '700',
              marginBottom: '32px',
              backdropFilter: 'blur(10px)'
            }}>
              #{ticketNumber}
            </div>
            <p style={{ fontSize: '16px', opacity: 0.8, marginBottom: '32px' }}>
              Kami akan mengirimkan update status aduan melalui email yang telah Anda berikan.
            </p>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
              <Link
                to="/app/dashboard"
                style={{
                  ...styles.button,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <ArrowLeft size={20} />
                Dashboard
              </Link>
              <Link
                to="/app/complaint-management"
                style={{
                  ...styles.button,
                  backgroundColor: 'rgba(255, 255, 255, 0.2)',
                  color: 'white',
                  backdropFilter: 'blur(10px)'
                }}
              >
                <Settings size={20} />
                Kelola Aduan
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      <div style={styles.card}>
        {/* Header */}
        <div style={styles.header}>
          <Link to="/app/dashboard" style={styles.backButton}>
            <ArrowLeft size={16} />
            Kembali
          </Link>
          <h1 style={{
            fontSize: '32px',
            fontWeight: '700',
            margin: '0 0 12px 0',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px'
          }}>
            <MessageSquare size={36} />
            Form Pengaduan
          </h1>
          <p style={{ fontSize: '18px', opacity: 0.9, margin: 0 }}>
            Bantu kami meningkatkan layanan dengan aduan Anda
          </p>
        </div>

        {/* Progress Bar */}
        <div style={styles.progressContainer}>
          <div style={styles.progressBar}>
            {Array.from({ length: totalSteps }, (_, index) => {
              const stepNum = index + 1;
              const isActive = stepNum === currentStep;
              const isCompleted = stepNum < currentStep;
              
              return (
                <div key={stepNum} style={styles.progressStep}>
                  <div style={{
                    ...styles.stepNumber,
                    ...(isActive ? styles.stepActive : 
                        isCompleted ? styles.stepCompleted : styles.stepInactive)
                  }}>
                    {isCompleted ? <CheckCircle size={16} /> : stepNum}
                  </div>
                  <span style={{ 
                    color: isActive ? '#3b82f6' : isCompleted ? '#10b981' : '#64748b',
                    fontWeight: isActive ? '600' : '500'
                  }}>
                    {stepTitles[index]}
                  </span>
                  {stepNum < totalSteps && (
                    <ChevronRight size={16} style={{ 
                      color: '#d1d5db', 
                      marginLeft: '12px' 
                    }} />
                  )}
                </div>
              );
            })}
          </div>
          <div style={{
            backgroundColor: '#e2e8f0',
            height: '4px',
            borderRadius: '2px',
            overflow: 'hidden'
          }}>
            <div style={{
              backgroundColor: '#3b82f6',
              height: '100%',
              width: `${(currentStep / totalSteps) * 100}%`,
              transition: 'width 0.3s ease'
            }} />
          </div>
        </div>

        {/* Step Content */}
        <div style={styles.content}>
          {/* Step 1: Personal Information */}
          {currentStep === 1 && (
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '24px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <User size={24} style={{ color: '#3b82f6' }} />
                Informasi Personal
              </h3>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nama Lengkap <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.visitor_name}
                    onChange={(e) => handleInputChange('visitor_name', e.target.value)}
                    onBlur={() => handleFieldBlur('visitor_name')}
                    style={getInputStyle('visitor_name')}
                    placeholder="Masukkan nama lengkap Anda"
                  />
                  {errors.visitor_name && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.visitor_name}
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Email <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="email"
                    value={formData.visitor_email}
                    onChange={(e) => handleInputChange('visitor_email', e.target.value)}
                    onBlur={() => handleFieldBlur('visitor_email')}
                    style={getInputStyle('visitor_email')}
                    placeholder="contoh@email.com"
                  />
                  {errors.visitor_email && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.visitor_email}
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Nomor Telepon</label>
                  <input
                    type="tel"
                    value={formData.visitor_phone}
                    onChange={(e) => handleInputChange('visitor_phone', e.target.value)}
                    onBlur={() => handleFieldBlur('visitor_phone')}
                    style={getInputStyle('visitor_phone')}
                    placeholder="08xxxxxxxxxx"
                  />
                  {errors.visitor_phone && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.visitor_phone}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Step 2: Complaint Details */}
          {currentStep === 2 && (
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '24px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <MessageSquare size={24} style={{ color: '#3b82f6' }} />
                Detail Aduan
              </h3>
              
              <div style={{ display: 'grid', gap: '24px' }}>
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Kategori <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <select
                    value={formData.category_id}
                    onChange={(e) => handleInputChange('category_id', e.target.value)}
                    style={getInputStyle('category_id')}
                  >
                    <option value="">Pilih kategori aduan</option>
                    {categories.map((category) => (
                      <option key={category.id} value={category.id}>
                        {category.name}
                      </option>
                    ))}
                  </select>
                  {errors.category_id && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.category_id}
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>Tingkat Prioritas</label>
                  <div style={styles.priorityGrid}>
                    {[
                      { value: 'low', label: 'Rendah', color: '#10b981' },
                      { value: 'medium', label: 'Sedang', color: '#f59e0b' },
                      { value: 'high', label: 'Tinggi', color: '#f97316' },
                      { value: 'urgent', label: 'Urgent', color: '#ef4444' }
                    ].map((priority) => (
                      <div
                        key={priority.value}
                        onClick={() => handleInputChange('priority', priority.value)}
                        style={{
                          ...styles.priorityOption,
                          ...(formData.priority === priority.value ? 
                              { ...styles.priorityActive, borderColor: priority.color } : {})
                        }}
                      >
                        <Star size={16} style={{ 
                          color: formData.priority === priority.value ? priority.color : '#9ca3af',
                          marginBottom: '4px'
                        }} />
                        <div>{priority.label}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {formData.priority === 'urgent' && (
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Alasan Urgensi <span style={{ color: '#ef4444' }}>*</span>
                    </label>
                    <textarea
                      value={formData.urgency_reason}
                      onChange={(e) => handleInputChange('urgency_reason', e.target.value)}
                      style={{ ...styles.textarea, minHeight: '80px' }}
                      placeholder="Jelaskan mengapa aduan ini bersifat urgent..."
                    />
                    {errors.urgency_reason && (
                      <div style={styles.error}>
                        <AlertCircle size={16} />
                        {errors.urgency_reason}
                      </div>
                    )}
                  </div>
                )}

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Subjek Aduan <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    onBlur={() => handleFieldBlur('subject')}
                    style={getInputStyle('subject')}
                    placeholder="Ringkasan singkat masalah Anda"
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: formData.subject.length >= 10 ? '#10b981' : '#6b7280',
                    marginTop: '4px'
                  }}>
                    {formData.subject.length}/10 karakter minimum
                  </div>
                  {errors.subject && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.subject}
                    </div>
                  )}
                </div>

                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Deskripsi Detail <span style={{ color: '#ef4444' }}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    onBlur={() => handleFieldBlur('description')}
                    style={{ 
                      ...getInputStyle('description'), 
                      ...styles.textarea,
                      minHeight: '120px'
                    }}
                    placeholder="Jelaskan aduan Anda secara detail. Semakin jelas informasi yang Anda berikan, semakin cepat kami dapat membantu..."
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: formData.description.length >= 20 ? '#10b981' : '#6b7280',
                    marginTop: '4px'
                  }}>
                    {formData.description.length}/20 karakter minimum
                  </div>
                  {errors.description && (
                    <div style={styles.error}>
                      <AlertCircle size={16} />
                      {errors.description}
                    </div>
                  )}
                </div>

                {/* Dynamic Fields */}
                {fields.length > 0 && (
                  <div style={{ marginTop: '24px', padding: '20px', backgroundColor: '#f8f9fa', borderRadius: '12px', border: '1px solid #e9ecef' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                      <h4 style={{ margin: 0, fontSize: '16px', fontWeight: '600', color: '#495057', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <FileText size={18} />
                        Field Tambahan
                      </h4>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6c757d',
                        backgroundColor: '#e9ecef',
                        padding: '4px 8px',
                        borderRadius: '6px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <Settings size={12} />
                        {fields.length} field aktif
                      </div>
                    </div>
                    {fields.map((field) => (
                      <DynamicFieldRenderer
                        key={field.id}
                        field={field}
                        value={formData.form_data[field.field_name]}
                        onChange={(fieldName, value) => {
                          setFormData(prev => ({
                            ...prev,
                            form_data: { ...prev.form_data, [fieldName]: value }
                          }));
                        }}
                        error={errors[field.field_name]}
                        touched={touchedFields[field.field_name]}
                      />
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 3: Photo Upload */}
          {currentStep === 3 && (
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '16px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <Camera size={24} style={{ color: '#3b82f6' }} />
                Lampiran Foto (Opsional)
              </h3>
              <p style={{ 
                color: '#6b7280', 
                marginBottom: '32px',
                fontSize: '16px' 
              }}>
                Tambahkan foto untuk mendukung aduan Anda (maksimal {MAX_PHOTOS} foto)
              </p>
              
              {/* Photo Gallery */}
              {photos.length > 0 && (
                <div style={styles.photoGallery}>
                  {photos.map((photo) => (
                    <div key={photo.id} style={styles.photoItem}>
                      <img
                        src={photo.preview}
                        alt={photo.name}
                        style={styles.photoImage}
                      />
                      <button
                        type="button"
                        onClick={() => removePhoto(photo.id)}
                        style={styles.removeButton}
                      >
                        <X size={16} />
                      </button>
                      <div style={{
                        position: 'absolute',
                        bottom: 0,
                        left: 0,
                        right: 0,
                        backgroundColor: 'rgba(0, 0, 0, 0.7)',
                        color: 'white',
                        padding: '8px',
                        fontSize: '12px',
                        textAlign: 'center',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap'
                      }}>
                        {photo.name}
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Upload Area */}
              {photos.length < MAX_PHOTOS && (
                <div style={styles.uploadArea}>
                  <Image size={48} style={{ color: '#9ca3af', marginBottom: '16px' }} />
                  <h4 style={{ 
                    fontSize: '18px', 
                    fontWeight: '600', 
                    color: '#374151',
                    marginBottom: '8px'
                  }}>
                    {photos.length === 0 ? 'Tambahkan Foto' : 'Tambahkan Foto Lainnya'}
                  </h4>
                  <p style={{ 
                    color: '#6b7280', 
                    marginBottom: '24px',
                    fontSize: '14px'
                  }}>
                    {photos.length === 0 
                      ? `Upload hingga ${MAX_PHOTOS} foto untuk mendukung aduan Anda`
                      : `${MAX_PHOTOS - photos.length} foto tersisa`
                    }
                  </p>
                  
                  <div style={styles.uploadButtons}>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      style={{ ...styles.button, ...styles.primaryButton }}
                    >
                      <Camera size={20} />
                      Ambil Foto
                    </button>
                    <label style={{ ...styles.button, ...styles.secondaryButton, cursor: 'pointer' }}>
                      <Upload size={20} />
                      Upload File
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handlePhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <p style={{ 
                    color: '#9ca3af', 
                    fontSize: '12px',
                    marginTop: '16px'
                  }}>
                    Format yang didukung: JPG, PNG, GIF (maksimal 5MB per file)
                  </p>
                </div>
              )}

              {photos.length >= MAX_PHOTOS && (
                <div style={{
                  backgroundColor: '#fef3c7',
                  border: '2px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '24px',
                  textAlign: 'center',
                  color: '#92400e'
                }}>
                  <AlertTriangle size={32} style={{ marginBottom: '12px' }} />
                  <h4 style={{ fontSize: '16px', fontWeight: '600', marginBottom: '8px' }}>
                    Batas Maksimum Tercapai
                  </h4>
                  <p style={{ margin: 0, fontSize: '14px' }}>
                    Anda telah mengupload {MAX_PHOTOS} foto. Hapus foto yang tidak diperlukan untuk menambahkan foto baru.
                  </p>
                </div>
              )}
            </div>
          )}

          {/* Step 4: Confirmation */}
          {currentStep === 4 && (
            <div>
              <h3 style={{ 
                fontSize: '24px', 
                fontWeight: '600', 
                marginBottom: '24px',
                color: '#1f2937',
                display: 'flex',
                alignItems: 'center',
                gap: '12px'
              }}>
                <CheckCircle size={24} style={{ color: '#3b82f6' }} />
                Konfirmasi Aduan
              </h3>
              
              <div style={{
                backgroundColor: '#f8fafc',
                border: '2px solid #e2e8f0',
                borderRadius: '16px',
                padding: '24px',
                marginBottom: '24px'
              }}>
                <h4 style={{ 
                  fontSize: '18px', 
                  fontWeight: '600', 
                  marginBottom: '16px',
                  color: '#1f2937'
                }}>
                  Ringkasan Aduan
                </h4>
                
                <div style={{ display: 'grid', gap: '12px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>Nama:</span>
                    <span style={{ color: '#1f2937', fontWeight: '600' }}>{formData.visitor_name}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>Email:</span>
                    <span style={{ color: '#1f2937', fontWeight: '600' }}>{formData.visitor_email}</span>
                  </div>
                  {formData.visitor_phone && (
                    <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ color: '#6b7280', fontWeight: '500' }}>Telepon:</span>
                      <span style={{ color: '#1f2937', fontWeight: '600' }}>{formData.visitor_phone}</span>
                    </div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>Kategori:</span>
                    <span style={{ color: '#1f2937', fontWeight: '600' }}>
                      {categories.find(c => c.id === parseInt(formData.category_id))?.name || 'Tidak dipilih'}
                    </span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500' }}>Prioritas:</span>
                    <span style={{ 
                      color: formData.priority === 'urgent' ? '#ef4444' : 
                             formData.priority === 'high' ? '#f97316' :
                             formData.priority === 'medium' ? '#f59e0b' : '#10b981',
                      fontWeight: '600',
                      textTransform: 'capitalize'
                    }}>
                      {formData.priority === 'urgent' ? 'Urgent' :
                       formData.priority === 'high' ? 'Tinggi' :
                       formData.priority === 'medium' ? 'Sedang' : 'Rendah'}
                    </span>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                      Subjek:
                    </span>
                    <span style={{ color: '#1f2937', fontWeight: '600' }}>{formData.subject}</span>
                  </div>
                  <div style={{ marginTop: '16px' }}>
                    <span style={{ color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                      Deskripsi:
                    </span>
                    <p style={{ color: '#1f2937', lineHeight: '1.6', margin: 0 }}>
                      {formData.description}
                    </p>
                  </div>
                  {photos.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <span style={{ color: '#6b7280', fontWeight: '500', display: 'block', marginBottom: '8px' }}>
                        Foto Lampiran: {photos.length} file
                      </span>
                      <div style={{
                        display: 'flex',
                        gap: '8px',
                        flexWrap: 'wrap'
                      }}>
                        {photos.map((photo) => (
                          <div key={photo.id} style={{
                            width: '60px',
                            height: '60px',
                            borderRadius: '8px',
                            overflow: 'hidden',
                            border: '2px solid #e5e7eb'
                          }}>
                            <img
                              src={photo.preview}
                              alt={photo.name}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover'
                              }}
                            />
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>
              
              <div style={{
                backgroundColor: '#dbeafe',
                border: '2px solid #3b82f6',
                borderRadius: '12px',
                padding: '20px',
                marginBottom: '24px'
              }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'flex-start',
                  gap: '12px'
                }}>
                  <AlertTriangle size={20} style={{ color: '#1d4ed8', marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <h4 style={{ 
                      fontSize: '16px', 
                      fontWeight: '600', 
                      color: '#1d4ed8',
                      margin: '0 0 8px 0'
                    }}>
                      Penting untuk Diketahui
                    </h4>
                    <ul style={{ 
                      color: '#1e40af', 
                      fontSize: '14px',
                      lineHeight: '1.5',
                      margin: 0,
                      paddingLeft: '16px'
                    }}>
                      <li>Anda akan menerima konfirmasi melalui email setelah aduan dikirim</li>
                      <li>Tim kami akan merespons dalam 1-2 hari kerja</li>
                      <li>Untuk aduan urgent, kami akan segera menindaklanjuti</li>
                      <li>Pastikan informasi kontak yang Anda berikan aktif</li>
                    </ul>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Navigation Buttons */}
        <div style={styles.navigationButtons}>
          <div>
            {currentStep > 1 && (
              <button
                type="button"
                onClick={handlePrevious}
                style={{ ...styles.button, ...styles.secondaryButton }}
              >
                <ArrowLeft size={20} />
                Sebelumnya
              </button>
            )}
          </div>
          
          <div>
            {currentStep < totalSteps && (
              <button
                type="button"
                onClick={handleNext}
                style={{ ...styles.button, ...styles.primaryButton }}
              >
                Selanjutnya
                <ArrowRight size={20} />
              </button>
            )}
            
            {currentStep === totalSteps && (
              <button
                type="button"
                onClick={handleSubmit}
                disabled={loading}
                style={{
                  ...styles.button,
                  ...(loading ? { opacity: 0.7, cursor: 'not-allowed' } : styles.primaryButton),
                  fontSize: '16px',
                  padding: '16px 32px'
                }}
              >
                <Send size={20} />
                {loading ? 'Mengirim...' : 'Kirim Aduan'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              marginBottom: '24px',
              paddingBottom: '16px',
              borderBottom: '2px solid #f1f5f9'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                color: '#1f2937',
                margin: 0,
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}>
                <Camera size={24} />
                Ambil Foto
              </h3>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setShowWebcam(false);
                }}
                style={{
                  backgroundColor: '#f3f4f6',
                  border: 'none',
                  borderRadius: '8px',
                  width: '40px',
                  height: '40px',
                  cursor: 'pointer',
                  color: '#6b7280',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              {!showWebcam ? (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '40px',
                  backgroundColor: '#f9fafb'
                }}>
                  <Camera size={48} style={{ color: '#6b7280', marginBottom: '16px' }} />
                  <p style={{ margin: '0 0 16px 0', color: '#6b7280' }}>
                    Klik tombol di bawah untuk memulai kamera
                  </p>
                  <button
                    onClick={() => setShowWebcam(true)}
                    style={{ ...styles.button, ...styles.primaryButton }}
                  >
                    <Camera size={16} />
                    Mulai Kamera
                  </button>
                </div>
              ) : (
                <div>
                  <div style={{
                    border: '3px solid #3b82f6',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'inline-block',
                    marginBottom: '20px'
                  }}>
                    <Webcam
                      audio={false}
                      ref={webcamRef}
                      screenshotFormat="image/jpeg"
                      width="100%"
                      height="auto"
                      style={{ display: 'block', maxWidth: '400px' }}
                      videoConstraints={{ facingMode: 'user' }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={capturePhoto}
                      style={{ ...styles.button, ...styles.successButton }}
                    >
                      <Camera size={16} />
                      Ambil Foto
                    </button>
                    <button
                      onClick={() => setShowWebcam(false)}
                      style={{ ...styles.button, ...styles.secondaryButton }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}