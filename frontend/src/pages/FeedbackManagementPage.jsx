import { useState, useEffect } from 'react';
import { feedbackAPI } from '../utils/api.js';
import { 
  MessageSquare, 
  Star, 
  TrendingUp, 
  Users, 
  Settings, 
  Eye,
  Filter,
  Download,
  Search,
  Calendar,
  BarChart3,
  Heart,
  ThumbsUp,
  AlertCircle,
  CheckCircle,
  Plus,
  Edit2,
  Trash2,
  Save,
  X
} from 'lucide-react';

export function FeedbackManagementPage() {
  const [activeTab, setActiveTab] = useState('overview');
  const [feedbacks, setFeedbacks] = useState([]);
  const [categories, setCategories] = useState([]);
  const [statistics, setStatistics] = useState({});
  const [configuration, setConfiguration] = useState({});
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({
    rating: '',
    category: '',
    dateRange: 'all',
    search: ''
  });
  const [showConfigModal, setShowConfigModal] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      console.log('🔄 Fetching real feedback data from API...');
      
      // Fetch real data from API
      const [feedbackResponse, categoriesResponse, statsResponse] = await Promise.all([
        feedbackAPI.getAll(),
        feedbackAPI.getCategories(),
        feedbackAPI.getStats()
      ]);

      console.log('📊 Feedback API responses:', {
        feedbacks: feedbackResponse?.data?.length || 0,
        categories: categoriesResponse?.data?.length || 0,
        stats: statsResponse
      });

      // Process feedbacks data
      const feedbacksData = feedbackResponse?.data || [];
      setFeedbacks(feedbacksData);

      // Process categories data
      const categoriesData = categoriesResponse?.data || [];
      setCategories(categoriesData);
      
      // Process statistics
      const statsData = statsResponse?.data || {};
      
      // Calculate statistics from real data if not provided by API
      const calculatedStats = calculateStatistics(feedbacksData, categoriesData);
      setStatistics(calculatedStats);

      // Set configuration with dynamic categories
      const dynamicConfig = {
        categories: categoriesData.map(cat => ({
          value: cat.id.toString(),
          label: cat.name,
          enabled: true
        })),
        ratingFields: [
          { key: 'overall_satisfaction_rating', label: 'Kepuasan Keseluruhan', enabled: true, required: true },
          { key: 'access_ease_rating', label: 'Kemudahan Akses', enabled: true, required: false },
          { key: 'wait_time_rating', label: 'Waktu Tunggu', enabled: false, required: false },
          { key: 'staff_friendliness_rating', label: 'Keramahan Staff', enabled: true, required: false },
          { key: 'info_clarity_rating', label: 'Kejelasan Informasi', enabled: false, required: false }
        ],
        textFields: [
          { key: 'likes', label: 'Yang Disukai', enabled: false, required: false },
          { key: 'suggestions', label: 'Saran', enabled: true, required: false }
        ],
        displaySettings: {
          showOnCheckout: true,
          showOnDashboard: true,
          showToPublic: false,
          requireRating: true,
          allowAnonymous: true
        }
      };

      setConfiguration(dynamicConfig);
      
    } catch (error) {
      console.error('❌ Error fetching feedback data:', error);
      
      // Fallback to empty data with error handling
      setFeedbacks([]);
      setCategories([]);
      setStatistics({
        total: 0,
        averageRating: 0,
        satisfaction: 0,
        recent: 0,
        ratingDistribution: [],
        categoryDistribution: [],
        monthlyTrend: []
      });
      setConfiguration({
        categories: [],
        ratingFields: [],
        textFields: [],
        displaySettings: {}
      });
    } finally {
      setLoading(false);
    }
  };

  const calculateStatistics = (feedbacks, categories) => {
    if (!feedbacks || feedbacks.length === 0) {
      return {
        total: 0,
        averageRating: 0,
        satisfaction: 0,
        recent: 0,
        ratingDistribution: [],
        categoryDistribution: [],
        monthlyTrend: []
      };
    }

    const total = feedbacks.length;
    const averageRating = feedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / total;
    const satisfaction = Math.round((averageRating / 5) * 100);
    
    // Recent feedbacks (last 7 days)
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    const recent = feedbacks.filter(f => new Date(f.created_at) > weekAgo).length;

    // Rating distribution
    const ratingDistribution = [1, 2, 3, 4, 5].map(rating => {
      const count = feedbacks.filter(f => f.rating === rating).length;
      return {
        rating,
        count,
        percentage: Math.round((count / total) * 100)
      };
    }).reverse(); // Show 5 stars first

    // Category distribution with dynamic categories
    const categoryDistribution = categories.map(cat => {
      const count = feedbacks.filter(f => f.category == cat.id).length;
      return {
        category: cat.id.toString(),
        label: cat.name,
        count,
        percentage: Math.round((count / total) * 100)
      };
    }).filter(cat => cat.count > 0); // Only show categories with data

    // Monthly trend (simple implementation)
    const monthlyTrend = [];
    const now = new Date();
    for (let i = 2; i >= 0; i--) {
      const monthDate = new Date(now.getFullYear(), now.getMonth() - i, 1);
      const monthKey = monthDate.toISOString().slice(0, 7);
      const monthFeedbacks = feedbacks.filter(f => 
        f.created_at && f.created_at.startsWith(monthKey)
      );
      
      monthlyTrend.push({
        month: monthKey,
        count: monthFeedbacks.length,
        avgRating: monthFeedbacks.length > 0 
          ? monthFeedbacks.reduce((sum, f) => sum + (f.rating || 0), 0) / monthFeedbacks.length 
          : 0
      });
    }

    return {
      total,
      averageRating: Math.round(averageRating * 10) / 10,
      satisfaction,
      recent,
      ratingDistribution,
      categoryDistribution,
      monthlyTrend
    };
  };

  const handleConfigSave = async (newConfig) => {
    try {
      // Mock save operation
      console.log('Saving feedback configuration:', newConfig);
      setConfiguration(newConfig);
      setShowConfigModal(false);
    } catch (error) {
      console.error('Error saving configuration:', error);
    }
  };

  const getFilteredFeedbacks = () => {
    return feedbacks.filter(feedback => {
      const matchesRating = !filters.rating || feedback.rating.toString() === filters.rating;
      const matchesCategory = !filters.category || feedback.category.toString() === filters.category;
      const matchesSearch = !filters.search || 
        feedback.visitor_name?.toLowerCase().includes(filters.search.toLowerCase()) ||
        feedback.feedback_text?.toLowerCase().includes(filters.search.toLowerCase()) ||
        feedback.visitor_institution?.toLowerCase().includes(filters.search.toLowerCase());
      
      return matchesRating && matchesCategory && matchesSearch;
    });
  };

  const renderStars = (rating) => {
    return [...Array(5)].map((_, index) => (
      <Star
        key={index}
        size={14}
        style={{
          color: index < rating ? '#ffc107' : '#dee2e6',
          fill: index < rating ? '#ffc107' : 'transparent'
        }}
      />
    ));
  };

  const getCategoryBadgeColor = (categoryId) => {
    // Color mapping by category ID
    const colors = {
      '1': '#198754', // Pelayanan Umum - green
      '2': '#0d6efd', // Fasilitas - blue  
      '3': '#fd7e14', // Kemudahan Akses - orange
      '4': '#6f42c1', // Keramahan Staff - purple
      '5': '#20c997', // Kecepatan Layanan - teal
      '6': '#dc3545', // Kebersihan - red
      '7': '#6c757d'  // Lainnya - gray
    };
    return colors[categoryId?.toString()] || '#6c757d';
  };

  const getCategoryLabel = (categoryId) => {
    const category = categories.find(cat => cat.id == categoryId);
    return category?.name || 'Unknown Category';
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

  const tabStyle = {
    padding: '12px 20px',
    border: 'none',
    backgroundColor: 'transparent',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    display: 'flex',
    alignItems: 'center',
    gap: '8px',
    borderBottom: '3px solid transparent',
    transition: 'all 0.3s ease'
  };

  const activeTabStyle = {
    ...tabStyle,
    color: '#0d6efd',
    borderBottom: '3px solid #0d6efd',
    backgroundColor: 'white',
    fontWeight: '600'
  };

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
        <p style={{ color: '#6c757d' }}>Loading feedback data...</p>
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
              <Heart size={20} style={{ color: '#0d6efd' }} />
            </div>
            <div>
              <h2 style={{
                fontSize: '20px',
                fontWeight: '600',
                margin: '0 0 4px 0',
                color: '#495057'
              }}>
                Feedback Management
              </h2>
              <p style={{
                fontSize: '14px',
                color: '#6c757d',
                margin: '0'
              }}>
                Monitor visitor satisfaction and manage feedback system
              </p>
            </div>
          </div>
          
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              onClick={() => setShowConfigModal(true)}
              style={buttonStyle}
            >
              <Settings size={16} />
              Configure
            </button>
            <button style={buttonStyle}>
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{
        display: 'flex',
        borderBottom: '1px solid #e9ecef',
        backgroundColor: '#f8f9fa',
        overflowX: 'auto'
      }}>
        {[
          { id: 'overview', label: 'Overview', icon: BarChart3 },
          { id: 'feedbacks', label: 'All Feedbacks', icon: MessageSquare },
          { id: 'analytics', label: 'Analytics', icon: TrendingUp },
          { id: 'configuration', label: 'Configuration', icon: Settings }
        ].map((tab) => {
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              style={activeTab === tab.id ? activeTabStyle : tabStyle}
            >
              <IconComponent size={16} />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* Tab Content */}
      <div style={{ padding: '24px' }}>
        {/* Overview Tab */}
        {activeTab === 'overview' && (
          <div>
            {/* Stats Cards */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))',
              gap: '20px',
              marginBottom: '32px'
            }}>
              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#e3f2fd',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <MessageSquare size={24} style={{ color: '#0d6efd' }} />
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#0d6efd',
                  marginBottom: '8px'
                }}>
                  {statistics.total}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  fontWeight: '500'
                }}>
                  Total Feedbacks
                </div>
              </div>

              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#fff3cd',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <Star size={24} style={{ color: '#ffc107', fill: '#ffc107' }} />
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#ffc107',
                  marginBottom: '8px'
                }}>
                  {statistics.averageRating}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  fontWeight: '500'
                }}>
                  Average Rating
                </div>
              </div>

              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#d1ecf1',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <ThumbsUp size={24} style={{ color: '#198754' }} />
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#198754',
                  marginBottom: '8px'
                }}>
                  {statistics.satisfaction}%
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  fontWeight: '500'
                }}>
                  Satisfaction Rate
                </div>
              </div>

              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef',
                textAlign: 'center'
              }}>
                <div style={{
                  width: '48px',
                  height: '48px',
                  backgroundColor: '#f8d7da',
                  borderRadius: '50%',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px'
                }}>
                  <TrendingUp size={24} style={{ color: '#dc3545' }} />
                </div>
                <div style={{
                  fontSize: '32px',
                  fontWeight: '700',
                  color: '#dc3545',
                  marginBottom: '8px'
                }}>
                  {statistics.recent}
                </div>
                <div style={{
                  fontSize: '14px',
                  color: '#6c757d',
                  fontWeight: '500'
                }}>
                  This Week
                </div>
              </div>
            </div>

            {/* Charts Row */}
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 1fr',
              gap: '24px',
              marginBottom: '32px'
            }}>
              {/* Rating Distribution */}
              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0 0 20px 0',
                  color: '#495057'
                }}>
                  Rating Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {statistics.ratingDistribution?.map((item) => (
                    <div key={item.rating} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        minWidth: '60px'
                      }}>
                        <span style={{ fontSize: '14px', fontWeight: '500' }}>{item.rating}</span>
                        <Star size={14} style={{ color: '#ffc107', fill: '#ffc107' }} />
                      </div>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          backgroundColor: item.rating >= 4 ? '#198754' : item.rating >= 3 ? '#ffc107' : '#dc3545',
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        minWidth: '40px',
                        textAlign: 'right'
                      }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Category Distribution */}
              <div style={{
                padding: '24px',
                backgroundColor: 'white',
                borderRadius: '12px',
                border: '1px solid #e9ecef'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0 0 20px 0',
                  color: '#495057'
                }}>
                  Category Distribution
                </h3>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                  {statistics.categoryDistribution?.map((item) => (
                    <div key={item.category} style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '12px'
                    }}>
                      <div style={{
                        minWidth: '120px',
                        fontSize: '14px',
                        fontWeight: '500',
                        color: '#495057'
                      }}>
                        {item.label}
                      </div>
                      <div style={{
                        flex: 1,
                        height: '8px',
                        backgroundColor: '#e9ecef',
                        borderRadius: '4px',
                        overflow: 'hidden'
                      }}>
                        <div style={{
                          height: '100%',
                          width: `${item.percentage}%`,
                          backgroundColor: getCategoryBadgeColor(item.category),
                          transition: 'width 0.3s ease'
                        }}></div>
                      </div>
                      <div style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        minWidth: '40px',
                        textAlign: 'right'
                      }}>
                        {item.count}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>

            {/* Recent Feedbacks */}
            <div style={{
              padding: '24px',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                marginBottom: '20px'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#495057'
                }}>
                  Recent Feedbacks
                </h3>
                <button
                  onClick={() => setActiveTab('feedbacks')}
                  style={{
                    ...buttonStyle,
                    fontSize: '12px',
                    padding: '6px 12px'
                  }}
                >
                  <Eye size={14} />
                  View All
                </button>
              </div>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {feedbacks.slice(0, 3).map((feedback) => (
                  <div key={feedback.id} style={{
                    padding: '16px',
                    backgroundColor: '#f8f9fa',
                    borderRadius: '8px',
                    border: '1px solid #e9ecef'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'space-between',
                      marginBottom: '8px'
                    }}>
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '600',
                          color: '#495057'
                        }}>
                          {feedback.visitor_name}
                        </span>
                        <span style={{
                          fontSize: '12px',
                          color: '#6c757d'
                        }}>
                          {feedback.visitor_institution}
                        </span>
                      </div>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {renderStars(feedback.rating)}
                        </div>
                        <span style={{
                          fontSize: '11px',
                          backgroundColor: getCategoryBadgeColor(feedback.category),
                          color: 'white',
                          padding: '2px 6px',
                          borderRadius: '10px',
                          fontWeight: '600'
                        }}>
                          {configuration.categories?.find(c => c.value === feedback.category)?.label || feedback.category}
                        </span>
                      </div>
                    </div>
                    {feedback.feedback_text && (
                      <p style={{
                        fontSize: '14px',
                        color: '#6c757d',
                        margin: '0',
                        lineHeight: '1.4'
                      }}>
                        "{feedback.feedback_text}"
                      </p>
                    )}
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* All Feedbacks Tab */}
        {activeTab === 'feedbacks' && (
          <div>
            {/* Filters */}
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
                  placeholder="Search feedbacks..."
                  value={filters.search}
                  onChange={(e) => setFilters({ ...filters, search: e.target.value })}
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
              
              <select
                value={filters.rating}
                onChange={(e) => setFilters({ ...filters, rating: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                  minWidth: '120px'
                }}
              >
                <option value="">All Ratings</option>
                <option value="5">5 Stars</option>
                <option value="4">4 Stars</option>
                <option value="3">3 Stars</option>
                <option value="2">2 Stars</option>
                <option value="1">1 Star</option>
              </select>

              <select
                value={filters.category}
                onChange={(e) => setFilters({ ...filters, category: e.target.value })}
                style={{
                  padding: '10px 12px',
                  border: '1px solid #dee2e6',
                  borderRadius: '6px',
                  fontSize: '14px',
                  outline: 'none',
                  backgroundColor: 'white',
                  minWidth: '140px'
                }}
              >
                <option value="">All Categories</option>
                {configuration.categories?.map(cat => (
                  <option key={cat.value} value={cat.value}>{cat.label}</option>
                ))}
              </select>

              <button style={buttonStyle}>
                <Filter size={16} />
                More Filters
              </button>
            </div>

            {/* Feedbacks List */}
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef',
              overflow: 'hidden'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#495057'
                }}>
                  All Feedbacks ({getFilteredFeedbacks().length})
                </h3>
              </div>
              
              <div style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {getFilteredFeedbacks().map((feedback) => (
                  <div key={feedback.id} style={{
                    padding: '20px 24px',
                    borderBottom: '1px solid #f1f3f4',
                    transition: 'background-color 0.2s ease'
                  }}>
                    <div style={{
                      display: 'flex',
                      alignItems: 'flex-start',
                      justifyContent: 'space-between',
                      marginBottom: '12px'
                    }}>
                      <div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px',
                          marginBottom: '8px'
                        }}>
                          <span style={{
                            fontSize: '16px',
                            fontWeight: '600',
                            color: '#495057'
                          }}>
                            {feedback.visitor_name}
                          </span>
                          <span style={{
                            fontSize: '14px',
                            color: '#6c757d'
                          }}>
                            • {feedback.visitor_institution}
                          </span>
                          <span style={{
                            fontSize: '12px',
                            color: '#6c757d'
                          }}>
                            • {new Date(feedback.created_at).toLocaleDateString()}
                          </span>
                        </div>
                        {feedback.operator_name && (
                          <div style={{
                            fontSize: '12px',
                            color: '#6c757d',
                            marginBottom: '8px'
                          }}>
                            Operator: {feedback.operator_name}
                          </div>
                        )}
                      </div>
                      
                      <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '12px'
                      }}>
                        <div style={{ display: 'flex', gap: '2px' }}>
                          {renderStars(feedback.rating)}
                        </div>
                        <span style={{
                          fontSize: '12px',
                          backgroundColor: getCategoryBadgeColor(feedback.category),
                          color: 'white',
                          padding: '4px 8px',
                          borderRadius: '12px',
                          fontWeight: '600'
                        }}>
                          {getCategoryLabel(feedback.category)}
                        </span>
                      </div>
                    </div>
                    
                    {feedback.feedback_text && (
                      <div style={{
                        padding: '12px 16px',
                        backgroundColor: '#f8f9fa',
                        borderRadius: '8px',
                        borderLeft: '4px solid #0d6efd'
                      }}>
                        <p style={{
                          fontSize: '14px',
                          color: '#495057',
                          margin: '0',
                          lineHeight: '1.5',
                          fontStyle: 'italic'
                        }}>
                          "{feedback.feedback_text}"
                        </p>
                      </div>
                    )}
                  </div>
                ))}

                {getFilteredFeedbacks().length === 0 && (
                  <div style={{
                    padding: '40px',
                    textAlign: 'center',
                    color: '#6c757d'
                  }}>
                    <MessageSquare size={48} style={{ marginBottom: '16px', opacity: 0.5 }} />
                    <h3 style={{ margin: '0 0 8px 0' }}>No feedbacks found</h3>
                    <p style={{ margin: '0' }}>
                      {filters.search || filters.rating || filters.category 
                        ? 'Try adjusting your filters' 
                        : 'No feedback has been submitted yet'
                      }
                    </p>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}

        {/* Analytics Tab */}
        {activeTab === 'analytics' && (
          <div>
            <div style={{
              padding: '40px',
              textAlign: 'center',
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <BarChart3 size={64} style={{ color: '#6c757d', marginBottom: '16px' }} />
              <h3 style={{ margin: '0 0 8px 0', color: '#495057' }}>Analytics Coming Soon</h3>
              <p style={{ margin: '0', color: '#6c757d' }}>
                Detailed analytics and reporting features will be available in the next update.
              </p>
            </div>
          </div>
        )}

        {/* Configuration Tab */}
        {activeTab === 'configuration' && (
          <div>
            <div style={{
              backgroundColor: 'white',
              borderRadius: '12px',
              border: '1px solid #e9ecef'
            }}>
              <div style={{
                padding: '20px 24px',
                borderBottom: '1px solid #e9ecef',
                backgroundColor: '#f8f9fa'
              }}>
                <h3 style={{
                  fontSize: '16px',
                  fontWeight: '600',
                  margin: '0',
                  color: '#495057'
                }}>
                  Feedback Form Configuration
                </h3>
              </div>
              
              <div style={{ padding: '24px' }}>
                {/* Categories */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '16px'
                  }}>
                    Feedback Categories
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {configuration.categories?.map((category) => (
                      <div key={category.value} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px'
                      }}>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '12px'
                        }}>
                          <div style={{
                            width: '12px',
                            height: '12px',
                            backgroundColor: getCategoryBadgeColor(category.value),
                            borderRadius: '50%'
                          }}></div>
                          <span style={{
                            fontSize: '14px',
                            fontWeight: '500',
                            color: '#495057'
                          }}>
                            {category.label}
                          </span>
                        </div>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {category.enabled ? (
                            <CheckCircle size={16} style={{ color: '#198754' }} />
                          ) : (
                            <AlertCircle size={16} style={{ color: '#dc3545' }} />
                          )}
                          <span style={{
                            fontSize: '12px',
                            color: category.enabled ? '#198754' : '#dc3545',
                            fontWeight: '500'
                          }}>
                            {category.enabled ? 'Enabled' : 'Disabled'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Display Settings */}
                <div style={{ marginBottom: '32px' }}>
                  <h4 style={{
                    fontSize: '14px',
                    fontWeight: '600',
                    color: '#495057',
                    marginBottom: '16px'
                  }}>
                    Display Settings
                  </h4>
                  <div style={{ display: 'grid', gap: '12px' }}>
                    {Object.entries(configuration.displaySettings || {}).map(([key, value]) => (
                      <div key={key} style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        backgroundColor: '#f8f9fa',
                        border: '1px solid #e9ecef',
                        borderRadius: '8px'
                      }}>
                        <span style={{
                          fontSize: '14px',
                          fontWeight: '500',
                          color: '#495057'
                        }}>
                          {key.replace(/([A-Z])/g, ' $1').replace(/^./, str => str.toUpperCase())}
                        </span>
                        <div style={{
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px'
                        }}>
                          {value ? (
                            <CheckCircle size={16} style={{ color: '#198754' }} />
                          ) : (
                            <AlertCircle size={16} style={{ color: '#dc3545' }} />
                          )}
                          <span style={{
                            fontSize: '12px',
                            color: value ? '#198754' : '#dc3545',
                            fontWeight: '500'
                          }}>
                            {value ? 'Yes' : 'No'}
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                <div style={{ textAlign: 'center' }}>
                  <button
                    onClick={() => setShowConfigModal(true)}
                    style={primaryButtonStyle}
                  >
                    <Edit2 size={16} />
                    Edit Configuration
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Configuration Modal */}
      {showConfigModal && (
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
            maxWidth: '600px',
            maxHeight: '90vh',
            overflow: 'hidden'
          }}>
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
                Feedback Configuration
              </h3>
              <button
                onClick={() => setShowConfigModal(false)}
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

            <div style={{ padding: '24px', overflowY: 'auto', maxHeight: 'calc(90vh - 140px)' }}>
              <div style={{
                padding: '20px',
                backgroundColor: '#fff3cd',
                border: '1px solid #ffeaa7',
                borderRadius: '8px',
                marginBottom: '24px'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                  <AlertCircle size={16} style={{ color: '#856404' }} />
                  <span style={{ fontSize: '14px', fontWeight: '600', color: '#856404' }}>
                    Configuration Preview
                  </span>
                </div>
                <p style={{
                  fontSize: '14px',
                  color: '#856404',
                  margin: '0',
                  lineHeight: '1.4'
                }}>
                  This is a preview of the feedback configuration interface. 
                  Full configuration editing will be implemented in the next phase.
                </p>
              </div>

              <div style={{
                display: 'grid',
                gap: '20px'
              }}>
                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0' }}>
                    Categories
                  </h4>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {configuration.categories?.filter(c => c.enabled).length} of {configuration.categories?.length} categories enabled
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0' }}>
                    Rating Fields
                  </h4>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {configuration.ratingFields?.filter(f => f.enabled).length} of {configuration.ratingFields?.length} fields enabled
                  </div>
                </div>

                <div>
                  <h4 style={{ fontSize: '16px', fontWeight: '600', margin: '0 0 12px 0' }}>
                    Text Fields
                  </h4>
                  <div style={{ fontSize: '14px', color: '#6c757d' }}>
                    {configuration.textFields?.filter(f => f.enabled).length} of {configuration.textFields?.length} fields enabled
                  </div>
                </div>
              </div>
            </div>

            <div style={{
              padding: '20px 24px',
              borderTop: '1px solid #e9ecef',
              display: 'flex',
              gap: '12px',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={() => setShowConfigModal(false)}
                style={buttonStyle}
              >
                Cancel
              </button>
              <button
                onClick={() => handleConfigSave(configuration)}
                style={primaryButtonStyle}
              >
                <Save size={16} />
                Save Changes
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
