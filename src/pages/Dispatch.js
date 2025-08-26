import React, { useState, useEffect, useRef } from 'react';
import { Truck, CheckCircle, XCircle, Clock, Search, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';

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
        // Focus back to input for next scan
        trackingIdInputRef.current?.focus();
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
        // Focus back to input for next scan
        trackingIdInputRef.current?.focus();
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
        // Focus back to input for next scan
        trackingIdInputRef.current?.focus();
        return;
      }
      
      // Call real dispatch scan API with performance monitoring
      const startTime = performance.now();
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

      if (response.data?.success) {
        toast.success(`Dispatch scan successful for ${trackingId} (${scanTime.toFixed(0)}ms)`);
        
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
        // Focus back to input for next scan
        trackingIdInputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Dispatch scan failed');
        
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
      }
    } catch (error) {
      console.error('Dispatch scan error:', error);
      
      // Extract detailed error message from backend
      let errorMessage = 'Dispatch scan failed';
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
      
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
      
      // Focus back to input for next scan after error
      trackingIdInputRef.current?.focus();
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
        // Focus back to input for next scan
        pendingTrackingIdInputRef.current?.focus();
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
        // Focus back to input for next scan
        pendingTrackingIdInputRef.current?.focus();
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
        // Focus back to input for next scan
        pendingTrackingIdInputRef.current?.focus();
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
      // Focus back to input
      pendingTrackingIdInputRef.current?.focus();
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
      
      // Focus back to input for next scan after error
      pendingTrackingIdInputRef.current?.focus();
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
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Dispatch</h1>
          <p className="text-gray-600">Manage dispatch operations and pending items</p>
        </div>
      </div>

      {/* Tabs */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('scanning')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'scanning'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Truck className="w-4 h-4 inline mr-2" />
            Dispatch Scanning
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Clock className="w-4 h-4 inline mr-2" />
            Dispatch Pending
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      {activeTab === 'scanning' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-md mx-auto">
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
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-md mx-auto">
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
        </div>
      )}
      
      {/* Courier Summary Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
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
                                              <td className="px-2 py-2 text-xs text-center text-orange-600 font-bold">
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
                <div className="font-bold text-green-700">
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
      
      {/* Full Width Scanning Logger Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
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
  );
};

export default Dispatch;
