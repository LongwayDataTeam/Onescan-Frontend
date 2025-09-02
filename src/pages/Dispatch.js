import React, { useState, useEffect, useRef } from 'react';
import { Truck, CheckCircle, XCircle, Clock, Search, Package, Zap, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/soundUtils';

const Dispatch = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('scanning');
  
  // Dispatch Scanning State
  const [trackingId, setTrackingId] = useState('');
  const [scanningLoading, setScanningLoading] = useState(false);
  const [currentStatus, setCurrentStatus] = useState('');
  const [statusLoading, setStatusLoading] = useState(false);
  
  // Dispatch Pending State
  const [pendingTrackingId, setPendingTrackingId] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [pendingCurrentStatus, setPendingCurrentStatus] = useState('');
  const [pendingStatusLoading, setPendingStatusLoading] = useState(false);
  
  // Scanning Logger State
  const [scanLogs, setScanLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  
  // Dispatch Courier Stats State
  const [dispatchCourierStats, setDispatchCourierStats] = useState({});
  const [dispatchCourierStatsLoading, setDispatchCourierStatsLoading] = useState(false);
  
  // Refs for input focus
  const trackingIdInputRef = useRef(null);
  const pendingTrackingIdInputRef = useRef(null);

  // Performance monitoring state
  const [lastScanTime, setLastScanTime] = useState(null);
  const [performanceMode, setPerformanceMode] = useState('ultra-fast');

  // Performance Stats State
  const [globalKPIs, setGlobalKPIs] = useState({
    totalScans: 0,
    successScans: 0,
    errorScans: 0,
    averageResponseTime: 0,
    fastestScan: Infinity,
    slowestScan: 0,
    successRate: 100,
    multiSkuOrders: 0
  });

  const [scanDetails, setScanDetails] = useState({
    successScans: [],
    errorScans: [],
    multiSkuOrders: []
  });

  // Modal states for KPI details
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showMultiSkuModal, setShowMultiSkuModal] = useState(false);

  // Set document title
  useEffect(() => {
    document.title = 'Dispatch - OneScan';
  }, []);

  // Listen for clear data events from other components
  useEffect(() => {
    const handleClearData = (event) => {
      console.log('🗑️ Dispatch: Received clear data event:', event.detail);
      
      // Clear all dispatch data
      setTrackingId('');
      setScanningLoading(false); // Ensure loading states are reset
      setPendingLoading(false);
      
      // Clear local storage
      localStorage.removeItem('dispatchScanningData');
      
      console.log('🗑️ Dispatch: All dispatch data cleared');
      toast.info('Dispatch data cleared due to main data clear operation');
    };

    // Add event listener
    window.addEventListener('clearAllTrackingData', handleClearData);
    
    // Cleanup
    return () => {
      window.removeEventListener('clearAllTrackingData', handleClearData);
    };
  }, []);

  // Load dispatch courier stats on component mount
  useEffect(() => {
    calculateDispatchCourierStats();
  }, []);

  // Function to add scan logs to the table
  const addScanLog = (logData) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...logData
    };
    setScanLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Keep last 100 logs
  };

  // Calculate dispatch courier statistics from ALL DataUpload data (not just first 100)
  const calculateDispatchCourierStats = async () => {
    try {
      setDispatchCourierStatsLoading(true);
      console.log('🔄 Fetching ALL dispatch courier stats from DataUpload API...');
      
      // Import dataAPI dynamically to avoid circular imports
      const { dataAPI } = await import('../services/api');
      
      // Fetch ALL data from DataUpload API using the new function
      const response = await dataAPI.getAllDataForStats();
      console.log('🔍 Dispatch courier stats API response received');
      
      // Extract the data array
      let allData = [];
      if (response.data?.data?.records && Array.isArray(response.data.data.records)) {
        allData = response.data.data.records;
        console.log('✅ Using response.data.data.records (array)');
        console.log(`📊 Total records for dispatch courier stats: ${allData.length}`);
      } else {
        console.error('❌ No valid array found in response');
        return;
      }
      
      // Group data by tracking ID to identify single vs multi SKU
      const trackingIdGroups = {};
      allData.forEach(record => {
        const trackingId = record.tracking_id;
        if (!trackingIdGroups[trackingId]) {
          trackingIdGroups[trackingId] = [];
        }
        trackingIdGroups[trackingId].push(record);
      });
      
      // Calculate courier statistics for dispatch workflow
      const stats = {};
      
      allData.forEach(record => {
        const courier = record.courier || 'Unknown';
        const trackingId = record.tracking_id;
        const status = record.status || 'Unlabeled';
        const isMultiSku = trackingIdGroups[trackingId].length > 1;
        
        // Dispatch workflow statuses
        const isDispatchPending = status === 'dispatch_pending_scanned';
        const isDispatchScanned = status === 'dispatch_scanned';
        
        if (!stats[courier]) {
          stats[courier] = {
            total: 0,
            singleSku: 0,
            dispatchPending: 0,
            multiSku: 0,
            dispatchScanned: 0,
            cancelled: 0
          };
        }
        
        stats[courier].total++;
        
        if (isMultiSku) {
          stats[courier].multiSku++;
          if (isDispatchScanned) {
            stats[courier].dispatchScanned++;
          }
        } else {
          stats[courier].singleSku++;
          if (isDispatchScanned) {
            stats[courier].dispatchScanned++;
          }
        }
        
        // Count dispatch pending regardless of SKU type
        if (isDispatchPending) {
          stats[courier].dispatchPending++;
        }
        
        // Count cancelled regardless of SKU type
        if (status === 'cancel') {
          stats[courier].cancelled++;
        }
      });
      
      console.log('📊 Calculated dispatch courier stats:', stats);
      setDispatchCourierStats(stats);
      toast.success(`✅ Dispatch courier stats updated with ${allData.length} total records!`);
      
    } catch (error) {
      console.error('❌ Error fetching dispatch courier stats:', error);
      toast.error('Failed to fetch dispatch courier statistics');
    } finally {
      setDispatchCourierStatsLoading(false);
    }
  };

  // Update Performance KPIs
  const updateGlobalKPIs = (isSuccess, responseTime, isMultiSku = false) => {
    setGlobalKPIs(prev => {
      const newKPIs = {
        ...prev,
        totalScans: prev.totalScans + 1,
        successScans: isSuccess ? prev.successScans + 1 : prev.successScans,
        errorScans: !isSuccess ? prev.errorScans + 1 : prev.errorScans,
        multiSkuOrders: isMultiSku ? prev.multiSkuOrders + 1 : prev.multiSkuOrders,
        fastestScan: Math.min(prev.fastestScan, responseTime),
        slowestScan: Math.max(prev.slowestScan, responseTime)
      };

      // Calculate average response time
      if (newKPIs.totalScans > 0) {
        newKPIs.averageResponseTime = (prev.averageResponseTime * prev.totalScans + responseTime) / newKPIs.totalScans;
      }

      // Calculate success rate
      if (newKPIs.totalScans > 0) {
        newKPIs.successRate = (newKPIs.successScans / newKPIs.totalScans) * 100;
      }

      return newKPIs;
    });
  };

  // Add scan details for modals
  const addScanDetail = (type, scanData) => {
    const detail = {
      id: Date.now() + Math.random(),
      timestamp: new Date().toLocaleString(),
      ...scanData
    };

    setScanDetails(prev => ({
      ...prev,
      [type]: [detail, ...prev[type].slice(0, 49)] // Keep last 50 records
    }));
  };

  // Check current status before dispatch
  const checkCurrentStatus = async (trackingId) => {
    try {
      const response = await scanAPI.debugTracking({
        tracking_id: trackingId.trim(),
        user_id: user?.user_id
      });
      
      if (response.data?.ok && response.data?.data) {
        return response.data.data.status || 'unknown';
      }
      return 'unknown';
    } catch (error) {
      console.error('Failed to check status:', error);
      return 'unknown';
    }
  };

  // Check status when tracking ID changes (for display purposes)
  const checkStatusForDisplay = async (trackingId, setStatus, setLoading) => {
    if (!trackingId.trim()) {
      setStatus('');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    try {
      const status = await checkCurrentStatus(trackingId);
      setStatus(status);
    } catch (error) {
      setStatus('Error checking status');
    } finally {
      setLoading(false);
    }
  };

  // Monitor tracking ID changes for status display
  useEffect(() => {
    const timer = setTimeout(() => {
      if (trackingId.trim()) {
        checkStatusForDisplay(trackingId, setCurrentStatus, setStatusLoading);
      } else {
        setCurrentStatus('');
        setStatusLoading(false);
      }
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(timer);
  }, [trackingId]);

  // Monitor pending tracking ID changes for status display
  useEffect(() => {
    const timer = setTimeout(() => {
      if (pendingTrackingId.trim()) {
        checkStatusForDisplay(pendingTrackingId, setPendingCurrentStatus, setPendingStatusLoading);
      } else {
        setPendingCurrentStatus('');
        setPendingStatusLoading(false);
      }
    }, 500); // Debounce for 500ms
    
    return () => clearTimeout(timer);
  }, [pendingTrackingId]);

  // Pre-warm dispatch indexes for ultra-fast scanning
  const handlePrewarmDispatch = async () => {
    try {
      toast.info('🚀 Pre-warming dispatch indexes for ultra-fast scanning...');
      
      const response = await scanAPI.prewarmDispatch();
      
      if (response.data?.ok) {
        toast.success('✅ Dispatch indexes pre-warmed successfully! Scanning will be ultra-fast now.');
      } else {
        toast.error('Failed to pre-warm dispatch indexes');
      }
    } catch (error) {
      console.error('Pre-warm dispatch error:', error);
      toast.error('Failed to pre-warm dispatch indexes');
    }
  };

  // Handle Dispatch Scanning
  const handleDispatchScan = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setScanningLoading(true);
    const startTime = performance.now();

    try {
      // First check current status
      const currentStatus = await checkCurrentStatus(trackingId);
      console.log(`🔍 Current status for ${trackingId}: ${currentStatus}`);
      
      // Check if item can be dispatched
      if (currentStatus === 'dispatch_scanned') {
        toast.error(`Item ${trackingId} has already been dispatched and cannot be dispatched again.`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Scan',
          tracking_id: trackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Already Dispatched',
          message: `Item ${trackingId} has already been dispatched and cannot be dispatched again. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setScanningLoading(false);
        setTrackingId('');
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      if (currentStatus === 'label_scanned') {
        toast.error(`Item ${trackingId} needs to be packed first before dispatch. Current status: ${currentStatus}`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Scan',
          tracking_id: trackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Needs Packing',
          message: `Item ${trackingId} needs to be packed first before dispatch. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setScanningLoading(false);
        setTrackingId('');
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      if (currentStatus === 'unlabeled') {
        toast.error(`Item ${trackingId} needs to be labeled first before dispatch. Current status: ${currentStatus}`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Scan',
          tracking_id: trackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Needs Labeling',
          message: `Item ${trackingId} needs to be labeled first before dispatch. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setScanningLoading(false);
        setTrackingId('');
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      // Call real dispatch scan API with performance monitoring
      const response = await scanAPI.dispatchScan({
        tracking_id: trackingId.trim(),
        user_id: user?.user_id
      });
      
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      
      // Update performance metrics
      setLastScanTime(scanTime);
      if (scanTime < 100) {
        setPerformanceMode('ultra-fast');
      } else if (scanTime < 500) {
        setPerformanceMode('fast');
      } else {
        setPerformanceMode('normal');
      }

      const isSuccess = response.data?.success;
      const isMultiSku = false; // Dispatch doesn't have multi-SKU concept like packing

      // Update Performance KPIs
      updateGlobalKPIs(isSuccess, scanTime, isMultiSku);

      if (isSuccess) {
        toast.success(`Dispatch scan successful for ${trackingId} (${scanTime.toFixed(0)}ms)`);
        
        // Add to success scan details
        addScanDetail('successScans', {
          trackingId: trackingId.trim(),
          responseTime: scanTime,
          status: response.data?.status || 'Dispatched'
        });
        
        // Play success sound
        try {
          await playSuccessSound();
        } catch (error) {
          console.error('Sound playback error:', error);
        }
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addScanLog({
          type: 'success',
          action: 'Dispatch Scan',
          tracking_id: trackingId.trim(),
          g_code_ean: 'N/A',
          status: response.data?.status || 'Dispatched',
          message: response.data?.message || `Dispatch scan successful for ${trackingId}`,
          user: user?.username || user?.user_id || 'Unknown',
          scanTime: scanTime.toFixed(0)
        });
        
        setTrackingId('');
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
      } else {
        toast.error(response.data?.message || 'Dispatch scan failed');
        
        // Add to error scan details
        addScanDetail('errorScans', {
          trackingId: trackingId.trim(),
          error: response.data?.message || 'Dispatch scan failed',
          responseTime: scanTime
        });
        
        // Play error sound for scanning error
        try {
          await playErrorSound();
        } catch (error) {
          console.error('Sound playback error:', error);
        }
        
        // ❌ ERROR LOGGER: Add to table and console
        addScanLog({
          type: 'error',
          action: 'Dispatch Scan',
          tracking_id: trackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Dispatch scan failed',
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        setTrackingId('');
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
      }
    } catch (error) {
      const endTime = performance.now();
      const scanTime = endTime - startTime;
      
      // Update Performance KPIs for network error
      updateGlobalKPIs(false, scanTime, false);
      
      // Extract detailed error message from backend
      let errorMessage = 'Dispatch scan failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      // Add to error scan details
      addScanDetail('errorScans', {
        trackingId: trackingId.trim(),
        error: errorMessage,
        responseTime: scanTime
      });
      
      toast.error(errorMessage);
      
      // Play error sound for network/API errors
      try {
        await playErrorSound();
      } catch (error) {
        console.error('Sound playback error:', error);
      }
      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Dispatch Scan',
        tracking_id: trackingId.trim(),
        g_code_ean: 'N/A',
        status: error.response?.status === 400 ? 'Bad Request' : 'Network Error',
        message: errorMessage,
        user: user?.username || user?.user_id || 'Unknown'
      });
      
      setTrackingId('');
      setTimeout(() => {
        trackingIdInputRef.current?.focus();
      }, 100);
    } finally {
      setScanningLoading(false);
    }
  };

  // Handle Dispatch Pending
  const handlePendingScan = async () => {
    if (!pendingTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setPendingLoading(true);
    try {
      // First check current status
      const currentStatus = await checkCurrentStatus(pendingTrackingId);
      console.log(`🔍 Current status for ${pendingTrackingId}: ${currentStatus}`);
      
      // Check if item can be moved to dispatch pending
      if (currentStatus === 'dispatch_scanned') {
        toast.error(`Item ${pendingTrackingId} has already been dispatched and cannot be moved to pending.`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Pending',
          tracking_id: pendingTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Already Dispatched',
          message: `Item ${pendingTrackingId} has already been dispatched and cannot be moved to pending. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setPendingLoading(false);
        setPendingTrackingId('');
        setTimeout(() => {
          pendingTrackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      if (currentStatus === 'label_scanned') {
        toast.error(`Item ${pendingTrackingId} needs to be packed first before dispatch pending. Current status: ${currentStatus}`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Pending',
          tracking_id: pendingTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Needs Packing',
          message: `Item ${pendingTrackingId} needs to be packed first before dispatch pending. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setPendingLoading(false);
        setPendingTrackingId('');
        setTimeout(() => {
          pendingTrackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      if (currentStatus === 'unlabeled') {
        toast.error(`Item ${pendingTrackingId} needs to be labeled first before dispatch pending. Current status: ${currentStatus}`);
        addScanLog({
          type: 'error',
          action: 'Dispatch Pending',
          tracking_id: pendingTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Needs Labeling',
          message: `Item ${pendingTrackingId} needs to be labeled first before dispatch pending. Current status: ${currentStatus}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        setPendingLoading(false);
        setPendingTrackingId('');
        setTimeout(() => {
          pendingTrackingIdInputRef.current?.focus();
        }, 100);
        return;
      }
      
      // 🚀 REAL API CALL: Call the backend dispatch pending endpoint
      console.log('🚀 DISPATCH PENDING API REQUEST DATA:', { 
        tracking_id: pendingTrackingId, 
        user_id: user?.user_id 
      });
      
      const response = await scanAPI.dispatchPending({
        tracking_id: pendingTrackingId,
        user_id: user?.user_id
      });
      
      if (response.data?.success) {
        toast.success(`Dispatch pending scan successful for ${pendingTrackingId}`);
      } else {
        toast.error(response.data?.message || 'Failed to move to dispatch pending');
        throw new Error(response.data?.message || 'API call failed');
      }
      
      // ✅ SUCCESS LOGGER: Add to table and console
      addScanLog({
        type: 'success',
        action: 'Dispatch Pending',
        tracking_id: pendingTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Pending',
        message: `Dispatch pending scan successful for ${pendingTrackingId}`,
        user: user?.username || user?.user_id || 'Unknown'
      });
      
      setPendingTrackingId('');
      setTimeout(() => {
        pendingTrackingIdInputRef.current?.focus();
      }, 100);
    } catch (error) {
      console.error('Dispatch pending scan error:', error);
      
      // Extract detailed error message from backend
      let errorMessage = 'Dispatch pending scan failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
      // ❌ ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Dispatch Pending',
        tracking_id: pendingTrackingId.trim(),
        g_code_ean: 'N/A',
        status: error.response?.status === 400 ? 'Bad Request' : 'Network Error',
        message: errorMessage,
        user: user?.username || user?.user_id || 'Unknown'
      });
      
      setPendingTrackingId('');
      setTimeout(() => {
        pendingTrackingIdInputRef.current?.focus();
      }, 100);
    } finally {
      setPendingLoading(false);
    }
  };

  // Handle Enter key press for tracking ID input
  const handleTrackingIdInput = (e) => {
    if (e.key === 'Enter' && trackingId.trim()) {
      handleDispatchScan();
    }
  };

  // Handle Enter key press for pending tracking ID input
  const handlePendingTrackingIdInput = (e) => {
    if (e.key === 'Enter' && pendingTrackingId.trim()) {
      handlePendingScan();
    }
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Page Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between py-6">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Dispatch</h1>
              <p className="text-gray-600 mt-1">Manage dispatch operations and pending items</p>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-sm text-gray-500">
                Performance Mode: <span className={`font-medium ${performanceMode === 'ultra-fast' ? 'text-green-600' : performanceMode === 'fast' ? 'text-blue-600' : 'text-orange-600'}`}>
                  {performanceMode.replace('-', ' ').toUpperCase()}
                </span>
              </div>
              {lastScanTime && (
                <div className="text-sm text-gray-500">
                  Last Scan: <span className="font-medium text-blue-600">{lastScanTime.toFixed(0)}ms</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-3 space-y-8">

            {/* Tabs */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="border-b border-gray-200">
                <nav className="-mb-px flex space-x-8 px-6">
                  <button
                    onClick={() => setActiveTab('scanning')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'scanning'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Truck className="w-4 h-4 inline mr-2" />
                    Dispatch Scanning
                  </button>
                  <button
                    onClick={() => setActiveTab('pending')}
                    className={`py-4 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'pending'
                        ? 'border-blue-500 text-blue-600'
                        : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                    }`}
                  >
                    <Clock className="w-4 h-4 inline mr-2" />
                    Dispatch Pending
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6">
                {activeTab === 'scanning' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Truck className="w-8 h-8 text-purple-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Dispatch Scanning</h2>
                      <p className="text-sm text-gray-600">
                        Scan tracking ID to process dispatch
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handlePrewarmDispatch}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                          title="Pre-warm dispatch indexes for ultra-fast scanning"
                        >
                          🚀 Pre-warm Dispatch Indexes
                        </button>
                      </div>
                      
                      {/* Performance Display */}
                      {lastScanTime && (
                        <div className="mt-3 p-2 bg-gray-50 rounded text-xs">
                          <div className="flex items-center justify-between">
                            <span className="text-gray-600">Last Scan:</span>
                            <span className={`font-medium ${
                              performanceMode === 'ultra-fast' ? 'text-green-600' :
                              performanceMode === 'fast' ? 'text-blue-600' :
                              'text-orange-600'
                            }`}>
                              {lastScanTime.toFixed(0)}ms ({performanceMode})
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="trackingId" className="block text-sm font-medium text-gray-700 mb-2">
                          Tracking ID
                        </label>
                        <input
                          ref={trackingIdInputRef}
                          type="text"
                          id="trackingId"
                          value={trackingId}
                          onChange={(e) => setTrackingId(e.target.value)}
                          onKeyDown={handleTrackingIdInput}
                          placeholder="Scan/Enter tracking ID and press Enter"
                          className="scan-input w-full"
                          autoFocus
                          disabled={scanningLoading}
                        />
                      </div>
                      
                      {/* Status Display */}
                      {trackingId.trim() && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Current Status:</span>
                            {statusLoading ? (
                              <div className="flex items-center">
                                <div className="spinner w-4 h-4 mr-2"></div>
                                <span className="text-sm text-gray-500">Checking...</span>
                              </div>
                            ) : currentStatus ? (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                currentStatus === 'dispatch_scanned' ? 'bg-red-100 text-red-800' :
                                currentStatus === 'packing_scanned' ? 'bg-green-100 text-green-800' :
                                currentStatus === 'label_scanned' ? 'bg-blue-100 text-blue-800' :
                                currentStatus === 'unlabeled' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {currentStatus.replace('_', ' ').toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">Not found</span>
                            )}
                          </div>
                          {currentStatus && (
                            <div className="mt-2 text-xs text-gray-600">
                              {currentStatus === 'dispatch_scanned' && '✅ Already dispatched - cannot dispatch again'}
                              {currentStatus === 'packing_scanned' && '✅ Ready for dispatch'}
                              {currentStatus === 'label_scanned' && '⚠️ Needs packing before dispatch'}
                              {currentStatus === 'unlabeled' && '⚠️ Needs labeling before dispatch'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button
                        onClick={handleDispatchScan}
                        disabled={
                          scanningLoading || 
                          !trackingId.trim() || 
                          currentStatus === 'dispatch_scanned' ||
                          currentStatus === 'label_scanned' ||
                          currentStatus === 'unlabeled'
                        }
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base"
                      >
                        {scanningLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="spinner w-5 h-5 mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            {currentStatus === 'dispatch_scanned' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Already Dispatched
                              </>
                            ) : currentStatus === 'label_scanned' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Needs Packing First
                              </>
                            ) : currentStatus === 'unlabeled' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Needs Labeling First
                              </>
                            ) : (
                              <>
                                <CheckCircle className="w-5 h-5 mr-2" />
                                Process Dispatch
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}

                {activeTab === 'pending' && (
                  <div className="max-w-2xl mx-auto">
                    <div className="text-center mb-6">
                      <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
                        <Clock className="w-8 h-8 text-red-600" />
                      </div>
                      <h2 className="text-xl font-semibold text-gray-900 mb-2">Dispatch Pending</h2>
                      <p className="text-sm text-gray-600">
                        Scan tracking ID to mark as pending dispatch
                      </p>
                      <div className="mt-3">
                        <button
                          onClick={handlePrewarmDispatch}
                          className="px-3 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 transition-colors"
                          title="Pre-warm dispatch indexes for ultra-fast scanning"
                        >
                          🚀 Pre-warm Dispatch Indexes
                        </button>
                      </div>
                    </div>
                    
                    <div className="space-y-4">
                      <div>
                        <label htmlFor="pendingTrackingId" className="block text-sm font-medium text-gray-700 mb-2">
                          Tracking ID
                        </label>
                        <input
                          ref={pendingTrackingIdInputRef}
                          type="text"
                          id="pendingTrackingId"
                          value={pendingTrackingId}
                          onChange={(e) => setPendingTrackingId(e.target.value)}
                          onKeyDown={handlePendingTrackingIdInput}
                          placeholder="Scan/Enter tracking ID and press Enter"
                          className="scan-input w-full"
                          autoFocus
                          disabled={pendingLoading}
                        />
                      </div>
                      
                      {/* Status Display */}
                      {pendingTrackingId.trim() && (
                        <div className="p-3 bg-gray-50 rounded-lg border">
                          <div className="flex items-center justify-between">
                            <span className="text-sm font-medium text-gray-700">Current Status:</span>
                            {pendingStatusLoading ? (
                              <div className="flex items-center">
                                <div className="spinner w-4 h-4 mr-2"></div>
                                <span className="text-sm text-gray-500">Checking...</span>
                              </div>
                            ) : pendingCurrentStatus ? (
                              <span className={`text-sm px-2 py-1 rounded-full ${
                                pendingCurrentStatus === 'dispatch_scanned' ? 'bg-red-100 text-red-800' :
                                pendingCurrentStatus === 'packing_scanned' ? 'bg-green-100 text-green-800' :
                                pendingCurrentStatus === 'label_scanned' ? 'bg-blue-100 text-blue-800' :
                                pendingCurrentStatus === 'unlabeled' ? 'bg-yellow-100 text-yellow-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                                {pendingCurrentStatus.replace('_', ' ').toUpperCase()}
                              </span>
                            ) : (
                              <span className="text-sm text-gray-500">Not found</span>
                            )}
                          </div>
                          {pendingCurrentStatus && (
                            <div className="mt-2 text-xs text-gray-600">
                              {pendingCurrentStatus === 'dispatch_scanned' && '✅ Already dispatched - cannot move to pending'}
                              {pendingCurrentStatus === 'packing_scanned' && '✅ Ready for dispatch pending'}
                              {pendingCurrentStatus === 'label_scanned' && '⚠️ Needs packing before dispatch pending'}
                              {pendingCurrentStatus === 'unlabeled' && '⚠️ Needs labeling before dispatch pending'}
                            </div>
                          )}
                        </div>
                      )}
                      
                      <button
                        onClick={handlePendingScan}
                        disabled={
                          pendingLoading || 
                          !pendingTrackingId.trim() || 
                          pendingCurrentStatus === 'dispatch_scanned' ||
                          pendingCurrentStatus === 'label_scanned' ||
                          pendingCurrentStatus === 'unlabeled'
                        }
                        className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base"
                      >
                        {pendingLoading ? (
                          <div className="flex items-center justify-center">
                            <div className="spinner w-5 h-5 mr-2"></div>
                            Processing...
                          </div>
                        ) : (
                          <>
                            {pendingCurrentStatus === 'dispatch_scanned' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Already Dispatched
                              </>
                            ) : pendingCurrentStatus === 'label_scanned' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Needs Packing First
                              </>
                            ) : pendingCurrentStatus === 'unlabeled' ? (
                              <>
                                <XCircle className="w-5 h-5 mr-2" />
                                Needs Labeling First
                              </>
                            ) : (
                              <>
                                <Clock className="w-5 h-5 mr-2" />
                                Mark as Pending
                              </>
                            )}
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Courier Summary Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900 flex items-center">
                    <Truck className="w-6 h-6 mr-2 text-green-500" />
                    Dispatch Workflow - Courier Summary
                  </h3>
                  <div className="flex items-center space-x-2">
                    <span className="text-sm text-gray-500">
                      Dispatch workflow statistics by courier
                    </span>
                    <button
                      onClick={() => calculateDispatchCourierStats()}
                      className="p-2 text-gray-400 hover:text-gray-600 transition-colors"
                      title="Refresh courier stats"
                    >
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    </button>
                  </div>
                </div>
              </div>
              
              <div className="p-6">
                <div className="overflow-auto max-h-64 border border-gray-200 rounded-lg">
                  <table className="min-w-full text-xs">
                    <thead className="bg-gray-50 sticky top-0 z-10">
                      <tr>
                        <th className="px-2 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[80px]">
                          Courier
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[50px]">
                          Total
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                          Single SKU
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[90px]">
                          Dispatch Pending
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                          Multi SKU
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[90px]">
                          Dispatch Scanned
                        </th>
                        <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                          Cancelled
                        </th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {Object.entries(dispatchCourierStats).length > 0 ? (
                        Object.entries(dispatchCourierStats).map(([courier, stats], index) => (
                          <tr key={courier} className={index % 2 === 0 ? 'bg-white hover:bg-gray-50' : 'bg-gray-50 hover:bg-gray-100'}>
                            <td className="px-2 py-2 text-xs font-medium text-gray-900 border-r border-gray-200">
                              {courier}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-blue-600 font-bold border-r border-gray-200">
                              {stats.total}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-green-600 font-bold border-r border-gray-200">
                              {stats.singleSku}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-yellow-600 font-bold border-r border-gray-200">
                              {stats.dispatchPending}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-purple-600 font-bold border-r border-gray-200">
                              {stats.multiSku}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-orange-600 font-bold border-r border-gray-200">
                              {stats.dispatchScanned}
                            </td>
                            <td className="px-2 py-2 text-xs text-center text-red-600 font-bold">
                              {stats.cancelled}
                            </td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan="7" className="px-2 py-4 text-xs text-center text-gray-500">
                            No courier data available
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
                
                {/* Summary Row */}
                {Object.entries(dispatchCourierStats).length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-lg p-2">
                    <div className="grid grid-cols-7 gap-2 text-xs">
                      <div className="font-bold text-gray-800">Total:</div>
                      <div className="text-center font-bold text-blue-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.total, 0)}
                      </div>
                      <div className="text-center font-bold text-green-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.singleSku, 0)}
                      </div>
                      <div className="text-center font-bold text-yellow-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.dispatchPending, 0)}
                      </div>
                      <div className="text-center font-bold text-purple-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.multiSku, 0)}
                      </div>
                      <div className="text-center font-bold text-orange-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.dispatchScanned, 0)}
                      </div>
                      <div className="text-center font-bold text-red-700">
                        {Object.values(dispatchCourierStats).reduce((sum, stats) => sum + stats.cancelled, 0)}
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            {/* Dispatch Activity Logger Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="px-6 py-4 border-b border-gray-200">
                <div className="flex items-center justify-between">
                  <h3 className="text-xl font-semibold text-gray-900">Dispatch Activity Logger</h3>
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => setShowLogs(!showLogs)}
                      className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded border transition-colors"
                    >
                      {showLogs ? 'Hide Logs' : 'Show Logs'}
                    </button>
                    <button
                      onClick={() => setScanLogs([])}
                      className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded border transition-colors"
                    >
                      Clear Logs
                    </button>
                  </div>
                </div>
              </div>
              
              {showLogs && (
                <div className="p-6">
                  {scanLogs.length === 0 ? (
                    <div className="text-center text-gray-500 py-12">
                      <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                      <p className="text-lg font-medium">No dispatch activity yet</p>
                      <p className="text-sm text-gray-400">Start scanning to see activity logs here</p>
                    </div>
                  ) : (
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead className="bg-gray-50 border-b border-gray-200">
                          <tr>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Time</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">User</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Action</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Tracking ID</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">G-Code/EAN</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Status</th>
                            <th className="px-4 py-3 text-left font-medium text-gray-700">Message</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-200">
                          {scanLogs.map((log) => (
                            <tr key={log.id} className={`hover:bg-gray-50 ${
                              log.type === 'success' ? 'bg-green-50' : 
                              log.type === 'error' ? 'bg-red-50' : 'bg-white'
                            }`}>
                              <td className="px-4 py-3 text-sm text-gray-600">
                                {new Date(log.timestamp).toLocaleTimeString()}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-medium">
                                {log.user}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700">
                                {log.action}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                                {log.tracking_id}
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 font-mono">
                                {log.g_code_ean}
                              </td>
                              <td className="px-4 py-3">
                                <span className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-medium ${
                                  log.type === 'success' ? 'bg-green-100 text-green-800' :
                                  log.type === 'error' ? 'bg-red-100 text-red-800' :
                                  'bg-gray-100 text-gray-800'
                                }`}>
                                  {log.status}
                                </span>
                              </td>
                              <td className="px-4 py-3 text-sm text-gray-700 max-w-xs truncate" title={log.message}>
                                {log.message}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                  
                  {scanLogs.length > 0 && (
                    <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                      Showing {scanLogs.length} recent scans • Auto-clear after 100 logs
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>

          {/* Performance Stats Sidebar */}
          <div className="lg:col-span-1 space-y-6">
            {/* Performance Stats */}
            <div className="bg-white rounded-lg shadow-sm p-6 border border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                <Zap className="w-5 h-5 mr-2 text-yellow-500" />
                Performance Stats
              </h3>
              
              <div className="space-y-4">
                {/* Clickable Success Count */}
                <button
                  onClick={() => setShowSuccessModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200 hover:from-green-100 hover:to-emerald-100 transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <CheckCircle className="w-4 h-4 mr-2 text-green-600" />
                    Success Scans
                  </span>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-green-600 mr-2">{globalKPIs.successScans}</span>
                    <Eye className="w-4 h-4 text-green-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                
                {/* Clickable Error Count */}
                <button
                  onClick={() => setShowErrorModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-red-50 to-pink-50 rounded-lg border border-red-200 hover:from-red-100 hover:to-pink-100 transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <XCircle className="w-4 h-4 mr-2 text-red-600" />
                    Error Scans
                  </span>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-red-600 mr-2">{globalKPIs.errorScans}</span>
                    <Eye className="w-4 h-4 text-red-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                
                {/* Clickable Multi-SKU Count */}
                <button
                  onClick={() => setShowMultiSkuModal(true)}
                  className="w-full flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-indigo-50 rounded-lg border border-purple-200 hover:from-purple-100 hover:to-indigo-100 transition-all duration-200 cursor-pointer group"
                >
                  <span className="text-sm font-medium text-gray-700 flex items-center">
                    <Package className="w-4 h-4 mr-2 text-purple-600" />
                    Multi-SKU Orders
                  </span>
                  <div className="flex items-center">
                    <span className="text-lg font-bold text-purple-600 mr-2">{globalKPIs.multiSkuOrders}</span>
                    <Eye className="w-4 h-4 text-purple-500 opacity-0 group-hover:opacity-100 transition-opacity" />
                  </div>
                </button>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">Total Scans</span>
                  <span className="text-lg font-bold text-blue-600">{globalKPIs.totalScans}</span>
                </div>
                
                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-purple-50 rounded-lg border border-blue-200">
                  <span className="text-sm font-medium text-gray-700">Avg Response</span>
                  <span className="text-lg font-bold text-blue-600">
                    {globalKPIs.averageResponseTime && globalKPIs.averageResponseTime > 0 ? 
                       `${globalKPIs.averageResponseTime.toFixed(0)}ms` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-yellow-50 to-orange-50 rounded-lg border border-yellow-200">
                  <span className="text-sm font-medium text-gray-700">Fastest Scan</span>
                  <span className="text-lg font-bold text-yellow-600">
                    {globalKPIs.fastestScan && globalKPIs.fastestScan < Infinity ? 
                       `${globalKPIs.fastestScan.toFixed(0)}ms` : 'N/A'}
                  </span>
                </div>

                <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
                  <span className="text-sm font-medium text-gray-700">Success Rate</span>
                  <span className="text-lg font-bold text-purple-600">
                    {globalKPIs.successRate ? globalKPIs.successRate.toFixed(1) : '100.0'}%
                  </span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* KPI Details Modals */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Successful Scans ({scanDetails.successScans.length})
              </h3>
              <button
                onClick={() => setShowSuccessModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.successScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime.toFixed(0)}ms</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.status}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showErrorModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Error Scans ({scanDetails.errorScans.length})
              </h3>
              <button
                onClick={() => setShowErrorModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.errorScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm text-red-600">{scan.error}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime.toFixed(0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {showMultiSkuModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white rounded-lg shadow-xl max-w-4xl w-full mx-4 max-h-[80vh] overflow-hidden">
            <div className="flex items-center justify-between p-6 border-b border-gray-200">
              <h3 className="text-lg font-semibold text-gray-900">
                Multi-SKU Orders ({scanDetails.multiSkuOrders.length})
              </h3>
              <button
                onClick={() => setShowMultiSkuModal(false)}
                className="text-gray-400 hover:text-gray-600"
              >
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto max-h-[60vh]">
              <div className="overflow-x-auto"> 
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.multiSkuOrders.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.totalOrders}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime.toFixed(0)}ms</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dispatch;
