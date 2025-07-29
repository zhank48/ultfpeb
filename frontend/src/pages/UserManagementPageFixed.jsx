import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { usersAPI } from '../utils/api.js';
import { SafeImage } from '../components/SafeImage.jsx';
import { getUserAvatarUrl } from '../utils/imageUtils.js';
import { 
  Users, 
  UserPlus, 
  Search, 
  Edit, 
  UserX, 
  Eye, 
  EyeOff,
  Shield,
  User,
  Mail,
  Phone,
  Calendar,
  MoreVertical,
  Plus,
  X,
  Save,
  AlertTriangle,
  Filter,
  RefreshCw,
  Download,
  UserCheck,
  Settings,
  CheckCircle,
  XCircle,
  Clock,
  Building,
  Camera
} from 'lucide-react';

export function UserManagementPageFixed() {
  const { user } = useAuth();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showDeactivateModal, setShowDeactivateModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [showImagePreview, setShowImagePreview] = useState(false);
  const [previewImageUrl, setPreviewImageUrl] = useState(null);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    password: '',
    role: 'Receptionist',
    study_program: '',
    cohort: ''
  });
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [message, setMessage] = useState('');

  // Styles (sama seperti di VisitorsPageCoreUILight)
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const cardHeaderStyle = {
    padding: '20px 24px 16px',
    borderBottom: '1px solid #dee2e6'
  };

  const cardBodyStyle = {
    padding: '20px 24px'
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


  // Function to handle image preview
  const handleImageClick = (imageUrl) => {
    if (imageUrl) {
      setPreviewImageUrl(imageUrl);
      setShowImagePreview(true);
    }
  };

  // Function to close image preview
  const closeImagePreview = () => {
    setShowImagePreview(false);
    setPreviewImageUrl(null);
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async (showRefreshIndicator = false) => {
    try {
      if (showRefreshIndicator) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }
      
      const response = await usersAPI.getAll();
      console.log('Users API Response:', response.data);
      
      if (response.data.success) {
        setUsers(response.data.data || []);
        if (showRefreshIndicator) {
          setMessage('Users refreshed successfully');
          setTimeout(() => setMessage(''), 5000);
        }
      } else {
        console.error('Failed to fetch users:', response.data.message);
        setUsers([]);
        setMessage('Error: Failed to fetch users. Please try again.');
        setTimeout(() => setMessage(''), 5000);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
      
      // Try fallback for testing
      try {
        const fallbackResponse = await fetch('${import.meta.env.VITE_API_URL}/users/public');
        if (fallbackResponse.ok) {
          const fallbackData = await fallbackResponse.json();
          setUsers(Array.isArray(fallbackData) ? fallbackData : []);
          return;
        }
      } catch (fallbackError) {
        console.error('Fallback also failed:', fallbackError);
      }
      
      if (error.response?.status === 401) {
        setMessage('Error: Session expired. Please log in again.');
        setTimeout(() => setMessage(''), 5000);
        return;
      }
      setUsers([]);
      setMessage('Error: Unable to connect to server. Please check your connection.');
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
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

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = 'Name is required';
    } else if (formData.name.trim().length < 2) {
      newErrors.name = 'Name must be at least 2 characters long';
    }
    
    if (!formData.email.trim()) {
      newErrors.email = 'Email is required';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email)) {
      newErrors.email = 'Please enter a valid email address';
    }
    
    if (!selectedUser && !formData.password.trim()) {
      newErrors.password = 'Password is required';
    } else if (formData.password && formData.password.length < 6) {
      newErrors.password = 'Password must be at least 6 characters long';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setIsSubmitting(true);
    
    try {
      if (selectedUser) {
        // Update existing user
        const updateData = { ...formData };
        if (!updateData.password) {
          delete updateData.password;
        }
        
        const response = await usersAPI.update(selectedUser.id, updateData);
        if (response.data.success) {
          await fetchUsers();
          setMessage('User updated successfully');
          setTimeout(() => setMessage(''), 5000);
          setShowEditModal(false);
        } else {
          throw new Error(response.data.message || 'Failed to update user');
        }
      } else {
        // Create new user
        const response = await usersAPI.create(formData);
        if (response.data.success) {
          await fetchUsers();
          setMessage('New user created successfully');
          setTimeout(() => setMessage(''), 5000);
          setShowAddModal(false);
        } else {
          throw new Error(response.data.message || 'Failed to create user');
        }
      }
      
      resetForm();
    } catch (error) {
      console.error('Error submitting user:', error);
      const message = error.response?.data?.message || 'Failed to save user';
      setMessage(`Error: ${message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };
  const handleDeactivate = async () => {
    if (!selectedUser) return;

    setIsSubmitting(true);

    try {
      const isDeactivated = selectedUser.name?.includes('[DEACTIVATED]') || selectedUser.email?.includes('[DEACTIVATED]');
      
      const response = isDeactivated 
        ? await usersAPI.reactivate(selectedUser.id)
        : await usersAPI.deactivate(selectedUser.id);
      
      if (response.data.success) {
        await fetchUsers();
        setMessage(isDeactivated ? 'User reactivated successfully' : 'User deactivated successfully');
        setTimeout(() => setMessage(''), 5000);
        setShowDeactivateModal(false);
      } else {
        throw new Error(response.data.message || 'Failed to update user status');
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      const message = error.response?.data?.message || 'Failed to update user status';
      setMessage(`Error: ${message}`);
      setTimeout(() => setMessage(''), 5000);
    } finally {
      setIsSubmitting(false);
    }
  };

  const openAddModal = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Receptionist',
      study_program: '',
      cohort: ''
    });
    setErrors({});
    setSelectedUser(null);
    setShowAddModal(true);
  };

  const openEditModal = (user) => {
    setFormData({
      name: user.name || '',
      email: user.email || '',
      password: '',
      role: user.role || 'Receptionist',
      study_program: user.study_program || '',
      cohort: user.cohort || ''
    });
    setErrors({});
    setSelectedUser(user);
    setShowEditModal(true);
  };

  const openDeactivateModal = (user) => {
    setSelectedUser(user);
    setShowDeactivateModal(true);
  };

  const closeModals = () => {
    setShowAddModal(false);
    setShowEditModal(false);
    setShowDeactivateModal(false);
    setSelectedUser(null);
    setErrors({});
  };

  const resetForm = () => {
    setFormData({
      name: '',
      email: '',
      password: '',
      role: 'Receptionist',
      study_program: '',
      cohort: ''
    });
  };

  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.study_program?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    
    return matchesSearch && matchesRole;
  });

  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });
  };

  const getTimeAgo = (dateString) => {
    if (!dateString) return 'Never';
    const now = new Date();
    const date = new Date(dateString);
    const diffInMinutes = Math.floor((now - date) / (1000 * 60));
    
    if (diffInMinutes < 1) return 'Just now';
    if (diffInMinutes < 60) return `${diffInMinutes} minutes ago`;
    if (diffInMinutes < 1440) return `${Math.floor(diffInMinutes / 60)} hours ago`;
    if (diffInMinutes < 43200) return `${Math.floor(diffInMinutes / 1440)} days ago`;
    return 'Long time ago';
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
            <p style={{ color: '#6c757d', fontSize: '16px' }}>Loading users...</p>
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
              Manajemen Pengguna
            </h1>
            <p style={{ 
              color: '#6c757d', 
              margin: '0',
              fontSize: '16px' 
            }}>
              Kelola pengguna sistem dan izin akses mereka
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={openAddModal}
              style={{
                ...buttonStyle,
                backgroundColor: '#0d6efd',
                color: 'white'
              }}
            >
              <UserPlus size={16} />
              Tambah Pengguna
            </button>
          </div>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            backgroundColor: message.startsWith('Error') ? '#f8d7da' : '#d1e7dd',
            color: message.startsWith('Error') ? '#721c24' : '#0f5132',
            padding: '16px 20px',
            borderRadius: '8px',
            marginBottom: '24px',
            border: message.startsWith('Error') ? '1px solid #f5c2c7' : '1px solid #badbcc'
          }}>
            {message}
          </div>
        )}

        {/* Stats Cards */}
        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
          gap: '20px', 
          marginBottom: '24px' 
        }}>
          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #198754 0%, #146c43 100%)',
            color: 'white'
          }}>
            <div style={cardBodyStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {Array.isArray(users) ? users.filter(u => u?.role === 'Admin').length : 0}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Pengguna Admin</div>
                </div>
                <Shield size={32} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>

          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #ffc107 0%, #ffca2c 100%)',
            color: '#000'
          }}>
            <div style={cardBodyStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {Array.isArray(users) ? users.filter(u => u?.role === 'Receptionist').length : 0}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Resepsionis</div>
                </div>
                <UserCheck size={32} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>
          <div style={{
            ...cardStyle,
            background: 'linear-gradient(135deg, #0d6efd 0%, #0a58ca 100%)',
            color: 'white'
          }}>
            <div style={cardBodyStyle}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700', marginBottom: '4px' }}>
                    {Array.isArray(users) ? users.length : 0}
                  </div>
                  <div style={{ fontSize: '14px', opacity: 0.9 }}>Total Users</div>
                </div>
                <Users size={32} style={{ opacity: 0.8 }} />
              </div>
            </div>
          </div>
        </div>

        {/* Filters */}
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
              Filter Users
            </h3>
          </div>
          <div style={cardBodyStyle}>
            <div style={{ 
              display: 'grid', 
              gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
              gap: '16px' 
            }}>
              <div>
                <label style={{ 
                  display: 'block', 
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#495057', 
                  marginBottom: '8px' 
                }}>
                  Search Users
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
                    placeholder="Search by name, email..."
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
                  fontSize: '14px', 
                  fontWeight: '500', 
                  color: '#495057', 
                  marginBottom: '8px' 
                }}>
                  Filter by Role
                </label>
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  style={inputStyle}
                >
                  <option value="all">All Roles</option>
                  <option value="Admin">Admin</option>
                  <option value="Receptionist">Receptionist</option>
                </select>
              </div>
            </div>
          </div>
        </div>

        {/* Users Table */}
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
              Users ({filteredUsers.length})
            </h3>
          </div>
          
          {filteredUsers.length === 0 ? (
            <div style={{ 
              padding: '60px 24px', 
              textAlign: 'center',
              color: '#6c757d'
            }}>
              <Users size={48} style={{ 
                margin: '0 auto 16px', 
                opacity: 0.4 
              }} />
              <h3 style={{ 
                fontSize: '18px', 
                fontWeight: '600', 
                color: '#495057',
                margin: '0 0 8px 0'
              }}>
                No users found
              </h3>
              <p style={{ 
                color: '#6c757d', 
                margin: '0 0 24px 0',
                fontSize: '14px'
              }}>
                {searchTerm || roleFilter !== 'all' 
                  ? 'Try adjusting your search criteria' 
                  : 'Get started by adding a new user'
                }
              </p>
              {(!searchTerm && roleFilter === 'all') && (
                <button
                  onClick={openAddModal}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#0d6efd',
                    color: 'white'
                  }}
                >
                  <UserPlus size={16} />
                  Tambah Pengguna
                </button>
              )}
            </div>
          ) : (
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
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        User
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#495057',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        Contact
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#495057',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        Role & Program
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#495057',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        Activity
                      </th>
                      <th style={{ 
                        padding: '16px 20px', 
                        textAlign: 'left', 
                        fontWeight: '600',
                        fontSize: '14px',
                        color: '#495057',
                        borderBottom: '1px solid #dee2e6'
                      }}>
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <tr key={user.id} style={{ 
                        borderBottom: '1px solid #dee2e6',
                        backgroundColor: index % 2 === 0 ? 'white' : '#f8f9fa'
                      }}>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <div style={{ flexShrink: 0 }}>
                              <SafeImage
                                src={getUserAvatarUrl(user)}
                                alt={user.name}
                                fallbackText={user.name}
                                style={{
                                  width: '40px',
                                  height: '40px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  backgroundColor: user.role === 'Admin' ? '#dc3545' : '#198754'
                                }}
                              />
                            </div>
                            <div>
                              <div style={{ 
                                fontSize: '14px', 
                                fontWeight: '600', 
                                color: '#495057',
                                marginBottom: '4px'
                              }}>
                                {user.name}
                                {(user.name?.includes('[DEACTIVATED]') || user.email?.includes('[DEACTIVATED]')) && (
                                  <span style={{
                                    marginLeft: '8px',
                                    padding: '2px 6px',
                                    backgroundColor: '#f8d7da',
                                    color: '#721c24',
                                    fontSize: '10px',
                                    borderRadius: '10px',
                                    fontWeight: '500'
                                  }}>
                                    DEACTIVATED
                                  </span>
                                )}
                              </div>
                              <div style={{ 
                                fontSize: '12px', 
                                color: '#6c757d'
                              }}>
                                {user.role} | Registered: {formatDate(user.created_at)}
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
                            <Mail style={{ width: '14px', height: '14px', color: '#6c757d' }} />
                            {user.email}
                          </div>
                          {user.study_program && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6c757d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '6px'
                            }}>
                              <Building style={{ width: '14px', height: '14px' }} />
                              {user.study_program}
                            </div>
                          )}
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ fontSize: '14px', color: '#495057' }}>
                            <div style={{ fontWeight: '600', marginBottom: '4px' }}>
                              <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '4px 12px',
                                borderRadius: '20px',
                                fontSize: '12px',
                                fontWeight: '500',
                                backgroundColor: user.role === 'Admin' ? '#f8d7da' : '#d1e7dd',
                                color: user.role === 'Admin' ? '#721c24' : '#0f5132'
                              }}>
                                {user.role === 'Admin' ? (
                                  <Shield style={{ width: '12px', height: '12px' }} />
                                ) : (
                                  <UserCheck style={{ width: '12px', height: '12px' }} />
                                )}
                                {user.role}
                              </span>
                            </div>
                            {user.cohort && (
                              <div style={{ fontSize: '12px', color: '#6c757d', marginTop: '4px' }}>
                                Cohort: {user.cohort}
                              </div>
                            )}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6c757d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px',
                            marginBottom: '4px'
                          }}>
                            <Clock style={{ width: '12px', height: '12px' }} />
                            Last login
                          </div>
                          <div style={{ 
                            fontSize: '14px', 
                            fontWeight: '600', 
                            color: '#495057'
                          }}>
                            {getTimeAgo(user.updated_at)}
                          </div>
                        </td>
                        <td style={{ padding: '16px 20px' }}>
                          <div style={{ 
                            display: 'flex', 
                            alignItems: 'center', 
                            gap: '8px',
                            justifyContent: 'flex-start'
                          }}>
                            <button
                              onClick={() => openEditModal(user)}
                              style={{
                                padding: '8px',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: 'white',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                e.currentTarget.style.backgroundColor = '#0d6efd';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = '#0d6efd';
                              }}
                              title="Edit user"
                            >
                              <Edit size={14} />
                            </button>
                            <button
                              onClick={() => openDeactivateModal(user)}
                              style={{
                                padding: '8px',
                                border: '1px solid #dee2e6',
                                borderRadius: '6px',
                                backgroundColor: 'white',
                                color: (user.name?.includes('[DEACTIVATED]') || user.email?.includes('[DEACTIVATED]')) ? '#198754' : '#ffc107',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                transition: 'all 0.2s ease'
                              }}
                              onMouseEnter={(e) => {
                                const isDeactivated = user.name?.includes('[DEACTIVATED]') || user.email?.includes('[DEACTIVATED]');
                                e.currentTarget.style.backgroundColor = isDeactivated ? '#198754' : '#ffc107';
                                e.currentTarget.style.color = 'white';
                              }}
                              onMouseLeave={(e) => {
                                const isDeactivated = user.name?.includes('[DEACTIVATED]') || user.email?.includes('[DEACTIVATED]');
                                e.currentTarget.style.backgroundColor = 'white';
                                e.currentTarget.style.color = isDeactivated ? '#198754' : '#ffc107';
                              }}
                              title={(user.name?.includes('[DEACTIVATED]') || user.email?.includes('[DEACTIVATED]')) ? "Reactivate user" : "Deactivate user"}
                            >
                              <UserX size={14} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Add User Modal */}
        {showAddModal && (
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
            padding: '20px',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#495057',
                  margin: 0
                }}>
                  Add New User
                </h3>
                <button
                  onClick={closeModals}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      ...inputStyle,
                      borderColor: errors.name ? '#dc3545' : '#ced4da'
                    }}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.name}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      ...inputStyle,
                      borderColor: errors.email ? '#dc3545' : '#ced4da'
                    }}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.email}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Password *
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{
                        ...inputStyle,
                        borderColor: errors.password ? '#dc3545' : '#ced4da',
                        paddingRight: '40px'
                      }}
                      placeholder="Enter password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.password}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={inputStyle}
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Study Program
                  </label>
                  <input
                    type="text"
                    name="study_program"
                    value={formData.study_program}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="Enter study program"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Cohort
                  </label>
                  <input
                    type="text"
                    name="cohort"
                    value={formData.cohort}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="Enter cohort"
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button
                    type="button"
                    onClick={closeModals}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#6c757d',
                      color: 'white'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #f3f3f3',
                          borderTop: '2px solid #ffffff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Creating...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Create User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Edit User Modal */}
        {showEditModal && (
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
            padding: '20px',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '500px',
              width: '100%',
              maxHeight: '90vh',
              overflowY: 'auto'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#495057',
                  margin: 0
                }}>
                  Edit User
                </h3>
                <button
                  onClick={closeModals}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <form onSubmit={handleSubmit}>
                {/* User Photo Section */}
                <div style={{ 
                  marginBottom: '24px', 
                  textAlign: 'center',
                  padding: '20px',
                  backgroundColor: '#f8f9fa',
                  borderRadius: '8px'
                }}>
                  <div style={{ marginBottom: '16px' }}>
                    <div 
                      onClick={() => handleImageClick(getUserAvatarUrl(selectedUser))}
                      style={{
                        display: 'inline-block',
                        cursor: getUserAvatarUrl(selectedUser) ? 'pointer' : 'default',
                        transition: 'transform 0.2s ease',
                        ':hover': {
                          transform: getUserAvatarUrl(selectedUser) ? 'scale(1.05)' : 'none'
                        }
                      }}
                    >
                      <SafeImage
                        src={getUserAvatarUrl(selectedUser)}
                        alt={selectedUser?.name}
                        fallbackText={selectedUser?.name}
                        style={{
                          width: '120px',
                          height: '120px',
                          borderRadius: '50%',
                          objectFit: 'cover',
                          border: '4px solid white',
                          boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                          backgroundColor: '#0d6efd'
                        }}
                      />
                    </div>
                  </div>
                  <div style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '6px'
                  }}>
                    {selectedUser?.name?.replace(' [DEACTIVATED]', '')}
                  </div>
                  <div style={{
                    fontSize: '14px',
                    color: '#6c757d',
                    marginBottom: '4px'
                  }}>
                    {selectedUser?.role} • {selectedUser?.email?.replace('[DEACTIVATED]', '')}
                  </div>
                  {getUserAvatarUrl(selectedUser) && (
                    <div style={{
                      fontSize: '12px',
                      color: '#0d6efd',
                      fontStyle: 'italic'
                    }}>
                      Click image to preview
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    name="name"
                    value={formData.name}
                    onChange={handleInputChange}
                    style={{
                      ...inputStyle,
                      borderColor: errors.name ? '#dc3545' : '#ced4da'
                    }}
                    placeholder="Enter full name"
                  />
                  {errors.name && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.name}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Email *
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleInputChange}
                    style={{
                      ...inputStyle,
                      borderColor: errors.email ? '#dc3545' : '#ced4da'
                    }}
                    placeholder="Enter email address"
                  />
                  {errors.email && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.email}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Password (leave blank to keep current)
                  </label>
                  <div style={{ position: 'relative' }}>
                    <input
                      type={showPassword ? "text" : "password"}
                      name="password"
                      value={formData.password}
                      onChange={handleInputChange}
                      style={{
                        ...inputStyle,
                        borderColor: errors.password ? '#dc3545' : '#ced4da',
                        paddingRight: '40px'
                      }}
                      placeholder="Enter new password"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
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
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                  {errors.password && (
                    <div style={{
                      color: '#dc3545',
                      fontSize: '12px',
                      marginTop: '4px'
                    }}>
                      {errors.password}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Role
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleInputChange}
                    style={inputStyle}
                  >
                    <option value="Receptionist">Receptionist</option>
                    <option value="Admin">Admin</option>
                  </select>
                </div>

                <div style={{ marginBottom: '16px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Study Program
                  </label>
                  <input
                    type="text"
                    name="study_program"
                    value={formData.study_program}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="Enter study program"
                  />
                </div>

                <div style={{ marginBottom: '24px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '500',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Cohort
                  </label>
                  <input
                    type="text"
                    name="cohort"
                    value={formData.cohort}
                    onChange={handleInputChange}
                    style={inputStyle}
                    placeholder="Enter cohort"
                  />
                </div>

                <div style={{
                  display: 'flex',
                  justifyContent: 'flex-end',
                  gap: '12px'
                }}>
                  <button
                    type="button"
                    onClick={closeModals}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#6c757d',
                      color: 'white'
                    }}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    style={{
                      ...buttonStyle,
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      opacity: isSubmitting ? 0.7 : 1
                    }}
                  >
                    {isSubmitting ? (
                      <>
                        <div style={{
                          width: '16px',
                          height: '16px',
                          border: '2px solid #f3f3f3',
                          borderTop: '2px solid #ffffff',
                          borderRadius: '50%',
                          animation: 'spin 1s linear infinite'
                        }}></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <Save size={16} />
                        Update User
                      </>
                    )}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* Deactivate/Reactivate Confirmation Modal */}
        {showDeactivateModal && (
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
            padding: '20px',
            zIndex: 1000
          }}>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '8px',
              padding: '24px',
              maxWidth: '400px',
              width: '100%'
            }}>
              <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '18px',
                  fontWeight: '600',
                  color: '#495057',
                  margin: 0
                }}>
                  {(selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]')) 
                    ? 'Reactivate User' 
                    : 'Deactivate User'}
                </h3>
                <button
                  onClick={closeModals}
                  style={{
                    background: 'none',
                    border: 'none',
                    color: '#6c757d',
                    cursor: 'pointer',
                    padding: '4px'
                  }}
                >
                  <X size={20} />
                </button>
              </div>

              <div style={{ marginBottom: '20px' }}>
                <div style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  marginBottom: '16px'
                }}>
                  <UserX size={24} style={{ 
                    color: (selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]')) 
                      ? '#198754' 
                      : '#ffc107' 
                  }} />
                  <div>
                    <h4 style={{
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      margin: '0 0 4px 0'
                    }}>
                      {(selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]'))
                        ? 'Are you sure you want to reactivate this user?'
                        : 'Are you sure you want to deactivate this user?'}
                    </h4>
                    <p style={{
                      fontSize: '12px',
                      color: '#6c757d',
                      margin: 0
                    }}>
                      {(selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]'))
                        ? 'This will restore user access to the system.'
                        : 'This will prevent the user from logging in but keep their data intact.'}
                    </p>
                  </div>
                </div>

                {selectedUser && (
                  <div style={{
                    backgroundColor: '#f8f9fa',
                    padding: '12px',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    <div style={{ fontSize: '14px' }}>
                      <div style={{
                        fontWeight: '600',
                        color: '#495057',
                        marginBottom: '4px'
                      }}>
                        {selectedUser.name?.replace(' [DEACTIVATED]', '')}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>
                        {selectedUser.email?.replace('[DEACTIVATED]', '')}
                      </div>
                      <div style={{ color: '#6c757d', fontSize: '12px' }}>
                        {selectedUser.role}
                      </div>
                    </div>
                  </div>
                )}
              </div>

              <div style={{
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px'
              }}>
                <button
                  onClick={closeModals}
                  style={{
                    ...buttonStyle,
                    backgroundColor: '#6c757d',
                    color: 'white'
                  }}
                >
                  Cancel
                </button>
                <button
                  onClick={handleDeactivate}
                  disabled={isSubmitting}
                  style={{
                    ...buttonStyle,
                    backgroundColor: (selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]')) 
                      ? '#198754' 
                      : '#ffc107',
                    color: 'white',
                    opacity: isSubmitting ? 0.7 : 1
                  }}
                >
                  {isSubmitting ? (
                    <>
                      <div style={{
                        width: '16px',
                        height: '16px',
                        border: '2px solid #f3f3f3',
                        borderTop: '2px solid #ffffff',
                        borderRadius: '50%',
                        animation: 'spin 1s linear infinite'
                      }}></div>
                      {(selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]'))
                        ? 'Reactivating...'
                        : 'Deactivating...'}
                    </>
                  ) : (
                    <>
                      <UserX size={16} />
                      {(selectedUser?.name?.includes('[DEACTIVATED]') || selectedUser?.email?.includes('[DEACTIVATED]'))
                        ? 'Reactivate User'
                        : 'Deactivate User'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Image Preview Modal */}
      {showImagePreview && previewImageUrl && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          padding: '20px',
          zIndex: 2000
        }}>
          <div style={{
            position: 'relative',
            maxWidth: '90vw',
            maxHeight: '90vh',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
          }}>
            <button
              onClick={closeImagePreview}
              style={{
                position: 'absolute',
                top: '-40px',
                right: '0',
                background: 'rgba(255, 255, 255, 0.9)',
                border: 'none',
                borderRadius: '50%',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                color: '#495057',
                fontSize: '18px',
                fontWeight: 'bold'
              }}
            >
              ×
            </button>
            <img
              src={previewImageUrl}
              alt="Preview"
              style={{
                maxWidth: '100%',
                maxHeight: '100%',
                borderRadius: '8px',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
              }}
              onError={(e) => {
                e.target.style.display = 'none';
              }}
            />
          </div>
        </div>
      )}

      {/* Add CSS animation for spinner */}
      <style>{`
        @keyframes spin {
          0% { transform: rotate(0deg); }
          100% { transform: rotate(360deg); }
        }
      `}</style>
    </div>
  );
}

export default UserManagementPageFixed;
