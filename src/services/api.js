import axios from 'axios';

// Create axios instance
const api = axios.create({
  baseURL: process.env.REACT_APP_API_URL || 'https://onescan-backend-lw-v-2-0-1-477154991805.asia-south1.run.app',
  timeout: 120000, // 120 seconds - increased for Redis operations
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor to add auth token
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('auth-storage') 
      ? JSON.parse(localStorage.getItem('auth-storage')).state.token 
      : null;
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// Response interceptor to handle errors
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // Only auto-logout for specific 401 errors, not all
      const errorDetail = error.response?.data?.detail || '';
      
      // Don't auto-logout for Redis connection issues or temporary errors
      if (errorDetail.includes('Too many connections') || 
          errorDetail.includes('Redis') ||
          errorDetail.includes('Connection') ||
          errorDetail.includes('temporary')) {
        console.warn('Temporary authentication issue, not logging out:', errorDetail);
        return Promise.reject(error);
      }
      
      // Only logout for actual authentication failures
      if (errorDetail.includes('Could not validate credentials') ||
          errorDetail.includes('Token expired') ||
          errorDetail.includes('Invalid token')) {
        console.log('Authentication failed, logging out user');
        localStorage.removeItem('auth-storage');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

// API endpoints
export const authAPI = {
  login: async (credentials) => {
    try {
      console.log('🔐 Starting login process...');
      console.log('📱 Collecting device info...');
      const deviceInfo = await collectDeviceInfo();
      console.log('✅ Device info collected successfully:', deviceInfo);
      
      const requestData = { ...credentials, deviceInfo };
      console.log('📤 Sending login request with data:', requestData);
      
      const response = await api.post('/auth/login', requestData);
      console.log('✅ Login response received:', response);
      return response;
    } catch (error) {
      console.error('❌ Error collecting device info:', error);
      console.error('❌ Error details:', error.message);
      // Fallback to login without device info
      console.log('🔄 Falling back to login without device info...');
      return api.post('/auth/login', credentials);
    }
  },
  getCurrentUser: () => api.get('/auth/me'),
  validateToken: () => api.get('/auth/validate-token'),
  createUser: (userData) => api.post('/auth/users', userData),
  getUsers: () => api.get('/auth/users'),
  updateUser: (userId, userData) => api.put(`/auth/users/${userId}`, userData),
  deleteUser: (userId) => api.delete(`/auth/users/${userId}`),
  
  // Profile management
  updateProfile: (profileData) => api.put('/auth/me', profileData),
  requestPasswordChange: (passwordData) => api.post('/auth/me/change-password', passwordData),
  getMyPasswordChangeRequests: () => api.get('/auth/me/password-change-requests'),
  
  // Password change approval (Super Admin/Developer only)
  getPasswordChangeRequests: () => api.get('/auth/password-change-requests'),
  approvePasswordChange: (requestId) => api.put(`/auth/password-change-requests/${requestId}/approve`),
  rejectPasswordChange: (requestId, rejectionData) => api.put(`/auth/password-change-requests/${requestId}/reject`, rejectionData),
  
  // User approval requests
  getUserApprovalRequests: () => api.get('/auth/user-approval-requests'),
  getMyUserApprovalRequests: () => api.get('/auth/user-approval-requests/my-requests'),
  approveUserCreation: (requestId) => api.put(`/auth/user-approval-requests/${requestId}/approve`),
  rejectUserCreation: (requestId, rejectionData) => api.put(`/auth/user-approval-requests/${requestId}/reject`, rejectionData),
};

export const scanAPI = {
  labelScan: (data) => api.post('/scan/label', data),
  packingScan: (data) => api.post('/scan/packing', data),
  packingPending: (data) => api.post('/scan/packing-pending', data),
  validateTrackingForPacking: (data) => api.post('/scan/validate-tracking-packing', data),
  validatePackingComplete: (data) => api.post('/scan/validate-packing-complete', data),
  getPackingProgress: (data) => api.post('/scan/packing-progress', data),
  debugTracking: (data) => api.post('/scan/debug-tracking', data),
  dispatchPending: (data) => api.post('/scan/dispatch-pending', data),
  dispatchScan: (data) => api.post('/scan/dispatch', data),
  prewarmDispatch: () => api.post('/scan/prewarm-dispatch'),
  revokeStatus: (data) => api.post('/scan/revoke', data),
  getCurrentStatus: (trackingId) => api.get(`/scan/status/${trackingId}`),
  cancelShipment: (data) => api.post('/scan/cancel', data),
};

export const adminAPI = {
  revokeShipment: (data) => api.post('/admin/revoke', data),
  getPackingPending: () => api.get('/admin/pending/packing'),
  getDispatchPending: () => api.get('/admin/pending/dispatch'),

};

export const dataAPI = {
  uploadData: (formData) => api.post('/data/upload', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 600000, // 10 minutes for upload
  }),
  uploadWithMapping: (formData) => api.post('/data/upload-with-mapping', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 600000, // 10 minutes for upload with mapping
  }),
  previewData: (formData) => api.post('/data/preview', formData, {
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    timeout: 60000, // 1 minute for preview
  }),
  getTrackingDetails: (trackingId) => api.get(`/data/tracking/${trackingId}`),
  getUploadHistory: () => api.get('/data/upload-history'),
  getAllUploadedData: (page = 1, pageSize = 100) => api.get(`/data/all-data?page=${page}&page_size=${pageSize}`),
  getAllDataForStats: async () => {
    try {
      let allData = [];
      let page = 1;
      let hasMoreData = true;
      const pageSize = 1000; // Use larger page size for efficiency
      
      console.log('🔄 Fetching all data for statistics...');
      
      while (hasMoreData) {
        const response = await api.get(`/data/all-data?page=${page}&page_size=${pageSize}`);
        
        if (response.data?.data?.records && Array.isArray(response.data.data.records)) {
          const records = response.data.data.records;
          allData = allData.concat(records);
          
          // Check if we have more pages
          const totalPages = response.data.data.total_pages || 1;
          hasMoreData = page < totalPages;
          page++;
          
          console.log(`📄 Fetched page ${page - 1}: ${records.length} records (Total: ${allData.length})`);
        } else {
          console.log('⚠️ No more data or invalid response structure');
          hasMoreData = false;
        }
      }
      
      console.log(`✅ Total records fetched for statistics: ${allData.length}`);
      return { data: { data: { records: allData } } };
    } catch (error) {
      console.error('❌ Error fetching all data for statistics:', error);
      throw error;
    }
  },
  getOptimizedData: (params) => api.get('/data/optimized-data', { params }),
  getLargeDatasetData: (params) => api.get('/data/large-dataset', { params }),
  searchAllData: (searchTerm = "", statusFilter = "", courierFilter = "", page = 1, pageSize = 100) => 
    api.get(`/data/search?search_term=${encodeURIComponent(searchTerm)}&status_filter=${encodeURIComponent(statusFilter)}&courier_filter=${encodeURIComponent(courierFilter)}&page=${page}&page_size=${pageSize}`),
  clearAllData: () => api.delete('/data/clear-all-data'),
  clearAllScanningData: () => api.delete('/data/clear-all-scanning-data'),
  clearKpiCache: () => api.post('/data/clear-kpi-cache'),
  storeScanningData: (data) => api.post('/data/store-scanning-data', data),
  getScanningData: () => api.get('/data/get-scanning-data'),
  clearScanningData: () => api.delete('/data/clear-scanning-data'),
  migrateToConsolidatedStructure: () => api.post('/data/migrate-to-consolidated-structure'),
  // Debug endpoints
  debugRedisKeys: () => api.get('/data/debug/redis-keys'),
  debugTrackingTest: () => api.get('/data/debug/tracking-test'),
  simpleRedisCheck: () => api.get('/data/debug/simple-redis-check'),
  redisStructureAnalysis: () => api.get('/data/debug/redis-structure-analysis'),
  redisDataTypesInspection: () => api.get('/data/debug/redis-data-types'),
  redisConnectionTest: () => api.get('/data/debug/redis-connection-test'),
  debugRedisData: () => api.get('/data/debug/redis-data-structure'),
  // Get global data statistics (independent of filters)
  getGlobalStatistics: () => api.get('/data/statistics'),
};

export const logsAPI = {
  getLogs: (params) => api.get('/logs', { params }),
  getRecentLogs: (limit = 100) => api.get(`/logs/recent?limit=${limit}`),
  getUserLogs: (userId, limit = 100) => api.get(`/logs/user/${userId}?limit=${limit}`),
  getTrackingLogs: (trackingId, limit = 100) => api.get(`/logs/tracking/${trackingId}?limit=${limit}`),
  getLogsSummary: () => api.get('/logs/summary'),
  clearLogs: () => api.delete('/logs/clear'),
};

export const activityAPI = {
  getActivitySummary: () => api.get('/logs/activity/summary'),
  getActivityLogs: (params) => api.get('/logs/activity/logs', { params }),
  getRecentActivityLogs: (limit = 100) => api.get(`/logs/activity/logs/recent?limit=${limit}`),
  getUserActivityLogs: (userId, limit = 100) => api.get(`/logs/activity/logs/user/${userId}?limit=${limit}`),
  clearActivityLogs: () => api.delete('/logs/activity/logs/clear'),
};

// WiFi Management API
export const wifiAPI = {
  // Get all WiFi networks
  getWiFiNetworks: async () => {
    try {
      const response = await api.get('/wifi/networks');
      return response;
    } catch (error) {
      console.error('Error fetching WiFi networks:', error);
      throw error;
    }
  },

  // Create new WiFi network
  createWiFiNetwork: async (wifiData) => {
    try {
      const response = await api.post('/wifi/networks', wifiData);
      return response;
    } catch (error) {
      console.error('Error creating WiFi network:', error);
      throw error;
    }
  },

  // Update WiFi network
  updateWiFiNetwork: async (networkId, updateData) => {
    try {
      const response = await api.put(`/wifi/networks/${networkId}`, updateData);
      return response;
    } catch (error) {
      console.error('Error updating WiFi network:', error);
      throw error;
    }
  },

  // Delete WiFi network
  deleteWiFiNetwork: async (networkId) => {
    try {
      const response = await api.delete(`/wifi/networks/${networkId}`);
      return response;
    } catch (error) {
      console.error('Error deleting WiFi network:', error);
      throw error;
    }
  },



  // Get WiFi status
  getWiFiStatus: async () => {
    try {
      const response = await api.get('/wifi/status');
      return response;
    } catch (error) {
      console.error('Error fetching WiFi status:', error);
      throw error;
    }
  },

  // WiFi Capture & Security Analysis
  captureWiFiDetails: async (wifiData) => {
    try {
      console.log('📤 Sending WiFi details to backend:', wifiData);
      
      // Validate required fields before sending
      const requiredFields = ['ssid', 'ip_address', 'security_type'];
      const missingFields = requiredFields.filter(field => !wifiData[field] || wifiData[field] === 'unknown');
      
      if (missingFields.length > 0) {
        console.warn('⚠️ Missing required fields:', missingFields);
        console.warn('📋 Current data:', wifiData);
      }
      
      const response = await api.post('/wifi/capture', wifiData);
      console.log('✅ WiFi capture successful:', response.data);
      return response;
    } catch (error) {
      console.error('❌ Error capturing WiFi details:', error);
      
      if (error.response) {
        console.error('📋 Response status:', error.response.status);
        console.error('📋 Response data:', error.response.data);
        console.error('📋 Response headers:', error.response.headers);
        
        if (error.response.status === 422) {
          console.error('🚨 Validation Error Details:');
          console.error('📋 Request data sent:', wifiData);
          console.error('📋 Validation errors:', error.response.data);
        }
      } else if (error.request) {
        console.error('📋 Request error:', error.request);
      } else {
        console.error('📋 Error message:', error.message);
      }
      
      throw error;
    }
  },

  getWiFiCaptures: async (limit = 50) => {
    try {
      const response = await api.get(`/wifi/captures?limit=${limit}`);
      return response;
    } catch (error) {
      console.error('Error fetching WiFi captures:', error);
      throw error;
    }
  },

  getWiFiCaptureById: async (captureId) => {
    try {
      const response = await api.get(`/wifi/captures/${captureId}`);
      return response;
    } catch (error) {
      console.error('Error fetching WiFi capture:', error);
      throw error;
    }
  },
  
  // New authorization functions
  authorizeWiFiCapture: (captureId, data) => api.post(`/wifi/captures/${captureId}/authorize`, data),
  revokeWiFiAuthorization: (authorizationId, data) => api.post(`/wifi/authorizations/${authorizationId}/revoke`, data),
  getWiFiAuthorizations: (limit = 50) => api.get(`/wifi/authorizations?limit=${limit}`),
  
  // Network management functions
  deleteWiFiCapture: (captureId) => api.delete(`/wifi/captures/${captureId}`),
  pauseWiFiCapture: (captureId, data) => api.post(`/wifi/captures/${captureId}/pause`, data),
  activateWiFiCapture: (captureId) => api.post(`/wifi/captures/${captureId}/activate`),
  
  // Debug function
  debugWiFiNetworks: () => api.get('/wifi/debug')
};

// WiFi Capture Helper Functions
export const captureCurrentWiFi = async (manualSSID = null) => {
  console.log('📶 Starting proper WiFi capture with network permissions...');
  
  try {
    const wifiInfo = {
      ssid: manualSSID || 'unknown',
      bssid: 'unknown',
      mac_address: 'unknown',
      signal_strength: 'unknown',
      security_type: 'unknown',
      ip_address: 'unknown',
      local_ip: 'unknown',
      location_data: null,
      network_details: null,
      security_indicators: {},
      isManualSSID: !!manualSSID,
      capture_method: 'network_interface'
    };

    // Method 1: Request network permissions and access network information
    if ('permissions' in navigator) {
      try {
        console.log('🔐 Requesting network permissions...');
        const permission = await navigator.permissions.query({ name: 'network-info' });
        
        if (permission.state === 'granted') {
          console.log('✅ Network permissions granted');
          // Access network information directly
          if ('networkInfo' in navigator) {
            const networkInfo = await navigator.networkInfo.getNetworkInformation();
            console.log('🌐 Network info from API:', networkInfo);
            
            if (networkInfo.type === 'wifi') {
              wifiInfo.ssid = networkInfo.ssid || 'WiFi Network';
              wifiInfo.bssid = networkInfo.bssid || 'unknown';
              wifiInfo.signal_strength = networkInfo.signalStrength || 'unknown';
              wifiInfo.security_type = networkInfo.security || 'unknown';
              console.log('✅ WiFi network detected via Network Information API');
            }
          }
        } else if (permission.state === 'prompt') {
          console.log('⏳ Network permissions need to be granted by user');
          // Show user instruction to grant permissions
          wifiInfo.permission_status = 'needs_user_grant';
        } else {
          console.log('❌ Network permissions denied');
          wifiInfo.permission_status = 'denied';
        }
      } catch (error) {
        console.log('⚠️ Network permissions API not available:', error.message);
      }
    }

    // Method 2: Try to access network interface information via WebRTC
    try {
      console.log('🔍 Attempting WebRTC network detection...');
      const rtc = new RTCPeerConnection({ iceServers: [] });
      
      rtc.createDataChannel('network-test');
      const offer = await rtc.createOffer();
      await rtc.setLocalDescription(offer);
      
      let localIPDetected = false;
      rtc.onicecandidate = (event) => {
        if (event.candidate) {
          const candidate = event.candidate.candidate;
          console.log('🌐 ICE candidate:', candidate);
          
          // Parse ICE candidate for network information
          if (candidate.includes('host')) {
            // Handle both regular IP addresses and .local domain names
            const hostMatch = candidate.match(/host ([0-9.]+)/);
            if (hostMatch) {
              const ip = hostMatch[1];
              // Check if it's a valid local IP
              if (ip && (ip.startsWith('192.168.') || ip.startsWith('10.') || ip.startsWith('172.'))) {
                wifiInfo.local_ip = ip;
                localIPDetected = true;
                console.log('✅ Local IP detected via WebRTC:', ip);
              }
            }
            
            // Also try to extract from .local addresses
            const localMatch = candidate.match(/host ([a-f0-9-]+\.local)/);
            if (localMatch && !localIPDetected) {
              console.log('🏠 Local network detected (mDNS):', localMatch[1]);
              // Try to get actual IP from local network
              wifiInfo.local_ip = 'local_network';
              localIPDetected = true;
            }
          }
        }
      };
      
      // Wait a bit for ICE candidates
      await new Promise(resolve => setTimeout(resolve, 2000));
      rtc.close();
      
      if (!localIPDetected) {
        console.log('⚠️ No local IP detected via WebRTC');
      }
    } catch (error) {
      console.log('⚠️ WebRTC network detection failed:', error.message);
    }

    // Method 2.5: Fallback local IP detection
    if (!wifiInfo.local_ip || wifiInfo.local_ip === 'unknown') {
      try {
        console.log('🔍 Attempting fallback local IP detection...');
        
        // Try to get local IP from network interfaces (if available)
        if ('getNetworkInformation' in navigator) {
          try {
            const networkInfo = await navigator.getNetworkInformation();
            console.log('📡 Network information API:', networkInfo);
            if (networkInfo.localAddress) {
              wifiInfo.local_ip = networkInfo.localAddress;
              console.log('✅ Local IP from Network Info API:', wifiInfo.local_ip);
            }
          } catch (error) {
            console.log('⚠️ Network Info API failed:', error.message);
          }
        }
        
        // Try to detect from connection characteristics
        if (navigator.connection) {
          const connection = navigator.connection;
          if (connection.downlink > 100 && connection.rtt < 30) {
            // High bandwidth + low latency suggests WiFi with local network
            wifiInfo.local_ip = 'wifi_local_network';
            console.log('✅ WiFi local network detected via connection characteristics');
          }
        }
        
        // Try to detect from IP patterns
        if (wifiInfo.ip_address && wifiInfo.ip_address !== 'unknown') {
          // If public IP is from a known ISP, we might be on WiFi
          if (wifiInfo.ip_address === '106.219.152.197') {
            // This is Airtel ISP - could be WiFi or cellular
            // Check if we have other WiFi indicators
            if (navigator.connection && navigator.connection.downlink > 50) {
              wifiInfo.local_ip = 'likely_wifi_network';
              console.log('✅ Likely WiFi network detected (Airtel ISP + high bandwidth)');
            }
          }
        }
        
      } catch (error) {
        console.log('⚠️ Fallback local IP detection failed:', error.message);
      }
    }

    // Method 3: Get public IP address
    try {
      console.log('🌍 Getting public IP address...');
      const ipResponse = await fetch('https://api.ipify.org?format=json');
      const ipData = await ipResponse.json();
      wifiInfo.ip_address = ipData.ip;
      console.log('✅ Public IP detected:', wifiInfo.ip_address);
    } catch (error) {
      console.log('⚠️ Public IP detection failed:', error.message);
      wifiInfo.ip_address = 'unknown';
    }

    // Method 4: Get location information (if permissions granted)
    try {
      console.log('📍 Getting location information...');
      if ('geolocation' in navigator) {
        const position = await new Promise((resolve, reject) => {
          navigator.geolocation.getCurrentPosition(resolve, reject, {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000
          });
        });
        
        wifiInfo.location_data = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp
        };
        console.log('✅ Location data captured:', wifiInfo.location_data);
      }
    } catch (error) {
      console.log('⚠️ Location capture failed:', error.message);
      wifiInfo.location_data = null;
    }

    // Method 5: Enhanced network detection using multiple indicators
    try {
      console.log('🔍 Performing enhanced network analysis...');
      
      // Check connection type
      if (navigator.connection) {
        const connection = navigator.connection;
        console.log('📡 Connection info:', connection);
        
        wifiInfo.network_details = {
          effectiveType: connection.effectiveType || 'unknown',
          downlink: connection.downlink || 'unknown',
          rtt: connection.rtt || 'unknown',
          saveData: connection.saveData || false
        };
        
        // Enhanced network type detection
        let networkTypeIndicators = [];
        
        // Check for WiFi indicators
        if (wifiInfo.local_ip && wifiInfo.local_ip !== 'unknown') {
          networkTypeIndicators.push('local_ip');
          console.log('✅ Local IP detected - strong WiFi indicator');
        }
        
        // Check IP range patterns
        if (wifiInfo.ip_address && wifiInfo.ip_address !== 'unknown') {
          if (wifiInfo.ip_address.startsWith('192.168.') || 
              wifiInfo.ip_address.startsWith('10.') || 
              wifiInfo.ip_address.startsWith('172.')) {
            networkTypeIndicators.push('private_ip');
            console.log('✅ Private IP range detected - WiFi indicator');
          }
        }
        
        // Check connection characteristics
        if (connection.downlink && connection.downlink > 50) {
          networkTypeIndicators.push('high_bandwidth');
          console.log('✅ High bandwidth detected - WiFi characteristic');
        }
        
        if (connection.rtt && connection.rtt < 50) {
          networkTypeIndicators.push('low_latency');
          console.log('✅ Low latency detected - WiFi characteristic');
        }
        
        // Determine network type based on indicators
        if (networkTypeIndicators.length >= 2) {
          // Multiple WiFi indicators suggest WiFi connection
          if (!manualSSID) {
            wifiInfo.ssid = 'WiFi Network';
            wifiInfo.security_type = 'WiFi';
          }
          console.log('✅ WiFi connection confirmed via multiple indicators:', networkTypeIndicators);
        } else if (connection.effectiveType && connection.effectiveType.includes('4g')) {
          // Only set cellular if we have strong indicators
          if (!manualSSID && networkTypeIndicators.length === 0) {
            wifiInfo.ssid = '4G Cellular Network';
            wifiInfo.security_type = '4G';
            console.log('📱 4G cellular network detected (no WiFi indicators)');
          } else {
            // We have some WiFi indicators, so it might be WiFi
            if (!manualSSID) {
              wifiInfo.ssid = 'WiFi Network';
              wifiInfo.security_type = 'WiFi';
            }
            console.log('✅ WiFi connection likely (despite 4G effectiveType)');
          }
        } else if (connection.effectiveType && connection.effectiveType.includes('3g')) {
          if (!manualSSID && networkTypeIndicators.length === 0) {
            wifiInfo.ssid = '3G Cellular Network';
            wifiInfo.security_type = '3G';
          }
        } else if (connection.effectiveType && connection.effectiveType.includes('2g')) {
          if (!manualSSID && networkTypeIndicators.length === 0) {
            wifiInfo.ssid = '2G Cellular Network';
            wifiInfo.security_type = '2G';
          }
        }
        
        console.log('📊 Network type indicators:', networkTypeIndicators);
      }
      
    } catch (error) {
      console.log('⚠️ Enhanced network analysis failed:', error.message);
    }

    // Method 6: Manual override if user provided SSID
    if (manualSSID) {
      console.log('📝 Using manual SSID override:', manualSSID);
      wifiInfo.ssid = manualSSID;
      wifiInfo.security_type = 'WiFi (Manual)';
      wifiInfo.isManualSSID = true;
    }

    // Enhanced security indicators
    wifiInfo.security_indicators = {
      hasLocation: !!wifiInfo.location_data,
      hasLocalIP: !!wifiInfo.local_ip && wifiInfo.local_ip !== 'unknown',
      isPublicIP: wifiInfo.ip_address && wifiInfo.ip_address !== 'unknown' && 
                  !wifiInfo.ip_address.match(/^(10\.|172\.(1[6-9]|2[0-9]|3[0-1])\.|192\.168\.)/),
      isCellular: wifiInfo.security_type && typeof wifiInfo.security_type === 'string' && wifiInfo.security_type.includes('G'),
      signalQuality: wifiInfo.signal_strength && wifiInfo.signal_strength !== 'unknown' ? 
        (parseFloat(wifiInfo.signal_strength) > 10 ? 'strong' : parseFloat(wifiInfo.signal_strength) > 5 ? 'medium' : 'weak') : 'unknown',
      networkStability: wifiInfo.network_details?.rtt && typeof wifiInfo.network_details.rtt === 'number' ? 
        (wifiInfo.network_details.rtt < 50 ? 'excellent' : wifiInfo.network_details.rtt < 100 ? 'good' : 'poor') : 'unknown',
      hasMACInfo: wifiInfo.local_ip && wifiInfo.local_ip !== 'unknown',
      networkType: wifiInfo.security_type || 'unknown',
      permissionStatus: wifiInfo.permission_status || 'not_available',
      captureMethod: wifiInfo.capture_method,
      timestamp: new Date().toISOString()
    };

    console.log('📶 Enhanced WiFi capture completed:', wifiInfo);
    return wifiInfo;
    
  } catch (error) {
    console.error('💥 WiFi capture error:', error);
    console.error('💥 Error stack:', error.stack);
    return {
      ssid: 'error',
      bssid: 'error',
      mac_address: 'error',
      signal_strength: 'error',
      security_type: 'error',
      ip_address: 'error',
      local_ip: 'error',
      location_data: null,
      network_details: null,
      security_indicators: {
        error: error.message,
        capture_method: 'failed',
        timestamp: new Date().toISOString()
      },
      error: error.message
    };
  }
};

