import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NotificationDropdown from './NotificationDropdown';
import { 
  Menu, 
  X, 
  Package, 
  Truck, 
  Users, 
  Settings, 
  FileText, 
  BarChart3, 
  Upload,
  LogOut,
  User,
  Shield
} from 'lucide-react';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout, canAccessPage } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Navigation items with role-based access
  const navigationItems = [
    {
      name: 'Label Scanning',
      path: '/label-scanning',
      icon: Package,
      roles: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
    },
    {
      name: 'Packing',
      path: '/packing',
      icon: Package,
      roles: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
    },
    {
      name: 'Dispatch',
      path: '/dispatch',
      icon: Truck,
      roles: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
    },
    {
      name: 'Data Upload',
      path: '/data-upload',
      icon: Upload,
    roles: ['super_admin', 'developer', 'admin', 'manager'],
    },
    {
      name: 'Revoke',
      path: '/revoke',
      icon: Settings,
      roles: ['super_admin', 'developer', 'admin', 'manager'],
    },
    {
      name: 'User Management',
      path: '/user-management',
      icon: Users,
      roles: ['super_admin', 'developer', 'admin', 'manager'],
    },
    {
      name: 'Approval Requests',
      path: '/user-approval-requests',
      icon: Shield,
      roles: ['super_admin', 'developer', 'admin', 'manager'],
    },
    {
      name: 'User Profile',
      path: '/user-profile',
      icon: User,
      roles: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
    },
    {
      name: 'Integration',
      path: '/integration',
      icon: Settings,
      roles: ['developer'],
    },
    {
      name: 'Tracker Docs',
      path: '/tracker-docs',
      icon: FileText,
      roles: ['developer'],
    },
    {
      name: 'Monitoring',
      path: '/logger',
      icon: BarChart3,
      roles: ['super_admin', 'developer', 'admin', 'manager'],
    },
  ];

  // Filter navigation items based on user role
  const filteredNavigation = navigationItems.filter(item => {
    if (!user?.role) {
      // Fallback: show all items if no role
      return true;
    }
    return item.roles.includes(user.role);
  });

  // Ensure we always have navigation items
  const displayNavigation = filteredNavigation.length > 0 ? filteredNavigation : navigationItems;

  // Get user's display role
  const getUserDisplayRole = () => {
    if (!user?.role) return 'Unknown';
    return user.role.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleNavigation = (path) => {
    navigate(path);
    setSidebarOpen(false);
  };

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Don't render if no user
  if (!user) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="spinner w-8 h-8 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 flex">
      {/* Mobile sidebar overlay */}
      {sidebarOpen && (
        <div 
          className="fixed inset-0 z-40 bg-gray-600 bg-opacity-75 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

                           {/* Sidebar */}
       <div className={`fixed inset-y-0 left-0 z-50 w-64 bg-white shadow-lg transform transition-transform duration-300 ease-in-out lg:translate-x-0 lg:static lg:inset-0 ${
         sidebarOpen ? 'translate-x-0' : '-translate-x-full'
       }`}>
         {/* Sidebar Header */}
         <div className="flex items-center justify-between h-16 px-6 border-b border-gray-200 bg-gradient-to-r from-blue-600 to-indigo-700">
           <div className="flex items-center space-x-3">
             <div className="w-8 h-8 bg-white bg-opacity-20 rounded-lg flex items-center justify-center">
               <Package className="w-5 h-5 text-white" />
             </div>
             <h1 className="text-xl font-bold text-white">OneScan</h1>
           </div>
           <button
             onClick={() => setSidebarOpen(false)}
             className="lg:hidden p-2 rounded-md text-white hover:bg-white hover:bg-opacity-20 transition-colors"
           >
             <X className="w-5 h-5" />
           </button>
         </div>

         {/* Sidebar Content */}
         <div className="flex flex-col h-full bg-white">
           {/* User info */}
           <div className="px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
             <div className="flex items-center space-x-3">
               <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-indigo-600 rounded-full flex items-center justify-center shadow-lg">
                 <User className="w-5 h-5 text-white" />
               </div>
               <div className="flex-1 min-w-0">
                 <p className="text-sm font-semibold text-gray-900 truncate">{user?.username || 'Unknown User'}</p>
                 <p className="text-xs text-gray-600 capitalize">{getUserDisplayRole()}</p>
               </div>
             </div>
           </div>

           {/* Navigation */}
           <nav className="flex-1 px-4 py-4 space-y-2 overflow-y-auto bg-white">
             {displayNavigation.length > 0 ? (
               displayNavigation.map((item) => {
                 const Icon = item.icon;
                 const isActive = location.pathname === item.path;
                 
                 return (
                   <button
                     key={item.name}
                     onClick={() => handleNavigation(item.path)}
                     className={`w-full flex items-center px-4 py-3 text-sm font-medium rounded-lg transition-all duration-200 ${
                       isActive
                         ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg transform scale-105'
                         : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700 hover:shadow-md'
                     }`}
                   >
                     <Icon className={`w-5 h-5 mr-3 ${
                       isActive ? 'text-white' : 'text-gray-500 group-hover:text-blue-600'
                     }`} />
                     <span className="font-medium">{item.name}</span>
                     {isActive && (
                       <div className="ml-auto w-2 h-2 bg-white rounded-full opacity-80"></div>
                     )}
                   </button>
                 );
               })
             ) : (
               <div className="px-4 py-3 text-sm text-gray-500 text-center bg-gray-50 rounded-lg">
                 <Package className="w-8 h-8 mx-auto mb-2 text-gray-400" />
                 <p>No accessible pages</p>
                 <p className="text-xs text-gray-400 mt-1">Contact your administrator</p>
               </div>
             )}
           </nav>

           {/* Footer & Logout */}
           <div className="px-4 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
             {/* App Version */}
             <div className="text-center mb-3">
               <p className="text-xs text-gray-500">OneScan</p>
               <p className="text-xs text-gray-400">v1.0.0</p>
             </div>
             
             {/* Logout button */}
             <button
               onClick={handleLogout}
               className="w-full flex items-center justify-center px-4 py-3 text-sm font-medium text-gray-700 bg-white hover:bg-red-50 hover:text-red-700 rounded-lg transition-all duration-200 border border-gray-200 hover:border-red-200 hover:shadow-md"
             >
               <LogOut className="w-5 h-5 mr-2 text-gray-500" />
               Sign Out
             </button>
           </div>
         </div>
       </div>

       {/* Main content */}
       <div className="flex-1 min-w-0">
         {/* Top bar */}
         <div className="sticky top-0 z-30 bg-white shadow-sm border-b border-gray-200">
           <div className="flex items-center justify-between h-16 px-6">
             <div className="flex items-center space-x-4">
               <button
                 onClick={() => setSidebarOpen(true)}
                 className="lg:hidden p-2 rounded-md text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-lg transition-colors"
               >
                 <Menu className="w-6 h-6" />
               </button>
               
               {/* Breadcrumb */}
               <div className="flex items-center space-x-2">
                 <span className="text-gray-400">/</span>
                 <h2 className="text-lg font-semibold text-gray-900">
                   {displayNavigation.find(item => item.path === location.pathname)?.name || 'Label Scanning'}
                 </h2>
               </div>
             </div>

             {/* Right side - User & Notifications */}
             <div className="flex items-center space-x-4">
               <div className="hidden md:flex items-center space-x-3 px-3 py-2 bg-gray-50 rounded-lg">
                 <div className="w-6 h-6 bg-blue-500 rounded-full flex items-center justify-center">
                   <User className="w-3 h-3 text-white" />
                 </div>
                 <span className="text-sm text-gray-700 font-medium">{user?.username}</span>
               </div>
               <NotificationDropdown />
             </div>
           </div>
         </div>

         {/* Page content */}
         <main className="p-6 bg-gray-50 min-h-screen">
           <Outlet />
         </main>
       </div>
    </div>
  );
};

export default Layout;
