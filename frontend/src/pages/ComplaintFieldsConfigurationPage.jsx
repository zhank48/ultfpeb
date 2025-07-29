import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CButton,
  CTable,
  CTableHead,
  CTableBody,
  CTableRow,
  CTableHeaderCell,
  CTableDataCell,
  CModal,
  CModalHeader,
  CModalTitle,
  CModalBody,
  CModalFooter,
  CForm,
  CFormInput,
  CFormSelect,
  CFormTextarea,
  CFormCheck,
  CBadge,
  CSpinner,
  CAlert,
  CButtonGroup,
  CInputGroup,
  CInputGroupText,
  CTooltip,
  CProgress,
  CListGroup,
  CListGroupItem
} from '@coreui/react';
import { complaintsAPI } from '../utils/api';
import Swal from 'sweetalert2';
import { 
  ArrowLeft, 
  Plus, 
  Save, 
  Trash2, 
  Edit3, 
  Eye, 
  EyeOff, 
  MoveUp, 
  MoveDown,
  Settings,
  CheckCircle2,
  AlertCircle,
  Info,
  HelpCircle
} from 'lucide-react';

const FIELD_TYPES = [
  { value: 'text', label: 'Text Input', icon: '📝' },
  { value: 'textarea', label: 'Text Area', icon: '📄' },
  { value: 'select', label: 'Dropdown', icon: '📋' },
  { value: 'radio', label: 'Radio Button', icon: '🔘' },
  { value: 'checkbox', label: 'Checkbox', icon: '☑️' },
  { value: 'date', label: 'Date', icon: '📅' },
  { value: 'time', label: 'Time', icon: '⏰' },
  { value: 'email', label: 'Email', icon: '📧' },
  { value: 'phone', label: 'Phone', icon: '📞' },
  { value: 'number', label: 'Number', icon: '🔢' },
  { value: 'url', label: 'URL', icon: '🔗' },
  { value: 'file', label: 'File Upload', icon: '📎' }
];

