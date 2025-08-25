import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { 
  Search, 
  Filter, 
  RefreshCw, 
  Download, 
  Calendar,
  BarChart3,
  Database,
  ChevronDown,
  ChevronUp,
  Eye,
  EyeOff,
  Settings,
  TrendingUp
} from 'lucide-react';
import { toast } from 'react-hot-toast';

const DataDisplayTable = ({ 
  apiEndpoint = '/data-display',
  refreshInterval = 30000, // 30 seconds
  enableVirtualScrolling = true 
}) => {
  // Core state
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  
  // KPI state
  const [kpis, setKpis] = useState({});
  const [kpisLoading, setKpisLoading] = useState(false);
  
  // Filter state
  const [filters, setFilters] = useState({
    search_term: '',
    status_filter: '',
    courier_filter: '',
    channel_filter: '',
    date_from: '',
    date_to: '',
    product_filter: '',
    tracking_id_filter: ''
  });
  
  // Pagination state
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(50);
  const [totalCount, setTotalCount] = useState(0);
  const [totalPages, setTotalPages] = useState(0);
  
  // UI state
  const [showFilters, setShowFilters] = useState(false);
  const [showKpis, setShowKpis] = useState(true);
  const [selectedColumns, setSelectedColumns] = useState([
    'tracking_id', 'status', 'courier', 'channel', 'created_at'
  ]);
  
  // Performance state
  const [lastFetchTime, setLastFetchTime] = useState(0);
  const [performanceMetrics, setPerformanceMetrics] = useState({});
  
  // Export state
  const [exportTask, setExportTask] = useState(null);
  const [exportProgress, setExportProgress] = useState(0);
  
  // Refs
  const tableRef = useRef();
  const searchTimeoutRef = useRef();
  
  // Available columns configuration
  const availableColumns = [
    { key: 'tracking_id', label: 'Tracking ID', width: 150 },
    { key: 'order_id', label: 'Order ID', width: 120 },
    { key: 'status', label: 'Status', width: 120 },
    { key: 'courier', label: 'Courier', width: 100 },
    { key: 'channel', label: 'Channel', width: 100 },
    { key: 'product_name', label: 'Product', width: 200 },
    { key: 'customer_name', label: 'Customer', width: 150 },
    { key: 'created_at', label: 'Created', width: 120 },
    { key: 'updated_at', label: 'Updated', width: 120 }
  ];
  
  // Load KPIs with caching
  const loadKpis = useCallback(async () => {
    try {
      setKpisLoading(true);
      
      const response = await fetch(`${apiEndpoint}/kpis`, {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });
      
      if (response.ok) {
        const result = await response.json();
        setKpis(result.data);
        setPerformanceMetrics(prev => ({
          ...prev,
          kpi_fetch_time: result.data.performance_metrics?.fetch_time_ms
        }));
      }
    } catch (error) {
      console.error('Failed to load KPIs:', error);
      toast.error('Failed to load KPIs');
    } finally {
      setKpisLoading(false);
    }
  }, [apiEndpoint]);
  
  // Load filtered data with debouncing
  const loadData = useCallback(async (resetPage = false) => {
    try {
      setLoading(true);
      setError(null);
      
      const page = resetPage ? 1 : currentPage;
      if (resetPage) setCurrentPage(1);
      
      const response = await fetch(`${apiEndpoint}/filtered-data?page=${page}&page_size=${pageSize}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(filters)
      });
      
      if (response.ok) {
        const result = await response.json();
        setData(result.data.records);
        setTotalCount(result.data.total_count);
        setTotalPages(result.data.total_pages);
        setLastFetchTime(Date.now());
        
        setPerformanceMetrics(prev => ({
          ...prev,
          data_fetch_time: result.data.performance_metrics?.fetch_time_ms,
          cached: result.data.cached || false
        }));
        
        if (result.data.cached) {
          toast.success('Data loaded from cache', { duration: 1000 });
        }
      } else {
        throw new Error('Failed to load data');
      }
    } catch (error) {
      console.error('Failed to load data:', error);
      setError(error.message);
      toast.error('Failed to load data');
    } finally {
      setLoading(false);
    }
  }, [apiEndpoint, currentPage, pageSize, filters]);
  
  // Debounced search
  const handleFilterChange = useCallback((key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    
    // Clear existing timeout
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }
    
    // Set new timeout for debounced search
    searchTimeoutRef.current = setTimeout(() => {
      loadData(true); // Reset to page 1 when filtering
    }, 300);
  }, [loadData]);
  
  // Export data
  const handleExport = useCallback(async (format = 'csv') => {
    try {
      const response = await fetch(
        `${apiEndpoint}/export-data?format=${format}&filters=${encodeURIComponent(JSON.stringify(filters))}`,
        {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        }
      );
      
      if (response.ok) {
        const result = await response.json();
        setExportTask(result.data.task_id);
        
        // Poll for export status
        pollExportStatus(result.data.task_id);
        
        toast.success('Export started successfully');
      } else {
        throw new Error('Failed to start export');
      }
    } catch (error) {
      console.error('Export failed:', error);
      toast.error('Export failed');
    }
  }, [apiEndpoint, filters]);
  
  // Poll export status
  const pollExportStatus = useCallback(async (taskId) => {
    const pollInterval = setInterval(async () => {
      try {
        const response = await fetch(`${apiEndpoint}/export-status/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${localStorage.getItem('token')}`
          }
        });
        
        if (response.ok) {
          const result = await response.json();
          const taskData = result.data;
          
          setExportProgress(taskData.progress || 0);
          
          if (taskData.status === 'completed') {
            clearInterval(pollInterval);
            setExportTask(null);
            setExportProgress(0);
            
            // Show download link
            toast.success(
              <div>
                Export completed! 
                <a 
                  href={taskData.download_url} 
                  className="ml-2 text-blue-600 underline"
                  download
                >
                  Download
                </a>
              </div>,
              { duration: 10000 }
            );
          } else if (taskData.status === 'failed') {
            clearInterval(pollInterval);
            setExportTask(null);
            setExportProgress(0);
            toast.error('Export failed');
          }
        }
      } catch (error) {
        console.error('Failed to poll export status:', error);
      }
    }, 2000); // Poll every 2 seconds
  }, [apiEndpoint]);
  
  // Auto-refresh
  useEffect(() => {
    if (refreshInterval > 0) {
      const interval = setInterval(() => {
        loadData();
        loadKpis();
      }, refreshInterval);
      
      return () => clearInterval(interval);
    }
  }, [loadData, loadKpis, refreshInterval]);
  
  // Initial load
  useEffect(() => {
    loadData();
    loadKpis();
  }, [currentPage, pageSize]);
  
  // Format timestamp
  const formatTimestamp = useCallback((timestamp) => {
    if (!timestamp) return 'N/A';
    return new Date(parseInt(timestamp) * 1000).toLocaleString();
  }, []);
  
  // Format number with commas
  const formatNumber = useCallback((num) => {
    return new Intl.NumberFormat().format(num);
  }, []);
  
  // Get status badge class
  const getStatusBadgeClass = useCallback((status) => {
    const classes = {
      'Unlabeled': 'bg-gray-100 text-gray-800',
      'label_scanned': 'bg-blue-100 text-blue-800',
      'packing_pending_scanned': 'bg-yellow-100 text-yellow-800',
      'packing_scanned': 'bg-green-100 text-green-800',
      'dispatch_pending_scanned': 'bg-orange-100 text-orange-800',
      'dispatch_scanned': 'bg-purple-100 text-purple-800',
      'Shipped': 'bg-green-100 text-green-800',
      'cancel': 'bg-red-100 text-red-800'
    };
    
    return classes[status] || 'bg-gray-100 text-gray-800';
  }, []);
  
  // Render KPI cards
  const renderKpis = () => {
    if (!showKpis) return null;
    
    return (
      <div className="mb-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Records */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Records</p>
              <p className="text-2xl font-bold text-gray-900">
                {kpisLoading ? '...' : formatNumber(kpis.total_records || 0)}
              </p>
            </div>
            <Database className="h-8 w-8 text-blue-600" />
          </div>
          <div className="mt-2 flex items-center text-sm text-gray-500">
            <TrendingUp className="h-4 w-4 mr-1" />
            {formatNumber(kpis.recent_uploads || 0)} recent uploads
          </div>
        </div>
        
        {/* Status Breakdown */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between mb-2">
            <p className="text-sm font-medium text-gray-600">Top Status</p>
            <BarChart3 className="h-6 w-6 text-green-600" />
          </div>
          {kpisLoading ? (
            <p className="text-gray-500">Loading...</p>
          ) : (
            <div className="space-y-1">
              {Object.entries(kpis.status_breakdown || {})
                .sort(([,a], [,b]) => b - a)
                .slice(0, 3)
                .map(([status, count]) => (
                  <div key={status} className="flex justify-between text-sm">
                    <span className="text-gray-600 truncate">{status}</span>
                    <span className="font-medium">{formatNumber(count)}</span>
                  </div>
                ))}
            </div>
          )}
        </div>
        
        {/* Performance Metrics */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Performance</p>
              <p className="text-lg font-bold text-green-600">
                {performanceMetrics.data_fetch_time ? 
                  `${Math.round(performanceMetrics.data_fetch_time)}ms` : 
                  'N/A'
                }
              </p>
            </div>
            <RefreshCw className="h-6 w-6 text-green-600" />
          </div>
          <div className="mt-2 text-sm text-gray-500">
            {performanceMetrics.cached ? '⚡ Cached' : '🔄 Fresh data'}
          </div>
        </div>
        
        {/* Error Rate */}
        <div className="bg-white rounded-lg shadow-sm border p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Error Rate</p>
              <p className="text-2xl font-bold text-red-600">
                {kpisLoading ? '...' : `${((kpis.error_rate || 0) * 100).toFixed(1)}%`}
              </p>
            </div>
            <div className="h-8 w-8 rounded-full bg-red-100 flex items-center justify-center">
              <span className="text-red-600 font-bold text-sm">!</span>
            </div>
          </div>
        </div>
      </div>
    );
  };
  
  // Render filter panel
  const renderFilters = () => {
    if (!showFilters) return null;
    
    return (
      <div className="bg-white rounded-lg shadow-sm border p-4 mb-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Search */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Search
            </label>
            <input
              type="text"
              value={filters.search_term}
              onChange={(e) => handleFilterChange('search_term', e.target.value)}
              placeholder="Search tracking ID, order ID..."
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Status
            </label>
            <select
              value={filters.status_filter}
              onChange={(e) => handleFilterChange('status_filter', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">All Statuses</option>
              <option value="Unlabeled">Unlabeled</option>
              <option value="label_scanned">Label Scanned</option>
              <option value="packing_pending_scanned">Packing Pending</option>
              <option value="packing_scanned">Packing Scanned</option>
              <option value="dispatch_pending_scanned">Dispatch Pending</option>
              <option value="dispatch_scanned">Dispatch Scanned</option>
              <option value="Shipped">Shipped</option>
              <option value="cancel">Cancelled</option>
            </select>
          </div>
          
          {/* Courier Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Courier
            </label>
            <input
              type="text"
              value={filters.courier_filter}
              onChange={(e) => handleFilterChange('courier_filter', e.target.value)}
              placeholder="Enter courier name"
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          
          {/* Date Range */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Date From
            </label>
            <input
              type="date"
              value={filters.date_from}
              onChange={(e) => handleFilterChange('date_from', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
        </div>
        
        {/* Clear Filters */}
        <div className="mt-4 flex justify-between items-center">
          <button
            onClick={() => {
              setFilters({
                search_term: '',
                status_filter: '',
                courier_filter: '',
                channel_filter: '',
                date_from: '',
                date_to: '',
                product_filter: '',
                tracking_id_filter: ''
              });
              loadData(true);
            }}
            className="text-sm text-gray-600 hover:text-gray-800"
          >
            Clear All Filters
          </button>
          
          <div className="text-sm text-gray-500">
            {totalCount > 0 && `${formatNumber(totalCount)} records found`}
          </div>
        </div>
      </div>
    );
  };
  
  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900">Data Display</h2>
          <p className="text-sm text-gray-600">
            {lastFetchTime && `Last updated: ${new Date(lastFetchTime).toLocaleTimeString()}`}
          </p>
        </div>
        
        <div className="mt-3 sm:mt-0 flex items-center space-x-2">
          {/* Toggle Buttons */}
          <button
            onClick={() => setShowKpis(!showKpis)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              showKpis 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            {showKpis ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            KPIs
          </button>
          
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`px-3 py-2 rounded-md text-sm font-medium ${
              showFilters 
                ? 'bg-blue-100 text-blue-700' 
                : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
            }`}
          >
            <Filter className="h-4 w-4 mr-1" />
            Filters
          </button>
          
          {/* Export Button */}
          <div className="relative">
            <button
              onClick={() => handleExport('csv')}
              disabled={loading || exportTask}
              className="px-3 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center text-sm"
            >
              <Download className="h-4 w-4 mr-1" />
              Export
            </button>
            
            {exportTask && (
              <div className="absolute top-full mt-1 left-0 bg-white border rounded-md shadow-lg p-2 min-w-32 z-10">
                <div className="text-xs text-gray-600">Exporting...</div>
                <div className="w-full bg-gray-200 rounded-full h-2 mt-1">
                  <div 
                    className="bg-green-600 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${exportProgress}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>
          
          {/* Refresh Button */}
          <button
            onClick={() => {
              loadData();
              loadKpis();
            }}
            disabled={loading}
            className="px-3 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50"
          >
            <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>
      </div>
      
      {/* KPIs */}
      {renderKpis()}
      
      {/* Filters */}
      {renderFilters()}
      
      {/* Data Table */}
      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {/* Table Header */}
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <h3 className="text-lg font-medium text-gray-900">
                Records ({formatNumber(totalCount)})
              </h3>
              
              {/* Page Size Selector */}
              <select
                value={pageSize}
                onChange={(e) => setPageSize(parseInt(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
                <option value={25}>25 per page</option>
                <option value={50}>50 per page</option>
                <option value={100}>100 per page</option>
                <option value={200}>200 per page</option>
              </select>
            </div>
            
            {/* Performance Info */}
            <div className="text-sm text-gray-500">
              {performanceMetrics.data_fetch_time && (
                <span>⚡ {Math.round(performanceMetrics.data_fetch_time)}ms</span>
              )}
            </div>
          </div>
        </div>
        
        {/* Table Content */}
        <div className="overflow-x-auto" style={{ maxHeight: '600px' }}>
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <RefreshCw className="h-8 w-8 animate-spin text-blue-600" />
              <span className="ml-2 text-gray-600">Loading data...</span>
            </div>
          ) : error ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <p className="text-red-600 font-medium">{error}</p>
                <button
                  onClick={() => loadData()}
                  className="mt-2 text-blue-600 hover:text-blue-800"
                >
                  Try again
                </button>
              </div>
            </div>
          ) : data.length === 0 ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <Database className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                <p className="text-gray-600">No data found</p>
                <p className="text-sm text-gray-500 mt-1">
                  Try adjusting your filters or upload some data
                </p>
              </div>
            </div>
          ) : (
            <table className="min-w-full divide-y divide-gray-200" ref={tableRef}>
              <thead className="bg-gray-50 sticky top-0">
                <tr>
                  {selectedColumns.map((colKey) => {
                    const col = availableColumns.find(c => c.key === colKey);
                    return (
                      <th
                        key={colKey}
                        className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider"
                        style={{ width: col?.width }}
                      >
                        {col?.label}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {data.map((record, index) => (
                  <tr key={record.tracking_id || index} className="hover:bg-gray-50">
                    {selectedColumns.map((colKey) => (
                      <td key={colKey} className="px-6 py-4 whitespace-nowrap text-sm">
                        {colKey === 'status' ? (
                          <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${getStatusBadgeClass(record[colKey])}`}>
                            {record[colKey] || 'Unknown'}
                          </span>
                        ) : colKey === 'created_at' || colKey === 'updated_at' ? (
                          <span className="text-gray-600">
                            {formatTimestamp(record[colKey])}
                          </span>
                        ) : (
                          <span className="text-gray-900">
                            {record[colKey] || 'N/A'}
                          </span>
                        )}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
          <div className="px-6 py-4 border-t border-gray-200">
            <div className="flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing page {currentPage} of {totalPages} 
                ({formatNumber(totalCount)} total records)
              </div>
              
              <div className="flex items-center space-x-2">
                <button
                  onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                  disabled={currentPage === 1}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Previous
                </button>
                
                <span className="px-3 py-2 text-sm text-gray-700">
                  Page {currentPage}
                </span>
                
                <button
                  onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                  disabled={currentPage === totalPages}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                >
                  Next
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default DataDisplayTable;
