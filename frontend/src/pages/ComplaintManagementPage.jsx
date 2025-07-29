import { useState, useEffect } from 'react';
import { 
  AlertTriangle, 
  Trash2, 
  Search,
  Filter,
  Calendar,
  BarChart3,
  MessageSquare,
  Users,
  TrendingUp,
  Eye,
  AlertCircle,
  Plus,
  Edit,
  Settings,
  CheckCircle,
  Clock,
  XCircle,
  Send,
  Download,
  Upload,
  FileText,
  Image,
  Star
} from 'lucide-react';
import { complaintsAPI, complaintManagementAPI } from '../utils/api.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

export function ComplaintManagementPage() {
  // Global alert hook
  const { alert, confirm } = useGlobalAlert();
  
  // State management
  const [complaints, setComplaints] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterCategory, setFilterCategory] = useState('all');
  const [selectedComplaint, setSelectedComplaint] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [categories, setCategories] = useState([]);
  const [fields, setFields] = useState([]);
  const [newCategory, setNewCategory] = useState({ name: '', description: '' });
  const [newField, setNewField] = useState({ 
    field_name: '', 
    field_label: '',
    field_type: 'text', 
    is_required: false, 
    field_options: '' 
  });
  const [editingCategory, setEditingCategory] = useState(null);
  const [editingField, setEditingField] = useState(null);
  const [editCategoryData, setEditCategoryData] = useState({ name: '', description: '' });
  const [editFieldData, setEditFieldData] = useState({ 
    field_name: '', 
    field_label: '', 
    field_type: 'text', 
    field_options: '', 
    is_required: false 
  });
  const [response, setResponse] = useState('');
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImage, setSelectedImage] = useState({ src: '', alt: '' });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(30);
  
  const [stats, setStats] = useState({
    total: 0,
    open: 0,
    in_progress: 0,
    resolved: 0,
    byCategory: {},
    recent: 0
  });

  // Generate ticket number based on complaint ID or use database ticket_number
  const generateTicketNumber = (complaint) => {
    if (!complaint.id) {
      return 'N/A';
    }
    
    // Use ticket_number from database if available, otherwise generate it
    if (complaint.ticket_number) {
      return complaint.ticket_number;
    }
    
    try {
      const paddedId = String(complaint.id).padStart(6, '0');
      return `COMP-${paddedId}`;
    } catch (error) {
      console.error('Error generating ticket number:', error);
      return `COMP-${complaint.id}`;
    }
  };

  // Fetch data on component mount
  useEffect(() => {
    const initializeData = async () => {
      await fetchCategories();
      await fetchFields();
      await fetchComplaints();
    };
    
    initializeData();
  }, []);

  // Recalculate stats when complaints change
  useEffect(() => {
    if (complaints.length > 0) {
      calculateStats(complaints);
    }
  }, [complaints, categories]);

  // Handle keyboard events for image modal and click outside for dropdowns
  useEffect(() => {
    const handleKeyDown = (event) => {
      if (event.key === 'Escape' && showImageModal) {
        setShowImageModal(false);
      }
    };

    const handleClickOutside = (event) => {
      // Close export menu if clicked outside
      const exportMenu = document.getElementById('export-menu');
      const exportButton = exportMenu?.previousElementSibling;
      if (exportMenu && exportMenu.style.display === 'block' && 
          !exportMenu.contains(event.target) && !exportButton?.contains(event.target)) {
        exportMenu.style.display = 'none';
      }
      
      // Close import menu if clicked outside
      const importMenu = document.getElementById('import-menu');
      const importButton = importMenu?.previousElementSibling;
      if (importMenu && importMenu.style.display === 'block' && 
          !importMenu.contains(event.target) && !importButton?.contains(event.target)) {
        importMenu.style.display = 'none';
      }
    };

    if (showImageModal) {
      document.addEventListener('keydown', handleKeyDown);
      // Prevent body scroll when modal is open
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    // Always listen for click outside events
    document.addEventListener('click', handleClickOutside);

    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('click', handleClickOutside);
      document.body.style.overflow = 'unset';
    };
  }, [showImageModal]);

  const fetchCategories = async () => {
    try {
      const response = await complaintManagementAPI.getCategories();
      
      if (response.success && response.data) {
        setCategories(response.data);
      } else if (Array.isArray(response.data)) {
        setCategories(response.data);
      } else {
        setCategories([]);
      }
    } catch (error) {
      console.error('❌ Error fetching categories:', error);
      setCategories([]);
    }
  };

  const fetchFields = async () => {
    try {
      const response = await complaintManagementAPI.getFields();
      
      if (response.success && response.data) {
        setFields(response.data);
      } else if (Array.isArray(response.data)) {
        setFields(response.data);
      } else {
        setFields([]);
      }
    } catch (error) {
      console.error('❌ Error fetching fields:', error);
      setFields([]);
    }
  };

  const fetchComplaints = async () => {
    try {
      setLoading(true);
      setError(null);
      
      // Fetch complaints and stats in parallel
      const [complaintsResponse, statsResponse] = await Promise.all([
        complaintsAPI.getAll(),
        complaintManagementAPI.getStats().catch(err => {
          console.warn('Failed to fetch stats from API, will calculate locally:', err);
          return null;
        })
      ]);
      
      if (complaintsResponse.success && complaintsResponse.data) {
        setComplaints(complaintsResponse.data);
        
        // Use API stats if available, otherwise calculate locally
        if (statsResponse && statsResponse.success && statsResponse.data) {
          setStats(statsResponse.data);
        } else {
          calculateStats(complaintsResponse.data);
        }
      } else if (Array.isArray(complaintsResponse.data)) {
        setComplaints(complaintsResponse.data);
        calculateStats(complaintsResponse.data);
      } else {
        setComplaints([]);
        calculateStats([]);
      }
    } catch (error) {
      console.error('❌ Error fetching complaints:', error);
      setError('Failed to load complaints data. Please try again.');
      setComplaints([]);
      calculateStats([]);
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (complaintsData) => {
    const total = complaintsData.length;
    const open = complaintsData.filter(c => c.status === 'open').length;
    const in_progress = complaintsData.filter(c => c.status === 'in_progress').length;
    const resolved = complaintsData.filter(c => c.status === 'resolved').length;
    
    // Calculate by category
    const byCategory = {};
    complaintsData.forEach(complaint => {
      const categoryName = categories.find(cat => cat.id === complaint.category_id)?.name || 'Unknown';
      byCategory[categoryName] = (byCategory[categoryName] || 0) + 1;
    });

    // Count recent complaints (last 7 days)
    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const recent = complaintsData.filter(c => new Date(c.created_at) >= sevenDaysAgo).length;

    setStats({
      total,
      open,
      in_progress,
      resolved,
      byCategory,
      recent
    });
  };

  // Filter complaints based on search and filters
  const filteredComplaints = complaints.filter(complaint => {
    const ticketNumber = generateTicketNumber(complaint);
    const matchesSearch = searchTerm === '' || 
      complaint.complainant_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.complainant_email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.complainant_phone?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.subject?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      complaint.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      ticketNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      JSON.stringify(complaint.form_data || {}).toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesStatus = filterStatus === 'all' || complaint.status === filterStatus;
    const matchesCategory = filterCategory === 'all' || complaint.category_id == filterCategory;
    
    return matchesSearch && matchesStatus && matchesCategory;
  });

  // Pagination calculations
  const totalPages = Math.ceil(filteredComplaints.length / rowsPerPage);
  const startIndex = (currentPage - 1) * rowsPerPage;
  const endIndex = startIndex + rowsPerPage;
  const paginatedComplaints = filteredComplaints.slice(startIndex, endIndex);

  // Reset to first page when filters change
  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, filterStatus, filterCategory, rowsPerPage]);

  // Get dynamic columns from fields
  const getDynamicColumns = () => {
    return fields.filter(field => field.is_active).sort((a, b) => (a.field_order || 0) - (b.field_order || 0));
  };

  // Handle image click for modal preview
  const handleImageClick = (imageSrc, imageAlt = 'Preview Image') => {
    setSelectedImage({ src: imageSrc, alt: imageAlt });
    setShowImageModal(true);
  };

  // Check if file is image
  const isImageFile = (fileName) => {
    if (!fileName) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.bmp', '.webp', '.svg'];
    const ext = fileName.toLowerCase().substring(fileName.lastIndexOf('.'));
    return imageExtensions.includes(ext);
  };

  // Render field value based on type
  const renderFieldValue = (field, value) => {
    if (!value && value !== 0 && value !== false) return '-';
    
    // Debug logging for image fields
    if (field.field_type === 'file') {
      console.log('🔍 Rendering file field:', {
        fieldName: field.field_name,
        fieldLabel: field.field_label,
        fieldType: field.field_type,
        value: value,
        isImage: isImageFile(value)
      });
    }
    
    switch (field.field_type) {
      case 'file':
        if (!value) return '-';
        
        // Check if it's an image file for thumbnail preview
        if (isImageFile(value)) {
          // Handle filename encoding properly for URLs with spaces
          const valueString = typeof value === 'string' ? value : String(value || '');
          const apiUrl = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';
          const baseUrl = apiUrl.replace('/api', '');
          const baseImageSrc = valueString.startsWith('http') 
            ? valueString 
            : valueString.startsWith('/uploads/')
              ? `${baseUrl}${valueString}`
              : `${baseUrl}/uploads/${encodeURIComponent(valueString)}`;
          const imageSrc = baseImageSrc;
            
          console.log('🖼️ Creating image thumbnail:', {
            originalValue: value,
            baseImageSrc: baseImageSrc,
            finalImageSrc: imageSrc,
            fieldLabel: field.field_label,
            fieldName: field.field_name
          });
          
          return (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              minWidth: '120px'
            }}>
              {/* CoreUI-style image thumbnail */}
              <div
                style={{
                  position: 'relative',
                  width: '50px',
                  height: '50px',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  cursor: 'pointer',
                  border: '2px solid #e3e3e3',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                }}
                onClick={() => handleImageClick(imageSrc, field.field_label || 'Image Preview')}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'scale(1.05)';
                  e.currentTarget.style.border = '2px solid #0d6efd';
                  e.currentTarget.style.boxShadow = '0 4px 8px rgba(13, 110, 253, 0.3)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'scale(1)';
                  e.currentTarget.style.border = '2px solid #e3e3e3';
                  e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                }}
              >
                <img
                  src={imageSrc}
                  alt={field.field_label || 'Image'}
                  style={{
                    width: '100%',
                    height: '100%',
                    objectFit: 'cover',
                    display: 'block'
                  }}
                  onLoad={(e) => {
                    console.log('✅ Image loaded successfully:', {
                      src: e.target.src,
                      field: field.field_name,
                      naturalWidth: e.target.naturalWidth,
                      naturalHeight: e.target.naturalHeight
                    });
                  }}
                  onError={(e) => {
                    // Debug image loading error
                    console.error('❌ Image failed to load:', {
                      src: e.target.src,
                      field: field.field_name,
                      originalValue: value,
                      error: e
                    });
                    
                    // Simple fallback - just hide the image
                    e.target.style.display = 'none';
                    
                    // Safely show placeholder in parent if it exists
                    const parent = e.target.parentElement;
                    if (parent && parent.style && typeof parent.style === 'object') {
                      try {
                        parent.style.background = '#f8f9fa';
                        parent.style.border = '2px dashed #dc3545';
                        parent.title = `Image failed to load: ${value}`;
                        
                        // Add error icon
                        if (!parent.querySelector('.error-icon')) {
                          const errorIcon = document.createElement('div');
                          errorIcon.className = 'error-icon';
                          errorIcon.innerHTML = '⚠️';
                          errorIcon.style.cssText = `
                            position: absolute;
                            top: 50%;
                            left: 50%;
                            transform: translate(-50%, -50%);
                            font-size: 16px;
                            color: #dc3545;
                          `;
                          parent.appendChild(errorIcon);
                        }
                      } catch (domError) {
                        console.error('Error updating parent element:', domError);
                      }
                    }
                  }}
                />
                {/* Overlay effect on hover */}
                <div
                  style={{
                    position: 'absolute',
                    top: 0,
                    left: 0,
                    right: 0,
                    bottom: 0,
                    background: 'rgba(13, 110, 253, 0.1)',
                    opacity: 0,
                    transition: 'opacity 0.3s ease',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: '#0d6efd',
                    fontSize: '16px',
                    fontWeight: 'bold'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.opacity = 1;
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.opacity = 0;
                  }}
                >
                  🔍
                </div>
              </div>
              
              {/* File info */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#495057',
                  fontWeight: '500',
                  marginBottom: '2px',
                  wordBreak: 'break-word'
                }}>
                  {value.length > 20 ? `${value.substring(0, 17)}...` : value}
                </div>
                <a 
                  href={imageSrc} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#0d6efd', 
                    textDecoration: 'none',
                    fontSize: '10px',
                    opacity: 0.8
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                  }}
                >
                  📎 View Full
                </a>
              </div>
            </div>
          );
        } else {
          // Non-image files with consistent styling
          const valueString = typeof value === 'string' ? value : String(value || '');
          const fileSrc = valueString.startsWith('http') 
            ? valueString 
            : valueString.startsWith('/uploads/')
              ? `${import.meta.env.VITE_API_URL.replace("/api", "")}${valueString}`
              : `${import.meta.env.VITE_API_URL.replace("/api", "")}/uploads/${encodeURIComponent(valueString)}`;
          
          return (
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '8px',
              minWidth: '120px',
              padding: '4px 8px',
              border: '1px solid #e3e3e3',
              borderRadius: '6px',
              backgroundColor: '#f8f9fa'
            }}>
              {/* File icon */}
              <div style={{
                width: '32px',
                height: '32px',
                borderRadius: '4px',
                backgroundColor: '#0d6efd',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: 'white',
                fontSize: '12px',
                fontWeight: 'bold'
              }}>
                📄
              </div>
              
              {/* File info */}
              <div style={{ flex: 1 }}>
                <div style={{ 
                  fontSize: '11px', 
                  color: '#495057',
                  fontWeight: '500',
                  marginBottom: '2px',
                  wordBreak: 'break-word'
                }}>
                  {value.length > 15 ? `${value.substring(0, 12)}...` : value}
                </div>
                <a 
                  href={fileSrc} 
                  target="_blank" 
                  rel="noopener noreferrer"
                  style={{ 
                    color: '#0d6efd', 
                    textDecoration: 'none',
                    fontSize: '10px',
                    opacity: 0.8
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.textDecoration = 'underline';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.textDecoration = 'none';
                  }}
                >
                  📎 Download
                </a>
              </div>
            </div>
          );
        }
      
      case 'location':
        if (typeof value === 'object' && value.address) {
          return (
            <div style={{ fontSize: '12px', maxWidth: '150px' }}>
              <div style={{ fontWeight: '500' }}>{value.address}</div>
              {value.coordinates && (
                <div style={{ color: '#6c757d', fontSize: '11px' }}>
                  {value.coordinates.lat?.toFixed(6)}, {value.coordinates.lng?.toFixed(6)}
                </div>
              )}
            </div>
          );
        }
        return value.toString();
      
      case 'select':
        return (
          <span style={{
            padding: '2px 6px',
            borderRadius: '8px',
            fontSize: '11px',
            fontWeight: '500',
            backgroundColor: '#6f42c120',
            color: '#6f42c1'
          }}>
            {value}
          </span>
        );
      
      case 'date':
        return new Date(value).toLocaleDateString();
      
      case 'email':
        return (
          <a href={`mailto:${value}`} style={{ color: '#0d6efd', textDecoration: 'none' }}>
            {value}
          </a>
        );
      
      case 'tel':
        return (
          <a href={`tel:${value}`} style={{ color: '#0d6efd', textDecoration: 'none' }}>
            {value}
          </a>
        );
      
      default:
        const displayValue = value.toString();
        return displayValue.length > 50 ? displayValue.substring(0, 50) + '...' : displayValue;
    }
  };

  // Clean field name by removing trailing numbers and normalizing text
  const cleanFieldName = (fieldName) => {
    if (!fieldName) return fieldName;
    // Remove trailing numbers like "0", "1", etc.
    return fieldName.replace(/\d+$/, '').trim();
  };

  // Clean field label by removing trailing numbers and normalizing text
  const cleanFieldLabel = (fieldLabel) => {
    if (!fieldLabel) return fieldLabel;
    // Remove trailing numbers like "0", "1", etc.
    return fieldLabel.replace(/\d+$/, '').trim();
  };

  // Get properly formatted field value for display
  const getFormDataValue = (complaint, fieldName) => {
    if (!complaint.form_data) return null;
    
    let formData = complaint.form_data;
    
    // Parse if it's a string
    if (typeof formData === 'string') {
      try {
        formData = JSON.parse(formData);
      } catch (e) {
        return null;
      }
    }
    
    // Look for exact match first
    if (formData[fieldName] !== undefined) {
      return formData[fieldName];
    }
    
    // Look for cleaned field name match
    const cleanedFieldName = cleanFieldName(fieldName);
    if (formData[cleanedFieldName] !== undefined) {
      return formData[cleanedFieldName];
    }
    
    // Look for any field that matches when cleaned
    for (const [key, value] of Object.entries(formData)) {
      if (cleanFieldName(key) === cleanedFieldName) {
        return value;
      }
    }
    
    return null;
  };

  // Handle status update
  const handleStatusUpdate = async (complaintId, newStatus) => {
    try {
      const response = await complaintsAPI.updateStatus(complaintId, { status: newStatus });
      if (response.success) {
        setComplaints(prev => prev.map(c => 
          c.id === complaintId ? { ...c, status: newStatus } : c
        ));
      } else {
        throw new Error(response.message || 'Failed to update status');
      }
    } catch (error) {
      console.error('❌ Error updating status:', error);
      alert.error('Failed to update status. Please try again.');
    }
  };

  // Handle response submission
  const handleResponseSubmit = async (complaintId) => {
    if (!response.trim()) {
      alert.warning('Please enter a response');
      return;
    }

    try {
      const apiResponse = await complaintsAPI.addResponse(complaintId, { response_text: response });
      if (apiResponse.success) {
        // Refresh the selected complaint data
        const updatedComplaint = await complaintsAPI.getById(complaintId);
        if (updatedComplaint.success) {
          setSelectedComplaint(updatedComplaint.data);
        }
        setResponse('');
      } else {
        throw new Error(apiResponse.message || 'Failed to add response');
      }
    } catch (error) {
      console.error('❌ Error adding response:', error);
      alert.error('Failed to add response. Please try again.');
    }
  };

  // Category management functions
  const handleCreateCategory = async () => {
    if (!newCategory.name.trim()) {
      alert.warning('Please enter a category name');
      return;
    }

    try {
      const response = await complaintManagementAPI.createCategory(newCategory);
      if (response.success) {
        await fetchCategories();
        setNewCategory({ name: '', description: '' });
        alert.success('Category created successfully');
      } else {
        throw new Error(response.message || 'Failed to create category');
      }
    } catch (error) {
      console.error('❌ Error creating category:', error);
      alert.error('Failed to create category. Please try again.');
    }
  };

  const handleDeleteCategory = async (categoryId) => {
    const confirmed = await confirm('Are you sure you want to delete this category? This action cannot be undone.', {
      title: 'Delete Category',
      type: 'danger',
      confirmText: 'Delete',
      confirmColor: 'danger'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await complaintManagementAPI.deleteCategory(categoryId);
      if (response.success) {
        await fetchCategories();
        alert.success('Category deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete category');
      }
    } catch (error) {
      console.error('❌ Error deleting category:', error);
      alert.error('Failed to delete category. Please try again.');
    }
  };

  // Edit category functions
  const startEditCategory = (category) => {
    setEditingCategory(category.id);
    setEditCategoryData({ 
      name: cleanFieldLabel(category.name) || category.name, 
      description: category.description || '' 
    });
  };

  const cancelEditCategory = () => {
    setEditingCategory(null);
    setEditCategoryData({ name: '', description: '' });
  };

  const handleUpdateCategory = async (categoryId) => {
    if (!editCategoryData.name.trim()) {
      alert.warning('Please enter a category name');
      return;
    }

    try {
      const response = await complaintManagementAPI.updateCategory(categoryId, editCategoryData);
      if (response.success) {
        await fetchCategories();
        setEditingCategory(null);
        setEditCategoryData({ name: '', description: '' });
        alert.success('Category updated successfully');
      } else {
        throw new Error(response.message || 'Failed to update category');
      }
    } catch (error) {
      console.error('❌ Error updating category:', error);
      alert.error('Failed to update category. Please try again.');
    }
  };

  // Field management functions
  const handleCreateField = async () => {
    if (!newField.field_name.trim()) {
      alert.warning('Please enter a field name');
      return;
    }
    
    if (!newField.field_label.trim()) {
      alert.warning('Please enter a field label');
      return;
    }

    try {
      const fieldData = { ...newField };
      
      // Handle field options for select and radio types
      if ((fieldData.field_type === 'select' || fieldData.field_type === 'radio') && fieldData.field_options) {
        // Convert comma-separated string to array
        fieldData.field_options = fieldData.field_options.split(',').map(opt => opt.trim()).filter(opt => opt);
      } else if (fieldData.field_type !== 'select' && fieldData.field_type !== 'radio') {
        fieldData.field_options = null;
      }

      const response = await complaintManagementAPI.createField(fieldData);
      if (response.success) {
        await fetchFields();
        setNewField({ 
          field_name: '', 
          field_label: '',
          field_type: 'text', 
          is_required: false, 
          field_options: '' 
        });
        alert.success('Field created successfully');
      } else {
        throw new Error(response.message || 'Failed to create field');
      }
    } catch (error) {
      console.error('❌ Error creating field:', error);
      alert.error('Failed to create field. Please try again.');
    }
  };

  const handleDeleteField = async (fieldId) => {
    const confirmed = await confirm('Are you sure you want to delete this field? This action cannot be undone.', {
      title: 'Delete Field',
      type: 'danger',
      confirmText: 'Delete',
      confirmColor: 'danger'
    });
    
    if (!confirmed) {
      return;
    }

    try {
      const response = await complaintManagementAPI.deleteField(fieldId);
      if (response.success) {
        await fetchFields();
        alert.success('Field deleted successfully');
      } else {
        throw new Error(response.message || 'Failed to delete field');
      }
    } catch (error) {
      console.error('❌ Error deleting field:', error);
      alert.error('Failed to delete field. Please try again.');
    }
  };

  // Export/Import functions
  const handleExportComplaints = async (format = 'json') => {
    try {
      const filters = {
        status: filterStatus !== 'all' ? filterStatus : undefined,
        category_id: filterCategory !== 'all' ? filterCategory : undefined
      };
      
      const result = await complaintManagementAPI.exportComplaints(format, filters);
      
      // Create and download file
      const blob = new Blob([format === 'json' ? JSON.stringify(result, null, 2) : result], {
        type: format === 'json' ? 'application/json' : 'text/csv'
      });
      
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `complaints_export_${new Date().toISOString().split('T')[0]}.${format}`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
      
      alert.success(`Complaints exported successfully as ${format.toUpperCase()}`);
    } catch (error) {
      console.error('❌ Error exporting complaints:', error);
      alert.error('Failed to export complaints. Please try again.');
    }
  };

  const handleImportData = async (file, type = 'categories') => {
    try {
      const text = await file.text();
      let data;
      
      try {
        data = JSON.parse(text);
      } catch (e) {
        alert.error('Invalid JSON file. Please check the file format.');
        return;
      }
      
      if (!Array.isArray(data)) {
        alert.error('Data must be an array of objects.');
        return;
      }
      
      const result = await complaintManagementAPI.importData(type, data);
      
      if (result.success) {
        alert.success(`Successfully imported ${result.data.imported} ${type}`);
        
        // Refresh data based on type
        if (type === 'categories') {
          await fetchCategories();
        } else if (type === 'fields') {
          await fetchFields();
        }
      } else {
        throw new Error(result.message || 'Import failed');
      }
    } catch (error) {
      console.error('❌ Error importing data:', error);
      alert.error('Failed to import data. Please try again.');
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'open':
        return <Clock size={16} className="text-yellow-500" />;
      case 'in_progress':
        return <AlertTriangle size={16} className="text-blue-500" />;
      case 'resolved':
        return <CheckCircle size={16} className="text-green-500" />;
      default:
        return <XCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'open':
        return '#ffc107';
      case 'in_progress':
        return '#0d6efd';
      case 'resolved':
        return '#28a745';
      default:
        return '#6c757d';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'open':
        return 'Open';
      case 'in_progress':
        return 'In Progress';
      case 'resolved':
        return 'Resolved';
      default:
        return 'Unknown';
    }
  };

  const getCategoryName = (categoryId) => {
    const category = categories.find(cat => cat.id === categoryId);
    return category ? category.name : 'Unknown Category';
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleDateString('id-ID', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  };

  // Styles
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 1px 3px rgba(0, 0, 0, 0.1)',
    marginBottom: '24px'
  };

  const statCardStyle = {
    ...cardStyle,
    padding: '20px',
    textAlign: 'center',
    border: '1px solid #dee2e6'
  };

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{ fontSize: '18px', color: '#6c757d' }}>Loading complaint data...</div>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ 
          fontSize: '24px', 
          fontWeight: '600', 
          color: '#495057', 
          margin: '0 0 8px 0',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <AlertTriangle size={28} />
          Complaint Management
        </h2>
        <p style={{ color: '#6c757d', margin: '0' }}>
          Manage visitor complaints and track resolutions
        </p>
      </div>

      {/* Statistics Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#495057', marginBottom: '8px' }}>
            {stats.total}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <MessageSquare size={16} />
            Total Complaints
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#ffc107', marginBottom: '8px' }}>
            {stats.open}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <Clock size={16} />
            Open
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#0d6efd', marginBottom: '8px' }}>
            {stats.in_progress}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <AlertTriangle size={16} />
            In Progress
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#28a745', marginBottom: '8px' }}>
            {stats.resolved}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <CheckCircle size={16} />
            Resolved
          </div>
        </div>

        <div style={statCardStyle}>
          <div style={{ fontSize: '28px', fontWeight: '700', color: '#dc3545', marginBottom: '8px' }}>
            {stats.recent}
          </div>
          <div style={{ fontSize: '14px', color: '#6c757d', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}>
            <TrendingUp size={16} />
            Recent (7 days)
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={cardStyle}>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
            gap: '16px' 
          }}>
            {/* Search */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#495057' 
              }}>
                <Search size={16} style={{ marginRight: '6px' }} />
                Search Complaints
              </label>
              <input
                type="text"
                placeholder="Search by name, email, phone, ticket number, or content..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              />
            </div>

            {/* Status Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#495057' 
              }}>
                Filter by Status
              </label>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Status</option>
                <option value="open">⏳ Open</option>
                <option value="in_progress">🔄 In Progress</option>
                <option value="resolved">✅ Resolved</option>
              </select>
            </div>

            {/* Category Filter */}
            <div>
              <label style={{ 
                display: 'block', 
                marginBottom: '6px', 
                fontSize: '14px', 
                fontWeight: '500', 
                color: '#495057' 
              }}>
                Filter by Category
              </label>
              <select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 12px',
                  border: '1px solid #ced4da',
                  borderRadius: '6px',
                  fontSize: '14px'
                }}
              >
                <option value="all">All Categories</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Complaints Table */}
      <div style={cardStyle}>
        <div style={{ padding: '20px' }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '20px' 
          }}>
            <h3 style={{ margin: '0', fontSize: '18px', fontWeight: '600', color: '#495057' }}>
              Complaints List ({filteredComplaints.length})
            </h3>
            <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
              <button
                onClick={() => setShowCategoryModal(true)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #28a745',
                  borderRadius: '6px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Settings size={16} />
                Manage Categories
              </button>
              <button
                onClick={() => setShowFieldModal(true)}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #6f42c1',
                  borderRadius: '6px',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Plus size={16} />
                Manage Fields
              </button>
              
              {/* Export dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('export-menu');
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #fd7e14',
                    borderRadius: '6px',
                    backgroundColor: '#fd7e14',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Download size={16} />
                  Export
                </button>
                <div
                  id="export-menu"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '150px'
                  }}
                >
                  <button
                    onClick={() => {
                      handleExportComplaints('json');
                      document.getElementById('export-menu').style.display = 'none';
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Export as JSON
                  </button>
                  <button
                    onClick={() => {
                      handleExportComplaints('csv');
                      document.getElementById('export-menu').style.display = 'none';
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Export as CSV
                  </button>
                </div>
              </div>
              
              {/* Import dropdown */}
              <div style={{ position: 'relative' }}>
                <button
                  onClick={() => {
                    const menu = document.getElementById('import-menu');
                    menu.style.display = menu.style.display === 'block' ? 'none' : 'block';
                  }}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #20c997',
                    borderRadius: '6px',
                    backgroundColor: '#20c997',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px'
                  }}
                >
                  <Upload size={16} />
                  Import
                </button>
                <div
                  id="import-menu"
                  style={{
                    display: 'none',
                    position: 'absolute',
                    top: '100%',
                    left: 0,
                    backgroundColor: 'white',
                    border: '1px solid #dee2e6',
                    borderRadius: '6px',
                    boxShadow: '0 2px 10px rgba(0,0,0,0.1)',
                    zIndex: 1000,
                    minWidth: '180px'
                  }}
                >
                  <div style={{ padding: '8px 12px', fontSize: '12px', color: '#6c757d', borderBottom: '1px solid #dee2e6' }}>
                    Import JSON file:
                  </div>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        if (e.target.files[0]) {
                          handleImportData(e.target.files[0], 'categories');
                        }
                      };
                      input.click();
                      document.getElementById('import-menu').style.display = 'none';
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Import Categories
                  </button>
                  <button
                    onClick={() => {
                      const input = document.createElement('input');
                      input.type = 'file';
                      input.accept = '.json';
                      input.onchange = (e) => {
                        if (e.target.files[0]) {
                          handleImportData(e.target.files[0], 'fields');
                        }
                      };
                      input.click();
                      document.getElementById('import-menu').style.display = 'none';
                    }}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: 'none',
                      backgroundColor: 'transparent',
                      fontSize: '14px',
                      cursor: 'pointer',
                      textAlign: 'left'
                    }}
                  >
                    Import Fields
                  </button>
                </div>
              </div>
              
              <button
                onClick={() => fetchComplaints()}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #0d6efd',
                  borderRadius: '6px',
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
              >
                <Send size={16} />
                Refresh
              </button>
            </div>
          </div>

          {/* Rows per page control */}
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center', 
            marginBottom: '16px',
            padding: '12px 16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '6px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              fontSize: '14px',
              color: '#495057'
            }}>
              <span>Show</span>
              <select
                value={rowsPerPage}
                onChange={(e) => setRowsPerPage(Number(e.target.value))}
                style={{
                  padding: '4px 8px',
                  border: '1px solid #ced4da',
                  borderRadius: '4px',
                  fontSize: '14px',
                  backgroundColor: 'white'
                }}
              >
                <option value={20}>20</option>
                <option value={30}>30</option>
                <option value={50}>50</option>
                <option value={100}>100</option>
              </select>
              <span>entries per page</span>
            </div>
            <div style={{ fontSize: '14px', color: '#6c757d' }}>
              Showing {startIndex + 1} to {Math.min(endIndex, filteredComplaints.length)} of {filteredComplaints.length} entries
            </div>
          </div>

          {error && (
            <div style={{
              padding: '12px',
              backgroundColor: '#f8d7da',
              color: '#721c24',
              borderRadius: '6px',
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <AlertCircle size={16} />
              {error}
            </div>
          )}

          {filteredComplaints.length === 0 ? (
            <div style={{ 
              textAlign: 'center', 
              padding: '40px', 
              color: '#6c757d' 
            }}>
              <AlertTriangle size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
              <div>No complaints found matching your criteria</div>
            </div>
          ) : (
            <div style={{ 
              overflowX: 'auto',
              border: '1px solid #dee2e6',
              borderRadius: '8px'
            }}>
              <table style={{ 
                width: '100%', 
                borderCollapse: 'collapse',
                minWidth: '1000px' // Minimum width for responsiveness
              }}>
                <thead>
                  <tr style={{ backgroundColor: '#f8f9fa' }}>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6', 
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '180px',
                      position: 'sticky',
                      left: 0,
                      backgroundColor: '#f8f9fa',
                      zIndex: 10
                    }}>
                      Contact Information
                    </th>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '100px'
                    }}>
                      Category
                    </th>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '120px'
                    }}>
                      Nomor Tiket
                    </th>
                    {getDynamicColumns().map(field => (
                      <th key={field.id} style={{ 
                        padding: '14px 12px', 
                        textAlign: 'left', 
                        borderBottom: '2px solid #dee2e6',
                        fontSize: '13px',
                        fontWeight: '600',
                        color: '#495057',
                        minWidth: field.field_type === 'file' ? '150px' :
                                 field.field_type === 'textarea' ? '200px' : '120px',
                        maxWidth: field.field_type === 'file' ? '200px' :
                                 field.field_type === 'textarea' ? '250px' : '180px'
                      }}>
                        {cleanFieldLabel(field.field_label) || cleanFieldName(field.field_name)}
                        {field.is_required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
                      </th>
                    ))}
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '120px',
                      maxWidth: '150px'
                    }}>
                      📷 Foto Bukti
                    </th>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '130px'
                    }}>
                      Status
                    </th>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'left', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '120px'
                    }}>
                      Date
                    </th>
                    <th style={{ 
                      padding: '14px 12px', 
                      textAlign: 'center', 
                      borderBottom: '2px solid #dee2e6',
                      fontSize: '13px',
                      fontWeight: '600',
                      color: '#495057',
                      minWidth: '100px'
                    }}>
                      Actions
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedComplaints.map((complaint) => (
                    <tr key={`complaint-${complaint.id}`} style={{ 
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s',
                      ':hover': { backgroundColor: '#f8f9fa' }
                    }}>
                      <td style={{ 
                        padding: '12px',
                        position: 'sticky',
                        left: 0,
                        backgroundColor: 'white',
                        zIndex: 5,
                        borderRight: '1px solid #dee2e6'
                      }}>
                        <div style={{ 
                          display: 'flex',
                          flexDirection: 'column',
                          gap: '4px'
                        }}>
                          <div style={{ 
                            fontWeight: '600', 
                            color: '#495057',
                            fontSize: '14px'
                          }}>
                            {complaint.complainant_name || complaint.name || 'N/A'}
                          </div>
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#6c757d',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <span>📧</span>
                            {complaint.complainant_email || complaint.email || 'No email'}
                          </div>
                          {(complaint.complainant_phone || complaint.phone) && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#6c757d',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>📞</span>
                              {complaint.complainant_phone || complaint.phone}
                            </div>
                          )}
                          {complaint.form_data?.contact_phone && complaint.form_data.contact_phone !== (complaint.complainant_phone || complaint.phone) && (
                            <div style={{ 
                              fontSize: '12px', 
                              color: '#28a745',
                              display: 'flex',
                              alignItems: 'center',
                              gap: '4px'
                            }}>
                              <span>📱</span>
                              {complaint.form_data.contact_phone}
                            </div>
                          )}
                        </div>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: '#007bff20',
                          color: '#007bff',
                          whiteSpace: 'nowrap'
                        }}>
                          {getCategoryName(complaint.category_id)}
                        </span>
                      </td>
                      <td style={{ padding: '12px' }}>
                        <span style={{
                          padding: '4px 8px',
                          borderRadius: '8px',
                          fontSize: '11px',
                          fontWeight: '600',
                          backgroundColor: 'rgb(253, 121, 13, 0.1)',
                          color: 'rgb(253, 121, 13)',
                          border: '1px solid rgb(253, 121, 13, 0.3)',
                          fontFamily: 'monospace',
                          whiteSpace: 'nowrap'
                        }}>
                          {generateTicketNumber(complaint)}
                        </span>
                      </td>
                      {getDynamicColumns().map(field => (
                        <td key={`field-${field.id}-${complaint.id}`} style={{ 
                          padding: '12px', 
                          maxWidth: field.field_type === 'file' ? '200px' : 
                                   field.field_type === 'textarea' ? '250px' : '180px',
                          minWidth: field.field_type === 'file' ? '150px' : 'auto',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                          fontSize: '13px'
                        }}>
                          <div style={{ 
                            maxWidth: '100%',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: field.field_type === 'textarea' ? 'normal' : 
                                       field.field_type === 'file' ? 'normal' : 'nowrap'
                          }}>
                            {renderFieldValue(field, getFormDataValue(complaint, field.field_name))}
                          </div>
                        </td>
                      ))}
                      <td style={{ padding: '12px' }}>
                        {complaint.complaint_photo || complaint.photos_url ? (
                          (() => {
                            // Handle photos_url which can be a JSON array or string
                            let photoUrl = complaint.complaint_photo;
                            
                            if (!photoUrl && complaint.photos_url) {
                              if (Array.isArray(complaint.photos_url)) {
                                // If it's already parsed as array, get first item
                                photoUrl = complaint.photos_url[0];
                              } else if (typeof complaint.photos_url === 'string') {
                                try {
                                  // Try to parse as JSON array
                                  const parsed = JSON.parse(complaint.photos_url);
                                  photoUrl = Array.isArray(parsed) ? parsed[0] : complaint.photos_url;
                                } catch (e) {
                                  // If parsing fails, use as string
                                  photoUrl = complaint.photos_url;
                                }
                              }
                            }
                            
                            if (!photoUrl) return <span style={{ color: '#6c757d' }}>No photo</span>;
                            
                            // Ensure photoUrl is a string
                            const photoUrlString = typeof photoUrl === 'string' ? photoUrl : String(photoUrl || '');
                            
                            if (!photoUrlString) return <span style={{ color: '#6c757d' }}>No photo</span>;
                            
                            const isBase64 = photoUrlString.startsWith('data:image');
                            const imageUrl = isBase64 
                              ? photoUrlString 
                              : photoUrlString.startsWith('http') 
                                ? photoUrlString 
                                : photoUrlString.startsWith('/uploads/')
                                  ? `${import.meta.env.VITE_API_URL.replace("/api", "")}${photoUrlString}`
                                  : `${import.meta.env.VITE_API_URL.replace("/api", "")}/uploads/complaints/${encodeURIComponent(photoUrlString)}`;
                            
                            return imageUrl ? (
                              <div style={{ 
                                display: 'flex', 
                                alignItems: 'center', 
                                gap: '8px',
                                minWidth: '100px'
                              }}>
                                {/* Photo thumbnail */}
                                <div
                                  style={{
                                    position: 'relative',
                                    width: '50px',
                                    height: '50px',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    cursor: 'pointer',
                                    border: '2px solid #e3e3e3',
                                    transition: 'all 0.3s ease',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                                  }}
                                  onClick={() => handleImageClick(imageUrl, 'Foto Bukti Complaint')}
                                  onMouseEnter={(e) => {
                                    e.currentTarget.style.transform = 'scale(1.05)';
                                    e.currentTarget.style.border = '2px solid #0d6efd';
                                    e.currentTarget.style.boxShadow = '0 4px 8px rgba(13, 110, 253, 0.3)';
                                  }}
                                  onMouseLeave={(e) => {
                                    e.currentTarget.style.transform = 'scale(1)';
                                    e.currentTarget.style.border = '2px solid #e3e3e3';
                                    e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                                  }}
                                >
                                  <img
                                    src={imageUrl}
                                    alt="Foto Bukti"
                                    style={{
                                      width: '100%',
                                      height: '100%',
                                      objectFit: 'cover',
                                      display: 'block'
                                    }}
                                    onError={(e) => {
                                      console.error('❌ Photo failed to load:', {
                                        src: e.target.src,
                                        originalUrl: photoUrl
                                      });
                                      e.target.style.display = 'none';
                                      const parent = e.target.parentElement;
                                      if (parent) {
                                        parent.innerHTML = `
                                          <div style="
                                            width: 100%; 
                                            height: 100%; 
                                            display: flex; 
                                            align-items: center; 
                                            justify-content: center; 
                                            background-color: #f8f9fa;
                                            color: #6c757d;
                                            font-size: 12px;
                                          ">
                                            📷 Error
                                          </div>
                                        `;
                                      }
                                    }}
                                  />
                                  {/* Hover overlay */}
                                  <div
                                    style={{
                                      position: 'absolute',
                                      top: 0,
                                      left: 0,
                                      right: 0,
                                      bottom: 0,
                                      background: 'rgba(13, 110, 253, 0.1)',
                                      opacity: 0,
                                      transition: 'opacity 0.3s ease',
                                      display: 'flex',
                                      alignItems: 'center',
                                      justifyContent: 'center',
                                      color: '#0d6efd',
                                      fontSize: '20px',
                                      fontWeight: 'bold'
                                    }}
                                    onMouseEnter={(e) => {
                                      e.target.style.opacity = 1;
                                    }}
                                    onMouseLeave={(e) => {
                                      e.target.style.opacity = 0;
                                    }}
                                  >
                                    🔍
                                  </div>
                                </div>
                                

                              </div>
                            ) : null;
                          })()
                        ) : (
                          <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: '50px',
                            height: '50px',
                            borderRadius: '8px',
                            backgroundColor: '#f8f9fa',
                            border: '2px dashed #dee2e6',
                            color: '#6c757d',
                            fontSize: '12px'
                          }}>
                            📷 No Photo
                          </div>
                        )}
                      </td>
                      <td style={{ padding: '12px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          {getStatusIcon(complaint.status)}
                          <select
                            value={complaint.status}
                            onChange={(e) => handleStatusUpdate(complaint.id, e.target.value)}
                            style={{
                              padding: '4px 8px',
                              border: `1px solid ${getStatusColor(complaint.status)}`,
                              borderRadius: '4px',
                              fontSize: '12px',
                              backgroundColor: `${getStatusColor(complaint.status)}20`,
                              color: getStatusColor(complaint.status),
                              minWidth: '90px'
                            }}
                          >
                            <option value="open">Open</option>
                            <option value="in_progress">In Progress</option>
                            <option value="resolved">Resolved</option>
                          </select>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '12px', 
                        fontSize: '12px', 
                        color: '#6c757d',
                        whiteSpace: 'nowrap'
                      }}>
                        {formatDate(complaint.created_at)}
                      </td>
                      <td style={{ padding: '12px', textAlign: 'center' }}>
                        <button
                          onClick={async () => {
                            try {
                              const response = await complaintsAPI.getById(complaint.id);
                              if (response.success) {
                                setSelectedComplaint(response.data);
                                setShowDetailModal(true);
                              }
                            } catch (error) {
                              console.error('Error fetching complaint details:', error);
                              alert.error('Failed to load complaint details');
                            }
                          }}
                          style={{
                            padding: '6px 12px',
                            border: '1px solid #0d6efd',
                            borderRadius: '4px',
                            backgroundColor: 'transparent',
                            color: '#0d6efd',
                            cursor: 'pointer',
                            fontSize: '12px',
                            fontWeight: '500',
                            transition: 'all 0.2s'
                          }}
                          title="View Details"
                          onMouseOver={(e) => {
                            e.target.style.backgroundColor = '#0d6efd';
                            e.target.style.color = 'white';
                          }}
                          onMouseOut={(e) => {
                            e.target.style.backgroundColor = 'transparent';
                            e.target.style.color = '#0d6efd';
                          }}
                        >
                          <Eye size={14} style={{ marginRight: '4px' }} />
                          View
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination Controls */}
          {filteredComplaints.length > 0 && (
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginTop: '20px',
              padding: '16px',
              backgroundColor: '#f8f9fa',
              borderRadius: '6px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                Page {currentPage} of {totalPages} ({filteredComplaints.length} total entries)
              </div>
              <div style={{ display: 'flex', gap: '8px' }}>
                <button
                  onClick={() => setCurrentPage(1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === 1 ? '#e9ecef' : 'white',
                    color: currentPage === 1 ? '#6c757d' : '#495057',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  First
                </button>
                <button
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === 1 ? '#e9ecef' : 'white',
                    color: currentPage === 1 ? '#6c757d' : '#495057',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Previous
                </button>
                <span style={{ 
                  padding: '6px 12px', 
                  border: '1px solid #0d6efd',
                  borderRadius: '4px',
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  fontSize: '14px',
                  fontWeight: '500'
                }}>
                  {currentPage}
                </span>
                <button
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === totalPages ? '#e9ecef' : 'white',
                    color: currentPage === totalPages ? '#6c757d' : '#495057',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Next
                </button>
                <button
                  onClick={() => setCurrentPage(totalPages)}
                  disabled={currentPage === totalPages}
                  style={{
                    padding: '6px 12px',
                    border: '1px solid #dee2e6',
                    borderRadius: '4px',
                    backgroundColor: currentPage === totalPages ? '#e9ecef' : 'white',
                    color: currentPage === totalPages ? '#6c757d' : '#495057',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Last
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedComplaint && (
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
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '800px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>
                Complaint Details
              </h3>
              <button
                onClick={() => setShowDetailModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ marginBottom: '24px' }}>
              {/* Contact Information */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Contact Information:</label>
                <div style={{ fontSize: '16px', marginTop: '4px' }}>
                  <div><strong>Name:</strong> {selectedComplaint.complainant_name || selectedComplaint.name || 'N/A'}</div>
                  <div><strong>Email:</strong> {selectedComplaint.complainant_email || selectedComplaint.email || 'N/A'}</div>
                  {(selectedComplaint.complainant_phone || selectedComplaint.phone) && (
                    <div><strong>Phone:</strong> {selectedComplaint.complainant_phone || selectedComplaint.phone}</div>
                  )}
                </div>
              </div>

              {/* Nomor Tiket */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Nomor Tiket:</label>
                <div style={{ marginTop: '4px' }}>
                  <span style={{
                    padding: '8px 12px',
                    borderRadius: '8px',
                    fontSize: '14px',
                    fontWeight: '600',
                    backgroundColor: 'rgb(253, 121, 13, 0.1)',
                    color: 'rgb(253, 121, 13)',
                    border: '1px solid rgb(253, 121, 13, 0.3)',
                    fontFamily: 'monospace'
                  }}>
                    {generateTicketNumber(selectedComplaint)}
                  </span>
                </div>
              </div>

              {/* Category and Status */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Category:</label>
                  <div style={{ marginTop: '4px' }}>
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: '#007bff20',
                      color: '#007bff'
                    }}>
                      {getCategoryName(selectedComplaint.category_id)}
                    </span>
                  </div>
                </div>
                <div>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Status:</label>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '4px' }}>
                    {getStatusIcon(selectedComplaint.status)}
                    <span style={{
                      padding: '6px 12px',
                      borderRadius: '16px',
                      fontSize: '14px',
                      fontWeight: '500',
                      backgroundColor: `${getStatusColor(selectedComplaint.status)}20`,
                      color: getStatusColor(selectedComplaint.status)
                    }}>
                      {getStatusLabel(selectedComplaint.status)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Dynamic Form Data */}
              {selectedComplaint.form_data && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Complaint Details:</label>
                  <div style={{ 
                    marginTop: '8px',
                    padding: '12px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '6px',
                    border: '1px solid #dee2e6'
                  }}>
                    {(() => {
                      let formDataObj = {};
                      
                      // Handle different types of form_data
                      if (typeof selectedComplaint.form_data === 'string') {
                        try {
                          formDataObj = JSON.parse(selectedComplaint.form_data);
                        } catch (e) {
                          // If it's not valid JSON, treat as plain text
                          formDataObj = { description: selectedComplaint.form_data };
                        }
                      } else if (typeof selectedComplaint.form_data === 'object' && selectedComplaint.form_data !== null) {
                        formDataObj = selectedComplaint.form_data;
                      }

                      // Convert array-like objects to proper format
                      if (Array.isArray(formDataObj)) {
                        const arrayData = {};
                        formDataObj.forEach((item, index) => {
                          if (typeof item === 'object') {
                            Object.assign(arrayData, item);
                          } else {
                            arrayData[`item_${index + 1}`] = item;
                          }
                        });
                        formDataObj = arrayData;
                      }

                      return Object.entries(formDataObj).map(([key, value]) => {
                        // Clean up the value - handle arrays and objects properly
                        let displayValue = value;
                        if (Array.isArray(value)) {
                          displayValue = value.join(', ');
                        } else if (typeof value === 'object' && value !== null) {
                          displayValue = JSON.stringify(value, null, 2);
                        } else if (value === null || value === undefined) {
                          displayValue = 'N/A';
                        } else {
                          displayValue = String(value);
                        }

                        return (
                          <div key={`form-data-${selectedComplaint.id}-${key}`} style={{ marginBottom: '12px' }}>
                            <div style={{ 
                              fontSize: '12px', 
                              fontWeight: '600', 
                              color: '#6c757d', 
                              textTransform: 'uppercase',
                              letterSpacing: '0.5px',
                              marginBottom: '4px'
                            }}>
                              {cleanFieldLabel(key) || key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </div>
                            <div style={{ 
                              fontSize: '14px',
                              color: '#495057',
                              lineHeight: '1.5',
                              padding: '8px',
                              backgroundColor: 'white',
                              borderRadius: '4px',
                              border: '1px solid #e9ecef',
                              whiteSpace: typeof value === 'object' ? 'pre-wrap' : 'normal'
                            }}>
                              {displayValue}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              )}

              {/* Photos */}
              {(selectedComplaint.complaint_photo || selectedComplaint.photos_url) && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Photos:</label>
                  <div style={{ 
                    marginTop: '8px',
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fill, minmax(120px, 1fr))',
                    gap: '12px'
                  }}>
                    {(() => {
                      let photoUrls = [];
                      
                      // Handle photos_url which can be a JSON array or string
                      if (selectedComplaint.photos_url) {
                        if (Array.isArray(selectedComplaint.photos_url)) {
                          photoUrls = selectedComplaint.photos_url;
                        } else if (typeof selectedComplaint.photos_url === 'string') {
                          try {
                            const parsed = JSON.parse(selectedComplaint.photos_url);
                            photoUrls = Array.isArray(parsed) ? parsed : [selectedComplaint.photos_url];
                          } catch (e) {
                            photoUrls = [selectedComplaint.photos_url];
                          }
                        }
                      } else if (selectedComplaint.complaint_photo) {
                        photoUrls = [selectedComplaint.complaint_photo];
                      }

                      return photoUrls.map((photoUrl, index) => {
                        const photoUrlString = typeof photoUrl === 'string' ? photoUrl : String(photoUrl || '');
                        
                        if (!photoUrlString) return null;
                        
                        const isBase64 = photoUrlString.startsWith('data:image');
                        const imageUrl = isBase64 
                          ? photoUrlString 
                          : photoUrlString.startsWith('http') 
                            ? photoUrlString 
                            : photoUrlString.startsWith('/uploads/')
                              ? `${import.meta.env.VITE_API_URL.replace("/api", "")}${photoUrlString}`
                              : `${import.meta.env.VITE_API_URL.replace("/api", "")}/uploads/complaints/${encodeURIComponent(photoUrlString)}`;

                        return (
                          <div
                            key={`photo-${index}`}
                            style={{
                              position: 'relative',
                              width: '120px',
                              height: '120px',
                              borderRadius: '8px',
                              overflow: 'hidden',
                              cursor: 'pointer',
                              border: '2px solid #e3e3e3',
                              transition: 'all 0.3s ease',
                              boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}
                            onClick={() => handleImageClick(imageUrl, `Photo ${index + 1}`)}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.transform = 'scale(1.05)';
                              e.currentTarget.style.border = '2px solid #0d6efd';
                              e.currentTarget.style.boxShadow = '0 4px 8px rgba(13, 110, 253, 0.3)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.transform = 'scale(1)';
                              e.currentTarget.style.border = '2px solid #e3e3e3';
                              e.currentTarget.style.boxShadow = '0 2px 4px rgba(0,0,0,0.1)';
                            }}
                          >
                            <img
                              src={imageUrl}
                              alt={`Photo ${index + 1}`}
                              style={{
                                width: '100%',
                                height: '100%',
                                objectFit: 'cover',
                                display: 'block'
                              }}
                              onError={(e) => {
                                e.target.style.display = 'none';
                                e.target.parentNode.innerHTML = '<div style="display: flex; align-items: center; justify-content: center; height: 100%; background: #f8f9fa; color: #6c757d; font-size: 12px;">Failed to load</div>';
                              }}
                            />
                            <div
                              style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                right: 0,
                                bottom: 0,
                                background: 'rgba(13, 110, 253, 0.1)',
                                opacity: 0,
                                transition: 'opacity 0.3s ease',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                color: '#0d6efd',
                                fontSize: '20px',
                                fontWeight: 'bold'
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.opacity = 1;
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.opacity = 0;
                              }}
                            >
                              🔍
                            </div>
                          </div>
                        );
                      }).filter(Boolean);
                    })()}
                  </div>
                </div>
              )}

              {/* Responses */}
              {selectedComplaint.responses && selectedComplaint.responses.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                  <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Responses:</label>
                  <div style={{ marginTop: '8px' }}>
                    {selectedComplaint.responses.map((resp, index) => (
                      <div key={`response-${selectedComplaint.id}-${index}-${resp.created_at || Date.now()}`} style={{
                        padding: '12px',
                        backgroundColor: '#e3f2fd',
                        borderRadius: '6px',
                        border: '1px solid #bbdefb',
                        marginBottom: '8px'
                      }}>
                        <div style={{ fontSize: '14px', marginBottom: '4px' }}>{resp.response_text}</div>
                        <div style={{ fontSize: '12px', color: '#6c757d' }}>
                          {formatDate(resp.created_at)}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Add Response */}
              <div style={{ marginBottom: '16px' }}>
                <label style={{ fontSize: '14px', fontWeight: '500', color: '#495057' }}>Add Response:</label>
                <textarea
                  value={response}
                  onChange={(e) => setResponse(e.target.value)}
                  placeholder="Type your response here..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    border: '1px solid #ced4da',
                    borderRadius: '6px',
                    marginTop: '8px',
                    minHeight: '100px',
                    fontSize: '14px'
                  }}
                />
                <button
                  onClick={() => handleResponseSubmit(selectedComplaint.id)}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #28a745',
                    borderRadius: '6px',
                    backgroundColor: '#28a745',
                    color: 'white',
                    fontSize: '14px',
                    cursor: 'pointer',
                    marginTop: '8px'
                  }}
                >
                  <Send size={14} style={{ marginRight: '4px' }} />
                  Send Response
                </button>
              </div>

              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                <strong>Submitted:</strong> {formatDate(selectedComplaint.created_at)}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Category Management Modal */}
      {showCategoryModal && (
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
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>
                Manage Categories
              </h3>
              <button
                onClick={() => setShowCategoryModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Add New Category */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Add New Category</h4>
              <div style={{ marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Category Name"
                  value={newCategory.name}
                  onChange={(e) => setNewCategory({ ...newCategory, name: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <textarea
                  placeholder="Category Description (optional)"
                  value={newCategory.description}
                  onChange={(e) => setNewCategory({ ...newCategory, description: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px',
                    minHeight: '60px'
                  }}
                />
              </div>
              <button
                onClick={handleCreateCategory}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #28a745',
                  borderRadius: '4px',
                  backgroundColor: '#28a745',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                Add Category
              </button>
            </div>

            {/* Existing Categories */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Existing Categories</h4>
              {categories.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                  No categories found
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {categories.map((category) => (
                    <div key={category.id} style={{
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      backgroundColor: 'white'
                    }}>
                      {editingCategory === category.id ? (
                        // Edit mode
                        <div>
                          <div style={{ marginBottom: '12px' }}>
                            <input
                              type="text"
                              placeholder="Category Name"
                              value={editCategoryData.name}
                              onChange={(e) => setEditCategoryData({ ...editCategoryData, name: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                                marginBottom: '8px'
                              }}
                            />
                            <textarea
                              placeholder="Category Description (optional)"
                              value={editCategoryData.description}
                              onChange={(e) => setEditCategoryData({ ...editCategoryData, description: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px',
                                minHeight: '60px'
                              }}
                            />
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleUpdateCategory(category.id)}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #28a745',
                                borderRadius: '4px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditCategory}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #6c757d',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#6c757d',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                              {cleanFieldLabel(category.name) || category.name}
                            </div>
                            {category.description && (
                              <div style={{ fontSize: '14px', color: '#6c757d' }}>{category.description}</div>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => startEditCategory(category)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #0d6efd',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              title="Edit Category"
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#0d6efd';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#0d6efd';
                              }}
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteCategory(category.id)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              title="Delete Category"
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#dc3545';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#dc3545';
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Field Management Modal */}
      {showFieldModal && (
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
            borderRadius: '8px',
            padding: '24px',
            maxWidth: '600px',
            width: '90%',
            maxHeight: '80vh',
            overflowY: 'auto'
          }}>
            <div style={{ 
              display: 'flex', 
              justifyContent: 'space-between', 
              alignItems: 'center', 
              marginBottom: '20px' 
            }}>
              <h3 style={{ margin: '0', fontSize: '20px', fontWeight: '600' }}>
                Manage Fields
              </h3>
              <button
                onClick={() => setShowFieldModal(false)}
                style={{
                  border: 'none',
                  background: 'none',
                  fontSize: '24px',
                  cursor: 'pointer',
                  color: '#6c757d'
                }}
              >
                ×
              </button>
            </div>

            {/* Add New Field */}
            <div style={{ marginBottom: '24px', padding: '16px', backgroundColor: '#f8f9fa', borderRadius: '6px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Add New Field</h4>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                <input
                  type="text"
                  placeholder="Field Name (e.g., phone_number)"
                  value={newField.field_name}
                  onChange={(e) => setNewField({ ...newField, field_name: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
                <input
                  type="text"
                  placeholder="Field Label (e.g., Phone Number)"
                  value={newField.field_label}
                  onChange={(e) => setNewField({ ...newField, field_label: e.target.value })}
                  style={{
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                />
              </div>
              <div style={{ marginBottom: '12px' }}>
                <select
                  value={newField.field_type}
                  onChange={(e) => setNewField({ ...newField, field_type: e.target.value })}
                  style={{
                    width: '100%',
                    padding: '8px 12px',
                    border: '1px solid #ced4da',
                    borderRadius: '4px',
                    fontSize: '14px'
                  }}
                >
                  <option value="text">Text</option>
                  <option value="textarea">Textarea</option>
                  <option value="select">Select</option>
                  <option value="number">Number</option>
                  <option value="date">Date</option>
                  <option value="email">Email</option>
                  <option value="tel">Phone</option>
                  <option value="file">File Upload (Photo)</option>
                  <option value="location">Location (GPS/Address)</option>
                </select>
              </div>
              {newField.field_type === 'select' && (
                <div style={{ marginBottom: '12px' }}>
                  <input
                    type="text"
                    placeholder="Options (comma separated)"
                    value={newField.field_options}
                    onChange={(e) => setNewField({ ...newField, field_options: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '8px 12px',
                      border: '1px solid #ced4da',
                      borderRadius: '4px',
                      fontSize: '14px'
                    }}
                  />
                </div>
              )}
              <div style={{ marginBottom: '12px' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                  <input
                    type="checkbox"
                    checked={newField.is_required}
                    onChange={(e) => setNewField({ ...newField, is_required: e.target.checked })}
                  />
                  Required Field
                </label>
              </div>
              <button
                onClick={handleCreateField}
                style={{
                  padding: '8px 16px',
                  border: '1px solid #6f42c1',
                  borderRadius: '4px',
                  backgroundColor: '#6f42c1',
                  color: 'white',
                  fontSize: '14px',
                  cursor: 'pointer'
                }}
              >
                <Plus size={14} style={{ marginRight: '4px' }} />
                Add Field
              </button>
            </div>

            {/* Existing Fields */}
            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '16px', fontWeight: '600' }}>Existing Fields</h4>
              {fields.length === 0 ? (
                <div style={{ textAlign: 'center', color: '#6c757d', padding: '20px' }}>
                  No fields found
                </div>
              ) : (
                <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                  {fields.map((field) => (
                    <div key={field.id} style={{
                      padding: '12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '4px',
                      marginBottom: '8px',
                      backgroundColor: 'white'
                    }}>
                      {editingField === field.id ? (
                        // Edit mode
                        <div>
                          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '12px' }}>
                            <input
                              type="text"
                              placeholder="Field Name"
                              value={editFieldData.field_name}
                              onChange={(e) => setEditFieldData({ ...editFieldData, field_name: e.target.value })}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                            <input
                              type="text"
                              placeholder="Field Label"
                              value={editFieldData.field_label}
                              onChange={(e) => setEditFieldData({ ...editFieldData, field_label: e.target.value })}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            />
                          </div>
                          <div style={{ marginBottom: '12px' }}>
                            <select
                              value={editFieldData.field_type}
                              onChange={(e) => setEditFieldData({ ...editFieldData, field_type: e.target.value })}
                              style={{
                                width: '100%',
                                padding: '8px 12px',
                                border: '1px solid #ced4da',
                                borderRadius: '4px',
                                fontSize: '14px'
                              }}
                            >
                              <option value="text">Text</option>
                              <option value="textarea">Textarea</option>
                              <option value="select">Select</option>
                              <option value="number">Number</option>
                              <option value="date">Date</option>
                              <option value="email">Email</option>
                              <option value="tel">Phone</option>
                              <option value="file">File Upload (Photo)</option>
                              <option value="location">Location (GPS/Address)</option>
                            </select>
                          </div>
                          {editFieldData.field_type === 'select' && (
                            <div style={{ marginBottom: '12px' }}>
                              <input
                                type="text"
                                placeholder="Options (comma separated)"
                                value={editFieldData.field_options}
                                onChange={(e) => setEditFieldData({ ...editFieldData, field_options: e.target.value })}
                                style={{
                                  width: '100%',
                                  padding: '8px 12px',
                                  border: '1px solid #ced4da',
                                  borderRadius: '4px',
                                  fontSize: '14px'
                                }}
                              />
                            </div>
                          )}
                          <div style={{ marginBottom: '12px' }}>
                            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '14px' }}>
                              <input
                                type="checkbox"
                                checked={editFieldData.is_required}
                                onChange={(e) => setEditFieldData({ ...editFieldData, is_required: e.target.checked })}
                              />
                              Required Field
                            </label>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => handleUpdateField(field.id)}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #28a745',
                                borderRadius: '4px',
                                backgroundColor: '#28a745',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Save
                            </button>
                            <button
                              onClick={cancelEditField}
                              style={{
                                padding: '6px 12px',
                                border: '1px solid #6c757d',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#6c757d',
                                cursor: 'pointer',
                                fontSize: '12px'
                              }}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : (
                        // View mode
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                          <div style={{ flex: 1 }}>
                            <div style={{ fontWeight: '500', marginBottom: '4px' }}>
                              {cleanFieldLabel(field.field_label) || cleanFieldName(field.field_name) || field.field_name}
                              {field.is_required && <span style={{ color: '#dc3545', marginLeft: '4px' }}>*</span>}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>
                              Field Name: {cleanFieldName(field.field_name) || field.field_name}
                            </div>
                            <div style={{ fontSize: '12px', color: '#6c757d' }}>
                              Type: {field.field_type}
                              {field.field_options && (
                                <span>
                                  {' | Options: '}
                                  {Array.isArray(field.field_options) 
                                    ? field.field_options.join(', ')
                                    : field.field_options
                                  }
                                </span>
                              )}
                            </div>
                          </div>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <button
                              onClick={() => startEditField(field)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #0d6efd',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#0d6efd',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              title="Edit Field"
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#0d6efd';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#0d6efd';
                              }}
                            >
                              <Edit size={12} />
                            </button>
                            <button
                              onClick={() => handleDeleteField(field.id)}
                              style={{
                                padding: '4px 8px',
                                border: '1px solid #dc3545',
                                borderRadius: '4px',
                                backgroundColor: 'transparent',
                                color: '#dc3545',
                                cursor: 'pointer',
                                fontSize: '12px',
                                transition: 'all 0.2s'
                              }}
                              title="Delete Field"
                              onMouseOver={(e) => {
                                e.target.style.backgroundColor = '#dc3545';
                                e.target.style.color = 'white';
                              }}
                              onMouseOut={(e) => {
                                e.target.style.backgroundColor = 'transparent';
                                e.target.style.color = '#dc3545';
                              }}
                            >
                              <Trash2 size={12} />
                            </button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Image Preview Modal */}
      {showImageModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 2000,
          padding: '20px'
        }}>
          {/* Close button */}
          <button
            onClick={() => setShowImageModal(false)}
            style={{
              position: 'absolute',
              top: '20px',
              right: '35px',
              background: 'none',
              border: 'none',
              color: 'white',
              fontSize: '40px',
              fontWeight: 'bold',
              cursor: 'pointer',
              zIndex: 2001,
              width: '50px',
              height: '50px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '50%',
              transition: 'background-color 0.3s'
            }}
            onMouseOver={(e) => {
              e.target.style.backgroundColor = 'rgba(255, 255, 255, 0.1)';
            }}
            onMouseOut={(e) => {
              e.target.style.backgroundColor = 'transparent';
            }}
            title="Close"
          >
            ×
          </button>

          {/* Modal content */}
          <div style={{
            maxWidth: '90%',
            maxHeight: '90%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            <img
              src={selectedImage.src}
              alt={selectedImage.alt}
              style={{
                maxWidth: '100%',
                maxHeight: '80vh',
                objectFit: 'contain',
                borderRadius: '8px',
                boxShadow: '0 4px 20px rgba(0, 0, 0, 0.5)'
              }}
              onClick={() => setShowImageModal(false)}
            />
            {selectedImage.alt && (
              <div style={{
                color: 'white',
                marginTop: '15px',
                fontSize: '16px',
                textAlign: 'center',
                fontWeight: '500'
              }}>
                {selectedImage.alt}
              </div>
            )}
          </div>

          {/* Background overlay to close modal */}
          <div
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              right: 0,
              bottom: 0,
              zIndex: 1999
            }}
            onClick={() => setShowImageModal(false)}
          />
        </div>
      )}
    </div>
  );
}
