import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { dataAPI } from '../services/api';
import { toast } from 'react-hot-toast';
import { 
  Upload, 
  Search, 
  Filter, 
  RefreshCw, 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Database,
  BarChart3,
  FileText,
  Settings,
  Trash2,
  Download,
  Eye,
  EyeOff,
  Table
} from 'lucide-react';
import DataDisplayTable from '../components/DataDisplayTable';

const DataUpload = () => {
  // Core state
  const [dataRecords, setDataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(100);
  const [totalPages, setTotalPages] = useState(0);
  const [totalCount, setTotalCount] = useState(0);
  
  // Filters state
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [courierFilter, setCourierFilter] = useState('');
  const [channelFilter, setChannelFilter] = useState('');
  
  // Cache state
  const [cache, setCache] = useState(new Map());
  const [cacheTimestamps, setCacheTimestamps] = useState(new Map());
  const [isCacheEnabled, setIsCacheEnabled] = useState(true);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showStats, setShowStats] = useState(true);
  const [showDataDisplay, setShowDataDisplay] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadHistory, setUploadHistory] = useState([]);
  const [uploadHistoryLoading, setUploadHistoryLoading] = useState(false);
  
  // Performance state
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [hasMoreData, setHasMoreData] = useState(true);
  const [lastFetchTime, setLastFetchTime] = useState(0);
  
  // Refs
  const fileInputRef = useRef();
  const tableRef = useRef();
  const searchInputRef = useRef();
  
  // Cache configuration
  const CACHE_DURATION = 10 * 60 * 1000; // 10 minutes
  const DEBOUNCE_DELAY = 300; // 300ms for search
  const PRELOAD_THRESHOLD = 0.8; // Preload when 80% through current page
  
  // Memoized values
  const cacheKey = useMemo(() => 
    `data_${currentPage}_${pageSize}_${searchTerm}_${statusFilter}_${courierFilter}_${channelFilter}`,
    [currentPage, pageSize, searchTerm, statusFilter, courierFilter, channelFilter]
  );
  
  const isCacheValid = useCallback((key) => {
    if (!isCacheEnabled) return false;
    const timestamp = cacheTimestamps.get(key);
    if (!timestamp) return false;
    return Date.now() - timestamp < CACHE_DURATION;
  }, [isCacheEnabled, cacheTimestamps]);
  
  const getCachedData = useCallback((key) => {
    return cache.get(key);
  }, [cache]);
  
  const setCachedData = useCallback((key, data) => {
    if (!data || data.records?.length === 0) return;
    
    setCache(prev => new Map(prev).set(key, data));
    setCacheTimestamps(prev => new Map(prev).set(key, Date.now()));
    
    // Cleanup old cache entries
    const now = Date.now();
    const newCache = new Map();
    const newTimestamps = new Map();
    
    cache.forEach((value, key) => {
      const timestamp = cacheTimestamps.get(key);
      if (timestamp && now - timestamp < CACHE_DURATION) {
        newCache.set(key, value);
        newTimestamps.set(key, timestamp);
      }
    });
    
    setCache(newCache);
    setCacheTimestamps(newTimestamps);
  }, [cache, cacheTimestamps]);
  
  // Load data with intelligent caching
  const loadDataRecords = useCallback(async (page = 1, size = pageSize, forceRefresh = false) => {
    const key = `data_${page}_${size}_${searchTerm}_${statusFilter}_${courierFilter}_${channelFilter}`;
    
    // Check cache first
    if (!forceRefresh && isCacheValid(key)) {
      const cachedData = getCachedData(key);
      if (cachedData) {
        console.log('🚀 Using cached data for:', key);
        setDataRecords(cachedData.records || []);
        setCurrentPage(cachedData.page || 1);
        setTotalPages(cachedData.total_pages || 1);
        setTotalCount(cachedData.total_count || 0);
        setHasMoreData(cachedData.has_next_page || false);
        setLastFetchTime(Date.now());
        return;
      }
    }
    
    try {
    setLoading(true);
      setError(null);
      
      console.log('🔍 Fetching fresh data for:', key);
      
      let response;
      if (searchTerm || statusFilter || courierFilter || channelFilter) {
        response = await dataAPI.searchAllData(
          searchTerm, 
          statusFilter, 
          courierFilter, 
          page, 
          size
        );
      } else {
        response = await dataAPI.getAllUploadedData(page, size);
      }
      
      if (response.data?.ok && response.data?.data) {
        const data = response.data.data;
        
        setDataRecords(data.records || []);
        setCurrentPage(data.page || 1);
        setTotalPages(data.total_pages || 1);
        setTotalCount(data.total_count || 0);
        setHasMoreData(data.has_next_page || false);
        setLastFetchTime(Date.now());
        
        // Cache the successful response
        setCachedData(key, data);
        
        console.log('✅ Data loaded successfully:', {
          records: data.records?.length || 0,
          page: data.page,
          totalPages: data.total_pages,
          totalCount: data.total_count
        });
      } else {
        throw new Error(response.data?.message || 'Failed to load data');
      }
    } catch (error) {
      console.error('❌ Error loading data:', error);
      setError(error.message || 'Failed to load data');
      setDataRecords([]);
    } finally {
      setLoading(false);
    }
  }, [searchTerm, statusFilter, courierFilter, channelFilter, pageSize, isCacheValid, getCachedData, setCachedData]);
  
  // Load global statistics
  const loadGlobalStatistics = useCallback(async () => {
    try {
      const response = await dataAPI.getGlobalStatistics();
      if (response.data?.ok && response.data?.data) {
        setTotalCount(response.data.data.total_count || 0);
      }
    } catch (error) {
      console.error('Failed to load global statistics:', error);
    }
  }, []);
  
  // Load upload history
  const loadUploadHistory = useCallback(async () => {
    try {
      setUploadHistoryLoading(true);
      const response = await dataAPI.getUploadHistory();
      if (response.data?.ok && response.data?.data?.uploads) {
        setUploadHistory(response.data.data.uploads);
      }
    } catch (error) {
      console.error('Failed to load upload history:', error);
    } finally {
      setUploadHistoryLoading(false);
    }
  }, []);
  
  // Debounced search
  const debouncedSearch = useCallback(
    (() => {
      let timeoutId;
      return (searchValue, statusValue, courierValue, channelValue) => {
        clearTimeout(timeoutId);
        timeoutId = setTimeout(() => {
          setSearchTerm(searchValue);
          setStatusFilter(statusValue);
          setCourierFilter(courierValue);
          setChannelFilter(channelValue);
          setCurrentPage(1);
          loadDataRecords(1, pageSize, true);
        }, DEBOUNCE_DELAY);
      };
    })(),
    [loadDataRecords, pageSize]
  );
  
  // Handle search input
  const handleSearchChange = useCallback((e) => {
    const value = e.target.value;
    debouncedSearch(value, statusFilter, courierFilter, channelFilter);
  }, [debouncedSearch, statusFilter, courierFilter, channelFilter]);
  
  // Handle filter changes
  const handleFilterChange = useCallback((type, value) => {
    let newSearchTerm = searchTerm;
    let newStatusFilter = statusFilter;
    let newCourierFilter = courierFilter;
    let newChannelFilter = channelFilter;
    
    switch (type) {
      case 'status':
        newStatusFilter = value;
        break;
      case 'courier':
        newCourierFilter = value;
        break;
      case 'channel':
        newChannelFilter = value;
        break;
      default:
        break;
    }
    
    debouncedSearch(newSearchTerm, newStatusFilter, newCourierFilter, newChannelFilter);
  }, [searchTerm, statusFilter, courierFilter, channelFilter, debouncedSearch]);
  
  // Clear all filters
  const clearFilters = useCallback(() => {
    setSearchTerm('');
    setStatusFilter('');
    setCourierFilter('');
    setChannelFilter('');
    setCurrentPage(1);
    loadDataRecords(1, pageSize, true);
  }, [loadDataRecords, pageSize]);
  
  // Pagination functions
  const goToPage = useCallback((page) => {
    if (page >= 1 && page <= totalPages) {
      setCurrentPage(page);
      loadDataRecords(page, pageSize);
    }
  }, [totalPages, loadDataRecords, pageSize]);
  
  const goToNextPage = useCallback(() => {
    if (currentPage < totalPages) {
      goToPage(currentPage + 1);
    }
  }, [currentPage, totalPages, goToPage]);
  
  const goToPrevPage = useCallback(() => {
    if (currentPage > 1) {
      goToPage(currentPage - 1);
    }
  }, [currentPage, goToPage]);
  
  const changePageSize = useCallback((newSize) => {
    setPageSize(newSize);
    setCurrentPage(1);
    loadDataRecords(1, newSize, true);
  }, [loadDataRecords]);
  
  // Preload next page for smooth pagination
  const preloadNextPage = useCallback(async () => {
    if (currentPage < totalPages && !isLoadingMore && hasMoreData) {
      setIsLoadingMore(true);
      try {
        const nextPageKey = `data_${currentPage + 1}_${pageSize}_${searchTerm}_${statusFilter}_${courierFilter}_${channelFilter}`;
        
        if (!isCacheValid(nextPageKey)) {
          let response;
          if (searchTerm || statusFilter || courierFilter || channelFilter) {
            response = await dataAPI.searchAllData(
              searchTerm, 
              statusFilter, 
              courierFilter, 
              currentPage + 1, 
              pageSize
            );
          } else {
            response = await dataAPI.getAllUploadedData(currentPage + 1, pageSize);
          }
          
          if (response.data?.ok && response.data?.data) {
            setCachedData(nextPageKey, response.data.data);
            console.log('🚀 Preloaded next page:', currentPage + 1);
          }
        }
      } catch (error) {
        console.warn('Failed to preload next page:', error);
    } finally {
        setIsLoadingMore(false);
    }
    }
  }, [currentPage, totalPages, pageSize, searchTerm, statusFilter, courierFilter, channelFilter, isLoadingMore, hasMoreData, isCacheValid, setCachedData]);

  // File upload handling
  const handleFileSelect = useCallback((event) => {
    const file = event.target.files[0];
    if (file && file.type === 'text/csv') {
      setSelectedFile(file);
    } else if (file) {
      toast.error('Please select a valid CSV file');
      setSelectedFile(null);
    }
  }, []);

  const handleUpload = useCallback(async () => {
    if (!selectedFile) {
      toast.error('Please select a file first');
      return;
    }

    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('file', selectedFile);

      const response = await dataAPI.uploadData(formData);

      if (response.data?.ok) {
        toast.success('File uploaded successfully!');
        setSelectedFile(null);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        
        // Refresh data and clear cache
        setCache(new Map());
        setCacheTimestamps(new Map());
          await loadUploadHistory();
        await loadDataRecords(1, pageSize, true);
        await loadGlobalStatistics();
      } else {
        toast.error(response.data?.message || 'Upload failed');
      }
    } catch (error) {
      console.error('Upload error:', error);
      toast.error(`Upload failed: ${error.response?.data?.message || error.message || 'Network error'}`);
    } finally {
      setUploading(false);
    }
  }, [selectedFile, loadUploadHistory, loadDataRecords, loadGlobalStatistics, pageSize]);
  
  // Clear all data
  const handleClearData = useCallback(async () => {
    if (!window.confirm('Are you sure you want to clear ALL data? This action cannot be undone!')) {
      return;
    }
    
    try {
      const response = await dataAPI.clearAllData();
      if (response.data?.ok) {
        toast.success('All data cleared successfully');
        setDataRecords([]);
        setTotalCount(0);
        setTotalPages(0);
        setCurrentPage(1);
        setCache(new Map());
        setCacheTimestamps(new Map());
      } else {
        toast.error(response.data?.message || 'Failed to clear data');
      }
    } catch (error) {
      console.error('Clear data error:', error);
      toast.error(`Failed to clear data: ${error.response?.data?.message || error.message || 'Network error'}`);
    }
  }, []);
  
  // Helper functions
  const formatCurrency = useCallback((amount) => {
    if (!amount || amount === 0) return '₹0.00';
    return `₹${parseFloat(amount).toFixed(2)}`;
  }, []);
  
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'N/A';
    try {
      return new Date(timestamp).toLocaleString();
    } catch {
      return 'Invalid Date';
    }
  }, []);

  const getDisplayStatus = useCallback((record) => {
    const status = record.status;
    if (!status || status === 'unlabeled' || status === 'shipped') return 'Unlabeled';
    if (status === 'label_scanned') return 'Label Scanned';
    if (status === 'packing_pending_scanned') return 'Packing Pending';
    if (status === 'packing_scanned') return 'Packing Completed';
    if (status === 'dispatch_pending_scanned') return 'Dispatch Pending';
    if (status === 'dispatch_scanned') return 'Dispatch Completed';
    if (status === 'cancelled') return 'Cancelled';
    return status;
  }, []);

  const getStatusColor = useCallback((status) => {
    switch (status) {
      case 'Unlabeled':
        return 'bg-gray-100 text-gray-800';
      case 'Label Scanned':
        return 'bg-blue-100 text-blue-800';
      case 'Packing Pending':
        return 'bg-orange-100 text-orange-800';
      case 'Packing Completed':
        return 'bg-green-100 text-green-800';
      case 'Dispatch Pending':
        return 'bg-yellow-100 text-yellow-800';
      case 'Dispatch Completed':
        return 'bg-purple-100 text-purple-800';
      case 'Cancelled':
        return 'bg-red-100 text-red-800';
      default:
        return 'bg-gray-100 text-gray-800';
    }
  }, []);

  // Load initial data
  useEffect(() => {
    loadDataRecords(1, pageSize);
    loadGlobalStatistics();
    loadUploadHistory();
  }, [loadDataRecords, loadGlobalStatistics, loadUploadHistory, pageSize]);
  
  // Preload next page when approaching end
  useEffect(() => {
    if (currentPage / totalPages > PRELOAD_THRESHOLD) {
      preloadNextPage();
    }
  }, [currentPage, totalPages, preloadNextPage]);
  
  // Auto-refresh data every 5 minutes
  useEffect(() => {
    const interval = setInterval(() => {
      if (Date.now() - lastFetchTime > 5 * 60 * 1000) {
        loadDataRecords(currentPage, pageSize, true);
      }
    }, 60000); // Check every minute
    
    return () => clearInterval(interval);
  }, [lastFetchTime, currentPage, pageSize, loadDataRecords]);
  
  // Memoized statistics
  const statistics = useMemo(() => {
    if (!dataRecords.length) return null;
    
    const stats = {
      total: dataRecords.length,
      statuses: {},
      couriers: {},
      channels: {}
    };
    
    dataRecords.forEach(record => {
      const status = getDisplayStatus(record);
      const courier = record.courier || 'Unknown';
      const channel = record.channel_name || record.channel_id || 'Unknown';
      
      stats.statuses[status] = (stats.statuses[status] || 0) + 1;
      stats.couriers[courier] = (stats.couriers[courier] || 0) + 1;
      stats.channels[channel] = (stats.channels[channel] || 0) + 1;
    });
    
    return stats;
  }, [dataRecords, getDisplayStatus]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 py-6">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Database className="w-8 h-8 mr-3 text-blue-600" />
                Data Management
              </h1>
              <p className="mt-2 text-gray-600">Upload, view, and manage your warehouse data with lightning-fast performance</p>
        </div>

            <div className="flex items-center space-x-3">
              <button
                onClick={() => setIsCacheEnabled(!isCacheEnabled)}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                  isCacheEnabled 
                    ? 'bg-green-100 text-green-700 hover:bg-green-200' 
                    : 'bg-red-100 text-red-700 hover:bg-red-200'
                }`}
              >
                {isCacheEnabled ? 'Cache: ON' : 'Cache: OFF'}
              </button>
              
              <button
                onClick={() => loadDataRecords(currentPage, pageSize, true)}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Refresh
              </button>
              </div>
                </div>
              </div>

        {/* Quick Stats */}
        {showStats && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Database className="w-6 h-6 text-blue-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Records</p>
                  <p className="text-2xl font-bold text-gray-900">{totalCount.toLocaleString()}</p>
              </div>
                </div>
              </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-green-100 rounded-lg">
                  <BarChart3 className="w-6 h-6 text-green-600" />
                  </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Current Page</p>
                  <p className="text-2xl font-bold text-gray-900">{dataRecords.length}</p>
              </div>
                </div>
              </div>
            
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-purple-100 rounded-lg">
                  <FileText className="w-6 h-6 text-purple-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Pages</p>
                  <p className="text-2xl font-bold text-gray-900">{totalPages}</p>
              </div>
            </div>
          </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6">
              <div className="flex items-center">
                <div className="p-2 bg-orange-100 rounded-lg">
                  <Settings className="w-6 h-6 text-orange-600" />
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Cache Status</p>
                  <p className="text-2xl font-bold text-gray-900">{cache.size}</p>
                  </div>
              </div>
            </div>
          </div>
        )}

        {/* Upload Section */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900 flex items-center">
              <Upload className="w-5 h-5 mr-2 text-blue-600" />
              File Upload
            </h2>
                      <button
              onClick={() => setShowStats(!showStats)}
              className="text-gray-400 hover:text-gray-600 transition-colors"
                      >
              {showStats ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
                      </button>
                  </div>
          
          <div className="flex items-center space-x-4">
            <input
              ref={fileInputRef}
              type="file"
              accept=".csv"
              onChange={handleFileSelect}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100 transition-colors"
            />
                <button
                  onClick={handleUpload}
                  disabled={!selectedFile || uploading}
              className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center"
                >
                  {uploading ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="w-4 h-4 mr-2" />
                  Upload
                </>
                  )}
                </button>

            <button
              onClick={handleClearData}
              className="px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors flex items-center"
            >
              <Trash2 className="w-4 h-4 mr-2" />
              Clear All
            </button>
                  </div>
                </div>
                
        {/* Search and Filters */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900 flex items-center">
              <Search className="w-5 h-5 mr-2 text-green-600" />
              Search & Filters
            </h3>
              <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-gray-400 hover:text-gray-600 transition-colors flex items-center"
            >
              <Filter className="w-4 h-4 mr-2" />
              {showFilters ? 'Hide' : 'Show'} Filters
                </button>
          </div>

          <div className="flex flex-wrap gap-4 mb-4">
            <div className="flex-1 min-w-64">
                <input
                ref={searchInputRef}
                  type="text"
                placeholder="Search by tracking ID, order ID, G-Code, SKU..."
                onChange={handleSearchChange}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                />
              </div>
              
            {showFilters && (
              <>
                  <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Statuses</option>
                  <option value="unlabeled">Unlabeled (including shipped)</option>
                  <option value="label_scanned">Label Scanned</option>
                  <option value="packing_pending_scanned">Packing Pending</option>
                  <option value="packing_scanned">Packing Completed</option>
                                      <option value="dispatch_pending_scanned">Dispatch Pending</option>
                  <option value="dispatch_scanned">Dispatch Completed</option>
                  <option value="cancelled">Cancelled</option>
                  </select>
              
                <select
                  value={courierFilter}
                  onChange={(e) => handleFilterChange('courier', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Couriers</option>
                  <option value="DTDC">DTDC</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="FedEx">FedEx</option>
                </select>
                
                <select
                  value={channelFilter}
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                  className="px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
                >
                  <option value="">All Channels</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Myntra">Myntra</option>
                </select>
              </>
            )}
            
            {(searchTerm || statusFilter || courierFilter || channelFilter) && (
              <button
                onClick={clearFilters}
                className="px-4 py-2 bg-gray-600 text-white rounded-lg hover:bg-gray-700 transition-colors flex items-center"
              >
                <RefreshCw className="w-4 h-4 mr-2" />
                Clear All
              </button>
            )}
              </div>
          
          {/* Active Filters Display */}
          {(searchTerm || statusFilter || courierFilter || channelFilter) && (
            <div className="flex flex-wrap gap-2">
              {searchTerm && (
                <span className="px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-sm flex items-center">
                  Search: {searchTerm}
                <button
                    onClick={() => handleSearchChange({ target: { value: '' } })}
                    className="ml-2 text-blue-600 hover:text-blue-800"
                  >
                    ×
                </button>
                </span>
              )}
              {statusFilter && (
                <span className="px-3 py-1 bg-green-100 text-green-800 rounded-full text-sm flex items-center">
                  Status: {statusFilter}
                  <button
                    onClick={() => handleFilterChange('status', '')}
                    className="ml-2 text-green-600 hover:text-green-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {courierFilter && (
                <span className="px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-sm flex items-center">
                  Courier: {courierFilter}
                  <button
                    onClick={() => handleFilterChange('courier', '')}
                    className="ml-2 text-purple-600 hover:text-purple-800"
                  >
                    ×
                  </button>
                </span>
              )}
              {channelFilter && (
                <span className="px-3 py-1 bg-orange-100 text-orange-800 rounded-full text-sm flex items-center">
                  Channel: {channelFilter}
                  <button
                    onClick={() => handleFilterChange('channel', '')}
                    className="ml-2 text-orange-600 hover:text-orange-800"
                  >
                    ×
                  </button>
                </span>
              )}
            </div>
          )}
          </div>

        {/* Enhanced Data Display Section */}
        {showDataDisplay && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mb-8">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 flex items-center">
                <Table className="w-5 h-5 mr-2 text-indigo-600" />
                Advanced Data Display & Analytics
              </h3>
              <button
                onClick={() => setShowDataDisplay(!showDataDisplay)}
                className="text-gray-400 hover:text-gray-600 transition-colors"
              >
                {showDataDisplay ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            
            <DataDisplayTable 
              apiEndpoint="/data-display"
              refreshInterval={30000}
              enableVirtualScrolling={true}
            />
          </div>
        )}

        {/* Upload History */}
        {uploadHistory.length > 0 && (
          <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 mt-8">
            <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <FileText className="w-5 h-5 mr-2 text-purple-600" />
              Upload History
            </h3>
            
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">File</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Records</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Success</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Errors</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {uploadHistory.map((upload, index) => (
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                        {formatTimestamp(upload.timestamp)}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {upload.filename || 'Unknown'}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-700">
                        {upload.total_rows || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-green-600 font-medium">
                        {upload.success_count || 0}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-red-600 font-medium">
                        {upload.error_count || 0}
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
  );
};

export default DataUpload;
