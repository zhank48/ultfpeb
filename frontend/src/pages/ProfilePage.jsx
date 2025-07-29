import { useState, useEffect, useRef } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usersAPI } from '../utils/api.js';
import { SafeImage } from '../components/SafeImage.jsx';
import { 
  User, 
  Mail, 
  Phone, 
  Building2, 
  Shield, 
  Camera,
  Edit3,
  Save,
  X,
  Eye,
  EyeOff,
  Lock,
  CheckCircle,
  AlertCircle,
  Calendar,
  UserCheck,
  Settings
} from 'lucide-react';

export function ProfilePage() {
  const { user, updateUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isEditing, setIsEditing] = useState(false);
  const [isChangingPassword, setIsChangingPassword] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [isUploadingPhoto, setIsUploadingPhoto] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const [showCurrentPassword, setShowCurrentPassword] = useState(false);
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  
  const fileInputRef = useRef(null);
  
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    study_program: '',
    cohort: '',
    phone: ''
  });
  
  const [passwordData, setPasswordData] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  
  const [formErrors, setFormErrors] = useState({});
  const [passwordErrors, setPasswordErrors] = useState({});

  // Styles matching VisitorDetailPage
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
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

  const inputStyle = {
    width: '100%',
    padding: '12px 16px',
    border: '1px solid #ced4da',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease-in-out, box-shadow 0.15s ease-in-out'
  };

  const labelStyle = {
    display: 'block',
    fontSize: '12px',
    fontWeight: '600',
    color: '#6c757d',
    textTransform: 'uppercase',
    letterSpacing: '0.5px',
    marginBottom: '8px'
  };

  const valueStyle = {
    fontSize: '14px',
    color: '#495057',
    fontWeight: '500',
    marginBottom: '16px'
  };

  // Helper function to get proper photo URL
  const getPhotoUrl = (photoUrl, avatarUrl) => {
    // Prioritize photo_url, then avatar_url
    const url = photoUrl || avatarUrl;
    
    // Check if URL is valid (not null, undefined, empty, or string 'null'/'undefined')
    if (!url || url === 'null' || url === 'undefined' || url.trim() === '') {
      return null;
    }
    
    // If URL already starts with http, use as is
    if (url.startsWith('http')) {
      return url;
    }
    
    // If URL starts with /, prepend base URL
    if (url.startsWith('/')) {
      return `${import.meta.env.VITE_API_URL.replace("/api", "")}${url}`;
    }
    
    // Otherwise, prepend full path
    return `${import.meta.env.VITE_API_URL.replace("/api", "")}/${url}`;
  };

  useEffect(() => {
    fetchProfile();
  }, []);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      setError('');
      
      const response = await usersAPI.getProfile();
      if (response.data.success) {
        const profileData = response.data.data;
        setProfile(profileData);
        setFormData({
          name: profileData.name || '',
          email: profileData.email || '',
          study_program: profileData.study_program || '',
          cohort: profileData.cohort || '',
          phone: profileData.phone || ''
        });
      } else {
        setError('Failed to fetch profile data');
      }
    } catch (error) {
      console.error('Error fetching profile:', error);
      setError('Failed to load profile');
    } finally {
      setIsLoading(false);
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (formErrors[name]) {
      setFormErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const handlePasswordChange = (e) => {
    const { name, value } = e.target;
    setPasswordData(prev => ({
      ...prev,
      [name]: value
    }));
    // Clear error for this field
    if (passwordErrors[name]) {
      setPasswordErrors(prev => ({
        ...prev,
        [name]: ''
      }));
    }
  };

  const validateForm = () => {
    const errors = {};
    
    if (!formData.name.trim()) {
      errors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      errors.name = 'Name must be at least 2 characters long';
    }
    
    if (!formData.email.trim()) {
      errors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      errors.email = 'Please enter a valid email address';
    }
    
    setFormErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const validatePassword = () => {
    const errors = {};
    
    if (!passwordData.currentPassword) {
      errors.currentPassword = 'Current password is required';
    }
    
    if (!passwordData.newPassword) {
      errors.newPassword = 'New password is required';
    } else if (passwordData.newPassword.length < 6) {
      errors.newPassword = 'Password must be at least 6 characters long';
    }
    
    if (!passwordData.confirmPassword) {
      errors.confirmPassword = 'Please confirm your password';
    } else if (passwordData.newPassword !== passwordData.confirmPassword) {
      errors.confirmPassword = 'Passwords do not match';
    }
    
    if (passwordData.currentPassword === passwordData.newPassword) {
      errors.newPassword = 'New password must be different from current password';
    }
    
    setPasswordErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSaveProfile = async () => {
    if (!validateForm()) return;
    
    try {
      setSaving(true);
      setError('');
      
      const response = await usersAPI.update(profile.id, formData);
      if (response.data.success) {
        const updatedProfile = response.data.data;
        setProfile(updatedProfile);
        setMessage('Profile updated successfully!');
        setIsEditing(false);
        
        // Update auth context if name or email changed
        updateUser(updatedProfile);
        
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      setError(error.response?.data?.message || 'Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleChangePassword = async () => {
    if (!validatePassword()) return;
    
    try {
      setSaving(true);
      setError('');
      
      const response = await usersAPI.updatePassword(profile.id, {
        currentPassword: passwordData.currentPassword,
        newPassword: passwordData.newPassword
      });
      
      if (response.data.success) {
        setMessage('Password changed successfully!');
        setIsChangingPassword(false);
        setPasswordData({
          currentPassword: '',
          newPassword: '',
          confirmPassword: ''
        });
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError(response.data.message || 'Failed to change password');
      }
    } catch (error) {
      console.error('Error changing password:', error);
      setError(error.response?.data?.message || 'Failed to change password');
    } finally {
      setSaving(false);
    }
  };

  const handlePhotoUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Silakan pilih file gambar yang valid');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setError('Ukuran gambar harus kurang dari 5MB');
      return;
    }

    try {
      setIsUploadingPhoto(true);
      setError('');

      const formData = new FormData();
      formData.append('photo', file);

      const response = await usersAPI.uploadPhoto(profile.id, formData);
      if (response.data.success) {
        const updatedProfile = { ...profile, photo_url: response.data.data.photo_url };
        setProfile(updatedProfile);
        setMessage('Foto profil berhasil diperbarui!');
        setTimeout(() => setMessage(''), 5000);
      } else {
        setError('Gagal mengunggah foto');
      }
    } catch (error) {
      console.error('Error uploading photo:', error);
      setError('Gagal mengunggah foto');
    } finally {
      setIsUploadingPhoto(false);
    }
  };

  const cancelEdit = () => {
    setIsEditing(false);
    setFormData({
      name: profile.name || '',
      email: profile.email || '',
      study_program: profile.study_program || '',
      cohort: profile.cohort || '',
      phone: profile.phone || ''
    });
    setFormErrors({});
  };

  const cancelPasswordChange = () => {
    setIsChangingPassword(false);
    setPasswordData({
      currentPassword: '',
      newPassword: '',
      confirmPassword: ''
    });
    setPasswordErrors({});
  };

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    return new Date(dateString).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric'
    });
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
            <p style={{ color: '#6c757d', fontSize: '16px' }}>Memuat profil...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error && !profile) {
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
            {error}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      <div style={{ maxWidth: '1200px', margin: '0 auto' }}>
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
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#495057', 
              margin: '0 0 8px 0' 
            }}>
              My Profile
            </h1>
            <p style={{ 
              color: '#6c757d', 
              margin: '0',
              fontSize: '16px' 
            }}>
              Manage your account information and preferences
            </p>
          </div>
          
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            {!isEditing && !isChangingPassword && (
              <>
                <button
                  onClick={() => setIsChangingPassword(true)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#ffc107',
                    color: '#000'
                  }}
                >
                  <Lock size={16} />
                  Change Password
                </button>
                <button
                  onClick={() => setIsEditing(true)}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#0d6efd',
                    color: 'white'
                  }}
                >
                  <Edit3 size={16} />
                  Edit Profile
                </button>
              </>
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
            border: '1px solid #badbcc',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <CheckCircle size={16} />
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
            border: '1px solid #f5c6cb',
            display: 'flex',
            alignItems: 'center',
            gap: '8px'
          }}>
            <AlertCircle size={16} />
            {error}
          </div>
        )}

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: window.innerWidth <= 768 ? '1fr' : '350px 1fr', 
          gap: '24px' 
        }}>
          {/* Left Column - Photo & Role */}
          <div>
            {/* Profile Photo & Status */}
            <div style={cardStyle}>
              <div style={cardBodyStyle}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ position: 'relative', display: 'inline-block' }}>
                    <SafeImage
                      src={getPhotoUrl(profile?.photo_url, profile?.avatar_url)}
                      alt={profile?.name}
                      fallbackText={profile?.name}
                      style={{
                        width: '150px',
                        height: '150px',
                        borderRadius: '50%',
                        objectFit: 'cover',
                        border: '4px solid #dee2e6'
                      }}
                    />
                    
                    {/* Photo upload button */}
                    <button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingPhoto}
                      style={{
                        position: 'absolute',
                        bottom: '10px',
                        right: '10px',
                        width: '40px',
                        height: '40px',
                        borderRadius: '50%',
                        backgroundColor: '#0d6efd',
                        color: 'white',
                        border: '2px solid white',
                        cursor: isUploadingPhoto ? 'not-allowed' : 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.15)',
                        opacity: isUploadingPhoto ? 0.6 : 1
                      }}
                      title="Change profile photo"
                    >
                      {isUploadingPhoto ? (
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid transparent',
                          borderTop: '2px solid white',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                      ) : (
                        <Camera size={16} />
                      )}
                    </button>
                    
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept="image/*"
                      onChange={handlePhotoUpload}
                      style={{ display: 'none' }}
                    />
                  </div>
                  
                  <h2 style={{ 
                    fontSize: '24px', 
                    fontWeight: '600', 
                    color: '#495057', 
                    margin: '20px 0 16px 0' 
                  }}>
                    {profile?.name}
                  </h2>
                  
                  <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                    <span style={{
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: '8px',
                      padding: '8px 16px',
                      borderRadius: '20px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: profile?.role === 'Admin' ? '#f8d7da' : '#d1e7dd',
                      color: profile?.role === 'Admin' ? '#721c24' : '#0f5132'
                    }}>
                      {profile?.role === 'Admin' ? (
                        <Shield style={{ width: '16px', height: '16px' }} />
                      ) : (
                        <UserCheck style={{ width: '16px', height: '16px' }} />
                      )}
                      {profile?.role}
                    </span>
                  </div>
                  
                  <div style={{
                    fontSize: '12px',
                    color: '#6c757d',
                    lineHeight: '1.4'
                  }}>
                    <div style={{ marginBottom: '8px' }}>
                      <span style={{ fontWeight: '600' }}>Member since:</span><br />
                      {formatDate(profile?.created_at)}
                    </div>
                    <div>
                      <span style={{ fontWeight: '600' }}>Last updated:</span><br />
                      {formatDate(profile?.updated_at)}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Column - Profile Information */}
          <div>
            {/* Profile Information */}
            <div style={cardStyle}>
              <div style={{
                padding: '20px 24px 16px',
                borderBottom: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
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
                  <User size={20} />
                  Profile Information
                </h3>
              </div>
              
              <div style={cardBodyStyle}>
                {isEditing ? (
                  /* Edit Form */
                  <div>
                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Full Name *</label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        style={{
                          ...inputStyle,
                          borderColor: formErrors.name ? '#dc3545' : '#ced4da'
                        }}
                        placeholder="Enter your full name"
                      />
                      {formErrors.name && (
                        <div style={{
                          color: '#dc3545',
                          fontSize: '12px',
                          marginTop: '4px'
                        }}>
                          {formErrors.name}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Email Address *</label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        style={{
                          ...inputStyle,
                          borderColor: formErrors.email ? '#dc3545' : '#ced4da'
                        }}
                        placeholder="Enter your email address"
                      />
                      {formErrors.email && (
                        <div style={{
                          color: '#dc3545',
                          fontSize: '12px',
                          marginTop: '4px'
                        }}>
                          {formErrors.email}
                        </div>
                      )}
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Phone Number</label>
                      <input
                        type="tel"
                        name="phone"
                        value={formData.phone}
                        onChange={handleInputChange}
                        style={inputStyle}
                        placeholder="Enter your phone number"
                      />
                    </div>

                    <div style={{ marginBottom: '16px' }}>
                      <label style={labelStyle}>Study Program</label>
                      <input
                        type="text"
                        name="study_program"
                        value={formData.study_program}
                        onChange={handleInputChange}
                        style={inputStyle}
                        placeholder="Enter your study program"
                      />
                    </div>

                    <div style={{ marginBottom: '24px' }}>
                      <label style={labelStyle}>Cohort</label>
                      <input
                        type="text"
                        name="cohort"
                        value={formData.cohort}
                        onChange={handleInputChange}
                        style={inputStyle}
                        placeholder="Enter your cohort"
                      />
                    </div>

                    <div style={{
                      display: 'flex',
                      justifyContent: 'flex-end',
                      gap: '12px'
                    }}>
                      <button
                        onClick={cancelEdit}
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#6c757d',
                          color: 'white'
                        }}
                      >
                        <X size={16} />
                        Cancel
                      </button>
                      <button
                        onClick={handleSaveProfile}
                        disabled={isSaving}
                        style={{
                          ...buttonStyle,
                          backgroundColor: '#198754',
                          color: 'white',
                          opacity: isSaving ? 0.7 : 1
                        }}
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
                            Saving...
                          </>
                        ) : (
                          <>
                            <Save size={16} />
                            Save Changes
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                ) : (
                  /* Display Mode */
                  <div style={{ 
                    display: 'grid', 
                    gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
                    gap: '20px' 
                  }}>
                    <div>
                      <label style={labelStyle}>Full Name</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <User size={16} style={{ color: '#6c757d' }} />
                          {profile?.name || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Email Address</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Mail size={16} style={{ color: '#6c757d' }} />
                          {profile?.email || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Phone Number</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Phone size={16} style={{ color: '#6c757d' }} />
                          {profile?.phone || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Study Program</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Building2 size={16} style={{ color: '#6c757d' }} />
                          {profile?.study_program || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Cohort</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Calendar size={16} style={{ color: '#6c757d' }} />
                          {profile?.cohort || 'Not provided'}
                        </div>
                      </div>
                    </div>

                    <div>
                      <label style={labelStyle}>Account Role</label>
                      <div style={valueStyle}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <Settings size={16} style={{ color: '#6c757d' }} />
                          {profile?.role || 'Not provided'}
                        </div>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Change Password Section */}
            {isChangingPassword && (
              <div style={cardStyle}>
                <div style={{
                  padding: '20px 24px 16px',
                  borderBottom: '1px solid #dee2e6'
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
                    <Lock size={20} />
                    Change Password
                  </h3>
                </div>
                
                <div style={cardBodyStyle}>
                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>Current Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showCurrentPassword ? "text" : "password"}
                        name="currentPassword"
                        value={passwordData.currentPassword}
                        onChange={handlePasswordChange}
                        style={{
                          ...inputStyle,
                          borderColor: passwordErrors.currentPassword ? '#dc3545' : '#ced4da',
                          paddingRight: '40px'
                        }}
                        placeholder="Enter your current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowCurrentPassword(!showCurrentPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#6c757d',
                          cursor: 'pointer'
                        }}
                      >
                        {showCurrentPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.currentPassword && (
                      <div style={{
                        color: '#dc3545',
                        fontSize: '12px',
                        marginTop: '4px'
                      }}>
                        {passwordErrors.currentPassword}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '16px' }}>
                    <label style={labelStyle}>New Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showNewPassword ? "text" : "password"}
                        name="newPassword"
                        value={passwordData.newPassword}
                        onChange={handlePasswordChange}
                        style={{
                          ...inputStyle,
                          borderColor: passwordErrors.newPassword ? '#dc3545' : '#ced4da',
                          paddingRight: '40px'
                        }}
                        placeholder="Enter your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPassword(!showNewPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#6c757d',
                          cursor: 'pointer'
                        }}
                      >
                        {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.newPassword && (
                      <div style={{
                        color: '#dc3545',
                        fontSize: '12px',
                        marginTop: '4px'
                      }}>
                        {passwordErrors.newPassword}
                      </div>
                    )}
                  </div>

                  <div style={{ marginBottom: '24px' }}>
                    <label style={labelStyle}>Confirm New Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type={showConfirmPassword ? "text" : "password"}
                        name="confirmPassword"
                        value={passwordData.confirmPassword}
                        onChange={handlePasswordChange}
                        style={{
                          ...inputStyle,
                          borderColor: passwordErrors.confirmPassword ? '#dc3545' : '#ced4da',
                          paddingRight: '40px'
                        }}
                        placeholder="Confirm your new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                        style={{
                          position: 'absolute',
                          right: '12px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          background: 'none',
                          border: 'none',
                          color: '#6c757d',
                          cursor: 'pointer'
                        }}
                      >
                        {showConfirmPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    {passwordErrors.confirmPassword && (
                      <div style={{
                        color: '#dc3545',
                        fontSize: '12px',
                        marginTop: '4px'
                      }}>
                        {passwordErrors.confirmPassword}
                      </div>
                    )}
                  </div>

                  <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    gap: '12px'
                  }}>
                    <button
                      onClick={cancelPasswordChange}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#6c757d',
                        color: 'white'
                      }}
                    >
                      <X size={16} />
                      Cancel
                    </button>
                    <button
                      onClick={handleChangePassword}
                      disabled={isSaving}
                      style={{
                        ...buttonStyle,
                        backgroundColor: '#dc3545',
                        color: 'white',
                        opacity: isSaving ? 0.7 : 1
                      }}
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
                          Changing...
                        </>
                      ) : (
                        <>
                          <Lock size={16} />
                          Change Password
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* CSS Animation */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}
