import React, { useState, useEffect, useRef } from 'react';
import { Package, CheckCircle, XCircle, Clock, X, Zap } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/soundUtils';

const PackingPopup = ({ 
  isOpen, 
  onClose, 
  initialTrackingId = '', 
  onPackingComplete 
}) => {
  const { user } = useAuthStore();
  
  // Packing Scanning State
  const [trackingId, setTrackingId] = useState(initialTrackingId);
  const [gCode, setGCode] = useState('');
  const [scanningLoading, setScanningLoading] = useState(false);
  const [trackingIdValidated, setTrackingIdValidated] = useState(false);
  const [trackingRecord, setTrackingRecord] = useState(null);
  const [packingProgress, setPackingProgress] = useState(null);
  const [lastScanTime, setLastScanTime] = useState(0);
  const [performanceMode, setPerformanceMode] = useState('normal');
  
  // Refs for input focus
  const trackingIdInputRef = useRef(null);
  const gCodeInputRef = useRef(null);

  // Initialize tracking ID when popup opens
  useEffect(() => {
    if (isOpen && initialTrackingId) {
      setTrackingId(initialTrackingId);
      handleTrackingIdValidation(initialTrackingId);
    }
  }, [isOpen, initialTrackingId]);

  // Focus on appropriate input when popup opens
  useEffect(() => {
    if (isOpen) {
      if (initialTrackingId) {
        // If tracking ID is provided, focus on G-Code input
        setTimeout(() => {
          gCodeInputRef.current?.focus();
        }, 100);
      } else {
        // Otherwise focus on tracking ID input
        setTimeout(() => {
          trackingIdInputRef.current?.focus();
        }, 100);
      }
    }
  }, [isOpen, initialTrackingId]);

  // Reset state when popup closes
  useEffect(() => {
    if (!isOpen) {
      setTrackingId('');
      setGCode('');
      setScanningLoading(false);
      setTrackingIdValidated(false);
      setTrackingRecord(null);
      setPackingProgress(null);
      setLastScanTime(0);
      setPerformanceMode('normal');
    }
  }, [isOpen]);

  // Handle tracking ID validation - ULTRA-FAST version
  const handleTrackingIdValidation = async (trackingIdValue = trackingId) => {
    if (!trackingIdValue.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setScanningLoading(true);
    const startTime = performance.now();

    try {
      console.log(`⚡ ULTRA-FAST: Validating tracking ID: ${trackingIdValue}`);
      
      // Use the fastest validation method - direct status check
      const statusResponse = await scanAPI.getCurrentStatus(trackingIdValue.trim());
      const validationTime = performance.now() - startTime;
      
      console.log(`⚡ Validation completed in ${validationTime.toFixed(2)}ms`);
      console.log(`⚡ Status check response:`, statusResponse.data);
      
      if (statusResponse.data?.success) {
        const currentStatus = statusResponse.data.status;
        
        // Fast validation - only allow packing for correct statuses
        if (currentStatus === 'label_scanned' || currentStatus === 'packing_pending_scanned') {
          setTrackingIdValidated(true);
          setTrackingRecord({
            status: currentStatus,
            tracking_id: trackingIdValue.trim(),
            courier: statusResponse.data.courier || 'Unknown'
          });
          
          console.log(`⚡ ULTRA-FAST validation: ${validationTime.toFixed(2)}ms`);
          toast.success(`✅ Ready for packing (${validationTime.toFixed(0)}ms)`);
          
          // Skip packing progress for speed - it's optional
          setPackingProgress(null);
          
          // Immediate focus for fastest workflow
          setTimeout(() => {
            gCodeInputRef.current?.focus();
          }, 50); // Reduced from 100ms to 50ms
          return;
        } else {
          toast.error(`Cannot pack item with status: ${currentStatus}`);
          setTrackingIdValidated(false);
          setTrackingRecord(null);
          setPackingProgress(null);
          return;
        }
      }
      
      // Fast error handling
      toast.error('Tracking ID validation failed');
      setTrackingIdValidated(false);
      setTrackingRecord(null);
      setPackingProgress(null);
      
    } catch (error) {
      console.error('⚡ ULTRA-FAST validation error:', error);
      toast.error('Validation failed');
      setTrackingIdValidated(false);
      setTrackingRecord(null);
      setPackingProgress(null);
    } finally {
      setScanningLoading(false);
    }
  };

  // Get packing progress
  const getPackingProgress = async (trackingIdValue = trackingId) => {
    try {
      const response = await scanAPI.getPackingProgress({
        tracking_id: trackingIdValue.trim(),
        user_id: user?.user_id
      });

      if (response.data?.ok) {
        setPackingProgress(response.data.data);
      } else {
        // If packing progress fails, that's okay - we can still pack
        console.log('Packing progress not available:', response.data?.message);
        setPackingProgress(null);
      }
    } catch (error) {
      console.log('Failed to get packing progress (this is okay):', error);
      setPackingProgress(null);
      // Don't throw the error - packing progress is optional
    }
  };

  // Handle packing scan - ULTRA-FAST version
  const handlePackingScan = async () => {
    if (!trackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    if (!gCode.trim()) {
      toast.error('Please enter G-Code/EAN');
      return;
    }

    setScanningLoading(true);
    const startTime = performance.now();

    try {
      console.log(`⚡ ULTRA-FAST PACKING: ${trackingId} + ${gCode}`);
      
      // Use ultra-fast packing scan endpoint
      const response = await scanAPI.packingScan({
        tracking_id: trackingId.trim(),
        g_code_or_ean: gCode.trim(),
        user_id: user?.user_id
      });

      const endTime = performance.now();
      const scanTime = endTime - startTime;
      setLastScanTime(scanTime);

      // Ultra-fast performance thresholds
      if (scanTime < 50) {
        setPerformanceMode('ultra-fast');
      } else if (scanTime < 150) {
        setPerformanceMode('fast');
      } else {
        setPerformanceMode('normal');
      }

      console.log(`⚡ ULTRA-FAST PACKING: ${scanTime.toFixed(2)}ms - ${response.data?.success ? 'SUCCESS' : 'FAILED'}`);

      if (response.data?.success) {
        playSuccessSound();
        toast.success(`⚡ Packed! (${scanTime.toFixed(0)}ms)`);
        
        // Clear G-Code immediately for fastest workflow
        setGCode('');
        
        // Skip progress refresh for speed - focus on next item immediately
        setPackingProgress(null);
        
        // Check if packing is complete
        if (response.data.status === 'packing_scanned') {
          toast.success('🎉 All packed! Auto-dispatching...');
          
          // Immediate notification to parent
          if (onPackingComplete) {
            onPackingComplete(trackingId, response.data);
          }
          
          // Faster popup close
          setTimeout(() => {
            onClose();
          }, 1000); // Reduced from 2000ms to 1000ms
        } else {
          // Immediate focus for next item
          setTimeout(() => {
            gCodeInputRef.current?.focus();
          }, 50); // Reduced from 100ms to 50ms
        }
      } else {
        playErrorSound();
        toast.error(response.data?.message || 'Packing failed');
      }
    } catch (error) {
      playErrorSound();
      console.error('⚡ ULTRA-FAST PACKING ERROR:', error);
      toast.error('Packing failed');
    } finally {
      setScanningLoading(false);
    }
  };

  // Handle Enter key press
  const handleKeyPress = (e, action) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      action();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full mx-4 max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Package className="w-6 h-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-bold text-gray-900">Pack Item First</h2>
              <p className="text-sm text-gray-600">
                This item needs to be packed before dispatch
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 transition-colors"
          >
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Performance Indicator */}
          {lastScanTime > 0 && (
            <div className="mb-4 p-3 rounded-lg bg-gray-50">
              <div className="flex items-center justify-between text-sm">
                <span className="text-gray-600">Last Scan Performance:</span>
                <div className="flex items-center space-x-2">
                  <Zap className={`w-4 h-4 ${
                    performanceMode === 'ultra-fast' ? 'text-green-500' : 
                    performanceMode === 'fast' ? 'text-yellow-500' : 'text-red-500'
                  }`} />
                  <span className={`font-medium ${
                    performanceMode === 'ultra-fast' ? 'text-green-600' : 
                    performanceMode === 'fast' ? 'text-yellow-600' : 'text-red-600'
                  }`}>
                    {lastScanTime.toFixed(0)}ms ({performanceMode})
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Tracking ID Input */}
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Tracking ID
            </label>
            <div className="flex space-x-2">
              <input
                ref={trackingIdInputRef}
                type="text"
                value={trackingId}
                onChange={(e) => setTrackingId(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, () => handleTrackingIdValidation())}
                placeholder="Enter Tracking ID"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={scanningLoading || (initialTrackingId && trackingIdValidated)}
              />
              <button
                onClick={() => handleTrackingIdValidation()}
                disabled={scanningLoading || !trackingId.trim()}
                className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
              >
                {scanningLoading ? (
                  <Clock className="w-4 h-4 animate-spin" />
                ) : (
                  'Validate'
                )}
              </button>
            </div>
          </div>

          {/* Tracking Record Info */}
          {trackingIdValidated && trackingRecord && (
            <div className="mb-4 p-4 bg-green-50 border border-green-200 rounded-lg">
              <div className="flex items-center space-x-2 mb-2">
                <CheckCircle className="w-5 h-5 text-green-600" />
                <span className="font-medium text-green-800">Tracking ID Validated</span>
              </div>
              <div className="text-sm text-gray-600">
                <p><strong>Status:</strong> {trackingRecord.status}</p>
                {trackingRecord.courier && (
                  <p><strong>Courier:</strong> {trackingRecord.courier}</p>
                )}
              </div>
            </div>
          )}

          {/* Packing Progress */}
          {packingProgress && (
            <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
              <div className="flex items-center justify-between mb-2">
                <span className="font-medium text-blue-800">Packing Progress</span>
                <span className="text-sm text-blue-600">
                  {packingProgress.packed_count}/{packingProgress.total_count} packed
                </span>
              </div>
              <div className="w-full bg-blue-200 rounded-full h-2">
                <div
                  className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                  style={{
                    width: `${(packingProgress.packed_count / packingProgress.total_count) * 100}%`
                  }}
                ></div>
              </div>
            </div>
          )}

          {/* G-Code Input */}
          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              G-Code/EAN
            </label>
            <div className="flex space-x-2">
              <input
                ref={gCodeInputRef}
                type="text"
                value={gCode}
                onChange={(e) => setGCode(e.target.value)}
                onKeyPress={(e) => handleKeyPress(e, handlePackingScan)}
                placeholder="Scan or enter G-Code/EAN"
                className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                disabled={scanningLoading || !trackingIdValidated}
              />
              <button
                onClick={handlePackingScan}
                disabled={scanningLoading || !trackingIdValidated || !gCode.trim()}
                className="px-6 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
              >
                {scanningLoading ? (
                  <>
                    <Clock className="w-4 h-4 animate-spin" />
                    <span>Packing...</span>
                  </>
                ) : (
                  <>
                    <Package className="w-4 h-4" />
                    <span>Pack Item</span>
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Instructions */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <h3 className="font-medium text-gray-900 mb-2">Instructions:</h3>
            <ol className="text-sm text-gray-600 space-y-1">
              <li>1. Enter or validate the tracking ID</li>
              <li>2. Scan or enter the G-Code/EAN for each item</li>
              <li>3. Repeat step 2 for all items in this tracking ID</li>
              <li>4. Once all items are packed, you can proceed with dispatch</li>
            </ol>
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end space-x-3 p-6 border-t bg-gray-50">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 bg-white border border-gray-300 rounded-md hover:bg-gray-50 transition-colors"
          >
            Cancel
          </button>
        </div>
      </div>
    </div>
  );
};

export default PackingPopup;
