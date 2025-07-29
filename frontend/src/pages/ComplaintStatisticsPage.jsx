import React, { useState, useEffect } from 'react';
import {
  CCard,
  CCardBody,
  CCardHeader,
  CRow,
  CCol,
  CSpinner,
  CAlert,
  CDropdown,
  CDropdownToggle,
  CDropdownMenu,
  CDropdownItem,
  CBadge,
  CButton,
  CButtonGroup,
  CProgress
} from '@coreui/react';
import { 
  BarChart, 
  Bar, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  Legend, 
  PieChart, 
  Pie, 
  Cell,
  LineChart,
  Line,
  ResponsiveContainer,
  Area,
  AreaChart
} from 'recharts';
import { complaintsAPI } from '../utils/api';
import { 
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Activity,
  Users,
  Clock,
  Target,
  Calendar,
  Download,
  Filter,
  RefreshCw,
  BarChart3,
  PieChart as PieIcon,
  LineChart as LineIcon,
  AlertCircle
} from 'lucide-react';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

const StatCard = ({ title, value, subtitle, color = '#0088FE', icon, trend, trendValue }) => (
  <CCard 
    className="h-100" 
    style={{ 
      border: 'none',
      borderRadius: '16px',
      boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
      background: `linear-gradient(135deg, ${color}15 0%, ${color}25 100%)`,
      position: 'relative',
      overflow: 'hidden',
      transition: 'transform 0.2s ease, box-shadow 0.2s ease'
    }}
    onMouseOver={(e) => {
      e.currentTarget.style.transform = 'translateY(-4px)';
      e.currentTarget.style.boxShadow = '0 8px 30px rgba(0,0,0,0.12)';
    }}
    onMouseOut={(e) => {
      e.currentTarget.style.transform = 'translateY(0)';
      e.currentTarget.style.boxShadow = '0 4px 20px rgba(0,0,0,0.08)';
    }}
  >
    <div 
      style={{
        position: 'absolute',
        top: 0,
        right: 0,
        width: '80px',
        height: '80px',
        background: `${color}20`,
        borderRadius: '50%',
        transform: 'translate(20px, -20px)'
      }}
    />
    <CCardBody style={{ padding: '24px', position: 'relative', zIndex: 1 }}>
      <div className="d-flex justify-content-between align-items-start">
        <div style={{ flex: 1 }}>
          <div style={{ 
            fontSize: '14px', 
            fontWeight: '500',
            color: '#6c757d',
            marginBottom: '8px',
            textTransform: 'uppercase',
            letterSpacing: '0.5px'
          }}>
            {title}
          </div>
          <div style={{ 
            fontSize: '32px', 
            fontWeight: '700', 
            color: color,
            marginBottom: '4px',
            lineHeight: 1
          }}>
            {value}
          </div>
          {subtitle && (
            <div style={{ 
              fontSize: '13px', 
              color: '#6c757d',
              marginBottom: '8px'
            }}>
              {subtitle}
            </div>
          )}
          {trend !== undefined && (
            <div className="d-flex align-items-center gap-1">
              {trend === 'up' ? (
                <TrendingUp size={14} style={{ color: '#28a745' }} />
              ) : trend === 'down' ? (
                <TrendingDown size={14} style={{ color: '#dc3545' }} />
              ) : (
                <Activity size={14} style={{ color: '#6c757d' }} />
              )}
              <span style={{ 
                fontSize: '12px', 
                fontWeight: '600',
                color: trend === 'up' ? '#28a745' : trend === 'down' ? '#dc3545' : '#6c757d'
              }}>
                {trendValue || '0%'}
              </span>
            </div>
          )}
        </div>
        {icon && (
          <div style={{ 
            width: '48px',
            height: '48px',
            borderRadius: '12px',
            backgroundColor: `${color}20`,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            color: color
          }}>
            {typeof icon === 'string' ? (
              <span style={{ fontSize: '24px' }}>{icon}</span>
            ) : (
              React.cloneElement(icon, { size: 24 })
            )}
          </div>
        )}
      </div>
    </CCardBody>
  </CCard>
);

