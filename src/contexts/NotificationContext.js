import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { authAPI } from '../services/api';
import { useAuthStore } from '../stores/authStore';

const NotificationContext = createContext();

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotifications must be used within a NotificationProvider');
  }
  return context;
};

export const NotificationProvider = ({ children }) => {
  const { user } = useAuthStore();
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);

  // Load notifications
  const loadNotifications = useCallback(async () => {
    if (!user) return;

    try {
      setLoading(true);
      
      // Load user approval requests
      let userRequests = [];
      if (user.role === 'super_admin' || user.role === 'developer') {
        const userResponse = await authAPI.getUserApprovalRequests();
        if (userResponse.data.ok) {
          userRequests = userResponse.data.data.requests || [];
        }
      } else {
        const userResponse = await authAPI.getMyUserApprovalRequests();
        if (userResponse.data.ok) {
          userRequests = userResponse.data.data.requests || [];
        }
      }

      // Load password change requests
      let passwordRequests = [];
      if (user.role === 'super_admin' || user.role === 'developer') {
        const passwordResponse = await authAPI.getPasswordChangeRequests();
        if (passwordResponse.data.ok) {
          passwordRequests = passwordResponse.data.data.requests || [];
        }
      } else {
        const passwordResponse = await authAPI.getMyPasswordChangeRequests();
        if (passwordResponse.data.ok) {
          passwordRequests = passwordResponse.data.data.requests || [];
        }
      }

      // Combine and format notifications
      const allNotifications = [
        ...userRequests.map(req => ({
          id: req.request_id,
          type: 'user_creation',
          title: 'User Creation Request',
          message: `${req.requester_username} requested to create user: ${req.new_user_data?.username}`,
          status: req.status,
          timestamp: req.requested_at,
          data: req
        })),
        ...passwordRequests.map(req => ({
          id: req.id,
          type: 'password_change',
          title: 'Password Change Request',
          message: `${req.username} requested a password change`,
          status: req.status,
          timestamp: req.requested_at,
          data: req
        }))
      ];

      // Sort by timestamp (newest first)
      allNotifications.sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));

      setNotifications(allNotifications);
      
      // Calculate unread count (pending requests)
      const pendingCount = allNotifications.filter(n => n.status === 'pending').length;
      setUnreadCount(pendingCount);

    } catch (error) {
      console.error('Error loading notifications:', error);
    } finally {
      setLoading(false);
    }
  }, [user]);

  // Mark notification as read
  const markAsRead = useCallback((notificationId) => {
    setNotifications(prev => 
      prev.map(n => 
        n.id === notificationId ? { ...n, read: true } : n
      )
    );
    setUnreadCount(prev => Math.max(0, prev - 1));
  }, []);

  // Mark all as read
  const markAllAsRead = useCallback(() => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    setUnreadCount(0);
  }, []);

  // Clear notification
  const clearNotification = useCallback((notificationId) => {
    setNotifications(prev => prev.filter(n => n.id !== notificationId));
    setUnreadCount(prev => {
      const notification = notifications.find(n => n.id === notificationId);
      return notification && !notification.read ? Math.max(0, prev - 1) : prev;
    });
  }, [notifications]);

  // Clear all notifications
  const clearAllNotifications = useCallback(() => {
    setNotifications([]);
    setUnreadCount(0);
  }, []);

  // Refresh notifications
  const refreshNotifications = useCallback(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Load notifications on mount and when user changes
  useEffect(() => {
    loadNotifications();
  }, [loadNotifications]);

  // Set up polling for new notifications (every 30 seconds)
  useEffect(() => {
    if (!user) return;

    const interval = setInterval(() => {
      loadNotifications();
    }, 30000); // 30 seconds

    return () => clearInterval(interval);
  }, [user, loadNotifications]);

  const value = {
    notifications,
    unreadCount,
    loading,
    markAsRead,
    markAllAsRead,
    clearNotification,
    clearAllNotifications,
    refreshNotifications
  };

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  );
};
