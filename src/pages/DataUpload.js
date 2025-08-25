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
  Table,
  TrendingUp,
  Package,
  Truck,
  XCircle,
  Upload as UploadIcon
} from 'lucide-react';
import DataDisplayTable from '../components/DataDisplayTable';

const DataUpload = () => {
  // Core state
  const [dataRecords, setDataRecords] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingMessage, setLoadingMessage] = useState('');
  
  // KPI state
  const [kpiMetrics, setKpiMetrics] = useState({
    total_upload: 0,
    labelled: 0,
    packing: 0,
    dispatch_pending: 0,
    cancelled: 0
  });
  
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
  const [useLargeDatasetMode, setUseLargeDatasetMode] = useState(false);
  const [showDeleteMenu, setShowDeleteMenu] = useState(false);
  
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
  const [isSearching, setIsSearching] = useState(false);
  
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
      if (now - cacheTimestamps.get(key) < CACHE_DURATION) {
        newCache.set(key, value);
        newTimestamps.set(key, cacheTimestamps.get(key));
      }
    });
    
    setCache(newCache);
    setCacheTimestamps(newTimestamps);
  }, [cache, cacheTimestamps, CACHE_DURATION]);
  
  // Fetch data with optimization
  const fetchData = useCallback(async (page = 1, useCache = true) => {
    try {
            console.log('🚀 Starting fetchData with:', { page, useCache, pageSize, statusFilter, courierFilter, channelFilter, searchTerm });
    setLoading(true);
      setError(null);
      
      // Show loading message for long operations
      if (page === 1) {
        setLoadingMessage('🔄 Loading data from Redis (this may take 1-2 minutes for large datasets)...');
      }
      
      // Check cache first for first 100 records
      if (useCache && page === 1 && pageSize <= 100) {
        const cachedData = getCachedData(cacheKey);
        if (cachedData && isCacheValid(cacheKey)) {
          console.log('✅ Using cached data for first page');
          setDataRecords(cachedData.records);
          setTotalCount(cachedData.total_count);
          setTotalPages(cachedData.total_pages);
          setKpiMetrics(cachedData.kpi_metrics || kpiMetrics);
          setError(''); // Clear any previous errors
          setLoadingMessage(''); // Clear loading message
          setLoading(false);
          return;
        }
      }
      
      // Choose endpoint based on manual toggle or dataset size
      const useLargeDatasetEndpoint = useLargeDatasetMode || totalCount > 10000 || page > 10;
      const endpoint = useLargeDatasetEndpoint ? 'large-dataset' : 'optimized-data';
      
      console.log(`📡 Fetching from API endpoint: /data/${endpoint} (totalCount: ${totalCount}, page: ${page}, manual mode: ${useLargeDatasetMode})`);
      
      // Fetch from appropriate API endpoint
      const response = useLargeDatasetEndpoint 
        ? await dataAPI.getLargeDatasetData({
            page,
            page_size: pageSize,
            status_filter: statusFilter || undefined,
            courier_filter: courierFilter || undefined,
            channel_filter: channelFilter || undefined,
            search_term: searchTerm || undefined
          })
        : await dataAPI.getOptimizedData({
            page,
            page_size: pageSize,
            status_filter: statusFilter || undefined,
            courier_filter: courierFilter || undefined,
            channel_filter: channelFilter || undefined,
            search_term: searchTerm || undefined
          });
      
      console.log('📥 API Response received:', response);
      console.log('📊 Response structure:', {
        status: response.status,
        data: response.data,
        hasData: !!response.data,
        dataKeys: response.data ? Object.keys(response.data) : 'No data'
      });
      
      // Check if response.data exists and has the expected structure
      if (response.data && response.data.ok) {
        const { records, total_count, total_pages, kpi_metrics } = response.data.data || {};
        console.log('✅ Data parsed successfully:', { 
          recordsCount: records?.length, 
          total_count, 
          total_pages, 
          hasKpis: !!kpi_metrics 
        });
        
        if (records && Array.isArray(records)) {
          setDataRecords(records);
          setTotalCount(total_count || 0);
          setTotalPages(total_pages || 0);
          setKpiMetrics(kpi_metrics || {});
        setLastFetchTime(Date.now());
        
          // Clear any previous errors and loading messages
          setError('');
          setLoadingMessage('');
          
          // Cache first 100 records
          if (page === 1 && pageSize <= 100 && records.length > 0) {
            console.log('💾 Caching data for future use');
            setCachedData(cacheKey, {
              records,
              total_count,
              total_pages,
              kpi_metrics
            });
          }
        } else {
          console.error('❌ No records in response data');
          setError('No records found in response');
          setLoadingMessage(''); // Clear loading message on error
        }
      } else {
        console.error('❌ API Error:', response.data?.message || 'Unknown error');
        setError(response.data?.message || 'Failed to fetch data');
        setLoadingMessage(''); // Clear loading message on error
      }
    } catch (err) {
      console.error('💥 Error fetching data:', err);
      console.error('💥 Error details:', {
        message: err.message,
        stack: err.stack,
        response: err.response?.data
      });
      setError(err.message || 'Failed to fetch data');
      setLoadingMessage(''); // Clear loading message on error
    } finally {
      setLoading(false);
      setLoadingMessage(''); // Clear loading message when done
      setIsSearching(false); // Clear searching state when done
    }
  }, [pageSize, statusFilter, courierFilter, channelFilter, searchTerm, getCachedData, isCacheValid, setCachedData, kpiMetrics]);
  
  // Debounced search
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== '' && searchTerm.length >= 2) {
        console.log('🔍 Search triggered for:', searchTerm);
        setIsSearching(true);
        setCurrentPage(1);
        fetchData(1, false);
      } else if (searchTerm === '' || searchTerm.length < 2) {
        // Clear search or too short - reset to first page with no filters
        console.log('🔍 Search cleared or too short, resetting to default view');
        setIsSearching(false);
        setCurrentPage(1);
        fetchData(1, true);
      }
    }, DEBOUNCE_DELAY);
    
    return () => clearTimeout(timer);
  }, [searchTerm]); // Remove fetchData dependency to prevent infinite loops
  
  // Initial data fetch
  useEffect(() => {
    fetchData(1, true);
  }, []);
  
  // Close delete menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (showDeleteMenu && !event.target.closest('.delete-menu-container')) {
        setShowDeleteMenu(false);
      }
    };
    
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showDeleteMenu]);
  
  // Handle file upload
  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    setSelectedFile(file);
    setUploading(true);
    
    try {
      const formData = new FormData();
      formData.append('file', file);
      
      const response = await dataAPI.uploadData(formData);
      
      if (response.ok) {
        toast.success('File uploaded successfully!');
        setSelectedFile(null);
        // Refresh data after upload
        fetchData(1, false);
      } else {
        toast.error(response.message || 'Upload failed');
      }
    } catch (err) {
      console.error('Upload error:', err);
      toast.error('Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };
  
  // Handle filter changes
  const handleFilterChange = (filterType, value) => {
    setCurrentPage(1);
    
    switch (filterType) {
      case 'status':
        setStatusFilter(value);
        break;
      case 'courier':
        setCourierFilter(value);
        break;
      case 'channel':
        setChannelFilter(value);
        break;
      default:
        break;
    }
  };
  
  // Apply filters
  const applyFilters = () => {
    setCurrentPage(1);
    fetchData(1, false);
  };
  
  // Clear filters
  const clearFilters = () => {
    setStatusFilter('');
    setCourierFilter('');
    setChannelFilter('');
    setSearchTerm('');
    setCurrentPage(1);
    fetchData(1, true);
  };
  
  // Delete all data
  const handleDeleteAllData = async () => {
    if (!window.confirm('⚠️ WARNING: This will permanently delete ALL data from the system!\n\nThis action cannot be undone. Are you sure you want to continue?')) {
      return;
    }
    
    if (!window.confirm('🚨 FINAL CONFIRMATION: You are about to delete ALL 12,000+ records!\n\nType "DELETE" to confirm:')) {
      return;
    }
    
    const userInput = prompt('Type "DELETE" to confirm deletion of all data:');
    if (userInput !== 'DELETE') {
      toast.error('Deletion cancelled. Data remains safe.');
      return;
    }
    
    try {
      setLoading(true);
      setError('🔄 Deleting all data from system...');
      
      const response = await dataAPI.clearAllData();
      
      if (response.ok) {
        toast.success('✅ All data deleted successfully!');
        setError('');
        setDataRecords([]);
        setTotalCount(0);
        setTotalPages(0);
        setCurrentPage(1);
        setKpiMetrics({
          total_upload: 0,
          labelled: 0,
          packing: 0,
          dispatch_pending: 0,
          cancelled: 0
        });
        // Clear cache
        setCache(new Map());
        setCacheTimestamps(new Map());
      } else {
        toast.error(response.message || 'Failed to delete data');
        setError('Failed to delete data');
      }
    } catch (err) {
      console.error('Delete data error:', err);
      toast.error('Failed to delete data. Please try again.');
      setError('Failed to delete data');
    } finally {
      setLoading(false);
    }
  };
  
  // Delete scanning data only
  const handleDeleteScanningData = async () => {
    if (!window.confirm('⚠️ WARNING: This will delete all scanning/labeling data!\n\nThis action cannot be undone. Are you sure you want to continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('🔄 Deleting scanning data...');
      
      const response = await dataAPI.clearAllScanningData();
      
      if (response.ok) {
        toast.success('✅ Scanning data deleted successfully!');
        setError('');
        // Refresh data to show updated counts
        fetchData(1, true);
      } else {
        toast.error(response.message || 'Failed to delete scanning data');
        setError('Failed to delete scanning data');
      }
    } catch (err) {
      console.error('Delete scanning data error:', err);
      toast.error('Failed to delete scanning data. Please try again.');
      setError('Failed to delete scanning data');
    } finally {
      setLoading(false);
    }
  };
  
  // Clear cache only
  const handleClearCache = async () => {
    if (!window.confirm('⚠️ This will clear all cached data!\n\nPerformance may be slower on next load. Continue?')) {
      return;
    }
    
    try {
      setLoading(true);
      setError('🔄 Clearing cache...');
      
      // Clear local cache
      setCache(new Map());
      setCacheTimestamps(new Map());
      
      // Clear backend cache if API available
      try {
        await dataAPI.clearAllData(); // This might clear backend cache too
      } catch (e) {
        console.log('Backend cache clear not available, local cache cleared');
      }
      
      toast.success('✅ Cache cleared successfully!');
      setError('');
      
      // Refresh data
      fetchData(1, true);
    } catch (err) {
      console.error('Clear cache error:', err);
      toast.error('Failed to clear cache. Please try again.');
      setError('Failed to clear cache');
    } finally {
      setLoading(false);
    }
  };
  
  // Handle pagination
  const handlePageChange = (page) => {
      setCurrentPage(page);
    fetchData(page, page === 1);
  };
  
  // KPI Card Component
  const KPICard = ({ title, value, icon: Icon, color, description }) => (
    <div className={`bg-white rounded-lg shadow-md p-6 border-l-4 ${color}`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm font-medium text-gray-600">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value.toLocaleString()}</p>
          <p className="text-xs text-gray-500">{description}</p>
        </div>
        <div className={`p-3 rounded-full ${color.replace('border-l-', 'bg-').replace('-500', '-100')}`}>
          <Icon className={`w-6 h-6 ${color.replace('border-l-', 'text-').replace('-500', '-600')}`} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Data Upload & Management</h1>
              <p className="text-gray-600">Upload, view, and manage your data with real-time KPIs</p>
        </div>
            <div className="flex items-center space-x-3">
              <button
                onClick={() => setShowStats(!showStats)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <BarChart3 className="w-4 h-4 mr-2" />
                {showStats ? 'Hide KPIs' : 'Show KPIs'}
              </button>
              <button
                onClick={() => setShowDataDisplay(!showDataDisplay)}
                className="flex items-center px-3 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                <Table className="w-4 h-4 mr-2" />
                {showDataDisplay ? 'Hide Table' : 'Show Table'}
              </button>
              </div>
                </div>
              </div>

        {/* Upload Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
            <UploadIcon className="w-5 h-5 mr-2" />
            Upload Section
          </h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* File Upload */}
            <div className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center hover:border-gray-400 transition-colors">
              <input
                ref={fileInputRef}
                type="file"
                accept=".csv,.xlsx,.xls"
                onChange={handleFileUpload}
                className="hidden"
                disabled={uploading}
              />
              
              <div className="space-y-4">
                <Upload className="w-12 h-12 text-gray-400 mx-auto" />
                <div>
                  <p className="text-lg font-medium text-gray-900">
                    {uploading ? 'Uploading...' : 'Upload Data File'}
                  </p>
                  <p className="text-sm text-gray-500">
                    CSV, Excel files supported
                  </p>
                </div>
                
                <button
                  onClick={() => fileInputRef.current?.click()}
                  disabled={uploading}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {uploading ? 'Uploading...' : 'Choose File'}
                </button>
                
                {selectedFile && (
                  <p className="text-sm text-gray-600">
                    Selected: {selectedFile.name}
                  </p>
                )}
                </div>
              </div>
            
            {/* Upload Status */}
            <div className="space-y-4">
              <h3 className="text-md font-medium text-gray-900">Upload Status</h3>
              {uploading ? (
                <div className="flex items-center space-x-2 text-blue-600">
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Processing file...</span>
                </div>
              ) : (
                <div className="text-gray-500">
                  No file being processed
                </div>
              )}
              
              <div className="text-sm text-gray-600">
                <p>• Supported formats: CSV, Excel (.xlsx, .xls)</p>
                <p>• Maximum file size: 10MB</p>
                <p>• Data will be validated before import</p>
              </div>
            </div>
          </div>
        </div>
        
        {/* KPI Section */}
        {showStats && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <h2 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
              <TrendingUp className="w-5 h-5 mr-2" />
              KPI Section
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              <KPICard
                title="Total Upload"
                value={kpiMetrics.total_upload}
                icon={Database}
                color="border-l-blue-500"
                description="Total records uploaded"
              />
              <KPICard
                title="Labelled"
                value={kpiMetrics.labelled}
                icon={FileText}
                color="border-l-green-500"
                description="Records with labels"
              />
              <KPICard
                title="Packing"
                value={kpiMetrics.packing}
                icon={Package}
                color="border-l-yellow-500"
                description="In packing process"
              />
              <KPICard
                title="Dispatch Pending"
                value={kpiMetrics.dispatch_pending}
                icon={Truck}
                color="border-l-purple-500"
                description="Ready for dispatch"
              />
              <KPICard
                title="Cancelled"
                value={kpiMetrics.cancelled}
                icon={XCircle}
                color="border-l-red-500"
                description="Cancelled records"
              />
            </div>
          </div>
        )}

        {/* Filters Section */}
        <div className="bg-white rounded-lg shadow-md p-6">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-gray-900 flex items-center">
              <Filter className="w-5 h-5 mr-2" />
              Filters
            </h2>
              <button
              onClick={() => setShowFilters(!showFilters)}
              className="text-sm text-blue-600 hover:text-blue-800"
            >
              {showFilters ? 'Hide Filters' : 'Show Filters'}
                </button>
          </div>

          {showFilters && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-4">
              {/* Search */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Search
                </label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                ref={searchInputRef}
                  type="text"
                    placeholder="Search tracking ID, order ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              
              {/* Status Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Status
                </label>
                  <select
                  value={statusFilter}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Status</option>
                  <option value="Unlabeled">Unlabeled</option>
                  <option value="label_scanned">Label Scanned</option>
                  <option value="packing">Packing</option>
                  <option value="dispatch">Dispatch</option>
                  <option value="cancelled">Cancelled</option>
                  </select>
              </div>
              
              {/* Courier Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Courier
                </label>
                <select
                  value={courierFilter}
                  onChange={(e) => handleFilterChange('courier', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Couriers</option>
                  <option value="DTDC">DTDC</option>
                  <option value="BlueDart">BlueDart</option>
                  <option value="FedEx">FedEx</option>
                  <option value="Amazon">Amazon</option>
                </select>
              </div>
                
              {/* Channel Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Channel
                </label>
                <select
                  value={channelFilter}
                  onChange={(e) => handleFilterChange('channel', e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                >
                  <option value="">All Channels</option>
                  <option value="Amazon">Amazon</option>
                  <option value="Flipkart">Flipkart</option>
                  <option value="Myntra">Myntra</option>
                  <option value="Nykaa">Nykaa</option>
                </select>
              </div>
            </div>
          )}
          
          {/* Filter Actions */}
          <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-3">
                <button
                  onClick={applyFilters}
                  className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
                >
                  Apply Filters
                </button>
                <button
                  onClick={clearFilters}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Clear All
                </button>
                <div className="relative delete-menu-container">
                  <button
                    onClick={() => setShowDeleteMenu(!showDeleteMenu)}
                    className="px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 flex items-center space-x-2"
                  >
                    <Trash2 className="w-4 h-4" />
                    <span>Delete Data</span>
                  </button>
                  
                  {showDeleteMenu && (
                    <div className="absolute right-0 mt-2 w-48 bg-white rounded-md shadow-lg z-50 border border-gray-200">
                      <div className="py-1">
                        <button
                          onClick={() => {
                            setShowDeleteMenu(false);
                            handleDeleteAllData();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-red-700 hover:bg-red-50"
                        >
                          🗑️ Delete All Data
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteMenu(false);
                            handleDeleteScanningData();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-orange-700 hover:bg-orange-50"
                        >
                          📱 Delete Scanning Data
                        </button>
                        <button
                          onClick={() => {
                            setShowDeleteMenu(false);
                            handleClearCache();
                          }}
                          className="block w-full text-left px-4 py-2 text-sm text-blue-700 hover:bg-blue-50"
                        >
                          🗄️ Clear Cache
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              </div>
          
            <div className="flex items-center space-x-4 text-sm text-gray-600">
              <div className="flex items-center space-x-2">
                <span>Cache:</span>
                <button
                  onClick={() => setIsCacheEnabled(!isCacheEnabled)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    isCacheEnabled 
                      ? 'bg-green-100 text-green-800' 
                      : 'bg-red-100 text-red-800'
                  }`}
                >
                  {isCacheEnabled ? 'Enabled' : 'Disabled'}
                </button>
              </div>
              
              <div className="flex items-center space-x-2">
                <span>Large Dataset:</span>
                  <button
                  onClick={() => setUseLargeDatasetMode(!useLargeDatasetMode)}
                  className={`px-2 py-1 rounded text-xs font-medium ${
                    useLargeDatasetMode 
                      ? 'bg-blue-100 text-blue-800' 
                      : 'bg-gray-100 text-gray-600'
                  }`}
                >
                  {useLargeDatasetMode ? 'Enabled' : 'Disabled'}
                  </button>
              </div>
            </div>
          </div>
          </div>

        {/* Data Table Section */}
        {showDataDisplay && (
          <div className="bg-white rounded-lg shadow-md p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex items-center">
                <Table className="w-5 h-5 mr-2" />
                Data Table
              </h2>
              
              <div className="flex items-center space-x-3">
                <span className="text-sm text-gray-600">
                  Total: {totalCount.toLocaleString()} records
                </span>
              <button
                  onClick={() => fetchData(currentPage, false)}
                  disabled={loading}
                  className="p-2 text-gray-600 hover:text-gray-800 disabled:opacity-50"
              >
                  <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
              </button>
              </div>
            </div>
            
            {/* Data Table */}
            <DataDisplayTable 
              data={dataRecords}
              loading={loading}
              error={error}
              loadingMessage={loadingMessage}
              isSearching={isSearching}
              currentPage={currentPage}
              totalPages={totalPages}
              pageSize={pageSize}
              onPageChange={handlePageChange}
              onPageSizeChange={setPageSize}
            />
            
            {/* Pagination Info */}
            <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
              <span>
                Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, totalCount)} of {totalCount} results
              </span>
              <span>
                Page {currentPage} of {totalPages}
              </span>
        </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataUpload;
