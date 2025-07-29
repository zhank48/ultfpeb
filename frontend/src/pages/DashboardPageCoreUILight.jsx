import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext.jsx';
import { useNavigate } from 'react-router-dom';
import Card from '../components/Card';
import StatCard from '../components/StatCard';
import Avatar from '../components/Avatar';
import { 
  Users, 
  TrendingUp, 
  Calendar,
  MapPin,
  User,
  Eye,
  Activity,
  ArrowUp,
  ArrowDown,
  BarChart3,
  RefreshCw,
  Building,
  CheckCircle,
  XCircle,
  Clock,
  Star,
  AlertTriangle,
  Package,
  Search,
  UserPlus,
  Settings
} from 'lucide-react';

// Add CSS for spinning and pulse animations
const styles = `
  @keyframes spin {
    from { transform: rotate(0deg); }
    to { transform: rotate(360deg); }
  }
  
  @keyframes pulse {
    0% { opacity: 1; }
    50% { opacity: 0.4; }
    100% { opacity: 1; }
  }
`;

// Inject styles
if (typeof document !== 'undefined') {
  const styleSheet = document.createElement('style');
  styleSheet.textContent = styles;
  if (!document.head.querySelector('style[data-dashboard-styles]')) {
    styleSheet.setAttribute('data-dashboard-styles', 'true');
    document.head.appendChild(styleSheet);
  }
}

// Helper function to get rating description
const getRatingText = (rating) => {
  if (rating >= 4.5) return 'Sangat Baik';
  if (rating >= 4.0) return 'Baik Sekali';
  if (rating >= 3.5) return 'Baik';
  if (rating >= 3.0) return 'Rata-rata';
  if (rating >= 2.0) return 'Buruk';
  return 'Sangat Buruk';
};

