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

export function DashboardPageImproved() {
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
  const [lastUpdate, setLastUpdate] = useState(new Date());

  useEffect(() => {
    fetchDashboardData();
    
    const interval = setInterval(() => {
      fetchDashboardData();
      setLastUpdate(new Date());
    }, 30000);

    return () => clearInterval(interval);
  }, []);

  const fetchDashboardData = async () => {
    try {
      setIsLoading(true);
      const token = localStorage.getItem('token');

      const baseUrl = import.meta.env.VITE_API_URL || 'http://localhost:3001/api';
      
      const [
        statsResponse,
        recentVisitorsResponse,
        feedbackResponse,
        complaintsResponse,
        lostItemsResponse
      ] = await Promise.all([
        fetch(`${baseUrl}/dashboard/stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/dashboard/recent-visitors`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/dashboard/feedback-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/dashboard/complaint-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        }),
        fetch(`${baseUrl}/dashboard/lost-items-stats`, {
          headers: { 'Authorization': `Bearer ${token}` }
        })
      ]);

      if (statsResponse.ok) {
        const statsData = await statsResponse.json();
        if (statsData.success) {
          setStats(prevStats => ({
            ...prevStats,
            ...statsData.data.statistics
          }));
          setUnitStats(statsData.data.statistics.unitStats || []);
        }
      }

      if (recentVisitorsResponse.ok) {
        const recentData = await recentVisitorsResponse.json();
        if (recentData.success) {
          setRecentVisitors(recentData.data.recentVisitors || []);
        }
      }

      if (feedbackResponse.ok) {
        const feedbackData = await feedbackResponse.json();
        if (feedbackData.success) {
          setStats(prevStats => ({
            ...prevStats,
            feedbackRating: feedbackData.data
          }));
        }
      }

      if (complaintsResponse.ok) {
        const complaintsData = await complaintsResponse.json();
        if (complaintsData.success) {
          setStats(prevStats => ({
            ...prevStats,
            complaints: complaintsData.data
          }));
        }
      }

      if (lostItemsResponse.ok) {
        const lostItemsData = await lostItemsResponse.json();
        if (lostItemsData.success) {
          setStats(prevStats => ({
            ...prevStats,
            lostItems: lostItemsData.data.lostItems,
            returnedItems: lostItemsData.data.returnedItems
          }));
        }
      }
      
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
      setError('Unable to load real-time data');
    } finally {
      setIsLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchDashboardData();
  };

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-2">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">
              Dashboard
            </h1>
            <p className="text-gray-600 text-sm">
              Welcome back, {user?.name || 'User'}
            </p>
          </div>
          <div className="text-right">
            <button 
              onClick={handleRefresh}
              disabled={isLoading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200 mb-1
                ${isLoading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-blue-600 text-white hover:bg-blue-700'
                }
              `}
            >
              <RefreshCw 
                size={16} 
                className={isLoading ? 'animate-spin' : ''} 
              />
              {isLoading ? 'Updating...' : 'Refresh'}
            </button>
            <div className="text-xs text-gray-500">
              Last updated: {lastUpdate.toLocaleTimeString()}
            </div>
          </div>
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm">
            ⚠️ {error}
          </div>
        )}
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Total Visitors"
          value={stats.total}
          icon={<Users />}
          trend={stats.weeklyGrowth}
          trendLabel="this week"
          color="blue"
          isLoading={isLoading}
        />

        <StatCard
          title="Visitors Hari Ini"
          value={stats.today}
          icon={<Calendar />}
          trendLabel="Real-time count"
          color="green"
          isLoading={isLoading}
        />

        <StatCard
          title="Sedang Berkunjung"
          value={stats.active}
          icon={<Activity />}
          trendLabel="Currently checked in"
          color="yellow"
          isLoading={isLoading}
        />

        <StatCard
          title="Unit Terpopuler"
          value={stats.mostVisitedUnit?.name || 'No Data'}
          icon={<Building />}
          trendLabel={`${stats.mostVisitedUnit?.visitors || 0} visitors`}
          color="purple"
          isLoading={isLoading}
        />
      </div>

      {/* Secondary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-6">
        <StatCard
          title="Rating Feedback"
          value={stats.feedbackRating.average || 0}
          icon={<Star />}
          trendLabel={`${stats.feedbackRating.total} reviews`}
          color="yellow"
          isLoading={isLoading}
        />

        <StatCard
          title="Total Complaints"
          value={stats.complaints.total}
          icon={<AlertTriangle />}
          trendLabel={`${stats.complaints.pending} pending`}
          color="red"
          isLoading={isLoading}
        />

        <StatCard
          title="Lost Items"
          value={stats.lostItems.total}
          icon={<Package />}
          trendLabel={`${stats.lostItems.found} found`}
          color="indigo"
          isLoading={isLoading}
        />

        <StatCard
          title="Items Returned"
          value={stats.returnedItems.total}
          icon={<CheckCircle />}
          trendLabel={`${stats.returnedItems.thisMonth} this month`}
          color="green"
          isLoading={isLoading}
        />
      </div>

      {/* Main Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Visitors */}
        <Card
          title="Recent Visitors"
          subtitle="Today's check-ins"
          headerIcon={<Users className="w-5 h-5 text-blue-600" />}
          headerAction={
            <button 
              onClick={() => navigate('/visitors')}
              className="text-blue-600 hover:text-blue-700 text-sm font-medium"
            >
              View All
            </button>
          }
        >
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 3 }).map((_, index) => (
                <div key={index} className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-gray-200 rounded-full animate-pulse" />
                  <div className="flex-1">
                    <div className="h-4 bg-gray-200 rounded animate-pulse mb-1" />
                    <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                  </div>
                </div>
              ))
            ) : recentVisitors.length > 0 ? (
              recentVisitors.slice(0, 5).map((visitor) => (
                <div 
                  key={visitor.id} 
                  className="flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                  onClick={() => navigate(`/visitors/${visitor.id}`)}
                >
                  <Avatar
                    src={visitor.photo_url}
                    fallbackText={visitor.full_name || visitor.name}
                    size="medium"
                  />
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900 truncate">
                      {visitor.full_name || visitor.name}
                    </p>
                    <p className="text-xs text-gray-600 truncate">
                      {visitor.institution} • {visitor.purpose}
                    </p>
                    <p className="text-xs text-gray-500">
                      {new Date(visitor.check_in_time).toLocaleTimeString()}
                    </p>
                  </div>
                  <div className="flex-shrink-0">
                    {visitor.check_out_time ? (
                      <CheckCircle className="w-4 h-4 text-green-500" />
                    ) : (
                      <Clock className="w-4 h-4 text-yellow-500" />
                    )}
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <Users className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No visitors today</p>
              </div>
            )}
          </div>
        </Card>

        {/* Unit Statistics */}
        <Card
          title="Unit Visits"
          subtitle="Distribution by location"
          headerIcon={<Building className="w-5 h-5 text-purple-600" />}
        >
          <div className="space-y-3">
            {isLoading ? (
              Array.from({ length: 5 }).map((_, index) => (
                <div key={index} className="flex items-center justify-between">
                  <div className="h-4 bg-gray-200 rounded animate-pulse flex-1 mr-4" />
                  <div className="h-4 bg-gray-200 rounded animate-pulse w-12" />
                </div>
              ))
            ) : unitStats.length > 0 ? (
              unitStats.slice(0, 6).map((unit) => (
                <div key={unit.name} className="flex items-center justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <div className="w-2 h-2 bg-purple-500 rounded-full flex-shrink-0" />
                      <span className="text-sm text-gray-900 truncate">
                        {unit.name}
                      </span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 flex-shrink-0">
                    <span className="text-sm font-medium text-gray-700">
                      {unit.visitors}
                    </span>
                    <span className="text-xs text-gray-500">
                      ({unit.percentage}%)
                    </span>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-500">
                <BarChart3 className="w-12 h-12 mx-auto mb-2 text-gray-300" />
                <p>No data available</p>
              </div>
            )}
          </div>
        </Card>
      </div>

      {/* Quick Actions */}
      <div className="mt-6">
        <Card
          title="Quick Actions"
          subtitle="Common tasks"
          headerIcon={<Settings className="w-5 h-5 text-gray-600" />}
        >
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <button
              onClick={() => navigate('/check-in')}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-all duration-200 group"
            >
              <UserPlus className="w-8 h-8 text-blue-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-blue-700">
                Check In Visitor
              </span>
            </button>

            <button
              onClick={() => navigate('/visitors')}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-green-300 hover:bg-green-50 transition-all duration-200 group"
            >
              <Users className="w-8 h-8 text-green-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-green-700">
                Manage Visitors
              </span>
            </button>

            <button
              onClick={() => navigate('/reports')}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-purple-300 hover:bg-purple-50 transition-all duration-200 group"
            >
              <BarChart3 className="w-8 h-8 text-purple-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-purple-700">
                View Reports
              </span>
            </button>

            <button
              onClick={() => navigate('/lost-items')}
              className="flex flex-col items-center p-4 rounded-lg border border-gray-200 hover:border-indigo-300 hover:bg-indigo-50 transition-all duration-200 group"
            >
              <Package className="w-8 h-8 text-indigo-600 mb-2 group-hover:scale-110 transition-transform" />
              <span className="text-sm font-medium text-gray-700 group-hover:text-indigo-700">
                Lost Items
              </span>
            </button>
          </div>
        </Card>
      </div>
    </div>
  );
}

export default DashboardPageImproved;