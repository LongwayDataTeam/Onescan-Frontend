import React, { useState, useEffect } from 'react';
import { useAuthStore } from '../stores/authStore';
import { 
  Wifi, 
  Plus, 
  Edit, 
  Trash2, 
  Shield, 
  MapPin, 
  Building, 
  Settings,
  CheckCircle,
  XCircle,
  AlertTriangle,
  Signal
} from 'lucide-react';
import { wifiAPI } from '../services/api';
import { captureCurrentWiFi } from '../services/api';
import toast from 'react-hot-toast';

const Integration = () => {
  const { user, token, isAuthenticated } = useAuthStore();
  const [activeTab, setActiveTab] = useState('wifi');
  const [wifiNetworks, setWifiNetworks] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingNetwork, setEditingNetwork] = useState(null);
  const [wifiStatus, setWifiStatus] = useState(null);
  const [captures, setCaptures] = useState([]);
  const [currentCapture, setCurrentCapture] = useState(null);
  const [showCaptureDetails, setShowCaptureDetails] = useState(false);
  const [captureLoading, setCaptureLoading] = useState(false);
  const [authorizations, setAuthorizations] = useState([]);
  const [showAuthorizationForm, setShowAuthorizationForm] = useState(false);
  const [authorizingCapture, setAuthorizingCapture] = useState(null);

  // Active Sessions state
  const [activeSessions, setActiveSessions] = useState([]);
  const [sessionsLoading, setSessionsLoading] = useState(false);
  const [selectedSession, setSelectedSession] = useState(null);
  const [showSessionDetails, setShowSessionDetails] = useState(false);
  const [showFlashMessage, setShowFlashMessage] = useState(false);
  const [flashMessage, setFlashMessage] = useState('');
  const [flashTarget, setFlashTarget] = useState('');

  // Permission status state
  const [permissionStatus, setPermissionStatus] = useState({
    location: 'unknown',
    networkInfo: 'unknown',
    webRTC: 'unknown',
    connection: 'unknown'
  });

  // Form state
  const [formData, setFormData] = useState({
    ssid: '',
    bssid: '',
    security_type: 'WPA2',
    password: '',
    location: '',
    department: '',
    priority: 1,
    notes: ''
  });

  // Manual SSID input state
  const [manualSSID, setManualSSID] = useState('');

  // Advanced WiFi details input state
  const [advancedWiFi, setAdvancedWiFi] = useState({
    ssid: '',
    localIP: '',
    macAddress: '',
    securityType: ''
  });

  // Check if user has developer permissions
  const isDeveloper = user?.role === 'developer' || user?.role === 'super_admin';

  // Request network permissions
  const requestNetworkPermissions = async () => {
    try {
      console.log('🔐 Starting comprehensive network permission request...');
      const permissionResults = {
        location: false,
        networkInfo: false,
        webRTC: false,
        connection: false
      };
      
      // Test 1: Request location permission (required for network analysis)
      try {
        console.log('📍 Testing location permission...');
        if ('geolocation' in navigator) {
          const position = await new Promise((resolve, reject) => {
            navigator.geolocation.getCurrentPosition(resolve, reject, {
              enableHighAccuracy: true,
              timeout: 10000,
              maximumAge: 60000
            });
          });
          
          permissionResults.location = true;
          console.log('✅ Location permission granted:', {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy
          });
          
          // Test location API call
          try {
            const locationResponse = await fetch(`https://api.ipgeolocation.io/ipgeo?apiKey=demo&ip=8.8.8.8`);
            if (locationResponse.ok) {
              const locationData = await locationResponse.json();
              console.log('✅ Location API test successful:', locationData);
            }
          } catch (apiError) {
            console.log('⚠️ Location API test failed:', apiError.message);
          }
        } else {
          console.log('❌ Geolocation API not available');
        }
      } catch (error) {
        console.log('❌ Location permission failed:', error.message);
      }
      
      // Test 2: Request network information permission
      try {
        console.log('📡 Testing network information permission...');
        if ('permissions' in navigator) {
          try {
            const permission = await navigator.permissions.query({ name: 'network-info' });
            console.log('📡 Network permission status:', permission.state);
            
            if (permission.state === 'granted' || permission.state === 'prompt') {
              // Try to trigger permission request
              if ('networkInfo' in navigator) {
                try {
                  const networkInfo = await navigator.networkInfo.getNetworkInformation();
                  permissionResults.networkInfo = true;
                  console.log('✅ Network information access granted:', networkInfo);
                } catch (error) {
                  console.log('⚠️ Network information access failed:', error.message);
                }
              }
            }
          } catch (error) {
            console.log('⚠️ Network permissions API not available:', error.message);
          }
        }
      } catch (error) {
        console.log('❌ Network information permission failed:', error.message);
      }
      
      // Test 3: Test WebRTC for local network detection
      try {
        console.log('🌐 Testing WebRTC network detection...');
        const rtc = new RTCPeerConnection({ iceServers: [] });
        rtc.createDataChannel('network-test');
        const offer = await rtc.createOffer();
        await rtc.setLocalDescription(offer);
        
        let localIPDetected = false;
        rtc.onicecandidate = (event) => {
          if (event.candidate) {
            const candidate = event.candidate.candidate;
            if (candidate.includes('host')) {
              const hostMatch = candidate.match(/host ([0-9.]+)/);
              if (hostMatch) {
                localIPDetected = true;
                permissionResults.webRTC = true;
                console.log('✅ Local IP detected via WebRTC:', hostMatch[1]);
              }
            }
          }
        };
        
        // Wait for ICE candidates
        await new Promise(resolve => setTimeout(resolve, 2000));
        rtc.close();
        
        if (!localIPDetected) {
          console.log('⚠️ No local IP detected via WebRTC');
        }
      } catch (error) {
        console.log('❌ WebRTC test failed:', error.message);
      }
      
      // Test 4: Test network connection API
      try {
        console.log('📶 Testing network connection API...');
        if ('connection' in navigator) {
          const connection = navigator.connection;
          permissionResults.connection = true;
          console.log('✅ Network connection API available:', {
            effectiveType: connection.effectiveType,
            downlink: connection.downlink,
            rtt: connection.rtt,
            saveData: connection.saveData
          });
        } else {
          console.log('⚠️ Network connection API not available');
        }
      } catch (error) {
        console.log('❌ Network connection API test failed:', error.message);
      }
      
      // Test 5: Test public IP detection API
      try {
        console.log('🌍 Testing public IP detection...');
        const ipResponse = await fetch('https://api.ipify.org?format=json');
        if (ipResponse.ok) {
          const ipData = await ipResponse.json();
          console.log('✅ Public IP detection successful:', ipData.ip);
          
          // Test additional IP geolocation
          try {
            const geoResponse = await fetch(`https://ipapi.co/${ipData.ip}/json/`);
            if (geoResponse.ok) {
              const geoData = await geoResponse.json();
              console.log('✅ IP geolocation successful:', {
                city: geoData.city,
                region: geoData.region,
                country: geoData.country,
                isp: geoData.org
              });
            }
          } catch (geoError) {
            console.log('⚠️ IP geolocation failed:', geoError.message);
          }
        }
      } catch (error) {
        console.log('❌ Public IP detection failed:', error.message);
      }
      
      // Test 6: Test WiFi capture with current permissions
      try {
        console.log('📡 Testing WiFi capture with current permissions...');
        const testWifiDetails = await captureCurrentWiFi();
        console.log('✅ WiFi capture test successful:', testWifiDetails);
        
        // Test sending to backend (if we have valid data)
        if (testWifiDetails && !testWifiDetails.error) {
          try {
            console.log('📤 Testing backend WiFi capture API...');
            const response = await wifiAPI.captureWiFiDetails(testWifiDetails);
            console.log('✅ Backend WiFi capture API test successful:', response.data);
          } catch (apiError) {
            console.log('⚠️ Backend WiFi capture API test failed:', apiError.message);
          }
        }
      } catch (error) {
        console.log('❌ WiFi capture test failed:', error.message);
      }
      
      // Summary of permission results
      console.log('📊 Permission Test Results:', permissionResults);
      
      // Update permission status state
      setPermissionStatus(permissionResults);
      
      const grantedPermissions = Object.values(permissionResults).filter(Boolean).length;
      const totalPermissions = Object.keys(permissionResults).length;
      
      if (grantedPermissions === totalPermissions) {
        toast.success(`✅ All network permissions granted! (${grantedPermissions}/${totalPermissions})`);
      } else if (grantedPermissions > 0) {
        toast.success(`⚠️ Partial permissions granted (${grantedPermissions}/${totalPermissions})`);
      } else {
        toast.error('❌ No network permissions granted');
      }
      
      // Show detailed results
      const resultsMessage = `
🔐 Network Permission Test Results:
📍 Location: ${permissionResults.location ? '✅ Granted' : '❌ Denied'}
📡 Network Info: ${permissionResults.networkInfo ? '✅ Granted' : '❌ Denied'}
🌐 WebRTC: ${permissionResults.webRTC ? '✅ Working' : '❌ Failed'}
📶 Connection API: ${permissionResults.connection ? '✅ Available' : '❌ Unavailable'}
      `.trim();
      
      console.log(resultsMessage);
      
    } catch (error) {
      console.error('❌ Failed to request network permissions:', error);
      toast.error('Failed to request network permissions');
    }
  };

  // Fetch data when tab changes
  useEffect(() => {
    if (activeTab === 'wifi') {
      fetchWiFiNetworks();
      fetchWiFiStatus();
    } else if (activeTab === 'capture') {
      fetchWiFiCaptures();
      fetchWiFiAuthorizations();
    } else if (activeTab === 'sessions') {
      fetchActiveSessions();
    }
  }, [activeTab]);

  const fetchActiveSessions = async () => {
    try {
      setSessionsLoading(true);
      console.log('🔍 Fetching active sessions...');
      console.log('🔑 Auth state:', { isAuthenticated, hasToken: !!token, userRole: user?.role });
      
      // Get the token from the Zustand store
      if (!token || !isAuthenticated) {
        console.error('❌ No authentication token found or user not authenticated');
        toast.error('Authentication required. Please login again.');
        setActiveSessions([]);
        return;
      }
      
      console.log('🔑 Using token:', token.substring(0, 20) + '...');
      console.log('🌐 Making request to:', '/sessions/active-sessions');
      
      // Use the real API endpoint with proper authentication
      const response = await fetch('http://localhost:8000/sessions/active-sessions', {
        method: 'GET',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      console.log('📡 Response status:', response.status);
      console.log('📡 Response headers:', Object.fromEntries(response.headers.entries()));
      
      if (response.ok) {
        const data = await response.json();
        setActiveSessions(data || []);
        console.log('✅ Active sessions fetched:', data);
      } else if (response.status === 401) {
        console.error('❌ Authentication failed. Token may be expired.');
        console.error('📋 Response details:', await response.text());
        toast.error('Authentication failed. Please login again.');
        setActiveSessions([]);
      } else if (response.status === 403) {
        console.error('❌ Access denied. Developer role required.');
        console.error('📋 Response details:', await response.text());
        toast.error('Access denied. Developer role required to view sessions.');
        setActiveSessions([]);
      } else {
        console.error('❌ Failed to fetch active sessions:', response.status);
        const errorText = await response.text();
        console.error('📋 Error response:', errorText);
        toast.error('Failed to fetch active sessions');
        setActiveSessions([]);
      }
    } catch (error) {
      console.error('❌ Error fetching active sessions:', error);
      toast.error('Failed to fetch active sessions');
      setActiveSessions([]);
    } finally {
      setSessionsLoading(false);
    }
  };

  const fetchWiFiNetworks = async () => {
    try {
      setLoading(true);
      const response = await wifiAPI.getWiFiNetworks();
      if (response.data.ok) {
        setWifiNetworks(response.data.data.networks);
      }
    } catch (error) {
      toast.error('Failed to fetch WiFi networks');
      console.error('Error fetching WiFi networks:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchWiFiStatus = async () => {
    try {
      const response = await wifiAPI.getWiFiStatus();
      if (response.data.ok) {
        setWifiStatus(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching WiFi status:', error);
    }
  };

  const fetchWiFiCaptures = async () => {
    try {
      const response = await wifiAPI.getWiFiCaptures();
      if (response.data.ok) {
        console.log('🔍 WiFi captures data:', response.data.data.captures);
        // Add data validation before setting state
        const validCaptures = response.data.data.captures.filter(capture => {
          if (!capture || typeof capture !== 'object') {
            console.warn('⚠️ Invalid capture data:', capture);
            return false;
          }
          return true;
        });
        console.log('✅ Valid captures:', validCaptures);
        setCaptures(validCaptures);
      }
    } catch (error) {
      toast.error('Failed to fetch WiFi captures');
      console.error('Error fetching WiFi captures:', error);
    }
  };

  const handleCaptureWiFi = async () => {
    try {
      setCaptureLoading(true);
      console.log('🔄 Starting WiFi capture process...');
      
      // Capture current WiFi details
      console.log('📶 Calling captureCurrentWiFi...');
      const wifiDetails = await captureCurrentWiFi();
      console.log('✅ WiFi details captured:', wifiDetails);
      
      if (!wifiDetails || wifiDetails.error) {
        throw new Error(`WiFi capture failed: ${wifiDetails?.error || 'Unknown error'}`);
      }
      
      // Send to backend for analysis
      console.log('📤 Sending WiFi details to backend...');
      const response = await wifiAPI.captureWiFiDetails(wifiDetails);
      console.log('✅ Backend response:', response);
      
      if (response.data) {
        console.log('🔍 Setting currentCapture:', response.data);
        // Validate the data before setting state
        if (response.data && typeof response.data === 'object') {
          setCurrentCapture(response.data);
          setShowCaptureDetails(true);
          toast.success('WiFi capture completed successfully!');
          
          // Refresh captures list
          fetchWiFiCaptures();
        } else {
          console.warn('⚠️ Invalid response data:', response.data);
          throw new Error('Backend returned invalid data format');
        }
      } else {
        throw new Error('Backend returned no data');
      }
    } catch (error) {
      console.error('❌ WiFi capture error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      let errorMessage = 'Failed to capture WiFi details';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setCaptureLoading(false);
    }
  };

  const handleManualCapture = async () => {
    if (!manualSSID.trim()) {
      toast.error('Please enter a WiFi network name.');
      return;
    }

    try {
      setCaptureLoading(true);
      console.log('🔄 Starting manual WiFi capture process...');
      console.log('📶 Calling captureCurrentWiFi with manual SSID:', manualSSID);
      const wifiDetails = await captureCurrentWiFi(manualSSID);
      console.log('✅ WiFi details captured:', wifiDetails);

      if (!wifiDetails || wifiDetails.error) {
        throw new Error(`Manual WiFi capture failed: ${wifiDetails?.error || 'Unknown error'}`);
      }

      // Send to backend for analysis
      console.log('📤 Sending WiFi details to backend...');
      const response = await wifiAPI.captureWiFiDetails(wifiDetails);
      console.log('✅ Backend response:', response);

      if (response.data) {
        console.log('🔍 Setting currentCapture (manual):', response.data);
        // Validate the data before setting state
        if (response.data && typeof response.data === 'object') {
          setCurrentCapture(response.data);
          setShowCaptureDetails(true);
          toast.success('WiFi capture completed successfully!');
          
          // Refresh captures list
          fetchWiFiCaptures();
        } else {
          console.warn('⚠️ Invalid response data (manual):', response.data);
          throw new Error('Backend returned invalid data format');
        }
      } else {
        throw new Error('Backend returned no data');
      }
    } catch (error) {
      console.error('❌ Manual WiFi capture error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      let errorMessage = 'Failed to capture WiFi details';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setCaptureLoading(false);
      setManualSSID(''); // Clear manual SSID after capture
    }
  };

  const handleAdvancedWiFiCapture = async () => {
    if (!advancedWiFi.ssid.trim()) {
      toast.error('Please enter a WiFi network name.');
      return;
    }

    try {
      setCaptureLoading(true);
      console.log('🔄 Starting advanced WiFi capture process...');
      console.log('📶 Calling captureCurrentWiFi with advanced details:', advancedWiFi);
      const wifiDetails = {
        ssid: advancedWiFi.ssid,
        local_ip: advancedWiFi.localIP,
        mac_address: advancedWiFi.macAddress,
        security_type: advancedWiFi.securityType,
        password: '' // No password for manual input
      };
      const response = await wifiAPI.captureWiFiDetails(wifiDetails);
      console.log('✅ Backend response:', response);

      if (response.data) {
        setCurrentCapture(response.data);
        setShowCaptureDetails(true);
        toast.success('WiFi capture completed successfully!');
        
        // Refresh captures list
        fetchWiFiCaptures();
      } else {
        throw new Error('Backend returned no data');
      }
    } catch (error) {
      console.error('❌ Advanced WiFi capture error:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        response: error.response?.data
      });
      
      let errorMessage = 'Failed to capture WiFi details';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setCaptureLoading(false);
      setAdvancedWiFi({ ssid: '', localIP: '', macAddress: '', securityType: '' }); // Clear advanced details
    }
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    try {
      setLoading(true);
      
      if (editingNetwork) {
        // Update existing network
        await wifiAPI.updateWiFiNetwork(editingNetwork.id, formData);
        toast.success('WiFi network updated successfully');
      } else {
        // Create new network
        await wifiAPI.createWiFiNetwork(formData);
        toast.success('WiFi network created successfully');
      }
      
      // Reset form and refresh data
      setShowAddForm(false);
      setEditingNetwork(null);
      resetForm();
      fetchWiFiNetworks();
      fetchWiFiStatus();
      
    } catch (error) {
      toast.error(editingNetwork ? 'Failed to update network' : 'Failed to create network');
      console.error('Error saving WiFi network:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (network) => {
    setEditingNetwork(network);
    setFormData({
      ssid: network.ssid || '',
      bssid: network.bssid || '',
      security_type: network.security_type || 'WPA2',
      password: network.password || '',
      location: network.location || '',
      department: network.department || '',
      priority: network.priority || 1,
      notes: network.notes || ''
    });
    setShowAddForm(true);
  };

  const handleDelete = async (networkId) => {
    if (window.confirm('Are you sure you want to delete this WiFi network?')) {
      try {
        await wifiAPI.deleteWiFiNetwork(networkId);
        toast.success('WiFi network deleted successfully');
        fetchWiFiNetworks();
        fetchWiFiStatus();
      } catch (error) {
        toast.error('Failed to delete WiFi network');
        console.error('Error deleting WiFi network:', error);
      }
    }
  };

  const resetForm = () => {
    setFormData({
      ssid: '',
      bssid: '',
      security_type: 'WPA2',
      password: '',
      location: '',
      department: '',
      priority: 1,
      notes: ''
    });
  };

  const cancelForm = () => {
    setShowAddForm(false);
    setEditingNetwork(null);
    resetForm();
  };

  const getSecurityIcon = (securityType) => {
    switch (securityType) {
      case 'WPA3':
        return <Shield className="w-4 h-4 text-green-600" />;
      case 'WPA2':
        return <Shield className="w-4 h-4 text-blue-600" />;
      case 'WEP':
        return <Shield className="w-4 h-4 text-yellow-600" />;
      case 'Open':
        return <Shield className="w-4 h-4 text-red-600" />;
      default:
        return <Shield className="w-4 h-4 text-gray-600" />;
    }
  };

  const getStatusIcon = (isActive) => {
    return isActive ? 
      <CheckCircle className="w-4 h-4 text-green-600" /> : 
      <XCircle className="w-4 h-4 text-red-600" />;
  };

  const fetchWiFiAuthorizations = async () => {
    try {
      const response = await wifiAPI.getWiFiAuthorizations(50);
      if (response.data.ok) {
        setAuthorizations(response.data.data.authorizations);
      }
    } catch (error) {
      console.error('Error fetching WiFi authorizations:', error);
    }
  };

  const handleAuthorizeWiFi = async (capture) => {
    setAuthorizingCapture(capture);
    setShowAuthorizationForm(true);
  };

  const handleAuthorizationSubmit = async (e) => {
    e.preventDefault();
    try {
      const formData = new FormData(e.target);
      const authorizationData = {
        notes: formData.get('notes'),
        access_level: formData.get('access_level')
      };
      
      const response = await wifiAPI.authorizeWiFiCapture(
        authorizingCapture.capture_id, 
        authorizationData
      );
      
      if (response.data.ok) {
        toast.success('WiFi network authorized successfully!');
        setShowAuthorizationForm(false);
        setAuthorizingCapture(null);
        fetchWiFiAuthorizations();
        fetchWiFiCaptures();
      }
    } catch (error) {
      toast.error('Failed to authorize WiFi network');
      console.error('Error authorizing WiFi:', error);
    }
  };

  const handleRevokeAuthorization = async (authorizationId, reason) => {
    if (!reason) {
      reason = prompt('Please provide a reason for revocation:');
      if (!reason) return;
    }
    
    try {
      const response = await wifiAPI.revokeWiFiAuthorization(authorizationId, { reason });
      if (response.data.ok) {
        toast.success('WiFi authorization revoked successfully!');
        fetchWiFiAuthorizations();
        fetchWiFiCaptures();
      }
    } catch (error) {
      toast.error('Failed to revoke WiFi authorization');
      console.error('Error revoking authorization:', error);
    }
  };

  const handleDebugWiFi = async () => {
    try {
      const response = await wifiAPI.debugWiFiNetworks();
      if (response.data.ok) {
        console.log('🔍 WiFi Debug Information:', response.data.data);
        toast.success('WiFi debug info retrieved! Check console for details.');
      }
    } catch (error) {
      toast.error('Failed to get WiFi debug information');
      console.error('Error getting debug info:', error);
    }
  };

  const handleDeleteCapture = async (captureId, ssid) => {
    if (!window.confirm(`Are you sure you want to delete the WiFi capture for "${ssid}"? This action cannot be undone.`)) {
      return;
    }
    
    try {
      const response = await wifiAPI.deleteWiFiCapture(captureId);
      if (response.data.ok) {
        toast.success('WiFi capture deleted successfully!');
        fetchWiFiCaptures();
        fetchWiFiAuthorizations();
      }
    } catch (error) {
      toast.error('Failed to delete WiFi capture');
      console.error('Error deleting capture:', error);
    }
  };

  const handlePauseCapture = async (captureId, ssid) => {
    const reason = prompt(`Please provide a reason for pausing "${ssid}":`);
    if (!reason) return;
    
    try {
      const response = await wifiAPI.pauseWiFiCapture(captureId, { reason });
      if (response.data.ok) {
        toast.success('WiFi capture paused successfully!');
        fetchWiFiCaptures();
        fetchWiFiAuthorizations();
      }
    } catch (error) {
      toast.error('Failed to pause WiFi capture');
      console.error('Error pausing capture:', error);
    }
  };

  const handleActivateCapture = async (captureId, ssid) => {
    if (!window.confirm(`Are you sure you want to activate "${ssid}"?`)) {
      return;
    }
    
    try {
      const response = await wifiAPI.activateWiFiCapture(captureId);
      if (response.data.ok) {
        toast.success('WiFi capture activated successfully!');
        fetchWiFiCaptures();
        fetchWiFiAuthorizations();
      }
    } catch (error) {
      toast.error('Failed to activate WiFi capture');
      console.error('Error activating capture:', error);
    }
  };

  // Session management functions
  const handleLogoutUser = async (sessionId, username) => {
    try {
      console.log(`🚪 Logging out user: ${username} (${sessionId})`);
      
      if (!token || !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(`http://localhost:8000/sessions/${sessionId}/logout`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success(`✅ User ${username} has been logged out`);
        fetchActiveSessions(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to logout user');
      }
    } catch (error) {
      console.error('❌ Error logging out user:', error);
      toast.error(`Failed to logout user ${username}: ${error.message}`);
    }
  };

  const handlePauseSession = async (sessionId, username) => {
    try {
      console.log(`⏸️ Pausing session for user: ${username} (${sessionId})`);
      
      if (!token || !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(`http://localhost:8000/sessions/${sessionId}/pause`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success(`⏸️ Session paused for user ${username}`);
        fetchActiveSessions(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to pause session');
      }
    } catch (error) {
      console.error('❌ Error pausing session:', error);
      toast.error(`Failed to pause session for ${username}: ${error.message}`);
    }
  };

  const handleResumeSession = async (sessionId, username) => {
    try {
      console.log(`▶️ Resuming session for user: ${username} (${sessionId})`);
      
      if (!token || !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      const response = await fetch(`http://localhost:8000/sessions/${sessionId}/resume`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      if (response.ok) {
        toast.success(`▶️ Session resumed for user ${username}`);
        fetchActiveSessions(); // Refresh the list
      } else {
        const errorData = await response.json();
        throw new Error(errorData.detail || 'Failed to resume session');
      }
    } catch (error) {
      console.error('❌ Error resuming session:', error);
      toast.error(`Failed to resume session for ${username}: ${error.message}`);
    }
  };

  const handleFlashMessage = async (sessionId, username) => {
    try {
      console.log('🔍 Flash message parameters:', { sessionId, username, flashMessage, flashTarget });
      
      if (!flashMessage.trim()) {
        toast.error('Please enter a message to flash');
        return;
      }
      
      if (!sessionId) {
        toast.error('Session ID is required');
        return;
      }
      
      if (!token || !isAuthenticated) {
        toast.error('Authentication required. Please login again.');
        return;
      }
      
      console.log(`💬 Flashing message to user: ${username} (${sessionId})`);
      console.log(`📝 Message: ${flashMessage}`);
      
      const response = await fetch(`http://localhost:8000/sessions/${sessionId}/flash`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          message: flashMessage,
          target: flashTarget || 'all'
        })
      });
      
      console.log('📡 Flash message response status:', response.status);
      
      if (response.ok) {
        toast.success(`💬 Message flashed to user ${username}`);
        setFlashMessage('');
        setFlashTarget('');
        setShowFlashMessage(false);
      } else {
        const errorData = await response.json();
        console.error('❌ Flash message error response:', errorData);
        throw new Error(errorData.detail || 'Failed to send flash message');
      }
    } catch (error) {
      console.error('❌ Error sending flash message:', error);
      toast.error(`Failed to send flash message to ${username}: ${error.message}`);
    }
  };

  const handleViewSessionDetails = (session) => {
    setSelectedSession(session);
    setShowSessionDetails(true);
  };

  if (!isDeveloper) {
    return (
      <div className="min-h-screen bg-gray-50 py-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <Shield className="mx-auto h-12 w-12 text-red-500" />
            <h2 className="mt-4 text-2xl font-bold text-gray-900">Access Denied</h2>
            <p className="mt-2 text-gray-600">
              You need developer permissions to access WiFi management features.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Integration & Configuration</h1>
          <p className="mt-2 text-gray-600">
            Manage system integrations and company configurations
          </p>
        </div>

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="-mb-px flex space-x-8">
            <button
              onClick={() => setActiveTab('wifi')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'wifi'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Wifi className="w-4 h-4 inline mr-2" />
              WiFi Management
            </button>
            <button
              onClick={() => setActiveTab('capture')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'capture'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Shield className="w-4 h-4 inline mr-2" />
              WiFi Capture & Security
            </button>
            <button
              onClick={() => setActiveTab('sessions')}
              className={`py-2 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'sessions'
                  ? 'border-indigo-500 text-indigo-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <Signal className="w-4 h-4 inline mr-2" />
              Active Sessions
            </button>
          </nav>
        </div>

        {/* WiFi Management Tab */}
        {activeTab === 'wifi' && (
          <div className="space-y-6">
            {/* WiFi Status Overview */}
            {wifiStatus && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">WiFi Network Status</h3>
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Wifi className="w-6 h-6 text-blue-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-blue-600">Total Networks</p>
                        <p className="text-2xl font-bold text-blue-900">{wifiStatus.total_networks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <CheckCircle className="w-6 h-6 text-green-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-green-600">Active Networks</p>
                        <p className="text-2xl font-bold text-green-900">{wifiStatus.active_networks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-yellow-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <AlertTriangle className="w-6 h-6 text-yellow-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-yellow-600">Inactive Networks</p>
                        <p className="text-2xl font-bold text-yellow-900">{wifiStatus.inactive_networks}</p>
                      </div>
                    </div>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg">
                    <div className="flex items-center">
                      <Settings className="w-6 h-6 text-gray-600" />
                      <div className="ml-3">
                        <p className="text-sm font-medium text-gray-600">Last Updated</p>
                        <p className="text-sm font-bold text-gray-900">
                          {wifiStatus.last_updated ? 
                            new Date(parseInt(wifiStatus.last_updated)).toLocaleDateString() : 
                            'Never'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Add Network Button */}
            <div className="flex justify-between items-center">
              <h2 className="text-xl font-semibold text-gray-900">Company WiFi Networks</h2>
              <button
                onClick={() => setShowAddForm(true)}
                className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Network
              </button>
            </div>

            {/* Add/Edit Network Form */}
            {showAddForm && (
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  {editingNetwork ? 'Edit WiFi Network' : 'Add New WiFi Network'}
                </h3>
                <form onSubmit={handleSubmit} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Network Name (SSID)</label>
                      <input
                        type="text"
                        name="ssid"
                        value={formData.ssid}
                        onChange={handleInputChange}
                        required
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Company WiFi"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Router MAC (BSSID)</label>
                      <input
                        type="text"
                        name="bssid"
                        value={formData.bssid}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="00:11:22:33:44:55 (optional)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Security Type</label>
                      <select
                        name="security_type"
                        value={formData.security_type}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      >
                        <option value="WPA3">WPA3 (Most Secure)</option>
                        <option value="WPA2">WPA2 (Secure)</option>
                        <option value="WEP">WEP (Less Secure)</option>
                        <option value="Open">Open (No Security)</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Password</label>
                      <input
                        type="password"
                        name="password"
                        value={formData.password}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="WiFi password (if secured)"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Location</label>
                      <input
                        type="text"
                        name="location"
                        value={formData.location}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Office Building, Floor 2"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Department</label>
                      <input
                        type="text"
                        name="department"
                        value={formData.department}
                        onChange={handleInputChange}
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                        placeholder="IT Department"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Priority</label>
                      <input
                        type="number"
                        name="priority"
                        value={formData.priority}
                        onChange={handleInputChange}
                        min="1"
                        max="10"
                        className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      />
                      <p className="mt-1 text-xs text-gray-500">Higher number = higher priority</p>
                    </div>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Notes</label>
                    <textarea
                      name="notes"
                      value={formData.notes}
                      onChange={handleInputChange}
                      rows="3"
                      className="mt-1 block w-full border border-gray-300 rounded-md px-3 py-2 focus:outline-none focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Additional information about this network"
                    />
                  </div>
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={cancelForm}
                      className="px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={loading}
                      className="px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      {loading ? 'Saving...' : (editingNetwork ? 'Update Network' : 'Add Network')}
                    </button>
                  </div>
                </form>
              </div>
            )}

            {/* WiFi Networks List */}
            <div className="bg-white rounded-lg shadow overflow-hidden">
              <div className="px-6 py-4 border-b border-gray-200">
                <h3 className="text-lg font-medium text-gray-900">Configured Networks</h3>
              </div>
              {loading ? (
                <div className="p-6 text-center">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
                  <p className="mt-2 text-gray-600">Loading networks...</p>
                </div>
              ) : wifiNetworks.length === 0 ? (
                <div className="p-6 text-center">
                  <Wifi className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No WiFi networks</h3>
                  <p className="mt-1 text-sm text-gray-500">
                    Get started by adding your first company WiFi network.
                  </p>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Network
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Security
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Location
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Status
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Priority
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {wifiNetworks.map((network) => (
                        <tr key={network.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Wifi className="w-5 h-5 text-gray-400 mr-3" />
                              <div>
                                <div className="text-sm font-medium text-gray-900">{network.ssid}</div>
                                {network.bssid && (
                                  <div className="text-sm text-gray-500">{network.bssid}</div>
                                )}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getSecurityIcon(network.security_type)}
                              <span className="ml-2 text-sm text-gray-900">{network.security_type}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              {network.location && (
                                <div className="flex items-center">
                                  <MapPin className="w-4 h-4 text-gray-400 mr-1" />
                                  {network.location}
                                </div>
                              )}
                              {network.department && (
                                <div className="flex items-center text-gray-500">
                                  <Building className="w-4 h-4 text-gray-400 mr-1" />
                                  {network.department}
                                </div>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              {getStatusIcon(network.is_active)}
                              <span className="ml-2 text-sm text-gray-900">
                                {network.is_active ? 'Active' : 'Inactive'}
                              </span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Signal className="w-4 h-4 text-gray-400 mr-1" />
                              <span className="text-sm text-gray-900">{network.priority}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                            <div className="flex space-x-2">
                              <button
                                onClick={() => handleEdit(network)}
                                className="text-blue-600 hover:text-blue-900"
                              >
                                <Edit className="w-4 h-4" />
                              </button>
                              <button
                                onClick={() => handleDelete(network.id)}
                                className="text-red-600 hover:text-red-900"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* WiFi Capture & Security Tab */}
        {activeTab === 'capture' && (
          <div className="space-y-6">
            {/* Header with Debug Button */}
            <div className="flex justify-between items-center">
              <div>
                <h3 className="text-lg font-medium text-gray-900">WiFi Capture & Security</h3>
                <p className="text-sm text-gray-600">
                  Capture and analyze WiFi networks for security assessment
                </p>
              </div>
              <button
                onClick={handleDebugWiFi}
                className="px-4 py-2 text-sm font-medium text-white bg-purple-600 rounded-md hover:bg-purple-700 transition-colors"
              >
                🔍 Debug WiFi
              </button>
            </div>

            {/* Network Permissions Section */}
            <div className="bg-blue-50 border border-blue-200 rounded-md p-4 mb-4">
              <div className="flex justify-between items-start">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      🔐 Network Permissions Required
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <p>
                        <strong>For accurate WiFi detection, please grant network permissions:</strong>
                      </p>
                      <ul className="mt-1 list-disc list-inside">
                        <li>✅ <strong>Location Access</strong> - Required for network analysis</li>
                        <li>✅ <strong>Network Information</strong> - Required for WiFi details</li>
                        <li>✅ <strong>System Network</strong> - Required for accurate detection</li>
                      </ul>
                      <p className="mt-2 text-xs">
                        <em>These permissions help distinguish between WiFi and cellular networks accurately.</em>
                      </p>
                    </div>
                    
                    {/* Permission Status Display */}
                    <div className="mt-3 grid grid-cols-2 gap-2">
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${
                          permissionStatus.location === true ? 'bg-green-500' : 
                          permissionStatus.location === false ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-xs">📍 Location</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${
                          permissionStatus.networkInfo === true ? 'bg-green-500' : 
                          permissionStatus.networkInfo === false ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-xs">📡 Network Info</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${
                          permissionStatus.webRTC === true ? 'bg-green-500' : 
                          permissionStatus.webRTC === false ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-xs">🌐 WebRTC</span>
                      </div>
                      <div className="flex items-center space-x-2">
                        <span className={`w-3 h-3 rounded-full ${
                          permissionStatus.connection === true ? 'bg-green-500' : 
                          permissionStatus.connection === false ? 'bg-red-500' : 'bg-gray-400'
                        }`}></span>
                        <span className="text-xs">📶 Connection</span>
                      </div>
                    </div>
                  </div>
                </div>
                <button
                  onClick={requestNetworkPermissions}
                  className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  🔐 Test Permissions
                </button>
              </div>
            </div>

            {/* Manual SSID Input */}
            <div className="bg-gray-50 border border-gray-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Manual Network Information</h4>
              <p className="text-xs text-gray-600 mb-3">
                If automatic detection fails, enter your network details manually:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Network Name (SSID)</label>
                  <input
                    type="text"
                    value={manualSSID}
                    onChange={(e) => setManualSSID(e.target.value)}
                    placeholder="e.g., Airtel_E 12"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <button
                    onClick={handleManualCapture}
                    disabled={!manualSSID.trim()}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                  >
                    📡 Capture with Manual SSID
                  </button>
                </div>
              </div>
            </div>

            {/* Advanced WiFi Details Input */}
            <div className="bg-green-50 border border-green-200 rounded-md p-4 mb-4">
              <h4 className="text-sm font-medium text-gray-700 mb-2">Advanced Network Details</h4>
              <p className="text-xs text-gray-600 mb-3">
                Provide detailed network information for comprehensive analysis:
              </p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">SSID</label>
                  <input
                    type="text"
                    value={advancedWiFi.ssid}
                    onChange={(e) => setAdvancedWiFi({...advancedWiFi, ssid: e.target.value})}
                    placeholder="Network name"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Local IP</label>
                  <input
                    type="text"
                    value={advancedWiFi.localIP}
                    onChange={(e) => setAdvancedWiFi({...advancedWiFi, localIP: e.target.value})}
                    placeholder="e.g., 192.168.1.21"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">MAC Address</label>
                  <input
                    type="text"
                    value={advancedWiFi.macAddress}
                    onChange={(e) => setAdvancedWiFi({...advancedWiFi, macAddress: e.target.value})}
                    placeholder="e.g., F8:E4:E3:12:EF:76"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 mb-1">Security Type</label>
                  <input
                    type="text"
                    value={advancedWiFi.securityType}
                    onChange={(e) => setAdvancedWiFi({...advancedWiFi, securityType: e.target.value})}
                    placeholder="e.g., WPA2-Personal"
                    className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm"
                  />
                </div>
              </div>
              <div className="mt-3">
                <button
                  onClick={handleAdvancedWiFiCapture}
                  disabled={!advancedWiFi.ssid.trim()}
                  className="bg-green-600 hover:bg-green-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  🔒 Capture with Advanced Details
                </button>
              </div>
            </div>

            {/* Current WiFi Capture */}
            <div className="bg-white border border-gray-200 rounded-md p-4 mb-4">
              <div className="flex justify-between items-center mb-3">
                <h4 className="text-sm font-medium text-gray-700">Current Network Capture</h4>
                <button
                  onClick={handleCaptureWiFi}
                  disabled={captureLoading}
                  className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-md text-sm font-medium"
                >
                  {captureLoading ? '📡 Capturing...' : '📡 Capture Current Network'}
                </button>
              </div>
              
              {currentCapture && (
                <div className="bg-gray-50 p-3 rounded border">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Network</div>
                      <div className="text-sm text-gray-900">{currentCapture.ssid}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Risk Level</div>
                      <div className={`text-sm font-semibold ${
                        currentCapture.risk_assessment === 'critical' ? 'text-red-600' :
                        currentCapture.risk_assessment === 'high' ? 'text-orange-600' :
                        currentCapture.risk_assessment === 'medium' ? 'text-yellow-600' :
                        currentCapture.risk_assessment === 'low' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {currentCapture.risk_assessment && typeof currentCapture.risk_assessment === 'string' 
                          ? currentCapture.risk_assessment.toUpperCase() 
                          : 'UNKNOWN'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Network Type</div>
                      <div className="text-sm text-gray-900">
                        {currentCapture.developer_access && typeof currentCapture.developer_access === 'boolean' && currentCapture.developer_access ? (
                          <div className="text-sm text-blue-600">👨‍💻 Developer Access</div>
                        ) : (
                          <div className="text-sm text-green-600">🏢 Company Network</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Capture ID</div>
                      <div className="text-sm text-gray-900 font-mono">{currentCapture.capture_id || 'Unknown'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Timestamp</div>
                      <div className="text-sm text-gray-900">
                        {currentCapture.capture_timestamp ? new Date(parseInt(currentCapture.capture_timestamp)).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                  
                  {/* Security Analysis */}
                  {currentCapture.security_analysis && typeof currentCapture.security_analysis === 'object' && (
                    <div className="mt-4">
                      <h5 className="font-medium text-gray-900 mb-2">Security Analysis</h5>
                      <div className="space-y-2">
                        {currentCapture.security_analysis.warnings && Array.isArray(currentCapture.security_analysis.warnings) && currentCapture.security_analysis.warnings.length > 0 && (
                          <div className="bg-red-50 p-3 rounded border border-red-200">
                            <div className="text-sm font-medium text-red-800 mb-1">⚠️ Security Warnings:</div>
                            {currentCapture.security_analysis.warnings.map((warning, index) => (
                              <div key={index} className="text-sm text-red-700">• {warning}</div>
                            ))}
                          </div>
                        )}
                        
                        {currentCapture.security_analysis.recommendations && Array.isArray(currentCapture.security_analysis.recommendations) && currentCapture.security_analysis.recommendations.length > 0 && (
                          <div className="bg-blue-50 p-3 rounded border border-blue-200">
                            <div className="text-sm font-medium text-blue-800 mb-1">💡 Recommendations:</div>
                            {currentCapture.security_analysis.recommendations.map((rec, index) => (
                              <div key={index} className="text-sm text-blue-700">• {rec}</div>
                            ))}
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* WiFi Captures History */}
            <div className="bg-white rounded-lg shadow p-6">
              <h4 className="text-lg font-medium text-gray-900 mb-4">WiFi Capture History</h4>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Network
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        IP Address
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        MAC/Local IP
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Captured By
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Date
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Risk Level
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {Array.isArray(captures) && captures.length > 0 ? captures.map((capture) => (
                      <tr key={capture.capture_id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {capture.ssid || 'Unknown'}
                            </div>
                            <div className="text-sm text-gray-500">
                              {capture.bssid || 'N/A'}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {capture.ip_address || 'N/A'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div>
                            <div className="text-sm font-medium text-gray-900">
                              {capture.local_ip || capture.mac_address || 'N/A'}
                            </div>
                            {capture.security_indicators && 
                             typeof capture.security_indicators === 'object' && 
                             capture.security_indicators.hasMACInfo && (
                              <div className="text-xs text-green-600">
                                ✅ MAC Info Available
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            capture.status === 'paused' 
                              ? 'bg-yellow-100 text-yellow-800' 
                              : 'bg-green-100 text-green-800'
                          }`}>
                            {capture.status === 'paused' ? '⏸️ Paused' : '✅ Active'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {capture.captured_by || 'Unknown'}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {new Date(parseInt(capture.capture_timestamp)).toLocaleString()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            capture.risk_assessment === 'low' 
                              ? 'bg-green-100 text-green-800'
                              : capture.risk_assessment === 'medium'
                              ? 'bg-yellow-100 text-yellow-800'
                              : 'bg-red-100 text-red-800'
                          }`}>
                            {capture.risk_assessment || 'unknown'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                          {capture.status === 'paused' ? (
                            <button
                              onClick={() => handleActivateCapture(capture.capture_id, capture.ssid)}
                              className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs"
                            >
                              ▶️ Activate
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePauseCapture(capture.capture_id, capture.ssid)}
                              className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs"
                            >
                              ⏸️ Pause
                            </button>
                          )}
                          
                          {!authorizations.find(auth => auth.capture_id === capture.capture_id) && (
                            <button
                              onClick={() => handleAuthorizeWiFi(capture)}
                              className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs"
                            >
                              ✅ Authorize
                            </button>
                          )}
                          
                          <button
                            onClick={() => handleDeleteCapture(capture.capture_id, capture.ssid)}
                            className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                          >
                            🗑️ Delete
                          </button>
                        </td>
                      </tr>
                    )) : (
                      <tr>
                        <td colSpan="8" className="px-6 py-4 text-center text-gray-500">
                          No WiFi captures found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Authorization Form Modal */}
        {showAuthorizationForm && authorizingCapture && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  Authorize WiFi Network
                </h3>
                <form onSubmit={handleAuthorizationSubmit} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Network Name
                    </label>
                    <input
                      type="text"
                      value={authorizingCapture.ssid || 'Unknown'}
                      disabled
                      className="w-full px-3 py-2 border border-gray-300 rounded-md bg-gray-50"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Access Level
                    </label>
                    <select
                      name="access_level"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    >
                      <option value="standard">Standard Access</option>
                      <option value="restricted">Restricted Access</option>
                      <option value="full">Full Access</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      name="notes"
                      rows="3"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      placeholder="Why is this network being authorized?"
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowAuthorizationForm(false);
                        setAuthorizingCapture(null);
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-green-600 border border-transparent rounded-md hover:bg-green-700"
                    >
                      Authorize Network
                    </button>
                  </div>
                </form>
        </div>
            </div>
          </div>
        )}

        {/* Capture Details Modal */}
        {showCaptureDetails && currentCapture && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    WiFi Capture Details
                  </h3>
                  <button
                    onClick={() => setShowCaptureDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                {currentCapture && typeof currentCapture === 'object' ? (
                  <div className="space-y-4">
                    <div>
                      <div className="text-sm font-medium text-gray-700">Network</div>
                      <div className="text-sm text-gray-900">{currentCapture.ssid || 'Unknown'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Risk Level</div>
                      <div className={`text-sm font-semibold ${
                        currentCapture.risk_assessment === 'critical' ? 'text-red-600' :
                        currentCapture.risk_assessment === 'high' ? 'text-orange-600' :
                        currentCapture.risk_assessment === 'medium' ? 'text-yellow-600' :
                        currentCapture.risk_assessment === 'low' ? 'text-blue-600' :
                        'text-gray-600'
                      }`}>
                        {currentCapture.risk_assessment && typeof currentCapture.risk_assessment === 'string' 
                          ? currentCapture.risk_assessment.toUpperCase() 
                          : 'UNKNOWN'}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Network Type</div>
                      <div className="text-sm text-gray-900">
                        {currentCapture.developer_access && typeof currentCapture.developer_access === 'boolean' && currentCapture.developer_access ? (
                          <div className="text-sm text-blue-600">👨‍💻 Developer Access</div>
                        ) : (
                          <div className="text-sm text-green-600">🏢 Company Network</div>
                        )}
                      </div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Capture ID</div>
                      <div className="text-sm text-gray-900 font-mono">{currentCapture.capture_id || 'Unknown'}</div>
                    </div>
                    
                    <div>
                      <div className="text-sm font-medium text-gray-700">Timestamp</div>
                      <div className="text-sm text-gray-900">
                        {currentCapture.capture_timestamp ? new Date(parseInt(currentCapture.capture_timestamp)).toLocaleString() : 'Unknown'}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-sm text-gray-500">No capture details available</div>
                )}
                
                {/* Security Analysis */}
                {currentCapture && currentCapture.security_analysis && typeof currentCapture.security_analysis === 'object' && (
                  <div className="mt-4">
                    <h5 className="font-medium text-gray-900 mb-2">Security Analysis</h5>
                    <div className="space-y-2">
                      {currentCapture.security_analysis.warnings && Array.isArray(currentCapture.security_analysis.warnings) && currentCapture.security_analysis.warnings.length > 0 && (
                        <div className="bg-red-50 p-3 rounded border border-red-200">
                          <div className="text-sm font-medium text-red-800 mb-1">⚠️ Security Warnings:</div>
                          {currentCapture.security_analysis.warnings.map((warning, index) => (
                            <div key={index} className="text-sm text-red-700">• {warning}</div>
                          ))}
                        </div>
                      )}
                      
                      {currentCapture.security_analysis.recommendations && Array.isArray(currentCapture.security_analysis.recommendations) && currentCapture.security_analysis.recommendations.length > 0 && (
                        <div className="bg-blue-50 p-3 rounded border border-blue-200">
                          <div className="text-sm font-medium text-blue-800 mb-1">💡 Recommendations:</div>
                          {currentCapture.security_analysis.recommendations.map((rec, index) => (
                            <div key={index} className="text-sm text-blue-700">• {rec}</div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                )}
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowCaptureDetails(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Active Sessions Tab */}
        {activeTab === 'sessions' && (
          <div className="space-y-6">
            {/* Sessions Overview */}
            <div className="bg-white rounded-lg shadow p-6">
              <div className="flex justify-between items-center mb-4">
                <div>
                  <h3 className="text-lg font-medium text-gray-900">Active User Sessions</h3>
                  <p className="text-sm text-gray-600">
                    Monitor and manage all currently logged-in users
                  </p>
                </div>
                <div className="flex space-x-2">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                    {activeSessions.filter(s => s.status === 'active').length} Active
                  </span>
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                    {activeSessions.filter(s => s.status === 'paused').length} Paused
                  </span>
                </div>
              </div>

              {/* Sessions Table */}
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        User
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Device Info
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Location
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Login Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Last Activity
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {sessionsLoading ? (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center">
                          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto"></div>
                          <p className="mt-2 text-sm text-gray-500">Loading sessions...</p>
                        </td>
                      </tr>
                    ) : activeSessions.length > 0 ? (
                      activeSessions.map((session) => (
                        <tr key={session.session_id}>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div>
                              <div className="text-sm font-medium text-gray-900">
                                {session.username}
                              </div>
                              <div className="text-sm text-gray-500">
                                {session.role}
                              </div>
                              <div className="text-xs text-gray-400">
                                {session.ip_address}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="text-sm text-gray-900">
                              <div className="font-medium">{session.device_info.platform}</div>
                              <div className="text-gray-500">{session.device_info.screen}</div>
                              <div className="text-gray-400 text-xs">{session.device_info.timezone}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="text-sm text-gray-900">
                              <div>{session.location.city}</div>
                              <div className="text-gray-500">{session.location.country}</div>
                              <div className="text-gray-400 text-xs">
                                {session.location.latitude.toFixed(4)}, {session.location.longitude.toFixed(4)}
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(session.login_time).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {new Date(session.last_activity).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                              session.status === 'active' 
                                ? 'bg-green-100 text-green-800' 
                                : 'bg-yellow-100 text-yellow-800'
                            }`}>
                              {session.status === 'active' ? '🟢 Active' : '⏸️ Paused'}
                            </span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm font-medium space-x-2">
                            <button
                              onClick={() => handleViewSessionDetails(session)}
                              className="text-indigo-600 hover:text-indigo-900 bg-indigo-100 hover:bg-indigo-200 px-2 py-1 rounded text-xs"
                            >
                              👁️ View
                            </button>
                            
                            {session.status === 'active' ? (
                              <button
                                onClick={() => handlePauseSession(session.session_id, session.username)}
                                className="text-yellow-600 hover:text-yellow-900 bg-yellow-100 hover:bg-yellow-200 px-2 py-1 rounded text-xs"
                              >
                                ⏸️ Pause
                              </button>
                            ) : (
                              <button
                                onClick={() => handleResumeSession(session.session_id, session.username)}
                                className="text-green-600 hover:text-green-900 bg-green-100 hover:bg-green-200 px-2 py-1 rounded text-xs"
                              >
                                ▶️ Resume
                              </button>
                            )}
                            
                            <button
                              onClick={() => {
                                setSelectedSession(session);
                                setFlashTarget(session.username);
                                setShowFlashMessage(true);
                              }}
                              className="text-blue-600 hover:text-blue-900 bg-blue-100 hover:bg-blue-200 px-2 py-1 rounded text-xs"
                            >
                              💬 Flash
                            </button>
                            
                            <button
                              onClick={() => handleLogoutUser(session.session_id, session.username)}
                              className="text-red-600 hover:text-red-900 bg-red-100 hover:bg-red-200 px-2 py-1 rounded text-xs"
                            >
                              🚪 Logout
                            </button>
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan="7" className="px-6 py-4 text-center text-gray-500">
                          No active sessions found
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* Flash Message Modal */}
        {showFlashMessage && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <h3 className="text-lg font-medium text-gray-900 mb-4">
                  💬 Send Flash Message
                </h3>
                <form onSubmit={(e) => {
                  e.preventDefault();
                  handleFlashMessage(selectedSession?.session_id, selectedSession?.username);
                }} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Target User
                    </label>
                    <input
                      type="text"
                      value={flashTarget}
                      onChange={(e) => setFlashTarget(e.target.value)}
                      placeholder="Username or 'all' for broadcast"
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Message
                    </label>
                    <textarea
                      value={flashMessage}
                      onChange={(e) => setFlashMessage(e.target.value)}
                      rows="4"
                      placeholder="Enter your message..."
                      className="w-full px-3 py-2 border border-gray-300 rounded-md"
                      required
                    />
                  </div>
                  
                  <div className="flex justify-end space-x-3">
                    <button
                      type="button"
                      onClick={() => {
                        setShowFlashMessage(false);
                        setFlashMessage('');
                        setFlashTarget('');
                      }}
                      className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 text-sm font-medium text-white bg-blue-600 border border-transparent rounded-md hover:bg-blue-700"
                    >
                      Send Message
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* Session Details Modal */}
        {showSessionDetails && selectedSession && (
          <div className="fixed inset-0 bg-gray-600 bg-opacity-50 overflow-y-auto h-full w-full z-50">
            <div className="relative top-20 mx-auto p-5 border w-96 shadow-lg rounded-md bg-white">
              <div className="mt-3">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-medium text-gray-900">
                    👤 Session Details
                  </h3>
                  <button
                    onClick={() => setShowSessionDetails(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div>
                    <div className="text-sm font-medium text-gray-700">User Information</div>
                    <div className="text-sm text-gray-900">
                      <div><strong>Username:</strong> {selectedSession.username}</div>
                      <div><strong>Role:</strong> {selectedSession.role}</div>
                      <div><strong>Session ID:</strong> {selectedSession.session_id}</div>
                      <div><strong>IP Address:</strong> {selectedSession.ip_address}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700">Device Information</div>
                    <div className="text-sm text-gray-900">
                      <div><strong>Platform:</strong> {selectedSession.device_info.platform}</div>
                      <div><strong>Screen:</strong> {selectedSession.device_info.screen}</div>
                      <div><strong>Timezone:</strong> {selectedSession.device_info.timezone}</div>
                      <div><strong>User Agent:</strong> <span className="text-xs">{selectedSession.device_info.userAgent.substring(0, 50)}...</span></div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700">Location</div>
                    <div className="text-sm text-gray-900">
                      <div><strong>City:</strong> {selectedSession.location.city}</div>
                      <div><strong>Country:</strong> {selectedSession.location.country}</div>
                      <div><strong>Coordinates:</strong> {selectedSession.location.latitude.toFixed(4)}, {selectedSession.location.longitude.toFixed(4)}</div>
                    </div>
                  </div>
                  
                  <div>
                    <div className="text-sm font-medium text-gray-700">Session Information</div>
                    <div className="text-sm text-gray-900">
                      <div><strong>Login Time:</strong> {new Date(selectedSession.login_time).toLocaleString()}</div>
                      <div><strong>Last Activity:</strong> {new Date(selectedSession.last_activity).toLocaleString()}</div>
                      <div><strong>Status:</strong> 
                        <span className={`ml-2 inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                          selectedSession.status === 'active' 
                            ? 'bg-green-100 text-green-800' 
                            : 'bg-yellow-100 text-yellow-800'
                        }`}>
                          {selectedSession.status === 'active' ? '🟢 Active' : '⏸️ Paused'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
                
                <div className="mt-6 flex justify-end">
                  <button
                    onClick={() => setShowSessionDetails(false)}
                    className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200"
                  >
                    Close
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default Integration;
