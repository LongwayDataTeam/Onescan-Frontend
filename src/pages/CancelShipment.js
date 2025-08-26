import React, { useState, useEffect, useRef } from 'react';
import { XCircle, AlertTriangle, CheckCircle, Package } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';

const CancelShipment = () => {
  const { user } = useAuthStore();
  
  // Cancel Tab State
  const [cancelTrackingId, setCancelTrackingId] = useState('');
  const [cancelLoading, setCancelLoading] = useState(false);
  
  // Activity Logger State
  const [activityLogs, setActivityLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  
  // Refs for input focus
  const cancelTrackingIdInputRef = useRef(null);

  // Listen for data refresh and clear events from other components
  useEffect(() => {
    const handleClearData = (event) => {
      console.log('🗑️ Cancel Shipment: Received clear data event:', event.detail);
      
      // Clear all cancel data
      setCancelTrackingId('');
      setCancelLoading(false);
      
      // Clear local storage
      localStorage.removeItem('cancelShipmentPageData');
      
      console.log('🗑️ Cancel Shipment: All cancel data cleared');
      toast.info('Cancel shipment data cleared due to main data clear operation');
    };

    const handleRefreshData = (event) => {
      console.log('🔄 Cancel Shipment: Received refresh data event:', event.detail);
      
      // If this is a cancel operation, clear the form for next scan
      if (event.detail.action === 'cancel_shipment_success') {
        console.log('🔄 Cancel Shipment: Refreshing form for next scan');
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

  // Function to add activity logs to the table
  const addActivityLog = (logData) => {
    const newLog = {
      id: Date.now(),
      timestamp: new Date().toISOString(),
      ...logData
    };
    setActivityLogs(prevLogs => [newLog, ...prevLogs].slice(0, 100)); // Keep last 100 logs
  };

  // Handle Cancel Shipment
  const handleCancelShipment = async () => {
    if (!cancelTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setCancelLoading(true);
    try {
      console.log('🚀 Cancel: Making API call with data:', {
        tracking_id: cancelTrackingId.trim(),
        user_id: user?.user_id
      });
      
      // Call real cancel API
      const response = await scanAPI.cancelShipment({
        tracking_id: cancelTrackingId.trim(),
        user_id: user?.user_id
      });

      console.log('🔍 Cancel API Response:', response);
      console.log('🔍 Response data:', response.data);
      console.log('🔍 Success field:', response.data?.success);
      
      if (response.data?.success) {
        toast.success(`Shipment cancelled for ${cancelTrackingId}. Data refreshed across all components.`);
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addActivityLog({
          type: 'success',
          action: 'Cancel Shipment',
          tracking_id: cancelTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'cancel',
          message: `Shipment cancelled successfully`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        setCancelTrackingId('');
        
        // 🔄 REFRESH DATA: Trigger global data refresh to update all components
        const refreshEvent = new CustomEvent('refreshAllTrackingData', {
          detail: {
            action: 'cancel_shipment_success',
            tracking_id: cancelTrackingId.trim(),
            timestamp: new Date().toISOString()
          }
        });
        console.log('🔄 Cancel: Dispatching data refresh event:', refreshEvent.detail);
        window.dispatchEvent(refreshEvent);
        
        // Focus back to input for next scan
        cancelTrackingIdInputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Shipment cancellation failed');
        
        // ❌ ERROR LOGGER: Add to table and console
        addActivityLog({
          type: 'error',
          action: 'Cancel Shipment',
          tracking_id: cancelTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Shipment cancellation failed',
          user: user?.username || user?.user_id || 'Unknown'
        });
      }
      
    } catch (error) {
      toast.error('Shipment cancellation failed');
      console.error('Shipment cancellation error:', error);
      
      // ❌ ERROR LOGGER: Add to table and console
      addActivityLog({
        type: 'error',
        action: 'Cancel Shipment',
        tracking_id: cancelTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Failed',
        message: error.message || 'Shipment cancellation failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
    } finally {
      setCancelLoading(false);
    }
  };

  // Handle Enter key press for cancel tracking ID input
  const handleCancelTrackingIdInput = (e) => {
    if (e.key === 'Enter' && cancelTrackingId.trim()) {
      handleCancelShipment();
    }
  };

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Cancel Shipment</h1>
          <p className="text-gray-600">Cancel shipments by tracking ID</p>
        </div>
      </div>

      {/* Cancel Shipment Section */}
      <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
        <div className="max-w-md mx-auto">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <XCircle className="w-8 h-8 text-red-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900 mb-2">Cancel Shipment</h2>
            <p className="text-sm text-gray-600">
              Scan tracking ID to cancel shipment
            </p>
          </div>
          
          <div className="space-y-4">
            <div>
              <label htmlFor="cancelTrackingId" className="block text-sm font-medium text-gray-700 mb-2">
                Tracking ID
              </label>
              <input
                ref={cancelTrackingIdInputRef}
                type="text"
                id="cancelTrackingId"
                value={cancelTrackingId}
                onChange={(e) => setCancelTrackingId(e.target.value)}
                onKeyDown={handleCancelTrackingIdInput}
                placeholder="Scan/Enter tracking ID and press Enter"
                className="scan-input w-full"
                autoFocus
                disabled={cancelLoading}
              />
            </div>
            
            <button
              onClick={handleCancelShipment}
              disabled={cancelLoading || !cancelTrackingId.trim()}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base bg-red-600 hover:bg-red-700"
            >
              {cancelLoading ? (
                <div className="flex items-center justify-center">
                  <div className="spinner w-5 h-5 mr-2"></div>
                  Cancelling...
                </div>
              ) : (
                <>
                  <XCircle className="w-5 h-5 mr-2" />
                  Cancel Shipment
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Full Width Activity Logger Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900">Cancel Shipment Activity Logger</h3>
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
                <p className="text-lg font-medium">No cancel shipment activity yet</p>
                <p className="text-sm text-gray-400">Start cancelling shipments to see activity logs here</p>
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

export default CancelShipment;
