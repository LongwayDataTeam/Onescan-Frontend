import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  Shield, 
  Clock, 
  CheckCircle, 
  XCircle, 
  User, 
  Calendar,
  Eye,
  EyeOff,
  RefreshCw
} from 'lucide-react';

const PasswordChangeApproval = () => {
  const { user: currentUser } = useAuthStore();
  
  // States
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [showRejectModal, setShowRejectModal] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false
  });

  // Load password change requests on component mount
  useEffect(() => {
    loadPasswordChangeRequests();
  }, []);

  const loadPasswordChangeRequests = async () => {
    try {
      setLoading(true);
      const response = await authAPI.getPasswordChangeRequests();
      if (response.data.ok) {
        const requests = response.data.data.requests || [];
        console.log('=== PASSWORD CHANGE REQUESTS DEBUG ===');
        console.log('Full API response:', response.data);
        console.log('Requests array:', requests);
        
        // Debug: Check each request object structure
        requests.forEach((request, index) => {
          console.log(`Request ${index} full object:`, request);
          console.log(`Request ${index} keys:`, Object.keys(request));
          console.log(`Request ${index} request_id:`, request.request_id);
          console.log(`Request ${index} has request_id:`, !!request.request_id);
          console.log(`Request ${index} request_id type:`, typeof request.request_id);
          console.log('---');
        });
        
        setPasswordRequests(requests);
      } else {
        toast.error(response.data.message || 'Failed to load password change requests');
      }
    } catch (error) {
      console.error('Error loading password change requests:', error);
      toast.error('Failed to load password change requests');
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (requestId) => {
    try {
      // Debug logging
      console.log('Approving password change request:', { requestId, type: typeof requestId });
      
      // Validate requestId
      if (!requestId || requestId === 'undefined' || requestId === undefined) {
        toast.error('Invalid request ID. Please refresh the page and try again.');
        console.error('Invalid requestId:', requestId);
        return;
      }
      
      setActionLoading(true);
      const response = await authAPI.approvePasswordChange(requestId);
      
      if (response.data.ok) {
        toast.success('Password change request approved successfully');
        loadPasswordChangeRequests(); // Reload the list
      } else {
        toast.error(response.data.message || 'Failed to approve request');
      }
    } catch (error) {
      console.error('Error approving password change request:', error);
      toast.error('Failed to approve request');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedRequest) return;
    
    try {
      setActionLoading(true);
      const response = await authAPI.rejectPasswordChange(selectedRequest.request_id, {
        rejection_reason: rejectionReason
      });
      
      if (response.data.ok) {
        toast.success('Password change request rejected successfully');
        setShowRejectModal(false);
        setSelectedRequest(null);
        setRejectionReason('');
        loadPasswordChangeRequests(); // Reload the list
      } else {
        toast.error(response.data.message || 'Failed to reject request');
      }
    } catch (error) {
      console.error('Error rejecting password change request:', error);
      toast.error('Failed to reject request');
    } finally {
      setActionLoading(false);
    }
  };

  const openRejectModal = (request) => {
    console.log('=== REJECT MODAL DEBUG ===');
    console.log('Request object passed to reject modal:', request);
    console.log('Request keys:', Object.keys(request));
    console.log('Request request_id:', request.request_id);
    console.log('Request request_id type:', typeof request.request_id);
    console.log('Request has request_id:', !!request.request_id);
    console.log('=======================');
    
    setSelectedRequest(request);
    setShowRejectModal(true);
  };

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

  const formatDate = (timestamp) => {
    if (!timestamp) return 'Unknown';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Check if user has permission to access this page
  if (!currentUser || !['super_admin', 'developer'].includes(currentUser.role)) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Password Change Approval</h1>
          <p className="text-gray-600">Review and manage password change requests from users</p>
        </div>
        <button
          onClick={loadPasswordChangeRequests}
          disabled={loading}
          className="btn-secondary flex items-center"
        >
          <RefreshCw className={`w-4 h-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Password Change Requests */}
      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-medium text-gray-900">Password Change Requests</h2>
          <p className="text-sm text-gray-600 mt-1">
            {passwordRequests.filter(r => r.status === 'pending').length} pending requests
          </p>
        </div>

        {loading ? (
          <div className="p-6 text-center">
            <div className="spinner w-8 h-8 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        ) : passwordRequests.length === 0 ? (
          <div className="p-6 text-center">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No password change requests found</p>
          </div>
        ) : (
          <div className="divide-y divide-gray-200">
            {passwordRequests.map((request) => (
              <div key={request.request_id} className="p-6">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-3 mb-3">
                      <User className="w-5 h-5 text-gray-400" />
                      <span className="font-medium text-gray-900">{request.username}</span>
                      {getStatusBadge(request.status)}
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">User ID:</span> {request.user_id}
                      </div>
                      <div>
                        <span className="font-medium">Requested:</span> {formatDate(request.requested_at)}
                      </div>
                      {request.approved_at && (
                        <div>
                          <span className="font-medium">Processed:</span> {formatDate(request.approved_at)}
                        </div>
                      )}
                      {request.rejection_reason && (
                        <div className="md:col-span-2">
                          <span className="font-medium">Rejection Reason:</span> {request.rejection_reason}
                        </div>
                      )}
                    </div>

                    {/* Password Preview (for pending requests) */}
                    {request.status === 'pending' && (
                      <div className="mt-4 p-4 bg-gray-50 rounded-md">
                        <h4 className="font-medium text-gray-900 mb-2">Password Change Details</h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              Current Password Hash
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.current ? "text" : "password"}
                                value={request.current_password_hash || ''}
                                readOnly
                                className="input w-full pr-10 bg-gray-100 text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPasswords.current ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                          <div>
                            <label className="block text-xs font-medium text-gray-700 mb-1">
                              New Password Hash
                            </label>
                            <div className="relative">
                              <input
                                type={showPasswords.new ? "text" : "password"}
                                value={request.new_password_hash || ''}
                                readOnly
                                className="input w-full pr-10 bg-gray-100 text-xs font-mono"
                              />
                              <button
                                type="button"
                                onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                                className="absolute inset-y-0 right-0 pr-3 flex items-center"
                              >
                                {showPasswords.new ? <EyeOff className="w-3 h-3 text-gray-400" /> : <Eye className="w-3 h-3 text-gray-400" />}
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  {request.status === 'pending' && (
                    <div className="flex flex-col space-y-2 ml-4">
                      <button
                        onClick={() => {
                          console.log('=== APPROVE BUTTON CLICK DEBUG ===');
                          console.log('Request object:', request);
                          console.log('Request request_id:', request.request_id);
                          console.log('Request keys:', Object.keys(request));
                          console.log('Current passwordRequests state:', passwordRequests);
                          handleApprove(request.request_id);
                        }}
                        disabled={actionLoading}
                        className="btn-primary text-sm px-4 py-2"
                        data-request-id={request.request_id}
                        data-username={request.username}
                      >
                        <CheckCircle className="w-4 h-4 mr-1" />
                        Approve
                      </button>
                      <button
                        onClick={() => {
                          console.log('=== REJECT BUTTON CLICK DEBUG ===');
                          console.log('Request object:', request);
                          console.log('Request request_id:', request.request_id);
                          console.log('Request keys:', Object.keys(request));
                          openRejectModal(request);
                        }}
                        disabled={actionLoading}
                        className="btn-secondary text-sm px-4 py-2"
                        data-request-id={request.request_id}
                        data-username={request.username}
                      >
                        <XCircle className="w-4 h-4 mr-1" />
                        Reject
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Reject Modal */}
      {showRejectModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Reject Password Change Request</h3>
                  <p className="text-sm text-gray-600 mt-1">
                    Are you sure you want to reject the password change request from <strong>{selectedRequest?.username}</strong>?
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">
                    Rejection Reason (Optional)
                  </label>
                  <textarea
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    className="input w-full"
                    rows={3}
                    placeholder="Provide a reason for rejection..."
                  />
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleReject}
                  disabled={actionLoading}
                  className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {actionLoading ? 'Rejecting...' : 'Reject Request'}
                </button>
                <button
                  onClick={() => {
                    setShowRejectModal(false);
                    setSelectedRequest(null);
                    setRejectionReason('');
                  }}
                  className="btn-primary mt-3 sm:mt-0 sm:ml-3"
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

export default PasswordChangeApproval;
