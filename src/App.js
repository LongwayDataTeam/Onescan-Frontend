import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { useAuthStore } from './stores/authStore';
import { NotificationProvider } from './contexts/NotificationContext';
import AudioPermissionBanner from './components/AudioPermissionBanner';

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
import Catalogue from './pages/Catalogue';
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
          <AudioPermissionBanner />
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
                style: {
                  background: '#22c55e',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '16px',
                  border: '2px solid #16a34a',
                  boxShadow: '0 10px 25px rgba(34, 197, 94, 0.3)',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#22c55e',
                },
              },
              error: {
                duration: 6000,
                style: {
                  background: '#dc2626',
                  color: '#fff',
                  fontWeight: 'bold',
                  fontSize: '18px',
                  border: '3px solid #991b1b',
                  boxShadow: '0 15px 35px rgba(220, 38, 38, 0.4)',
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px',
                },
                iconTheme: {
                  primary: '#fff',
                  secondary: '#dc2626',
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
              
              <Route path="catalogue" element={
                <RoleBasedRoute allowedRoles={['super_admin', 'developer']}>
                  <Catalogue />
                </RoleBasedRoute>
              } />
              
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
