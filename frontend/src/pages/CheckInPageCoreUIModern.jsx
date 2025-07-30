import { useState, useRef, useCallback, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import Webcam from 'react-webcam';
import SignatureCanvas from 'react-signature-canvas';
import { configurationsAPI } from '../utils/api.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import { 
  Camera, 
  User, 
  Phone, 
  MapPin, 
  Building, 
  FileText, 
  Save, 
  RotateCcw, 
  Eye,
  EyeOff,
  Calendar,
  Clock,
  Eraser,
  FileCheck,
  Hash,
  Search,
  ChevronDown,
  X,
  Plus
} from 'lucide-react';

export function CheckInPageCoreUIModern() {
  const navigate = useNavigate();
  const { alert } = useGlobalAlert();
  const webcamRef = useRef(null);
  const signatureRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    email: '',
    institution: '',
    purpose: '',
    customPurpose: '',
    unit: '',
    customUnit: '',
    personToMeet: '',
    customPersonToMeet: '',
    idNumber: '',
    idType: '', // New field for ID type
    address: '',
    // Document request fields
    requestDocument: false,
    documentType: '',
    documentName: '',
    documentNumber: ''
  });
  
  const [capturedImage, setCapturedImage] = useState(null);
  const [showWebcam, setShowWebcam] = useState(false);
  const [signature, setSignature] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [signatureData, setSignatureData] = useState(null);
  
  // Dynamic configuration state
  const [configurations, setConfigurations] = useState({
    purposes: [],
    units: [],
    personToMeet: []
  });
  const [isLoadingConfig, setIsLoadingConfig] = useState(true);
  
  // Dropdown states
  const [dropdownStates, setDropdownStates] = useState({
    purpose: { isOpen: false, searchTerm: '', showCustomInput: false },
    unit: { isOpen: false, searchTerm: '', showCustomInput: false },
    personToMeet: { isOpen: false, searchTerm: '', showCustomInput: false },
    documentType: { isOpen: false, searchTerm: '', showCustomInput: false }
  });
  
  // Document types
  const documentTypes = [
    'Surat Keterangan Kuliah',
    'Transkrip Nilai',
    'Ijazah',
    'Sertifikat',
    'Surat Keterangan Lulus',
    'Kartu Tanda Mahasiswa',
    'Surat Pengantar',
    'Surat Rekomendasi',
    'Lainnya'
  ];
  
  // Photo and signature modal states
  const [showPhotoModal, setShowPhotoModal] = useState(false);
  const [showSignatureModal, setShowSignatureModal] = useState(false);

  // Load configurations on component mount
  useEffect(() => {
    loadConfigurations();
  }, []);

  // Add click outside listener to close dropdowns
  useEffect(() => {
    const handleClickOutside = (event) => {
      // Check if click is outside any Visit Information dropdown
      const visitInfoDropdowns = document.querySelectorAll('[data-dropdown]');
      let clickedOutside = true;
      
      visitInfoDropdowns.forEach(element => {
        if (element.contains(event.target)) {
          clickedOutside = false;
        }
      });
      
      // Only close dropdowns if clicked completely outside all dropdown areas
      if (clickedOutside) {
        setDropdownStates(prev => ({
          purpose: { ...prev.purpose, isOpen: false, searchTerm: '' },
          unit: { ...prev.unit, isOpen: false, searchTerm: '' },
          personToMeet: { ...prev.personToMeet, isOpen: false, searchTerm: '' },
          documentType: { ...prev.documentType, isOpen: false, searchTerm: '' }
        }));
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  const loadConfigurations = async () => {
    try {
      setIsLoadingConfig(true);
      const response = await configurationsAPI.getAll();
      
      if (response.data.success && response.data.data) {
        // Successfully loaded configurations from API
        setConfigurations(response.data.data);
      } else {
        console.error('API response indicates failure:', response.data);
        setConfigurations({
          purposes: [],
          units: [],
          personToMeet: []
        });
      }
    } catch (error) {
      console.error('Error loading configurations:', error);
      setConfigurations({
        purposes: [],
        units: [],
        personToMeet: []
      });
    } finally {
      setIsLoadingConfig(false);
    }
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
      maxWidth: '1000px',
      overflow: 'visible', // Allow dropdowns to overflow from main card
      marginBottom: '24px'
    },
    header: {
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
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
    sectionCard: {
      backgroundColor: 'white',
      borderRadius: '12px',
      boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)',
      marginBottom: '20px',
      overflow: 'visible' // Allow dropdowns to overflow from section cards
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
      padding: '24px',
      position: 'relative',
      overflow: 'visible' // Allow dropdowns to overflow
    },
    formGrid: {
      display: 'grid',
      gap: '20px',
      position: 'relative', // Establish stacking context for dropdowns
      zIndex: 1 // Base z-index for form grid
    },
    formRow: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
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
      border: '1px solid #667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    textarea: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      fontSize: '14px',
      minHeight: '80px',
      resize: 'vertical',
      fontFamily: 'inherit',
      transition: 'all 0.2s ease',
      boxSizing: 'border-box',
      outline: 'none'
    },
    error: {
      color: '#dc3545',
      fontSize: '12px',
      marginTop: '4px'
    },
    required: {
      color: '#dc3545'
    },
    dropdown: {
      position: 'relative',
      width: '100%'
    },
    dropdownButton: {
      width: '100%',
      padding: '10px 14px',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      backgroundColor: 'white',
      textAlign: 'left',
      cursor: 'pointer',
      display: 'flex',
      justifyContent: 'space-between',
      alignItems: 'center',
      fontSize: '14px',
      transition: 'all 0.2s ease',
      outline: 'none'
    },
    dropdownButtonActive: {
      border: '1px solid #667eea',
      boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)'
    },
    dropdownMenu: {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      backgroundColor: 'white',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1050, // Increased z-index to prevent overlap
      maxHeight: '200px',
      overflowY: 'auto',
      marginTop: '4px'
    },
    dropdownMenuPersonToMeet: {
      position: 'absolute',
      top: '100%',
      left: '0',
      right: '0',
      backgroundColor: 'white',
      border: '1px solid #d1d5db',
      borderRadius: '8px',
      boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
      zIndex: 1060, // Higher z-index for person to meet dropdown
      maxHeight: '200px',
      overflowY: 'auto',
      marginTop: '4px'
    },
    dropdownSearch: {
      width: '100%',
      padding: '8px 12px',
      border: 'none',
      borderBottom: '1px solid #e5e7eb',
      fontSize: '14px',
      boxSizing: 'border-box',
      outline: 'none'
    },
    dropdownItem: {
      padding: '10px 14px',
      cursor: 'pointer',
      fontSize: '14px',
      transition: 'background-color 0.1s ease',
      borderBottom: '1px solid #f3f4f6'
    },
    dropdownItemHover: {
      backgroundColor: '#f8f9fa'
    },
    photoSection: {
      textAlign: 'center',
      marginBottom: '24px'
    },
    photoPreview: {
      width: '200px',
      height: '200px',
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto 16px',
      backgroundColor: '#f8f9fa',
      overflow: 'hidden'
    },
    photoImage: {
      width: '100%',
      height: '100%',
      objectFit: 'cover',
      borderRadius: '10px'
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
      backgroundColor: '#667eea',
      color: 'white',
      boxShadow: '0 2px 4px rgba(102, 126, 234, 0.3)'
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
    checkbox: {
      display: 'flex',
      alignItems: 'center',
      gap: '8px',
      marginBottom: '16px'
    },
    checkboxInput: {
      width: '16px',
      height: '16px',
      accentColor: '#667eea'
    },
    signatureSection: {
      textAlign: 'center',
      marginBottom: '24px'
    },
    signatureCanvas: {
      border: '2px dashed #d1d5db',
      borderRadius: '12px',
      backgroundColor: '#f8f9fa',
      display: 'block',
      margin: '0 auto 16px'
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
      maxWidth: '900px',
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
    // Add styles for custom input field
    customInputContainer: {
      marginTop: '12px'
    },
    // Additional spacing styles for form rows
    formRowSpaced: {
      display: 'grid',
      gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
      gap: '24px', // Increased gap for better spacing
      marginBottom: '20px'
    }
  };

  const toggleDropdown = (field) => {
    setDropdownStates(prev => {
      const newState = {};
      
      // Close all other dropdowns first
      Object.keys(prev).forEach(key => {
        if (key !== field) {
          newState[key] = {
            ...prev[key],
            isOpen: false,
            searchTerm: ''
          };
        }
      });
      
      // Toggle the clicked dropdown
      newState[field] = {
        ...prev[field],
        isOpen: !prev[field].isOpen,
        searchTerm: ''
      };
      
      return newState;
    });
  };

  const [customInputs, setCustomInputs] = useState({
    purpose: '',
    unit: '',
    personToMeet: '',
    documentType: ''
  });

  // Update handleDropdownSelect function to handle "Other" option
  const handleDropdownSelect = (field, value) => {
    const isOtherOption = value === 'Lainnya' || value === 'Other';
    
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Close all dropdowns when an option is selected
    setDropdownStates(prev => ({
      purpose: { ...prev.purpose, isOpen: false, searchTerm: '' },
      unit: { ...prev.unit, isOpen: false, searchTerm: '' },
      personToMeet: { ...prev.personToMeet, isOpen: false, searchTerm: '' },
      documentType: { ...prev.documentType, isOpen: false, searchTerm: '' }
    }));
    
    // Update the specific dropdown's custom input state
    setDropdownStates(prev => ({
      ...prev,
      [field]: {
        ...prev[field],
        showCustomInput: isOtherOption
      }
    }));
    
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  // Add function to handle custom input changes
  const handleCustomInputChange = (field, value) => {
    setCustomInputs(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear errors when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const filterOptions = (options, searchTerm) => {
    if (!Array.isArray(options)) return [];
    if (!searchTerm) return options;
    return options.filter(option => 
      option && option.name && option.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    
    if (errors[name]) {
      setErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };


  const capturePhoto = useCallback(() => {
    const imageSrc = webcamRef.current.getScreenshot();
    setCapturedImage(imageSrc);
    setShowWebcam(false);
  }, [webcamRef]);

  const clearSignature = () => {
    if (signatureRef.current) {
      signatureRef.current.clear();
      setSignatureData(null);
    }
  };

  const saveSignature = () => {
    if (signatureRef.current && !signatureRef.current.isEmpty()) {
      const signatureURL = signatureRef.current.toDataURL();
      setSignature(signatureURL);
      setSignatureData(signatureURL);
      setShowSignatureModal(false);
    }
  };

  // Add this function before validateForm()
  const validateIdNumber = (value, type) => {
    if (!value.trim()) {
      // ID Number is optional, so no error if empty
      setErrors(prev => ({...prev, idNumber: ''}));
      return true;
    }

    let isValid = false;
    let errorMessage = '';

    switch (type) {
      case 'KTP':
        // NIK (KTP) validation - exactly 16 digits
        const nikRegex = /^\d{16}$/;
        isValid = nikRegex.test(value);
        errorMessage = isValid ? '' : 'NIK harus terdiri dari 16 digit angka';
        break;
      
      case 'SIM':
        // SIM validation - format varies by region, generally 12-13 digits
        const simRegex = /^\d{12,13}$/;
        isValid = simRegex.test(value);
        errorMessage = isValid ? '' : 'Nomor SIM harus terdiri dari 12-13 digit angka';
        break;
      
      case 'Passport':
        // Passport validation - alphanumeric, 6-9 characters
        const passportRegex = /^[A-Za-z0-9]{6,9}$/;
        isValid = passportRegex.test(value);
        errorMessage = isValid ? '' : 'Nomor Passport harus 6-9 karakter alfanumerik';
        break;
      
      case 'KTM':
        // KTM (Kartu Tanda Mahasiswa) validation - varies by university, alphanumeric minimum 6 characters
        const ktmRegex = /^[A-Za-z0-9]{6,15}$/;
        isValid = ktmRegex.test(value);
        errorMessage = isValid ? '' : 'Nomor KTM harus minimal 6 karakter alfanumerik';
        break;
      
      case 'Kartu Pelajar':
        // Student card validation - alphanumeric 8-12 characters
        const studentCardRegex = /^[A-Za-z0-9]{8,12}$/;
        isValid = studentCardRegex.test(value);
        errorMessage = isValid ? '' : 'Nomor Kartu Pelajar harus 8-12 karakter alfanumerik';
        break;
      
      default:
        // If no type selected, accept any alphanumeric format
        const defaultRegex = /^[A-Za-z0-9]{6,16}$/;
        isValid = defaultRegex.test(value);
        errorMessage = isValid ? '' : 'Format nomor identitas tidak valid';
        break;
    }

    if (isValid) {
      setErrors(prev => ({...prev, idNumber: ''}));
      return true;
    } else {
      setErrors(prev => ({
        ...prev, 
        idNumber: errorMessage
      }));
      return false;
    }
  };

  // Update validateForm() function to include ID number validation
  const validateForm = () => {
    const newErrors = {};

    if (!formData.name.trim()) {
      newErrors.name = 'Nama wajib diisi';
    }

    if (!formData.phone.trim()) {
      newErrors.phone = 'Nomor telepon wajib diisi';
    }

    if (!formData.institution.trim()) {
      newErrors.institution = 'Institusi wajib diisi';
    }

    if (!formData.purpose.trim()) {
      newErrors.purpose = 'Tujuan kunjungan wajib diisi';
    } else if (formData.purpose === 'Lainnya' && !customInputs.purpose.trim()) {
      newErrors.purpose = 'Silakan isi tujuan kunjungan lainnya';
    }

    if (!formData.unit.trim()) {
      newErrors.unit = 'Unit/Bagian wajib diisi';
    } else if (formData.unit === 'Lainnya' && !customInputs.unit.trim()) {
      newErrors.unit = 'Silakan isi unit/bagian lainnya';
    }

    if (!formData.personToMeet.trim()) {
      newErrors.personToMeet = 'Orang yang ditemui wajib diisi';
    } else if (formData.personToMeet === 'Lainnya' && !customInputs.personToMeet.trim()) {
      newErrors.personToMeet = 'Silakan isi nama orang yang akan ditemui';
    }


    
    // Validate ID number if provided
    if (formData.idNumber.trim() && !validateIdNumber(formData.idNumber, formData.idType)) {
      newErrors.idNumber = 'Format nomor identitas tidak sesuai dengan jenis yang dipilih';
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }

    setIsLoading(true);
    try {
      // Prepare JSON data with custom inputs properly handled
      const submitData = {
        ...formData,
        // Handle identity fields - map to backend field names
        id_type: formData.idType,
        id_number: formData.idNumber,
        // Handle custom purpose
        purpose: formData.purpose === 'Lainnya' && customInputs.purpose ? 
          `Other: ${customInputs.purpose}` : formData.purpose,
        // Handle custom unit
        unit: formData.unit === 'Lainnya' && customInputs.unit ? 
          `Other: ${customInputs.unit}` : formData.unit,
        // Handle custom person to meet - map to correct backend field name
        person_to_meet: formData.personToMeet === 'Lainnya' && customInputs.personToMeet ? 
          `Other: ${customInputs.personToMeet}` : formData.personToMeet,
        // Handle document request fields
        request_document: formData.requestDocument,
        document_type: formData.documentType === 'Lainnya' && customInputs.documentType ? 
          customInputs.documentType : formData.documentType,
        document_name: formData.documentName,
        document_number: formData.documentNumber,
        // Only include photo and signature if they have valid data
        ...(capturedImage && capturedImage.length > 10 ? { photo: capturedImage } : {}),
        ...(signatureData && signatureData.length > 10 ? { signature: signatureData } : {})
      };

      // Remove the camelCase fields to avoid confusion
      delete submitData.personToMeet;
      delete submitData.requestDocument;
      delete submitData.documentType;
      delete submitData.documentName;
      delete submitData.documentNumber;
      delete submitData.idType;
      delete submitData.idNumber;

      // Submitting check-in data

      // Get token from localStorage for authentication
      const token = localStorage.getItem('token');
      // Token for check-in request

      const response = await fetch(`${import.meta.env.VITE_API_URL}/visitors/check-in`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(submitData)
      });

      const result = await response.json();

      if (!response.ok || !result.success) {
        console.error('Check-in failed:', result);
        console.error('Error details:', result.errors);
        alert.error(`Error: ${result.message}\nDetails: ${result.errors ? result.errors.join(', ') : 'Unknown error'}`);
        throw new Error(result.message || 'Check-in failed');
      }

      if (response.ok && result.success) {
        alert.success('Check-in berhasil! ID Pengunjung: ' + result.data.visitor.id);
        navigate('/app/visitors');
      } else {
        alert.error(result.message || 'Gagal melakukan check-in');
      }
    } catch (error) {
      console.error('Error:', error);
      alert.error('Terjadi kesalahan saat check-in');
    } finally {
      setIsLoading(false);
    }
  };


  return (
    <div style={styles.container}>
      {/* Main Card with Header */}
      <div style={styles.mainCard}>
        <div style={styles.header}>
          <h1 style={styles.headerTitle}>
            <User size={32} />
            Check-in Pengunjung
          </h1>
          <p style={styles.headerSubtitle}>
            Daftarkan pengunjung baru
          </p>
        </div>

        <form onSubmit={handleSubmit} style={{ padding: '20px' }}>
          {/* Informasi Pribadi Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <User size={20} />
                Informasi Pribadi
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                {/* Nama Lengkap - Row 1 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nama Lengkap <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.name ? styles.inputError : {})
                    }}
                    placeholder="Masukkan nama lengkap"
                    onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                    onBlur={(e) => Object.assign(e.target.style, { border: errors.name ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                  {errors.name && (
                    <div style={styles.error}>{errors.name}</div>
                  )}
                </div>

                {/* Nomor Telepon - Row 2 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Nomor Telepon <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="tel"
                    name="phone"
                    value={formData.phone}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.phone ? styles.inputError : {})
                    }}
                    placeholder="Masukkan nomor telepon"
                    onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                    onBlur={(e) => Object.assign(e.target.style, { border: errors.phone ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                  {errors.phone && (
                    <div style={styles.error}>{errors.phone}</div>
                  )}
                </div>

                {/* Email - Row 3 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Email</label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={styles.input}
                    placeholder="Masukkan alamat email"
                    onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                    onBlur={(e) => Object.assign(e.target.style, { border: '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                </div>

                {/* Institusi - Row 4 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>
                    Institusi <span style={styles.required}>*</span>
                  </label>
                  <input
                    type="text"
                    name="institution"
                    value={formData.institution}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.institution ? styles.inputError : {})
                    }}
                    placeholder="Masukkan nama institusi/perusahaan"
                    onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                    onBlur={(e) => Object.assign(e.target.style, { border: errors.institution ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                  {errors.institution && (
                    <div style={styles.error}>{errors.institution}</div>
                  )}
                </div>

                {/* Jenis Identitas - Row 5 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Jenis Identitas</label>
                  <select
                    name="idType"
                    value={formData.idType}
                    onChange={handleInputChange}
                    style={styles.input}
                  >
                    <option value="">Pilih jenis identitas</option>
                    <option value="KTP">KTP (NIK)</option>
                    <option value="SIM">SIM</option>
                    <option value="Passport">Paspor</option>
                    <option value="KTM">KTM (Kartu Tanda Mahasiswa)</option>
                    <option value="Kartu Pelajar">Kartu Pelajar</option>
                  </select>
                </div>

                {/* Nomor Identitas - Row 6 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Nomor Identitas</label>
                  <input
                    type="text"
                    name="idNumber"
                    value={formData.idNumber}
                    onChange={handleInputChange}
                    style={{
                      ...styles.input,
                      ...(errors.idNumber ? styles.inputError : {})
                    }}
                    placeholder={
                      formData.idType === 'KTP' ? 'Masukkan NIK 16 digit' :
                      formData.idType === 'SIM' ? 'Masukkan nomor SIM' :
                      formData.idType === 'Passport' ? 'Masukkan nomor paspor' :
                      formData.idType === 'KTM' ? 'Masukkan nomor mahasiswa' :
                      formData.idType === 'Kartu Pelajar' ? 'Masukkan nomor kartu pelajar' :
                      'Masukkan nomor identitas'
                    }
                    onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                    onBlur={(e) => {
                      Object.assign(e.target.style, { 
                        border: errors.idNumber ? '1px solid #dc3545' : '1px solid #d1d5db', 
                        boxShadow: 'none' 
                      });
                      validateIdNumber(e.target.value, formData.idType);
                    }}
                  />
                  {errors.idNumber && (
                    <div style={styles.error}>{errors.idNumber}</div>
                  )}
                  {formData.idType && (
                    <div style={{ 
                      fontSize: '12px', 
                      color: '#6c757d', 
                      marginTop: '4px' 
                    }}>
                      {formData.idType === 'KTP' && 'NIK: 16 digit angka'}
                      {formData.idType === 'SIM' && 'SIM: 12-13 digit angka'}
                      {formData.idType === 'Passport' && 'Passport: 6-9 karakter alfanumerik'}
                      {formData.idType === 'KTM' && 'KTM: minimal 6 karakter alfanumerik'}
                      {formData.idType === 'Kartu Pelajar' && 'Kartu Pelajar: 8-12 karakter alfanumerik'}
                    </div>
                  )}
                </div>

                {/* Alamat - Row 7 */}
                <div style={styles.formGroup}>
                  <label style={styles.label}>Alamat</label>
                  <textarea
                    name="address"
                    value={formData.address}
                    onChange={handleInputChange}
                    maxLength={155}
                    style={styles.textarea}
                    placeholder="Masukkan alamat"
                    onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                    onBlur={(e) => Object.assign(e.target.style, { border: '1px solid #d1d5db', boxShadow: 'none' })}
                  />
                  <div style={{ 
                    fontSize: '12px', 
                    color: '#6c757d', 
                    textAlign: 'right',
                    marginTop: '4px' 
                  }}>
                    {(formData.address || '').length}/150 karakter
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Informasi Kunjungan Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <Building size={20} />
                Informasi Kunjungan
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                {/* Tujuan Kunjungan - Row 1 */}                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Tujuan Kunjungan <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.dropdown} data-dropdown>
                      <button
                        type="button"
                        onClick={() => toggleDropdown('purpose')}
                        style={{
                          ...styles.dropdownButton,
                          ...(dropdownStates.purpose.isOpen ? styles.dropdownButtonActive : {}),
                          ...(errors.purpose ? styles.inputError : {})
                        }}
                      >
                        <span style={{ 
                          color: formData.purpose ? '#495057' : '#6c757d'
                        }}>
                          {formData.purpose || 'Pilih tujuan'}
                        </span>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            transform: dropdownStates.purpose.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                      
                      {dropdownStates.purpose.isOpen && (
                        <div style={styles.dropdownMenu}>
                          <input
                            type="text"
                            placeholder="Cari tujuan..."
                            value={dropdownStates.purpose.searchTerm}
                            onChange={(e) => setDropdownStates(prev => ({
                              ...prev,
                              purpose: { ...prev.purpose, searchTerm: e.target.value }
                            }))}
                            style={styles.dropdownSearch}
                          />
                          {filterOptions(configurations.purposes, dropdownStates.purpose.searchTerm).map((purpose) => (
                            <div
                              key={purpose.id}
                              onClick={() => handleDropdownSelect('purpose', purpose.name)}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              {purpose.name}
                            </div>
                          ))}
                          {/* Add "Other" option if not already included */}
                          <div
                            onClick={() => handleDropdownSelect('purpose', 'Lainnya')}
                            style={{...styles.dropdownItem, borderTop: '1px solid #e5e7eb', fontStyle: 'italic'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            + Lainnya
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.purpose && (
                      <div style={styles.error}>{errors.purpose}</div>
                    )}
                    
                    {/* Show custom input field when "Lainnya" is selected */}
                    {formData.purpose === 'Lainnya' && (
                      <div style={styles.customInputContainer}>
                        <input
                          type="text"
                          placeholder="Masukkan tujuan kunjungan lainnya..."
                          value={customInputs.purpose}
                          onChange={(e) => handleCustomInputChange('purpose', e.target.value)}
                          style={{
                            ...styles.input,
                            ...(errors.purpose ? styles.inputError : {})
                          }}
                          onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                          onBlur={(e) => Object.assign(e.target.style, { 
                            border: errors.purpose ? '1px solid #dc3545' : '1px solid #d1d5db', 
                            boxShadow: 'none' 
                          })}
                        />
                      </div>
                    )}
                  </div>

                {/* Unit/Bagian - Row 2 */}                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Unit/Bagian <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.dropdown} data-dropdown>
                      <button
                        type="button"
                        onClick={() => toggleDropdown('unit')}
                        style={{
                          ...styles.dropdownButton,
                          ...(dropdownStates.unit.isOpen ? styles.dropdownButtonActive : {}),
                          ...(errors.unit ? styles.inputError : {})
                        }}
                      >
                        <span style={{ 
                          color: formData.unit ? '#495057' : '#6c757d'
                        }}>
                          {formData.unit || 'Pilih unit'}
                        </span>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            transform: dropdownStates.unit.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                      
                      {dropdownStates.unit.isOpen && (
                        <div style={styles.dropdownMenu}>
                          <input
                            type="text"
                            placeholder="Cari unit..."
                            value={dropdownStates.unit.searchTerm}
                            onChange={(e) => setDropdownStates(prev => ({
                              ...prev,
                              unit: { ...prev.unit, searchTerm: e.target.value }
                            }))}
                            style={styles.dropdownSearch}
                          />
                          {filterOptions(configurations.units, dropdownStates.unit.searchTerm).map((unit) => (
                            <div
                              key={unit.id}
                              onClick={() => handleDropdownSelect('unit', unit.name)}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              {unit.name}
                            </div>
                          ))}
                          {/* Add "Other" option */}
                          <div
                            onClick={() => handleDropdownSelect('unit', 'Lainnya')}
                            style={{...styles.dropdownItem, borderTop: '1px solid #e5e7eb', fontStyle: 'italic'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            + Lainnya
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.unit && (
                      <div style={styles.error}>{errors.unit}</div>
                    )}
                    
                    {/* Show custom input field when "Lainnya" is selected */}
                    {formData.unit === 'Lainnya' && (
                      <div style={styles.customInputContainer}>
                        <input
                          type="text"
                          placeholder="Masukkan unit/bagian lainnya..."
                          value={customInputs.unit}
                          onChange={(e) => handleCustomInputChange('unit', e.target.value)}
                          style={{
                            ...styles.input,
                            ...(errors.unit ? styles.inputError : {})
                          }}
                          onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                          onBlur={(e) => Object.assign(e.target.style, { 
                            border: errors.unit ? '1px solid #dc3545' : '1px solid #d1d5db', 
                            boxShadow: 'none' 
                          })}
                        />
                      </div>
                    )}
                  </div>

                {/* Orang yang Ditemui - Row 3 */}                  <div style={styles.formGroup}>
                    <label style={styles.label}>
                      Orang yang Ditemui <span style={styles.required}>*</span>
                    </label>
                    <div style={styles.dropdown} data-dropdown>
                      <button
                        type="button"
                        onClick={() => toggleDropdown('personToMeet')}
                        style={{
                          ...styles.dropdownButton,
                          ...(dropdownStates.personToMeet.isOpen ? styles.dropdownButtonActive : {}),
                          ...(errors.personToMeet ? styles.inputError : {})
                        }}
                      >
                        <span style={{ 
                          color: formData.personToMeet ? '#495057' : '#6c757d'
                        }}>
                          {formData.personToMeet || 'Pilih orang'}
                        </span>
                        <ChevronDown 
                          size={16} 
                          style={{ 
                            transform: dropdownStates.personToMeet.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                            transition: 'transform 0.2s ease'
                          }}
                        />
                      </button>
                      
                      {dropdownStates.personToMeet.isOpen && (
                        <div style={styles.dropdownMenuPersonToMeet}>
                          <input
                            type="text"
                            placeholder="Cari orang..."
                            value={dropdownStates.personToMeet.searchTerm}
                            onChange={(e) => setDropdownStates(prev => ({
                              ...prev,
                              personToMeet: { ...prev.personToMeet, searchTerm: e.target.value }
                            }))}
                            style={styles.dropdownSearch}
                          />
                          {filterOptions(configurations.personToMeet, dropdownStates.personToMeet.searchTerm).map((person) => (
                            <div
                              key={person.id}
                              onClick={() => handleDropdownSelect('personToMeet', person.name)}
                              style={styles.dropdownItem}
                              onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                              onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                            >
                              {person.name}
                            </div>
                          ))}
                          {/* Add "Other" option */}
                          <div
                            onClick={() => handleDropdownSelect('personToMeet', 'Lainnya')}
                            style={{...styles.dropdownItem, borderTop: '1px solid #e5e7eb', fontStyle: 'italic'}}
                            onMouseEnter={(e) => e.target.style.backgroundColor = '#f8f9fa'}
                            onMouseLeave={(e) => e.target.style.backgroundColor = 'transparent'}
                          >
                            + Lainnya
                          </div>
                        </div>
                      )}
                    </div>
                    {errors.personToMeet && (
                      <div style={styles.error}>{errors.personToMeet}</div>
                    )}
                    
                    {/* Show custom input field when "Lainnya" is selected */}
                    {formData.personToMeet === 'Lainnya' && (
                      <div style={styles.customInputContainer}>
                        <input
                          type="text"
                          placeholder="Masukkan nama orang..."
                          value={customInputs.personToMeet}
                          onChange={(e) => handleCustomInputChange('personToMeet', e.target.value)}
                          style={{
                            ...styles.input,
                            ...(errors.personToMeet ? styles.inputError : {})
                          }}
                          onFocus={(e) => Object.assign(e.target.style, { border: '1px solid #667eea', boxShadow: '0 0 0 3px rgba(102, 126, 234, 0.1)' })}
                          onBlur={(e) => Object.assign(e.target.style, { 
                            border: errors.personToMeet ? '1px solid #dc3545' : '1px solid #d1d5db', 
                            boxShadow: 'none' 
                          })}
                        />
                      </div>
                    )}
                  </div>

              </div>
            </div>
          </div>

          {/* Permintaan Dokumen Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <FileCheck size={20} />
                Permintaan Dokumen
              </h3>
            </div>
            <div style={styles.sectionBody}>
              <div style={styles.formGrid}>
                {/* Request Document Checkbox */}
                <div style={{ ...styles.formGroup, gridColumn: 'span 2' }}>
                  <label style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#374151',
                    cursor: 'pointer'
                  }}>
                    <input
                      type="checkbox"
                      checked={formData.requestDocument}
                      onChange={(e) => setFormData(prev => ({
                        ...prev,
                        requestDocument: e.target.checked,
                        // Clear document fields if unchecked
                        documentType: e.target.checked ? prev.documentType : '',
                        documentName: e.target.checked ? prev.documentName : '',
                        documentNumber: e.target.checked ? prev.documentNumber : ''
                      }))}
                      style={{
                        width: '16px',
                        height: '16px',
                        accentColor: '#667eea'
                      }}
                    />
                    Saya memerlukan dokumen dari ULT FPEB
                  </label>
                </div>

                {/* Document Fields - Only show if request is checked */}
                {formData.requestDocument && (
                  <>
                    {/* Document Type Dropdown */}
                    <div style={styles.formGroup} data-dropdown>
                      <label style={styles.label}>
                        Jenis Dokumen <span style={styles.required}>*</span>
                      </label>
                      <div style={{ position: 'relative' }}>
                        <div
                          onClick={() => setDropdownStates(prev => ({
                            ...prev,
                            documentType: { ...prev.documentType, isOpen: !prev.documentType.isOpen }
                          }))}
                          style={{
                            ...styles.input,
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            cursor: 'pointer',
                            backgroundColor: 'white'
                          }}
                        >
                          <span style={{ color: formData.documentType ? '#000' : '#9ca3af' }}>
                            {formData.documentType || 'Pilih jenis dokumen'}
                          </span>
                          <ChevronDown 
                            size={16} 
                            style={{
                              transform: dropdownStates.documentType.isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
                              transition: 'transform 0.2s'
                            }}
                          />
                        </div>
                        
                        {dropdownStates.documentType.isOpen && (
                          <div style={styles.dropdown}>
                            <div style={styles.dropdownHeader}>
                              <Search size={16} style={{ color: '#9ca3af' }} />
                              <input
                                type="text"
                                placeholder="Cari jenis dokumen..."
                                value={dropdownStates.documentType.searchTerm}
                                onChange={(e) => setDropdownStates(prev => ({
                                  ...prev,
                                  documentType: { ...prev.documentType, searchTerm: e.target.value }
                                }))}
                                style={styles.dropdownSearch}
                                onClick={(e) => e.stopPropagation()}
                              />
                            </div>
                            <div style={styles.dropdownList}>
                              {documentTypes
                                .filter(type => type.toLowerCase().includes(dropdownStates.documentType.searchTerm.toLowerCase()))
                                .map((type, index) => (
                                <div
                                  key={index}
                                  onClick={() => handleDropdownSelect('documentType', type)}
                                  style={styles.dropdownItem}
                                >
                                  {type}
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                      </div>
                      {errors.documentType && (
                        <div style={styles.error}>{errors.documentType}</div>
                      )}
                    </div>

                    {/* Custom Document Type Input */}
                    {dropdownStates.documentType.showCustomInput && (
                      <div style={styles.formGroup}>
                        <label style={styles.label}>
                          Jenis Dokumen Lainnya <span style={styles.required}>*</span>
                        </label>
                        <input
                          type="text"
                          value={customInputs.documentType}
                          onChange={(e) => handleCustomInputChange('documentType', e.target.value)}
                          style={{
                            ...styles.input,
                            ...(errors.documentType ? styles.inputError : {})
                          }}
                          placeholder="Masukkan jenis dokumen"
                          onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                          onBlur={(e) => Object.assign(e.target.style, { border: errors.documentType ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                        />
                      </div>
                    )}

                    {/* Document Name */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Nama Dokumen <span style={styles.required}>*</span>
                      </label>
                      <input
                        type="text"
                        name="documentName"
                        value={formData.documentName}
                        onChange={handleInputChange}
                        style={{
                          ...styles.input,
                          ...(errors.documentName ? styles.inputError : {})
                        }}
                        placeholder="Contoh: Transkrip Semester 1-6"
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: errors.documentName ? '1px solid #dc3545' : '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                      {errors.documentName && (
                        <div style={styles.error}>{errors.documentName}</div>
                      )}
                    </div>

                    {/* Document Number */}
                    <div style={styles.formGroup}>
                      <label style={styles.label}>
                        Nomor Dokumen (Opsional)
                      </label>
                      <input
                        type="text"
                        name="documentNumber"
                        value={formData.documentNumber}
                        onChange={handleInputChange}
                        style={styles.input}
                        placeholder="Nomor dokumen jika ada"
                        onFocus={(e) => Object.assign(e.target.style, styles.inputFocus)}
                        onBlur={(e) => Object.assign(e.target.style, { border: '1px solid #d1d5db', boxShadow: 'none' })}
                      />
                    </div>
                  </>
                )}
              </div>
            </div>
          </div>

          {/* Foto dan Tanda Tangan Section */}
          <div style={styles.sectionCard}>
            <div style={styles.sectionHeader}>
              <h3 style={styles.sectionTitle}>
                <Camera size={20} />
                Foto & Tanda Tangan
              </h3>
            </div>
            <div style={styles.sectionBody}>
              {/* Photo Capture Section */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <h4 style={{...styles.sectionTitle, fontSize: '16px'}}>
                    <Camera size={16} />
                    Foto Pengunjung
                  </h4>
                </div>
                <div style={styles.sectionBody}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={styles.photoPreview}>
                      {capturedImage ? (
                        <img
                          src={capturedImage}
                          alt="Captured"
                          style={styles.photoImage}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6c757d' }}>
                          <Camera size={32} style={{ marginBottom: '8px' }} />
                          <p style={{ margin: 0, fontSize: '14px' }}>Belum ada foto</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPhotoModal(true)}
                      style={{
                        ...styles.button,
                        ...styles.primaryButton,
                        padding: '12px 24px'
                      }}
                    >
                      <Camera size={18} />
                      {capturedImage ? 'Ambil Ulang Foto' : 'Ambil Foto'}
                    </button>
                    {errors.photo && (
                      <div style={styles.error}>{errors.photo}</div>
                    )}
                  </div>
                </div>
              </div>

              {/* Tanda Tangan Digital Section */}
              <div style={styles.sectionCard}>
                <div style={styles.sectionHeader}>
                  <h4 style={{...styles.sectionTitle, fontSize: '16px'}}>
                    <FileText size={16} />
                    Tanda Tangan Digital
                  </h4>
                </div>
                <div style={styles.sectionBody}>
                  <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '16px'
                  }}>
                    <div style={{ 
                      width: '400px', 
                      height: '150px', 
                      border: '2px dashed #d1d5db', 
                      borderRadius: '12px',
                      backgroundColor: '#f8f9fa',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center'
                    }}>
                      {signature ? (
                        <img 
                          src={signature} 
                          alt="Signature" 
                          style={{ maxWidth: '100%', maxHeight: '100%' }}
                        />
                      ) : (
                        <div style={{ textAlign: 'center', color: '#6c757d' }}>
                          <FileText size={32} style={{ marginBottom: '8px' }} />
                          <p style={{ margin: 0, fontSize: '14px' }}>Belum ada tanda tangan</p>
                        </div>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowSignatureModal(true)}
                      style={{
                        ...styles.button,
                        backgroundColor: '#6f42c1',
                        color: 'white',
                        padding: '12px 24px',
                        boxShadow: '0 2px 4px rgba(111, 66, 193, 0.3)'
                      }}
                    >
                      <FileText size={18} />
                      {signature ? 'Perbarui Tanda Tangan' : 'Tambah Tanda Tangan'}
                    </button>
                    {errors.signature && (
                      <div style={styles.error}>{errors.signature}</div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div style={{ textAlign: 'center', marginTop: '32px' }}>
            <button
              type="submit"
              disabled={isLoading}
              style={{
                ...styles.button,
                ...(isLoading ? styles.loadingButton : styles.successButton),
                fontSize: '16px',
                padding: '14px 32px'
              }}
            >
              <Save size={20} />
              {isLoading ? 'Menyimpan...' : 'Selesaikan Check-in'}
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
                Ambil Foto
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
              {!showWebcam && !capturedImage && (
                <div style={{
                  border: '2px dashed #d1d5db',
                  borderRadius: '12px',
                  padding: '40px',
                  backgroundColor: '#f8f9fa'
                }}>
                  <Camera size={48} style={{ color: '#6c757d', marginBottom: '16px' }} />
                  <p style={{ margin: 0, color: '#6c757d' }}>
                    Klik untuk memulai kamera
                  </p>
                  <button
                    onClick={() => setShowWebcam(true)}
                    style={{
                      ...styles.button,
                      ...styles.primaryButton
                    }}
                  >
                    <Camera size={16} />
                    Mulai Kamera
                  </button>
                </div>
              )}

              {showWebcam && !capturedImage && (
                <div>
                  <div style={{
                    border: '2px solid #667eea',
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
                      style={{ display: 'block', maxWidth: '500px' }}
                      videoConstraints={{
                        facingMode: 'user'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={capturePhoto}
                      style={{
                        ...styles.button,
                        ...styles.successButton
                      }}
                    >
                      <Camera size={16} />
                      Ambil
                    </button>
                    <button
                      onClick={() => setShowWebcam(false)}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton
                      }}
                    >
                      Batal
                    </button>
                  </div>
                </div>
              )}

              {capturedImage && (
                <div>
                  <div style={{
                    border: '2px solid #10b981',
                    borderRadius: '12px',
                    overflow: 'hidden',
                    display: 'inline-block',
                    marginBottom: '20px'
                  }}>
                    <img
                      src={capturedImage}
                      alt="Captured"
                      style={{
                        maxWidth: '500px',
                        width: '100%',
                        height: 'auto',
                        display: 'block'
                      }}
                    />
                  </div>
                  <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                    <button
                      onClick={() => {
                        setShowPhotoModal(false);
                        setShowWebcam(false);
                      }}
                      style={{
                        ...styles.button,
                        ...styles.successButton
                      }}
                    >
                      <Save size={16} />
                      Gunakan Foto
                    </button>
                    <button
                      onClick={() => {
                        setCapturedImage(null);
                        setShowWebcam(true);
                      }}
                      style={{
                        ...styles.button,
                        ...styles.secondaryButton
                      }}
                    >
                      <RotateCcw size={16} />
                      Ambil Ulang
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Signature Modal */}
      {showSignatureModal && (
        <div style={styles.modal}>
          <div style={styles.modalContent}>
            <div style={styles.modalHeader}>
              <h3 style={styles.modalTitle}>
                <FileText size={24} />
                Tanda Tangan Digital
              </h3>
              <button
                onClick={() => setShowSignatureModal(false)}
                style={styles.closeButton}
              >
                <X size={20} />
              </button>
            </div>

            <div style={{ textAlign: 'center' }}>
              <p style={{ color: '#6c757d', marginBottom: '20px' }}>
                Silakan tanda tangan di area di bawah ini
              </p>
              <div style={{
                border: '2px solid #d1d5db',
                borderRadius: '12px',
                display: 'inline-block',
                marginBottom: '20px'
              }}>
                <SignatureCanvas
                  ref={signatureRef}
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: 'signature-canvas',
                    style: { borderRadius: '10px' }
                  }}
                />
              </div>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button
                  onClick={saveSignature}
                  style={{
                    ...styles.button,
                    ...styles.successButton
                  }}
                >
                  <Save size={16} />
                  Simpan Tanda Tangan
                </button>
                <button
                  onClick={clearSignature}
                  style={{
                    ...styles.button,
                    ...styles.secondaryButton
                  }}
                >
                  <Eraser size={16} />
                  Hapus
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