export const ComplaintStatisticsPage = () => {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [stats, setStats] = useState({});
  const [complaints, setComplaints] = useState([]);
  const [dateRange, setDateRange] = useState('7d');
  const [chartType, setChartType] = useState('bar');

  useEffect(() => {
    loadStatistics();
  }, [dateRange]);

  const loadStatistics = async () => {
    try {
      setLoading(true);
      const [statsResponse, complaintsResponse] = await Promise.all([
        complaintsAPI.getStats(),
        complaintsAPI.getAll()
      ]);

      if (statsResponse.success) {
        setStats(statsResponse.data);
      }

      if (complaintsResponse.success) {
        const complaintsData = complaintsResponse.data;
        setComplaints(complaintsData);
        
        // Process additional statistics
        processDetailedStats(complaintsData);
      }
    } catch (err) {
      console.error('Error loading statistics:', err);
      setError('Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  const processDetailedStats = (complaintsData) => {
    const now = new Date();
    const ranges = {
      '7d': 7,
      '30d': 30,
      '90d': 90,
      '1y': 365
    };

    const daysBack = ranges[dateRange] || 7;
    const startDate = new Date(now.getTime() - (daysBack * 24 * 60 * 60 * 1000));

    const filteredComplaints = complaintsData.filter(complaint => 
      new Date(complaint.created_at) >= startDate
    );

    // Daily trend data
    const dailyData = {};
    for (let i = 0; i < daysBack; i++) {
      const date = new Date(now.getTime() - (i * 24 * 60 * 60 * 1000));
      const dateKey = date.toISOString().split('T')[0];
      dailyData[dateKey] = { date: dateKey, count: 0, resolved: 0 };
    }

    filteredComplaints.forEach(complaint => {
      const dateKey = complaint.created_at.split('T')[0];
      if (dailyData[dateKey]) {
        dailyData[dateKey].count++;
        if (complaint.status === 'resolved' || complaint.status === 'closed') {
          dailyData[dateKey].resolved++;
        }
      }
    });

    setStats(prev => ({
      ...prev,
      dailyTrend: Object.values(dailyData).reverse(),
      filteredCount: filteredComplaints.length,
      avgResponseTime: calculateAvgResponseTime(filteredComplaints),
      categoryStats: getCategoryStats(filteredComplaints),
      priorityStats: getPriorityStats(filteredComplaints),
      statusStats: getStatusStats(filteredComplaints)
    }));
  };

  const calculateAvgResponseTime = (complaints) => {
    const resolvedComplaints = complaints.filter(c => 
      c.resolved_at && (c.status === 'resolved' || c.status === 'closed')
    );

    if (resolvedComplaints.length === 0) return 0;

    const totalTime = resolvedComplaints.reduce((sum, complaint) => {
      const created = new Date(complaint.created_at);
      const resolved = new Date(complaint.resolved_at);
      return sum + (resolved - created);
    }, 0);

    return Math.round(totalTime / resolvedComplaints.length / (1000 * 60 * 60)); // in hours
  };

  const getCategoryStats = (complaints) => {
    const stats = {};
    complaints.forEach(complaint => {
      const category = complaint.category_name || 'Uncategorized';
      stats[category] = (stats[category] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const getPriorityStats = (complaints) => {
    const stats = { low: 0, medium: 0, high: 0, urgent: 0 };
    complaints.forEach(complaint => {
      stats[complaint.priority] = (stats[complaint.priority] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const getStatusStats = (complaints) => {
    const stats = { open: 0, in_progress: 0, resolved: 0, closed: 0 };
    complaints.forEach(complaint => {
      stats[complaint.status] = (stats[complaint.status] || 0) + 1;
    });
    return Object.entries(stats).map(([name, value]) => ({ name, value }));
  };

  const getPriorityColor = (priority) => {
    const colors = {
      low: '#28a745',
      medium: '#ffc107',
      high: '#fd7e14',
      urgent: '#dc3545'
    };
    return colors[priority] || '#6c757d';
  };

  const getStatusColor = (status) => {
    const colors = {
      open: '#007bff',
      in_progress: '#ffc107',
      resolved: '#28a745',
      closed: '#6c757d'
    };
    return colors[status] || '#6c757d';
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center" style={{ height: '400px' }}>
        <CSpinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <CAlert color="danger">{error}</CAlert>;
  }

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: '100vh' }}>
      {/* Enhanced Header Section */}
      <div style={{
        background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
        borderRadius: '20px',
        padding: '32px',
        marginBottom: '32px',
        color: 'white',
        position: 'relative',
        overflow: 'hidden'
      }}>
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: '300px',
          height: '300px',
          background: 'rgba(255,255,255,0.1)',
          borderRadius: '50%',
          transform: 'translate(100px, -100px)'
        }}></div>
        <div style={{
          position: 'absolute',
          bottom: 0,
          left: 0,
          width: '200px',
          height: '200px',
          background: 'rgba(255,255,255,0.05)',
          borderRadius: '50%',
          transform: 'translate(-50px, 50px)'
        }}></div>
        
        <CRow className="align-items-center" style={{ position: 'relative', zIndex: 1 }}>
          <CCol md={8}>
            <div className="d-flex align-items-center gap-3 mb-3">
              <CButton
                color="light"
                variant="ghost" 
                onClick={() => window.history.back()}
                style={{ 
                  color: 'white', 
                  border: '1px solid rgba(255,255,255,0.3)',
                  padding: '10px 12px',
                  borderRadius: '12px'
                }}
              >
                <ArrowLeft size={18} />
              </CButton>
              <div>
                <h1 style={{ 
                  margin: 0, 
                  fontSize: '32px', 
                  fontWeight: '700',
                  textShadow: '0 2px 10px rgba(0,0,0,0.1)'
                }}>
                  📊 Dashboard Statistik Aduan
                </h1>
                <p style={{ 
                  margin: '8px 0 0 0', 
                  opacity: 0.9, 
                  fontSize: '16px',
                  fontWeight: '400'
                }}>
                  Pantau kinerja dan tren pengaduan secara real-time
                </p>
              </div>
            </div>
            
            {/* Quick Stats */}
            <div style={{ marginTop: '24px' }}>
              <div className="d-flex align-items-center gap-4">
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>
                    {stats.total || 0}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Total Aduan</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>
                    {stats.open || 0}
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Terbuka</div>
                </div>
                <div style={{ width: '1px', height: '40px', backgroundColor: 'rgba(255,255,255,0.3)' }}></div>
                <div>
                  <div style={{ fontSize: '24px', fontWeight: '700' }}>
                    {Math.round(((stats.resolved || 0) + (stats.closed || 0)) / (stats.total || 1) * 100)}%
                  </div>
                  <div style={{ fontSize: '12px', opacity: 0.8 }}>Tingkat Resolusi</div>
                </div>
              </div>
            </div>
          </CCol>
          <CCol md={4} className="text-end">
            <div className="d-flex flex-column gap-3 align-items-end">
              {/* Period Selector */}
              <CDropdown>
                <CDropdownToggle 
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: '12px',
                    padding: '12px 20px',
                    fontWeight: '500',
                    minWidth: '180px'
                  }}
                >
                  <Calendar size={16} style={{ marginRight: '8px' }} />
                  {dateRange === '7d' ? '7 Hari Terakhir' : 
                   dateRange === '30d' ? '30 Hari Terakhir' : 
                   dateRange === '90d' ? '90 Hari Terakhir' : '1 Tahun Terakhir'}
                </CDropdownToggle>
                <CDropdownMenu>
                  <CDropdownItem onClick={() => setDateRange('7d')}>7 Hari Terakhir</CDropdownItem>
                  <CDropdownItem onClick={() => setDateRange('30d')}>30 Hari Terakhir</CDropdownItem>
                  <CDropdownItem onClick={() => setDateRange('90d')}>90 Hari Terakhir</CDropdownItem>
                  <CDropdownItem onClick={() => setDateRange('1y')}>1 Tahun Terakhir</CDropdownItem>
                </CDropdownMenu>
              </CDropdown>
              
              {/* Chart Type Selector */}
              <CButtonGroup>
                <CButton
                  color={chartType === 'bar' ? 'light' : 'outline-light'}
                  onClick={() => setChartType('bar')}
                  style={{ 
                    borderRadius: '8px 0 0 8px',
                    padding: '8px 12px',
                    backgroundColor: chartType === 'bar' ? 'white' : 'rgba(255,255,255,0.1)',
                    color: chartType === 'bar' ? '#667eea' : 'white',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <BarChart3 size={16} />
                </CButton>
                <CButton
                  color={chartType === 'pie' ? 'light' : 'outline-light'}
                  onClick={() => setChartType('pie')}
                  style={{ 
                    borderRadius: '0',
                    padding: '8px 12px',
                    backgroundColor: chartType === 'pie' ? 'white' : 'rgba(255,255,255,0.1)',
                    color: chartType === 'pie' ? '#667eea' : 'white',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <PieIcon size={16} />
                </CButton>
                <CButton
                  color={chartType === 'line' ? 'light' : 'outline-light'}
                  onClick={() => setChartType('line')}
                  style={{ 
                    borderRadius: '0 8px 8px 0',
                    padding: '8px 12px',
                    backgroundColor: chartType === 'line' ? 'white' : 'rgba(255,255,255,0.1)',
                    color: chartType === 'line' ? '#667eea' : 'white',
                    border: '1px solid rgba(255,255,255,0.3)'
                  }}
                >
                  <LineIcon size={16} />
                </CButton>
              </CButtonGroup>
              
              {/* Action Buttons */}
              <div className="d-flex gap-2">
                <CButton
                  color="light"
                  onClick={loadStatistics}
                  style={{
                    backgroundColor: 'rgba(255,255,255,0.2)',
                    border: '1px solid rgba(255,255,255,0.3)',
                    color: 'white',
                    borderRadius: '8px',
                    padding: '8px 12px'
                  }}
                >
                  <RefreshCw size={16} />
                </CButton>
                <CButton
                  color="light"
                  style={{
                    backgroundColor: 'white',
                    border: 'none',
                    color: '#667eea',
                    borderRadius: '8px',
                    padding: '8px 16px',
                    fontWeight: '600'
                  }}
                >
                  <Download size={16} style={{ marginRight: '6px' }} />
                  Export
                </CButton>
              </div>
            </div>
          </CCol>
        </CRow>
      </div>

      {/* Overview Cards */}
      <CRow className="mb-5">
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Total Aduan" 
            value={stats.total || 0} 
            subtitle="Semua waktu"
            color="#007bff"
            icon={<Users />}
            trend="neutral"
            trendValue="100%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Aduan Terbuka" 
            value={stats.open || 0} 
            subtitle="Memerlukan perhatian"
            color="#dc3545"
            icon={<AlertCircle />}
            trend="down"
            trendValue="12%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Dalam Proses" 
            value={stats.in_progress || 0} 
            subtitle="Sedang ditangani"
            color="#ffc107"
            icon={<Activity />}
            trend="up"
            trendValue="8%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Terselesaikan" 
            value={stats.resolved || 0} 
            subtitle="Selesai bulan ini"
            color="#28a745"
            icon={<Target />}
            trend="up"
            trendValue="15%"
          />
        </CCol>
      </CRow>

      <CRow className="mb-5">
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Rata-rata Respon" 
            value={`${stats.avgResponseTime || 0}h`} 
            subtitle="Waktu penyelesaian"
            color="#17a2b8"
            icon={<Clock />}
            trend="down"
            trendValue="5%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Periode Ini" 
            value={stats.filteredCount || 0} 
            subtitle={`${dateRange === '7d' ? '7 hari' : dateRange === '30d' ? '30 hari' : dateRange === '90d' ? '90 hari' : '1 tahun'} terakhir`}
            color="#6f42c1"
            icon={<TrendingUp />}
            trend="up"
            trendValue="23%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Tingkat Resolusi" 
            value={`${stats.total > 0 ? Math.round(((stats.resolved || 0) + (stats.closed || 0)) / stats.total * 100) : 0}%`} 
            subtitle="Dari total aduan"
            color="#20c997"
            icon={<Target />}
            trend="up"
            trendValue="3%"
          />
        </CCol>
        <CCol lg={3} md={6} className="mb-4">
          <StatCard 
            title="Bulan Ini" 
            value={stats.this_month || 0} 
            subtitle="Aduan baru"
            color="#fd7e14"
            icon={<Calendar />}
            trend="neutral"
            trendValue="2%"
          />
        </CCol>
      </CRow>

      {/* Trend Chart */}
      <CRow className="mb-5">
        <CCol>
          <CCard style={{ 
            borderRadius: '20px', 
            border: 'none', 
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            overflow: 'hidden'
          }}>
            <CCardHeader style={{ 
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              padding: '24px 32px'
            }}>
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h4 style={{ 
                    margin: 0, 
                    fontWeight: '700',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px'
                  }}>
                    <TrendingUp size={24} />
                    Tren Aduan Harian
                  </h4>
                  <p style={{ 
                    margin: '4px 0 0 0', 
                    opacity: 0.9, 
                    fontSize: '14px' 
                  }}>
                    Analisis pola pengaduan dan penyelesaian dalam periode yang dipilih
                  </p>
                </div>
                <div className="d-flex align-items-center gap-2">
                  <CBadge 
                    color="light" 
                    style={{ 
                      padding: '8px 12px',
                      fontSize: '12px',
                      backgroundColor: 'rgba(255,255,255,0.2)',
                      color: 'white',
                      border: '1px solid rgba(255,255,255,0.3)'
                    }}
                  >
                    {dateRange === '7d' ? '7 Hari' : dateRange === '30d' ? '30 Hari' : dateRange === '90d' ? '90 Hari' : '1 Tahun'}
                  </CBadge>
                </div>
              </div>
            </CCardHeader>
            <CCardBody style={{ padding: '32px' }}>
              <div style={{ width: '100%', height: '350px' }}>
                <ResponsiveContainer>
                  <AreaChart data={stats.dailyTrend || []}>
                    <defs>
                      <linearGradient id="colorNew" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#667eea" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#667eea" stopOpacity={0.1}/>
                      </linearGradient>
                      <linearGradient id="colorResolved" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#28a745" stopOpacity={0.8}/>
                        <stop offset="95%" stopColor="#28a745" stopOpacity={0.1}/>
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                    <XAxis 
                      dataKey="date" 
                      tick={{ fontSize: 12, fill: '#6c757d' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <YAxis 
                      tick={{ fontSize: 12, fill: '#6c757d' }}
                      axisLine={false}
                      tickLine={false}
                    />
                    <Tooltip 
                      contentStyle={{
                        backgroundColor: 'white',
                        border: 'none',
                        borderRadius: '12px',
                        boxShadow: '0 4px 20px rgba(0,0,0,0.15)'
                      }}
                    />
                    <Legend />
                    <Area 
                      type="monotone" 
                      dataKey="count" 
                      stroke="#667eea" 
                      fillOpacity={1}
                      fill="url(#colorNew)"
                      strokeWidth={3}
                      name="Aduan Baru"
                    />
                    <Area 
                      type="monotone" 
                      dataKey="resolved" 
                      stroke="#28a745" 
                      fillOpacity={1}
                      fill="url(#colorResolved)"
                      strokeWidth={3}
                      name="Terselesaikan"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Charts Row */}
      <CRow className="mb-4">
        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <strong>📊 Status Aduan</strong>
            </CCardHeader>
            <CCardBody>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={stats.statusStats || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(stats.statusStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getStatusColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={stats.statusStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#007bff" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>

        <CCol md={6}>
          <CCard>
            <CCardHeader>
              <strong>⚡ Prioritas Aduan</strong>
            </CCardHeader>
            <CCardBody>
              <div style={{ width: '100%', height: '300px' }}>
                <ResponsiveContainer>
                  {chartType === 'pie' ? (
                    <PieChart>
                      <Pie
                        data={stats.priorityStats || []}
                        cx="50%"
                        cy="50%"
                        labelLine={false}
                        label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                        outerRadius={80}
                        fill="#8884d8"
                        dataKey="value"
                      >
                        {(stats.priorityStats || []).map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={getPriorityColor(entry.name)} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  ) : (
                    <BarChart data={stats.priorityStats || []}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#ffc107" />
                    </BarChart>
                  )}
                </ResponsiveContainer>
              </div>
            </CCardBody>
          </CCard>
        </CCol>
      </CRow>

      {/* Category Stats */}
      {stats.categoryStats && stats.categoryStats.length > 0 && (
        <CRow>
          <CCol>
            <CCard>
              <CCardHeader>
                <strong>🗂️ Kategori Aduan</strong>
              </CCardHeader>
              <CCardBody>
                <div style={{ width: '100%', height: '300px' }}>
                  <ResponsiveContainer>
                    <BarChart data={stats.categoryStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="name" />
                      <YAxis />
                      <Tooltip />
                      <Bar dataKey="value" fill="#17a2b8" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </CCardBody>
            </CCard>
          </CCol>
        </CRow>
      )}

      <style jsx>{`
        .complaint-statistics-page {
          padding: 20px;
        }
        
        .stat-card {
          transition: transform 0.2s;
        }
        
        .stat-card:hover {
          transform: translateY(-2px);
        }
      `}</style>
    </div>
  );
};

export default ComplaintStatisticsPage;