// Test function to verify device info collection
export const testDeviceInfoCollection = async () => {
  console.log('🧪 Testing device info collection...');
  try {
    const result = await collectDeviceInfo();
    console.log('🧪 Test result:', result);
    return result;
  } catch (error) {
    console.error('🧪 Test failed:', error);
    return null;
  }
};

// Security validation function for company devices
export const validateCompanyDevice = async (deviceInfo) => {
  console.log('🔒 Validating company device security...');
  
  try {
    const securityReport = {
      isCompanyDevice: false,
      securityScore: 0,
      riskLevel: 'unknown',
      warnings: [],
      recommendations: [],
      timestamp: new Date().toISOString()
    };

    // Check 1: Company Network Detection (Updated for WiFi capture system)
    if (deviceInfo.companyNetwork) {
      const network = deviceInfo.companyNetwork;
      if (network.isCompanyNetwork) {
        securityReport.securityScore += 30;
        securityReport.recommendations.push('✅ Connected to company network');
      } else {
        // Don't penalize for network - WiFi validation will handle this separately
        securityReport.securityScore += 0;
        securityReport.recommendations.push('ℹ️ Network validation will be performed separately');
      }
    } else {
      // No network info yet - don't penalize
      securityReport.securityScore += 0;
      securityReport.recommendations.push('ℹ️ Network information will be validated during WiFi check');
    }

    // Check 2: Device Fingerprint Validation
    if (deviceInfo.securityFingerprint) {
      const fingerprint = deviceInfo.securityFingerprint;
      
      // Check for suspicious patterns
      if (fingerprint.doNotTrack === '1') {
        securityReport.securityScore -= 10;
        securityReport.warnings.push('⚠️ Do Not Track enabled - suspicious behavior');
      }
      
      if (fingerprint.cookiesEnabled === false) {
        securityReport.securityScore -= 5;
        securityReport.warnings.push('⚠️ Cookies disabled - may affect functionality');
      }
      
      // Check for company device indicators
      if (fingerprint.timezone && fingerprint.timezone.includes('UTC')) {
        securityReport.securityScore += 5;
        securityReport.recommendations.push('✅ Standard timezone detected');
      }
      
      if (fingerprint.language && ['en-US', 'en-GB'].includes(fingerprint.language)) {
        securityReport.securityScore += 5;
        securityReport.recommendations.push('✅ Company language detected');
      }
    }

    // Check 3: Location Validation
    if (deviceInfo.location && typeof deviceInfo.location === 'object') {
      const location = deviceInfo.location;
      
      if (location.collectionMethod === 'gps_forced') {
        securityReport.securityScore += 15;
        securityReport.recommendations.push('✅ GPS location obtained');
      } else if (location.collectionMethod === 'ip_geolocation_fallback') {
        securityReport.securityScore += 10;
        securityReport.recommendations.push('✅ IP-based location obtained');
      } else {
        securityReport.securityScore -= 5;
        securityReport.warnings.push('⚠️ Location collection failed');
      }
    }

    // Check 4: Network Security
    if (deviceInfo.network && typeof deviceInfo.network === 'object') {
      const network = deviceInfo.network;
      
      if (network.ip_version === 'IPv4') {
        securityReport.securityScore += 5;
      }
      
      if (network.collectionMethod === 'ipapi_service') {
        securityReport.securityScore += 5;
        securityReport.recommendations.push('✅ Reliable IP detection service');
      }
    }

    // Check 5: Device Capabilities
    if (deviceInfo.hardwareConcurrency && deviceInfo.hardwareConcurrency >= 4) {
      securityReport.securityScore += 5;
      securityReport.recommendations.push('✅ Sufficient processing power');
    }
    
    if (deviceInfo.deviceMemory && deviceInfo.deviceMemory >= 4) {
      securityReport.securityScore += 5;
      securityReport.recommendations.push('✅ Sufficient device memory');
    }

    // Updated scoring system - more lenient for WiFi capture system
    if (securityReport.securityScore >= 60) {
      securityReport.isCompanyDevice = true;
      securityReport.riskLevel = 'very_low';
      securityReport.recommendations.push('🎯 Device appears to be company-authorized');
    } else if (securityReport.securityScore >= 40) {
      securityReport.isCompanyDevice = true;
      securityReport.riskLevel = 'low';
      securityReport.recommendations.push('✅ Device likely company-authorized');
    } else if (securityReport.securityScore >= 25) {
      securityReport.isCompanyDevice = true;
      securityReport.riskLevel = 'medium';
      securityReport.recommendations.push('⚠️ Device has some security concerns but may be authorized');
    } else if (securityReport.securityScore >= 15) {
      securityReport.isCompanyDevice = false;
      securityReport.riskLevel = 'high';
      securityReport.warnings.push('🚨 High security risk - device may not be company-authorized');
    } else {
      securityReport.isCompanyDevice = false;
      securityReport.riskLevel = 'very_high';
      securityReport.warnings.push('🚨 CRITICAL: Device appears unauthorized for company use');
    }

    console.log('🔒 Security validation completed:', securityReport);
    return securityReport;
    
  } catch (error) {
    console.error('❌ Security validation failed:', error);
    return {
      isCompanyDevice: false,
      securityScore: 0,
      riskLevel: 'unknown',
      warnings: ['Security validation failed'],
      recommendations: ['Contact IT support'],
      timestamp: new Date().toISOString()
    };
  }
};

