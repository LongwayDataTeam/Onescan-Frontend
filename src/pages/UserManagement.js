import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { toast } from 'react-hot-toast';
import { authAPI } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/soundUtils';
import { 
  Plus, 
  Search, 
  Edit, 
  Trash2, 
  Shield, 
  UserCheck, 
  UserX, 
  Filter,
  X
} from 'lucide-react';

const UserManagement = () => {
  const { user: currentUser } = useAuthStore();
  
  // States
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showPermissionsModal, setShowPermissionsModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  
  // Form states
  const [formData, setFormData] = useState({
    username: '',
    password: '',
    email: '',
    full_name: '',
    role: 'executive',
    is_active: true,
    permissions: []
  });



  // Available roles and their hierarchy
  const roles = [
    { value: 'executive', label: 'Executive', level: 1, color: 'bg-gray-100 text-gray-800' },
    { value: 'manager', label: 'Manager', level: 2, color: 'bg-blue-100 text-blue-800' },
    { value: 'admin', label: 'Admin', level: 3, color: 'bg-green-100 text-green-800' },
    { value: 'developer', label: 'Developer', level: 4, color: 'bg-purple-100 text-purple-800' },
    { value: 'super_admin', label: 'Super Admin', level: 5, color: 'bg-red-100 text-red-800' },
    // B2B Operations Roles
    { value: 'exc-b2b-ops', label: 'Executive B2B Ops', level: 2, color: 'bg-indigo-100 text-indigo-800' },
    { value: 'manager-b2b-ops', label: 'Manager B2B Ops', level: 3, color: 'bg-blue-100 text-blue-800' },
    { value: 'admin-b2b-ops', label: 'Admin B2B Ops', level: 4, color: 'bg-green-100 text-green-800' },
    { value: 'b2b-manager-ops', label: 'B2B Manager Ops', level: 3, color: 'bg-blue-100 text-blue-800' },
    { value: 'b2b-admin-ops', label: 'B2B Admin Ops', level: 4, color: 'bg-green-100 text-green-800' },
    // B2C Operations Roles
    { value: 'exc-b2c-ops', label: 'Executive B2C Ops', level: 2, color: 'bg-indigo-100 text-indigo-800' },
    { value: 'manager-b2c-ops', label: 'Manager B2C Ops', level: 3, color: 'bg-blue-100 text-blue-800' },
    { value: 'admin-b2c-ops', label: 'Admin B2C Ops', level: 4, color: 'bg-green-100 text-green-800' },
    { value: 'b2c-manager-ops', label: 'B2C Manager Ops', level: 3, color: 'bg-blue-100 text-blue-800' },
    { value: 'b2c-admin-ops', label: 'B2C Admin Ops', level: 4, color: 'bg-green-100 text-green-800' }
  ];

  // Filter roles based on current user's level
  const getAvailableRoles = () => {
    if (!currentUser?.role) return roles;
    
    const currentUserLevel = roles.find(r => r.value === currentUser.role)?.level || 1;
    return roles.filter(role => role.level <= currentUserLevel);
  };

  // Granular permissions system
  const permissionCategories = {
    'Scanning Operations': {
      'label_scan': 'Label Scanning',
      'packing_scan': 'Packing Scanning',
      'dispatch_scan': 'Dispatch Scanning',
      'packing_pending': 'Packing Pending',
      'dispatch_pending': 'Dispatch Pending'
    },
    'Data Management': {
      'data_upload': 'Data Upload',
      'data_view': 'Data View',
      'data_edit': 'Data Edit',
      'data_delete': 'Data Delete'
    },
    'User Management': {
      'user_create': 'Create Users',
      'user_edit': 'Edit Users',
      'user_delete': 'Delete Users',
      'user_view': 'View Users',
      'role_assign': 'Assign Roles'
    },
    'System Administration': {
      'system_config': 'System Configuration',
      'logs_view': 'View Logs',
      'logs_export': 'Export Logs',
      'backup_restore': 'Backup & Restore'
    },
    'Reporting & Analytics': {
      'reports_view': 'View Reports',
      'reports_create': 'Create Reports',
      'reports_export': 'Export Reports',
      'analytics_access': 'Analytics Access'
    },
    'Integration & API': {
      'api_access': 'API Access',
      'webhook_manage': 'Webhook Management',
      'third_party_integration': 'Third Party Integration'
    }
  };

  // Role-based permission templates
  const rolePermissionTemplates = {
    executive: [
      'label_scan', 'packing_scan', 'dispatch_scan', 'packing_pending', 'dispatch_pending',
      'data_view', 'reports_view'
    ],
    manager: [
      'label_scan', 'packing_scan', 'dispatch_scan', 'packing_pending', 'dispatch_pending',
      'data_upload', 'data_view', 'data_edit', 'reports_view', 'reports_create', 'reports_export'
    ],
    admin: [
      'label_scan', 'packing_scan', 'dispatch_scan', 'packing_pending', 'dispatch_pending',
      'data_upload', 'data_view', 'data_edit', 'data_delete', 'user_view', 'role_assign',
      'reports_view', 'reports_create', 'reports_export', 'analytics_access', 'logs_view'
    ],
    developer: [
      'label_scan', 'packing_scan', 'dispatch_scan', 'packing_pending', 'dispatch_pending',
      'data_upload', 'data_view', 'data_edit', 'data_delete', 'user_view', 'role_assign',
      'reports_view', 'reports_create', 'reports_export', 'analytics_access', 'logs_view',
      'logs_export', 'system_config', 'api_access', 'webhook_manage', 'third_party_integration'
    ],
    super_admin: ['*'] // All permissions
  };

  // Load users from backend
  const loadUsers = async () => {
    try {
      setLoading(true);
      
      const response = await authAPI.getUsers();
      
      if (response.data.ok) {
        setUsers(response.data.data.users || []);
      } else {
        toast.error(response.data.message || 'Failed to load users');
      }
    } catch (error) {
      console.error('Error loading users:', error);
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  // Create new user
  const handleCreateUser = async () => {
    try {
      if (!formData.username.trim() || !formData.password) {
        toast.error('Username and password are required');
        return;
      }

      const userData = {
        username: formData.username.trim(),
        password: formData.password,
        email: formData.email.trim() || null,
        full_name: formData.full_name.trim() || null,
        role: formData.role,
        permissions: formData.permissions
      };

      const response = await authAPI.createUser(userData);
      
      if (response.data.ok) {
        if (response.data.code === 202) {
          // Approval request submitted
          toast.success('User creation request submitted successfully! Awaiting approval from super admin or developer.');
          try {
            await playSuccessSound();
            console.log('🔊 UserManagement: Success sound triggered for user creation request');
          } catch (error) {
            console.error('🔊 UserManagement: Failed to trigger success sound:', error);
          }
          setShowCreateModal(false);
          resetForm();
        } else {
          // User created directly
          toast.success('User created successfully');
          try {
            await playSuccessSound();
            console.log('🔊 UserManagement: Success sound triggered for user creation');
          } catch (error) {
            console.error('🔊 UserManagement: Failed to trigger success sound:', error);
          }
          setShowCreateModal(false);
          resetForm();
          loadUsers(); // Reload users list
        }
      } else {
        toast.error(response.data.message || 'Failed to create user');
        try {
          await playErrorSound();
          console.log('🔊 UserManagement: Error sound triggered for user creation failure');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger error sound:', error);
        }
      }
    } catch (error) {
      console.error('Error creating user:', error);
      toast.error(error.message || 'Failed to create user');
      try {
        await playErrorSound();
        console.log('🔊 UserManagement: Error sound triggered for user creation network error');
      } catch (soundError) {
        console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
      }
    }
  };

  // Update existing user
  const handleUpdateUser = async () => {
    try {
      if (!selectedUser) return;

      const updateData = {
        email: formData.email.trim() || null,
        full_name: formData.full_name.trim() || null,
        role: formData.role,
        permissions: formData.permissions,
        is_active: formData.is_active
      };

      const response = await authAPI.updateUser(selectedUser.user_id, updateData);
      
      if (response.data.ok) {
        toast.success('User updated successfully');
        try {
          await playSuccessSound();
          console.log('🔊 UserManagement: Success sound triggered for user update');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger success sound:', error);
        }
        setShowEditModal(false);
        loadUsers(); // Reload users list
      } else {
        toast.error(response.data.message || 'Failed to update user');
        try {
          await playErrorSound();
          console.log('🔊 UserManagement: Error sound triggered for user update failure');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger error sound:', error);
        }
      }
    } catch (error) {
      console.error('Error updating user:', error);
      toast.error(error.message || 'Failed to update user');
      try {
        await playErrorSound();
        console.log('🔊 UserManagement: Error sound triggered for user update network error');
      } catch (soundError) {
        console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
      }
    }
  };

  // Delete user
  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return;
    }

    try {
      const response = await authAPI.deleteUser(userId);
      
      if (response.data.ok) {
        toast.success('User deleted successfully');
        try {
          await playSuccessSound();
          console.log('🔊 UserManagement: Success sound triggered for user deletion');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger success sound:', error);
        }
        loadUsers(); // Reload users list
      } else {
        toast.error(response.data.message || 'Failed to delete user');
        try {
          await playErrorSound();
          console.log('🔊 UserManagement: Error sound triggered for user deletion failure');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger error sound:', error);
        }
      }
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error(error.message || 'Failed to delete user');
      try {
        await playErrorSound();
        console.log('🔊 UserManagement: Error sound triggered for user deletion network error');
      } catch (soundError) {
        console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
      }
    }
  };

  // Toggle user status
  const handleToggleUserStatus = async (userId, currentStatus) => {
    try {
      const updateData = { is_active: !currentStatus };

      const response = await authAPI.updateUser(userId, updateData);
      
      if (response.data.ok) {
        toast.success(`User ${currentStatus ? 'deactivated' : 'activated'} successfully`);
        try {
          await playSuccessSound();
          console.log('🔊 UserManagement: Success sound triggered for user status change');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger success sound:', error);
        }
        loadUsers(); // Reload users list
      } else {
        toast.error(response.data.message || 'Failed to update user status');
        try {
          await playErrorSound();
          console.log('🔊 UserManagement: Error sound triggered for user status update failure');
        } catch (error) {
          console.error('🔊 UserManagement: Failed to trigger error sound:', error);
        }
      }
    } catch (error) {
      console.error('Error updating user status:', error);
      toast.error(error.message || 'Failed to update user status');
      try {
        await playErrorSound();
        console.log('🔊 UserManagement: Error sound triggered for user status update network error');
      } catch (soundError) {
        console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
      }
    }
  };

  // Set document title
  useEffect(() => {
    // Set title immediately
    document.title = 'User Management - OneScan';
    
    // Also set it after a short delay to ensure it takes effect
    const timer = setTimeout(() => {
      document.title = 'User Management - OneScan';
      console.log('Title set to:', document.title);
    }, 100);
    
    return () => clearTimeout(timer);
  }, []);

  // Load users on component mount
  useEffect(() => {
    loadUsers();
  }, []);
  
  // Ensure title is set correctly on every render
  useEffect(() => {
    if (document.title !== 'User Management - OneScan') {
      document.title = 'User Management - OneScan';
      console.log('Title corrected to:', document.title);
    }
  });
  
  // Force title update on component mount and after data loads
  useEffect(() => {
    const updateTitle = () => {
      document.title = 'User Management - OneScan';
      console.log('Title force updated to:', document.title);
    };
    
    // Update title immediately
    updateTitle();
    
    // Update title after a short delay
    const timer = setTimeout(updateTitle, 200);
    
    // Update title after data loads
    if (!loading) {
      updateTitle();
    }
    
    return () => clearTimeout(timer);
  }, [loading]);

  // Reset form
  const resetForm = () => {
    setFormData({
      username: '',
      password: '',
      email: '',
      full_name: '',
      role: 'executive',
      is_active: true,
      permissions: []
    });
    setSelectedUser(null);
  };

  // Handle role change
  const handleRoleChange = (role) => {
    setFormData({ ...formData, role });
    
    // Set default permissions based on role
    const defaultPermissions = rolePermissionTemplates[role] || [];
    setFormData(prev => ({ ...prev, permissions: defaultPermissions }));
  };

  // Handle permission toggle
  const handlePermissionToggle = (permission) => {
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.includes(permission)
        ? prev.permissions.filter(p => p !== permission)
        : [...prev.permissions, permission]
    }));
  };

  // Select all permissions in a category
  const handleSelectAllPermissions = (category) => {
    const categoryPermissions = Object.keys(permissionCategories[category]);
    setFormData(prev => ({
      ...prev,
      permissions: [...new Set([...prev.permissions, ...categoryPermissions])]
    }));
  };

  // Deselect all permissions in a category
  const handleDeselectAllPermissions = (category) => {
    const categoryPermissions = Object.keys(permissionCategories[category]);
    setFormData(prev => ({
      ...prev,
      permissions: prev.permissions.filter(p => !categoryPermissions.includes(p))
    }));
  };

  // Open edit modal
  const openEditModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '', // Don't show password in edit
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      permissions: user.permissions || []
    });
    setShowEditModal(true);
  };

  // Open permissions modal
  const openPermissionsModal = (user) => {
    setSelectedUser(user);
    setFormData({
      username: user.username,
      password: '',
      email: user.email || '',
      full_name: user.full_name || '',
      role: user.role,
      is_active: user.is_active,
      permissions: user.permissions || []
    });
    setShowPermissionsModal(true);
  };

  // Permission checks - users can manage users at or below their level
  // Permission checking - User management accessible to all roles EXCEPT executive
  const canManageUsers = currentUser?.role && [
    'manager', 'admin', 'developer', 'super_admin',
    'admin-b2b-ops', 'admin-b2c-ops', 'b2b-admin-ops', 'b2c-admin-ops'
  ].includes(currentUser.role);
  const canDeleteUsers = currentUser?.role && [
    'admin', 'developer', 'super_admin',
    'admin-b2b-ops', 'admin-b2c-ops', 'b2b-admin-ops', 'b2c-admin-ops'
  ].includes(currentUser.role);
  const canAssignRoles = currentUser?.role && [
    'admin', 'developer', 'super_admin',
    'admin-b2b-ops', 'admin-b2c-ops', 'b2b-admin-ops', 'b2c-admin-ops'
  ].includes(currentUser.role);

  // Filter users
  const filteredUsers = users.filter(user => {
    const matchesSearch = user.username.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         (user.full_name && user.full_name.toLowerCase().includes(searchTerm.toLowerCase())) ||
                         (user.email && user.email.toLowerCase().includes(searchTerm.toLowerCase()));
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter;
    const matchesStatus = statusFilter === 'all' || 
                         (statusFilter === 'active' && user.is_active) ||
                         (statusFilter === 'inactive' && !user.is_active);
    
    return matchesSearch && matchesRole && matchesStatus;
  });

  if (!canManageUsers) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-center">
          <Shield className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access User Management.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">User Management</h1>
          <p className="text-gray-600">Manage users, roles, and permissions</p>
        </div>
        <button
          onClick={() => setShowCreateModal(true)}
          className="btn-primary flex items-center"
        >
          <Plus className="w-4 h-4 mr-2" />
          Create User
        </button>
      </div>

      {/* Filters and Search */}
      <div className="bg-white rounded-lg shadow p-4">
        <div className="flex flex-col sm:flex-row gap-4">
          <div className="flex-1">
            <div className="relative">
              <Search className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
              <input
                type="text"
                placeholder="Search users..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-full focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
            </div>
          </div>
          
                     <select
             value={roleFilter}
             onChange={(e) => setRoleFilter(e.target.value)}
             className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
           >
             <option value="all">All Roles</option>
             {getAvailableRoles().map(role => (
               <option key={role.value} value={role.value}>{role.label}</option>
             ))}
           </select>
          
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value="all">All Status</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-lg shadow overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  User
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Last Login
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {loading ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center">
                    <div className="spinner w-6 h-6 mx-auto"></div>
                  </td>
                </tr>
              ) : filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan="5" className="px-6 py-4 text-center text-gray-500">
                    No users found
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => (
                  <tr key={user.user_id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-8 h-8 bg-primary-100 rounded-full flex items-center justify-center">
                          {/* Assuming Users icon is used for all users */}
                          <Shield className="w-4 h-4 text-primary-600" />
                        </div>
                        <div className="ml-3">
                          <div className="text-sm font-medium text-gray-900">
                            {user.full_name || user.username}
                          </div>
                          <div className="text-sm text-gray-500">{user.email || 'No email'}</div>
                        </div>
                      </div>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        roles.find(r => r.value === user.role)?.color || 'bg-gray-100 text-gray-800'
                      }`}>
                        {roles.find(r => r.value === user.role)?.label || user.role}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex items-center px-2 py-1 rounded-full text-xs font-medium ${
                        user.is_active
                          ? 'bg-green-100 text-green-800'
                          : 'bg-red-100 text-red-800'
                      }`}>
                        {user.is_active ? (
                          <>
                            <UserCheck className="w-3 h-3 mr-1" />
                            Active
                          </>
                        ) : (
                          <>
                            <UserX className="w-3 h-3 mr-1" />
                            Inactive
                          </>
                        )}
                      </span>
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {user.last_login ? new Date(user.last_login).toLocaleDateString() : 'Never'}
                    </td>
                    
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center space-x-2">
                        <button
                          onClick={() => openEditModal(user)}
                          className="text-primary-600 hover:text-primary-900 p-1"
                          title="Edit User"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => openPermissionsModal(user)}
                          className="text-purple-600 hover:text-purple-900 p-1"
                          title="Manage Permissions"
                        >
                          <Shield className="w-4 h-4" />
                        </button>
                        
                        <button
                          onClick={() => handleToggleUserStatus(user.user_id, user.is_active)}
                          className={`p-1 ${
                            user.is_active
                              ? 'text-orange-600 hover:text-orange-900'
                              : 'text-green-600 hover:text-green-900'
                          }`}
                          title={user.is_active ? 'Deactivate User' : 'Activate User'}
                        >
                          {user.is_active ? <UserX className="w-4 h-4" /> : <UserCheck className="w-4 h-4" />}
                        </button>
                        
                        {canDeleteUsers && (
                          <button
                            onClick={() => handleDeleteUser(user.user_id)}
                            className="text-red-600 hover:text-red-900 p-1"
                            title="Delete User"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Create User Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Create New User</h3>
                  <button
                    onClick={() => setShowCreateModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username *
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="input w-full"
                      placeholder="Enter username"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Password *
                    </label>
                    <input
                      type="password"
                      value={formData.password || ''}
                      onChange={(e) => setFormData({...formData, password: e.target.value})}
                      className="input w-full"
                      placeholder="Enter password"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input w-full"
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="input w-full"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                                     <div>
                     <label className="block text-sm font-medium text-gray-700 mb-1">
                       Role *
                     </label>
                     <select
                       value={formData.role}
                       onChange={(e) => handleRoleChange(e.target.value)}
                       className="input w-full"
                     >
                       {getAvailableRoles().map(role => (
                         <option key={role.value} value={role.value}>{role.label}</option>
                       ))}
                     </select>
                   </div>
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleCreateUser}
                  disabled={!formData.username.trim() || !formData.password}
                  className="btn-primary disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Create User
                </button>
                <button
                  onClick={() => setShowCreateModal(false)}
                  className="btn-secondary mt-3 sm:mt-0 sm:ml-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Edit User Modal */}
      {showEditModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-lg sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Edit User</h3>
                  <button
                    onClick={() => setShowEditModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Username
                    </label>
                    <input
                      type="text"
                      value={formData.username}
                      onChange={(e) => setFormData({...formData, username: e.target.value})}
                      className="input w-full"
                      disabled
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Email
                    </label>
                    <input
                      type="email"
                      value={formData.email}
                      onChange={(e) => setFormData({...formData, email: e.target.value})}
                      className="input w-full"
                      placeholder="Enter email"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Full Name
                    </label>
                    <input
                      type="text"
                      value={formData.full_name}
                      onChange={(e) => setFormData({...formData, full_name: e.target.value})}
                      className="input w-full"
                      placeholder="Enter full name"
                    />
                  </div>
                  
                                     {canAssignRoles && (
                     <div>
                       <label className="block text-sm font-medium text-gray-700 mb-1">
                         Role
                       </label>
                       <select
                         value={formData.role}
                         onChange={(e) => handleRoleChange(e.target.value)}
                         className="input w-full"
                       >
                         {getAvailableRoles().map(role => (
                           <option key={role.value} value={role.value}>{role.label}</option>
                         ))}
                       </select>
                     </div>
                   )}
                  
                  <div className="flex items-center">
                    <input
                      type="checkbox"
                      id="edit_is_active"
                      checked={formData.is_active}
                      onChange={(e) => setFormData({...formData, is_active: e.target.checked})}
                      className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                    />
                    <label htmlFor="edit_is_active" className="ml-2 block text-sm text-gray-900">
                      Active
                    </label>
                  </div>
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                <button
                  onClick={handleUpdateUser}
                  className="btn-primary"
                >
                  Update User
                </button>
                <button
                  onClick={() => setShowEditModal(false)}
                  className="btn-secondary mt-3 sm:mt-0 sm:ml-3"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Permissions Modal */}
      {showPermissionsModal && (
        <div className="fixed inset-0 z-50 overflow-y-auto">
          <div className="flex items-center justify-center min-h-screen pt-4 px-4 pb-20 text-center sm:block sm:p-0">
            <div className="fixed inset-0 bg-gray-500 bg-opacity-75 transition-opacity"></div>
            
            <div className="inline-block align-bottom bg-white rounded-lg text-left overflow-hidden shadow-xl transform transition-all sm:my-8 sm:align-middle sm:max-w-4xl sm:w-full">
              <div className="bg-white px-4 pt-5 pb-4 sm:p-6 sm:pb-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    Manage Permissions - {selectedUser?.username}
                  </h3>
                  <button
                    onClick={() => setShowPermissionsModal(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="space-y-6">
                  {Object.entries(permissionCategories).map(([category, permissions]) => (
                    <div key={category} className="border border-gray-200 rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="text-sm font-medium text-gray-900">{category}</h4>
                        <div className="flex space-x-2">
                          <button
                            onClick={() => handleSelectAllPermissions(category)}
                            className="text-xs text-primary-600 hover:text-primary-800"
                          >
                            Select All
                          </button>
                          <button
                            onClick={() => handleDeselectAllPermissions(category)}
                            className="text-xs text-gray-600 hover:text-gray-800"
                          >
                            Deselect All
                          </button>
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                        {Object.entries(permissions).map(([permission, label]) => (
                          <label key={permission} className="flex items-center">
                            <input
                              type="checkbox"
                              checked={formData.permissions.includes(permission)}
                              onChange={() => handlePermissionToggle(permission)}
                              className="h-4 w-4 text-primary-600 focus:ring-primary-500 border-gray-300 rounded"
                            />
                            <span className="ml-2 text-sm text-gray-700">{label}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
              
              <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:flex sm:flex-row-reverse">
                                 <button
                   onClick={async () => {
                     try {
                       if (!selectedUser) return;
                       
                       const updateData = { permissions: formData.permissions };
                       
                       const response = await authAPI.updateUser(selectedUser.user_id, updateData);
                       
                       if (response.data.ok) {
                         toast.success('Permissions updated successfully');
                         try {
                           await playSuccessSound();
                           console.log('🔊 UserManagement: Success sound triggered for permissions update');
                         } catch (error) {
                           console.error('🔊 UserManagement: Failed to trigger success sound:', error);
                         }
                         setShowPermissionsModal(false);
                         loadUsers(); // Reload users list
                       } else {
                         toast.error(response.data.message || 'Failed to update permissions');
                         try {
                           await playErrorSound();
                           console.log('🔊 UserManagement: Error sound triggered for permissions update failure');
                         } catch (soundError) {
                           console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
                         }
                       }
                     } catch (error) {
                       console.error('Error updating permissions:', error);
                       toast.error(error.message || 'Failed to update permissions');
                       try {
                         await playErrorSound();
                         console.log('🔊 UserManagement: Error sound triggered for permissions update network error');
                       } catch (soundError) {
                         console.error('🔊 UserManagement: Failed to trigger error sound:', soundError);
                       }
                     }
                   }}
                   className="btn-primary"
                 >
                   Save Permissions
                 </button>
                <button
                  onClick={() => setShowPermissionsModal(false)}
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

export default UserManagement;
