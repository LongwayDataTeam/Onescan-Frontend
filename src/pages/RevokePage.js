import React, { useState, useEffect, useRef } from 'react';
import { RotateCcw, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/soundUtils';

const RevokePage = () => {
  const { user } = useAuthStore();
  // Revoke Tab State
  const [revokeTrackingId, setRevokeTrackingId] = useState('');
  const [revokeLoading, setRevokeLoading] = useState(false);
  const [selectedStatus, setSelectedStatus] = useState('Unlabeled');
  const [currentStatus, setCurrentStatus] = useState('');
  
  // Activity Logger State
  const [activityLogs, setActivityLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  
  // Refs for input focus
  const revokeTrackingIdInputRef = useRef(null);

  // Status options for revoke dropdown
  const statusOptions = [
            { value: 'Unlabeled', label: 'Unlabeled', color: 'text-gray-600' },
    { value: 'label_scanned', label: 'Label Scanned', color: 'text-blue-600' },
    { value: 'packing_pending_scanned', label: 'Packing Pending', color: 'text-yellow-600' },
    { value: 'packing_scanned', label: 'Packing Scanned', color: 'text-orange-600' },
    { value: 'dispatch_pending_scanned', label: 'Dispatch Pending', color: 'text-purple-600' },
    { value: 'dispatch_scanned', label: 'Dispatch Scanned', color: 'text-green-600' },
    { value: 'cancel', label: 'Cancel', color: 'text-red-600' }
  ];

  // Function to get the last status based on current status
  const getLastStatus = (currentStatus) => {
    const statusFlow = {
      'dispatch_scanned': 'dispatch_pending_scanned',
      'dispatch_pending_scanned': 'packing_scanned',
      'packing_scanned': 'packing_pending_scanned',
      'packing_pending_scanned': 'label_scanned',
      'label_scanned': 'Unlabeled',
      'Unlabeled': 'Unlabeled', // No previous status
      'cancel': 'Unlabeled' // Reset to Unlabeled when cancelled
    };
    
    return statusFlow[currentStatus] || 'Unlabeled';
  };

  // Helper function to get display label for status value
  const getStatusLabel = (statusValue) => {
    const option = statusOptions.find(opt => opt.value === statusValue);
    return option ? option.label : statusValue;
  };

  // Set document title
  useEffect(() => {
    document.title = 'Revoke - OneScan';
  }, []);

  // Listen for data refresh and clear events from other components
  useEffect(() => {
    const handleClearData = (event) => {
      console.log('🗑️ Revoke: Received clear data event:', event.detail);
      
      // Clear all revoke data
      setRevokeTrackingId('');
      setRevokeLoading(false);
                setSelectedStatus('Unlabeled');
      setCurrentStatus('');
      
      // Clear local storage
      localStorage.removeItem('revokePageData');
      
      console.log('🗑️ Revoke: All revoke data cleared');
      toast.info('Revoke data cleared due to main data clear operation');
    };

    const handleRefreshData = (event) => {
      console.log('🔄 Revoke: Received refresh data event:', event.detail);
      
      // If this is a revoke operation, clear the form for next scan
      if (event.detail.action === 'revoke_status_success') {
        console.log('🔄 Revoke: Refreshing form for next scan');
        // Form is already cleared in the success handler, just log the refresh
      }
    };

    // Add event listeners
    window.addEventListener('clearAllTrackingData', handleClearData);
    window.addEventListener('refreshAllTrackingData', handleRefreshData);
    
    // Cleanup
    return () => {
      window.removeEventListener('clearAllTrackingData', handleClearData);
      window.removeEventListener('refreshAllTrackingData', handleRefreshData);
    };
  }, []);

  // Debug: Monitor state changes
  useEffect(() => {
    console.log('🔍 Revoke: State changed - currentStatus:', currentStatus, 'selectedStatus:', selectedStatus);
  }, [currentStatus, selectedStatus]);

  // Function to add activity logs to the table
  const addActivityLog = (logData) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...logData
    };
    setActivityLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Keep last 100 logs
  };

  // Get current status of tracking ID for revoke tab
  const getCurrentStatus = async (trackingId) => {
    if (!trackingId.trim()) return;
    
    console.log('🔍 Revoke: Getting current status for tracking ID:', trackingId.trim());
    setRevokeLoading(true);
    
    try {
      // ✅ FIXED: Use Redis-based status retrieval instead of DataUpload API
      // This ensures we get the same real-time status as the backend
      const response = await scanAPI.getCurrentStatus(trackingId.trim());
      
      console.log('🔍 Revoke: Redis status API response:', response);
      
      if (response.data?.success) {
        const status = response.data.status || 'Unlabeled';
        console.log('📊 Revoke: Found record with status from Redis:', status);
        
        setCurrentStatus(status);
        
        // Automatically set the last status as the selected status
        const lastStatus = getLastStatus(status);
        setSelectedStatus(lastStatus);
        
        console.log('📊 Current status for', trackingId, ':', status);
        console.log('📊 Automatically set last status as:', lastStatus);
        console.log('📊 State updated - currentStatus:', status, 'selectedStatus:', lastStatus);
        
        // Show info message about automatic status selection
        if (lastStatus !== status) {
          toast.success(`Status automatically set to: ${lastStatus} (previous status)`);
        }
      } else {
        console.log('❌ Revoke: Tracking ID not found in Redis');
        setCurrentStatus('Not Found');
        setSelectedStatus('Unlabeled');
        toast.error('Tracking ID not found in system');
      }
    } catch (error) {
      console.error('❌ Revoke: Error fetching current status from Redis:', error);
      setCurrentStatus('Error');
    } finally {
      setRevokeLoading(false);
    }
  };

  // Get current status and return values directly (for automatic trigger)
  const getCurrentStatusAndReturnValues = async (trackingId) => {
    if (!trackingId.trim()) return null;
    
    console.log('🔍 Revoke: Getting current status and returning values for tracking ID:', trackingId.trim());
    
    try {
      // ✅ FIXED: Use Redis-based status retrieval instead of DataUpload API
      // This ensures we get the same real-time status as the backend
      const response = await scanAPI.getCurrentStatus(trackingId.trim());
      
      console.log('🔍 Revoke: Redis status API response for direct values:', response);
      
      if (response.data?.success) {
        const status = response.data.status || 'Unlabeled';
        console.log('📊 Revoke: Found record with status from Redis for direct values:', status);
        
        // Automatically determine the last status
        const lastStatus = getLastStatus(status);
        console.log('📊 Revoke: Determined last status for direct values:', lastStatus);
        
        // Return the values directly
        return {
          currentStatusValue: status,
          selectedStatusValue: lastStatus
        };
      } else {
        console.log('❌ Revoke: Tracking ID not found in Redis for direct values');
        return {
          currentStatusValue: 'Not Found',
          selectedStatusValue: 'Unlabeled'
        };
      }
    } catch (error) {
      console.error('❌ Revoke: Error fetching current status from Redis for direct values:', error);
      return {
        currentStatusValue: 'Error',
        selectedStatusValue: 'Unlabeled'
      };
    }
  };

    // Handle Revoke Status Change (Direct values to avoid race condition)
  const handleRevokeStatusChangeDirect = async (currentStatusValue, selectedStatusValue) => {
    if (!revokeTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    if (selectedStatusValue === currentStatusValue) {
      toast.error('Status is already set to the selected value');
      return;
    }

    setRevokeLoading(true);
    try {
      console.log('🚀 Revoke: Making API call with data:', {
        tracking_id: revokeTrackingId.trim(),
        user_id: user?.user_id,
        new_status: selectedStatusValue
      });
      
      // Call real revoke API
      const response = await scanAPI.revokeStatus({
        tracking_id: revokeTrackingId.trim(),
        user_id: user?.user_id,
        new_status: selectedStatusValue
      });

      console.log('🔍 Revoke API Response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Success field:', response.data?.success);
      
      if (response.data?.success) {
        const currentStatusLabel = getStatusLabel(currentStatusValue);
        const selectedStatusLabel = getStatusLabel(selectedStatusValue);
        
        toast.success(`Status changed from "${currentStatusLabel}" to "${selectedStatusLabel}" for ${revokeTrackingId}`);
        
        // Play success sound
        try {
          await playSuccessSound();
          console.log('🔊 RevokePage: Success sound triggered successfully');
        } catch (error) {
          console.error('🔊 RevokePage: Failed to trigger success sound:', error);
        }
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addActivityLog({
          type: 'success',
          action: 'Status Revoke',
          tracking_id: revokeTrackingId.trim(),
          g_code_ean: 'N/A',
          status: selectedStatusValue,
          message: `Status changed from "${currentStatusLabel}" to "${selectedStatusLabel}"`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Update current status
        setCurrentStatus(selectedStatusValue);
        setRevokeTrackingId('');
        
        // 🔄 REFRESH DATA: Trigger global data refresh to update all components
        const refreshEvent = new CustomEvent('refreshAllTrackingData', {
          detail: {
            action: 'revoke_status_success',
            tracking_id: revokeTrackingId.trim(),
            old_status: currentStatusValue,
            new_status: selectedStatusValue,
            timestamp: new Date().toISOString()
          }
        });
        console.log('🔄 Revoke: Dispatching data refresh event:', refreshEvent.detail);
        window.dispatchEvent(refreshEvent);
        
        // Show success message and focus back to input for next scan
        toast.success(`Status changed successfully! Data refreshed across all components. Ready for next scan!`);
        revokeTrackingIdInputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Status change failed');
        
        // Play error sound for failed status changes
        try {
          await playErrorSound();
          console.log('🔊 RevokePage: Error sound triggered for failed status change');
        } catch (error) {
          console.error('🔊 RevokePage: Failed to trigger error sound:', error);
        }
        
        // ❌ ERROR LOGGER: Add to table and console
        addActivityLog({
          type: 'error',
          action: 'Status Revoke',
          tracking_id: revokeTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Status change failed',
          user: user?.username || user?.user_id || 'Unknown'
        });
      }
      
    } catch (error) {
      toast.error('Status change failed');
      
      // Play error sound for network errors
      try {
        await playErrorSound();
        console.log('🔊 RevokePage: Error sound triggered for network error');
      } catch (error) {
        console.error('🔊 RevokePage: Failed to trigger error sound:', error);
        console.error('Status change error:', error);
      }
      
      // ❌ ERROR LOGGER: Add to table and console
      addActivityLog({
        type: 'error',
        action: 'Status Revoke',
        tracking_id: revokeTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Failed',
        message: error.message || 'Status change failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  // Handle Revoke Status Change (for manual button clicks)
  const handleRevokeStatusChange = async () => {
    if (!revokeTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    if (selectedStatus === currentStatus) {
      toast.error('Status is already set to the selected value');
      return;
    }

    setRevokeLoading(true);
    try {
      console.log('🚀 Revoke: Making API call with data:', {
        tracking_id: revokeTrackingId.trim(),
        user_id: user?.user_id,
        new_status: selectedStatus
      });
      
      // Call real revoke API
      const response = await scanAPI.revokeStatus({
        tracking_id: revokeTrackingId.trim(),
        user_id: user?.user_id,
        new_status: selectedStatus
      });

      console.log('🔍 Revoke API Response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Success field:', response.data?.success);
      
      if (response.data?.success) {
        const currentStatusLabel = getStatusLabel(currentStatus);
        const selectedStatusLabel = getStatusLabel(selectedStatus);
        
        toast.success(`Status changed from "${currentStatusLabel}" to "${selectedStatusLabel}" for ${revokeTrackingId}`);
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addActivityLog({
          type: 'success',
          action: 'Status Revoke',
          tracking_id: revokeTrackingId.trim(),
          g_code_ean: 'N/A',
          status: selectedStatus,
          message: `Status changed from "${currentStatusLabel}" to "${selectedStatusLabel}"`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Update current status
        setCurrentStatus(selectedStatus);
        setRevokeTrackingId('');
        
        // 🔄 REFRESH DATA: Trigger global data refresh to update all components
        const refreshEvent = new CustomEvent('refreshAllTrackingData', {
          detail: {
            action: 'revoke_status_success',
            tracking_id: revokeTrackingId.trim(),
            old_status: currentStatus,
            new_status: selectedStatus,
            timestamp: new Date().toISOString()
          }
        });
        console.log('🔄 Revoke: Dispatching data refresh event:', refreshEvent.detail);
        window.dispatchEvent(refreshEvent);
        
        // Show success message and focus back to input for next scan
        toast.success(`Status changed successfully! Data refreshed across all components. Ready for next scan!`);
        revokeTrackingIdInputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Status change failed');
        
        // ❌ ERROR LOGGER: Add to table and console
        addActivityLog({
          type: 'error',
          action: 'Status Revoke',
          tracking_id: revokeTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Status change failed',
          user: user?.username || user?.user_id || 'Unknown'
        });
      }
      
    } catch (error) {
      toast.error('Status change failed');
      console.error('Status change error:', error);
      
      // ❌ ERROR LOGGER: Add to table and console
      addActivityLog({
        type: 'error',
        action: 'Status Revoke',
        tracking_id: revokeTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Failed',
        message: error.message || 'Status change failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
    } finally {
      setRevokeLoading(false);
    }
  };

  

  // Handle Enter key press for revoke tracking ID input
  const handleRevokeTrackingIdInput = async (e) => {
    if (e.key === 'Enter' && revokeTrackingId.trim()) {
      console.log('🚀 Revoke: Enter pressed for tracking ID:', revokeTrackingId.trim());
      
      // First get the current status and capture the values directly
      const statusResult = await getCurrentStatusAndReturnValues(revokeTrackingId.trim());
      
      if (statusResult) {
        const { currentStatusValue, selectedStatusValue } = statusResult;
        console.log('🔍 Revoke: Direct values - currentStatus:', currentStatusValue, 'selectedStatus:', selectedStatusValue);
        
        // Check if we can proceed with the revoke
        if (currentStatusValue && 
            currentStatusValue !== 'Not Found' && 
            currentStatusValue !== 'Error' && 
            selectedStatusValue !== currentStatusValue) {
          console.log('✅ Revoke: Status different, triggering revoke operation');
          
          // Set the values in state for the revoke operation
          setCurrentStatus(currentStatusValue);
          setSelectedStatus(selectedStatusValue);
          
          // ✅ FIXED: Pass values directly to avoid race condition
          // Trigger the revoke operation with calculated values
          handleRevokeStatusChangeDirect(currentStatusValue, selectedStatusValue);
        } else {
          console.log('❌ Revoke: Status check failed - currentStatus:', currentStatusValue, 'selectedStatus:', selectedStatusValue);
          if (currentStatusValue === selectedStatusValue) {
            toast.error('Status is already set to the selected value');
          } else if (!currentStatusValue || currentStatusValue === 'Not Found' || currentStatusValue === 'Error') {
            toast.error('Invalid tracking ID or status');
          }
        }
      } else {
        console.log('❌ Revoke: Failed to get status values');
        toast.error('Failed to retrieve tracking ID status');
      }
    }
  };



  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Revoke Status</h1>
          <p className="text-gray-600">Manage status changes and revert to previous states</p>
        </div>
      </div>

      {/* Revoke Section */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <RotateCcw className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Revoke Status</h2>
              <p className="text-sm text-gray-600">
                Scan tracking ID and press Enter - status automatically reverts to previous
              </p>
              <div className="text-xs text-gray-500 mt-1">
                Flow: Unlabeled → Label → Packing Pending → Packing → Dispatch Pending → Dispatch
              </div>
              <div className="text-xs text-blue-600 mt-1 font-medium">
                ⚡ Fully Automated - No Manual Confirmation Required
              </div>
            </div>
            
            <div className="space-y-4">
              <div>
                <label htmlFor="revokeTrackingId" className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking ID
                </label>
              <input
                  ref={revokeTrackingIdInputRef}
                type="text"
                  id="revokeTrackingId"
                  value={revokeTrackingId}
                  onChange={(e) => setRevokeTrackingId(e.target.value)}
                  onKeyDown={handleRevokeTrackingIdInput}
                  placeholder="Scan tracking ID and press Enter to auto-revert status"
                  className="scan-input w-full"
                  autoFocus
                  disabled={revokeLoading}
                />
              </div>

              {/* Current Status Display */}
              {currentStatus && (
                <div className="p-3 bg-gray-50 rounded-lg border">
                  <div className="text-sm text-gray-600 mb-1">Current Status:</div>
                  <div className="text-lg font-semibold text-gray-900">
                    {currentStatus === 'Not Found' ? (
                      <span className="text-red-600">Not Found</span>
                    ) : currentStatus === 'Error' ? (
                      <span className="text-red-600">Error</span>
                    ) : (
                      <span className="text-blue-600">{currentStatus}</span>
                    )}
                  </div>
                  
                  {/* Show what status it will be changed to */}
                  {currentStatus !== 'Not Found' && currentStatus !== 'Error' && (
                    <div className="mt-2 pt-2 border-t border-gray-200">
                      {selectedStatus !== currentStatus ? (
                        <>
                          <div className="text-sm text-gray-600">Status Change:</div>
                          <div className="text-lg font-semibold text-green-600">
                            {getStatusLabel(currentStatus)} → {getStatusLabel(selectedStatus)}
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            ⚡ Will automatically revert on Enter key
                          </div>
                        </>
                      ) : (
                        <>
                          <div className="text-sm text-gray-600">Status:</div>
                          <div className="text-lg font-semibold text-gray-600">
                            {getStatusLabel(currentStatus)} (No change needed)
                          </div>
                        </>
                      )}
                    </div>
                  )}
                </div>
              )}

              {/* Status Change Dropdown */}
              <div>
                <label htmlFor="statusChange" className="block text-sm font-medium text-gray-700 mb-2">
                  Previous Status (Auto-determined)
                </label>
                <select
                  id="statusChange"
                  value={selectedStatus}
                  onChange={(e) => setSelectedStatus(e.target.value)}
                  className="scan-input w-full bg-blue-50 border-blue-200 cursor-not-allowed"
                  disabled={true}
                >
                  {statusOptions.map((option) => (
                    <option key={option.value} value={option.value} className={option.color}>
                      {option.label}
                    </option>
                  ))}
                </select>
                {currentStatus && currentStatus !== 'Not Found' && currentStatus !== 'Error' && (
                  <p className="text-xs text-blue-600 mt-1">
                    ✓ Automatically determined - no manual selection possible
                  </p>
                )}
          </div>

              {/* Manual Trigger Button for Testing */}
              {currentStatus && currentStatus !== 'Not Found' && currentStatus !== 'Error' && selectedStatus !== currentStatus && (
                <button
                  onClick={handleRevokeStatusChange}
                  disabled={revokeLoading}
                  className="btn-primary w-full disabled:opacity-50 disabled:cursor-notowed"
                >
                  {revokeLoading ? (
                    <div className="flex items-center justify-center">
                      <div className="spinner w-5 h-5 mr-2"></div>
                      Processing...
                    </div>
                  ) : (
                    <>
                      <RotateCcw className="w-5 h-5 mr-2" />
                      Manual Trigger: Change Status to {getStatusLabel(selectedStatus)}
                    </>
                  )}
                </button>
              )}

              {/* Status change happens automatically on Enter - no button needed */}
              {revokeLoading && (
                <div className="p-3 bg-blue-50 border border-blue-200 rounded-lg text-center">
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2"></div>
                    <span className="text-blue-700">Processing status change...</span>
                  </div>
                </div>
              )}
              
              {/* Ready indicator after processing */}
              {!revokeLoading && currentStatus && currentStatus !== 'Not Found' && currentStatus !== 'Error' && (
                <div className="p-3 bg-green-50 border border-green-200 rounded-lg text-center">
                  <div className="flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 mr-2 text-green-600" />
                    <span className="text-green-700">Ready for next scan</span>
                  </div>
                </div>
              )}
            </div>
          </div>
            </div>
          )}


      
      {/* Full Width Activity Logger Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Revoke Status Activity Logger</h3>
            <div className="flex items-center space-x-3">
                <button
                onClick={() => setShowLogs(!showLogs)}
                className="text-sm bg-gray-100 hover:bg-gray-200 text-gray-700 px-4 py-2 rounded border transition-colors"
                >
                {showLogs ? 'Hide Logs' : 'Show Logs'}
                </button>
                <button
                onClick={() => setActivityLogs([])}
                className="text-sm bg-red-100 hover:bg-red-200 text-red-700 px-4 py-2 rounded border transition-colors"
              >
                Clear Logs
                </button>
              </div>
          </div>
        </div>
        
        {showLogs && (
          <div className="p-6">
            {activityLogs.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Package className="w-16 h-16 mx-auto mb-4 text-gray-400" />
                <p className="text-lg font-medium">No revoke status activity yet</p>
                <p className="text-sm text-gray-400">Start revoking statuses to see activity logs here</p>
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
                    {activityLogs.map((log) => (
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

            {activityLogs.length > 0 && (
              <div className="mt-4 px-4 py-3 bg-gray-50 border border-gray-200 rounded-lg text-sm text-gray-600">
                📊 Showing {activityLogs.length} recent activities • Auto-clear after 100 logs
          </div>
            )}
        </div>
        )}
      </div>
    </div>
  );
};

export default RevokePage;
