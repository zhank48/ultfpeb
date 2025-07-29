import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import { 
  Package, 
  Search, 
  Eye, 
  Edit3, 
  Download,
  Filter,
  Calendar,
  MapPin,
  User,
  CheckCircle,
  Clock,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  FileDown,
  Trash2
} from 'lucide-react';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';

export function LostItemDataPage() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { alert } = useGlobalAlert();
  const [items, setItems] = useState([]);
  const [filteredItems, setFilteredItems] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    filterItems();
  }, [items, searchTerm, statusFilter, categoryFilter]);

  const fetchItems = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');
      console.log('🔑 Token for lost items request:', token ? 'Present' : 'Missing');
      
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/lost-items`, {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log('📊 Lost items API response status:', response.status);

      if (response.ok) {
        const data = await response.json();
        console.log('📊 Lost items API response:', data);
        console.log('📊 Items count:', data.data?.length || 0);
        
        if (data.data && data.data.length > 0) {
          const firstItem = data.data[0];
          console.log('📋 First item structure check:');
          console.log('  - handover_photo_url:', firstItem.handover_photo_url ? 'EXISTS' : 'NULL');
          console.log('  - handover_signature_data:', firstItem.handover_signature_data ? 'EXISTS' : 'NULL');
          console.log('  - return_photo_url:', firstItem.return_photo_url ? 'EXISTS' : 'NULL');
          console.log('  - return_signature_data:', firstItem.return_signature_data ? 'EXISTS' : 'NULL');
        }
        
        setItems(data.data || []);
      } else {
        const errorData = await response.json();
        console.error('❌ Lost items API error:', errorData);
      }
    } catch (error) {
      console.error('❌ Error fetching lost items:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const filterItems = () => {
    let filtered = items;

    if (searchTerm) {
      filtered = filtered.filter(item =>
        item.item_name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.description?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.found_location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        item.finder_name?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(item => item.status === statusFilter);
    }

    if (categoryFilter !== 'all') {
      filtered = filtered.filter(item => item.category === categoryFilter);
    }

    setFilteredItems(filtered);
    setCurrentPage(1);
  };

  const handleExportData = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/lost-items/export`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `lost-items-data-${new Date().toISOString().split('T')[0]}.xlsx`;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);
      } else {
        alert.error('Failed to export data');
      }
    } catch (error) {
      console.error('Error exporting data:', error);
      alert.error('Error exporting data');
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'found': return { bg: '#dcfce7', color: '#166534' };
      case 'returned': return { bg: '#dbeafe', color: '#1e40af' };
      case 'disposed': return { bg: '#fef3c7', color: '#92400e' };
      default: return { bg: '#f3f4f6', color: '#374151' };
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'found': return <Clock size={14} />;
      case 'returned': return <CheckCircle size={14} />;
      case 'disposed': return <AlertCircle size={14} />;
      default: return <Package size={14} />;
    }
  };

  const categories = [
    'Elektronik', 'Dokumen', 'Kunci', 'Dompet/Tas', 'Aksesoris', 
    'Pakaian', 'Kacamata', 'Perhiasan', 'Alat Tulis', 'Lainnya'
  ];

  // Pagination logic
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredItems.slice(indexOfFirstItem, indexOfLastItem);
  const totalPages = Math.ceil(filteredItems.length / itemsPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '20px' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#212529', 
              margin: 0,
              marginBottom: '8px',
              display: 'flex',
              alignItems: 'center',
              gap: '12px'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                width: '40px',
                height: '40px',
                backgroundColor: '#eff6ff',
                borderRadius: '12px'
              }}>
                <Package size={24} style={{ color: '#0d6efd' }} />
              </div>
              Data Barang Hilang
            </h1>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '16px',
              margin: 0
            }}>
              Kelola dan lihat semua data barang hilang yang terdaftar
            </p>
          </div>

          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={handleExportData}
              style={{
                padding: '12px 18px',
                backgroundColor: '#198754',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(25, 135, 84, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#146c43';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(25, 135, 84, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#198754';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(25, 135, 84, 0.3)';
              }}
            >
              <FileDown size={16} />
              Export Data
            </button>

            <button
              onClick={() => navigate('/app/lost-items')}
              style={{
                padding: '12px 18px',
                backgroundColor: '#0d6efd',
                color: 'white',
                border: 'none',
                borderRadius: '10px',
                fontSize: '14px',
                fontWeight: '600',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                boxShadow: '0 2px 4px rgba(13, 110, 253, 0.3)',
                transition: 'all 0.2s ease'
              }}
              onMouseEnter={(e) => {
                e.target.style.backgroundColor = '#0b5ed7';
                e.target.style.transform = 'translateY(-1px)';
                e.target.style.boxShadow = '0 4px 8px rgba(13, 110, 253, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.backgroundColor = '#0d6efd';
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 4px rgba(13, 110, 253, 0.3)';
              }}
            >
              <Package size={16} />
              Daftar Barang Baru
            </button>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '24px',
        marginBottom: '28px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e5e7eb'
      }}>
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '16px' }}>
          {/* Search */}
          <div style={{ position: 'relative' }}>
            <Search 
              size={16} 
              style={{ 
                position: 'absolute', 
                left: '12px', 
                top: '50%', 
                transform: 'translateY(-50%)', 
                color: '#6c757d' 
              }} 
            />
            <input
              type="text"
              placeholder="Cari barang, lokasi, penemu..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px 10px 40px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="all">Semua Status</option>
              <option value="found">Ditemukan</option>
              <option value="returned">Dikembalikan</option>
              <option value="disposed">Dibuang</option>
            </select>
          </div>

          {/* Category Filter */}
          <div>
            <select
              value={categoryFilter}
              onChange={(e) => setCategoryFilter(e.target.value)}
              style={{
                width: '100%',
                padding: '10px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '8px',
                fontSize: '14px'
              }}
            >
              <option value="all">Semua Kategori</option>
              {categories.map(category => (
                <option key={category} value={category}>{category}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Stats */}
        <div style={{ 
          marginTop: '16px', 
          paddingTop: '16px', 
          borderTop: '1px solid #e5e7eb',
          display: 'flex',
          gap: '24px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Clock size={16} style={{ color: '#0d6efd' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{items.filter(item => item.status === 'found').length}</strong> Ditemukan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <CheckCircle size={16} style={{ color: '#198754' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{items.filter(item => item.status === 'returned').length}</strong> Dikembalikan
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <AlertCircle size={16} style={{ color: '#ffc107' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{items.filter(item => item.status === 'disposed').length}</strong> Dibuang
            </span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <Package size={16} style={{ color: '#6c757d' }} />
            <span style={{ fontSize: '14px', color: '#374151' }}>
              <strong>{filteredItems.length}</strong> Total Ditampilkan
            </span>
          </div>
        </div>
      </div>

      {/* Data Table */}
      <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.08)',
        border: '1px solid #e5e7eb',
        overflow: 'hidden'
      }}>
        {isLoading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>
            <Package size={48} style={{ marginBottom: '16px' }} />
            <div>Memuat data barang...</div>
          </div>
        ) : currentItems.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#6c757d' }}>
            <Package size={48} style={{ marginBottom: '16px' }} />
            <div>Tidak ada data barang</div>
          </div>
        ) : (
          <>
            {/* Table Header */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px',
              gap: '12px',
              padding: '18px 24px',
              backgroundColor: '#f8fafc',
              borderBottom: '2px solid #e5e7eb',
              fontSize: '12px',
              fontWeight: '700',
              color: '#4b5563',
              textTransform: 'uppercase',
              letterSpacing: '0.5px'
            }}>
              <div>Detail Barang</div>
              <div>Kategori</div>
              <div>Lokasi Ditemukan</div>
              <div>Tanggal Ditemukan</div>
              <div>Penemu</div>
              <div>Diterima Oleh</div>
              <div>Dikembalikan Oleh</div>
              <div>Status</div>
              <div>Aksi</div>
            </div>

            {/* Table Body */}
            <div>
              {currentItems.map((item, index) => {
                const statusColor = getStatusColor(item.status);
                return (
                  <div 
                    key={item.id}
                    style={{
                      display: 'grid',
                      gridTemplateColumns: '2fr 1fr 1fr 1fr 1fr 1fr 1fr 1fr 100px',
                      gap: '12px',
                      padding: '18px 24px',
                      borderBottom: index < currentItems.length - 1 ? '1px solid #f1f5f9' : 'none',
                      transition: 'all 0.2s ease',
                      backgroundColor: 'white',
                      cursor: 'pointer'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.backgroundColor = '#f8fafc';
                      e.currentTarget.style.transform = 'translateX(2px)';
                      e.currentTarget.style.boxShadow = '0 2px 8px rgba(0, 0, 0, 0.1)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.backgroundColor = 'white';
                      e.currentTarget.style.transform = 'translateX(0)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => navigate(`/app/lost-items/detail/${item.id}`)}
                  >
                    {/* Item Details */}
                    <div>
                      <div style={{ 
                        fontSize: '14px', 
                        fontWeight: '600', 
                        color: '#212529',
                        marginBottom: '4px'
                      }}>
                        {item.item_name || 'Samsung Galaxy S21'}
                      </div>
                      <div style={{ 
                        fontSize: '12px', 
                        color: '#6c757d',
                        lineHeight: '1.4'
                      }}>
                        {item.description?.substring(0, 60) || 'Smartphone Samsung Galaxy S21 warna hitam dengan case...'}
                        {(item.description?.length > 60) && '...'}
                      </div>
                      <div style={{ fontSize: '10px', color: '#9ca3af', marginTop: '2px' }}>
                        ID: #{item.id}
                      </div>
                    </div>

                    {/* Category */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center'
                    }}>
                      {item.category || 'Elektronik'}
                    </div>

                    {/* Found Location */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <MapPin size={12} style={{ color: '#6c757d' }} />
                      {item.found_location || 'Ruang 201, Gedung A'}
                    </div>

                    {/* Found Date */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <Calendar size={12} style={{ color: '#6c757d' }} />
                      {item.found_date ? new Date(item.found_date).toLocaleDateString('id-ID') : '28/06/2025'}
                    </div>

                    {/* Finder */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <User size={12} style={{ color: '#6c757d' }} />
                      {item.finder_name || 'Budi Santoso'}
                    </div>

                    {/* Received By Operator */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <User size={12} style={{ color: '#0d6efd' }} />
                      {item.received_by_operator_name || item.received_by_operator || '-'}
                    </div>

                    {/* Returned By Operator */}
                    <div style={{ 
                      fontSize: '14px', 
                      color: '#374151',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}>
                      <User size={12} style={{ color: '#198754' }} />
                      {item.return_operator_name || item.return_operator || '-'}
                    </div>

                    {/* Status */}
                    <div style={{ display: 'flex', alignItems: 'center' }}>
                      <span style={{
                        padding: '6px 10px',
                        borderRadius: '20px',
                        fontSize: '11px',
                        fontWeight: '700',
                        textTransform: 'uppercase',
                        backgroundColor: statusColor.bg,
                        color: statusColor.color,
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        letterSpacing: '0.3px',
                        border: `1px solid ${statusColor.color}20`
                      }}>
                        {getStatusIcon(item.status)}
                        {item.status}
                      </span>
                    </div>

                    {/* Actions - Combined View/Edit Button */}
                    <div 
                      style={{ 
                        display: 'flex', 
                        gap: '4px',
                        alignItems: 'center'
                      }}
                      onClick={(e) => e.stopPropagation()} // Prevent row click when clicking buttons
                    >
                      <button
                        onClick={() => navigate(`/app/lost-items/detail/${item.id}`)}
                        style={{
                          padding: '6px 8px',
                          backgroundColor: '#0d6efd',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          gap: '4px',
                          fontSize: '12px',
                          fontWeight: '500',
                          transition: 'all 0.2s ease'
                        }}
                        title="Lihat & Edit Detail"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#0056b3'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#0d6efd'}
                      >
                        <Eye size={12} />
                        <Edit3 size={12} />
                      </button>

                      <button
                        onClick={() => {
                          // Download individual report
                          window.open(`${import.meta.env.VITE_API_URL || 'http://localhost:3001/api'}/lost-items/${item.id}/report`, '_blank');
                        }}
                        style={{
                          padding: '6px',
                          backgroundColor: '#198754',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          display: 'flex',
                          alignItems: 'center',
                          justifyContent: 'center',
                          transition: 'all 0.2s ease'
                        }}
                        title="Unduh Laporan"
                        onMouseEnter={(e) => e.target.style.backgroundColor = '#145a32'}
                        onMouseLeave={(e) => e.target.style.backgroundColor = '#198754'}
                      >
                        <Download size={14} />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div style={{
                padding: '16px 20px',
                borderTop: '1px solid #dee2e6',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
              }}>
                <div style={{ fontSize: '14px', color: '#6c757d' }}>
                  Menampilkan {indexOfFirstItem + 1} sampai {Math.min(indexOfLastItem, filteredItems.length)} dari {filteredItems.length} data
                </div>
                
                <div style={{ display: 'flex', gap: '4px' }}>
                  <button
                    onClick={() => paginate(currentPage - 1)}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === 1 ? '#f8f9fa' : 'white',
                      color: currentPage === 1 ? '#6c757d' : '#374151',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    <ChevronLeft size={14} />
                    Sebelumnya
                  </button>

                  {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                    const page = i + 1;
                    return (
                      <button
                        key={page}
                        onClick={() => paginate(page)}
                        style={{
                          padding: '8px 12px',
                          backgroundColor: currentPage === page ? '#0d6efd' : 'white',
                          color: currentPage === page ? 'white' : '#374151',
                          border: '1px solid #dee2e6',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontWeight: currentPage === page ? '600' : 'normal'
                        }}
                      >
                        {page}
                      </button>
                    );
                  })}

                  <button
                    onClick={() => paginate(currentPage + 1)}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 12px',
                      backgroundColor: currentPage === totalPages ? '#f8f9fa' : 'white',
                      color: currentPage === totalPages ? '#6c757d' : '#374151',
                      border: '1px solid #dee2e6',
                      borderRadius: '6px',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      display: 'flex',
                      alignItems: 'center',
                      gap: '4px'
                    }}
                  >
                    Selanjutnya
                    <ChevronRight size={14} />
                  </button>
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
}
