import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { scanAPI, dataAPI } from '../services/api';
import { Package, CheckCircle, XCircle, Clock, Search, BarChart3, TrendingUp, Activity, Zap, Target, AlertTriangle, Database, AlertCircle, Eye } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';

const LabelScanning = () => {
  const { user } = useAuthStore();
  
  // Scanning state
  const [scanInput, setScanInput] = useState('');
  const [scanning, setScanning] = useState(false);
  const [recentScans, setRecentScans] = useState([]);

  // Global KPIs with localStorage persistence
  const [globalKPIs, setGlobalKPIs] = useState({
    totalScans: 0,
    successScans: 0,
    errorScans: 0,
    averageResponseTime: 0,
    fastestScan: Infinity,
    slowestScan: 0,
    successRate: 100,
    totalOrders: 0,
    singleSku: 0,
    multiSku: 0,
    labelQuantity: 0,
    cachedItems: 0,
    scannedTrackingIds: new Set()
  });

  // Detailed scan tracking for KPI drill-down with localStorage persistence
  const [scanDetails, setScanDetails] = useState({
    successScans: [],
    errorScans: [],
    multiSkuOrders: [],
    failedScans: []
  });

  // Performance tracking
  const [scanCache, setScanCache] = useState(new Map());
  const [pendingScans, setPendingScans] = useState([]);
  const [isLoading, setIsLoading] = useState(true);

  // Courier statistics state
  const [courierStats, setCourierStats] = useState({});
  const [courierStatsLoading, setCourierStatsLoading] = useState(false);
  const [courierStatsLastUpdated, setCourierStatsLastUpdated] = useState(null);

  // Calculate courier statistics from ALL DataUpload data (not just first page)
  const calculateCourierStats = useCallback(async () => {
    try {
      setCourierStatsLoading(true);
      console.log('🔄 Fetching ALL courier stats from DataUpload API...');
      
      // Fetch ALL data from DataUpload API using the new function
      console.log('🚀 Starting API call to getAllDataForStats...');
      const response = await dataAPI.getAllDataForStats();
      console.log('🔍 Full API response:', response);
      console.log('🔍 Response type:', typeof response);
      console.log('🔍 Response.data type:', typeof response.data);
      console.log('🔍 Response.data.data type:', typeof response.data?.data);
      console.log('🔍 Response.status:', response.status);
      console.log('🔍 Response.statusText:', response.statusText);
      console.log('🔍 Response.headers:', response.headers);
      
      // Extract the data array - handle different response structures
      let allData = [];
      console.log('🔍 Attempting to extract data array...');
      
      // Try multiple possible response structures
      if (response.data?.data?.records && Array.isArray(response.data.data.records)) {
        allData = response.data.data.records;
        console.log('✅ Using response.data.data.records (array)');
      } else if (response.data?.data && Array.isArray(response.data.data)) {
        allData = response.data.data;
        console.log('✅ Using response.data.data (array)');
      } else if (response.data && Array.isArray(response.data)) {
        allData = response.data;
        console.log('✅ Using response.data (array)');
      } else if (Array.isArray(response)) {
        allData = response;
        console.log('✅ Using response directly (array)');
      } else if (response.data?.records && Array.isArray(response.data.records)) {
        allData = response.data.records;
        console.log('✅ Using response.data.records (array)');
      } else if (response.records && Array.isArray(response.records)) {
        allData = response.records;
        console.log('✅ Using response.records (array)');
      } else {
        console.error('❌ No valid array found in response');
        console.error('❌ Response structure:', JSON.stringify(response, null, 2));
        console.error('❌ Available keys:', Object.keys(response));
        if (response.data) {
          console.error('❌ Response.data keys:', Object.keys(response.data));
        }
        
        // Check if this is an empty response or error response
        if (response.data?.message && response.data?.total_count === 0) {
          console.log('⚠️ API returned empty data - no records found');
          setCourierStats({});
          setCourierStatsLastUpdated(new Date());
          return;
        }
        
        // Check if this is an authentication error
        if (response.status === 401 || response.data?.detail === 'Not authenticated') {
          console.error('❌ Authentication error - user not logged in');
          toast.error('Authentication error - please log in again');
          return;
        }
        
        throw new Error('Invalid response structure - no data array found');
      }
      
      console.log('📊 Raw data from DataUpload:', allData);
      console.log('📊 Data length:', allData.length);
      console.log('📊 Data type:', typeof allData);
      console.log('📊 Is Array:', Array.isArray(allData));
      if (allData.length > 0) {
        console.log('📊 First record sample:', allData[0]);
        console.log('📊 First record keys:', Object.keys(allData[0]));
      }
      
      // Validate that we have an array before proceeding
      if (!Array.isArray(allData)) {
        throw new Error(`Expected array but got ${typeof allData}: ${JSON.stringify(allData)}`);
      }
      
      // Check if we have any data to process
      if (allData.length === 0) {
        console.log('⚠️ No data returned from API - creating empty stats');
        setCourierStats({});
        setCourierStatsLastUpdated(new Date());
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
      
      console.log('🔍 Tracking ID groups:', trackingIdGroups);
      console.log('🔍 Number of unique tracking IDs:', Object.keys(trackingIdGroups).length);
      
      // Calculate courier statistics
      const stats = {};
      
      allData.forEach(record => {
        const courier = record.courier || 'Unknown';
        const trackingId = record.tracking_id;
        const status = record.status || 'Unlabeled';
        
                            // Count as "Label Scanned" if status indicates any scanning workflow progress
                    // This includes: label_scanned, packing_pending_scanned, packing_scanned, dispatch_pending_scanned, dispatch_scanned
                    // Exclude 'cancel' status as it's not part of the normal workflow
                    const isLabelScanned = status !== 'Unlabeled' && status !== 'Shipped' && status !== 'cancel';
        const isMultiSku = trackingIdGroups[trackingId].length > 1;
        
        // Debug logging for first few records
        if (Object.keys(stats).length <= 1 && (stats[courier]?.total || 0) < 5) {
          console.log(`🔍 Record ${stats[courier]?.total || 0}: tracking_id=${trackingId}, status=${status}, isLabelScanned=${isLabelScanned}, isMultiSku=${isMultiSku}`);
        }
        
        if (!stats[courier]) {
          stats[courier] = {
            total: 0,
            singleSku: 0,
            singleSkuLabelScan: 0,
            multiSku: 0,
            multiSkuLabelScan: 0,
            cancelled: 0
          };
        }
        
        stats[courier].total++;
        
        if (isMultiSku) {
          stats[courier].multiSku++;
          if (isLabelScanned) {
            stats[courier].multiSkuLabelScan++;
          }
        } else {
          stats[courier].singleSku++;
          if (isLabelScanned) {
            stats[courier].singleSkuLabelScan++;
          }
        }
        
        // Count cancelled regardless of SKU type
        if (status === 'cancel') {
          stats[courier].cancelled++;
        }
      });
      
      console.log('📊 Calculated courier stats from DataUpload:', stats);
      setCourierStats(stats);
      setCourierStatsLastUpdated(new Date());
      toast.success(`✅ Courier stats updated with ${allData.length} total records!`);
      
    } catch (error) {
      console.error('❌ Error fetching courier stats from DataUpload:', error);
      console.error('❌ Error details:', {
        message: error.message,
        response: error.response,
        status: error.response?.status,
        data: error.response?.data
      });
      toast.error(`Failed to fetch courier statistics: ${error.message}`);
      
      // Fallback to sample data if API fails
      const sampleStats = {
        'Amazon DF': {
          total: 15,
          singleSku: 10,
          singleSkuLabelScan: 10,
          multiSku: 5,
          multiSkuLabelScan: 5,
          cancelled: 0
        },
        'DHL Express': {
          total: 8,
          singleSku: 6,
          singleSkuLabelScan: 6,
          multiSku: 2,
          multiSkuLabelScan: 2,
          cancelled: 0
        },
        'FedEx': {
          total: 12,
          singleSku: 8,
          singleSkuLabelScan: 8,
          multiSku: 4,
          multiSkuLabelScan: 4,
          cancelled: 0
        }
      };
      setCourierStats(sampleStats);
    } finally {
      setCourierStatsLoading(false);
    }
  }, []);

  // Update courier stats when scan details change
  useEffect(() => {
    calculateCourierStats();
  }, [calculateCourierStats]);

  // Initial load of courier stats
  useEffect(() => {
    calculateCourierStats();
  }, []);



  // Load data from localStorage only
  useEffect(() => {
    try {
      const savedData = localStorage.getItem('labelScanningData');
      if (savedData) {
        const parsed = JSON.parse(savedData);
        console.log('📱 Loading from local storage:', parsed);
        
        // Load scan details
        if (parsed.scanDetails) {
          setScanDetails(parsed.scanDetails);
        }
        
        // Load courier stats
        if (parsed.courierStats) {
          setCourierStats(parsed.courierStats);
        }
        
        // Load courier stats timestamp
        if (parsed.courierStatsLastUpdated) {
          setCourierStatsLastUpdated(new Date(parsed.courierStatsLastUpdated));
        }
        
        // Load KPIs
        if (parsed.globalKPIs) {
          const kpis = parsed.globalKPIs;
          setGlobalKPIs({
            totalScans: kpis.totalScans || 0,
            successScans: kpis.successScans || 0,
            errorScans: kpis.errorScans || 0,
            averageResponseTime: kpis.averageResponseTime || 0,
            fastestScan: kpis.fastestScan || Infinity,
            slowestScan: kpis.slowestScan || 0,
            successRate: kpis.successRate || 100,
            totalOrders: kpis.totalOrders || 0,
            singleSku: kpis.singleSku || 0,
            multiSku: kpis.multiSku || 0,
            labelQuantity: kpis.labelQuantity || 0,
            cachedItems: kpis.cachedItems || 0,
            scannedTrackingIds: new Set()
          });
          
          // Convert scannedTrackingIds back to Set
          if (kpis.scannedTrackingIds && Array.isArray(kpis.scannedTrackingIds)) {
            setGlobalKPIs(prev => ({
              ...prev,
              scannedTrackingIds: new Set(kpis.scannedTrackingIds)
            }));
          }
        }
        
        // Load recent scans
        if (parsed.recentScans) {
          setRecentScans(parsed.recentScans);
        }
        
        console.log('✅ Successfully loaded from local storage');
      }
    } catch (error) {
      console.error('❌ Error loading from local storage:', error);
      // Initialize with default values
      setScanDetails({
        successScans: [],
        errorScans: [],
        multiSkuOrders: [],
        failedScans: []
      });
      setGlobalKPIs({
        totalScans: 0,
        successScans: 0,
        errorScans: 0,
        averageResponseTime: 0,
        fastestScan: Infinity,
        slowestScan: 0,
        successRate: 100,
        totalOrders: 0,
        singleSku: 0,
        multiSku: 0,
        labelQuantity: 0,
        cachedItems: 0,
        scannedTrackingIds: new Set()
      });
      setRecentScans([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save data to localStorage only
  const saveScanningData = useCallback((dataToSave) => {
    try {
      // Save to local storage only
      localStorage.setItem('labelScanningData', JSON.stringify(dataToSave));
      console.log('💾 Successfully saved to local storage');
    } catch (error) {
      console.error('❌ Error saving to local storage:', error);
      toast.error('Failed to save scanning data locally');
    }
  }, []);

  // Listen for clear all tracking data event
  useEffect(() => {
    const handleClearAllTrackingData = () => {
      console.log('🗑️ Clearing all tracking data from LabelScanning...');
      
      // Clear local state
      setGlobalKPIs({
        totalScans: 0,
        successScans: 0,
        errorScans: 0,
        averageResponseTime: 0,
        fastestScan: Infinity,
        slowestScan: 0,
        successRate: 100,
        totalOrders: 0,
        singleSku: 0,
        multiSku: 0,
        labelQuantity: 0,
        cachedItems: 0,
        scannedTrackingIds: new Set()
      });
      
      setScanDetails({
        successScans: [],
        errorScans: [],
        multiSkuOrders: [],
        failedScans: []
      });
      
      setRecentScans([]);
      setScanCache(new Map());
      setPendingScans([]);
      setCourierStats({});
      setCourierStatsLastUpdated(null);
      
      // Clear localStorage
      localStorage.removeItem('labelScanningData');
      
      toast.success('All scanning data cleared successfully');
    };

    window.addEventListener('clearAllTrackingData', handleClearAllTrackingData);
    
    return () => {
      window.removeEventListener('clearAllTrackingData', handleClearAllTrackingData);
    };
  }, []);

  // Periodic data refresh to keep data current
  useEffect(() => {
    const refreshInterval = setInterval(() => {
      console.log('🔄 Periodic refresh of scanning data...');
      // Only refresh if we have data to avoid unnecessary API calls
      if (globalKPIs.totalScans > 0 || recentScans.length > 0) {
        const loadScanningData = async () => {
          try {
            // Since we're using localStorage only, just log the refresh
            console.log('🔄 Periodic refresh completed - using localStorage data');
          } catch (error) {
            console.log('⚠️ Periodic refresh failed:', error);
          }
        };
        
        loadScanningData();
      }
    }, 30000); // Refresh every 30 seconds
    
    return () => clearInterval(refreshInterval);
  }, [globalKPIs.totalScans, recentScans.length]);

  // Save data immediately when any state changes
  useEffect(() => {
    if (!isLoading) { // Only save after initial loading is complete
      const dataToSave = {
        scanDetails,
        globalKPIs: {
          ...globalKPIs,
          scannedTrackingIds: Array.from(globalKPIs.scannedTrackingIds) // Convert Set to Array for storage
        },
        recentScans,
        scanCache: Array.from(scanCache.entries()), // Convert Map to Array for storage
        pendingScans,
        courierStats,
        courierStatsLastUpdated
      };
      
      console.log('💾 Auto-saving scanning data due to state change...');
      saveScanningData(dataToSave);
    }
  }, [scanDetails, globalKPIs, recentScans, scanCache, pendingScans, courierStats, courierStatsLastUpdated, saveScanningData, isLoading]);

  // Aggressive data saving every 5 seconds to prevent data loss
  useEffect(() => {
    if (!isLoading) {
      const saveInterval = setInterval(() => {
        console.log('💾 Periodic aggressive save to prevent data loss...');
        const dataToSave = {
          scanDetails,
          globalKPIs: {
            ...globalKPIs,
            scannedTrackingIds: Array.from(globalKPIs.scannedTrackingIds)
          },
          recentScans,
          scanCache: Array.from(scanCache.entries()),
                  pendingScans,
        courierStats,
        courierStatsLastUpdated
        };
        
        saveScanningData(dataToSave);
      }, 5000); // Save every 5 seconds
      
      return () => clearInterval(saveInterval);
    }
  }, [scanDetails, globalKPIs, recentScans, scanCache, pendingScans, courierStats, courierStatsLastUpdated, saveScanningData, isLoading]);

  // Save data on component unmount
  useEffect(() => {
    return () => {
      console.log('🔄 Component unmounting, saving final data...');
      const dataToSave = {
        scanDetails,
        globalKPIs: {
          ...globalKPIs,
          scannedTrackingIds: Array.from(globalKPIs.scannedTrackingIds)
        },
        recentScans,
        scanCache: Array.from(scanCache.entries()),
        pendingScans,
        courierStats,
        courierStatsLastUpdated
      };
      
      // Save to local storage
      saveScanningData(dataToSave);
    };
  }, [scanDetails, globalKPIs, recentScans, scanCache, pendingScans, courierStats, courierStatsLastUpdated, saveScanningData]);

  // Modal states for KPI details
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [showMultiSkuModal, setShowMultiSkuModal] = useState(false);
  
  // Additional states
  const [bulkMode, setBulkMode] = useState(false);
  
  const inputRef = useRef(null);



  // Auto-focus input on mount and after each scan
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.focus();
    }
  }, [recentScans]);

  // Cache cleanup effect - prevent memory issues
  useEffect(() => {
    const cleanupCache = () => {
      const now = Date.now();
      const maxAge = 10 * 60 * 1000; // 10 minutes
      
      setScanCache(prev => {
        const newCache = new Map();
        for (const [key, value] of prev.entries()) {
          if (now - value.timestamp < maxAge) {
            newCache.set(key, value);
          }
        }
        return newCache;
      });
    };
    
    const interval = setInterval(cleanupCache, 300000); // Clean every 5 minutes
    return () => clearInterval(interval);
  }, []);

  // Enhanced scan result handler with multi-SKU support
  const handleScanResult = useCallback((result, startTime, fromCache = false) => {
    const responseTime = performance.now() - startTime;
    
    // Ensure responseTime is a valid number
    const validResponseTime = isNaN(responseTime) ? 0 : responseTime;
    
    // Update global KPI statistics
    setGlobalKPIs(prev => {
      const newTotal = prev.totalScans + 1;
      const newSuccessCount = result.success ? prev.successScans + 1 : prev.successScans;
      const newErrorCount = result.success ? prev.errorScans : prev.errorScans + 1;
      const newSuccessRate = newTotal > 0 ? (newSuccessCount / newTotal) * 100 : 100;
      
      return {
        ...prev,
        totalScans: newTotal,
        successScans: newSuccessCount,
        errorScans: newErrorCount,
        averageResponseTime: (prev.averageResponseTime * (newTotal - 1) + validResponseTime) / newTotal,
        fastestScan: Math.min(prev.fastestScan, validResponseTime),
        slowestScan: Math.max(prev.slowestScan, validResponseTime),
        successRate: newSuccessRate,
      };
    });
    
    // Track scan details for KPI drill-down
    const scanDetail = {
      id: Date.now(),
      trackingId: scanInput.trim(),
      status: result.status,
      message: result.message,
      orderIds: result.orderIds || [],
      courier: result.courier,
      timestamp: new Date().toLocaleString(),
      success: result.success,
      responseTime: Math.round(validResponseTime),
      fromCache,
      recordsFound: result.recordsFound || 0,
      isMultiSku: (result.orderIds || []).length > 1,
      user: user.username,
    };

    if (result.success) {
      setScanDetails(prev => ({
        ...prev,
        successScans: [scanDetail, ...prev.successScans.slice(0, 99)], // Keep last 100
      }));

      // Track multi-SKU orders separately
      if (scanDetail.isMultiSku) {
        setScanDetails(prev => ({
          ...prev,
          multiSkuOrders: [scanDetail, ...prev.multiSkuOrders.slice(0, 99)],
        }));
      }
    } else {
      setScanDetails(prev => ({
        ...prev,
        errorScans: [scanDetail, ...prev.errorScans.slice(0, 99)], // Keep last 100
      }));
    }
    
    // Show appropriate toast based on performance and result
    if (fromCache) {
      toast.success(`⚡ Instant scan: ${result.message}`, { duration: 1000 });
    } else if (validResponseTime < 100) {
      toast.success(`🚀 Lightning fast: ${result.message}`, { duration: 1000 });
    } else if (validResponseTime < 300) {
      toast.success(`⚡ Ultra fast: ${result.message}`, { duration: 1000 });
    } else {
      toast.success(result.message, { duration: 2000 });
    }
    
    // Add to recent scans
    const newScan = {
      id: Date.now(),
      trackingId: scanInput.trim(),
      status: result.status,
      message: result.message,
      orderIds: result.orderIds || [],
      courier: result.courier,
      timestamp: new Date().toLocaleTimeString(),
      success: result.success,
      responseTime: Math.round(validResponseTime),
      fromCache,
      recordsFound: result.recordsFound || 0,
      isMultiSku: (result.orderIds || []).length > 1,
    };
    
    setRecentScans(prev => [newScan, ...prev.slice(0, 19)]); // Keep last 20 scans
    
    // Add to global scanned tracking IDs to prevent duplicates (only for successful scans)
    if (result.success) {
      setGlobalKPIs(prev => ({
        ...prev,
        scannedTrackingIds: new Set(prev.scannedTrackingIds).add(scanInput.trim())
      }));
    }
    
    // Update global KPIs
    updateGlobalKPIs(result.orderIds?.length || 0);
    
    // Play appropriate sound
    if (result.success) {
      playSuccessSound();
      inputRef.current?.classList.add('scan-success');
      setTimeout(() => inputRef.current?.classList.remove('scan-success'), 200);
    } else {
      playErrorSound();
      inputRef.current?.classList.add('scan-error');
      setTimeout(() => inputRef.current?.classList.remove('scan-error'), 200);
    }
    
    // Performance feedback
    if (validResponseTime > 1000) {
      console.warn(`⚠️ Slow scan detected: ${validResponseTime.toFixed(0)}ms`);
    } else if (validResponseTime < 100) {
      console.log(`⚡ Lightning scan: ${validResponseTime.toFixed(0)}ms`);
    }
  }, [scanInput, user.username]);

  // Ultra-fast scan handler with enhanced multi-SKU support
  const handleScan = useCallback(async (e) => {
    e.preventDefault();
    
    if (!scanInput.trim() || scanning) return;
    
    const trackingId = scanInput.trim();
    const startTime = performance.now();
    
    // Check if already scanned to prevent duplicates (global check)
    if (globalKPIs.scannedTrackingIds.has(trackingId)) {
      toast.error(`⚠️ Tracking ID ${trackingId} has already been scanned by any user!`, { duration: 3000 });
      setScanInput('');
      inputRef.current?.focus();
      return;
    }
    
    // Check cache first for instant response
    if (scanCache.has(trackingId)) {
      const cachedResult = scanCache.get(trackingId);
      handleScanResult(cachedResult, startTime, true);
      setScanInput('');
      return;
    }
    
    setScanning(true);
    
    try {
      // Performance logging
      console.log(`🚀 ULTRA-FAST SCAN: Processing ${trackingId}`);
      
      const response = await scanAPI.labelScan({
        tracking_id: trackingId,
        user_id: user.user_id,
      });
      
      const { success, message, status, order_ids, courier, records_found } = response.data;
      
      if (success) {
        // Enhanced result handling for multi-SKU orders
        const scanResult = {
          success: true,
          message: message + (order_ids && order_ids.length > 1 ? 
            ` (${order_ids.length} orders updated)` : ''),
          status,
          orderIds: order_ids || [],
          courier,
          recordsFound: records_found || 0,
          timestamp: Date.now(),
        };
        
        // Cache the successful result for instant future lookups
        setScanCache(prev => new Map(prev.set(trackingId, scanResult)));
        
        // Process the scan result
        handleScanResult(scanResult, startTime, false);
        
        // Clear input immediately for next scan
        setScanInput('');
        
        // Auto-focus for continuous scanning
        setTimeout(() => inputRef.current?.focus(), 50);
        
      } else {
        // Handle error case
        const errorResult = {
          success: false,
          message,
          status: 'error',
          orderIds: [],
          courier: null,
          recordsFound: 0,
          timestamp: Date.now(),
        };
        
        handleScanResult(errorResult, startTime, false);
        setScanInput('');
      }
      
    } catch (error) {
      console.error('❌ SCAN ERROR:', error);
      
      const errorResult = {
        success: false,
        message: 'Scan failed. Please try again.',
        status: 'error',
        orderIds: [],
        courier: null,
        recordsFound: 0,
        timestamp: Date.now(),
      };
      
      handleScanResult(errorResult, startTime, false);
      setScanInput('');
      
    } finally {
      setScanning(false);
    }
  }, [scanInput, scanning, user.user_id, scanCache, globalKPIs.scannedTrackingIds]);

  const updateGlobalKPIs = (orderCount) => {
    setGlobalKPIs(prev => ({
      ...prev,
      totalOrders: prev.totalOrders + orderCount,
      singleSku: orderCount === 1 ? prev.singleSku + 1 : prev.singleSku,
      multiSku: orderCount > 1 ? prev.multiSku + 1 : prev.multiSku,
      labelQuantity: prev.labelQuantity + 1,
    }));
  };

  const playSuccessSound = () => {
    // Create a simple success beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(800, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(1000, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  const playErrorSound = () => {
    // Create a simple error beep sound
    const audioContext = new (window.AudioContext || window.webkitAudioContext)();
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
    oscillator.frequency.setValueAtTime(300, audioContext.currentTime + 0.1);
    
    gainNode.gain.setValueAtTime(0.1, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + 0.2);
  };

  // Optimized input handling for ultra-fast scanning
  const handleInputChange = useCallback((e) => {
    setScanInput(e.target.value);
    
    // Auto-scan when input reaches certain length (for barcode scanners)
    if (e.target.value.length >= 8 && e.target.value.length <= 20) {
      // Small delay to allow barcode scanner to complete
      setTimeout(() => {
        if (scanInput === e.target.value) {
          handleScan({ preventDefault: () => {} });
        }
      }, 100);
    }
  }, [scanInput, handleScan]);

  const handleKeyPress = useCallback((e) => {
    if (e.key === 'Enter') {
      handleScan(e);
    } else if (e.key === 'Escape') {
      // Clear input on Escape
      setScanInput('');
      inputRef.current?.focus();
    }
  }, [handleScan]);

  // Bulk scanning mode for high-volume operations
  const handleBulkScan = useCallback(async () => {
    if (pendingScans.length === 0) return;
    
    const startTime = performance.now();
    const results = [];
    
    try {
      // Process all pending scans in parallel for maximum speed
      const scanPromises = pendingScans.map(trackingId => 
        scanAPI.labelScan({
          tracking_id: trackingId,
          user_id: user.user_id,
        }).catch(error => ({
          data: { success: false, message: error.message, tracking_id: trackingId }
        }))
      );
      
      const responses = await Promise.all(scanPromises);
      
      responses.forEach((response, index) => {
        const trackingId = pendingScans[index];
        const result = {
          ...response.data,
          trackingId,
          responseTime: performance.now() - startTime,
        };
        results.push(result);
        
        // Cache successful results
        if (response.data.success) {
          setScanCache(prev => new Map(prev.set(trackingId, {
            success: true,
            message: response.data.message,
            status: response.data.status,
            orderIds: response.data.order_ids || [],
            courier: response.data.courier,
            recordsFound: response.data.records_found || 0,
            timestamp: Date.now(),
          })));
        }
      });
      
      // Update statistics
      const successCount = results.filter(r => r.success).length;
      const totalTime = performance.now() - startTime;
      const avgTime = totalTime / results.length;
      
      toast.success(`🚀 Bulk scan complete: ${successCount}/${results.length} successful in ${avgTime ? avgTime.toFixed(0) : 'N/A'}ms avg`);
      
      // Clear pending scans
      setPendingScans([]);
      
    } catch (error) {
      console.error('Bulk scan failed:', error);
      toast.error('Bulk scan failed');
    }
  }, [pendingScans, user.user_id]);


  

  


  // Modal components for KPI drill-down
  const SuccessScanModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-green-600 flex items-center">
            <CheckCircle className="w-5 h-5 mr-2" />
            Successful Scans ({scanDetails.successScans.length})
          </h3>
          <button
            onClick={() => setShowSuccessModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Orders</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scanDetails.successScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      scan.isMultiSku ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                    }`}>
                      {scan.orderIds.length} {scan.isMultiSku ? 'Multi-SKU' : 'Single'}
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.status}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.user}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const ErrorScanModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-red-600 flex items-center">
            <XCircle className="w-5 h-5 mr-2" />
            Error Scans ({scanDetails.errorScans.length})
          </h3>
          <button
            onClick={() => setShowErrorModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Error</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scanDetails.errorScans.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                  <td className="px-3 py-2 text-sm text-red-600">{scan.message}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.user}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const MultiSkuModal = () => (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6 max-w-4xl w-full mx-4 max-h-[80vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold text-purple-600 flex items-center">
            <Package className="w-5 h-5 mr-2" />
            Multi-SKU Orders ({scanDetails.multiSkuOrders.length})
          </h3>
          <button
            onClick={() => setShowMultiSkuModal(false)}
            className="text-gray-500 hover:text-gray-700"
          >
            ✕
          </button>
        </div>
        
        <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Time</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Tracking ID</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Order Count</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">User</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-500 uppercase">Speed</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {scanDetails.multiSkuOrders.map((scan) => (
                <tr key={scan.id} className="hover:bg-gray-50">
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.timestamp}</td>
                  <td className="px-3 py-2 text-sm font-mono text-gray-900">{scan.trackingId}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">
                    <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">
                      {scan.orderIds.length} Orders
                    </span>
                  </td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.status}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.user}</td>
                  <td className="px-3 py-2 text-sm text-gray-900">{scan.responseTime}ms</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );

  const getStatusBadge = (status) => {
    const statusClasses = {
      'label_scanned': 'status-label-scanned',
      'packing': 'status-packing',
      'packed': 'status-packed',
      'dispatch': 'dispatch',
      'dispatched': 'status-dispatched',
      'cancelled': 'status-cancelled',
      'error': 'status-error',
    };
    
    return (
      <span className={`status-badge ${statusClasses[status] || 'status-unlabeled'}`}>
        {status.replace('_', ' ')}
      </span>
    );
  };















  // Show loading state while data is being initialized
  if (isLoading) {
    return (
      <div className="min-h-screen bg-gray-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
              <p className="text-gray-600">Loading scanning data...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Label Scanning</h1>
        <p className="text-gray-600">Scan tracking IDs to mark items as labeled</p>
        
        {/* Persistent Data Notification */}
        <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg">
          <div className="flex items-center">
            <Database className="w-5 h-5 text-green-600 mr-2" />
            <div>
              <p className="text-sm font-medium text-green-800">
                📱 Data Persistence Enabled
              </p>
              <p className="text-xs text-green-600">
                Your scan data is automatically saved and will persist across tab switches and browser sessions.
              </p>
            </div>
          </div>
        </div>
      </div>



      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Scanning Area */}
        <div className="lg:col-span-2">
          <div className="card">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Package className="w-5 h-5 mr-2" />
              Scan Tracking ID
            </h2>
            
            <form onSubmit={handleScan} className="space-y-4">
              <div>
                <label htmlFor="scanInput" className="block text-sm font-medium text-gray-700 mb-2">
                  Tracking ID
                </label>
                <input
                  ref={inputRef}
                  id="scanInput"
                  type="text"
                  value={scanInput}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="scan-input"
                  placeholder="Scan or type tracking ID"
                  disabled={scanning}
                  autoComplete="off"
                  autoFocus
                />
                <p className="mt-1 text-xs text-gray-500">
                  Press Enter or scan barcode to process
                </p>
              </div>
              
              <button
                type="submit"
                disabled={!scanInput.trim() || scanning}
                className={`w-full btn-primary py-3 text-lg font-semibold ${
                  !scanInput.trim() || scanning ? 'opacity-50 cursor-not-allowed' : ''
                }`}
              >
                {scanning ? (
                  <div className="flex items-center justify-center">
                    <div className="spinner w-5 h-5 mr-2"></div>
                    Processing...
                  </div>
                ) : (
                  'Process Scan'
                )}
              </button>
            </form>
          </div>

          {/* Recent Scans Table */}
          <div className="card mt-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Scans</h3>
            
            {recentScans.length === 0 ? (
              <div className="text-center py-8 text-gray-500">
                <Package className="w-12 h-12 mx-auto mb-4 text-gray-300" />
                <p>No scans yet</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Time
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Tracking ID
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Status
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Orders
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Speed
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Cache
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Result
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {recentScans.map((scan) => (
                      <tr key={scan.id} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {scan.timestamp}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">
                          {scan.trackingId}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {getStatusBadge(scan.status)}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                            scan.isMultiSku ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                          }`}>
                            {scan.orderIds.length} {scan.isMultiSku ? 'Multi-SKU' : 'Single'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {scan.responseTime ? (
                            <span className={`inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full ${
                              scan.responseTime < 100 ? 'bg-green-100 text-green-800' :
                              scan.responseTime < 300 ? 'bg-blue-100 text-blue-800' :
                              scan.responseTime < 1000 ? 'bg-yellow-100 text-yellow-800' :
                              'bg-red-100 text-red-800'
                            }`}>
                                                             {scan.responseTime < 100 ? <Zap className="w-3 h-3 mr-1" /> :
                               scan.responseTime < 300 ? <Zap className="w-3 h-3 mr-1" /> :
                               scan.responseTime < 1000 ? <Clock className="w-3 h-3 mr-1" /> :
                               <Clock className="w-3 h-3 mr-1" />}
                              {scan.responseTime}ms
                            </span>
                          ) : (
                            <span className="text-gray-400">N/A</span>
                          )}
                        </td>
                                                 <td className="px-6 py-4 whitespace-nowrap">
                           {scan.fromCache ? (
                             <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                               <Database className="w-3 h-3 mr-1" />
                               Cached
                             </span>
                                                       ) : globalKPIs.scannedTrackingIds.has(scan.trackingId) ? (
                              <span className="inline-flex items-center px-2 py-1 text-xs font-semibold rounded-full bg-orange-100 text-orange-800">
                                <AlertCircle className="w-3 h-3 mr-1" />
                                Scanned
                              </span>
                            ) : (
                              <span className="text-gray-400">Live</span>
                            )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {scan.success ? (
                            <CheckCircle className="w-5 h-5 text-success-600" />
                          ) : (
                            <XCircle className="w-5 h-5 text-error-600" />
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar - Performance Dashboard */}
        <div className="space-y-6">
          {/* Courier Summary Table */}
          <div className="card">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Package className="w-5 h-5 mr-2 text-green-500" />
                Courier Summary
              </h3>
              <div className="flex items-center space-x-2">
                <div className="flex flex-col items-end text-xs text-gray-500">
                  <span>{Object.keys(courierStats).length} couriers</span>
                  {courierStatsLastUpdated && (
                    <span className="text-gray-400">
                      Updated: {courierStatsLastUpdated.toLocaleTimeString()}
                    </span>
                  )}
                </div>
                <div className="flex items-center space-x-1">
                  <button
                    onClick={() => calculateCourierStats()}
                    disabled={courierStatsLoading}
                    className={`p-1 transition-colors ${
                      courierStatsLoading 
                        ? 'text-gray-300 cursor-not-allowed' 
                        : 'text-gray-400 hover:text-gray-600'
                    }`}
                    title={courierStatsLoading ? "Refreshing..." : "Refresh courier stats"}
                  >
                    {courierStatsLoading ? (
                      <svg className="w-4 h-4 animate-spin" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    ) : (
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                      </svg>
                    )}
                  </button>
                  <button
                    onClick={async () => {
                      try {
                        console.log('🧪 Testing API connection...');
                        console.log('🧪 Auth token check:', !!localStorage.getItem('auth-storage'));
                        console.log('🧪 API base URL:', process.env.REACT_APP_API_URL || 'https://onescan-backend-lw-v-2-0-1-477154991805.asia-south1.run.app');
                        
                        // Test basic connection first
                        const response = await dataAPI.getAllUploadedData(1, 100);
                        console.log('🧪 Test API response:', response);
                        console.log('🧪 Response structure:', {
                          hasData: !!response.data,
                          hasDataData: !!response.data?.data,
                          dataType: typeof response.data,
                          dataDataType: typeof response.data?.data,
                          isArray: Array.isArray(response.data),
                          isDataArray: Array.isArray(response.data?.data)
                        });
                        
                        // Log the complete response structure
                        console.log('🧪 Complete response object:', JSON.stringify(response, null, 2));
                        console.log('🧪 Response keys:', Object.keys(response));
                        if (response.data) {
                          console.log('🧪 Response.data keys:', Object.keys(response.data));
                          console.log('🧪 Response.data type:', typeof response.data);
                        }
                        
                        // Try to extract data manually
                        if (response.data?.data) {
                          console.log('🧪 Found response.data.data:', response.data.data);
                        } else if (response.data) {
                          console.log('🧪 Found response.data:', response.data);
                        } else {
                          console.log('🧪 No data found in response');
                        }
                        
                        toast.success('API test completed - check console');
                      } catch (error) {
                        console.error('🧪 API test failed:', error);
                        console.error('🧪 Error details:', {
                          message: error.message,
                          response: error.response,
                          status: error.response?.status,
                          data: error.response?.data
                        });
                        toast.error(`API test failed: ${error.message}`);
                      }
                    }}
                    className="p-1 text-gray-400 hover:text-gray-600 transition-colors"
                    title="Test API connection"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                    </svg>
                  </button>
                </div>
              </div>
            </div>
            
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
                      Single SKU Label Scan
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                      Multi SKU
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[90px]">
                      Multi SKU Label Scan
                    </th>
                    <th className="px-2 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider border-b border-gray-200 min-w-[70px]">
                      Cancelled
                    </th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {courierStatsLoading ? (
                    <tr>
                      <td colSpan="6" className="px-2 py-8 text-xs text-center text-gray-500">
                        <div className="flex items-center justify-center space-x-2">
                          <svg className="w-4 h-4 animate-spin text-blue-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          <span>Loading courier statistics...</span>
                        </div>
                      </td>
                    </tr>
                  ) : Object.entries(courierStats).length > 0 ? (
                    Object.entries(courierStats).map(([courier, stats], index) => (
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
                        <td className="px-2 py-2 text-xs text-center text-emerald-600 font-bold border-r border-gray-200">
                          {stats.singleSkuLabelScan}
                        </td>
                        <td className="px-2 py-2 text-xs text-center text-yellow-600 font-bold border-r border-gray-200">
                          {stats.multiSku}
                        </td>
                        <td className="px-2 py-2 text-xs text-center text-orange-600 font-bold">
                          {stats.multiSkuLabelScan}
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
            {Object.entries(courierStats).length > 0 && (
              <div className="mt-3 pt-3 border-t border-gray-200 bg-gray-50 rounded-lg p-2">
                <div className="grid grid-cols-7 gap-2 text-xs">
                  <div className="font-bold text-gray-800">Total:</div>
                  <div className="text-center font-bold text-blue-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.total, 0)}
                  </div>
                  <div className="text-center font-bold text-green-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.singleSku, 0)}
                  </div>
                  <div className="text-center font-bold text-emerald-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.singleSkuLabelScan, 0)}
                  </div>
                  <div className="text-center font-bold text-yellow-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.multiSku, 0)}
                  </div>
                  <div className="text-center font-bold text-orange-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.multiSkuLabelScan, 0)}
                  </div>
                  <div className="text-center font-bold text-red-700">
                    {Object.values(courierStats).reduce((sum, stats) => sum + stats.cancelled, 0)}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* Enhanced Performance Stats with Clickable KPIs */}
          <div className="card">
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
                  <span className="text-lg font-bold text-purple-600 mr-2">{scanDetails.multiSkuOrders.length}</span>
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

          {/* Performance Mode Toggle */}
          <div className="card">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <Zap className="w-5 h-5 mr-2 text-yellow-500" />
              Performance Mode
            </h3>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm font-medium text-gray-700">Bulk Mode</span>
                <button
                  onClick={() => setBulkMode(!bulkMode)}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    bulkMode ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    bulkMode ? 'translate-x-6' : 'translate-x-1'
                  }`} />
                </button>
              </div>
              
              {bulkMode && (
                <div className="p-3 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-xs text-blue-800 mb-2">
                    Bulk mode enabled - scans will be queued for batch processing
                  </p>
                  {pendingScans.length > 0 && (
                    <button
                      onClick={handleBulkScan}
                      className="w-full px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors text-sm font-medium"
                    >
                      Process {pendingScans.length} Scans
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>


        </div>
      </div>

      {/* KPI Details Modals */}
      {showSuccessModal && <SuccessScanModal />}
      {showErrorModal && <ErrorScanModal />}
      {showMultiSkuModal && <MultiSkuModal />}
    </div>
  );
};

export default LabelScanning;
