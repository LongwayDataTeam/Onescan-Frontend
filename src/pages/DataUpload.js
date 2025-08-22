import React, { useState, useEffect, useCallback } from 'react';
import { dataAPI } from '../services/api';
import { toast } from 'react-hot-toast';

const DataUpload = () => {
  // State management
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [dataRecords, setDataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [migrating, setMigrating] = useState(false);
  
  // Data state
  const [totalCount, setTotalCount] = useState(0);
  
  // Cache state
  const [cache, setCache] = useState({});
  const [lastFetchTime, setLastFetchTime] = useState({});
  
  // Form state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  
  // Cache configuration
  const CACHE_DURATION = 5 * 60 * 1000; // 5 minutes in milliseconds
  
  // File input reference
  const fileInputRef = React.useRef();

  // Load upload history on component mount
  useEffect(() => {
    loadUploadHistory();
  }, []);

  // Load data records on component mount
  useEffect(() => {
    loadDataRecords();
  }, []);

  // Listen for refresh events from other components (e.g., after dispatch pending operations)
  useEffect(() => {
    const handleRefreshData = (event) => {
      console.log('🔄 DataUpload: Received refresh event:', event.detail);
      
      // Force refresh data to show updated statuses for various operations
      if (event.detail?.action === 'dispatch_pending_success' ||
          event.detail?.action === 'revoke_status_success' ||
          event.detail?.action === 'cancel_shipment_success') {
        console.log('🔄 Refreshing data after', event.detail.action, 'for tracking ID:', event.detail.tracking_id);
        loadDataRecords(true); // Force refresh
      }
    };

    // Add event listener
    window.addEventListener('refreshAllTrackingData', handleRefreshData);
    
    // Cleanup
    return () => {
      window.removeEventListener('refreshAllTrackingData', handleRefreshData);
    };
  }, []);

  // Cache management functions
  const getCacheKey = useCallback(() => 'data_records', []);
  
  // Check if cache is valid
  const isCacheValid = (cacheKey) => {
    const lastFetch = lastFetchTime[cacheKey];
    if (!lastFetch) return false;
    
    // Cache expires after 5 minutes
    const cacheAge = Date.now() - lastFetch;
    return cacheAge < CACHE_DURATION;
  };

  // Set cache data
  const setCacheData = useCallback((cacheKey, data) => {
    // Don't cache empty results
    if (!data || data.records?.length === 0 || data.total_count === 0) {
      console.log('⚠️ Not caching empty results:', data);
      return;
    }
    
    console.log('💾 Caching data for key:', cacheKey, data);
    setCache(prev => ({
      ...prev,
      [cacheKey]: {
        data: data, // Store data in the correct structure
        timestamp: Date.now()
      }
    }));
  }, []);

  const getCachedData = useCallback((cacheKey) => {
    const cached = cache[cacheKey];
    return cached?.data || null;
  }, [cache]);

  // Load upload history
  const loadUploadHistory = async () => {
    try {
      console.log('🔄 Loading upload history...');
      const response = await dataAPI.getUploadHistory();
      console.log('📥 Upload history response:', response);
      
      if (response.data?.ok) {
        const uploads = response.data.data?.uploads || [];
        console.log('✅ Upload history loaded:', uploads.length, 'uploads');
        setUploadHistory(uploads);
      } else {
        console.error('❌ Upload history response not OK:', response.data);
        toast.error('Failed to load upload history: Invalid response');
        setUploadHistory([]);
      }
    } catch (error) {
      console.error('❌ Failed to load upload history:', error);
      toast.error(`Failed to load upload history: ${error.message || 'Network error'}`);
      setUploadHistory([]);
    }
  };

  // Load data records - SIMPLE and FAST
  const loadDataRecords = async (forceRefresh = false, retryCount = 0) => {
    console.log('🔄 Loading data records (SIMPLE):', { forceRefresh, retryCount });
    
    // Check cache first (unless force refresh)
    if (!forceRefresh && isCacheValid(getCacheKey())) {
      const cachedData = getCachedData(getCacheKey());
      if (cachedData) {
        console.log('⚡ Cache HIT - Using cached data');
        setDataRecords(cachedData.records || []);
        setTotalCount(cachedData.total_count || 0);
        return;
      }
    }
    
    console.log('❌ Cache MISS - Fetching fresh data');
    setLoading(true);
    
    try {
      console.log('🌐 Fetching data from API (25 rows limit)...');
      const response = await dataAPI.getAllUploadedData(1, 25); // Fixed 25 rows
      
      console.log('📥 API response received:', response);
      
      if (response.data?.ok) {
        const data = response.data.data;
        console.log('📊 Processing API data:', data);
        
        const records = data.records || [];
        const totalCount = data.total_count || 0;
        
        console.log('📋 Setting data records:', {
          recordsCount: records.length,
          totalCount,
          recordsSample: records.slice(0, 2)
        });
        
        // Update state
        setDataRecords(records);
        setTotalCount(totalCount);
        
        // Cache the successful response
        if (records.length > 0) {
          setCacheData(getCacheKey(), data);
          setLastFetchTime(prev => ({
            ...prev,
            [getCacheKey()]: Date.now()
          }));
        }
        
        console.log('✅ Data loaded successfully');
        
      } else {
        console.error('❌ API response not OK:', response.data);
        const errorMessage = response.data?.message || response.data?.detail || 'Unknown error';
        
        // Retry logic for certain errors
        if (retryCount < 2 && (response.status === 500 || response.status === 503)) {
          console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
          setTimeout(() => loadDataRecords(forceRefresh, retryCount + 1), 2000);
          return;
        }
        
        toast.error(`Failed to load data records: ${errorMessage}`);
        setDataRecords([]);
        setTotalCount(0);
      }
    } catch (error) {
      console.error('❌ Failed to load data records:', error);
      const errorMessage = error.response?.data?.message || error.response?.data?.detail || error.message || 'Network error';
      
      // Retry logic for network errors
      if (retryCount < 2 && (!error.response || error.code === 'NETWORK_ERROR')) {
        console.log(`🔄 Retrying... Attempt ${retryCount + 1}/3`);
        setTimeout(() => loadDataRecords(forceRefresh, retryCount + 1), 2000);
        return;
      }
      
      toast.error(`Failed to load data records: ${errorMessage}`);
      setDataRecords([]);
      setTotalCount(0);
    } finally {
      setLoading(false);
    }
  };

  // Handle file selection
  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else if (file) {
      toast.error('Please select a valid CSV file');
      setSelectedFile(null);
    }
  };

  // Handle file upload
  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a file to upload');
      return;
    }

    setUploading(true);
    setUploadProgress(0);

    try {
      const formData = new FormData();
      formData.append('file', selectedFile);
      
      // Removed channelId, courier, channelName from formData

      console.log('🚀 Starting upload with form data:', {
        filename: selectedFile.name,
        size: selectedFile.size,
        // Removed channelId, courier, channelName from log
      });

      // Simulate progress (since we can't get real progress from the API)
      const progressInterval = setInterval(() => {
        setUploadProgress(prev => {
          if (prev >= 90) {
            clearInterval(progressInterval);
            return 90;
          }
          return prev + 10;
        });
      }, 200);

      const response = await dataAPI.uploadData(formData);
      
      clearInterval(progressInterval);
      setUploadProgress(100);

      console.log('Upload response received:', response.data);

      if (response.data?.ok) {
        const uploadData = response.data.data;
        toast.success(`File uploaded successfully! ${uploadData.success_count} records processed, ${uploadData.error_count} errors`);
        
        console.log('✅ Upload successful, processing response:', uploadData);
        
        // Reset form
        setSelectedFile(null);
        // Removed channelId, courier, channelName from reset
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Force refresh of data records with a small delay to ensure backend processing is complete
        console.log('🔄 Refreshing data records...');
        setTimeout(async () => {
          try {
            await loadDataRecords(true); // Force refresh
            console.log('✅ Data records refreshed successfully');
            
            // Double-check if we got the data
            if (totalCount === 0) {
              console.log('No data found, trying one more refresh...');
              setTimeout(async () => {
                await loadDataRecords(true);
                console.log('✅ Second refresh attempt completed');
              }, 2000); // Wait 2 more seconds
            }
          } catch (error) {
            console.error('❌ Failed to refresh data records:', error);
          }
        }, 1000); // 1 second delay to ensure backend processing
        
        // Refresh upload history
        try {
          await loadUploadHistory();
          console.log('✅ Upload history refreshed successfully');
        } catch (error) {
          console.error('❌ Failed to refresh upload history:', error);
        }
        
      } else {
        console.error('❌ Upload failed:', response.data);
        toast.error(response.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('❌ Upload error:', error);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
      setUploadProgress(0);
    }
  };

  // Handle clear all data
  const handleClearData = async () => {
    if (!window.confirm('Are you sure you want to clear ALL data? This action cannot be undone.\n\nThis will clear:\n• All uploaded data records\n• All scanning cache and history\n• All tracking and order data\n• All pending scans and counters\n• All background processing data\n• All local storage data')) {
      return;
    }

    console.log('Starting complete data clear operation...');
    setClearing(true);
    
    try {
      const response = await dataAPI.clearAllData();
      console.log('🗑️ Clear data API response:', response);
      
      if (response.data?.ok) {
        const clearData = response.data.data;
        const summary = [
          `${clearData.total_keys_cleared} total keys`,
          `${clearData.tracking_records_cleared} tracking records`,
          `${clearData.order_records_cleared} order records`,
          `${clearData.scan_logs_cleared} scan logs`,
          `${clearData.pending_sets_cleared} pending sets`,
          `${clearData.counters_cleared} counters`,
          `${clearData.upload_history_cleared} upload history entries`
        ].join(', ');
        
        toast.success(`ALL data cleared successfully! ${summary}`);
        
        // Show detailed success message
        console.log('✅ Clear data summary:', clearData);
        
        // Reset all state immediately
        console.log('Resetting all state...');
        setDataRecords([]);
        setTotalCount(0);
        
        // Clear all cache
        setCache({});
        setLastFetchTime({});
        
        // Clear ALL local storage data
        console.log('Clearing all local storage data...');
        try {
          // Clear scanning-related local storage
          localStorage.removeItem('labelScanningData');
          localStorage.removeItem('packingScanningData');
          localStorage.removeItem('dispatchScanningData');
          
          // Clear any other tracking-related local storage
          const keysToRemove = [];
          for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key && (
              key.includes('scan') || 
              key.includes('tracking') || 
              key.includes('order') || 
              key.includes('packing') || 
              key.includes('dispatch') ||
              key.includes('cache') ||
              key.includes('history') ||
              key.includes('label') ||
              key.includes('scanning') ||
              key.includes('kpi') ||
              key.includes('recent')
            )) {
              keysToRemove.push(key);
            }
          }
          
          keysToRemove.forEach(key => {
            localStorage.removeItem(key);
            console.log(`🗑️ Removed local storage key: ${key}`);
          });
          
          console.log(`🗑️ Cleared ${keysToRemove.length} local storage keys`);
          
          // Force clear any remaining scanning data
          try {
            // Clear sessionStorage as well
            sessionStorage.clear();
            console.log('🗑️ Cleared sessionStorage');
          } catch (sessionError) {
            console.log('🗑️ No sessionStorage to clear');
          }
          
          // Broadcast clear data event to other components
          try {
            const clearEvent = new CustomEvent('clearAllTrackingData', {
              detail: {
                timestamp: Date.now(),
                clearedBy: 'DataUpload',
                message: 'All tracking data has been cleared',
                forceClear: true
              }
            });
            window.dispatchEvent(clearEvent);
            console.log('🗑️ Broadcasted clear data event to other components');
          } catch (eventError) {
            console.error('❌ Error broadcasting clear event:', eventError);
          }
        } catch (storageError) {
          console.error('❌ Error clearing local storage:', storageError);
        }
        
        // Refresh upload history
        try {
          await loadUploadHistory();
          console.log('✅ Upload history refreshed after clear');
        } catch (error) {
          console.error('❌ Failed to refresh upload history after clear:', error);
        }
        
        console.log('✅ Complete data clear operation completed successfully');
        
        // Force page refresh to ensure all components are completely reset
        setTimeout(() => {
          console.log('🔄 Force refreshing page to ensure complete reset...');
          window.location.reload();
        }, 2000);
      } else {
        console.error('❌ Clear data API failed:', response.data);
        toast.error(response.data?.message || 'Failed to clear data');
      }
    } catch (error) {
      console.error('❌ Clear data error:', error);
      toast.error('Failed to clear data. Please try again.');
    } finally {
      setClearing(false);
      console.log('🗑️ Clear data operation finished');
    }
  };

  // Format currency
  const formatCurrency = (amount) => {
    if (!amount || amount === 0) return '$0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
  };

  // Get display status - transform backend status to frontend display status
  const getDisplayStatus = (record) => {
    const backendStatus = record.status;
    
    // If status is "Shipped" and not packed, it's likely a new record that should show as "Unlabeled"
    if (backendStatus === 'Shipped' && record.packed === 'false') {
      return 'Unlabeled';
    }
    
    // Return the original status for other cases
    return backendStatus || 'N/A';
  };

  // Format timestamp
  const formatTimestamp = (timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  };

  // Check background processing status and refresh if complete
  const checkBackgroundProcessing = useCallback(async () => {
    // Background processing disabled for simplicity
  }, []);

  // Auto-check background processing when data changes
  useEffect(() => {
    // Background processing disabled for simplicity
  }, []);

  // Simple filter and search function
  const applyFiltersAndSearch = useCallback(() => {
    console.log('🔍 Simple filters disabled for performance');
  }, []);

  // Apply filters and search to dataRecords
  const filteredData = dataRecords.filter(record => {
    const matchesSearchTerm =
      record.tracking_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.tracking_no?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.order_id?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      record.sku?.toLowerCase().includes(searchTerm.toLowerCase());

    const matchesStatusFilter = statusFilter === '' || getDisplayStatus(record) === statusFilter;
    const matchesCourierFilter = courierFilter === '' || record.courier === courierFilter;

    return matchesSearchTerm && matchesStatusFilter && matchesCourierFilter;
  });

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900 mb-2">Data Management</h1>
          <p className="text-gray-600">Upload, view, and manage your warehouse data</p>
        </div>

        <div className="space-y-6">
          {/* Data Summary Dashboard */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h2 className="text-xl font-semibold text-gray-900 mb-4">📊 Data Summary</h2>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">{totalCount}</div>
                <div className="text-sm text-gray-600">Total Records</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-gray-600">
                  {(() => {
                    const unlabeledLoaded = dataRecords.filter(r => getDisplayStatus(r) === 'Unlabeled').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const unlabeledPercentage = unlabeledLoaded / dataRecords.length;
                      const estimatedUnlabeled = Math.round(totalCount * unlabeledPercentage);
                      return estimatedUnlabeled;
                    }
                    return unlabeledLoaded;
                  })()}
                </div>
                <div className="text-sm text-gray-600">Unlabeled</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-yellow-600">
                  {(() => {
                    const labelScannedLoaded = dataRecords.filter(r => r.status === 'label_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const labelScannedPercentage = labelScannedLoaded / dataRecords.length;
                      const estimatedLabelScanned = Math.round(totalCount * labelScannedPercentage);
                      return estimatedLabelScanned;
                    }
                    return labelScannedLoaded;
                  })()}
                </div>
                <div className="text-sm text-gray-600">Labelled Scanned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-orange-600">
                  {(() => {
                    const packingPendingScannedLoaded = dataRecords.filter(r => r.status === 'packing_pending_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const packingPendingScannedPercentage = packingPendingScannedLoaded / dataRecords.length;
                      const estimatedPackingPendingScanned = Math.round(totalCount * packingPendingScannedPercentage);
                      return estimatedPackingPendingScanned;
                    }
                    return packingPendingScannedLoaded;
                  })()}
                </div>
                <div className="text-sm text-gray-600">Packing Pending</div>
              </div>
              <div className="text-center">
                                  <div className="text-2xl font-bold text-green-600">
                    {(() => {
                      const packingScannedLoaded = dataRecords.filter(r => r.status === 'packing_scanned').length;
                      if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                        const packingScannedPercentage = packingScannedLoaded / dataRecords.length;
                        const estimatedPackingScanned = Math.round(totalCount * packingScannedPercentage);
                        return estimatedPackingScanned;
                      }
                      return packingScannedLoaded;
                    })()}
                  </div>
                  <div className="text-sm text-gray-600">Packing Scanned</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-purple-600">
                  {(() => {
                    const dispatchPendingLoaded = dataRecords.filter(r => r.status === 'dispatch_pending_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const dispatchPendingPercentage = dispatchPendingLoaded / dataRecords.length;
                      const estimatedDispatchPending = Math.round(totalCount * dispatchPendingPercentage);
                      return estimatedDispatchPending;
                    }
                    return dispatchPendingLoaded;
                  })()}
                </div>
                <div className="text-sm text-gray-600">Dispatch Pending</div>
              </div>
              <div className="text-center">
                <div className="text-2xl font-bold text-indigo-600">
                  {(() => {
                    const dispatchLoaded = dataRecords.filter(r => r.status === 'dispatch_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const dispatchPercentage = dispatchLoaded / dataRecords.length;
                      const estimatedDispatch = Math.round(totalCount * dispatchPercentage);
                      return estimatedDispatch;
                    }
                    return dispatchLoaded;
                  })()}
                </div>
                <div className="text-sm text-gray-600">Dispatch</div>
              </div>
            </div>
          </div>

          {/* Upload Data and Danger Zone - Side by Side */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Upload Data Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">📤 Upload Data</h3>
              <div className="space-y-4">
                <div>
                  <label htmlFor="file-upload" className="block text-sm font-medium text-gray-700 mb-2">
                    Select CSV File
                  </label>
                  <input
                    ref={fileInputRef}
                    id="file-upload"
                    type="file"
                    accept=".csv"
                    onChange={handleFileSelect}
                    className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                  />
                </div>

                {selectedFile && (
                  <div className="p-3 bg-blue-50 rounded-md border border-blue-200">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-2">
                        <span className="text-blue-600">📁</span>
                        <span className="text-sm font-medium text-blue-900">{selectedFile.name}</span>
                        <span className="text-xs text-blue-600">({(selectedFile.size / 1024).toFixed(1)} KB)</span>
                  </div>
                      <button
                        onClick={() => setSelectedFile(null)}
                        className="text-blue-600 hover:text-blue-800"
                      >
                        ✕
                      </button>
                  </div>
                  </div>
                )}

                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
                  className={`w-full py-2 px-4 rounded-md font-medium transition-colors ${
                    !selectedFile || uploading
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'bg-blue-600 text-white hover:bg-blue-700'
                  }`}
                >
                  {uploading ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Uploading...</span>
                    </div>
                  ) : (
                    'Upload Data'
                  )}
                </button>

                {uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <div
                      className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${uploadProgress}%` }}
                    ></div>
                  </div>
                )}

                {/* Upload History */}
                <div className="mt-4">
                  <h4 className="text-sm font-medium text-gray-700 mb-2">📋 Upload History</h4>
                  <div className="max-h-48 overflow-y-auto border rounded-lg p-3 bg-gray-50">
                    {uploadHistory.length === 0 ? (
                      <p className="text-sm text-gray-500 text-center py-4">No uploads yet</p>
                    ) : (
                      <div className="space-y-2">
                        {uploadHistory.map((upload, index) => (
                          <div key={index} className="flex items-center justify-between bg-white rounded-lg border p-2 hover:bg-gray-50">
                            <div className="flex-1 min-w-0">
                              <div className="text-sm font-medium text-gray-900 truncate">{upload.filename}</div>
                              <div className="text-xs text-gray-500">
                                {(() => {
                                  try {
                                    const timestamp = parseInt(upload.timestamp) * 1000;
                                    if (isNaN(timestamp)) return 'Invalid Date';
                                    const date = new Date(timestamp);
                                    return `${date.toLocaleDateString()} ${date.toLocaleTimeString()}`;
                                  } catch (error) {
                                    return 'Invalid Date';
                                  }
                                })()}
              </div>
            </div>
                            <div className="text-xs text-gray-600 ml-2">
                              {upload.record_count || 0} records
                </div>
              </div>
                        ))}
                      </div>
                    )}
                  </div>
                    </div>
                  </div>
                </div>
                
            {/* Danger Zone Section */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
              <h3 className="text-lg font-semibold text-red-700 mb-4">⚠️ Danger Zone</h3>
              <div className="space-y-4">
                <div className="p-4 bg-red-50 rounded-md border border-red-200">
                  <div className="text-sm text-red-800">
                    <p className="font-medium mb-2">Clear All Data</p>
                    <p className="text-xs">This will permanently remove all uploaded data, scanning history, and tracking information.</p>
                  </div>
                </div>
              
              <button
                  onClick={handleClearData}
                  disabled={clearing}
                  className="w-full py-2 px-4 bg-red-600 text-white rounded-md font-medium hover:bg-red-700 transition-colors disabled:bg-red-300 disabled:cursor-not-allowed"
                >
                  {clearing ? (
                    <div className="flex items-center justify-center space-x-2">
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                      <span>Clearing...</span>
            </div>
                  ) : (
                    'Clear All Data'
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Search & Filter Section */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">🔍 Search & Filter</h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label htmlFor="search" className="block text-sm font-medium text-gray-700 mb-2">
                  Search Records
                </label>
                <input
                  id="search"
                  type="text"
                  placeholder="Search by tracking ID, order ID, SKU..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              <div>
                <label htmlFor="status-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Status
                </label>
                  <select
                  id="status-filter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Statuses</option>
                  <option value="Unlabeled">Unlabeled</option>
                  <option value="label_scanned">Labelled Scanned</option>
                  <option value="packing_pending_scanned">Packing Pending</option>
                  <option value="packing_scanned">Packing Scanned</option>
                                      <option value="dispatch_pending_scanned">Dispatch Pending</option>
                    <option value="dispatch_scanned">Dispatch</option>
                  </select>
              </div>
              
              <div>
                <label htmlFor="courier-filter" className="block text-sm font-medium text-gray-700 mb-2">
                  Filter by Courier
                </label>
                <select
                  id="courier-filter"
                  value={courierFilter}
                  onChange={(e) => setCourierFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Couriers</option>
                  {Array.from(new Set(dataRecords.map(r => r.courier))).map(courier => (
                    <option key={courier} value={courier}>{courier}</option>
                  ))}
                </select>
              </div>
            </div>
            
            <div className="mt-4 flex justify-between items-center">
              <div className="text-sm text-gray-600">
                Showing {filteredData.length} of {dataRecords.length} records
              </div>
                <button
                onClick={() => {
                  setSearchTerm('');
                  setStatusFilter('');
                  setCourierFilter('');
                }}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 transition-colors"
              >
                Clear Filters
                </button>
            </div>
          </div>

          {/* Scanning Workflow Breakdown */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📊 Scanning Workflow Breakdown</h3>
            <div className="text-xs text-gray-500 mb-3">
              💡 Note: Backend "Shipped" status is displayed as "Unlabeled" for new records
              <br />
                                📊 Scanning Workflow: Unlabeled → label_scanned → packing_pending_scanned → packing_scanned → dispatch_pending_scanned → dispatch_scanned
              <br />
              📈 Status counts are estimated totals based on loaded data percentage
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-lg font-bold text-gray-600">
                  {(() => {
                    const unlabeledLoaded = dataRecords.filter(r => getDisplayStatus(r) === 'Unlabeled').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const unlabeledPercentage = unlabeledLoaded / dataRecords.length;
                      const estimatedUnlabeled = Math.round(totalCount * unlabeledPercentage);
                      return estimatedUnlabeled;
                    }
                    return unlabeledLoaded;
                  })()}
                </div>
                <div className="text-xs text-gray-600">Unlabeled</div>
              </div>
              <div className="text-center p-3 bg-yellow-50 rounded-lg">
                <div className="text-lg font-bold text-yellow-600">
                  {(() => {
                    const labelScannedLoaded = dataRecords.filter(r => r.status === 'label_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const labelScannedPercentage = labelScannedLoaded / dataRecords.length;
                      const estimatedLabelScanned = Math.round(totalCount * labelScannedPercentage);
                      return estimatedLabelScanned;
                    }
                    return labelScannedLoaded;
                  })()}
                </div>
                <div className="text-xs text-gray-600">label_scanned</div>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <div className="text-lg font-bold text-orange-600">
                  {(() => {
                    const packingPendingScannedLoaded = dataRecords.filter(r => r.status === 'packing_pending_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const packingPendingScannedPercentage = packingPendingScannedLoaded / dataRecords.length;
                      const estimatedPackingPendingScanned = Math.round(totalCount * packingPendingScannedPercentage);
                      return estimatedPackingPendingScanned;
                    }
                    return packingPendingScannedLoaded;
                  })()}
              </div>
                <div className="text-xs text-gray-600">packing_pending_scanned</div>
                  </div>
                            <div className="text-center p-3 bg-green-50 rounded-lg">
                <div className="text-lg font-bold text-green-600">
                  {(() => {
                    const packingScannedLoaded = dataRecords.filter(r => r.status === 'packing_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const packingScannedPercentage = packingScannedLoaded / dataRecords.length;
                      const estimatedPackingScanned = Math.round(totalCount * packingScannedPercentage);
                      return estimatedPackingScanned;
                    }
                    return packingScannedLoaded;
                  })()}
                  </div>
                <div className="text-xs text-gray-600">packing_scanned</div>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <div className="text-lg font-bold text-purple-600">
                  {(() => {
                    const dispatchPendingLoaded = dataRecords.filter(r => r.status === 'dispatch_pending_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const dispatchPendingPercentage = dispatchPendingLoaded / dataRecords.length;
                      const estimatedDispatchPending = Math.round(totalCount * dispatchPendingPercentage);
                      return estimatedDispatchPending;
                    }
                    return dispatchPendingLoaded;
                  })()}
                </div>
                <div className="text-xs text-gray-600">dispatch_pending_scanned</div>
              </div>
              <div className="text-center p-3 bg-indigo-50 rounded-lg">
                <div className="text-lg font-bold text-indigo-600">
                  {(() => {
                    const dispatchLoaded = dataRecords.filter(r => r.status === 'dispatch_scanned').length;
                    if (dataRecords.length > 0 && totalCount > dataRecords.length) {
                      const dispatchPercentage = dispatchLoaded / dataRecords.length;
                      const estimatedDispatch = Math.round(totalCount * dispatchPercentage);
                      return estimatedDispatch;
                    }
                    return dispatchLoaded;
                  })()}
                </div>
                <div className="text-xs text-gray-600">dispatch_scanned</div>
              </div>
                </div>
              </div>

          {/* All Data Table */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">📋 All Data</h3>
              {loading ? (
                <div className="flex justify-center items-center py-12">
                  <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                </div>
              ) : dataRecords.length === 0 ? (
                <div className="text-center py-12">
                <div className="mb-4">
                  <p className="text-gray-500 text-lg">No data records found</p>
                  <p className="text-gray-400 text-sm mt-2">
                    This could mean:
                  </p>
                  <ul className="text-gray-400 text-sm mt-2 text-left max-w-md mx-auto">
                    <li>• No data has been uploaded yet</li>
                    <li>• The backend service is not running</li>
                    <li>• There's a network connectivity issue</li>
                    <li>• The API endpoint is not responding</li>
                  </ul>
                </div>
                <div className="space-x-2">
                  <button
                    onClick={() => loadDataRecords(true)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                  >
                    🔄 Try Again
                  </button>
                </div>
                </div>
              ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking ID</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Tracking No</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Order ID</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EAN</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Qty</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Amount</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Channel</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Created</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                    {filteredData.map((record, index) => (
                      <tr key={`${record.tracking_id}_${record.tracking_no}_${index}`} className="hover:bg-gray-50">
                            <td className="px-3 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {record.tracking_id}
                            </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-mono text-blue-600 bg-blue-50 px-2 py-1 rounded">
                          {record.tracking_no || 'N/A'}
                            </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.order_id || 'N/A'}
                            </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-mono text-green-600 bg-green-50 px-2 py-1 rounded">
                          {record.g_code || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm font-mono text-purple-600 bg-purple-50 px-2 py-1 rounded">
                          {record.ean || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.sku || 'N/A'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-center text-gray-700">
                          {record.qty || '1'}
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                              {formatCurrency(record.amount)}
                            </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                          <div>
                            <div className="font-medium">{record.channel_name || record.channel_id || 'N/A'}</div>
                            {record.sub_order_id && (
                              <div className="text-xs text-gray-500">Sub: {record.sub_order_id}</div>
                            )}
                          </div>
                        </td>
                        <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-700">
                          {record.courier || 'N/A'}
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap">
                              <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            getDisplayStatus(record) === 'Unlabeled' ? 'bg-gray-100 text-gray-800' :
                            getDisplayStatus(record) === 'completed' || getDisplayStatus(record) === 'packing_scanned' ? 'bg-green-100 text-green-800' :
                            getDisplayStatus(record) === 'pending' || getDisplayStatus(record) === 'label_scanned' ? 'bg-yellow-100 text-yellow-800' :
                            getDisplayStatus(record) === 'packing_pending' ? 'bg-orange-100 text-orange-800' :
                                'bg-gray-100 text-gray-800'
                              }`}>
                            {getDisplayStatus(record)}
                              </span>
                            </td>
                            <td className="px-3 py-4 whitespace-nowrap text-sm text-gray-500">
                              {formatTimestamp(record.created_at)}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                
                {/* Simple Data Info */}
                <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                                    <div className="text-center text-sm text-gray-600">
                    📊 Displaying {filteredData.length} records (limited to 25 for fast loading)
                    {totalCount > 25 && (
                      <span className="block text-xs text-gray-500 mt-1">
                        Total records in system: {totalCount} - Use filters to find specific data
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                  )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default DataUpload;
