import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import api from '../services/api';
import { authAPI } from '../services/api';

const useAuthStore = create(
  persist(
    (set, get) => ({
      // State
      isAuthenticated: false,
      user: null,
      token: null,
      loading: false,
      error: null,

      // Actions
      login: async (username, password, deviceInfo = null) => {
        set({ loading: true, error: null });
        
        try {
          // If device info is provided, use it; otherwise collect it
          let finalDeviceInfo = deviceInfo;
          if (!finalDeviceInfo) {
            console.log('📱 Collecting device info during login...');
            finalDeviceInfo = await authAPI.collectDeviceInfo();
          }
          
          const response = await authAPI.login({ username, password, deviceInfo: finalDeviceInfo });
          
          const { access_token, user_id, username: userUsername, role, permissions } = response.data;
          
          // Store token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${access_token}`;
          
          set({
            isAuthenticated: true,
            user: {
              user_id,
              username: userUsername,
              role,
              permissions,
            },
            token: access_token,
            loading: false,
            error: null,
          });
          
          // Start periodic token validation
          get().startTokenValidation();
          
          return { success: true };
        } catch (error) {
          const errorMessage = error.response?.data?.detail || 'Login failed';
          set({
            loading: false,
            error: errorMessage,
            isAuthenticated: false,
            user: null,
            token: null,
          });
          
          return { success: false, error: errorMessage };
        }
      },

      logout: () => {
        // Remove token from API service
        delete api.defaults.headers.common['Authorization'];
        
        set({
          isAuthenticated: false,
          user: null,
          token: null,
          error: null,
        });
      },

      checkAuth: async () => {
        const { token } = get();
        
        if (!token) {
          set({ isAuthenticated: false, user: null });
          return false;
        }
        
        try {
          // Set token in API service
          api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
          
          // First try to validate token (less aggressive)
          try {
            await authAPI.validateToken();
            // Token is valid, get user data
            const response = await api.get('/auth/me');
            const userData = response.data.data;
            
            set({
              isAuthenticated: true,
              user: userData,
              error: null,
            });
            
            return true;
          } catch (validationError) {
            // If validation fails, try the full user check
            const response = await api.get('/auth/me');
            const userData = response.data.data;
            
            set({
              isAuthenticated: true,
              user: userData,
              error: null,
            });
            
            return true;
          }
        } catch (error) {
          // Only logout for actual authentication failures, not temporary issues
          const errorDetail = error.response?.data?.detail || '';
          
          if (errorDetail.includes('Too many connections') || 
              errorDetail.includes('Redis') ||
              errorDetail.includes('Connection') ||
              errorDetail.includes('temporary')) {
            console.warn('Temporary authentication issue, keeping user logged in:', errorDetail);
            // Keep user logged in for temporary issues
            return true;
          }
          
          // Token is invalid, clear auth state
          set({
            isAuthenticated: false,
            user: null,
            token: null,
            error: 'Session expired',
          });
          
          // Remove token from API service
          delete api.defaults.headers.common['Authorization'];
          
          return false;
        }
      },

      updateUser: (userData) => {
        set({ user: { ...get().user, ...userData } });
      },

      clearError: () => {
        set({ error: null });
      },

      // Start periodic token validation
      startTokenValidation: () => {
        // Validate token every 4 hours (before the 5-hour expiry)
        const interval = setInterval(async () => {
          const { token, isAuthenticated } = get();
          if (token && isAuthenticated) {
            try {
              await authAPI.validateToken();
              console.log('✅ Token validation successful');
            } catch (error) {
              console.warn('⚠️ Token validation failed, but keeping user logged in:', error);
              // Don't logout immediately, let the next API call handle it
            }
          }
        }, 4 * 60 * 60 * 1000); // 4 hours
        
        // Return cleanup function
        return () => clearInterval(interval);
      },

      // Permission checks
      hasPermission: (permission) => {
        const { user } = get();
        if (!user) return false;
        
        // Super admin and developer have all permissions
        if (user.role === 'super_admin' || user.role === 'developer') {
          return true;
        }
        
        // Check specific permissions
        return user.permissions?.includes(permission) || false;
      },

      canAccessPage: (page) => {
        const { user } = get();
        if (!user) {
          return false;
        }
        
        const role = user.role;
        
        // Page access matrix
        const pageAccess = {
      
          'label-scanning': ['super_admin', 'developer', 'admin', 'manager', 'executive'],
          packing: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
          dispatch: ['super_admin', 'developer', 'admin', 'manager', 'executive'],
          revoke: ['super_admin', 'developer', 'admin', 'manager'],
          'user-management': ['super_admin', 'developer', 'admin', 'manager'],
          integration: ['developer'],
          'tracker-docs': ['developer'],
          logger: ['super_admin', 'developer', 'admin', 'manager'],
          'data-upload': ['super_admin', 'developer', 'admin', 'manager'],
          'user-profile': ['super_admin', 'developer', 'admin', 'manager', 'executive'],
          'password-approval': ['super_admin', 'developer'],
        };
        
        const hasAccess = pageAccess[page]?.includes(role) || false;
        
        return hasAccess;
      },

      // Role checks
      isSuperAdmin: () => {
        const { user } = get();
        return user?.role === 'super_admin';
      },

      isDeveloper: () => {
        const { user } = get();
        return user?.role === 'developer';
      },

      isAdmin: () => {
        const { user } = get();
        return ['super_admin', 'developer', 'admin'].includes(user?.role);
      },

      isManager: () => {
        const { user } = get();
        return ['super_admin', 'developer', 'admin', 'manager'].includes(user?.role);
      },

      isExecutive: () => {
        const { user } = get();
        return ['super_admin', 'developer', 'admin', 'manager', 'executive'].includes(user?.role);
      },
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);

export { useAuthStore };
