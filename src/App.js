import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { NotificationProvider } from './contexts/NotificationContext';

// Components
import Layout from './components/Layout';
import Login from './pages/Login';

import LabelScanning from './pages/LabelScanning';
import Packing from './pages/Packing';
import Dispatch from './pages/Dispatch';
import DataView from './pages/DataView';
import RevokePage from './pages/RevokePage';
import CancelShipment from './pages/CancelShipment';
import UserManagement from './pages/UserManagement';
import ApprovalRequests from './pages/ApprovalRequests';
import UserProfile from './pages/UserProfile';
import Integration from './pages/Integration';
import TrackerDocs from './pages/TrackerDocs';
import Logger from './pages/Logger';
import DataUpload from './pages/DataUpload';


// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }
  
  if (requiredRole && user?.role !== requiredRole) {
    return <Navigate to="/label-scanning" replace />;
  }
  
  return children;
};

// Role-based Route Component
const RoleBasedRoute = ({ children, allowedRoles = [] }) => {
  const { isAuthenticated, user } = useAuthStore();
  
  console.log('RoleBasedRoute: Checking access for roles:', allowedRoles);
  console.log('RoleBasedRoute: User authenticated:', isAuthenticated);
  console.log('RoleBasedRoute: User role:', user?.role);
  console.log('RoleBasedRoute: User:', user);
  
  if (!isAuthenticated) {
    console.log('RoleBasedRoute: Not authenticated, redirecting to login');
    return <Navigate to="/login" replace />;
  }
  
  if (allowedRoles.length > 0 && !allowedRoles.includes(user?.role)) {
    console.log('RoleBasedRoute: Role not allowed, redirecting to label-scanning');
    console.log('RoleBasedRoute: Allowed roles:', allowedRoles);
    console.log('RoleBasedRoute: User role:', user?.role);
    return <Navigate to="/label-scanning" replace />;
  }
  
  console.log('RoleBasedRoute: Access granted');
  return children;
};

function App() {
  return (
    <Router>
      <NotificationProvider>
        <div className="App">
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#22c55e',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
                },
              },
            }}
          />
          
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={<Login />} />
            
            {/* Protected Routes */}
            <Route path="/" element={
              <ProtectedRoute>
                <Layout />
              </ProtectedRoute>
            }>
              <Route index element={<Navigate to="/label-scanning" replace />} />
              
              {/* Scanning Routes */}
              <Route path="label-scanning" element={<LabelScanning />} />
              <Route path="packing" element={<Packing />} />
              <Route path="dispatch" element={<Dispatch />} />
              
              {/* Admin Routes */}
              <Route path="revoke" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <RevokePage />
                </RoleBasedRoute>
              } />
              
              <Route path="cancel-shipment" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager', 'executive']}>
                  <CancelShipment />
                </RoleBasedRoute>
              } />
              
              <Route path="user-management" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <UserManagement />
                </RoleBasedRoute>
              } />
              
              <Route path="user-approval-requests" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <ApprovalRequests />
                </RoleBasedRoute>
              } />
              
              <Route path="approval-requests" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <ApprovalRequests />
                </RoleBasedRoute>
              } />
              
              {/* Redirect old password approval route to new unified page */}
              <Route path="password-approval" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer']}>
                  <ApprovalRequests />
                </RoleBasedRoute>
              } />
              
              <Route path="user-profile" element={<UserProfile />} />
              
              <Route path="integration" element={
                <RoleBasedRoute allowedRoles={['developer']}>
                  <Integration />
                </RoleBasedRoute>
              } />
              
              <Route path="tracker-docs" element={
                <RoleBasedRoute allowedRoles={['developer']}>
                  <TrackerDocs />
                </RoleBasedRoute>
              } />
              
              <Route path="logger" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <Logger />
                </RoleBasedRoute>
              } />
              
              <Route path="data-upload" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager']}>
                  <DataUpload />
                </RoleBasedRoute>
              } />
              
              <Route path="data-view" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer', 'admin', 'manager', 'executive']}>
                  <DataView />
                </RoleBasedRoute>
              } />
            </Route>
            
            {/* Catch all route */}
            <Route path="*" element={<Navigate to="/label-scanning" replace />} />
          </Routes>
        </div>
      </NotificationProvider>
    </Router>
  );
}

export default App;