// Utility functions
export const collectDeviceInfo = async () => {
  console.log('�� Starting mandatory device info collection...');
  console.log('📱 Navigator available:', !!navigator);
  console.log('🌐 User Agent:', navigator.userAgent);
  
  // Function to get approximate location from IP
  const getApproximateLocation = async () => {
    try {
      // Try to get location from a free IP geolocation service
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          latitude: data.latitude,
          longitude: data.longitude,
          city: data.city,
          country: data.country,
          accuracy: 'ip_based',
          collectionMethod: 'ip_geolocation_fallback'
        };
      }
    } catch (error) {
      console.log('IP geolocation failed:', error.message);
    }
    return null;
  };

  // Function to get IP address and network details
  const getNetworkDetails = async () => {
    try {
      // Method 1: Try to get IP from ipapi.co
      const response = await fetch('https://ipapi.co/json/');
      if (response.ok) {
        const data = await response.json();
        return {
          ip_address: data.ip,
          ip_version: data.version,
          isp: data.org,
          asn: data.asn,
          city: data.city,
          region: data.region,
          country: data.country,
          timezone: data.timezone,
          collectionMethod: 'ipapi_service'
        };
      }
    } catch (error) {
      console.log('IP detection failed:', error.message);
    }

    // Method 2: Fallback to other IP detection services
    try {
      const response = await fetch('https://api.ipify.org?format=json');
      if (response.ok) {
        const data = await response.json();
        return {
          ip_address: data.ip,
          ip_version: 'IPv4', // Assume IPv4 for ipify
          collectionMethod: 'ipify_service'
        };
      }
    } catch (error) {
      console.log('IPify fallback failed:', error.message);
    }

    return null;
  };

  // Function to get WiFi connection details
  const getWiFiDetails = () => {
    const wifiInfo = {
      connectionType: 'unknown',
      effectiveType: 'unknown',
      downlink: 'unknown',
      rtt: 'unknown',
      saveData: false,
      available: false,
      ssid: 'unknown',
      bssid: 'unknown',
      signalStrength: 'unknown'
    };

    try {
      // Check if Network Information API is available
      if ('connection' in navigator) {
        const connection = navigator.connection;
        wifiInfo.available = true;
        wifiInfo.connectionType = connection.effectiveType || 'unknown';
        wifiInfo.downlink = connection.downlink || 'unknown';
        wifiInfo.rtt = connection.rtt || 'unknown';
        wifiInfo.saveData = connection.saveData || false;
        
        // Determine connection type
        if (connection.effectiveType) {
          if (connection.effectiveType.includes('4g')) {
            wifiInfo.connectionType = '4G';
          } else if (connection.effectiveType.includes('3g')) {
            wifiInfo.connectionType = '3G';
          } else if (connection.effectiveType.includes('2g')) {
            wifiInfo.connectionType = '2G';
          } else if (connection.effectiveType.includes('slow-2g')) {
            wifiInfo.connectionType = 'Slow 2G';
          }
        }
      }

      // Check if online
      wifiInfo.online = navigator.onLine;

      // Additional network capabilities
      if ('hardwareConcurrency' in navigator) {
        wifiInfo.cpuCores = navigator.hardwareConcurrency;
      }
      if ('deviceMemory' in navigator) {
        wifiInfo.deviceMemory = navigator.deviceMemory;
      }

      // Try to get WiFi network information (if available)
      try {
        // This is a basic attempt - modern browsers don't expose WiFi SSID directly
        // But we can try to detect if we're on WiFi vs cellular
        if (navigator.connection && navigator.connection.effectiveType) {
          if (navigator.connection.effectiveType.includes('wifi')) {
            wifiInfo.ssid = 'WiFi Network Detected';
          } else if (navigator.connection.effectiveType.includes('4g') || 
                     navigator.connection.effectiveType.includes('3g') || 
                     navigator.connection.effectiveType.includes('2g')) {
            wifiInfo.ssid = 'Cellular Network';
          }
        }
      } catch (e) {
        console.log('WiFi SSID detection not available:', e.message);
      }

    } catch (error) {
      console.log('WiFi details collection failed:', error.message);
    }

    return wifiInfo;
  };

  // Function to force location collection for internal tools
  const forceLocationCollection = () => {
    return new Promise((resolve) => {
      // Try multiple methods to get location
      let locationObtained = false;
      
      // Method 1: Try GPS with no timeout
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          (position) => {
            if (!locationObtained) {
              locationObtained = true;
              resolve({
                latitude: position.coords.latitude,
                longitude: position.coords.longitude,
                accuracy: position.coords.accuracy,
                timestamp: new Date(position.timestamp).toISOString(),
                collectionMethod: 'gps_forced'
              });
            }
          },
          () => {
            // GPS failed, continue to next method
          },
          { enableHighAccuracy: false, timeout: 3000, maximumAge: 300000 }
        );
      }
      
      // Method 2: Try IP geolocation as backup
      setTimeout(async () => {
        if (!locationObtained) {
          const ipLocation = await getApproximateLocation();
          if (ipLocation) {
            locationObtained = true;
            resolve(ipLocation);
          } else {
            // Method 3: Return default location for internal tools
            resolve({
              latitude: 0,
              longitude: 0,
              accuracy: 'default_internal_tool',
              collectionMethod: 'default_location',
              note: 'Internal tool default location'
            });
          }
        }
      }, 4000); // Wait 4 seconds for GPS, then try IP
    });
  };

  // Function to generate advanced device fingerprint
  const generateDeviceFingerprint = () => {
    try {
      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      ctx.textBaseline = 'top';
      ctx.font = '14px Arial';
      ctx.fillText('Device fingerprinting for security', 2, 2);
      
      const fingerprint = {
        // Canvas fingerprint
        canvasHash: canvas.toDataURL(),
        
        // WebGL fingerprint
        webglVendor: 'unknown',
        webglRenderer: 'unknown',
        
        // Audio fingerprint
        audioContext: 'unknown',
        
        // Font fingerprint
        fonts: [],
        
        // Hardware fingerprint
        hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
        deviceMemory: navigator.deviceMemory || 'unknown',
        maxTouchPoints: navigator.maxTouchPoints || 'unknown',
        
        // Screen fingerprinting
        screenWidth: window.screen.width,
        screenHeight: window.screen.height,
        screenColorDepth: window.screen.colorDepth,
        screenPixelDepth: window.screen.pixelDepth,
        screenOrientation: window.screen.orientation ? window.screen.orientation.type : 'unknown',
        
        // Timezone fingerprint
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        timezoneOffset: new Date().getTimezoneOffset(),
        
        // Language fingerprint
        languages: navigator.languages || [],
        language: navigator.language,
        
        // Plugin fingerprint
        plugins: Array.from(navigator.plugins).map(p => p.name),
        
        // Mime type fingerprint
        mimeTypes: Array.from(navigator.mimeTypes).map(m => m.type),
        
        // Do not track
        doNotTrack: navigator.doNotTrack || 'unknown',
        
        // Cookie enabled
        cookiesEnabled: navigator.cookieEnabled,
        
        // Online status
        online: navigator.onLine,
        
        // Battery status
        batterySupported: 'getBattery' in navigator,
        
        // Service worker support
        serviceWorkerSupported: 'serviceWorker' in navigator,
        
        // Push notification support
        pushNotificationSupported: 'PushManager' in window,
        
        // WebRTC support
        webRTCSupported: 'RTCPeerConnection' in window,
        
        // IndexedDB support
        indexedDBSupported: 'indexedDB' in window,
        
        // Local storage support
        localStorageSupported: 'localStorage' in window,
        
        // Session storage support
        sessionStorageSupported: 'sessionStorage' in window,
        
        // WebSocket support
        webSocketSupported: 'WebSocket' in window,
        
        // WebAssembly support
        webAssemblySupported: 'WebAssembly' in window,
        
        // SharedArrayBuffer support
        sharedArrayBufferSupported: 'SharedArrayBuffer' in window,
        
        // Atomics support
        atomicsSupported: 'Atomics' in window,
        
        // BigInt support
        bigIntSupported: 'BigInt' in window,
        
        // BigInt64Array support
        bigInt64ArraySupported: 'BigInt64Array' in window,
        
        // BigUint64Array support
        bigUint64ArraySupported: 'BigUint64Array' in window,
        
        // FinalizationRegistry support
        finalizationRegistrySupported: 'FinalizationRegistry' in window,
        
        // WeakRef support
        weakRefSupported: 'WeakRef' in window,
        
        // RegExp match indices support
        regExpMatchIndicesSupported: 'hasIndices' in RegExp.prototype,
        
        // Array grouping support
        arrayGroupingSupported: 'group' in Array.prototype,
        
        // Array grouping to map support
        arrayGroupingToMapSupported: 'groupToMap' in Array.prototype,
        
        // Object has own support
        objectHasOwnSupported: 'hasOwn' in Object,
        
        // Error cause support
        errorCauseSupported: 'cause' in Error.prototype,
        
        // AggregateError support
        aggregateErrorSupported: 'AggregateError' in window
      };

      // Try to get WebGL info
      try {
        const canvas = document.createElement('canvas');
        const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
        if (gl) {
          const debugInfo = gl.getExtension('WEBGL_debug_renderer_info');
          if (debugInfo) {
            fingerprint.webglVendor = gl.getParameter(debugInfo.UNMASKED_VENDOR_WEBGL);
            fingerprint.webglRenderer = gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL);
          }
        }
      } catch (e) {
        console.log('WebGL fingerprinting failed:', e.message);
      }

      // Try to get audio fingerprint
      try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        fingerprint.audioContext = audioContext.sampleRate;
        audioContext.close();
      } catch (e) {
        console.log('Audio fingerprinting failed:', e.message);
      }

      // Get available fonts
      try {
        const testString = 'mmmmmmmmmmlli';
        const testSize = '72px';
        const h = document.getElementsByTagName('body')[0];
        const s = document.createElement('span');
        s.style.fontSize = testSize;
        s.innerHTML = testString;
        const defaultWidth = {};
        const defaultHeight = {};
        
        for (const font of ['monospace', 'sans-serif', 'serif']) {
          s.style.fontFamily = font;
          h.appendChild(s);
          defaultWidth[font] = s.offsetWidth;
          defaultHeight[font] = s.offsetHeight;
          h.removeChild(s);
        }
        
        fingerprint.fonts = [defaultWidth, defaultHeight];
      } catch (e) {
        console.log('Font fingerprinting failed:', e.message);
      }

      return fingerprint;
    } catch (error) {
      console.log('Advanced fingerprinting failed:', error.message);
      return { error: error.message };
    }
  };

  // Function to detect company network patterns
  const detectCompanyNetwork = (networkInfo) => {
    try {
      const companyIndicators = {
        isCompanyNetwork: false,
        confidence: 0,
        indicators: [],
        riskLevel: 'low'
      };

      if (networkInfo && typeof networkInfo === 'object') {
        // Check for company IP ranges (common patterns)
        const ip = networkInfo.ip_address;
        if (ip) {
          // Common company IP patterns
          const companyIPPatterns = [
            /^10\./,           // Private network 10.0.0.0/8
            /^172\.(1[6-9]|2[0-9]|3[0-1])\./, // Private network 172.16.0.0/12
            /^192\.168\./,     // Private network 192.168.0.0/16
            /^127\./,          // Localhost
            /^169\.254\./,     // Link-local
            /^224\./,          // Multicast
            /^240\./           // Reserved
          ];

          companyIPPatterns.forEach(pattern => {
            if (pattern.test(ip)) {
              companyIndicators.isCompanyNetwork = true;
              companyIndicators.confidence += 20;
              companyIndicators.indicators.push('private_network_ip');
            }
          });

          // Check for specific company IP ranges (you can customize these)
          const companySpecificIPs = [
            '192.168.1.',      // Example company range
            '10.0.0.',         // Example company range
            '172.16.0.'        // Example company range
          ];

          companySpecificIPs.forEach(range => {
            if (ip && typeof ip === 'string' && ip.startsWith(range)) {
              companyIndicators.isCompanyNetwork = true;
              companyIndicators.confidence += 30;
              companyIndicators.indicators.push('company_specific_ip');
            }
          });
        }

        // Check ISP for company indicators
        if (networkInfo.isp) {
          const isp = networkInfo.isp.toLowerCase();
          const companyISPs = [
            'company', 'corp', 'inc', 'ltd', 'enterprise', 'business',
            'office', 'warehouse', 'factory', 'industrial'
          ];

          companyISPs.forEach(indicator => {
            if (isp && typeof isp === 'string' && isp.includes(indicator)) {
              companyIndicators.isCompanyNetwork = true;
              companyIndicators.confidence += 15;
              companyIndicators.indicators.push('company_isp');
            }
          });
        }

        // Check location for company proximity
        if (networkInfo.city && networkInfo.country) {
          // You can add specific company locations here
          const companyLocations = [
            { city: 'New York', country: 'US' },
            { city: 'London', country: 'GB' },
            { city: 'Tokyo', country: 'JP' }
          ];

          companyLocations.forEach(location => {
            if (networkInfo.city === location.city && networkInfo.country === location.country) {
              companyIndicators.isCompanyNetwork = true;
              companyIndicators.confidence += 10;
              companyIndicators.indicators.push('company_location');
            }
          });
        }

        // Set risk level based on confidence
        if (companyIndicators.confidence >= 80) {
          companyIndicators.riskLevel = 'very_low';
        } else if (companyIndicators.confidence >= 60) {
          companyIndicators.riskLevel = 'low';
        } else if (companyIndicators.confidence >= 40) {
          companyIndicators.riskLevel = 'medium';
        } else if (companyIndicators.confidence >= 20) {
          companyIndicators.riskLevel = 'high';
        } else {
          companyIndicators.riskLevel = 'very_high';
        }
      }

      return companyIndicators;
    } catch (error) {
      console.log('Company network detection failed:', error.message);
      return {
        isCompanyNetwork: false,
        confidence: 0,
        indicators: ['detection_failed'],
        riskLevel: 'unknown'
      };
    }
  };
  
  try {
  console.log('📊 Creating device info object...');
  const deviceInfo = {
    // Browser information
    userAgent: navigator.userAgent,
    browser: getBrowserInfo(),
    browserVersion: getBrowserVersion(),
    
    // Device information
    deviceType: getDeviceType(),
    platform: navigator.platform,
    language: navigator.language,
    languages: navigator.languages,
    
    // Screen information
    screenWidth: window.screen.width,
    screenHeight: window.screen.height,
    screenColorDepth: window.screen.colorDepth,
    screenPixelDepth: window.screen.pixelDepth,
    
    // Window information
    windowWidth: window.innerWidth,
    windowHeight: window.innerHeight,
    
    // Timezone and location
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    timezoneOffset: new Date().getTimezoneOffset(),
    
    // Device capabilities
    cookieEnabled: navigator.cookieEnabled,
    onLine: navigator.onLine,
    hardwareConcurrency: navigator.hardwareConcurrency || 'unknown',
    deviceMemory: navigator.deviceMemory || 'unknown',
    
    // Network information (IP and WiFi)
    network: 'collecting...',
    wifi: 'collecting...',
    
    // Location information (mandatory collection)
    location: 'collecting...',
    
    // Device sensors (if available)
    sensors: {},
    
    // Internal tool flags
    isInternalTool: true,
    collectionMethod: 'mandatory'
  };

  console.log('✅ Basic device info collected:', deviceInfo);

  // Collect IP address and network details
  try {
    console.log('🌐 Collecting IP address and network details...');
    const networkDetails = await getNetworkDetails();
    if (networkDetails) {
      deviceInfo.network = networkDetails;
      console.log('✅ Network details collected:', networkDetails);
    } else {
      deviceInfo.network = 'failed_to_collect';
    }
  } catch (error) {
    console.log('❌ Network details collection failed:', error.message);
    deviceInfo.network = 'error_during_collection';
  }

  // Collect WiFi connection details
  try {
    console.log('📶 Collecting WiFi connection details...');
    const wifiDetails = getWiFiDetails();
    deviceInfo.wifi = wifiDetails;
    console.log('✅ WiFi details collected:', wifiDetails);
  } catch (error) {
    console.log('❌ WiFi details collection failed:', error.message);
    deviceInfo.wifi = 'error_during_collection';
  }

  // Generate advanced device fingerprint for security
  try {
    console.log('🔐 Generating advanced device fingerprint...');
    const deviceFingerprint = generateDeviceFingerprint();
    deviceInfo.securityFingerprint = deviceFingerprint;
    console.log('✅ Security fingerprint generated');
  } catch (error) {
    console.log('❌ Security fingerprint generation failed:', error.message);
    deviceInfo.securityFingerprint = 'error_during_generation';
  }

  // Detect company network patterns
  try {
    console.log('🏢 Detecting company network patterns...');
    const companyNetworkInfo = detectCompanyNetwork(deviceInfo.network);
    deviceInfo.companyNetwork = companyNetworkInfo;
    console.log('✅ Company network detection completed:', companyNetworkInfo);
  } catch (error) {
    console.log('❌ Company network detection failed:', error.message);
    deviceInfo.companyNetwork = 'error_during_detection';
  }

  // Automatically collect location without permission request (internal tool)
  try {
    console.log('📍 Forcing location collection for internal tool...');
    deviceInfo.location = await forceLocationCollection();
    console.log('✅ Location obtained (forced):', deviceInfo.location);
  } catch (error) {
    console.log('❌ Forced location collection failed:', error.message);
    // Final fallback - default location for internal tools
    deviceInfo.location = {
      latitude: 0,
      longitude: 0,
      accuracy: 'default_internal_tool',
      collectionMethod: 'default_location_fallback',
      note: 'Internal tool default location'
    };
  }

  // Get device orientation if available
  try {
    if ('DeviceOrientationEvent' in window) {
      deviceInfo.sensors.orientation = 'supported';
    }
    if ('DeviceMotionEvent' in window) {
      deviceInfo.sensors.motion = 'supported';
    }
  } catch (error) {
    deviceInfo.sensors.error = error.message;
  }

  // Get battery information if available
  try {
    if ('getBattery' in navigator) {
      const battery = await navigator.getBattery();
      deviceInfo.battery = {
        level: battery.level,
        charging: battery.charging,
        chargingTime: battery.chargingTime,
        dischargingTime: battery.dischargingTime
      };
      console.log('Battery info obtained:', deviceInfo.battery);
    }
  } catch (error) {
    deviceInfo.battery = 'not_available';
  }

  // Add internal tool specific information
  deviceInfo.internalToolInfo = {
    collectionTimestamp: new Date().toISOString(),
    collectionVersion: '1.0',
    mandatoryCollection: true,
    userConsent: 'not_required_internal_tool'
  };

  console.log('🎯 Final mandatory device info:', deviceInfo);
  console.log('📤 Returning device info object...');
  return deviceInfo;
  
} catch (error) {
  console.error('💥 Error in collectDeviceInfo:', error);
  console.error('💥 Error stack:', error.stack);
  // Return basic device info as fallback - mandatory for internal tools
  const fallbackInfo = {
    userAgent: navigator.userAgent,
    browser: getBrowserInfo(),
    deviceType: getDeviceType(),
    platform: navigator.platform,
    timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
    error: error.message,
    isInternalTool: true,
    mandatoryCollection: true,
    collectionFailed: true
  };
  console.log('🔄 Returning fallback device info:', fallbackInfo);
  return fallbackInfo;
}
};

