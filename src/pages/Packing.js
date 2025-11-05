import React, { useState, useEffect, useRef } from 'react';
import { Package, CheckCircle, XCircle, Clock, Search, Zap, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import { scanAPI } from '../services/api';
import { playSuccessSound, playErrorSound } from '../utils/soundUtils';

const Packing = () => {
  const { user } = useAuthStore();
  const [activeTab, setActiveTab] = useState('scanning');
  
  // Packing Scanning State
  const [trackingId, setTrackingId] = useState('');
  const [gCode, setGCode] = useState('');
  const [scanningLoading, setScanningLoading] = useState(false);
  const [trackingIdValidated, setTrackingIdValidated] = useState(false);
  const [trackingRecord, setTrackingRecord] = useState(null);
  const [packingProgress, setPackingProgress] = useState(null);
  const [shouldFocusTrackingId, setShouldFocusTrackingId] = useState(false);
  
  // Scanning Logger State
  const [scanLogs, setScanLogs] = useState([]);
  const [showLogs, setShowLogs] = useState(true);
  
  // Packing Courier Stats State
  const [packingCourierStats, setPackingCourierStats] = useState({});
  const [packingCourierStatsLoading, setPackingCourierStatsLoading] = useState(false);
  
  // Packing Pending State
  const [pendingTrackingId, setPendingTrackingId] = useState('');
  const [pendingLoading, setPendingLoading] = useState(false);
  const [dispatchPendingLoading, setDispatchPendingLoading] = useState(false);
  
  // Replacement State
  const [replacementTrackingId, setReplacementTrackingId] = useState('');
  const [replacementSKUs, setReplacementSKUs] = useState([]);
  const [selectedSKU, setSelectedSKU] = useState('');
  const [newPackedGCode, setNewPackedGCode] = useState('');
  const [replacementLoading, setReplacementLoading] = useState(false);
  const [updateLoading, setUpdateLoading] = useState(false);
  
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
  
  // Refs for input focus
  const trackingIdInputRef = useRef(null);
  const gCodeInputRef = useRef(null);
  const pendingTrackingIdInputRef = useRef(null);
  const replacementTrackingIdInputRef = useRef(null);

  // Set document title
  useEffect(() => {
    document.title = 'Packing - OneScan';
  }, []);

  // Listen for clear data events from other components
  useEffect(() => {
    const handleClearData = (event) => {

      
      // Clear all packing data
      setTrackingId('');
      setGCode('');
      setScanningLoading(false); // Ensure loading state is reset
      setTrackingIdValidated(false);
      setTrackingRecord(null);
      setPendingTrackingId('');
      setPendingLoading(false); // Ensure loading state is reset
      
      // Clear local storage
      localStorage.removeItem('packingScanningData');
      

      toast('Packing data cleared due to main data clear operation');
    };

    // Add event listener
    window.addEventListener('clearAllTrackingData', handleClearData);
    
    // Cleanup
    return () => {
      window.removeEventListener('clearAllTrackingData', handleClearData);
    };
  }, []);

  // Auto-focus tracking ID input when form is cleared
  useEffect(() => {
    if (shouldFocusTrackingId && !scanningLoading) {
      // Small delay to ensure DOM is updated
      const timer = setTimeout(() => {
        trackingIdInputRef.current?.focus();
        setShouldFocusTrackingId(false); // Reset the flag
      }, 150);
      return () => clearTimeout(timer);
    }
  }, [shouldFocusTrackingId, scanningLoading]);

  // Load packing courier stats on component mount
  useEffect(() => {
    calculatePackingCourierStats();
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

  // Calculate packing courier statistics from ALL DataUpload data (not just first 100)
  const calculatePackingCourierStats = async () => {
    try {
      setPackingCourierStatsLoading(true);
      console.log('🔄 Fetching ALL packing courier stats from DataUpload API...');
      
      // Trigger real-time cleanup automatically when refreshing stats
      try {
        const { adminAPI } = await import('../services/api');
        await adminAPI.startRealtimeCleanup();
        console.log('⚡ Real-time cleanup triggered during packing stats refresh');
      } catch (cleanupError) {
        console.log('Real-time cleanup failed, continuing with stats refresh:', cleanupError);
      }
      
      // Import dataAPI dynamically to avoid circular imports
      const { dataAPI } = await import('../services/api');
      
      // Fetch ALL data from DataUpload API using the new function
      const response = await dataAPI.getAllDataForStats();

      
      // Extract the data array
      let allData = [];
      if (response.data?.data?.records && Array.isArray(response.data.data.records)) {
        allData = response.data.data.records;

      } else {

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
      
      // Calculate courier statistics for packing workflow
      const stats = {};
      
      allData.forEach(record => {
        const courier = record.courier || 'Unknown';
        const trackingId = record.tracking_id;
        const status = record.status || 'Unlabeled';
        const isMultiSku = trackingIdGroups[trackingId].length > 1;
        
        // Packing workflow statuses
        const isPackingPending = status === 'packing_pending_scanned';
        const isPackingScanned = status === 'packing_scanned';
        
        if (!stats[courier]) {
          stats[courier] = {
            total: 0,
            singleSku: 0,
            packingPending: 0,
            multiSku: 0,
            packingScanned: 0,
            cancelled: 0
          };
        }
        
        stats[courier].total++;
        
        if (isMultiSku) {
          stats[courier].multiSku++;
          if (isPackingScanned) {
            stats[courier].packingScanned++;
          }
        } else {
          stats[courier].singleSku++;
          if (isPackingScanned) {
            stats[courier].packingScanned++;
          }
        }
        
        // Count packing pending regardless of SKU type
        if (isPackingPending) {
          stats[courier].packingPending++;
        }
        
        // Count cancelled regardless of SKU type
        if (status === 'cancel') {
          stats[courier].cancelled++;
        }
      });
      

      setPackingCourierStats(stats);
      toast.success(`✅ Packing courier stats updated with ${allData.length} total records!`);
      
    } catch (error) {

      toast.error('Failed to fetch packing courier statistics');
    } finally {
      setPackingCourierStatsLoading(false);
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

  // Handle Tracking ID Input (Step 1)
  const handleTrackingIdInput = async (e) => {
    const value = e.target.value.trim().toUpperCase();
    setTrackingId(value);
    
    // Auto-focus to G-Code input when Enter is pressed
    if (e.key === 'Enter' && value) {
      // Get current packing progress for this tracking ID
      await getPackingProgressForTrackingId(value);
      // Don't validate yet, just move to next input
      gCodeInputRef.current?.focus();
    }
  };

  // Get packing progress for a tracking ID
  const getPackingProgressForTrackingId = async (trackingIdValue) => {
    if (!trackingIdValue.trim()) return;
    
    try {
      const progressResponse = await scanAPI.getPackingProgress({
        tracking_id: trackingIdValue.trim(),
        user_id: user?.user_id
      });
      
      if (progressResponse.data?.ok) {
        const progressData = progressResponse.data.data;
        setPackingProgress({
          trackingId: trackingIdValue.trim(),
          totalOrders: progressData.total_count,
          packedOrders: progressData.packed_count,
          remainingOrders: progressData.remaining_count,
          progressPercentage: progressData.progress_percentage,
          packedOrdersList: progressData.packed_orders,
          message: `Current status: ${progressData.packed_count}/${progressData.total_count} orders packed`
        });
      } else {
        // No progress data available, clear progress
        setPackingProgress(null);
      }
    } catch (error) {

      setPackingProgress(null);
    }
  };

  // Handle G-Code Input (Step 2) - INSTANT VALIDATION
  const handleGCodeInput = async (e) => {
    const value = e.target.value.trim().toUpperCase();
    setGCode(value);
    
    // Auto-process when Enter is pressed - INSTANT VALIDATION
    if (e.key === 'Enter' && value && trackingId.trim()) {
      await validateAndProcessPackingScan();
    }
    
    // Keyboard shortcuts for multi-SKU workflow
    if (e.key === 'Escape') {
      // Clear only gcode field for retry
      setGCode('');
      gCodeInputRef.current?.focus();
    }
    
    if (e.ctrlKey && e.key === 'r') {
      // Ctrl+R to reset entire form
      e.preventDefault();
      setTrackingId('');
      setGCode('');
      setTrackingIdValidated(false);
      setTrackingRecord(null);
      setPackingProgress(null);
      trackingIdInputRef.current?.focus();
      toast('Form reset for new tracking ID');
    }
  };

  // DIRECT PACKING SCAN: Process packing scan directly without separate validation
  const validateAndProcessPackingScan = async () => {
    if (!trackingId.trim() || !gCode.trim()) {
      toast.error('Please enter both Tracking ID and G-Code/EAN');
      return;
    }

    setScanningLoading(true);
    try {
      // Process the packing scan directly
         const scanResponse = await scanAPI.packingScan({
           tracking_id: trackingId.trim(),
           g_code_or_ean: gCode.trim(),
           user_id: user?.user_id
         });


        
        // Check the actual response structure from backend (handle both direct and wrapped responses)
        const responseData = scanResponse.data || scanResponse;
        const isSuccess = responseData?.success;
        const message = responseData?.message;
        const status = responseData?.status;
        

        
        if (isSuccess) {
           toast.success(message);
           // Play success sound

           try {
             await playSuccessSound();

           } catch (error) {

           }
          
          // Get updated packing progress after scan
          try {
            const progressResponse = await scanAPI.getPackingProgress({
              tracking_id: trackingId.trim(),
              user_id: user?.user_id
            });
            
            if (progressResponse.data?.ok) {
              const progressData = progressResponse.data.data;
              setPackingProgress({
                trackingId: trackingId.trim(),
                totalOrders: progressData.total_count,
                packedOrders: progressData.packed_count,
                remainingOrders: progressData.remaining_count,
                progressPercentage: progressData.progress_percentage,
                packedOrdersList: progressData.packed_orders,
                message: message
              });
            }
          } catch (progressError) {

          }
           
           // Update progress based on single vs multi-SKU
          if (status === 'packing_scanned' || status === 'PACKING_SCANNED') {
             // All orders packed for this tracking ID - clear both inputs
             setPackingProgress(null);
            // Reset form completely for next tracking ID
             setTrackingId('');
             setGCode('');
             setTrackingIdValidated(false);
             setTrackingRecord(null);
             // Focus back to tracking ID input for next scan
             setShouldFocusTrackingId(true);
             
             // Show completion message
             toast.success('🎉 All orders packed! Ready for next tracking ID.');
           } else {
            // Check if this is single-SKU or multi-SKU
            const isMultiSku = packingProgress && packingProgress.totalOrders > 1;
            
            if (isMultiSku) {
              // Multi-SKU: keep tracking ID, clear only gcode for consecutive scanning
              setGCode(''); // Only clear gcode field
              // Keep tracking ID and progress for consecutive scanning
              // Focus back to gcode input for next gcode scan
              // Use setTimeout to ensure focus happens after state update
              setTimeout(() => {
                gCodeInputRef.current?.focus();
              }, 100);
            } else {
              // Single-SKU: reset form completely like before
              setTrackingId('');
              setGCode('');
              setTrackingIdValidated(false);
              setTrackingRecord(null);
              // Focus back to tracking ID input for next scan
              setShouldFocusTrackingId(true);
            }
          }
          
          // ✅ SUCCESS LOGGER: Add to table and console
          addScanLog({
            type: 'success',
            action: 'Packing Scan',
            tracking_id: trackingId.trim(),
            g_code_ean: gCode.trim(),
            status: status,
            message: message,
            user: user?.username || user?.user_id || 'Unknown'
          });
          
          // Focus logic based on SKU type
          const isMultiSku = packingProgress && packingProgress.totalOrders > 1;
          
          if (isMultiSku) {
            // Multi-SKU: focus G-Code for next scan
            setTimeout(() => {
              gCodeInputRef.current?.focus();
            }, 100);
          } else {
            // Single-SKU: focus tracking ID for next scan
            setShouldFocusTrackingId(true);
          }
         } else {
          // Backend returned success: false
          const errorMessage = message || 'Packing scan failed';
          toast.error(errorMessage);
          
          // Play error sound for failed scans
          try {
            await playErrorSound();
          } catch (error) {
            console.error('Failed to play error sound:', error);
          }
          
          // ❌ ERROR LOGGER: Add to table and console
          addScanLog({
            type: 'error',
            action: 'Packing Scan',
            tracking_id: trackingId.trim(),
            g_code_ean: gCode.trim(),
            status: 'Failed',
            message: errorMessage,
            user: user?.username || user?.user_id || 'Unknown'
          });
          
           setPackingProgress(null);
          // Check if this is single-SKU or multi-SKU for error handling
          const isMultiSku = packingProgress && packingProgress.totalOrders > 1;
          
          if (isMultiSku) {
            // Multi-SKU: keep tracking ID on error, clear only gcode for retry
            setGCode(''); // Only clear gcode field
            // Keep tracking ID and progress for retry
            // Focus back to gcode input for retry
            setTimeout(() => {
              gCodeInputRef.current?.focus();
            }, 100);
          } else {
            // Single-SKU: reset form completely like before
            setTrackingId('');
            setGCode('');
            setTrackingIdValidated(false);
            setTrackingRecord(null);
            // Focus back to tracking ID input for next scan
            setShouldFocusTrackingId(true);
          }
       }
    } catch (error) {
      toast.error('Packing scan failed');

      // Play error sound for network/API errors
      try {
        await playErrorSound();
      } catch (soundError) {
        console.error('Failed to play error sound:', soundError);
      }
      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Packing Scan',
        tracking_id: trackingId.trim(),
        g_code_ean: gCode.trim(),
        status: 'Network Error',
        message: error.message || 'Network/API call failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
      
      // Check if this is single-SKU or multi-SKU for network error handling
      const isMultiSku = packingProgress && packingProgress.totalOrders > 1;
      
      if (isMultiSku) {
        // Multi-SKU: keep tracking ID on network error, clear only gcode for retry
        setGCode(''); // Only clear gcode field
        // Keep tracking ID and progress for retry
        // Focus back to gcode input for retry
        setTimeout(() => {
          gCodeInputRef.current?.focus();
        }, 100);
      } else {
        // Single-SKU: reset form completely like before
        setTrackingId('');
        setGCode('');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
        // Focus back to tracking ID input for next scan
        setShouldFocusTrackingId(true);
      }
    } finally {
      setScanningLoading(false);
    }
  };

  // Legacy validation function (kept for compatibility)
  const validateTrackingId = async (trackingIdValue) => {
    if (!trackingIdValue) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setScanningLoading(true);
    try {
      const response = await scanAPI.validateTrackingForPacking({
        tracking_id: trackingIdValue,
        user_id: user?.user_id
      });

      if (response.data?.ok) {
        setTrackingIdValidated(true);
        setTrackingRecord(response.data.data);
        toast.success('Tracking ID validated! Enter G-Code/EAN');
        gCodeInputRef.current?.focus();
      } else {
        toast.error(response.data?.message || 'Invalid tracking ID');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
      }
    } catch (error) {
      toast.error('Failed to validate tracking ID');

      setTrackingIdValidated(false);
      setTrackingRecord(null);
    } finally {
      setScanningLoading(false);
    }
  };

  // Handle dispatch pending - move item from packing_scanned to dispatch_pending_scanned
  const handleDispatchPending = async () => {
    if (!packingProgress?.trackingId) {
      toast.error('No tracking ID available for dispatch pending');
      return;
    }

    setDispatchPendingLoading(true);
    try {
      // 🔍 DEBUG: Log exactly what we're sending to the API
      const requestData = {
        tracking_id: packingProgress.trackingId,
        user_id: user?.user_id
      };

      
      const response = await scanAPI.dispatchPending(requestData);

      if (response.data?.success) {
        toast.success('Item moved to dispatch pending status successfully');
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addScanLog({
          type: 'success',
          action: 'Dispatch Pending',
          tracking_id: packingProgress.trackingId,
          g_code_ean: 'N/A',
          status: 'dispatch_pending_scanned',
          message: 'Item moved to dispatch pending status',
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Clear packing progress and reset form for next tracking ID
        setPackingProgress(null);
        setTrackingId('');
        setGCode('');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
        
        // 🔄 REFRESH DATA: Update packing courier stats to show new status
        await calculatePackingCourierStats();
        
        // 🚀 TRIGGER GLOBAL DATA REFRESH: Notify other components to refresh their data
        const refreshEvent = new CustomEvent('refreshAllTrackingData', {
          detail: {
            action: 'dispatch_pending_success',
            tracking_id: packingProgress.trackingId,
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(refreshEvent);
        
        // Focus back to tracking ID input for next scan
        setShouldFocusTrackingId(true);
      } else {
        toast.error(response.data?.message || 'Failed to move to dispatch pending');
        
        // ❌ ERROR LOGGER: Add to table and console
        addScanLog({
          type: 'error',
          action: 'Dispatch Pending',
          tracking_id: packingProgress.trackingId,
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Failed to move to dispatch pending',
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Clear input fields and focus for next scan after error
        setTrackingId('');
        setGCode('');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
        setShouldFocusTrackingId(true);
      }
    } catch (error) {
      toast.error('Failed to move to dispatch pending');

      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Dispatch Pending',
        tracking_id: packingProgress.trackingId,
        g_code_ean: 'N/A',
        status: 'Network Error',
        message: error.message || 'Network/API call failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
      
              // Clear input fields and focus for next scan after error
        setTrackingId('');
        setGCode('');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
        setShouldFocusTrackingId(true);
    } finally {
      setDispatchPendingLoading(false);
    }
  };

  // Legacy process function (kept for compatibility)
  const processPackingScan = async () => {
    if (!trackingId.trim() || !gCode.trim() || !trackingIdValidated) {
      toast.error('Please complete both steps');
      return;
    }

    setScanningLoading(true);
    const startTime = Date.now();
    
    try {
      const response = await scanAPI.packingScan({
        tracking_id: trackingId.trim(),
        g_code_or_ean: gCode.trim(),
        user_id: user?.user_id
      });

      const responseTime = Date.now() - startTime;
      const isSuccess = response.data?.success;
      const isMultiSku = packingProgress?.totalOrders > 1;

      // Update Performance KPIs
      updateGlobalKPIs(isSuccess, responseTime, isMultiSku);

      // Check the actual response structure from backend
      if (isSuccess) {
        const status = response.data?.status;
        const message = response.data?.message || `Packing scan successful for ${trackingId}`;
        
        toast.success(message);
        
        // Add to success scan details
        addScanDetail('successScans', {
          trackingId: trackingId.trim(),
          gCode: gCode.trim(),
          responseTime: responseTime,
          isMultiSku: isMultiSku,
          totalOrders: packingProgress?.totalOrders || 1
        });

        // Add to multi-SKU details if applicable
        if (isMultiSku) {
          addScanDetail('multiSkuOrders', {
            trackingId: trackingId.trim(),
            gCode: gCode.trim(),
            totalOrders: packingProgress?.totalOrders,
            responseTime: responseTime
          });
        }
        
        // Play success sound
        try {
          await playSuccessSound();

        } catch (error) {

        }
        
        // Check if all orders are packed (100% completion)
        if (status === 'packing_scanned' || status === 'PACKING_SCANNED') {
          // All orders packed for this tracking ID - clear both inputs
          setPackingProgress(null);
          setTrackingId('');
          setGCode('');
          setTrackingIdValidated(false);
          setTrackingRecord(null);
          setShouldFocusTrackingId(true);
          
          // Show completion message
          toast.success('🎉 All orders packed! Ready for next tracking ID.');
        } else {
          // Partial completion - handle based on single vs multi-SKU
          if (isMultiSku) {
            // Multi-SKU: keep tracking ID, clear only gcode for consecutive scanning
            setGCode(''); // Only clear gcode field
            // Keep tracking ID and progress for consecutive scanning
            // Focus back to gcode input for next gcode scan
            setTimeout(() => {
              gCodeInputRef.current?.focus();
            }, 100);
          } else {
            // Single-SKU: reset form completely
            setTrackingId('');
            setGCode('');
            setTrackingIdValidated(false);
            setTrackingRecord(null);
            setShouldFocusTrackingId(true);
          }
        }
      } else {
        toast.error(response.data?.message || 'Packing scan failed');
        
        // Add to error scan details
        addScanDetail('errorScans', {
          trackingId: trackingId.trim(),
          gCode: gCode.trim(),
          error: response.data?.message || 'Packing scan failed',
          responseTime: responseTime
        });
        
        // Play error sound
        try {
          await playErrorSound();

        } catch (error) {

        }
        
        // For errors, only clear G-Code for multi-SKU, reset completely for single-SKU
        if (isMultiSku) {
          // Multi-SKU: keep tracking ID, clear only gcode for retry
          setGCode('');
          setTimeout(() => {
            gCodeInputRef.current?.focus();
          }, 100);
        } else {
          // Single-SKU: reset form completely
          setTrackingId('');
          setGCode('');
          setTrackingIdValidated(false);
          setTrackingRecord(null);
          setShouldFocusTrackingId(true);
        }
      }
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      // Update Performance KPIs for network error
      updateGlobalKPIs(false, responseTime, false);
      
      // Add to error scan details
      addScanDetail('errorScans', {
        trackingId: trackingId.trim(),
        gCode: gCode.trim(),
        error: error.message || 'Network/API call failed',
        responseTime: responseTime
      });
      
      toast.error('Packing scan failed');
      
      // Play error sound for network/API errors
      try {
        await playErrorSound();

      } catch (error) {

      }
      
      // For network errors, only clear G-Code for multi-SKU, reset completely for single-SKU
      const isMultiSku = packingProgress?.totalOrders > 1;
      if (isMultiSku) {
        // Multi-SKU: keep tracking ID, clear only gcode for retry
        setGCode('');
        setTimeout(() => {
          gCodeInputRef.current?.focus();
        }, 100);
      } else {
        // Single-SKU: reset form completely
        setTrackingId('');
        setGCode('');
        setTrackingIdValidated(false);
        setTrackingRecord(null);
        setShouldFocusTrackingId(true);
      }
    } finally {
      setScanningLoading(false);
    }
  };

  // Handle Packing Scanning (Legacy - kept for compatibility)
  const handlePackingScan = async () => {
    if (!trackingId.trim() || !gCode.trim()) {
      toast.error('Please enter both Tracking ID and G-Code');
      return;
    }

    if (!trackingIdValidated) {
      // If tracking ID not validated, validate first
      await validateTrackingId(trackingId.trim());
      return;
    }

    // If tracking ID is validated, process the scan
    await processPackingScan();
  };

  // Handle Packing Pending
  const handlePendingScan = async () => {
    if (!pendingTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setPendingLoading(true);
    try {
      const response = await scanAPI.packingPending({
        tracking_id: pendingTrackingId.trim(),
        user_id: user?.user_id
      });

      // Check the actual response structure from backend (ScanResponse has 'success' field)
      if (response.data?.success) {
        toast.success(`Marked as packing pending: ${pendingTrackingId}`);
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addScanLog({
          type: 'success',
          action: 'Packing Pending',
          tracking_id: pendingTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Pending',
          message: `Marked as packing pending: ${pendingTrackingId}`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        setPendingTrackingId('');
        // Focus back to input
        // Small delay to ensure DOM update before focus
        setTimeout(() => {
          pendingTrackingIdInputRef.current?.focus();
        }, 100);
      } else {
        toast.error(response.data?.message || 'Failed to mark as pending');
        
        // Play error sound for failed packing pending
        try {
          await playErrorSound();
        } catch (error) {
          console.error('Failed to play error sound:', error);
        }
        
        // ❌ ERROR LOGGER: Add to table and console
        addScanLog({
          type: 'error',
          action: 'Packing Pending',
          tracking_id: pendingTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Failed to mark as pending',
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Clear input field and focus for next scan after error
        setPendingTrackingId('');
        pendingTrackingIdInputRef.current?.focus();
      }
    } catch (error) {
      toast.error('Packing pending failed');

      // Play error sound for network/API errors
      try {
        await playErrorSound();
      } catch (soundError) {
        console.error('Failed to play error sound:', soundError);
      }
      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Packing Pending',
        tracking_id: pendingTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Network Error',
        message: error.message || 'Network/API call failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
      
      // Clear input field for next scan after error
      setPendingTrackingId('');
    } finally {
      setPendingLoading(false);
    }
  };

  // Replacement Functions (first duplicate removed)
  



  // Replacement Functions
  const handleGetSKUs = async () => {
    if (!replacementTrackingId.trim()) {
      toast.error('Please enter Tracking ID');
      return;
    }

    setReplacementLoading(true);
    try {

      
      const response = await scanAPI.getTrackingSKUs({
        tracking_id: replacementTrackingId.trim(),
        user_id: user?.user_id
      });

      if (response.data?.success) {
        setReplacementSKUs(response.data.skus || []);
        toast.success(`Found ${response.data.skus?.length || 0} SKUs for ${replacementTrackingId}`);
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addScanLog({
          type: 'success',
          action: 'Get SKUs',
          tracking_id: replacementTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Success',
          message: `Found ${response.data.skus?.length || 0} SKUs for replacement`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Clear previous selections
        setSelectedSKU('');
        setNewPackedGCode('');
      } else {
        toast.error(response.data?.message || 'Failed to get SKUs');
        
        // ❌ ERROR LOGGER: Add to table and console
        addScanLog({
          type: 'error',
          action: 'Get SKUs',
          tracking_id: replacementTrackingId.trim(),
          g_code_ean: 'N/A',
          status: 'Failed',
          message: response.data?.message || 'Failed to get SKUs',
          user: user?.username || user?.user_id || 'Unknown'
        });
      }
    } catch (error) {
      toast.error('Failed to get SKUs');

      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Get SKUs',
        tracking_id: replacementTrackingId.trim(),
        g_code_ean: 'N/A',
        status: 'Network Error',
        message: error.message || 'Network/API call failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
    } finally {
      setReplacementLoading(false);
    }
  };

  const handleUpdatePackedGCode = async () => {
    if (!selectedSKU || !newPackedGCode.trim()) {
      toast.error('Please select SKU and enter new packed G-Code');
      return;
    }

    setUpdateLoading(true);
    try {

      
      const response = await scanAPI.updatePackedGCode({
        tracking_id: replacementTrackingId.trim(),
        sku: selectedSKU,
        packed_g_code: newPackedGCode.trim(),
        user_id: user?.user_id
      });

      if (response.data?.success) {
        toast.success(`Packed G-Code updated successfully for SKU ${selectedSKU}`);
        
        // ✅ SUCCESS LOGGER: Add to table and console
        addScanLog({
          type: 'success',
          action: 'Update Packed G-Code',
          tracking_id: replacementTrackingId.trim(),
          g_code_ean: newPackedGCode.trim(),
          status: 'Success',
          message: `Updated packed G-Code for SKU ${selectedSKU} from '${response.data.old_packed_g_code || 'None'}' to '${newPackedGCode.trim()}'`,
          user: user?.username || user?.user_id || 'Unknown'
        });
        
        // Clear form
        setNewPackedGCode('');
        
        // Refresh SKUs to show updated data
        await handleGetSKUs();
        
        // 🚀 TRIGGER GLOBAL DATA REFRESH: Notify other components to refresh their data
        const refreshEvent = new CustomEvent('refreshAllTrackingData', {
          detail: {
            action: 'replacement_update_success',
            tracking_id: replacementTrackingId.trim(),
            sku: selectedSKU,
            new_packed_g_code: newPackedGCode.trim(),
            timestamp: new Date().toISOString()
          }
        });
        window.dispatchEvent(refreshEvent);
      } else {
        toast.error(response.data?.message || 'Failed to update packed G-Code');
        
        // ❌ ERROR LOGGER: Add to table and console
        addScanLog({
          type: 'error',
          action: 'Update Packed G-Code',
          tracking_id: replacementTrackingId.trim(),
          g_code_ean: newPackedGCode.trim(),
          status: 'Failed',
          message: response.data?.message || 'Failed to update packed G-Code',
          user: user?.username || user?.user_id || 'Unknown'
        });
      }
    } catch (error) {
      toast.error('Failed to update packed G-Code');

      
      // ❌ NETWORK/API ERROR LOGGER: Add to table and console
      addScanLog({
        type: 'error',
        action: 'Update Packed G-Code',
        tracking_id: replacementTrackingId.trim(),
        g_code_ean: newPackedGCode.trim(),
        status: 'Network Error',
        message: error.message || 'Network/API call failed',
        user: user?.username || user?.user_id || 'Unknown'
      });
    } finally {
      setUpdateLoading(false);
    }
  };

  return (
    <div className="flex gap-6">
      {/* Main Content */}
      <div className="flex-1 space-y-6">
      {/* Page Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Packing</h1>
          <p className="text-gray-600">Manage packing operations and pending items</p>
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
            <Package className="w-4 h-4 inline mr-2" />
            Packing Scanning
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
            Packing Pending
          </button>
          <button
            onClick={() => setActiveTab('replacement')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'replacement'
                ? 'border-primary-500 text-primary-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <Search className="w-4 h-4 inline mr-2" />
            Replacement
          </button>
        </nav>
      </div>

      {/* Tab Content */}
      <div className="space-y-6">
      {activeTab === 'scanning' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Package className="w-8 h-8 text-blue-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                Packing Scanning
                {trackingId.trim() && (
                  <span className={`ml-2 text-sm font-medium ${packingProgress && packingProgress.totalOrders > 1 ? 'text-green-600' : 'text-blue-600'}`}>
                    {packingProgress && packingProgress.totalOrders > 1 ? '🎯 Multi-SKU Mode' : '📦 Single-SKU Mode'}
                  </span>
                )}
              </h2>
              <p className="text-sm text-gray-600">
                {trackingId.trim() 
                  ? packingProgress && packingProgress.totalOrders > 1
                    ? `Scanning multiple G-Codes for tracking ID: ${trackingId}`
                    : `Scanning G-Code for tracking ID: ${trackingId}`
                  : 'Scan tracking ID and G-Code to process packing'
                }
              </p>
            </div>
            
                         <div className="mb-4 p-3 bg-blue-50 border border-blue-200 rounded-md">
               <p className="text-sm text-blue-800">
                 <strong>Smart Packing Workflow:</strong> Automatically detects single vs multi-SKU and adjusts behavior accordingly
               </p>
               <p className="text-xs text-blue-700 mt-1">
                 💡 <strong>Single-SKU Mode:</strong> One order per tracking ID. Form resets after each scan (clear both fields).
               </p>
                <p className="text-xs text-blue-700 mt-1">
                  🎯 <strong>Multi-SKU Mode:</strong> Multiple orders per tracking ID. Only G-Code clears, Tracking ID persists for consecutive scanning.
                </p>
                <p className="text-xs text-blue-700 mt-1">
                  🔄 <strong>Auto-Detection:</strong> System automatically determines mode based on order count and applies appropriate workflow.
               </p>
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
                                onChange={(e) => setTrackingId(e.target.value.toUpperCase())}
                                onKeyDown={handleTrackingIdInput}
                                placeholder="Scan/Enter tracking ID and press Enter"
                                className="scan-input w-full"
                                autoFocus
                                disabled={scanningLoading}
                              />
                              {/* Multi-SKU Status and Controls */}
                              {trackingId.trim() && (
                                <div className="mt-2 space-y-2">
                                  {/* SKU Mode Indicator */}
                                  <div className={`border rounded-md p-2 ${packingProgress && packingProgress.totalOrders > 1 ? 'bg-green-50 border-green-200' : 'bg-blue-50 border-blue-200'}`}>
                                    <div className="flex items-center justify-between">
                                      <span className={`text-xs font-medium ${packingProgress && packingProgress.totalOrders > 1 ? 'text-green-800' : 'text-blue-800'}`}>
                                        {packingProgress && packingProgress.totalOrders > 1 ? '🎯 Multi-SKU Mode' : '📦 Single-SKU Mode'}
                                      </span>
                                      <span className={`text-xs ${packingProgress && packingProgress.totalOrders > 1 ? 'text-green-600' : 'text-blue-600'}`}>
                                        {packingProgress ? `${packingProgress.packedOrders || 0}/${packingProgress.totalOrders || 0} orders` : 'Ready for G-Code scanning'}
                                      </span>
                                    </div>
                                  </div>
                                  
                                  {/* Action Buttons */}
                                  <div className="flex space-x-2">
                                    <button
                                      onClick={() => getPackingProgressForTrackingId(trackingId)}
                                      className="flex-1 text-xs bg-gray-100 hover:bg-gray-200 text-gray-700 py-2 px-3 rounded border border-gray-300 transition-colors"
                                    >
                                      <Search className="w-3 h-3 inline mr-1" />
                                      Check Status
                                    </button>

                                  </div>
                                  
                                  {/* Clear Tracking ID Button */}
                                  <button
                                    onClick={() => {
                                      setTrackingId('');
                                      setGCode('');
                                      setTrackingIdValidated(false);
                                      setTrackingRecord(null);
                                      setPackingProgress(null);
                                      trackingIdInputRef.current?.focus();
                                    }}
                                    className="w-full text-xs bg-red-100 hover:bg-red-200 text-red-700 py-2 px-3 rounded border border-red-300 transition-colors"
                                  >
                                    🗑️ Clear & Start New Tracking ID
                                  </button>
                                </div>
                              )}
                            </div>
                            
                            <div>
                              <label htmlFor="gCode" className="block text-sm font-medium text-gray-700 mb-2">
                                G-Code/EAN
                                {trackingId.trim() && (
                                  <span className={`ml-2 text-xs font-medium ${packingProgress && packingProgress.totalOrders > 1 ? 'text-green-600' : 'text-blue-600'}`}>
                                    {packingProgress && packingProgress.totalOrders > 1 ? '(Ready for consecutive scanning)' : '(Single scan mode)'}
                                  </span>
                                )}
                              </label>
                              <input
                                ref={gCodeInputRef}
                                type="text"
                                id="gCode"
                                value={gCode}
                                onChange={(e) => setGCode(e.target.value.toUpperCase())}
                                onKeyDown={handleGCodeInput}
                                placeholder={trackingId.trim() 
                                  ? packingProgress && packingProgress.totalOrders > 1
                                    ? "Scan next G-Code/EAN for this tracking ID"
                                    : "Scan G-Code/EAN for this tracking ID"
                                  : "Scan/Enter G-Code/EAN and press Enter"
                                }
                                className={`scan-input w-full ${trackingId.trim() 
                                  ? packingProgress && packingProgress.totalOrders > 1 
                                    ? 'border-green-300 bg-green-50' 
                                    : 'border-blue-300 bg-blue-50'
                                  : ''
                                }`}
                                disabled={scanningLoading}
                              />
                              {/* Multi-SKU Ready Indicator */}
                              {trackingId.trim() && !gCode.trim() && packingProgress && packingProgress.totalOrders > 1 && (
                                <div className="mt-2 p-2 bg-green-100 border border-green-300 rounded-md">
                                  <div className="flex items-center text-xs text-green-800">
                                    <div className="w-2 h-2 bg-green-500 rounded-full mr-2 animate-pulse"></div>
                                    <strong>Ready for next G-Code scan</strong>
                                    <span className="ml-2 text-green-600">
                                      ({packingProgress.remainingOrders} orders remaining)
                                    </span>
                                  </div>
                                </div>
                              )}
                              {trackingId.trim() && !gCode.trim() && (
                                <div className={`mt-1 text-xs ${packingProgress && packingProgress.totalOrders > 1 ? 'text-green-600' : 'text-blue-600'}`}>
                                  💡 {packingProgress && packingProgress.totalOrders > 1 
                                    ? `Ready for next G-Code scan - cursor focused automatically`
                                    : `Scan G-Code for tracking ID: ${trackingId}`
                                  }
                                </div>
                              )}
                            </div>
                            
                            {/* Enhanced Packing Progress Display for Multi-SKU */}
                            {packingProgress && (
                              <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <div className="flex items-center justify-between mb-3">
                                  <h3 className="text-sm font-semibold text-blue-900">
                                    🎯 Multi-SKU Packing Progress: {packingProgress.trackingId}
                                  </h3>
                                  <span className="text-xs text-blue-700 font-medium">
                                    {packingProgress.packedOrders || 0}/{packingProgress.totalOrders || 0} Orders
                                  </span>
                                </div>
                                
                                {/* Progress Bar */}
                                {packingProgress.progressPercentage !== undefined && (
                                  <div className="mb-3">
                                    <div className="w-full bg-blue-200 rounded-full h-2">
                                      <div 
                                        className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                                        style={{ width: `${packingProgress.progressPercentage}%` }}
                                      ></div>
                                    </div>
                                    <div className="text-xs text-blue-700 mt-1 text-center">
                                      {packingProgress.progressPercentage}% Complete
                                    </div>
                                  </div>
                                )}
                                
                                {/* Status Message */}
                                {packingProgress.message && (
                                  <div className="text-sm text-blue-800 mb-3">
                                    {packingProgress.message}
                                  </div>
                                )}
                                
                                {/* Packed Orders List */}
                                {packingProgress.packedOrdersList && packingProgress.packedOrdersList.length > 0 && (
                                  <div className="mb-3">
                                    <div className="text-xs font-medium text-blue-700 mb-2">Packed Orders:</div>
                                    <div className="space-y-1">
                                      {packingProgress.packedOrdersList.map((order, index) => (
                                        <div key={index} className="flex items-center text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
                                          <CheckCircle className="w-3 h-3 mr-1 text-green-600" />
                                          {order.g_code || order.ean} ({order.order_id})
                                        </div>
                                      ))}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Remaining Orders */}
                                {packingProgress.remainingOrders > 0 && (
                                  <div className="text-xs text-blue-600">
                                    <Clock className="w-3 h-3 inline mr-1" />
                                    {packingProgress.remainingOrders} order(s) remaining
                                  </div>
                                )}
                                
                                {/* Completion Message */}
                                {packingProgress.remainingOrders === 0 && (
                                  <div className="mt-3 p-2 bg-green-100 border border-green-200 rounded-md">
                                    <div className="flex items-center text-xs text-green-800">
                                      <CheckCircle className="w-4 h-4 mr-2" />
                                      <strong>All orders packed! 🎉</strong> Form will reset for next tracking ID.
                                    </div>
                                  </div>
                                )}
                              </div>
                            )}
              
                                          <button
                              onClick={validateAndProcessPackingScan}
                              disabled={scanningLoading || !trackingId.trim() || !gCode.trim()}
                              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base"
                            >
                              {scanningLoading ? (
                                <div className="flex items-center justify-center">
                                  <div className="spinner w-5 h-5 mr-2"></div>
                                  Processing...
                                </div>
                              ) : (
                                <>
                                  <CheckCircle className="w-5 h-5 mr-2" />
                                  Process Packing
                                </>
                              )}
                            </button>
                            
                            {/* Dispatch Pending Button - Only show after successful packing scan */}
                            {packingProgress && packingProgress.progressPercentage === 100 && (
                              <button
                                onClick={handleDispatchPending}
                                disabled={dispatchPendingLoading}
                                className="btn-secondary w-full mt-3 disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base"
                              >
                                {dispatchPendingLoading ? (
                                  <div className="flex items-center justify-center">
                                    <div className="spinner w-5 h-5 mr-2"></div>
                                    Processing...
                                  </div>
                                ) : (
                                  <>
                                    <Clock className="w-5 h-5 mr-2" />
                                    Move to Dispatch Pending
                                  </>
                                  )}
                              </button>
                            )}
                            
                            {/* Workflow Info - Single vs Multi-SKU */}
                            {trackingId.trim() && packingProgress && packingProgress.remainingOrders > 0 && (
                              <div className={`mt-3 p-3 border rounded-md ${packingProgress.totalOrders > 1 ? 'bg-yellow-50 border-yellow-200' : 'bg-blue-50 border-blue-200'}`}>
                                <div className={`text-xs text-center ${packingProgress.totalOrders > 1 ? 'text-yellow-800' : 'text-blue-800'}`}>
                                  {packingProgress.totalOrders > 1 ? (
                                    <>
                                      🔄 <strong>Multi-SKU Mode:</strong> Continue scanning G-Codes until all {packingProgress.totalOrders} orders are packed.
                                      <br />
                                      <span className="text-yellow-700">
                                        {packingProgress.remainingOrders} order(s) remaining for tracking ID: {trackingId}
                                      </span>
                                    </>
                                  ) : (
                                    <>
                                      📦 <strong>Single-SKU Mode:</strong> One order remaining for this tracking ID.
                                      <br />
                                      <span className="text-blue-700">
                                        Form will reset after this G-Code is scanned.
                                      </span>
                                    </>
                                  )}
                                </div>
                              </div>
                            )}
                            
                            {/* Keyboard Shortcuts Help */}
                            {trackingId.trim() && (
                              <div className="mt-3 p-2 bg-gray-50 border border-gray-200 rounded-md">
                                <div className="text-xs text-gray-600 text-center">
                                  <strong>Keyboard Shortcuts:</strong> 
                                  <span className="mx-2">•</span>
                                  <kbd className="bg-gray-200 px-1 py-0.5 rounded text-xs">Esc</kbd> Clear G-Code
                                  <span className="mx-2">•</span>
                                  <kbd className="bg-gray-200 px-1 py-0.5 rounded text-xs">Ctrl+R</kbd> Reset Form
                                </div>
                              </div>
                            )}
            

            </div>
          </div>
        </div>
      )}

      {activeTab === 'pending' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-md mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-orange-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Clock className="w-8 h-8 text-orange-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">Packing Pending</h2>
              <p className="text-sm text-gray-600">
                Scan tracking ID to mark as pending packing
              </p>
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
                  onChange={(e) => setPendingTrackingId(e.target.value.toUpperCase())}
                  onKeyDown={(e) => e.key === 'Enter' && handlePendingScan()}
                  placeholder="Enter tracking ID and press Enter"
                  className="scan-input w-full"
                  autoFocus
                />
              </div>
              
              <button
                onClick={handlePendingScan}
                disabled={pendingLoading || !pendingTrackingId.trim()}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed h-12 text-base"
              >
                {pendingLoading ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  <>
                    <Clock className="w-5 h-5 mr-2" />
                    Mark as Pending
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Replacement Tab Content */}
      {activeTab === 'replacement' && (
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
          <div className="max-w-4xl mx-auto">
            <div className="text-center mb-6">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4">
                <Search className="w-8 h-8 text-green-600" />
              </div>
              <h2 className="text-xl font-semibold text-gray-900 mb-2">
                G-Code/EAN Replacement
              </h2>
              <p className="text-sm text-gray-600">
                Update packed G-Code/EAN for specific SKUs in a tracking ID
              </p>
            </div>
            
              {/* Step 1: Enter Tracking ID */}
            <div className="mb-6">
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-blue-900 mb-3">Step 1: Enter Tracking ID</h3>
                <div className="flex gap-3">
                    <input
                      ref={replacementTrackingIdInputRef}
                      type="text"
                      value={replacementTrackingId}
                      onChange={(e) => setReplacementTrackingId(e.target.value.toUpperCase())}
                    onKeyPress={(e) => e.key === 'Enter' && handleGetSKUs()}
                    placeholder="Enter Tracking ID"
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    disabled={replacementLoading}
                  />
                  <button
                    onClick={handleGetSKUs}
                    disabled={replacementLoading || !replacementTrackingId.trim()}
                    className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
                  >
                    {replacementLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Loading...
                      </>
                    ) : (
                      <>
                        <Search className="w-4 h-4" />
                        Get SKUs
                      </>
                    )}
                  </button>
                </div>
                </div>
              </div>

              {/* Step 2: Select SKU and Update G-Code */}
              {replacementSKUs.length > 0 && (
              <div className="mb-6">
                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <h3 className="text-lg font-medium text-green-900 mb-3">
                    Step 2: Select SKU and Update Packed G-Code/EAN
                  </h3>
                  
                  {/* SKU Selection */}
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select SKU:
                      </label>
                      <select
                        value={selectedSKU}
                      onChange={(e) => {
                        setSelectedSKU(e.target.value);
                        const selectedSkuData = replacementSKUs.find(sku => sku.sku === e.target.value);
                        setNewPackedGCode(selectedSkuData?.current_packed_g_code || '');
                      }}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                    >
                      <option value="">Select a SKU...</option>
                      {replacementSKUs.map((sku) => (
                        <option key={sku.sku} value={sku.sku}>
                          {sku.sku} - Qty: {sku.qty} - Current: {sku.current_packed_g_code || 'None'}
                          </option>
                        ))}
                      </select>
                    </div>
                    
                  {/* New Packed G-Code Input */}
                  <div className="mb-4">
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                      New Packed G-Code/EAN:
                      </label>
                      <input
                        type="text"
                        value={newPackedGCode}
                        onChange={(e) => setNewPackedGCode(e.target.value.toUpperCase())}
                      placeholder="Enter new packed G-Code/EAN"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-green-500 focus:border-transparent"
                      />
                  </div>
                  
                  {/* Update Button */}
                    <button
                      onClick={handleUpdatePackedGCode}
                      disabled={updateLoading || !selectedSKU || !newPackedGCode.trim()}
                    className="w-full px-6 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                    >
                      {updateLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                        Updating...
                      </>
                    ) : (
                      <>
                        <CheckCircle className="w-4 h-4" />
                        Update Packed G-Code
                        </>
                      )}
                    </button>
                  </div>
                </div>
              )}

            {/* SKU Information Table */}
              {replacementSKUs.length > 0 && (
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <h3 className="text-lg font-medium text-gray-900 mb-3">SKU Information</h3>
                  <div className="overflow-x-auto">
                  <table className="min-w-full bg-white border border-gray-200 rounded-lg">
                    <thead className="bg-gray-100">
                        <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            SKU
                          </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            Original G-Code
                          </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            EAN
                          </th>
                        <th className="px-4 py-2 text-center text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            Quantity
                          </th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200">
                            Current Packed G-Code
                          </th>
                        </tr>
                      </thead>
                    <tbody className="divide-y divide-gray-200">
                        {replacementSKUs.map((sku, index) => (
                        <tr key={sku.sku} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                            <td className="px-4 py-3 text-sm font-medium text-gray-900">
                              {sku.sku}
                            </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                              {sku.g_code}
                            </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                              {sku.ean}
                            </td>
                          <td className="px-4 py-3 text-sm text-center text-gray-700">
                              {sku.qty}
                            </td>
                          <td className="px-4 py-3 text-sm text-gray-700">
                            {sku.current_packed_g_code || (
                              <span className="text-gray-400 italic">Not set</span>
                            )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
          </div>
        </div>
      )}
      {/* Courier Summary Section */}
      <div className="mt-8 bg-white rounded-lg shadow border border-gray-200">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-gray-900 flex items-center">
              <Package className="w-6 h-6 mr-2 text-blue-500" />
              Packing Workflow - Courier Summary
            </h3>
            <div className="flex items-center space-x-2">
              <span className="text-sm text-gray-500">
                Packing workflow statistics by courier
              </span>
              <button
                onClick={() => calculatePackingCourierStats()}
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
                    Packing Pending
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                    Multi SKU
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[90px]">
                    Packing Scanned
                  </th>
                  <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                    Cancelled
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {Object.entries(packingCourierStats).length > 0 ? (
                  Object.entries(packingCourierStats).map(([courier, stats], index) => (
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
                        {stats.packingPending}
                      </td>
                      <td className="px-2 py-2 text-xs text-center text-purple-600 font-bold border-r border-gray-200">
                        {stats.multiSku}
                      </td>
                                              <td className="px-2 py-2 text-xs text-center text-orange-600 font-bold">
                          {stats.packingScanned}
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
          {Object.entries(packingCourierStats).length > 0 && (
            <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-lg p-2">
              <div className="grid grid-cols-7 gap-2 text-xs">
                <div className="font-bold text-gray-800">Total:</div>
                <div className="text-center font-bold text-blue-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.total, 0)}
                </div>
                <div className="text-center font-bold text-green-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.singleSku, 0)}
                </div>
                <div className="text-center font-bold text-yellow-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.packingPending, 0)}
                </div>
                <div className="text-center font-bold text-purple-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.multiSku, 0)}
                </div>
                <div className="text-center font-bold text-orange-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.packingScanned, 0)}
                </div>
                <div className="text-center font-bold text-red-700">
                  {Object.values(packingCourierStats).reduce((sum, stats) => sum + stats.cancelled, 0)}
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
            <h3 className="text-xl font-semibold text-gray-900">Scanning Activity Logger</h3>
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
                <p className="text-lg font-medium">No scanning activity yet</p>
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
                📊 Showing {scanLogs.length} recent scans • Auto-clear after 100 logs
              </div>
            )}
          </div>
        )}
      </div>
      </div>

      {/* Performance Stats Sidebar */}
      <div className="w-80 space-y-6">
        {/* Performance Stats */}
        <div className="bg-white rounded-lg shadow p-6 border border-gray-200">
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Multi-SKU</th>
                      </tr>
                    </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.successScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.gCode}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
                        <td className="px-3 py-2 text-sm text-gray-900">
                          {scan.isMultiSku ? 'Yes' : 'No'}
                          </td>
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Error</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                      </tr>
                    </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.errorScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.gCode}</td>
                        <td className="px-3 py-2 text-sm text-red-600">{scan.error}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
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
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Orders</th>
                      <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Response Time</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {scanDetails.multiSkuOrders.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                        <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.gCode}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.totalOrders}</td>
                        <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
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
    </div>
  );
};

export default Packing;
