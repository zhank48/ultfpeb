import { useState } from 'react';
import { Save, X } from 'lucide-react';

export function EditVisitorModal({ visitor, onClose, onSubmit, isSubmitting }) {
  const [formData, setFormData] = useState({
    full_name: visitor?.full_name || '',
    phone_number: visitor?.phone_number || '',
    email: visitor?.email || '',
    institution: visitor?.institution || '',
    purpose: visitor?.purpose || '',
    person_to_meet: visitor?.person_to_meet || '',
    location: visitor?.location || '',
    address: visitor?.address || '',
    edit_reason: ''
  });

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!formData.edit_reason.trim()) {
      alert('Alasan edit harus diisi');
      return;
    }
    onSubmit(formData);
  };

  const inputStyle = {
    width: '100%',
    padding: '12px',
    border: '1px solid #d8dbe0',
    borderRadius: '6px',
    fontSize: '14px',
    outline: 'none',
    transition: 'border-color 0.15s ease-in-out'
  };

  const labelStyle = {
    display: 'block',
    marginBottom: '8px',
    fontSize: '14px',
    fontWeight: '500',
    color: '#495057'
  };

  return (
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
      zIndex: 1001,
      padding: '20px'
    }}>
      <div style={{
        backgroundColor: 'white',
        borderRadius: '8px',
        padding: '24px',
        maxWidth: '600px',
        width: '100%',
        maxHeight: '80vh',
        overflow: 'auto',
        boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          marginBottom: '24px'
        }}>
          <h3 style={{ margin: 0, fontSize: '18px', fontWeight: '600', color: '#495057' }}>
            Edit Data Visitor
          </h3>
          <button
            onClick={onClose}
            style={{
              background: 'none',
              border: 'none',
              cursor: 'pointer',
              padding: '4px',
              color: '#6c757d'
            }}
          >
            <X size={20} />
          </button>
        </div>

        <form onSubmit={handleSubmit}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Nama Lengkap *</label>
              <input
                type="text"
                name="full_name"
                value={formData.full_name}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
            <div>
              <label style={labelStyle}>Nomor Telepon *</label>
              <input
                type="text"
                name="phone_number"
                value={formData.phone_number}
                onChange={handleChange}
                style={inputStyle}
                required
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Email</label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Institusi</label>
              <input
                type="text"
                name="institution"
                value={formData.institution}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            <div>
              <label style={labelStyle}>Tujuan Kunjungan</label>
              <input
                type="text"
                name="purpose"
                value={formData.purpose}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
            <div>
              <label style={labelStyle}>Bertemu Dengan</label>
              <input
                type="text"
                name="person_to_meet"
                value={formData.person_to_meet}
                onChange={handleChange}
                style={inputStyle}
              />
            </div>
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Lokasi/Unit</label>
            <input
              type="text"
              name="location"
              value={formData.location}
              onChange={handleChange}
              style={inputStyle}
            />
          </div>

          <div style={{ marginBottom: '16px' }}>
            <label style={labelStyle}>Alamat</label>
            <textarea
              name="address"
              value={formData.address}
              onChange={handleChange}
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '24px' }}>
            <label style={labelStyle}>Alasan Edit *</label>
            <textarea
              name="edit_reason"
              value={formData.edit_reason}
              onChange={handleChange}
              placeholder="Masukkan alasan mengapa data visitor ini perlu diedit..."
              style={{
                ...inputStyle,
                minHeight: '80px',
                resize: 'vertical'
              }}
              required
            />
          </div>

          <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
            <button
              type="button"
              onClick={onClose}
              disabled={isSubmitting}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                backgroundColor: '#6c757d',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !formData.edit_reason.trim()}
              style={{
                padding: '12px 24px',
                border: 'none',
                borderRadius: '6px',
                fontSize: '14px',
                fontWeight: '500',
                cursor: !formData.edit_reason.trim() ? 'not-allowed' : 'pointer',
                backgroundColor: !formData.edit_reason.trim() ? '#6c757d' : '#198754',
                color: 'white',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
              }}
            >
              <Save size={16} />
              {isSubmitting ? 'Menyimpan...' : 'Simpan Perubahan'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