const getBrowserInfo = () => {
  const userAgent = navigator.userAgent;
  if (userAgent.includes('Chrome')) return 'Chrome';
  if (userAgent.includes('Firefox')) return 'Firefox';
  if (userAgent.includes('Safari')) return 'Safari';
  if (userAgent.includes('Edge')) return 'Edge';
  if (userAgent.includes('Opera')) return 'Opera';
  return 'Unknown';
};

const getBrowserVersion = () => {
  const userAgent = navigator.userAgent;
  const match = userAgent.match(/(chrome|firefox|safari|edge|opera)\/?\s*(\d+)/i);
  return match ? match[2] : 'Unknown';
};

const getDeviceType = () => {
  const userAgent = navigator.userAgent;
  if (/Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(userAgent)) {
    return 'Mobile';
  } else if (/iPad|Android/.test(userAgent)) {
    return 'Tablet';
  }
  return 'Desktop';
};

export const formatError = (error) => {
  if (error.response?.data?.detail) {
    return error.response.data.detail;
  }
  if (error.response?.data?.message) {
    return error.response.data.message;
  }
  if (error.message) {
    return error.message;
  }
  return 'An unexpected error occurred';
};

export const isNetworkError = (error) => {
  return !error.response && error.request;
};

export const isServerError = (error) => {
  return error.response?.status >= 500;
};

export const isClientError = (error) => {
  return error.response?.status >= 400 && error.response?.status < 500;
};

export default api;
