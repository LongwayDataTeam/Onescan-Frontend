import React, { useState, useEffect } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import NotificationDropdown from './NotificationDropdown';
import { playSuccessSound, playErrorSound, isAudioSupported, getAudioContextState } from '../utils/soundUtils';
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
  Shield,
  Database,
  Volume2,
  VolumeX,
  Book,
  FileText as FileTextIcon,
  Clock,
  DollarSign,
  ShoppingCart,
  ChevronDown,
  ChevronRight,
  LayoutDashboard,
  Warehouse,
  ClipboardList,
  Lock,
  Calendar,
  CheckCircle
} from 'lucide-react';

const Layout = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuthStore();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [showSoundTest, setShowSoundTest] = useState(false);
  const [expandedSections, setExpandedSections] = useState({ 'OMS': true });
  const [audioStatus, setAudioStatus] = useState({
    supported: false,
    contextState: 'unknown',
    initialized: false
  });

  // Navigation structure with sections and role-based access
  const navigationStructure = [
    {
      name: 'OMS',
      icon: ClipboardList,
      sections: [
        {
          name: 'B2B',
          items: [
            {
              name: 'PO Punching',
              path: '/b2b-po-punching',
              icon: FileTextIcon,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops'],
            },
            {
              name: 'Dashboard',
              path: '/b2b-dashboard',
              icon: LayoutDashboard,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops', 'exc-b2b-ops'],
            },
            {
              name: 'Pending PO',
              path: '/b2b-pending-po',
              icon: Clock,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops', 'exc-b2b-ops'],
            },
            {
              name: 'Planning PO',
              path: '/b2b-planning-po',
              icon: Calendar,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops', 'exc-b2b-ops'],
            },
            {
              name: 'Dispatch PO',
              path: '/b2b-dispatch-po',
              icon: Truck,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops', 'exc-b2b-ops'],
            },
            {
              name: 'Delivered PO',
              path: '/b2b-delivered-po',
              icon: CheckCircle,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2b-ops', 'manager-b2b-ops'],
            },
          ],
        },
        {
          name: 'B2C',
          items: [
            {
              name: 'Dashboard',
              path: '/data-view',
              icon: LayoutDashboard,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
            },
            {
              name: 'Label Scanning',
              path: '/label-scanning',
              icon: Package,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
            },
            {
              name: 'Packing Scan',
              path: '/packing',
              icon: Package,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
            },
            {
              name: 'Dispatch Scan',
              path: '/dispatch',
              icon: Truck,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
            },
            {
              name: 'Cancel Shipment',
              path: '/cancel-shipment',
              icon: X,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
            },
            {
              name: 'Revoke',
              path: '/revoke',
              icon: Settings,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops'],
            },
            {
              name: 'Data Upload',
              path: '/data-upload',
              icon: Upload,
              roles: ['super_admin', 'developer', 'admin', 'admin-b2c-ops', 'manager-b2c-ops'],
            },
          ],
        },
      ],
    },
    {
      name: 'IMS',
      icon: Warehouse,
      items: [
        {
          name: 'Physical Stock',
          path: '/ims-physical-stock',
          icon: Package,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
        {
          name: 'Sale Report',
          path: '/ims-sale-report',
          icon: BarChart3,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
        {
          name: 'Offline Stock',
          path: '/ims-offline-stock',
          icon: Database,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
      ],
    },
    {
      name: 'CMS',
      icon: Book,
      items: [
        {
          name: 'Target',
          path: '/catalogue-target-price',
          icon: DollarSign,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
        {
          name: 'Catalogue Listing',
          path: '/catalogue-listing',
          icon: Package,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
        {
          name: 'Catalogue',
          path: '/catalogue',
          icon: Book,
          roles: ['developer', 'super_admin', 'admin', 'b2b-admin-ops', 'b2b-manager-ops', 'b2c-admin-ops', 'b2c-manager-ops'],
        },
      ],
    },
    {
      name: 'Security',
      icon: Lock,
      items: [
        {
          name: 'User Management',
          path: '/user-management',
          icon: Users,
          roles: ['developer', 'super_admin', 'b2b-admin-ops', 'b2c-admin-ops'],
        },
        {
          name: 'Approval Request',
          path: '/user-approval-requests',
          icon: Shield,
          roles: ['developer', 'super_admin', 'b2b-admin-ops', 'b2c-admin-ops'],
        },
        {
          name: 'User Profile',
          path: '/user-profile',
          icon: User,
          roles: ['super_admin', 'developer', 'admin', 'manager', 'executive', 'admin-b2b-ops', 'manager-b2b-ops', 'exc-b2b-ops', 'admin-b2c-ops', 'manager-b2c-ops', 'exc-b2c-ops'],
        },
      ],
    },
    {
      name: 'Developer Only',
      icon: Settings,
      items: [
        {
          name: 'Monitoring',
          path: '/logger',
          icon: BarChart3,
          roles: ['super_admin'],
        },
        {
          name: 'Integration',
          path: '/integration',
          icon: Settings,
          roles: ['developer', 'super_admin'],
        },
      ],
    },
  ];

  // Toggle section expansion
  const toggleSection = (sectionName) => {
    setExpandedSections(prev => ({
      ...prev,
      [sectionName]: !prev[sectionName],
    }));
  };

  // Filter navigation items based on user role
  const filterNavigationByRole = (items) => {
    if (!user?.role) {
      return items;
    }
    return items.filter(item => item.roles.includes(user.role));
  };

  // Get flattened navigation for breadcrumb
  const getFlattenedNavigation = () => {
    const flattened = [];
    navigationStructure.forEach(section => {
      if (section.sections) {
        section.sections.forEach(subSection => {
          subSection.items.forEach(item => {
            if (!user?.role || item.roles.includes(user.role)) {
              flattened.push(item);
            }
          });
        });
      }
      if (section.items) {
        section.items.forEach(item => {
          if (!user?.role || item.roles.includes(user.role)) {
            flattened.push(item);
          }
        });
      }
    });
    return flattened;
  };

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

  // Test audio functionality
  const testAudio = async () => {
    try {
      // Check status
      const supported = isAudioSupported();
      const contextState = getAudioContextState();
      
      setAudioStatus({
        supported,
        contextState,
        initialized: true
      });
      
      console.log('🔊 Audio Test Results:', { supported, contextState });
      
    } catch (error) {
      console.error('🔊 Audio test failed:', error);
      setAudioStatus(prev => ({ ...prev, error: error.message }));
    }
  };

  // Close sidebar on route change
  useEffect(() => {
    setSidebarOpen(false);
  }, [location.pathname]);

  // Initialize audio on component mount
  useEffect(() => {
    testAudio();
  }, []);

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
           <nav className="flex-1 px-4 py-4 space-y-1 overflow-y-auto bg-white">
             {navigationStructure.map((section) => {
               const SectionIcon = section.icon;
               const sectionKey = section.name;
               const isSectionExpanded = expandedSections[sectionKey];
               
               // Check if section has accessible items
               let hasAccessibleItems = false;
               if (section.sections) {
                 hasAccessibleItems = section.sections.some(subSection => 
                   subSection.items.some(item => !user?.role || item.roles.includes(user.role))
                 );
               } else if (section.items) {
                 hasAccessibleItems = section.items.some(item => !user?.role || item.roles.includes(user.role));
               }
               
               if (!hasAccessibleItems) return null;
               
               return (
                 <div key={sectionKey} className="mb-2">
                   {/* Section Header */}
                   {section.sections ? (
                     <button
                       onClick={() => toggleSection(sectionKey)}
                       className="w-full flex items-center justify-between px-4 py-2.5 text-sm font-semibold text-gray-700 hover:bg-gray-50 rounded-lg transition-colors"
                     >
                       <div className="flex items-center">
                         <SectionIcon className="w-4 h-4 mr-2 text-gray-600" />
                         <span>{section.name}</span>
                       </div>
                       {isSectionExpanded ? (
                         <ChevronDown className="w-4 h-4 text-gray-500" />
                       ) : (
                         <ChevronRight className="w-4 h-4 text-gray-500" />
                       )}
                     </button>
                   ) : (
                     <div className="px-4 py-2.5 flex items-center">
                       <SectionIcon className="w-4 h-4 mr-2 text-gray-600" />
                       <span className="text-sm font-semibold text-gray-700">{section.name}</span>
                     </div>
                   )}
                   
                   {/* Section Items */}
                   {section.sections && isSectionExpanded && (
                     <div className="ml-4 mt-1 space-y-1">
                       {section.sections.map((subSection) => {
                         const filteredSubItems = filterNavigationByRole(subSection.items);
                         if (filteredSubItems.length === 0) return null;
                         
                         return (
                           <div key={subSection.name} className="mb-2">
                             <div className="px-3 py-1.5 text-xs font-semibold text-gray-500 uppercase tracking-wider">
                               {subSection.name}
                             </div>
                             <div className="space-y-1">
                               {filteredSubItems.map((item) => {
                                 const ItemIcon = item.icon;
                                 const isActive = location.pathname === item.path;
                                 
                                 return (
                                   <button
                                     key={item.name}
                                     onClick={() => handleNavigation(item.path)}
                                     className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                                       isActive
                                         ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                         : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700'
                                     }`}
                                   >
                                     <ItemIcon className={`w-4 h-4 mr-2 ${
                                       isActive ? 'text-white' : 'text-gray-500'
                                     }`} />
                                     <span className="flex-1 text-left">{item.name}</span>
                                     {isActive && (
                                       <div className="w-2 h-2 bg-white rounded-full"></div>
                                     )}
                                   </button>
                                 );
                               })}
                             </div>
                           </div>
                         );
                       })}
                     </div>
                   )}
                   
                   {section.items && (
                     <div className="ml-4 mt-1 space-y-1">
                       {filterNavigationByRole(section.items).map((item) => {
                         const ItemIcon = item.icon;
                         const isActive = location.pathname === item.path;
                         
                         return (
                           <button
                             key={item.name}
                             onClick={() => handleNavigation(item.path)}
                             className={`w-full flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-all duration-200 ${
                               isActive
                                 ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white shadow-lg'
                                 : 'text-gray-700 hover:bg-gradient-to-r hover:from-blue-50 hover:to-indigo-50 hover:text-blue-700'
                             }`}
                           >
                             <ItemIcon className={`w-4 h-4 mr-2 ${
                               isActive ? 'text-white' : 'text-gray-500'
                             }`} />
                             <span className="flex-1 text-left">{item.name}</span>
                             {isActive && (
                               <div className="w-2 h-2 bg-white rounded-full"></div>
                             )}
                           </button>
                         );
                       })}
                     </div>
                   )}
                 </div>
               );
             })}
           </nav>

           {/* Footer & Logout */}
           <div className="px-4 py-4 border-t border-gray-200 bg-gradient-to-r from-gray-50 to-blue-50">
             {/* Sound Test Section */}
             <div className="mb-3 p-3 bg-blue-50 rounded-lg border border-blue-200">
               <div className="flex items-center justify-between mb-2">
                 <h4 className="text-xs font-medium text-blue-800">🔊 Sound Test</h4>
                 <button
                   onClick={() => setShowSoundTest(!showSoundTest)}
                   className="text-xs text-blue-600 hover:text-blue-800"
                 >
                   {showSoundTest ? 'Hide' : 'Show'}
                 </button>
               </div>
               
               {showSoundTest && (
                 <div className="space-y-2">
                   <div className="text-xs text-blue-700">
                     <div>✅ Audio Supported: {audioStatus.supported ? 'Yes' : 'No'}</div>
                     <div>🎵 Context State: {audioStatus.contextState}</div>
                     <div>🔧 Initialized: {audioStatus.initialized ? 'Yes' : 'No'}</div>
                   </div>
                   
                   <div className="flex space-x-2">
                     <button
                       onClick={() => playSuccessSound()}
                       className="text-xs bg-green-600 text-white px-2 py-1 rounded hover:bg-green-700"
                     >
                       Test Success
                     </button>
                     <button
                       onClick={() => playErrorSound()}
                       className="text-xs bg-red-600 text-white px-2 py-1 rounded hover:bg-red-700"
                     >
                       Test Error
                     </button>
                   </div>
                   
                   {audioStatus.error && (
                     <div className="text-xs text-red-600 bg-red-50 p-2 rounded">
                       Error: {audioStatus.error}
                     </div>
                   )}
                 </div>
               )}
             </div>
             
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
                 <h2 className="text-lg font-semibold text-gray-900">
                   {getFlattenedNavigation().find(item => item.path === location.pathname)?.name || 'Label Scanning'}
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
