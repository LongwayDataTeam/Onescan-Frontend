import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { authAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  User, 
  Mail, 
  Shield, 
  Edit, 
  Save, 
  X, 
  Clock, 
  CheckCircle, 
  XCircle,
  Eye,
  EyeOff
} from 'lucide-react';

const UserProfile = () => {
  const { user: currentUser } = useAuthStore();
  
  // States
  const [profileData, setProfileData] = useState({
    email: '',
    full_name: ''
  });
  const [isEditing, setIsEditing] = useState(false);
  const [loading, setLoading] = useState(false);
  
  // Password change states
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordData, setPasswordData] = useState({
    current_password: '',
    new_password: '',
    confirm_password: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [passwordLoading, setPasswordLoading] = useState(false);
  
  // Password change requests states
  const [passwordRequests, setPasswordRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'User Profile - OneScan';
  }, []);

  // Load user data on component mount
  useEffect(() => {
    if (currentUser) {
      setProfileData({
        email: currentUser.email || '',
        full_name: currentUser.full_name || ''
      });
    }
  }, [currentUser]);

  // Load password change requests
  useEffect(() => {
    loadPasswordChangeRequests();
  }, []);

  const loadPasswordChangeRequests = async () => {
    try {
      setRequestsLoading(true);
      const response = await authAPI.getMyPasswordChangeRequests();
      if (response.data.ok) {
        setPasswordRequests(response.data.data.requests || []);
      }
    } catch (error) {
      console.error('Error loading password change requests:', error);
    } finally {
      setRequestsLoading(false);
    }
  };

  const handleProfileUpdate = async () => {
    try {
      setLoading(true);
      const response = await authAPI.updateProfile(profileData);
      
      if (response.data.ok) {
        toast.success('Profile updated successfully');
        setIsEditing(false);
        // Update the auth store with new data
        // You might want to refresh the user data here
      } else {
        toast.error(response.data.message || 'Failed to update profile');
      }
    } catch (error) {
      console.error('Error updating profile:', error);
      toast.error('Failed to update profile');
    } finally {
      setLoading(false);
    }
  };

  const handlePasswordChangeRequest = async () => {
    if (passwordData.new_password !== passwordData.confirm_password) {
      toast.error('New passwords do not match');
      return;
    }

    if (passwordData.new_password.length < 6) {
      toast.error('New password must be at least 6 characters long');
      return;
    }

    try {
      setPasswordLoading(true);
      const response = await authAPI.requestPasswordChange({
        current_password: passwordData.current_password,
        new_password: passwordData.new_password
      });
      
      if (response.data.ok) {
        toast.success('Password change request submitted successfully. Awaiting approval from administrator.');
        setShowPasswordModal(false);
        setPasswordData({
          current_password: '',
          new_password: '',
          confirm_password: ''
        });
        loadPasswordChangeRequests(); // Reload requests
      } else {
        toast.error(response.data.message || 'Failed to submit password change request');
      }
    } catch (error) {
      console.error('Error submitting password change request:', error);
      toast.error('Failed to submit password change request');
    } finally {
      setPasswordLoading(false);
    }
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
          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-red-600 text-white font-bold">
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

  if (!currentUser) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <User className="w-16 h-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Loading Profile</h2>
          <p className="text-gray-600">Please wait...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Profile</h1>
          <p className="text-gray-600">Manage your profile information and password</p>
        </div>
      </div>

      {/* Profile Information */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Profile Information</h2>
          {!isEditing && (
            <button
              onClick={() => setIsEditing(true)}
              className="btn-secondary flex items-center"
            >
              <Edit className="w-4 h-4 mr-2" />
              Edit Profile
            </button>
          )}
        </div>

        <div className="space-y-4">
          {/* Username (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Username
            </label>
            <input
              type="text"
              value={currentUser.username}
              disabled
              className="input w-full bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Role (Read-only) */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Role
            </label>
            <input
              type="text"
              value={currentUser.role}
              disabled
              className="input w-full bg-gray-50 cursor-not-allowed"
            />
          </div>

          {/* Email */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Email
            </label>
            {isEditing ? (
              <input
                type="email"
                value={profileData.email}
                onChange={(e) => setProfileData({...profileData, email: e.target.value})}
                className="input w-full"
                placeholder="Enter email"
              />
            ) : (
              <input
                type="email"
                value={profileData.email || 'Not set'}
                disabled
                className="input w-full bg-gray-50 cursor-not-allowed"
              />
            )}
          </div>

          {/* Full Name */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Full Name
            </label>
            {isEditing ? (
              <input
                type="text"
                value={profileData.full_name}
                onChange={(e) => setProfileData({...profileData, full_name: e.target.value})}
                className="input w-full"
                placeholder="Enter full name"
              />
            ) : (
              <input
                type="text"
                value={profileData.full_name || 'Not set'}
                disabled
                className="input w-full bg-gray-50 cursor-not-allowed"
              />
            )}
          </div>

          {/* Last Login */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Last Login
            </label>
            <input
              type="text"
              value={currentUser.last_login ? new Date(currentUser.last_login).toLocaleString() : 'Never'}
              disabled
              className="input w-full bg-gray-50 cursor-not-allowed"
            />
          </div>
        </div>

        {/* Edit Actions */}
        {isEditing && (
          <div className="flex items-center space-x-3 mt-6 pt-6 border-t border-gray-200">
            <button
              onClick={handleProfileUpdate}
              disabled={loading}
              className="btn-primary flex items-center"
            >
              <Save className="w-4 h-4 mr-2" />
              {loading ? 'Saving...' : 'Save Changes'}
            </button>
            <button
              onClick={() => {
                setIsEditing(false);
                setProfileData({
                  email: currentUser.email || '',
                  full_name: currentUser.full_name || ''
                });
              }}
              className="btn-secondary flex items-center"
            >
              <X className="w-4 h-4 mr-2" />
              Cancel
            </button>
          </div>
        )}
      </div>

      {/* Password Management */}
      <div className="bg-white rounded-lg shadow p-6">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-medium text-gray-900">Password Management</h2>
          <button
            onClick={() => setShowPasswordModal(true)}
            className="btn-primary flex items-center"
          >
            <Shield className="w-4 h-4 mr-2" />
            Change Password
          </button>
        </div>

        <div className="text-sm text-gray-600">
          <p>Password changes require approval from a Super Admin or Developer.</p>
          <p>Your request will be reviewed and you'll be notified of the decision.</p>
        </div>
      </div>

      {/* Password Change Requests */}
      <div className="bg-white rounded-lg shadow p-6">
        <h2 className="text-lg font-medium text-gray-900 mb-6">Password Change Requests</h2>
        
        {requestsLoading ? (
          <div className="text-center py-8">
            <div className="spinner w-8 h-8 mx-auto"></div>
            <p className="text-gray-600 mt-2">Loading requests...</p>
          </div>
        ) : passwordRequests.length === 0 ? (
          <div className="text-center py-8">
            <Shield className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-600">No password change requests found</p>
          </div>
        ) : (
          <div className="space-y-4">
            {passwordRequests.map((request) => (
              <div key={request.request_id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center space-x-2">
                    {getStatusBadge(request.status)}
                    <span className="text-sm text-gray-500">
                      {request.requested_at ? new Date(request.requested_at).toLocaleString() : 'Unknown'}
                    </span>
                  </div>
                </div>
                
                {request.status === 'rejected' && request.rejection_reason && (
                  <div className="mt-2 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-800">
                      <strong>Rejection Reason:</strong> {request.rejection_reason}
                    </p>
                  </div>
                )}
                
                {request.status === 'approved' && request.approved_at && (
                  <div className="mt-2 p-3 bg-green-50 border border-green-200 rounded-md">
                    <p className="text-sm text-green-800">
                      <strong>Approved:</strong> {new Date(request.approved_at).toLocaleString()}
                    </p>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Password Change Modal */}
      {showPasswordModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Change Password</h3>
                  <button
                    onClick={() => setShowPasswordModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  {/* Current Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Current Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.current ? "text" : "password"}
                        value={passwordData.current_password}
                        onChange={(e) => setPasswordData({...passwordData, current_password: e.target.value})}
                        className="input w-full pr-10"
                        placeholder="Enter current password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, current: !showPasswords.current})}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.current ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.new ? "text" : "password"}
                        value={passwordData.new_password}
                        onChange={(e) => setPasswordData({...passwordData, new_password: e.target.value})}
                        className="input w-full pr-10"
                        placeholder="Enter new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, new: !showPasswords.new})}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.new ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  
                  {/* Confirm New Password */}
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Confirm New Password *
                    </label>
                    <div className="relative">
                      <input
                        type={showPasswords.confirm ? "text" : "password"}
                        value={passwordData.confirm_password}
                        onChange={(e) => setPasswordData({...passwordData, confirm_password: e.target.value})}
                        className="input w-full pr-10"
                        placeholder="Confirm new password"
                      />
                      <button
                        type="button"
                        onClick={() => setShowPasswords({...showPasswords, confirm: !showPasswords.confirm})}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center"
                      >
                        {showPasswords.confirm ? <EyeOff className="w-4 h-4 text-gray-400" /> : <Eye className="w-4 h-4 text-gray-400" />}
                      </button>
                    </div>
                  </div>
                  
                  <div className="bg-blue-50 border border-blue-200 rounded-md p-3">
                    <p className="text-sm text-blue-800">
                      <strong>Note:</strong> Password changes require approval from a Super Admin or Developer.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handlePasswordChangeRequest}
                  disabled={passwordLoading || !passwordData.current_password || !passwordData.new_password || !passwordData.confirm_password}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {passwordLoading ? 'Submitting...' : 'Submit Request'}
                </button>
                <button
                  onClick={() => setShowPasswordModal(false)}
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

export default UserProfile;
