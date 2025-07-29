import { useState, useEffect, useRef } from 'react';
import { Link } from 'react-router-dom';
import { 
  AlertTriangle, 
  Send, 
  CheckCircle, 
  ArrowLeft,
  User,
  Mail,
  Phone,
  MessageSquare,
  Clock,
  MapPin,
  FileText,
  Camera,
  Upload,
  X,
  RotateCcw,
  Save,
  Image,
  RefreshCw,
  Shield
} from 'lucide-react';
import Webcam from 'react-webcam';
import { complaintsAPI } from '../utils/api.js';

import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

export function ComplaintFormPageModern() {
  // Default brand data since BrandContext is removed
  const brandData = {
    brandName: 'ULT FPEB',
    shortName: 'ULT FPEB',
    logoUrl: '/logoultfpeb.png',
    primaryColor: '#fd591c',
    secondaryColor: '#df2128'
  };
  const { alert } = useGlobalAlert();
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [ticketNumber, setTicketNumber] = useState('');
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  
  // Photo capture states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showWebcam, setShowWebcam] = useState(false);
  const [capturedPhoto, setCapturedPhoto] = useState(null);
  const webcamRef = useRef(null);
  
  // Multiple photos state
  const [photos, setPhotos] = useState([]); // Array to store multiple photos
  const MAX_PHOTOS = 5;
  
  // CAPTCHA states
  const [captcha, setCaptcha] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaError, setCaptchaError] = useState('');
  
  const [formData, setFormData] = useState({
    visitor_name: '',
    visitor_email: '',
    visitor_phone: '',
    category_id: '',
    priority: 'medium',
    subject: '',
    description: '',
    complaint_photo: null,
    photoFile: null, // Store actual file for upload
    form_data: {}
  });
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchFields();
    generateCaptcha();
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

  // Generate CAPTCHA
  const generateCaptcha = () => {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    for (let i = 0; i < 6; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setCaptcha(result);
    setCaptchaInput('');
    setCaptchaError('');
  };

  // Generate CAPTCHA with visual distortion
  const renderCaptcha = () => {
    return captcha.split('').map((char, index) => (
      <span
        key={index}
        style={{
          display: 'inline-block',
          transform: `rotate(${Math.random() * 40 - 20}deg) scale(${0.8 + Math.random() * 0.4})`,
          color: `hsl(${Math.random() * 360}, 50%, 30%)`,
          margin: '0 2px',
          fontSize: `${16 + Math.random() * 8}px`,
          fontWeight: Math.random() > 0.5 ? 'bold' : 'normal'
        }}
      >
        {char}
      </span>
    ));
  };

  // Modern CoreUI-inspired styles
  const styles = {
    container: {
      minHeight: '100vh',
      backgroundColor: '#f1f4f6',
      padding: '20px 16px'
    },
    mainCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)',
      margin: '0 auto',
      maxWidth: '800px',
      overflow: 'hidden',
      marginBottom: '24px'
    },
    header: {
      background: 'linear-gradient(135deg, #f59e0b 0%, #d97706 100%)',
      color: 'white',
      padding: '24px 32px',
      textAlign: 'center'
    },
    headerTitle: {
      fontSize: '28px',
      fontWeight: '600',
      margin: '0 0 8px 0',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      gap: '12px'
    },
    headerSubtitle: {
      fontSize: '16px',
      opacity: '0.9',
      margin: '0'
    },
    backButton: {
      position: 'absolute',
      top: '24px',
      left: '24px',
      backgroundColor: 'rgba(255, 255, 255, 0.2)',
      border: 'none',
      borderRadius: '8px',
      color: 'white',
      padding: '8px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      gap: '4px',
      fontSize: '14px',
      textDecoration: 'none',
      transition: 'all 0.2s ease'
    },
    sectionCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)',
      marginBottom: '20px',
      overflow: 'hidden'
    },
    sectionHeader: {
      padding: '20px 24px',
      borderBottom: '1px solid #e9ecef',
      backgroundColor: '#f8f9fa'
    },
    sectionTitle: {
      fontSize: '18px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    sectionBody: {
      padding: '24px'
    },
    formGrid: {
      display: 'grid',
      gap: '20px'
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))',
      gap: '16px'
    },
    formGroup: {
      marginBottom: '0'
    },
    label: {
      display: 'block',
      fontSize: '14px',
      fontWeight: '500',
      color: '#374151',
      marginBottom: '6px'
    },
    input: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      outline: 'none'
    },
    inputError: {
      border: '1px solid #dc3545'
    },
    inputFocus: {
      border: '1px solid #f59e0b',
      boxShadow: '0 0 0 3px rgba(245, 158, 11, 0.1)'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '100px',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      outline: 'none'
    },
    select: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      outline: 'none',
      cursor: 'pointer'
    },
    error: {
      color: '#dc3545',
      fontSize: '12px',
      marginTop: '4px'
    },
    required: {
      color: '#dc3545'
    },
    button: {
      padding: '10px 20px',
      border: 'none',
      borderRadius: '8px',
      fontSize: '14px',
      fontWeight: '500',
      cursor: 'pointer',
      transition: 'all 0.2s ease',
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      textDecoration: 'none',
      outline: 'none'
    },
    primaryButton: {
      backgroundColor: '#f59e0b',
      color: 'white',
      boxShadow: '0 2px 4px rgba(245, 158, 11, 0.3)'
    },
    secondaryButton: {
      backgroundColor: '#f8f9fa',
      color: '#374151',
      border: '1px solid #d1d5db'
    },
    successButton: {
      backgroundColor: '#10b981',
      color: 'white'
    },
    dangerButton: {
      backgroundColor: '#ef4444',
      color: 'white'
    },
    loadingButton: {
      opacity: '0.7',
      cursor: 'not-allowed'
    },
    photoSection: {
      textAlign: 'center',
      padding: '20px',
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      backgroundColor: '#f8f9fa'
    },
    photoPreview: {
      maxWidth: '300px',
      margin: '0 auto 16px',
      borderRadius: '8px',
      overflow: 'hidden'
    },
    photoImage: {
      width: '100%',
      height: 'auto',
      display: 'block'
    },
    modal: {
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: 'rgba(0, 0, 0, 0.8)',
      backdropFilter: 'blur(4px)',
      zIndex: 9999,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      padding: '20px'
    },
    modalContent: {
      backgroundColor: 'white',
      borderRadius: '16px',
      padding: '32px',
      maxWidth: '600px',
      width: '100%',
      maxHeight: '90vh',
      overflowY: 'auto',
      position: 'relative',
      boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3)'
    },
    modalHeader: {
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginBottom: '24px',
      paddingBottom: '16px',
      borderBottom: '2px solid #f1f4f6'
    },
    modalTitle: {
      fontSize: '20px',
      fontWeight: '600',
      color: '#2c3e50',
      margin: '0',
      display: 'flex',
      alignItems: 'center',
      gap: '8px'
    },
    closeButton: {
      backgroundColor: '#f8f9fa',
      border: 'none',
      borderRadius: '8px',
      width: '40px',
      height: '40px',
      cursor: 'pointer',
      color: '#6c757d',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    },
    successCard: {
      backgroundColor: '#d4edda',
      border: '1px solid #c3e6cb',
      borderRadius: '12px',
      padding: '32px',
      textAlign: 'center',
      color: '#155724'
    },
    successIcon: {
      width: '64px',
      height: '64px',
      backgroundColor: '#28a745',
      borderRadius: '50%',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px'
    },
    captchaContainer: {
      display: 'flex',
      alignItems: 'center',
      gap: '16px',
      marginBottom: '16px'
    },
    captchaDisplay: {
      backgroundColor: '#f8f9fa',
      border: '2px solid #d1d5db',
      borderRadius: '8px',
      padding: '16px 20px',
      fontSize: '18px',
      fontWeight: '600',
      letterSpacing: '2px',
      fontFamily: 'monospace',
      color: '#2c3e50',
      userSelect: 'none',
      minWidth: '140px',
      height: '50px',
      textAlign: 'center',
      position: 'relative',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(45deg, #f8f9fa 25%, #e9ecef 25%), linear-gradient(-45deg, #f8f9fa 25%, #e9ecef 25%), linear-gradient(45deg, #e9ecef 75%, #f8f9fa 75%), linear-gradient(-45deg, #e9ecef 75%, #f8f9fa 75%)',
      backgroundSize: '12px 12px',
      backgroundPosition: '0 0, 0 6px, 6px -6px, -6px 0px',
      boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.1)',
      overflow: 'hidden'
    },
    captchaInput: {
      flex: 1,
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      outline: 'none',
      transition: 'all 0.2s ease'
    },
    refreshButton: {
      backgroundColor: '#6c757d',
      color: 'white',
      border: 'none',
      borderRadius: '8px',
      padding: '10px 12px',
      cursor: 'pointer',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      transition: 'all 0.2s ease'
    }
  };

  const validateForm = () => {
    const newErrors = {};

    // Basic required fields
    if (!formData.visitor_name.trim()) {
      newErrors.visitor_name = 'Name is required';
    }

    if (!formData.visitor_email.trim()) {
      newErrors.visitor_email = 'Email is required';
    } else if (!/\S+@\S+\.\S+/.test(formData.visitor_email)) {
      newErrors.visitor_email = 'Please enter a valid email address';
    }

    if (!formData.subject.trim()) {
      newErrors.subject = 'Subject is required';
    }

    if (!formData.description.trim()) {
      newErrors.description = 'Description is required';
    }

    // CAPTCHA validation
    if (!captchaInput.trim()) {
      newErrors.captcha = 'CAPTCHA is required';
    } else if (captchaInput !== captcha) {
      newErrors.captcha = 'CAPTCHA is incorrect';
    }

    // Dynamic field validation
    fields.forEach(field => {
      if (field.is_required && !formData.form_data[field.field_name]) {
        newErrors[field.field_name] = `${field.field_label} is required`;
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setLoading(true);
    try {
      // Create FormData for file upload
      const formDataToSend = new FormData();
      
      // Add basic form fields
      formDataToSend.append('complainant_name', formData.visitor_name);
      formDataToSend.append('complainant_email', formData.visitor_email);
      formDataToSend.append('complainant_phone', formData.visitor_phone);
      formDataToSend.append('category_id', formData.category_id);
      formDataToSend.append('priority', formData.priority);
      formDataToSend.append('subject', formData.subject);
      formDataToSend.append('description', formData.description);
      
      // Add dynamic form data as JSON string
      if (Object.keys(formData.form_data).length > 0) {
        formDataToSend.append('form_data', JSON.stringify(formData.form_data));
      }
      
      // Add multiple photo files if they exist
      if (photos.length > 0) {
        photos.forEach((photo, index) => {
          if (photo.file) {
            formDataToSend.append('complaint_photos', photo.file);
          }
        });
      }
      
      // Fallback: Add single photo file if exists (backward compatibility)
      if (formData.complaint_photo && formData.photoFile && photos.length === 0) {
        formDataToSend.append('complaint_photo', formData.photoFile);
      }
      
      const response = await complaintsAPI.submitWithFile(formDataToSend);
      if (response.success) {
        setSubmitted(true);
        setTicketNumber(response.data.ticket_number);
      } else {
        throw new Error(response.message || 'Failed to submit complaint');
      }
    } catch (error) {
      console.error('Error submitting complaint:', error);
      alert.error('Failed to submit complaint. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: undefined
      }));
    }
  };

  const handleCaptchaChange = (value) => {
    setCaptchaInput(value);
    if (captchaError || errors.captcha) {
      setCaptchaError('');
      setErrors(prev => ({
        ...prev,
        captcha: undefined
      }));
    }
  };

  const handleDynamicFieldChange = (fieldName, value) => {
    setFormData(prev => ({
      ...prev,
      form_data: {
        ...prev.form_data,
        [fieldName]: value
      }
    }));
    
    // Clear error when user starts typing
    if (errors[fieldName]) {
      setErrors(prev => ({
        ...prev,
        [fieldName]: undefined
      }));
    }
  };

  // Multiple photos functions
  const handleMultiplePhotoUpload = (event) => {
    const files = Array.from(event.target.files);
    const newPhotos = [];
    
    files.forEach((file, index) => {
      if (photos.length + newPhotos.length < MAX_PHOTOS) {
        const reader = new FileReader();
        reader.onload = (e) => {
          const photoData = {
            id: `${Date.now()}-${index}-${Math.random().toString(36).substr(2, 9)}`,
            preview: e.target.result,
            file: file,
            name: file.name
          };
          newPhotos.push(photoData);
          
          if (newPhotos.length === files.length || photos.length + newPhotos.length === MAX_PHOTOS) {
            setPhotos(prev => [...prev, ...newPhotos]);
          }
        };
        reader.readAsDataURL(file);
      }
    });
  };

  const capturePhotoToGallery = () => {
    if (photos.length >= MAX_PHOTOS) {
      alert.warning(`Maximum ${MAX_PHOTOS} photos allowed`);
      return;
    }
    
    const imageSrc = webcamRef.current.getScreenshot();
    // Convert base64 to blob then to file
    fetch(imageSrc)
      .then(res => res.blob())
      .then(blob => {
        const file = new File([blob], `complaint-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
        const photoData = {
          id: `${Date.now()}-camera-${Math.random().toString(36).substr(2, 9)}`,
          preview: imageSrc,
          file: file,
          name: file.name
        };
        setPhotos(prev => [...prev, photoData]);
        setShowWebcam(false);
        setShowPhotoModal(false);
      });
  };

  const removePhotoFromGallery = (photoId) => {
    setPhotos(prev => prev.filter(photo => photo.id !== photoId));
  };

  const clearAllPhotos = () => {
    setPhotos([]);
  };

  // Photo capture functions
  const capturePhoto = () => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedPhoto(imageSrc);
    setShowWebcam(false);
  };

  const handlePhotoUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => {
        setCapturedPhoto(e.target.result);
        setFormData(prev => ({ 
          ...prev, 
          complaint_photo: e.target.result, // For preview
          photoFile: file // Store actual file for upload
        }));
      };
      reader.readAsDataURL(file);
    }
  };

  const removePhoto = () => {
    setCapturedPhoto(null);
    setFormData(prev => ({ 
      ...prev, 
      complaint_photo: null,
      photoFile: null
    }));
  };

  const savePhoto = () => {
    // Convert base64 to File object for camera captures
    if (capturedPhoto) {
      // Convert base64 to blob then to file
      fetch(capturedPhoto)
        .then(res => res.blob())
        .then(blob => {
          const file = new File([blob], `complaint-photo-${Date.now()}.jpg`, { type: 'image/jpeg' });
          setFormData(prev => ({ 
            ...prev, 
            complaint_photo: capturedPhoto,
            photoFile: file
          }));
        });
    }
    setShowPhotoModal(false);
  };

  if (submitted) {
    return (
      <div style={styles.container}>
        <div style={styles.mainCard}>
          <div style={styles.successCard}>
            <div style={styles.successIcon}>
              <CheckCircle size={32} color="white" />
            </div>
            <h2 style={{ margin: '0 0 16px 0', fontSize: '24px', fontWeight: '600' }}>
              Complaint Submitted Successfully!
            </h2>
            <p style={{ margin: '0 0 16px 0', fontSize: '16px' }}>
              Your complaint has been received and assigned ticket number:
            </p>
            <div style={{
              backgroundColor: 'white',
              padding: '12px 20px',
              borderRadius: '8px',
              fontSize: '18px',
              fontWeight: '600',
              color: '#28a745',
              margin: '0 0 24px 0'
            }}>
              #{ticketNumber}
            </div>
            <p style={{ margin: '0 0 24px 0', fontSize: '14px', color: '#6c757d' }}>
              You will receive email updates about the status of your complaint.
            </p>
            <Link
              to="/"
              style={{
                ...styles.button,
                ...styles.primaryButton,
                textDecoration: 'none'
              }}
            >
              <ArrowLeft size={16} />
              Back to Home
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.container}>
      {/* Main Card with Header */}
      <div style={styles.mainCard}>
        <div style={{ position: 'relative' }}>
          <Link to="/" style={styles.backButton}>
            <ArrowLeft size={16} />
            Back
          </Link>
          <div style={styles.header}>
            <h1 style={styles.headerTitle}>
              <AlertTriangle size={32} />
              Submit Complaint
            </h1>
            <p style={styles.headerSubtitle}>
              Help us improve our services
            </p>
          </div>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Personal Information Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <User size={20} />
                Personal Information
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                {/* Name and Email Row */}
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Full Name <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.visitor_name}
                      onChange={(e) => handleInputChange('visitor_name', e.target.value)}
                      style={{
                        ...styles.input,
                        ...(errors.visitor_name ? styles.inputError : {})
                      }}
                      placeholder="Enter your full name"
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => Object.assign(e.target.style, { 
                        border: errors.visitor_name ? '1px solid #dc3545' : '1px solid #d1d5db', 
                        boxShadow: 'none' 
                      })}
                    />
                    {errors.visitor_name && (
                      <div style={styles.error}>{errors.visitor_name}</div>
                    )}
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Email Address <span style={styles.required}>*</span>
                    </label>
                    <input
                      type="email"
                      value={formData.visitor_email}
                      onChange={(e) => handleInputChange('visitor_email', e.target.value)}
                      style={{
                        ...styles.input,
                        ...(errors.visitor_email ? styles.inputError : {})
                      }}
                      placeholder="Enter your email address"
                      onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                      onBlur={(e) => Object.assign(e.target.style, { 
                        border: errors.visitor_email ? '1px solid #dc3545' : '1px solid #d1d5db', 
                        boxShadow: 'none' 
                      })}
                    />
                    {errors.visitor_email && (
                      <div style={styles.error}>{errors.visitor_email}</div>
                    )}
                  </div>
                </div>

                {/* Phone Number */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Phone Number</label>
                  <input
                    type="tel"
                    value={formData.visitor_phone}
                    onChange={(e) => handleInputChange('visitor_phone', e.target.value)}
                    style={styles.input}
                    placeholder="Enter your phone number"
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, { 
                      border: '1px solid #d1d5db', 
                      boxShadow: 'none' 
                    })}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Complaint Details Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <MessageSquare size={20} />
                Complaint Details
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                {/* Category and Priority Row */}
                <div style={styles.formRow}>
                  <div style={styles.formGroup}>
                    <label style={styles.label}>Category</label>
                    <select
                      value={formData.category_id}
                      onChange={(e) => handleInputChange('category_id', e.target.value)}
                      style={styles.select}
                    >
                      <option value="">Select a category</option>
                      {categories.map((category) => (
                        <option key={category.id} value={category.id}>
                          {category.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div style={styles.formGroup}>
                    <label style={styles.label}>Priority Level</label>
                    <select
                      value={formData.priority}
                      onChange={(e) => handleInputChange('priority', e.target.value)}
                      style={styles.select}
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>

                {/* Subject */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Subjek <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    value={formData.subject}
                    onChange={(e) => handleInputChange('subject', e.target.value)}
                    style={{
                      ...styles.input,
                      ...(errors.subject ? styles.inputError : {})
                    }}
                    placeholder="Masukkan subjek keluhan"
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, { 
                      border: errors.subject ? '1px solid #dc3545' : '1px solid #d1d5db', 
                      boxShadow: 'none' 
                    })}
                  />
                  {errors.subject && (
                    <div style={styles.error}>{errors.subject}</div>
                  )}
                </div>

                {/* Description */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Deskripsi <span style={styles.required}>*</span>
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => handleInputChange('description', e.target.value)}
                    style={{
                      ...styles.textarea,
                      ...(errors.description ? styles.inputError : {})
                    }}
                    placeholder="Jelaskan keluhan Anda secara detail..."
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, { 
                      border: errors.description ? '1px solid #dc3545' : '1px solid #d1d5db', 
                      boxShadow: 'none' 
                    })}
                  />
                  {errors.description && (
                    <div style={styles.error}>{errors.description}</div>
                  )}
                </div>

                {/* Dynamic Fields */}
                {fields.map((field) => (
                  <div key={field.id} style={styles.formGroup}>
                    <label style={styles.label}>
                      {field.field_label}
                      {field.is_required && <span style={styles.required}> *</span>}
                    </label>
                    
                    {/* Text Input */}
                    {field.field_type === 'text' && (
                      <input
                        type="text"
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.input,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        placeholder={field.placeholder || `Enter ${field.field_label.toLowerCase()}`}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Email Input */}
                    {field.field_type === 'email' && (
                      <input
                        type="email"
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.input,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        placeholder={field.placeholder || `Enter ${field.field_label.toLowerCase()}`}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Phone Input */}
                    {field.field_type === 'phone' && (
                      <input
                        type="tel"
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.input,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        placeholder={field.placeholder || `Enter ${field.field_label.toLowerCase()}`}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Number Input */}
                    {field.field_type === 'number' && (
                      <input
                        type="number"
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.input,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        placeholder={field.placeholder || `Enter ${field.field_label.toLowerCase()}`}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Date Input */}
                    {field.field_type === 'date' && (
                      <input
                        type="date"
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.input,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Textarea */}
                    {field.field_type === 'textarea' && (
                      <textarea
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.textarea,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                        placeholder={field.placeholder || `Enter ${field.field_label.toLowerCase()}`}
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors[field.field_name] ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    )}
                    
                    {/* Select Dropdown */}
                    {field.field_type === 'select' && (
                      <select
                        value={formData.form_data[field.field_name] || ''}
                        onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                        style={{
                          ...styles.select,
                          ...(errors[field.field_name] ? styles.inputError : {})
                        }}
                      >
                        <option value="">Select an option</option>
                        {field.field_options && Array.isArray(field.field_options) ? (
                          field.field_options.map((option, index) => (
                            <option key={index} value={option}>
                              {option}
                            </option>
                          ))
                        ) : field.field_options && typeof field.field_options === 'string' ? (
                          field.field_options.split(',').map((option, index) => (
                            <option key={index} value={option.trim()}>
                              {option.trim()}
                            </option>
                          ))
                        ) : null}
                      </select>
                    )}
                    
                    {/* Radio Buttons */}
                    {field.field_type === 'radio' && field.field_options && (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                        {(Array.isArray(field.field_options) ? field.field_options : field.field_options.split(',')).map((option, index) => (
                          <label key={index} style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                            <input
                              type="radio"
                              name={field.field_name}
                              value={typeof option === 'string' ? option.trim() : option}
                              checked={formData.form_data[field.field_name] === (typeof option === 'string' ? option.trim() : option)}
                              onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.value)}
                              style={{ margin: '0' }}
                            />
                            {typeof option === 'string' ? option.trim() : option}
                          </label>
                        ))}
                      </div>
                    )}
                    
                    {/* Checkbox */}
                    {field.field_type === 'checkbox' && (
                      <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={formData.form_data[field.field_name] === true || formData.form_data[field.field_name] === 'true'}
                          onChange={(e) => handleDynamicFieldChange(field.field_name, e.target.checked)}
                          style={{ margin: '0' }}
                        />
                        {field.field_label}
                      </label>
                    )}
                    
                    {errors[field.field_name] && (
                      <div style={styles.error}>{errors[field.field_name]}</div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Photo Evidence Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <Camera size={20} />
                Photo Evidence (Optional)
              </h3>
              <span style={{ fontSize: '12px', color: '#6c757d' }}>
                Upload up to {MAX_PHOTOS} photos
              </span>
            </div>
            <div style={styles.sectionBody}>
              {/* Photo Gallery */}
              {photos.length > 0 && (
                <div style={{
                  marginBottom: '20px',
                  padding: '16px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px',
                  border: '1px solid #e9ecef'
                }}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <span style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>
                      Uploaded Photos ({photos.length}/{MAX_PHOTOS})
                    </span>
                    <button
                      type="button"
                      onClick={clearAllPhotos}
                      style={{
                        padding: '4px 8px',
                        fontSize: '12px',
                        border: '1px solid #dc3545',
                        borderRadius: '4px',
                        backgroundColor: 'white',
                        color: '#dc3545',
                        cursor: 'pointer'
                      }}
                    >
                      Clear All
                    </button>
                  </div>
                  <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '12px'
                  }}>
                    {photos.map((photo) => (
                      <div
                        key={photo.id}
                        style={{
                          position: 'relative',
                          width: '120px',
                          height: '120px',
                          borderRadius: '8px',
                          overflow: 'hidden',
                          border: '2px solid #e9ecef',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                        }}
                      >
                        <img
                          src={photo.preview}
                          alt={photo.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover'
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => removePhotoFromGallery(photo.id)}
                          style={{
                            position: 'absolute',
                            top: '4px',
                            right: '4px',
                            width: '24px',
                            height: '24px',
                            borderRadius: '50%',
                            border: 'none',
                            backgroundColor: 'rgba(220, 53, 69, 0.9)',
                            color: 'white',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '12px'
                          }}
                        >
                          <X size={12} />
                        </button>
                        <div style={{
                          position: 'absolute',
                          bottom: '0',
                          left: '0',
                          right: '0',
                          padding: '4px',
                          backgroundColor: 'rgba(0,0,0,0.7)',
                          color: 'white',
                          fontSize: '10px',
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
                </div>
              )}

              {/* Upload Controls */}
              {photos.length < MAX_PHOTOS && (
                <div style={styles.photoSection}>
                  <Image size={48} style={{ color: '#6c757d', marginBottom: '16px' }} />
                  <p style={{ margin: '0 0 16px 0', color: '#6c757d' }}>
                    {photos.length === 0 
                      ? `Add photos to support your complaint (up to ${MAX_PHOTOS} photos)`
                      : `Add more photos (${MAX_PHOTOS - photos.length} remaining)`
                    }
                  </p>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      style={{
                        ...styles.button,
                        ...styles.primaryButton
                      }}
                    >
                      <Camera size={16} />
                      Take Photo
                    </button>
                    <label style={{
                      ...styles.button,
                      ...styles.secondaryButton,
                      cursor: 'pointer'
                    }}>
                      <Upload size={16} />
                      Upload Photos
                      <input
                        type="file"
                        accept="image/*"
                        multiple
                        onChange={handleMultiplePhotoUpload}
                        style={{ display: 'none' }}
                      />
                    </label>
                  </div>
                  <p style={{ margin: '12px 0 0 0', fontSize: '12px', color: '#6c757d' }}>
                    Supported formats: JPG, PNG, GIF (max 5MB each)
                  </p>
                </div>
              )}

              {photos.length >= MAX_PHOTOS && (
                <div style={{
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '8px',
                  border: '1px solid #ffeaa7',
                  color: '#856404'
                }}>
                  <AlertTriangle size={24} style={{ marginBottom: '8px' }} />
                  <p style={{ margin: '0', fontSize: '14px' }}>
                    Maximum number of photos ({MAX_PHOTOS}) reached.
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* CAPTCHA Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <Shield size={20} />
                Security Verification
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGroup}>
                <label style={styles.label}>
                  Enter CAPTCHA <span style={styles.required}>*</span>
                </label>
                <p style={{ margin: '0 0 8px 0', fontSize: '12px', color: '#6c757d' }}>
                  Please enter the characters shown below to verify you are human
                </p>
                <div style={styles.captchaContainer}>
                  <div style={styles.captchaDisplay}>
                    {renderCaptcha()}
                  </div>
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => handleCaptchaChange(e.target.value)}
                    style={{
                      ...styles.captchaInput,
                      ...(errors.captcha ? styles.inputError : {})
                    }}
                    placeholder="Enter CAPTCHA"
                    maxLength={6}
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, { border: errors.captcha ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                  <button
                    type="button"
                    onClick={generateCaptcha}
                    style={styles.refreshButton}
                    title="Generate new CAPTCHA"
                    onMouseEnter={(e) => e.target.style.backgroundColor = '#5a6268'}
                    onMouseLeave={(e) => e.target.style.backgroundColor = '#6c757d'}
                  >
                    <RefreshCw size={16} />
                  </button>
                </div>
                {errors.captcha && (
                  <div style={styles.error}>{errors.captcha}</div>
                )}
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              type="submit"
              disabled={loading}
              style={{
                ...styles.button,
                ...(loading ? styles.loadingButton : styles.primaryButton),
                fontSize: '16px',
                padding: '14px 32px'
              }}
            >
              <Send size={20} />
              {loading ? 'Submitting...' : 'Submit Complaint'}
            </button>
          </div>
        </form>
      </div>

      {/* Photo Modal */}
      {showPhotoModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <Camera size={24} />
                Capture Photo Evidence
              </h3>
              <button
                onClick={() => {
                  setShowPhotoModal(false);
                  setShowWebcam(false);
                }}
                style={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              {!showWebcam && !capturedPhoto && (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '40px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <Camera size={48} style={{ color: '#6c757d', marginBottom: '16px' }} />
                  <p style={{ margin: '0 0 16px 0', color: '#6c757d' }}>
                    Click to start camera
                  </p>
                  <button
                    onClick={() => setShowWebcam(true)}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton
                    }}
                  >
                    <Camera size={16} />
                    Start Camera
                  </button>
                </div>
              )}

              {showWebcam && !capturedPhoto && (
                <div>
                  <div style={{
                    border: '2px solid #f59e0b',
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
                      videoConstraints={{
                        facingMode: 'user'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={capturePhotoToGallery}
                      style={{
                        ...styles.button,
                        ...styles.successButton
                      }}
                    >
                      <Camera size={16} />
                      Capture
                    </button>
                    <button
                      onClick={() => setShowWebcam(false)}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton
                      }}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {capturedPhoto && (
                <div>
                  <div style={{
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'inline-block',
                    marginBottom: '20px'
                  }}>
                    <img
                      src={capturedPhoto}
                      alt="Captured"
                      style={{
                        maxWidth: '400px',
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={savePhoto}
                      style={{
                        ...styles.button,
                        ...styles.successButton
                      }}
                    >
                      <Save size={16} />
                      Use Photo
                    </button>
                    <button
                      onClick={() => {
                        setCapturedPhoto(null);
                        setShowWebcam(true);
                      }}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton
                      }}
                    >
                      <RotateCcw size={16} />
                      Retake
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
