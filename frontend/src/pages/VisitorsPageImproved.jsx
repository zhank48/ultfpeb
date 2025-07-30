import { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { visitorsAPI, feedbackAPI } from '../utils/api.js';
import { useVisitorContext } from '../contexts/VisitorContext.jsx';
import { formatDateTime } from '../utils/index.js';
import Avatar from '../components/Avatar';
import Card from '../components/Card';
import StatusBadge from '../components/StatusBadge';
import { ActionDropdown, DropdownItem } from '../components/ActionDropdown';
import { EditVisitorModal } from '../components/EditVisitorModal';
import { VisitorEditDeleteModal } from '../components/VisitorEditDeleteModal';
import { useGlobalAlert } from '../components/SweetAlertProvider.jsx';
import FeedbackModal from '../components/FeedbackModal.jsx';
import { 
  Users, 
  Search, 
  Filter, 
  Download, 
  Eye,
  CheckCircle, 
  XCircle, 
  Clock,
  Calendar,
  Building,
  User,
  Phone,
  MapPin,
  FileText,
  MoreVertical,
  Edit,
  Trash2,
  UserPlus,
  RefreshCw
} from 'lucide-react';

export function VisitorsPageImproved() {
  const navigate = useNavigate();
  const location = useLocation();
  const { alert, confirm } = useGlobalAlert();
  const { visitorDataVersion } = useVisitorContext();
  
  const [visitors, setVisitors] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [message, setMessage] = useState('');
  const [selectedVisitor, setSelectedVisitor] = useState(null);
  const [showVisitorManageModal, setShowVisitorManageModal] = useState(false);
  
  // Feedback modal states
  const [showFeedbackModal, setShowFeedbackModal] = useState(false);
  const [feedbackVisitor, setFeedbackVisitor] = useState(null);

  useEffect(() => {
    fetchVisitors();
  }, [visitorDataVersion]);

  const fetchVisitors = async () => {
    try {
      setLoading(true);
      const response = await visitorsAPI.getAll();
      if (response.success) {
        setVisitors(response.data || []);
      } else {
        setMessage('Failed to load visitors data');
      }
    } catch (error) {
      console.error('Error fetching visitors:', error);
      setMessage('Error loading visitors data');
    } finally {
      setLoading(false);
    }
  };

  const handleRefresh = () => {
    fetchVisitors();
  };

  const handleViewVisitor = (visitor) => {
    navigate(`/app/visitors/${visitor.id}`);
  };

  const handleCheckOut = async (visitor) => {
    const result = await confirm({
      title: 'Check Out Visitor',
      text: `Check out ${visitor.full_name || visitor.name}?`,
      icon: 'question'
    });

    if (result.isConfirmed) {
      try {
        const response = await visitorsAPI.checkOut(visitor.id);
        if (response.success) {
          await alert({
            title: 'Success!',
            text: 'Visitor checked out successfully',
            icon: 'success'
          });
          fetchVisitors();
          
          // Show feedback modal
          setFeedbackVisitor(visitor);
          setShowFeedbackModal(true);
        }
      } catch (error) {
        await alert({
          title: 'Error',
          text: 'Failed to check out visitor',
          icon: 'error'
        });
      }
    }
  };

  // Feedback handlers
  const handleFeedbackClose = () => {
    setShowFeedbackModal(false);
    setFeedbackVisitor(null);
  };

  const handleFeedbackSubmit = async (feedbackData) => {
    try {
      const response = await feedbackAPI.create({
        visitor_id: feedbackVisitor.id,
        visitor_name: feedbackVisitor.full_name || feedbackVisitor.name,
        ...feedbackData
      });

      if (response && response.success) {
        alert.success('Thank you for your feedback!');
        handleFeedbackClose();
      } else {
        throw new Error(response?.message || 'Failed to submit feedback');
      }
    } catch (error) {
      console.error('Error submitting feedback:', error);
      alert.error('Failed to submit feedback. Please try again.');
    }
  };

  // Filter and search logic
  const filteredVisitors = visitors.filter(visitor => {
    const matchesSearch = !searchTerm || 
      (visitor.full_name || visitor.name || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.institution || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
      (visitor.purpose || '').toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatus = filterStatus === 'all' || 
      (filterStatus === 'active' && !visitor.check_out_time) ||
      (filterStatus === 'completed' && visitor.check_out_time);

    return matchesSearch && matchesStatus;
  });

  // Pagination
  const totalPages = Math.ceil(filteredVisitors.length / itemsPerPage);
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedVisitors = filteredVisitors.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      {/* Header */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div>
            <h1 className="text-3xl font-semibold text-gray-900 mb-1">
              Visitors Management
            </h1>
            <p className="text-gray-600">
              Manage visitor check-ins and information
            </p>
          </div>
          <div className="flex gap-3">
            <button
              onClick={handleRefresh}
              disabled={loading}
              className={`
                flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium
                transition-all duration-200
                ${loading 
                  ? 'bg-gray-200 text-gray-500 cursor-not-allowed' 
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                }
              `}
            >
              <RefreshCw size={16} className={loading ? 'animate-spin' : ''} />
              Refresh
            </button>
            <button
              onClick={() => navigate('/app/check-in')}
              className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-all duration-200"
            >
              <UserPlus size={16} />
              New Check-in
            </button>
          </div>
        </div>

        {message && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-sm mb-4">
            {message}
          </div>
        )}
      </div>

      {/* Filters */}
      <Card className="mb-6">
        <div className="flex flex-col md:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" size={20} />
              <input
                type="text"
                placeholder="Search visitors by name, institution, or purpose..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
          <div className="flex gap-3">
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="completed">Completed</option>
            </select>
            <button className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50">
              <Download size={16} />
              Export
            </button>
          </div>
        </div>
      </Card>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-blue-50 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{filteredVisitors.length}</p>
              <p className="text-gray-600 text-sm">Total Visitors</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-yellow-50 rounded-lg flex items-center justify-center">
              <Clock className="w-6 h-6 text-yellow-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredVisitors.filter(v => !v.check_out_time).length}
              </p>
              <p className="text-gray-600 text-sm">Currently Active</p>
            </div>
          </div>
        </Card>
        
        <Card>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-green-50 rounded-lg flex items-center justify-center">
              <CheckCircle className="w-6 h-6 text-green-600" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {filteredVisitors.filter(v => v.check_out_time).length}
              </p>
              <p className="text-gray-600 text-sm">Completed</p>
            </div>
          </div>
        </Card>
      </div>

      {/* Visitors Table */}
      <Card 
        title="Visitors List"
        subtitle={`${filteredVisitors.length} visitors found`}
      >
        {loading ? (
          <div className="space-y-4">
            {Array.from({ length: 5 }).map((_, index) => (
              <div key={index} className="flex items-center gap-4 p-4 border rounded-lg">
                <div className="w-12 h-12 bg-gray-200 rounded-full animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-4 bg-gray-200 rounded animate-pulse" />
                  <div className="h-3 bg-gray-200 rounded animate-pulse w-2/3" />
                </div>
                <div className="w-20 h-6 bg-gray-200 rounded animate-pulse" />
              </div>
            ))}
          </div>
        ) : paginatedVisitors.length > 0 ? (
          <div className="space-y-3">
            {paginatedVisitors.map((visitor) => (
              <div 
                key={visitor.id} 
                className="flex items-center gap-4 p-4 border border-gray-200 rounded-lg hover:border-gray-300 hover:shadow-sm transition-all duration-200"
              >
                <Avatar
                  src={visitor.photo_url}
                  fallbackText={visitor.full_name || visitor.name}
                  size="large"
                />
                
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-semibold text-gray-900 truncate">
                      {visitor.full_name || visitor.name}
                    </h3>
                    <StatusBadge 
                      status={visitor.check_out_time ? 'completed' : 'active'}
                      size="small"
                    />
                  </div>
                  <div className="flex items-center gap-4 text-sm text-gray-600">
                    <div className="flex items-center gap-1">
                      <Building size={14} />
                      <span className="truncate">{visitor.institution}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <MapPin size={14} />
                      <span className="truncate">{visitor.location}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Calendar size={14} />
                      <span>{formatDateTime(visitor.check_in_time)}</span>
                    </div>
                  </div>
                  <p className="text-sm text-gray-700 mt-1 truncate">
                    {visitor.purpose}
                  </p>
                </div>

                <div className="flex items-center gap-2 flex-shrink-0">
                  {visitor.input_by_name && (
                    <div className="hidden md:flex items-center gap-2">
                      <Avatar
                        src={visitor.input_by_avatar}
                        fallbackText={visitor.input_by_name}
                        size="small"
                      />
                      <span className="text-xs text-gray-500">
                        by {visitor.input_by_name}
                      </span>
                    </div>
                  )}
                  
                  <ActionDropdown
                    trigger={
                      <button className="p-2 hover:bg-gray-100 rounded-lg transition-colors">
                        <MoreVertical size={16} />
                      </button>
                    }
                  >
                    <DropdownItem
                      icon={<Eye size={16} />}
                      onClick={() => handleViewVisitor(visitor)}
                    >
                      View Details
                    </DropdownItem>
                    {!visitor.check_out_time && (
                      <DropdownItem
                        icon={<CheckCircle size={16} />}
                        onClick={() => handleCheckOut(visitor)}
                      >
                        Check Out
                      </DropdownItem>
                    )}
                    <DropdownItem
                      icon={<Edit size={16} />}
                      onClick={() => {
                        setSelectedVisitor(visitor);
                        setShowVisitorManageModal(true);
                      }}
                    >
                      Edit/Delete
                    </DropdownItem>
                  </ActionDropdown>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="text-center py-12">
            <Users className="w-16 h-16 mx-auto mb-4 text-gray-300" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No visitors found</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm ? 'Try adjusting your search criteria' : 'No visitors have been registered yet'}
            </p>
            <button
              onClick={() => navigate('/app/check-in')}
              className="inline-flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
            >
              <UserPlus size={16} />
              Add First Visitor
            </button>
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="flex items-center justify-between mt-6 pt-6 border-t border-gray-200">
            <div className="text-sm text-gray-600">
              Showing {startIndex + 1} to {Math.min(startIndex + itemsPerPage, filteredVisitors.length)} of {filteredVisitors.length} visitors
            </div>
            <div className="flex gap-2">
              <button
                onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                disabled={currentPage === 1}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Previous
              </button>
              {Array.from({ length: totalPages }, (_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-3 py-1 border rounded-md ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                disabled={currentPage === totalPages}
                className="px-3 py-1 border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Modals */}
      {showVisitorManageModal && selectedVisitor && (
        <VisitorEditDeleteModal
          visitor={selectedVisitor}
          onClose={() => {
            setShowVisitorManageModal(false);
            setSelectedVisitor(null);
          }}
          onSuccess={() => {
            fetchVisitors();
            setShowVisitorManageModal(false);
            setSelectedVisitor(null);
          }}
        />
      )}
      
      {/* Feedback Modal */}
      {showFeedbackModal && feedbackVisitor && (
        <FeedbackModal
          isOpen={showFeedbackModal}
          visitorId={feedbackVisitor.id}
          visitorName={feedbackVisitor.full_name || feedbackVisitor.name}
          onClose={handleFeedbackClose}
          onSubmit={handleFeedbackSubmit}
        />
      )}
    </div>
  );
}

export default VisitorsPageImproved;