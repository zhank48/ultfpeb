import { useState, useEffect } from 'react';
import { 
  Plus, 
  Edit2, 
  Trash2, 
  Save, 
  X, 
  ChevronDown, 
  ChevronRight,
  TreePine,
  Target,
  Users,
  Building,
  Search,
  Filter,
  Download,
  Upload,
  Settings,
  Info
} from 'lucide-react';
import { configurationsAPI } from '../utils/api.js';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

export function ConfigurationManagementPage() {
  const { confirm } = useGlobalAlert();
  const [activeCategory, setActiveCategory] = useState('purposes');
  const [configurations, setConfigurations] = useState({
    purposes: [],
    units: [],
    person_to_meet: []
  });
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState({
    category: 'purposes',
    type: 'group', // 'group' or 'option'
    name: '',
    description: '',
    value: '',
    group_id: '',
    parent_id: null,
    order_index: 0
  });
  const [searchTerm, setSearchTerm] = useState('');
  const [expandedGroups, setExpandedGroups] = useState(new Set());

  useEffect(() => {
    fetchConfigurations();
  }, []);

  const fetchConfigurations = async () => {
    try {
      setLoading(true);
      
      // Fetch all configurations from API
      const response = await configurationsAPI.getAll();
      
      if (response.data.success) {
        // Transform the data to match the expected format
        const apiData = response.data.data;
        
        // Convert flat arrays to grouped format
        const transformedData = {
          purposes: [{
            id: 1,
            name: 'Visit Purposes',
            description: 'Available purposes for visits',
            options: apiData.purposes.map(item => ({
              id: item.id,
              name: item.name,
              value: item.value || item.name.toLowerCase().replace(/\s+/g, '_'),
              parent_id: null,
              order_index: item.sort_order || 0
            }))
          }],
          units: [{
            id: 2,
            name: 'Units/Departments',
            description: 'Available units and departments',
            options: apiData.units.map(item => ({
              id: item.id,
              name: item.name,
              value: item.value || item.name.toLowerCase().replace(/\s+/g, '_'),
              parent_id: null,
              order_index: item.sort_order || 0
            }))
          }],
          person_to_meet: [{
            id: 3,
            name: 'Person to Meet',
            description: 'Available persons to meet',
            options: apiData.personToMeet.map(item => ({
              id: item.id,
              name: item.name,
              value: item.value || item.name.toLowerCase().replace(/\s+/g, '_'),
              parent_id: null,
              order_index: item.sort_order || 0
            }))
          }]
        };
        
        setConfigurations(transformedData);
        
        // Auto-expand all groups
        const allGroupIds = new Set([1, 2, 3]);
        setExpandedGroups(allGroupIds);
      } else {
        console.error('Failed to fetch configurations:', response.data.message);
        // Fallback to empty configurations
        setConfigurations({
          purposes: [],
          units: [],
          person_to_meet: []
        });
      }
      
    } catch (error) {
      console.error('Error fetching configurations:', error);
      // Fallback to empty configurations
      setConfigurations({
        purposes: [],
        units: [],
        person_to_meet: []
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    try {
      // Saving configuration
      
      if (editing && editing.type === 'option') {
        // Update existing option - keep original sort_order
        await configurationsAPI.updateOption(editing.data.id, {
          name: formData.name,
          value: formData.value || formData.name.toLowerCase().replace(/\s+/g, '_'),
          sort_order: editing.data.sort_order || 0  // Keep original sort order when editing
        });
      } else {
        // Create new option - let backend automatically set sort_order
        await configurationsAPI.addOption({
          category: activeCategory,
          name: formData.name,
          value: formData.value || formData.name.toLowerCase().replace(/\s+/g, '_')
          // sort_order will be automatically set by the backend
        });
      }
      
      // Reset form
      setFormData({
        category: activeCategory,
        type: 'group',
        name: '',
        description: '',
        value: '',
        group_id: '',
        parent_id: null,
        order_index: 0
      });
      setShowForm(false);
      setEditing(null);
      
      // Refresh data
      await fetchConfigurations();
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const handleDelete = async (id, type) => {
    const confirmed = await confirm('Are you sure you want to delete this item?', {
      title: 'Delete Configuration',
      type: 'danger',
      confirmText: 'Delete',
      confirmColor: 'danger'
    });
    
    if (!confirmed) return;
    
    try {
      // Deleting item
      
      if (type === 'option') {
        await configurationsAPI.deleteOption(id);
      }
      
      await fetchConfigurations();
    } catch (error) {
      console.error('Error deleting configuration:', error);
    }
  };

  const toggleGroup = (groupId) => {
    const newExpanded = new Set(expandedGroups);
    if (newExpanded.has(groupId)) {
      newExpanded.delete(groupId);
    } else {
      newExpanded.add(groupId);
    }
    setExpandedGroups(newExpanded);
  };

  const getFilteredGroups = () => {
    const categoryGroups = configurations[activeCategory] || [];
    if (!searchTerm) return categoryGroups;
    
    return categoryGroups.filter(group => 
      group.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      group.options?.some(option => 
        option.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        option.value.toLowerCase().includes(searchTerm.toLowerCase())
      )
    );
  };

  // Styles
  const cardStyle = {
    backgroundColor: 'white',
    borderRadius: '12px',
    boxShadow: '0 0 0 1px rgba(0, 0, 0, 0.05), 0 2px 8px rgba(0, 0, 0, 0.08)',
    marginBottom: '24px'
  };

  const cardHeaderStyle = {
    padding: '20px 24px',
    borderBottom: '1px solid #e9ecef',
    backgroundColor: '#f8f9fa'
  };

  const buttonStyle = {
    padding: '8px 16px',
    border: '1px solid #dee2e6',
    borderRadius: '6px',
    backgroundColor: 'white',
    color: '#495057',
    fontSize: '14px',
    fontWeight: '500',
    cursor: 'pointer',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    transition: 'all 0.2s ease'
  };

  const primaryButtonStyle = {
    ...buttonStyle,
    backgroundColor: '#0d6efd',
    color: 'white',
    border: '1px solid #0d6efd'
  };

  const categories = [
    { id: 'purposes', label: 'Purposes of Visit', icon: Target, description: 'Manage visit purposes and categories' },
    { id: 'units', label: 'Units to Visit', icon: Building, description: 'Manage organizational units and departments' },
    { id: 'person_to_meet', label: 'Persons to Meet', icon: Users, description: 'Manage staff and personnel directory' }
  ];

  if (loading) {
    return (
      <div style={{ padding: '40px', textAlign: 'center' }}>
        <div style={{
          width: '40px',
          height: '40px',
          border: '4px solid #f3f3f3',
          borderTop: '4px solid #0d6efd',
          borderRadius: '50%',
          animation: 'spin 1s linear infinite',
          margin: '0 auto 16px'
        }}></div>
        <p style={{ color: '#6c757d' }}>Loading configurations...</p>
      </div>
    );
  }

  return (
    <div style={{ padding: '0' }}>
      {/* Header */}
      <div style={cardHeaderStyle}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
              width: '40px',
              height: '40px',
              backgroundColor: '#e3f2fd',
              borderRadius: '10px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <TreePine size={20} style={{ color: '#0d6efd' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: '#495057'
              }}>
                Check-in Configuration
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6c757d',
                margin: '0'
              }}>
                Manage dynamic categories for visitor check-in process
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowForm(true)}
              style={primaryButtonStyle}
            >
              <Plus size={16} />
              Add New
            </button>
          </div>
        </div>
      </div>

      {/* Category Navigation */}
      <div style={{ padding: '24px 24px 0 24px' }}>
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          gap: '16px',
          marginBottom: '24px'
        }}>
          {categories.map((category) => {
            const IconComponent = category.icon;
            const isActive = activeCategory === category.id;
            const categoryData = configurations[category.id] || [];
            const totalOptions = categoryData.reduce((sum, group) => sum + (group.options?.length || 0), 0);
            
            return (
              <div
                key={category.id}
                onClick={() => setActiveCategory(category.id)}
                style={{
                  padding: '20px',
                  backgroundColor: isActive ? '#e3f2fd' : 'white',
                  border: isActive ? '2px solid #0d6efd' : '1px solid #e9ecef',
                  borderRadius: '12px',
                  cursor: 'pointer',
                  transition: 'all 0.3s ease',
                  transform: isActive ? 'translateY(-2px)' : 'none',
                  boxShadow: isActive ? '0 4px 12px rgba(13, 110, 253, 0.15)' : '0 1px 3px rgba(0, 0, 0, 0.1)'
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <IconComponent size={24} style={{ color: isActive ? '#0d6efd' : '#6c757d' }} />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <span style={{
                      backgroundColor: '#198754',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {categoryData.length} groups
                    </span>
                    <span style={{
                      backgroundColor: '#0d6efd',
                      color: 'white',
                      fontSize: '11px',
                      fontWeight: '600',
                      padding: '2px 6px',
                      borderRadius: '10px'
                    }}>
                      {totalOptions} options
                    </span>
                  </div>
                </div>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0 0 8px 0',
                  color: isActive ? '#0d6efd' : '#495057'
                }}>
                  {category.label}
                </h3>
                <p style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  margin: '0',
                  lineHeight: '1.4'
                }}>
                  {category.description}
                </p>
              </div>
            );
          })}
        </div>

        {/* Search and Filter Bar */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '12px',
          marginBottom: '24px',
          padding: '16px',
          backgroundColor: '#f8f9fa',
          borderRadius: '8px'
        }}>
          <div style={{ position: 'relative', flex: 1 }}>
            <Search size={16} style={{
              position: 'absolute',
              left: '12px',
              top: '50%',
              transform: 'translateY(-50%)',
              color: '#6c757d'
            }} />
            <input
              type="text"
              placeholder={`Search ${categories.find(c => c.id === activeCategory)?.label}...`}
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #dee2e6',
                borderRadius: '6px',
                fontSize: '14px',
                outline: 'none',
                backgroundColor: 'white'
              }}
            />
          </div>
          <button style={buttonStyle}>
            <Filter size={16} />
            Filter
          </button>
          <button style={buttonStyle}>
            <Download size={16} />
            Export
          </button>
          <button style={buttonStyle}>
            <Upload size={16} />
            Import
          </button>
        </div>
      </div>

      {/* Configuration List */}
      <div style={{ padding: '0 24px 24px 24px' }}>
        {getFilteredGroups().map((group) => (
          <div key={group.id} style={{
            border: '1px solid #e9ecef',
            borderRadius: '8px',
            marginBottom: '16px',
            backgroundColor: 'white'
          }}>
            {/* Group Header */}
            <div
              onClick={() => toggleGroup(group.id)}
              style={{
                padding: '16px 20px',
                backgroundColor: '#f8f9fa',
                borderBottom: expandedGroups.has(group.id) ? '1px solid #e9ecef' : 'none',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                borderRadius: expandedGroups.has(group.id) ? '8px 8px 0 0' : '8px'
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {expandedGroups.has(group.id) ? 
                  <ChevronDown size={16} style={{ color: '#6c757d' }} /> : 
                  <ChevronRight size={16} style={{ color: '#6c757d' }} />
                }
                <div>
                  <h4 style={{
                    fontSize: '16px',
                    fontWeight: '600',
                    margin: '0 0 4px 0',
                    color: '#495057'
                  }}>
                    {group.name}
                  </h4>
                  {group.description && (
                    <p style={{
                      fontSize: '14px',
                      color: '#6c757d',
                      margin: '0'
                    }}>
                      {group.description}
                    </p>
                  )}
                </div>
              </div>
              
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <span style={{
                  backgroundColor: '#0d6efd',
                  color: 'white',
                  fontSize: '12px',
                  fontWeight: '600',
                  padding: '4px 8px',
                  borderRadius: '12px'
                }}>
                  {group.options?.length || 0} options
                </span>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    setEditing({ type: 'group', data: group });
                    setFormData({
                      ...formData,
                      type: 'group',
                      name: group.name,
                      description: group.description
                    });
                    setShowForm(true);
                  }}
                  style={{
                    padding: '6px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: '#6c757d',
                    cursor: 'pointer'
                  }}
                >
                  <Edit2 size={14} />
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDelete(group.id, 'group');
                  }}
                  style={{
                    padding: '6px',
                    border: 'none',
                    borderRadius: '4px',
                    backgroundColor: 'transparent',
                    color: '#dc3545',
                    cursor: 'pointer'
                  }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>

            {/* Group Options */}
            {expandedGroups.has(group.id) && (
              <div style={{ padding: '16px 20px' }}>
                {group.options && group.options.length > 0 ? (
                  <div style={{ display: 'grid', gap: '8px' }}>
                    {group.options.map((option) => (
                      <div
                        key={option.id}
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'space-between',
                          padding: '12px 16px',
                          backgroundColor: option.value === 'lainnya' ? '#fff3cd' : '#f8f9fa',
                          border: '1px solid #e9ecef',
                          borderRadius: '6px'
                        }}
                      >
                        <div>
                          <div style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#495057',
                            marginBottom: '2px'
                          }}>
                            {option.name}
                          </div>
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d'
                          }}>
                            Value: {option.value}
                          </div>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '4px' }}>
                          {option.value === 'lainnya' && (
                            <div style={{
                              fontSize: '10px',
                              backgroundColor: '#856404',
                              color: 'white',
                              padding: '2px 6px',
                              borderRadius: '10px',
                              fontWeight: '600'
                            }}>
                              DYNAMIC
                            </div>
                          )}
                          <button
                            onClick={() => {
                              setEditing({ type: 'option', data: option });
                              setFormData({
                                ...formData,
                                type: 'option',
                                name: option.name,
                                value: option.value,
                                group_id: group.id,
                                order_index: option.order_index
                              });
                              setShowForm(true);
                            }}
                            style={{
                              padding: '4px',
                              border: 'none',
                              borderRadius: '3px',
                              backgroundColor: 'transparent',
                              color: '#6c757d',
                              cursor: 'pointer'
                            }}
                          >
                            <Edit2 size={12} />
                          </button>
                          <button
                            onClick={() => handleDelete(option.id, 'option')}
                            style={{
                              padding: '4px',
                              border: 'none',
                              borderRadius: '3px',
                              backgroundColor: 'transparent',
                              color: '#dc3545',
                              cursor: 'pointer'
                            }}
                          >
                            <Trash2 size={12} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div style={{
                    textAlign: 'center',
                    padding: '24px',
                    color: '#6c757d',
                    fontSize: '14px'
                  }}>
                    <Info size={24} style={{ marginBottom: '8px' }} />
                    <p>No options configured for this group</p>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          type: 'option',
                          group_id: group.id
                        });
                        setShowForm(true);
                      }}
                      style={{
                        ...primaryButtonStyle,
                        fontSize: '12px',
                        padding: '6px 12px'
                      }}
                    >
                      <Plus size={14} />
                      Add First Option
                    </button>
                  </div>
                )}
                
                {/* Add Option Button */}
                {group.options && group.options.length > 0 && (
                  <div style={{ marginTop: '12px', textAlign: 'center' }}>
                    <button
                      onClick={() => {
                        setFormData({
                          ...formData,
                          type: 'option',
                          group_id: group.id
                        });
                        setShowForm(true);
                      }}
                      style={{
                        ...buttonStyle,
                        fontSize: '12px',
                        padding: '6px 12px'
                      }}
                    >
                      <Plus size={14} />
                      Add Option
                    </button>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}

        {getFilteredGroups().length === 0 && (
          <div style={{
            textAlign: 'center',
            padding: '40px',
            color: '#6c757d'
          }}>
            <TreePine size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
            <h3 style={{ margin: '0 0 8px 0' }}>No configurations found</h3>
            <p style={{ margin: '0 0 16px 0' }}>
              {searchTerm ? 'Try adjusting your search terms' : 'Start by creating your first configuration group'}
            </p>
            {!searchTerm && (
              <button
                onClick={() => setShowForm(true)}
                style={primaryButtonStyle}
              >
                <Plus size={16} />
                Create First Group
              </button>
            )}
          </div>
        )}
      </div>

      {/* Form Modal */}
      {showForm && (
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
          zIndex: 1000,
          padding: '20px'
        }}>
          <div style={{
            backgroundColor: 'white',
            borderRadius: '12px',
            width: '100%',
            maxWidth: '500px',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '24px',
              borderBottom: '1px solid #e9ecef',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between'
            }}>
              <h3 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '0',
                color: '#495057'
              }}>
                {editing ? 'Edit' : 'Add'} {formData.type === 'group' ? 'Group' : 'Option'}
              </h3>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                  setFormData({
                    category: activeCategory,
                    type: 'group',
                    name: '',
                    description: '',
                    value: '',
                    group_id: '',
                    parent_id: null,
                    order_index: 0
                  });
                }}
                style={{
                  padding: '8px',
                  border: 'none',
                  borderRadius: '6px',
                  backgroundColor: 'transparent',
                  color: '#6c757d',
                  cursor: 'pointer'
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Content */}
            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              <div style={{ display: 'grid', gap: '16px' }}>
                {/* Type Selection */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Type
                  </label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  >
                    <option value="group">Group</option>
                    <option value="option">Option</option>
                  </select>
                </div>

                {/* Category Selection */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Category
                  </label>
                  <select
                    value={formData.category}
                    onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  >
                    {categories.map(cat => (
                      <option key={cat.id} value={cat.id}>{cat.label}</option>
                    ))}
                  </select>
                </div>

                {/* Group Selection (for options) */}
                {formData.type === 'option' && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      marginBottom: '8px'
                    }}>
                      Group
                    </label>
                    <select
                      value={formData.group_id}
                      onChange={(e) => setFormData({ ...formData, group_id: e.target.value })}
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    >
                      <option value="">Select a group...</option>
                      {(configurations[formData.category] || []).map(group => (
                        <option key={group.id} value={group.id}>{group.name}</option>
                      ))}
                    </select>
                  </div>
                )}

                {/* Name */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Name *
                  </label>
                  <input
                    type="text"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    placeholder={`Enter ${formData.type} name`}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none'
                    }}
                  />
                </div>

                {/* Value (for options) */}
                {formData.type === 'option' && (
                  <div>
                    <label style={{
                      display: 'block',
                      fontSize: '14px',
                      fontWeight: '600',
                      color: '#495057',
                      marginBottom: '8px'
                    }}>
                      Value *
                    </label>
                    <input
                      type="text"
                      value={formData.value}
                      onChange={(e) => setFormData({ ...formData, value: e.target.value })}
                      placeholder="Enter option value (e.g., student_consultation)"
                      style={{
                        width: '100%',
                        padding: '10px 12px',
                        border: '1px solid #dee2e6',
                        borderRadius: '6px',
                        fontSize: '14px',
                        outline: 'none'
                      }}
                    />
                  </div>
                )}

                {/* Description */}
                <div>
                  <label style={{
                    display: 'block',
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '8px'
                  }}>
                    Description
                  </label>
                  <textarea
                    value={formData.description}
                    onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                    placeholder={`Enter ${formData.type} description`}
                    rows={3}
                    style={{
                      width: '100%',
                      padding: '10px 12px',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      fontSize: '14px',
                      outline: 'none',
                      resize: 'vertical'
                    }}
                  />
                </div>
              </div>
            </div>

            {/* Modal Footer */}
            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => {
                  setShowForm(false);
                  setEditing(null);
                }}
                style={buttonStyle}
              >
                Cancel
              </button>
              <button
                onClick={handleSave}
                style={primaryButtonStyle}
                disabled={!formData.name || (formData.type === 'option' && (!formData.value || !formData.group_id))}
              >
                <Save size={16} />
                {editing ? 'Update' : 'Create'}
              </button>
            </div>
          </div>
        </div>
      )}

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