export function DashboardPageCoreUILight() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [stats, setStats] = useState({
    total: 0,
    today: 0,
    active: 0,
    mostVisitedUnit: { name: 'Loading...', visitors: 0 },
    weeklyGrowth: 0,
    feedbackRating: { average: 0, total: 0 },
    complaints: { total: 0, pending: 0, resolved: 0 },
    lostItems: { total: 0, found: 0, pending: 0 },
    returnedItems: { total: 0, thisMonth: 0 }
  });
    const [unitStats, setUnitStats] = useState([]);
  
  const [recentVisitors, setRecentVisitors] = useState([]);
  
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(null);
  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);

  // Real-time update interval
  const [lastUpdate, setLastUpdate] = useState(new Date());
  const [autoRefresh, setAutoRefresh] = useState(true);

  useEffect(() => {
    fetchDashboardData();
    
    // Set up real-time updates every 15 seconds for more responsive data
    const interval = setInterval(() => {
      if (autoRefresh) {
        fetchDashboardData();
        setLastUpdate(new Date());
      }
    }, 15000);
    
    // Handle window resize for responsive grid
    const handleResize = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    window.addEventListener('resize', handleResize);
    
    return () => {
      clearInterval(interval);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const token = localStorage.getItem('token');
      if (!token) {
        setError('Authentication required');
        return;
      }

      // Fetch all dashboard data in parallel
      const apiUrl = import.meta.env.VITE_API_URL || '${import.meta.env.VITE_API_URL}';
      const [statsResponse, recentResponse, feedbackResponse, complaintsResponse, lostItemsResponse] = await Promise.all([
        fetch(`${apiUrl}/dashboard/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/dashboard/recent-visitors?limit=10`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/feedback/stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/dashboard/complaint-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        }),
        fetch(`${apiUrl}/dashboard/lost-items-stats`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        })
      ]);
      
      // Process stats response
      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          const { statistics } = statsData.data;
          
          setStats(prevStats => ({
            ...prevStats,
            total: statistics.total || 0,
            today: statistics.today || 0,
            active: statistics.active || 0,
            mostVisitedUnit: statistics.mostVisitedUnit || { name: 'No data', visitors: 0 },
            weeklyGrowth: statistics.weeklyGrowth || 0
          }));

          if (statistics.unitStats && statistics.unitStats.length > 0) {
            setUnitStats(statistics.unitStats);
          }
        }
      } else {
        console.error('Failed to fetch visitor stats:', statsResponse.status);
      }

      // Process recent visitors response
      if (recentResponse.ok) {
        const recentData = await recentResponse.json();
        if (recentData.success) {
          setRecentVisitors(recentData.data.recentVisitors || []);
        }
      } else {
        console.error('Failed to fetch recent visitors:', recentResponse.status);
      }

      // Process feedback stats response
      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        if (feedbackData.success) {
          setStats(prevStats => ({
            ...prevStats,
            feedbackRating: {
              average: parseFloat(feedbackData.data.averageRating) || 0,
              total: feedbackData.data.total || 0
            }
          }));
        }
      } else {
        console.error('Failed to fetch feedback stats:', feedbackResponse.status);
      }

      // Process complaint stats response
      if (complaintsResponse.ok) {
        const complaintsData = await complaintsResponse.json();
        if (complaintsData.success) {
          setStats(prevStats => ({
            ...prevStats,
            complaints: {
              total: complaintsData.data.total || 0,
              pending: complaintsData.data.pending || 0,
              resolved: complaintsData.data.resolved || 0
            }
          }));
        }
      } else {
        console.error('Failed to fetch complaint stats:', complaintsResponse.status);
      }

      // Process lost items stats response
      if (lostItemsResponse.ok) {
        const lostItemsData = await lostItemsResponse.json();
        if (lostItemsData.success) {
          setStats(prevStats => ({
            ...prevStats,
            lostItems: lostItemsData.data.lostItems,
            returnedItems: lostItemsData.data.returnedItems
          }));
        }
      } else {
        console.error('Failed to fetch lost items stats:', lostItemsResponse.status);
        // Fallback to mock data if API fails
        setStats(prevStats => ({
          ...prevStats,
          lostItems: { total: 23, found: 18, pending: 5 },
          returnedItems: { total: 156, thisMonth: 12 }
        }));
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError(`Unable to load real-time data: ${error.message || 'Network error'}`);
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div style={{ padding: '24px', backgroundColor: '#f8f9fa', minHeight: 'calc(100vh - 60px)' }}>
      {/* Header */}
      <div style={{ marginBottom: '24px' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <h1 style={{ 
              fontSize: '28px', 
              fontWeight: '600', 
              color: '#212529', 
              margin: 0,
              marginBottom: '4px'
            }}>
              Dashboard
            </h1>
            <p style={{ 
              color: '#6c757d', 
              fontSize: '14px',
              margin: 0
            }}>
              Welcome back, {user?.name || 'User'}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{ display: 'flex', gap: '12px', alignItems: 'center', marginBottom: '4px' }}>
              {/* Auto-refresh toggle */}
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <label style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px',
                  fontSize: '14px',
                  color: '#6c757d',
                  cursor: 'pointer'
                }}>
                  <input
                    type="checkbox"
                    checked={autoRefresh}
                    onChange={(e) => setAutoRefresh(e.target.checked)}
                    style={{
                      width: '16px',
                      height: '16px',
                      cursor: 'pointer'
                    }}
                  />
                  Auto-refresh
                </label>
              </div>
              
              {/* Refresh button */}
              <button 
                onClick={handleRefresh}
                disabled={isLoading}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '8px 16px',
                  backgroundColor: isLoading ? '#e9ecef' : '#0d6efd',
                  color: isLoading ? '#6c757d' : 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: isLoading ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 4px rgba(13, 110, 253, 0.2)'
                }}
                onMouseOver={(e) => {
                  if (!isLoading) {
                    e.target.style.backgroundColor = '#0b5ed7';
                    e.target.style.transform = 'translateY(-1px)';
                  }
                }}
                onMouseOut={(e) => {
                  if (!isLoading) {
                    e.target.style.backgroundColor = '#0d6efd';
                    e.target.style.transform = 'translateY(0)';
                  }
                }}
              >
                <RefreshCw 
                  size={16} 
                  style={{ 
                    animation: isLoading ? 'spin 1s linear infinite' : 'none'
                  }} 
                />
                {isLoading ? 'Updating...' : 'Refresh'}
              </button>
            </div>
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '4px',
              justifyContent: 'flex-end'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
                padding: '4px 8px',
                backgroundColor: autoRefresh ? '#d1f2eb' : '#f8f9fa',
                borderRadius: '4px',
                border: `1px solid ${autoRefresh ? '#20c997' : '#dee2e6'}`
              }}>
                <Activity size={12} style={{ color: autoRefresh ? '#20c997' : '#6c757d' }} />
                <span style={{ color: autoRefresh ? '#20c997' : '#6c757d' }}>
                  {autoRefresh ? 'Live (15s)' : 'Manual'}
                </span>
              </div>
              <span>
                Last: {lastUpdate.toLocaleTimeString('id-ID', { 
                  hour: '2-digit', 
                  minute: '2-digit',
                  second: '2-digit'
                })}
              </span>
            </div>
          </div>
        </div>
        {error && (
          <div style={{
            padding: '8px 12px',
            backgroundColor: '#f8d7da',
            color: '#721c24',
            borderRadius: '4px',
            fontSize: '14px',
            border: '1px solid #f5c6cb'
          }}>
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Stats Cards - Consistent Design */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
        gap: '24px', 
        marginBottom: '24px' 
      }}>
        {/* Total Visitors Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#0d6efd' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Total Pengunjung
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? (
                  <div style={{
                    width: '80px',
                    height: '32px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }} />
                ) : stats.total.toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                {stats.weeklyGrowth >= 0 ? (
                  <>                    <ArrowUp size={12} style={{ color: '#198754' }} />
                    <span style={{ color: '#198754', fontWeight: '500' }}>+{stats.weeklyGrowth}%</span>
                  </>
                ) : (
                  <>                    <ArrowDown size={12} style={{ color: '#dc3545' }} />
                    <span style={{ color: '#dc3545', fontWeight: '500' }}>{stats.weeklyGrowth}%</span>
                  </>
                )}
                <span style={{ color: '#6c757d' }}>minggu ini</span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#e7f3ff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Users size={28} style={{ color: '#0d6efd' }} />
            </div>
          </div>
        </div>

        {/* Today's Visitors Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#198754' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
              Visitors Hari Ini
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? (
                  <div style={{
                    width: '60px',
                    height: '32px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }} />
                ) : stats.today.toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <Clock size={12} style={{ color: '#198754' }} />
                <span style={{ color: '#6c757d' }}>Hitungan real-time</span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#e8f5e8',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Calendar size={28} style={{ color: '#198754' }} />
            </div>
          </div>
        </div>

        {/* Active Visitors Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#fd7e14' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Currently Active
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? (
                  <div style={{
                    width: '50px',
                    height: '32px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '4px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }} />
                ) : stats.active.toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <Clock size={12} style={{ color: '#fd7e14' }} />
                <span style={{ color: '#6c757d' }}>Hitungan real-time</span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fff3e0',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Activity size={28} style={{ color: '#fd7e14' }} />
            </div>
          </div>
        </div>

        {/* Most Visited Unit Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#6f42c1' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Unit Paling Banyak Dikunjungi
              </div>
              <div style={{ fontSize: '18px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? 'Memuat...' : (stats.mostVisitedUnit.name || 'Tidak ada data')}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {isLoading ? '0' : (stats.mostVisitedUnit.visitors || 0).toLocaleString()} kunjungan minggu ini
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#f3f0ff',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Building size={28} style={{ color: '#6f42c1' }} />
            </div>
          </div>
        </div>

        {/* Feedback Rating Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#ffc107' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Rating Umpan Balik
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '6px' }}>
                <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529' }}>
                  {isLoading ? (
                    <div style={{
                      width: '60px',
                      height: '32px',
                      backgroundColor: '#e9ecef',
                      borderRadius: '4px',
                      animation: 'pulse 1.5s ease-in-out infinite alternate'
                    }} />
                  ) : (
                    <span style={{
                      color: stats.feedbackRating.average >= 4.0 ? '#198754' : 
                             stats.feedbackRating.average >= 3.0 ? '#ffc107' : '#dc3545'
                    }}>
                      {(stats.feedbackRating.average || 0).toFixed(1)}
                    </span>
                  )}
                </div>
                <div 
                  style={{ display: 'flex', gap: '2px', cursor: 'help' }}
                  title={`Average rating: ${(stats.feedbackRating.average || 0).toFixed(2)}/5.0 based on ${stats.feedbackRating.total} reviews`}
                >
                  {[1, 2, 3, 4, 5].map((starIndex) => {
                    const rating = stats.feedbackRating.average || 0;
                    const isFullStar = starIndex <= Math.floor(rating);
                    const isPartialStar = starIndex === Math.ceil(rating) && rating % 1 !== 0;
                    const partialPercentage = isPartialStar ? (rating % 1) * 100 : 0;
                    
                    return (
                      <div key={starIndex} style={{ position: 'relative', display: 'inline-block' }}>
                        {/* Background star (empty) */}
                        <Star 
                          size={18} 
                          style={{ 
                            color: '#dee2e6',
                            fill: '#dee2e6'
                          }} 
                        />
                        {/* Foreground star (filled) */}
                        {(isFullStar || isPartialStar) && (
                          <div 
                            style={{
                              position: 'absolute',
                              top: 0,
                              left: 0,
                              width: isPartialStar ? `${partialPercentage}%` : '100%',
                              overflow: 'hidden',
                              transition: 'width 0.3s ease-in-out'
                            }}
                          >
                            <Star 
                              size={18} 
                              style={{ 
                                color: '#ffc107',
                                fill: '#ffc107',
                                filter: 'drop-shadow(0 0 2px rgba(255, 193, 7, 0.3))'
                              }} 
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
                
                {/* Rating progress bar */}
                {!isLoading && stats.feedbackRating.average > 0 && (
                  <div style={{
                    width: '80px',
                    height: '4px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '2px',
                    overflow: 'hidden',
                    marginTop: '2px'
                  }}>
                    <div style={{
                      width: `${(stats.feedbackRating.average / 5) * 100}%`,
                      height: '100%',
                      backgroundColor: stats.feedbackRating.average >= 4.0 ? '#198754' : 
                                     stats.feedbackRating.average >= 3.0 ? '#ffc107' : '#dc3545',
                      borderRadius: '2px',
                      transition: 'width 1s ease-in-out'
                    }} />
                  </div>
                )}
              </div>
              <div style={{ fontSize: '14px', color: '#6c757d' }}>
                {isLoading ? (
                  <div style={{
                    width: '100px',
                    height: '14px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '2px',
                    animation: 'pulse 1.5s ease-in-out infinite alternate'
                  }} />
                ) : (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {stats.feedbackRating.total > 0 ? (
                      <>
                        <span>{stats.feedbackRating.total} reviews</span>
                        {stats.feedbackRating.average > 0 && (
                          <span style={{
                            fontSize: '12px',
                            backgroundColor: '#ffc10720',
                            color: '#b8860b',
                            padding: '2px 6px',
                            borderRadius: '8px',
                            fontWeight: '500'
                          }}>
                            {getRatingText(stats.feedbackRating.average)}
                          </span>
                        )}
                      </>
                    ) : (
                      <span style={{ color: '#6c757d', fontStyle: 'italic' }}>
                        No reviews yet
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fff8e1',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Star size={28} style={{ color: '#ffc107' }} />
            </div>
          </div>
        </div>

        {/* Complaints Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#dc3545' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Complaints
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? '...' : (stats.complaints.total || 0).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  backgroundColor: '#dc354520', 
                  color: '#dc3545',
                  fontWeight: '500'
                }}>
                  {isLoading ? '0' : stats.complaints.pending} pending
                </span>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  backgroundColor: '#19875420', 
                  color: '#198754',
                  fontWeight: '500'
                }}>
                  {isLoading ? '0' : stats.complaints.resolved} terselesaikan
                </span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fdf2f2',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <AlertTriangle size={28} style={{ color: '#dc3545' }} />
            </div>
          </div>
        </div>

        {/* Lost Items Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#e83e8c' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Barang Hilang
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? '...' : (stats.lostItems.total || 0).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '12px' }}>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  backgroundColor: '#19875420', 
                  color: '#198754',
                  fontWeight: '500'
                }}>
                  {isLoading ? '0' : stats.lostItems.found} ditemukan
                </span>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  backgroundColor: '#ffc10720', 
                  color: '#ffc107',
                  fontWeight: '500'
                }}>
                  {isLoading ? '0' : stats.lostItems.pending} menunggu
                </span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#fdf0f7',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Search size={28} style={{ color: '#e83e8c' }} />
            </div>
          </div>
        </div>

        {/* Returned Items Card */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '12px',
          padding: '24px',
          boxShadow: '0 2px 8px rgba(0, 0, 0, 0.08)',
          position: 'relative',
          overflow: 'hidden',
          transition: 'transform 0.2s ease-in-out',
          height: '140px'
        }}
        onMouseEnter={(e) => e.currentTarget.style.transform = 'translateY(-2px)'}
        onMouseLeave={(e) => e.currentTarget.style.transform = 'translateY(0)'}
        >
          <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', backgroundColor: '#20c997' }}></div>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: '100%' }}>
            <div style={{ flex: 1 }}>
              <div style={{ color: '#6c757d', fontSize: '14px', fontWeight: '500', marginBottom: '8px' }}>
                Returned Items
              </div>
              <div style={{ fontSize: '32px', fontWeight: '700', color: '#212529', marginBottom: '4px' }}>
                {isLoading ? '...' : (stats.returnedItems.total || 0).toLocaleString()}
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '12px' }}>
                <span style={{ 
                  padding: '2px 6px', 
                  borderRadius: '10px', 
                  backgroundColor: '#20c99720', 
                  color: '#20c997',
                  fontWeight: '500'
                }}>
                  +{isLoading ? '0' : stats.returnedItems.thisMonth} this month
                </span>
              </div>
            </div>
            <div style={{
              width: '56px',
              height: '56px',
              backgroundColor: '#d1f2eb',
              borderRadius: '12px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center'
            }}>
              <Package size={28} style={{ color: '#20c997' }} />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content Grid */}      
      <div className="dashboard-grid" style={{
        display: 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
        gap: '24px', 
        marginBottom: '24px'
      }}>
        {/* Recent Visitors Table */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
          overflow: 'hidden'
        }}>
          <div style={{ 
            padding: '20px 24px', 
            borderBottom: '1px solid #dee2e6',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center'
          }}>            
          <h5 style={{ 
              margin: 0, 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#212529' 
            }}>
              Data Terkini Visitors
            </h5>
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d',
              marginTop: '2px'
            }}>
              {new Date().toLocaleDateString('id-ID', { 
                weekday: 'long', 
                year: 'numeric', 
                month: 'long', 
                day: 'numeric' 
              })}
            </div>            <button 
              onClick={() => navigate('/app/visitors')}
              style={{
                background: 'none',
                border: 'none',
                color: '#0d6efd',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                padding: '4px 8px',
                borderRadius: '4px'
              }}
              onMouseOver={(e) => e.target.style.backgroundColor = '#f8f9fa'}
              onMouseOut={(e) => e.target.style.backgroundColor = 'transparent'}
            >
              View All →
            </button>
            {recentVisitors.length > 0 && (
              <div style={{ 
                fontSize: '11px', 
                color: '#6c757d',
                marginTop: '4px'
              }}>
                Showing {recentVisitors.length} of {recentVisitors.length >= 5 ? '5+' : recentVisitors.length} today
              </div>
            )}
          </div>
          
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead style={{ backgroundColor: '#f8f9fa' }}>
                <tr>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6c757d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Name</th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6c757d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Purpose</th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6c757d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Time</th>
                  <th style={{
                    padding: '12px 16px',
                    textAlign: 'left',
                    fontSize: '12px',
                    fontWeight: '600',
                    color: '#6c757d',
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  }}>Status</th>
                </tr>
              </thead>
              <tbody>
                {recentVisitors.length > 0 ? (
                  recentVisitors.map((visitor, index) => (
                    <tr key={visitor.id} style={{
                      borderBottom: '1px solid #dee2e6',
                      transition: 'background-color 0.2s'
                    }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8f9fa'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'transparent'}
                    >
                      <td style={{ padding: '12px 16px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            backgroundColor: '#e7f3ff',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                          }}>
                            <User size={16} style={{ color: '#0d6efd' }} />
                          </div>
                          <span style={{ 
                            fontSize: '14px', 
                            fontWeight: '500', 
                            color: '#212529' 
                          }}>
                            {visitor.full_name || visitor.name}
                          </span>
                        </div>
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#6c757d'
                      }}>
                        {visitor.purpose}
                      </td>
                      <td style={{ 
                        padding: '12px 16px',
                        fontSize: '14px',
                        color: '#6c757d'
                      }}>
                        {new Date(visitor.check_in_time).toLocaleTimeString('id-ID', { 
                          hour: '2-digit', 
                          minute: '2-digit',
                          hour12: false 
                        })}
                      </td>
                      <td style={{ padding: '12px 16px' }}>
                        <span style={{
                          display: 'inline-flex',
                          alignItems: 'center',
                          gap: '4px',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontSize: '12px',
                          fontWeight: '500',
                          backgroundColor: !visitor.check_out_time ? '#d1f2eb' : '#f8f9fa',
                          color: !visitor.check_out_time ? '#0f5132' : '#6c757d'
                        }}>
                          {!visitor.check_out_time ? (
                            <>
                              <CheckCircle size={12} />
                              Active
                            </>
                          ) : (
                            <>
                              <XCircle size={12} />
                              Completed
                            </>
                          )}
                        </span>
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="4" style={{ 
                      padding: '24px 16px', 
                      textAlign: 'center',
                      color: '#6c757d',
                      fontSize: '14px'
                    }}>
                      {isLoading ? (
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                          <RefreshCw size={16} className="animate-spin" />
                          Loading recent visitors...
                        </div>
                      ) : (
                        'No visitors today'
                      )}
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Quick Actions */}
        <div style={{
          backgroundColor: 'white',
          border: '1px solid #dee2e6',
          borderRadius: '8px',
          padding: '24px',
          boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)'
        }}>
          <div style={{ 
            display: 'flex', 
            justifyContent: 'space-between', 
            alignItems: 'center',
            marginBottom: '20px' 
          }}>
            <h5 style={{ 
              margin: '0', 
              fontSize: '18px', 
              fontWeight: '600', 
              color: '#212529' 
            }}>
              Quick Actions
            </h5>
            <div style={{ 
              fontSize: '12px', 
              color: '#6c757d',
              display: 'flex',
              alignItems: 'center',
              gap: '4px'
            }}>
              <RefreshCw size={12} />
              Last updated: {lastUpdate.toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' })}
            </div>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div 
              onClick={() => navigate('/app/visitors')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#198754';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(25, 135, 84, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#e8f5e8',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <Eye size={20} style={{ color: '#198754' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>View Visitors</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Manage visitor records and check-ins</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#198754',
                transition: 'transform 0.2s ease-in-out'
              }}>
                →
              </div>
            </div>
            
            <div 
              onClick={() => navigate('/app/user-management')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#6f42c1';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(111, 66, 193, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#f3f0ff',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <Users size={20} style={{ color: '#6f42c1' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Manage Users</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>User administration and permissions</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#6f42c1',
                transition: 'transform 0.2s ease-in-out'
              }}>
                →
              </div>
            </div>

            <div 
              onClick={() => navigate('/app/complaint-management')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#dc3545';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(220, 53, 69, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#fdf2f2',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <Settings size={20} style={{ color: '#dc3545' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Manage Complaints</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Handle visitor complaints and feedback</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#dc3545',
                transition: 'transform 0.2s ease-in-out'
              }}>
                →
              </div>
            </div>

            <div 
              onClick={() => navigate('/app/lost-items/form')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#e83e8c';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(232, 62, 140, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#fdf0f7',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <UserPlus size={20} style={{ color: '#e83e8c' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Register Lost Item</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Register new lost and found items</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#e83e8c',
                transition: 'transform 0.2s ease-in-out'
              }}>
                →
              </div>
            </div>

            <div 
              onClick={() => navigate('/app/reports')}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#20c997';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(32, 201, 151, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#d1f2eb',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <BarChart3 size={20} style={{ color: '#20c997' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Export Data</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Download visitor reports and analytics</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#20c997',
                transition: 'transform 0.2s ease-in-out'
              }}>
                →
              </div>
            </div>
            
            <div 
              onClick={() => handleRefresh()}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '16px',
                backgroundColor: '#f8f9fa',
                border: '1px solid #dee2e6',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease-in-out',
                fontSize: '14px',
                fontWeight: '500',
                color: '#212529'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e9ecef';
                e.currentTarget.style.borderColor = '#fd7e14';
                e.currentTarget.style.transform = 'translateY(-2px)';
                e.currentTarget.style.boxShadow = '0 4px 12px rgba(253, 126, 20, 0.15)';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f8f9fa';
                e.currentTarget.style.borderColor = '#dee2e6';
                e.currentTarget.style.transform = 'translateY(0)';
                e.currentTarget.style.boxShadow = 'none';
              }}
            >
              <div style={{
                width: '40px',
                height: '40px',
                backgroundColor: '#fff3e0',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                transition: 'all 0.2s ease-in-out'
              }}>
                <RefreshCw size={20} style={{ color: '#fd7e14' }} />
              </div>
              <div style={{ flex: 1 }}>
                <div style={{ fontWeight: '600', marginBottom: '2px' }}>Refresh Data</div>
                <div style={{ fontSize: '12px', color: '#6c757d' }}>Update real-time statistics</div>
              </div>
              <div style={{ 
                fontSize: '20px', 
                color: '#fd7e14',
                transition: 'transform 0.2s ease-in-out'
              }}>
                ↻
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Unit Statistics - Enhanced */}
       <div style={{
        backgroundColor: 'white',
        border: '1px solid #dee2e6',
        borderRadius: '12px',
        padding: '32px',
        boxShadow: '0 0.125rem 0.25rem rgba(0, 0, 0, 0.075)',
        marginBottom: '24px'
      }}>
        <div style={{ 
          display: 'flex', 
          alignItems: 'center', 
          justifyContent: 'space-between',
          marginBottom: '32px' 
        }}>
          <div>
            <h5 style={{ 
              margin: '0 0 8px 0', 
              fontSize: '20px', 
              fontWeight: '700', 
              color: '#212529' 
            }}>
              Visitor Distribution by Unit
            </h5>
            <p style={{ 
              margin: 0, 
              fontSize: '14px', 
              color: '#6c757d' 
            }}>
              Breakdown of visitor traffic across different units and departments
            </p>
          </div>
          <div style={{
            padding: '8px 16px',
            backgroundColor: '#f8f9fa',
            borderRadius: '8px',
            border: '1px solid #dee2e6'
          }}>
            <div style={{ fontSize: '12px', color: '#6c757d', marginBottom: '2px' }}>
              Total Units
            </div>
            <div style={{ fontSize: '18px', fontWeight: '600', color: '#212529' }}>
              {unitStats.length}
            </div>
          </div>
        </div>
        
        <div className="unit-distribution-grid" style={{ 
          display: 'grid', 
          gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr', 
          gap: '40px'
        }}>
          {/* Enhanced Unit List */}
          <div>
            <h6 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <Building size={16} style={{ color: '#0d6efd' }} />
              Top Units by Visitors
            </h6>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
              {unitStats.slice(0, 8).map((unit, index) => (
                <div key={index} style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '20px',
                  backgroundColor: index < 3 ? '#f8f9ff' : '#f8f9fa',
                  borderRadius: '12px',
                  border: index < 3 ? '1px solid #e7f3ff' : '1px solid #dee2e6',
                  transition: 'all 0.2s ease-in-out',
                  cursor: 'pointer'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = 'translateY(-2px)';
                  e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = 'translateY(0)';
                  e.currentTarget.style.boxShadow = 'none';
                }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                      width: '40px',
                      height: '40px',
                      borderRadius: '50%',
                      background: index === 0 ? 'linear-gradient(135deg, #0d6efd, #0b5ed7)' : 
                                 index === 1 ? 'linear-gradient(135deg, #198754, #157347)' : 
                                 index === 2 ? 'linear-gradient(135deg, #fd7e14, #fd6102)' : 
                                 index === 3 ? 'linear-gradient(135deg, #6f42c1, #5a32a3)' : 
                                 'linear-gradient(135deg, #6c757d, #5a6169)',
                      color: 'white',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      fontSize: '16px',
                      fontWeight: '700',
                      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.15)'
                    }}>
                      {index + 1}
                    </div>
                    <div style={{ flex: 1 }}>
                      <div style={{ 
                        fontWeight: '600', 
                        color: '#212529', 
                        fontSize: '15px',
                        marginBottom: '4px',
                        lineHeight: '1.2'
                      }}>
                        {unit.name}
                      </div>
                      <div style={{ 
                        fontSize: '13px', 
                        color: '#6c757d',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px'
                      }}>
                        <div style={{
                          width: '6px',
                          height: '6px',
                          borderRadius: '50%',
                          backgroundColor: index === 0 ? '#0d6efd' : 
                                         index === 1 ? '#198754' : 
                                         index === 2 ? '#fd7e14' : 
                                         index === 3 ? '#6f42c1' : '#6c757d'
                        }}></div>
                        {unit.percentage}% of total visits
                      </div>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ 
                      fontSize: '20px', 
                      fontWeight: '700', 
                      color: '#212529',
                      marginBottom: '2px'
                    }}>
                      {unit.visitors}
                    </div>
                    <div style={{ fontSize: '12px', color: '#6c757d' }}>
                      visitors
                    </div>
                  </div>
                </div>
              ))}
              
              {unitStats.length > 8 && (
                <div style={{
                  padding: '16px',
                  textAlign: 'center',
                  color: '#6c757d',
                  fontSize: '14px',
                  border: '2px dashed #dee2e6',
                  borderRadius: '12px',
                  backgroundColor: '#f8f9fa'
                }}>
                  +{unitStats.length - 8} more units with visitor data
                </div>
              )}
            </div>
          </div> 

          {/* Enhanced Progress Bars */}
          <div>
            <h6 style={{ 
              fontSize: '16px', 
              fontWeight: '600', 
              color: '#212529', 
              marginBottom: '20px',
              display: 'flex',
              alignItems: 'center',
              gap: '8px'
            }}>
              <BarChart3 size={16} style={{ color: '#0d6efd' }} />
              Visitor Distribution Chart
            </h6>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
              {unitStats.slice(0, 10).map((unit, index) => (
                <div key={index}>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginBottom: '12px'
                  }}>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#212529',
                      maxWidth: '60%',
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      whiteSpace: 'nowrap'
                    }}>
                      {unit.name}
                    </span>
                    <span style={{ 
                      fontSize: '14px', 
                      fontWeight: '600', 
                      color: '#6c757d',
                      backgroundColor: '#f8f9fa',
                      padding: '4px 8px',
                      borderRadius: '6px',
                      minWidth: 'fit-content'
                    }}>
                      {unit.visitors} ({unit.percentage}%)
                    </span>
                  </div>
                  <div style={{
                    width: '100%',
                    height: '12px',
                    backgroundColor: '#e9ecef',
                    borderRadius: '6px',
                    overflow: 'hidden',
                    position: 'relative'
                  }}>
                    <div style={{
                      height: '100%',
                      width: `${unit.percentage}%`,
                      background: index === 0 ? 'linear-gradient(90deg, #0d6efd, #0b5ed7)' : 
                                 index === 1 ? 'linear-gradient(90deg, #198754, #157347)' : 
                                 index === 2 ? 'linear-gradient(90deg, #fd7e14, #fd6102)' : 
                                 index === 3 ? 'linear-gradient(90deg, #6f42c1, #5a32a3)' :
                                 index === 4 ? 'linear-gradient(90deg, #20c997, #1ba085)' :
                                 index === 5 ? 'linear-gradient(90deg, #ffc107, #ffb300)' :
                                 'linear-gradient(90deg, #6c757d, #5a6169)',
                      borderRadius: '6px',
                      transition: 'width 1.5s cubic-bezier(0.4, 0, 0.2, 1)',
                      position: 'relative'
                    }}>
                      {unit.percentage > 15 && (
                        <div style={{
                          position: 'absolute',
                          right: '8px',
                          top: '50%',
                          transform: 'translateY(-50%)',
                          color: 'white',
                          fontSize: '10px',
                          fontWeight: '600'
                        }}>
                          {unit.percentage}%
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
            
            {/* Summary Stats */}
            <div style={{
              marginTop: '32px',
              padding: '20px',
              backgroundColor: '#f8f9fa',
              borderRadius: '12px',
              border: '1px solid #dee2e6'
            }}>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: '600', 
                color: '#212529',
                marginBottom: '12px'
              }}>
                📊 Quick Stats
              </div>
              <div style={{ 
                display: 'grid', 
                gridTemplateColumns: 'repeat(auto-fit, minmax(120px, 1fr))', 
                gap: '16px' 
              }}>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#0d6efd' }}>
                    {unitStats[0]?.percentage || 0}%
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Top Unit
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#198754' }}>
                    {unitStats.reduce((sum, unit) => sum + unit.visitors, 0)}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Total Visits
                  </div>
                </div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ fontSize: '18px', fontWeight: '700', color: '#fd7e14' }}>
                    {unitStats.length > 0 ? Math.round(unitStats.reduce((sum, unit) => sum + unit.visitors, 0) / unitStats.length) : 0}
                  </div>
                  <div style={{ fontSize: '12px', color: '#6c757d' }}>
                    Avg per Unit
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div> 
    </div>
  );
}