export const ComplaintFieldsConfigurationPage = () => {
  const [fields, setFields] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingField, setEditingField] = useState(null);
  const [formData, setFormData] = useState({
    field_name: '',
    field_label: '',
    field_type: 'text',
    field_options: '',
    is_required: false,
    field_order: 1,
    is_active: true,
    placeholder: '',
    help_text: '',
    validation_rules: ''
  });

  useEffect(() => {
    loadFields();
  }, []);

  const loadFields = async () => {
    try {
      setLoading(true);
      const response = await complaintsAPI.getAllFields();
      
      if (response.success) {
        setFields(response.data);
      }
    } catch (err) {
      console.error('Error loading fields:', err);
      setError('Failed to load fields');
    } finally {
      setLoading(false);
    }
  };

  const handleAddField = () => {
    setEditingField(null);
    setFormData({
      field_name: '',
      field_label: '',
      field_type: 'text',
      field_options: '',
      is_required: false,
      field_order: fields.length + 1,
      is_active: true,
      placeholder: '',
      help_text: '',
      validation_rules: ''
    });
    setShowModal(true);
  };

  const handleEditField = (field) => {
    setEditingField(field);
    setFormData({
      field_name: field.field_name || '',
      field_label: field.field_label || '',
      field_type: field.field_type || 'text',
      field_options: Array.isArray(field.field_options) 
        ? field.field_options.join('\n') 
        : field.field_options || '',
      is_required: field.is_required || false,
      field_order: field.field_order || 1,
      is_active: field.is_active !== undefined ? field.is_active : true,
      placeholder: field.placeholder || '',
      help_text: field.help_text || '',
      validation_rules: field.validation_rules || ''
    });
    setShowModal(true);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      // Process field options
      let processedOptions = formData.field_options;
      if (['select', 'radio', 'checkbox'].includes(formData.field_type) && formData.field_options) {
        processedOptions = formData.field_options
          .split('\n')
          .map(opt => opt.trim())
          .filter(opt => opt.length > 0);
      }

      const payload = {
        ...formData,
        field_options: processedOptions,
        is_required: Boolean(formData.is_required),
        is_active: Boolean(formData.is_active),
        field_order: parseInt(formData.field_order) || 1
      };

      let response;
      if (editingField) {
        response = await complaintsAPI.updateField(editingField.id, payload);
      } else {
        response = await complaintsAPI.createField(payload);
      }

      if (response.success) {
        await Swal.fire({
          icon: 'success',
          title: 'Berhasil!',
          text: `Field ${editingField ? 'diperbarui' : 'ditambahkan'} dengan sukses`,
          timer: 2000,
          showConfirmButton: false
        });
        
        setShowModal(false);
        loadFields();
      }
    } catch (err) {
      console.error('Error saving field:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: err.response?.data?.message || 'Failed to save field'
      });
    }
  };

  const handleDelete = async (field) => {
    const result = await Swal.fire({
      title: 'Hapus Field?',
      text: `Apakah Anda yakin ingin menghapus field "${field.field_label}"?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc3545',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Ya, Hapus!',
      cancelButtonText: 'Batal'
    });

    if (result.isConfirmed) {
      try {
        const response = await complaintsAPI.deleteField(field.id);
        
        if (response.success) {
          await Swal.fire({
            icon: 'success',
            title: 'Terhapus!',
            text: 'Field berhasil dihapus',
            timer: 2000,
            showConfirmButton: false
          });
          
          loadFields();
        }
      } catch (err) {
        console.error('Error deleting field:', err);
        await Swal.fire({
          icon: 'error',
          title: 'Error!',
          text: err.response?.data?.message || 'Failed to delete field'
        });
      }
    }
  };

  const handleToggleActive = async (field) => {
    try {
      const response = await complaintsAPI.toggleFieldStatus(field.id, !field.is_active);

      if (response.success) {
        loadFields();
      }
    } catch (err) {
      console.error('Error toggling field:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to toggle field status'
      });
    }
  };

  const handleReorderFields = async (field, direction) => {
    const currentIndex = fields.findIndex(f => f.id === field.id);
    if (
      (direction === 'up' && currentIndex === 0) || 
      (direction === 'down' && currentIndex === fields.length - 1)
    ) {
      return;
    }

    const newFields = [...fields];
    const targetIndex = direction === 'up' ? currentIndex - 1 : currentIndex + 1;
    
    // Swap positions
    [newFields[currentIndex], newFields[targetIndex]] = [newFields[targetIndex], newFields[currentIndex]];
    
    // Update field_order for both fields
    newFields[currentIndex].field_order = currentIndex + 1;
    newFields[targetIndex].field_order = targetIndex + 1;

    try {
      await Promise.all([
        complaintsAPI.updateFieldOrder(newFields[currentIndex].id, currentIndex + 1),
        complaintsAPI.updateFieldOrder(newFields[targetIndex].id, targetIndex + 1)
      ]);

      setFields(newFields);
    } catch (err) {
      console.error('Error reordering fields:', err);
      await Swal.fire({
        icon: 'error',
        title: 'Error!',
        text: 'Failed to reorder fields'
      });
    }
  };

  const getFieldTypeIcon = (type) => {
    const fieldType = FIELD_TYPES.find(ft => ft.value === type);
    return fieldType ? fieldType.icon : '📝';
  };

  const getFieldTypeLabel = (type) => {
    const fieldType = FIELD_TYPES.find(ft => ft.value === type);
    return fieldType ? fieldType.label : type;
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner size="lg" />
      </div>
    );
  }

  return (
    <div className="complaint-fields-config-page" style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '16px',
        padding: '32px',
        marginBottom: '24px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(50px, -50px)'
        }}></div>
        
        <CRow className="align-items-center">
          <CCol md={8}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <CButton
                color="light"
                variant="ghost" 
                onClick={() => window.history.back()}
                style={{ color: 'white', border: '1px solid rgba(255,255,255,0.3)' }}
              >
                <ArrowLeft size={18} />
              </CButton>
              <div>
                <h1 style={{ margin: 0, fontSize: '28px', fontWeight: '700' }}>
                  <Settings size={32} style={{ marginRight: '12px', verticalAlign: 'middle' }} />
                  Konfigurasi Custom Fields
                </h1>
                <p style={{ margin: '8px 0 0 0', opacity: 0.9, fontSize: '16px' }}>
                  Kelola field kustom untuk form pengaduan dengan berbagai tipe input
                </p>
              </div>
            </div>
            
            {/* Progress Indicator */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginTop: '20px' }}>
              <div style={{ flex: 1 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px' }}>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>Total Fields: {fields.length}</span>
                  <span style={{ fontSize: '14px', opacity: 0.9 }}>
                    Active: {fields.filter(f => f.is_active).length}
                  </span>
                </div>
                <CProgress 
                  value={fields.length > 0 ? (fields.filter(f => f.is_active).length / fields.length) * 100 : 0}
                  color="light"
                  style={{ height: '6px', backgroundColor: 'rgba(255,255,255,0.3)' }}
                />
              </div>
            </div>
          </CCol>
          <CCol md={4} className="text-end">
            <CButton 
              color="light" 
              size="lg"
              onClick={handleAddField}
              style={{
                padding: '12px 24px',
                fontWeight: '600',
                boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                background: 'white',
                color: '#667eea',
                border: 'none'
              }}
            >
              <Plus size={20} style={{ marginRight: '8px' }} />
              Tambah Field Baru
            </CButton>
          </CCol>
        </CRow>
      </div>

      {error && (
        <CAlert color="danger" className="mb-4" style={{ borderRadius: '12px', border: 'none', padding: '16px' }}>
          <AlertCircle size={20} style={{ marginRight: '8px', verticalAlign: 'middle' }} />
          {error}
        </CAlert>
      )}

      {/* Fields Overview Cards */}
      {fields.length > 0 && (
        <CRow className="mb-4">
          <CCol md={3}>
            <CCard style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CCardBody className="text-center">
                <div style={{ fontSize: '32px', color: '#28a745', marginBottom: '8px' }}>
                  <CheckCircle2 size={32} />
                </div>
                <h4 style={{ margin: 0, color: '#28a745' }}>{fields.filter(f => f.is_active).length}</h4>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>Active Fields</p>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={3}>
            <CCard style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CCardBody className="text-center">
                <div style={{ fontSize: '32px', color: '#dc3545', marginBottom: '8px' }}>
                  <AlertCircle size={32} />
                </div>
                <h4 style={{ margin: 0, color: '#dc3545' }}>{fields.filter(f => f.is_required).length}</h4>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>Required Fields</p>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={3}>
            <CCard style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CCardBody className="text-center">
                <div style={{ fontSize: '32px', color: '#6c757d', marginBottom: '8px' }}>
                  <EyeOff size={32} />
                </div>
                <h4 style={{ margin: 0, color: '#6c757d' }}>{fields.filter(f => !f.is_active).length}</h4>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>Inactive Fields</p>
              </CCardBody>
            </CCard>
          </CCol>
          <CCol md={3}>
            <CCard style={{ borderRadius: '12px', border: 'none', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
              <CCardBody className="text-center">
                <div style={{ fontSize: '32px', color: '#007bff', marginBottom: '8px' }}>
                  <Settings size={32} />
                </div>
                <h4 style={{ margin: 0, color: '#007bff' }}>{fields.length}</h4>
                <p style={{ margin: 0, color: '#6c757d', fontSize: '14px' }}>Total Fields</p>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      <CCard style={{ borderRadius: '16px', border: 'none', boxShadow: '0 4px 20px rgba(0,0,0,0.1)' }}>
        <CCardHeader style={{ 
          background: 'linear-gradient(90deg, #f8f9fa 0%, #e9ecef 100%)',
          borderRadius: '16px 16px 0 0',
          border: 'none',
          padding: '20px 24px'
        }}>
          <div className="d-flex justify-content-between align-items-center">
            <div>
              <h5 style={{ margin: 0, fontWeight: '700', color: '#495057' }}>
                📋 Daftar Custom Fields
              </h5>
              <p style={{ margin: '4px 0 0 0', color: '#6c757d', fontSize: '14px' }}>
                Kelola dan atur urutan field yang akan muncul di form pengaduan
              </p>
            </div>
            {fields.length > 0 && (
              <CBadge color="primary" style={{ fontSize: '12px', padding: '8px 12px' }}>
                {fields.filter(f => f.is_active).length} / {fields.length} aktif
              </CBadge>
            )}
          </div>
        </CCardHeader>
        <CCardBody style={{ padding: '0' }}>
          {fields.length === 0 ? (
            <div className="text-center py-5">
              <div style={{ fontSize: '64px', marginBottom: '16px', opacity: 0.3 }}>
                📝
              </div>
              <h5 style={{ color: '#6c757d', marginBottom: '8px' }}>Belum ada custom fields</h5>
              <p style={{ color: '#adb5bd', marginBottom: '24px' }}>
                Tambahkan field kustom untuk memperkaya form pengaduan Anda
              </p>
              <CButton color="primary" onClick={handleAddField}>
                <Plus size={18} style={{ marginRight: '8px' }} />
                Buat Field Pertama
              </CButton>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <CTable hover responsive className="mb-0">
                <CTableHead>
                  <CTableRow style={{ backgroundColor: '#f8f9fa' }}>
                    <CTableHeaderCell style={{ 
                      width: '80px', 
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Urutan
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ 
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Field Information
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ 
                      width: '120px',
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Tipe
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ 
                      width: '100px',
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Required
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ 
                      width: '100px',
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Status
                    </CTableHeaderCell>
                    <CTableHeaderCell style={{ 
                      width: '180px',
                      padding: '16px 20px',
                      fontWeight: '600',
                      color: '#495057',
                      borderBottom: '2px solid #dee2e6'
                    }}>
                      Aksi
                    </CTableHeaderCell>
                  </CTableRow>
                </CTableHead>
              <CTableBody>
                {fields.map((field, index) => (
                  <CTableRow 
                    key={field.id}
                    style={{ 
                      borderBottom: '1px solid #f1f3f4',
                      transition: 'all 0.2s ease',
                      backgroundColor: field.is_active ? 'transparent' : '#f8f9fa'
                    }}
                  >
                    <CTableDataCell style={{ padding: '20px' }}>
                      <div className="d-flex align-items-center gap-2">
                        <div style={{
                          width: '32px',
                          height: '32px',
                          borderRadius: '8px',
                          backgroundColor: field.is_active ? '#007bff' : '#6c757d',
                          color: 'white',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          fontWeight: '600',
                          fontSize: '14px'
                        }}>
                          {field.field_order}
                        </div>
                        <div className="d-flex flex-column gap-1">
                          <CTooltip content="Move Up">
                            <CButton
                              size="sm"
                              color="light"
                              style={{ 
                                width: '24px', 
                                height: '20px', 
                                padding: '0',
                                border: '1px solid #dee2e6',
                                fontSize: '10px'
                              }}
                              onClick={() => handleReorderFields(field, 'up')}
                              disabled={index === 0}
                            >
                              <MoveUp size={12} />
                            </CButton>
                          </CTooltip>
                          <CTooltip content="Move Down">
                            <CButton
                              size="sm"
                              color="light"
                              style={{ 
                                width: '24px', 
                                height: '20px', 
                                padding: '0',
                                border: '1px solid #dee2e6',
                                fontSize: '10px'
                              }}
                              onClick={() => handleReorderFields(field, 'down')}
                              disabled={index === fields.length - 1}
                            >
                              <MoveDown size={12} />
                            </CButton>
                          </CTooltip>
                        </div>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell style={{ padding: '20px' }}>
                      <div>
                        <div style={{ 
                          fontWeight: '600', 
                          fontSize: '16px', 
                          color: field.is_active ? '#212529' : '#6c757d',
                          marginBottom: '4px'
                        }}>
                          {field.field_label}
                        </div>
                        <div style={{ 
                          fontSize: '12px', 
                          color: '#6c757d',
                          fontFamily: 'monospace',
                          backgroundColor: '#f8f9fa',
                          padding: '2px 6px',
                          borderRadius: '4px',
                          display: 'inline-block',
                          marginBottom: '4px'
                        }}>
                          {field.field_name}
                        </div>
                        {field.help_text && (
                          <div style={{ 
                            fontSize: '13px', 
                            color: '#17a2b8',
                            marginTop: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '4px'
                          }}>
                            <HelpCircle size={14} />
                            {field.help_text}
                          </div>
                        )}
                        {field.placeholder && (
                          <div style={{ 
                            fontSize: '12px', 
                            color: '#adb5bd',
                            fontStyle: 'italic',
                            marginTop: '2px'
                          }}>
                            Placeholder: "{field.placeholder}"
                          </div>
                        )}
                      </div>
                    </CTableDataCell>
                    <CTableDataCell style={{ padding: '20px' }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 12px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        border: '1px solid #e9ecef'
                      }}>
                        <span style={{ fontSize: '16px' }}>
                          {getFieldTypeIcon(field.field_type)}
                        </span>
                        <span style={{ 
                          fontSize: '13px', 
                          fontWeight: '500',
                          color: '#495057'
                        }}>
                          {getFieldTypeLabel(field.field_type)}
                        </span>
                      </div>
                    </CTableDataCell>
                    <CTableDataCell style={{ padding: '20px' }}>
                      <CBadge 
                        color={field.is_required ? 'danger' : 'success'}
                        style={{ 
                          padding: '6px 12px',
                          fontSize: '11px',
                          fontWeight: '600',
                          borderRadius: '20px'
                        }}
                      >
                        {field.is_required ? 'Required' : 'Optional'}
                      </CBadge>
                    </CTableDataCell>
                    <CTableDataCell style={{ padding: '20px' }}>
                      <CTooltip content={field.is_active ? 'Click to deactivate' : 'Click to activate'}>
                        <CBadge 
                          color={field.is_active ? 'success' : 'secondary'}
                          style={{ 
                            cursor: 'pointer',
                            padding: '8px 12px',
                            fontSize: '11px',
                            fontWeight: '600',
                            borderRadius: '20px',
                            transition: 'all 0.2s ease'
                          }}
                          onClick={() => handleToggleActive(field)}
                        >
                          {field.is_active ? (
                            <>
                              <Eye size={12} style={{ marginRight: '4px' }} />
                              Aktif
                            </>
                          ) : (
                            <>
                              <EyeOff size={12} style={{ marginRight: '4px' }} />
                              Nonaktif
                            </>
                          )}
                        </CBadge>
                      </CTooltip>
                    </CTableDataCell>
                    <CTableDataCell style={{ padding: '20px' }}>
                      <CButtonGroup size="sm">
                        <CTooltip content="Edit Field">
                          <CButton
                            color="primary"
                            variant="outline"
                            style={{ 
                              borderRadius: '8px 0 0 8px',
                              padding: '8px 12px'
                            }}
                            onClick={() => handleEditField(field)}
                          >
                            <Edit3 size={14} />
                          </CButton>
                        </CTooltip>
                        <CTooltip content="Delete Field">
                          <CButton
                            color="danger"
                            variant="outline"
                            style={{ 
                              borderRadius: '0 8px 8px 0',
                              padding: '8px 12px'
                            }}
                            onClick={() => handleDelete(field)}
                          >
                            <Trash2 size={14} />
                          </CButton>
                        </CTooltip>
                      </CButtonGroup>
                    </CTableDataCell>
                  </CTableRow>
                ))}
              </CTableBody>
            </CTable>
          </div>
          )}
        </CCardBody>
      </CCard>

      {/* Enhanced Field Modal */}
      <CModal
        visible={showModal}
        onClose={() => setShowModal(false)}
        size="lg"
        backdrop="static"
        keyboard={false}
      >
        <CForm onSubmit={handleSubmit}>
          <CModalHeader style={{ 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            color: 'white',
            border: 'none',
            borderRadius: '8px 8px 0 0'
          }}>
            <CModalTitle style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              {editingField ? (
                <>
                  <Edit3 size={24} />
                  Edit Field: {editingField.field_label}
                </>
              ) : (
                <>
                  <Plus size={24} />
                  Tambah Field Baru
                </>
              )}
            </CModalTitle>
          </CModalHeader>
          <CModalBody>
            <CRow className="mb-3">
              <CCol md={6}>
                <CFormInput
                  label="Nama Field (Internal)"
                  placeholder="misal: additional_info"
                  value={formData.field_name}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    field_name: e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, '_')
                  }))}
                  required
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label="Label Field (Tampilan)"
                  placeholder="misal: Informasi Tambahan"
                  value={formData.field_label}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    field_label: e.target.value
                  }))}
                  required
                />
              </CCol>
            </CRow>

            <CRow className="mb-3">
              <CCol md={6}>
                <label className="form-label">Tipe Field</label>
                <CFormSelect
                  value={formData.field_type}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    field_type: e.target.value
                  }))}
                >
                  {FIELD_TYPES.map(type => (
                    <option key={type.value} value={type.value}>
                      {type.icon} {type.label}
                    </option>
                  ))}
                </CFormSelect>
              </CCol>
              <CCol md={3}>
                <CInputGroup>
                  <CInputGroupText>Urutan</CInputGroupText>
                  <CFormInput
                    type="number"
                    min="1"
                    value={formData.field_order}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      field_order: parseInt(e.target.value) || 1
                    }))}
                  />
                </CInputGroup>
              </CCol>
              <CCol md={3}>
                <div className="d-flex flex-column gap-2 mt-2">
                  <CFormCheck
                    label="Required"
                    checked={formData.is_required}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      is_required: e.target.checked
                    }))}
                  />
                  <CFormCheck
                    label="Aktif"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({
                      ...prev,
                      is_active: e.target.checked
                    }))}
                  />
                </div>
              </CCol>
            </CRow>

            {['select', 'radio', 'checkbox'].includes(formData.field_type) && (
              <div className="mb-3">
                <label className="form-label">Opsi (satu per baris)</label>
                <CFormTextarea
                  rows={4}
                  placeholder="Opsi 1&#10;Opsi 2&#10;Opsi 3"
                  value={formData.field_options}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    field_options: e.target.value
                  }))}
                />
              </div>
            )}

            <CRow className="mb-3">
              <CCol md={6}>
                <CFormInput
                  label="Placeholder Text"
                  placeholder="Masukkan placeholder..."
                  value={formData.placeholder}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    placeholder: e.target.value
                  }))}
                />
              </CCol>
              <CCol md={6}>
                <CFormInput
                  label="Help Text"
                  placeholder="Teks bantuan untuk user..."
                  value={formData.help_text}
                  onChange={(e) => setFormData(prev => ({
                    ...prev,
                    help_text: e.target.value
                  }))}
                />
              </CCol>
            </CRow>

            <div className="mb-3">
              <CFormTextarea
                label="Validation Rules (JSON)"
                placeholder='{"minLength": 5, "maxLength": 100}'
                value={formData.validation_rules}
                onChange={(e) => setFormData(prev => ({
                  ...prev,
                  validation_rules: e.target.value
                }))}
                rows={2}
              />
              <div className="form-text">
                Format JSON untuk aturan validasi tambahan
              </div>
            </div>
          </CModalBody>
          <CModalFooter style={{ 
            backgroundColor: '#f8f9fa',
            border: 'none',
            borderRadius: '0 0 8px 8px',
            padding: '20px 24px'
          }}>
            <div className="d-flex justify-content-between align-items-center w-100">
              <div>
                {editingField && (
                  <small style={{ color: '#6c757d' }}>
                    <Info size={14} style={{ marginRight: '4px' }} />
                    Field ID: {editingField.id} | Created: {new Date(editingField.created_at).toLocaleString('id-ID')}
                  </small>
                )}
              </div>
              <div className="d-flex gap-2">
                <CButton 
                  color="secondary"
                  variant="outline"
                  onClick={() => setShowModal(false)}
                  style={{ 
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '500'
                  }}
                >
                  Batal
                </CButton>
                <CButton 
                  color="primary" 
                  type="submit"
                  style={{ 
                    padding: '10px 20px',
                    borderRadius: '8px',
                    fontWeight: '600',
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  <Save size={16} style={{ marginRight: '8px' }} />
                  {editingField ? 'Update Field' : 'Simpan Field'}
                </CButton>
              </div>
            </div>
          </CModalFooter>
        </CForm>
      </CModal>

      <style jsx>{`
        .complaint-fields-config-page {
          padding: 20px;
        }
        
        .reorder-buttons {
          display: flex;
          flex-direction: column;
          gap: 2px;
        }
        
        .reorder-buttons button {
          width: 20px;
          height: 20px;
          padding: 0;
          display: flex;
          align-items: center;
          justify-content: center;
          font-size: 10px;
        }
      `}</style>
    </div>
  );
};

export default ComplaintFieldsConfigurationPage;