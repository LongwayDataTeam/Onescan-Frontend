import React, { useState, useMemo } from 'react';
import { 
  ChevronLeft, 
  ChevronRight, 
  ChevronsLeft, 
  ChevronsRight,
  Eye,
  EyeOff
} from 'lucide-react';

const DataDisplayTable = ({ 
  data = [],
  loading = false,
  error = null,
  loadingMessage = '',
  isSearching = false,
  currentPage = 1,
  totalPages = 0,
  pageSize = 100,
  onPageChange,
  onPageSizeChange
}) => {
  const [visibleColumns, setVisibleColumns] = useState([
    'tracking_id', 'tracking_no', 'order_id', 'status', 'courier', 'channel_name', 'created_at'
  ]);
  
  const [sortConfig, setSortConfig] = useState({
    key: 'created_at',
    direction: 'desc'
  });
  
  // Available columns
  const columns = [
    { key: 'tracking_id', label: 'Tracking ID', width: 150 },
    { key: 'tracking_no', label: 'Tracking No', width: 150 },
    { key: 'order_id', label: 'Order ID', width: 120 },
    { key: 'g_code', label: 'G Code', width: 100 },
    { key: 'ean', label: 'EAN', width: 120 },
    { key: 'sku', label: 'SKU', width: 120 },
    { key: 'qty', label: 'Qty', width: 80 },
    { key: 'amount', label: 'Amount', width: 100 },
    { key: 'courier', label: 'Courier', width: 100 },
    { key: 'channel_name', label: 'Channel', width: 120 },
    { key: 'status', label: 'Status', width: 120 },
    { key: 'created_at', label: 'Created At', width: 150 },
    { key: 'created_by', label: 'Created By', width: 120 }
  ];
  
  // Sort data
  const sortedData = useMemo(() => {
    if (!sortConfig.key) return data;
    
    return [...data].sort((a, b) => {
      let aVal = a[sortConfig.key];
      let bVal = b[sortConfig.key];
      
      // Handle date sorting
      if (sortConfig.key === 'created_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      }
      
      // Handle numeric sorting
      if (typeof aVal === 'number' && typeof bVal === 'number') {
        return sortConfig.direction === 'asc' ? aVal - bVal : bVal - aVal;
      }
      
      // Handle string sorting
      aVal = String(aVal || '').toLowerCase();
      bVal = String(bVal || '').toLowerCase();
      
      if (aVal < bVal) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });
  }, [data, sortConfig]);
  
  // Handle sorting
  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };
  
  // Handle column visibility
  const toggleColumn = (key) => {
    setVisibleColumns(prev => 
      prev.includes(key) 
        ? prev.filter(col => col !== key)
        : [...prev, key]
    );
  };
  
  // Format status with colors
  const getStatusBadge = (status) => {
    const statusColors = {
      'Unlabeled': 'bg-gray-100 text-gray-800',
      'label_scanned': 'bg-blue-100 text-blue-800',
      'packing': 'bg-yellow-100 text-yellow-800',
      'packing_scanned': 'bg-yellow-100 text-yellow-800',
      'dispatch': 'bg-purple-100 text-purple-800',
      'dispatch_scanned': 'bg-purple-100 text-purple-800',
      'cancelled': 'bg-red-100 text-red-800',
      'cancel': 'bg-red-100 text-red-800'
    };
    
    const color = statusColors[status] || 'bg-gray-100 text-gray-800';
    
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${color}`}>
        {status}
      </span>
    );
  };
  
  // Format amount
  const formatAmount = (amount) => {
    if (typeof amount === 'number') {
      return `₹${amount.toFixed(2)}`;
    }
    return amount || '₹0.00';
  };
  
  // Format date
  const formatDate = (dateString) => {
    if (!dateString) return '-';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dateString;
    }
  };
  
  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading data...</span>
          </div>
    );
  }
  
  if (error) {
    return (
      <div className="text-center py-12">
        <div className="text-red-600 mb-2">Error loading data</div>
        <div className="text-sm text-gray-600">{error}</div>
          </div>
    );
  }
  
  if (loadingMessage) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">{loadingMessage}</span>
          </div>
        </div>
    );
  }
  
  if (isSearching) {
    return (
      <div className="text-center py-12">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-600"></div>
          <span className="ml-2 text-gray-600">🔍 Searching for records...</span>
        </div>
      </div>
    );
  }
  
  if (!data || data.length === 0) {
    return (
      <div className="text-center py-12">
        <div className="text-gray-500 mb-2">No data available</div>
        <div className="text-sm text-gray-400">Try adjusting your filters or upload some data</div>
      </div>
    );
  }
  
  return (
    <div className="space-y-4">
      {/* Table Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-sm text-gray-600">Show columns:</span>
          {columns.map(column => (
          <button
              key={column.key}
              onClick={() => toggleColumn(column.key)}
              className={`px-2 py-1 text-xs rounded ${
                visibleColumns.includes(column.key)
                  ? 'bg-blue-100 text-blue-800'
                  : 'bg-gray-100 text-gray-600'
              }`}
            >
              {visibleColumns.includes(column.key) ? <Eye className="w-3 h-3" /> : <EyeOff className="w-3 h-3" />}
          </button>
          ))}
          </div>
          
        <div className="flex items-center justify-center sm:justify-end space-x-2">
          <span className="text-sm text-gray-600">Page size:</span>
              <select
                value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
                className="px-2 py-1 border border-gray-300 rounded text-sm"
              >
            <option value={50}>50</option>
            <option value={100}>100</option>
            <option value={200}>200</option>
            <option value={500}>500</option>
              </select>
          </div>
        </div>
        
      {/* Data Table */}
      <div className="overflow-x-auto">
        <table className="min-w-full bg-white border border-gray-200 rounded-lg">
          <thead className="bg-gray-50">
            <tr>
              {columns.map(column => (
                visibleColumns.includes(column.key) && (
                  <th
                    key={column.key}
                    className="px-2 sm:px-4 py-2 sm:py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider border-b border-gray-200 cursor-pointer hover:bg-gray-100"
                    onClick={() => handleSort(column.key)}
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {sortConfig.key === column.key && (
                        <span className="text-blue-600">
                          {sortConfig.direction === 'asc' ? '↑' : '↓'}
                        </span>
                      )}
                    </div>
                      </th>
                )
              ))}
                </tr>
              </thead>
          <tbody className="divide-y divide-gray-200">
            {sortedData.map((record, index) => (
                  <tr key={record.tracking_id || index} className="hover:bg-gray-50">
                {visibleColumns.includes('tracking_id') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm font-medium text-gray-900">
                    {record.tracking_id || '-'}
                  </td>
                )}
                {visibleColumns.includes('tracking_no') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.tracking_no || '-'}
                  </td>
                )}
                {visibleColumns.includes('order_id') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.order_id || '-'}
                  </td>
                )}
                {visibleColumns.includes('g_code') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.g_code || '-'}
                  </td>
                )}
                {visibleColumns.includes('ean') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.ean || '-'}
                  </td>
                )}
                {visibleColumns.includes('sku') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.sku || '-'}
                  </td>
                )}
                {visibleColumns.includes('qty') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.qty || '-'}
                  </td>
                )}
                {visibleColumns.includes('amount') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {formatAmount(record.amount)}
                  </td>
                )}
                {visibleColumns.includes('courier') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.courier || '-'}
                  </td>
                )}
                {visibleColumns.includes('channel_name') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.channel_name || '-'}
                  </td>
                )}
                {visibleColumns.includes('status') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm">
                    {getStatusBadge(record.status)}
                  </td>
                )}
                {visibleColumns.includes('created_at') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {formatDate(record.created_at)}
                  </td>
                )}
                {visibleColumns.includes('created_by') && (
                  <td className="px-2 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-600">
                    {record.created_by || '-'}
                      </td>
                )}
                  </tr>
                ))}
              </tbody>
            </table>
        </div>
        
        {/* Pagination */}
        {totalPages > 1 && (
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <button
              onClick={() => onPageChange(1)}
              disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronsLeft className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(currentPage - 1)}
                  disabled={currentPage === 1}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
              <ChevronLeft className="w-4 h-4" />
                </button>
                
            <span className="text-sm text-gray-600">
              Page {currentPage} of {totalPages}
                </span>
                
                <button
              onClick={() => onPageChange(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => onPageChange(totalPages)}
                  disabled={currentPage === totalPages}
              className="p-2 text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
              <ChevronsRight className="w-4 h-4" />
                </button>
              </div>
          
          <div className="text-sm text-gray-600">
            Showing {((currentPage - 1) * pageSize) + 1} to {Math.min(currentPage * pageSize, data.length)} of {data.length} results
            </div>
          </div>
        )}
    </div>
  );
};

export default DataDisplayTable;
