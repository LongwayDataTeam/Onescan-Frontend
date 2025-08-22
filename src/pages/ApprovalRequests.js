import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { useLocation } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  UserPlus, 
  Lock, 
  Search, 
  Filter,
  Eye,
  X,
  Users,
  Key,
  Bell
} from 'lucide-react';

const ApprovalRequests = () => {
  const { user: currentUser } = useAuthStore();
  const location = useLocation();
  
  // States
  const [userRequests, setUserRequests] = useState([]);
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [typeFilter, setTypeFilter] = useState('all');
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [activeTab, setActiveTab] = useState('user'); // 'user' or 'password'
  
  // Set active tab based on navigation state or URL
  useEffect(() => {
    if (location.state?.activeTab) {
      setActiveTab(location.state.activeTab);
    } else if (location.pathname === '/password-approval') {
      // If coming from old password approval route, set password tab
      setActiveTab('password');
    }
  }, [location.state, location.pathname]);

  // Load all approval requests
  const loadApprovalRequests = async () => {
    try {
      setLoading(true);
      
      // Load user approval requests
      let userResponse;
      if (currentUser?.role === 'super_admin' || currentUser?.role === 'developer') {
        userResponse = await authAPI.getUserApprovalRequests();
      } else {
        userResponse = await authAPI.getMyUserApprovalRequests();
      }
      
      if (userResponse.data.ok) {
        setUserRequests(userResponse.data.data.requests || []);
      }
      
      // Load password change requests
      let passwordResponse;
      if (currentUser?.role === 'super_admin' || currentUser?.role === 'developer') {
        passwordResponse = await authAPI.getPasswordChangeRequests();
      } else {
        passwordResponse = await authAPI.getMyPasswordChangeRequests();
      }
      
      if (passwordResponse.data.ok) {
        setPasswordRequests(passwordResponse.data.data.requests || []);
      }
      
    } catch (error) {
      console.error('Error loading approval requests:', error);
      toast.error('Failed to load approval requests');
    } finally {
      setLoading(false);
    }
  };

  // Approve user creation request
  const handleApproveUserRequest = async (requestId) => {
    try {
      const response = await authAPI.approveUserCreation(requestId);
      
      if (response.data.ok) {
        toast.success('User creation request approved successfully');
        loadApprovalRequests(); // Reload requests list
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving user request:', error);
      toast.error(error.message || 'Failed to approve request');
    }
  };

  // Reject user creation request
  const handleRejectUserRequest = async (requestId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await authAPI.rejectUserCreation(requestId, { rejection_reason: rejectionReason });
      
      if (response.data.ok) {
        toast.success('User creation request rejected successfully');
        setRejectionReason('');
        loadApprovalRequests(); // Reload requests list
      } else {
        toast.error(response.data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting user request:', error);
      toast.error(error.message || 'Failed to reject request');
    }
  };

  // Approve password change request
  const handleApprovePasswordRequest = async (requestId) => {
    try {
      const response = await authAPI.approvePasswordChange(requestId);
      
      if (response.data.ok) {
        toast.success('Password change request approved successfully');
        loadApprovalRequests(); // Reload requests list
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving password request:', error);
      toast.error(error.message || 'Failed to approve request');
    }
  };

  // Reject password change request
  const handleRejectPasswordRequest = async (requestId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }

    try {
      const response = await authAPI.rejectPasswordChange(requestId, { rejection_reason: rejectionReason });
      
      if (response.data.ok) {
        toast.success('Password change request rejected successfully');
        setRejectionReason('');
        loadApprovalRequests(); // Reload requests list
      } else {
        toast.error(response.data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting password request:', error);
      toast.error(error.message || 'Failed to reject request');
    }
  };

  // Load requests on component mount
  useEffect(() => {
    loadApprovalRequests();
  }, []);

  // Permission checks
  const canApproveRequests = currentUser?.role && ['super_admin', 'developer'].includes(currentUser.role);
  const canViewAllRequests = currentUser?.role && ['super_admin', 'developer'].includes(currentUser.role);

  // Get status badge
  const getStatusBadge = (status) => {
    switch (status) {
      case 'pending':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
            <Clock className="w-3 h-3 mr-1" />
            Pending
          </span>
        );
      case 'approved':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
            <CheckCircle className="w-3 h-3 mr-1" />
            Approved
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
            <XCircle className="w-3 h-3 mr-1" />
            Rejected
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-gray-100 text-gray-800">
            Unknown
          </span>
        );
    }
  };

  // Get role badge color
  const getRoleBadgeColor = (role) => {
    const roleColors = {
      'executive': 'bg-gray-100 text-gray-800',
      'manager': 'bg-blue-100 text-blue-800',
      'admin': 'bg-green-100 text-green-800',
      'developer': 'bg-purple-100 text-purple-800',
      'super_admin': 'bg-red-100 text-red-800'
    };
    return roleColors[role] || 'bg-gray-100 text-gray-800';
  };

  // Filter requests based on current tab
  const getFilteredRequests = () => {
    const requests = activeTab === 'user' ? userRequests : passwordRequests;
    
    return requests.filter(request => {
      const matchesSearch = 
        (activeTab === 'user' ? 
          (request.requester_username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.new_user_data?.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.new_user_data?.full_name?.toLowerCase().includes(searchTerm.toLowerCase())) :
          (request.username?.toLowerCase().includes(searchTerm.toLowerCase()) ||
           request.user_id?.toLowerCase().includes(searchTerm.toLowerCase())));
      
      const matchesStatus = statusFilter === 'all' || request.status === statusFilter;
      
      return matchesSearch && matchesStatus;
    });
  };

  const filteredRequests = getFilteredRequests();

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">
            {activeTab === 'user' ? 'User Creation Requests' : 'Password Change Requests'}
          </h1>
          <p className="text-gray-600">
            {canViewAllRequests 
              ? `Manage all ${activeTab === 'user' ? 'user creation' : 'password change'} approval requests` 
              : `Track your submitted ${activeTab === 'user' ? 'user creation' : 'password change'} requests`
            }
          </p>
          <div className="mt-2 flex space-x-4 text-sm text-gray-500">
            <span>Total: {activeTab === 'user' ? userRequests.length : passwordRequests.length}</span>
            <span>Pending: {activeTab === 'user' ? userRequests.filter(r => r.status === 'pending').length : passwordRequests.filter(r => r.status === 'pending').length}</span>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex space-x-1">
          <button
            onClick={() => setActiveTab('user')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'user'
                ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Users className="w-4 h-4 inline mr-2" />
            User Creation ({userRequests.filter(r => r.status === 'pending').length})
          </button>
          <button
            onClick={() => setActiveTab('password')}
            className={`px-4 py-2 rounded-lg font-medium transition-colors ${
              activeTab === 'password'
                ? 'bg-primary-100 text-primary-700 border-b-2 border-primary-600'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            <Key className="w-4 h-4 inline mr-2" />
            Password Changes ({passwordRequests.filter(r => r.status === 'pending').length})
          </button>
        </div>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder={`Search ${activeTab === 'user' ? 'user creation' : 'password change'} requests...`}
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Requests Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'user' ? 'Requester' : 'User'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  {activeTab === 'user' ? 'New User Details' : 'Request Details'}
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Requested At
                </th>
                {canViewAllRequests && (
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                )}
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan={canViewAllRequests ? 5 : 4} className="px-6 py-4 text-center">
                    <div className="spinner w-6 h-6 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredRequests.length === 0 ? (
                <tr>
                  <td colSpan={canViewAllRequests ? 5 : 4} className="px-6 py-4 text-center text-gray-500">
                    No {activeTab === 'user' ? 'user creation' : 'password change'} requests found
                  </td>
                </tr>
              ) : (
                filteredRequests.map((request) => (
                  <tr key={request.request_id || request.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          {activeTab === 'user' ? (
                            <UserPlus className="w-4 h-4 text-primary-600" />
                          ) : (
                            <Lock className="w-4 h-4 text-primary-600" />
                          )}
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {activeTab === 'user' ? request.requester_username : request.username}
                          </div>
                          <div className="text-sm text-gray-500">
                            {activeTab === 'user' ? request.requester_role : 'Password Change'}
                          </div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4">
                      {activeTab === 'user' ? (
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">
                            {request.new_user_data?.username}
                          </div>
                          <div className="text-gray-500">
                            {request.new_user_data?.full_name || 'No name provided'}
                          </div>
                          <div className="text-gray-500">
                            {request.new_user_data?.email || 'No email provided'}
                          </div>
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full mt-1 ${getRoleBadgeColor(request.new_user_data?.role)}`}>
                            {request.new_user_data?.role}
                          </span>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-900">
                          <div className="font-medium">Password Change Request</div>
                          <div className="text-gray-500">User ID: {request.user_id}</div>
                          <div className="text-gray-500">Username: {request.username}</div>
                        </div>
                      )}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      {getStatusBadge(request.status)}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {request.requested_at ? new Date(request.requested_at).toLocaleDateString() : 'Unknown'}
                    </td>
                    
                    {canViewAllRequests && (
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex items-center space-x-2">
                          {request.status === 'pending' && (
                            <>
                              <button
                                onClick={() => {
                                  if (activeTab === 'user') {
                                    handleApproveUserRequest(request.request_id);
                                  } else {
                                    // Password change requests use request_id, not id
                                    handleApprovePasswordRequest(request.request_id);
                                  }
                                }}
                                className="text-green-600 hover:text-green-900 p-1"
                                title="Approve Request"
                              >
                                <CheckCircle className="w-4 h-4" />
                              </button>
                              
                              <button
                                onClick={() => {
                                  setSelectedRequest(request);
                                  setShowDetailsModal(true);
                                }}
                                className="text-red-600 hover:text-red-900 p-1"
                                title="Reject Request"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}
                          
                          {request.status !== 'pending' && (
                            <div className="text-sm text-gray-500">
                              {request.approved_by && (
                                <div>Approved by: {request.approved_by}</div>
                              )}
                              {request.rejection_reason && (
                                <div>Reason: {request.rejection_reason}</div>
                              )}
                            </div>
                          )}
                        </div>
                      </td>
                    )}
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Rejection Modal */}
      {showDetailsModal && selectedRequest && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Reject {activeTab === 'user' ? 'User Creation' : 'Password Change'} Request
                  </h3>
                  <button
                    onClick={() => setShowDetailsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Rejection Reason *
                    </label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      className="input w-full h-24"
                      placeholder="Please provide a reason for rejecting this request..."
                      required
                    />
                  </div>
                  
                  <div className="bg-gray-50 p-3 rounded-lg">
                    <h4 className="text-sm font-medium text-gray-900 mb-2">Request Details:</h4>
                    <div className="text-sm text-gray-600 space-y-1">
                      {activeTab === 'user' ? (
                        <>
                          <div><strong>Username:</strong> {selectedRequest.new_user_data?.username}</div>
                          <div><strong>Full Name:</strong> {selectedRequest.new_user_data?.full_name || 'Not provided'}</div>
                          <div><strong>Email:</strong> {selectedRequest.new_user_data?.email || 'Not provided'}</div>
                          <div><strong>Role:</strong> {selectedRequest.new_user_data?.role}</div>
                          <div><strong>Requested by:</strong> {selectedRequest.requester_username} ({selectedRequest.requester_role})</div>
                        </>
                      ) : (
                        <>
                          <div><strong>Username:</strong> {selectedRequest.username}</div>
                          <div><strong>User ID:</strong> {selectedRequest.user_id}</div>
                          <div><strong>Requested by:</strong> {selectedRequest.username}</div>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={() => {
                    if (activeTab === 'user') {
                      handleRejectUserRequest(selectedRequest.request_id);
                    } else {
                      // Password change requests use request_id, not id
                      handleRejectPasswordRequest(selectedRequest.request_id);
                    }
                    setShowDetailsModal(false);
                  }}
                  disabled={!rejectionReason.trim()}
                  className="btn-danger disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Reject Request
                </button>
                <button
                  onClick={() => setShowDetailsModal(false)}
                  className="btn-secondary mt-3 sm:mt-0 sm:ml-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ApprovalRequests;
