import React from 'react';
import { AlertCircle, HelpCircle, CheckCircle2 } from 'lucide-react';

export const DynamicFieldRenderer = ({ field, value, onChange, error, touched }) => {
  const handleChange = (newValue) => {
    onChange(field.field_name, newValue);
  };

  const getFieldStyle = () => {
    const baseStyle = {
      width: '100%',
      padding: '12px 16px',
      border: '2px solid #e5e7eb',
      borderRadius: '12px',
      fontSize: '16px',
      transition: 'all 0.3s ease',
      backgroundColor: 'white',
      boxSizing: 'border-box',
      outline: 'none',
      fontFamily: 'inherit'
    };

    if (error) {
      return {
        ...baseStyle,
        border: '2px solid #ef4444',
        boxShadow: '0 0 0 4px rgba(239, 68, 68, 0.1)'
      };
    }

    if (touched && value) {
      return {
        ...baseStyle,
        border: '2px solid #10b981',
        boxShadow: '0 0 0 4px rgba(16, 185, 129, 0.1)'
      };
    }

    return baseStyle;
  };

  const renderField = () => {
    const fieldStyle = getFieldStyle();
    const commonProps = {
      style: fieldStyle,
      placeholder: field.placeholder || `Masukkan ${field.field_label.toLowerCase()}`,
      required: field.is_required
    };

    switch (field.field_type) {
      case 'text':
      case 'email':
      case 'phone':
      case 'url':
        return (
          <input
            type={field.field_type === 'phone' ? 'tel' : field.field_type}
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'number':
        return (
          <input
            type="number"
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'textarea':
        return (
          <textarea
            {...commonProps}
            rows={4}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
            style={{
              ...fieldStyle,
              minHeight: '120px',
              resize: 'vertical'
            }}
          />
        );

      case 'select':
        return (
          <select
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          >
            <option value="">Pilih {field.field_label}</option>
            {field.field_options && field.field_options.map((option, index) => (
              <option key={index} value={option}>
                {option}
              </option>
            ))}
          </select>
        );

      case 'radio':
        return (
          <div style={{ 
            display: 'grid', 
            gap: '12px', 
            marginTop: '8px' 
          }}>
            {field.field_options && field.field_options.map((option, index) => (
              <label 
                key={index}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '12px',
                  padding: '12px 16px',
                  border: value === option ? '2px solid #3b82f6' : '2px solid #e5e7eb',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  backgroundColor: value === option ? '#dbeafe' : 'white'
                }}
                htmlFor={`${field.field_name}_${index}`}
              >
                <input
                  type="radio"
                  id={`${field.field_name}_${index}`}
                  name={field.field_name}
                  value={option}
                  checked={value === option}
                  onChange={(e) => handleChange(e.target.value)}
                  style={{ 
                    width: '18px', 
                    height: '18px',
                    accentColor: '#3b82f6'
                  }}
                />
                <span style={{ 
                  fontSize: '16px',
                  fontWeight: value === option ? '500' : '400',
                  color: value === option ? '#1d4ed8' : '#374151'
                }}>
                  {option}
                </span>
              </label>
            ))}
          </div>
        );

      case 'checkbox':
        return (
          <div style={{ 
            display: 'grid', 
            gap: '12px', 
            marginTop: '8px' 
          }}>
            {field.field_options && field.field_options.map((option, index) => {
              const currentValues = Array.isArray(value) ? value : [];
              const isChecked = currentValues.includes(option);
              
              return (
                <label 
                  key={index}
                  style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '12px 16px',
                    border: isChecked ? '2px solid #10b981' : '2px solid #e5e7eb',
                    borderRadius: '12px',
                    cursor: 'pointer',
                    transition: 'all 0.3s ease',
                    backgroundColor: isChecked ? '#d1fae5' : 'white'
                  }}
                  htmlFor={`${field.field_name}_${index}`}
                >
                  <input
                    type="checkbox"
                    id={`${field.field_name}_${index}`}
                    value={option}
                    checked={isChecked}
                    onChange={(e) => {
                      const newValues = e.target.checked
                        ? [...currentValues, option]
                        : currentValues.filter(v => v !== option);
                      handleChange(newValues);
                    }}
                    style={{ 
                      width: '18px', 
                      height: '18px',
                      accentColor: '#10b981'
                    }}
                  />
                  <span style={{ 
                    fontSize: '16px',
                    fontWeight: isChecked ? '500' : '400',
                    color: isChecked ? '#065f46' : '#374151'
                  }}>
                    {option}
                  </span>
                </label>
              );
            })}
          </div>
        );

      case 'date':
        return (
          <input
            type="date"
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'time':
        return (
          <input
            type="time"
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );

      case 'file':
        return (
          <div style={{
            border: '2px dashed #d1d5db',
            borderRadius: '12px',
            padding: '24px',
            textAlign: 'center',
            backgroundColor: '#f9fafb',
            transition: 'all 0.3s ease',
            cursor: 'pointer'
          }}>
            <input
              type="file"
              id={`${field.field_name}_file`}
              onChange={(e) => {
                const file = e.target.files[0];
                if (file) {
                  handleChange(file);
                }
              }}
              style={{ display: 'none' }}
            />
            <label 
              htmlFor={`${field.field_name}_file`}
              style={{
                cursor: 'pointer',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                color: '#6b7280'
              }}
            >
              <div style={{ fontSize: '24px' }}>📁</div>
              <div style={{ fontSize: '14px', fontWeight: '500' }}>
                {value ? value.name : 'Klik untuk pilih file'}
              </div>
              {!value && (
                <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                  Format yang didukung sesuai konfigurasi field
                </div>
              )}
            </label>
          </div>
        );

      default:
        return (
          <input
            type="text"
            {...commonProps}
            value={value || ''}
            onChange={(e) => handleChange(e.target.value)}
          />
        );
    }
  };

  return (
    <div style={{ marginBottom: '24px' }}>
      <label style={{
        display: 'block',
        fontSize: '14px',
        fontWeight: '600',
        color: '#374151',
        marginBottom: '8px'
      }}>
        {field.field_label}
        {field.is_required && <span style={{ color: '#ef4444', marginLeft: '4px' }}>*</span>}
        {touched && value && (
          <CheckCircle2 size={16} style={{ 
            color: '#10b981', 
            marginLeft: '8px', 
            verticalAlign: 'middle' 
          }} />
        )}
      </label>
      
      {renderField()}
      
      {field.help_text && (
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '6px',
          marginTop: '6px',
          fontSize: '13px',
          color: '#6b7280'
        }}>
          <HelpCircle size={14} />
          {field.help_text}
        </div>
      )}
      
      {error && (
        <div style={{
          color: '#ef4444',
          fontSize: '14px',
          marginTop: '6px',
          display: 'flex',
          alignItems: 'center',
          gap: '4px'
        }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}
    </div>
  );
};

export default DynamicFieldRenderer;