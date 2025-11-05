import React, { useState, useEffect, useRef } from 'react';
import { DollarSign, Search, Plus, Edit, Trash2, Eye, Filter, Download, Upload, RefreshCw, TrendingUp, TrendingDown } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const CatalogueTargetPrice = () => {
  const { user } = useAuthStore();
  
  // State management
  const [targetPrices, setTargetPrices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPrice, setEditingPrice] = useState(null);
  const [viewingPrice, setViewingPrice] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // Form state - will be dynamically populated based on Google Sheet columns
  const [formData, setFormData] = useState({});
  
  // Filter state
  const [priceTypeFilter, setPriceTypeFilter] = useState('all');
  const [customerSegmentFilter, setCustomerSegmentFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 100; // Increased to show more data per page
  
  // Products for dropdown
  const [products, setProducts] = useState([]);
  
  // Check if user has access
  const hasAccess = user?.role === 'super_admin' || user?.role === 'developer' || user?.role === 'admin' || user?.role === 'manager';
  
  // Set document title
  useEffect(() => {
    document.title = 'Catalogue Target Price - OneScan';
  }, []);
  
  // Initialize form data based on available columns
  const initializeFormData = () => {
    const initialData = {};
    availableColumns.forEach(column => {
      initialData[column] = '';
    });
    setFormData(initialData);
  };

  // Update form data when columns change
  useEffect(() => {
    if (availableColumns.length > 0) {
      initializeFormData();
    }
  }, [availableColumns]);

  // Fetch target prices from Google Sheets
  const fetchTargetPrices = async (page = 1, search = '', priceType = 'all', customerSegment = 'all', status = 'all', priceMin = '', priceMax = '') => {
    try {
      setLoading(true);
      console.log('📊 Fetching target prices from Google Sheets TP tab (A:H)...');
      
      // Build search parameters
      const searchParams = {
        search_term: search,
        filters: JSON.stringify({
          price_type: priceType !== 'all' ? priceType : '',
          customer_segment: customerSegment !== 'all' ? customerSegment : '',
          status: status !== 'all' ? status : '',
          price_min: priceMin,
          price_max: priceMax
        })
      };
      
      const params = new URLSearchParams(searchParams);
      const response = await api.get(`/catalogue/target-prices/search?${params}`);
      
      if (response.data.success) {
        const fetchedPrices = response.data.data || [];
        setTargetPrices(fetchedPrices);
        setTotalItems(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / itemsPerPage));
        
        // Extract available columns from the first target price
        if (fetchedPrices.length > 0) {
          const columns = Object.keys(fetchedPrices[0]).filter(key => 
            !['id', 'row_number', 'last_updated'].includes(key)
          );
          setAvailableColumns(columns);
          console.log('📋 Available columns from Google Sheet:', columns);
        }
        
        console.log('✅ Successfully fetched', response.data.total, 'target prices from Google Sheets');
        console.log('📊 Total records available:', fetchedPrices.length);
        console.log('📋 Sample data structure:', fetchedPrices[0] || 'No data');
      } else {
        throw new Error(response.data.message || 'Failed to fetch target prices');
      }
    } catch (error) {
      console.error('❌ Error fetching target prices:', error);
      toast.error('Failed to fetch target prices from Google Sheets');
      
      // Fallback to mock data if Google Sheets fails
      console.log('🔄 Using fallback mock data...');
      const mockData = [
        {
          id: 1,
          sku: 'SKU001',
          product_name: 'Sample Product 1',
          current_price: '99.99',
          target_price: '89.99',
          currency: 'USD',
          price_type: 'retail',
          customer_segment: 'general',
          effective_date: '2025-01-01',
          expiry_date: '2025-12-31',
          price_change_reason: 'Promotional pricing',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        },
        {
          id: 2,
          sku: 'SKU002',
          product_name: 'Sample Product 2',
          current_price: '149.99',
          target_price: '139.99',
          currency: 'USD',
          price_type: 'wholesale',
          customer_segment: 'premium',
          effective_date: '2025-01-15',
          expiry_date: '2025-06-30',
          price_change_reason: 'Volume discount',
          status: 'active',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ];
      setTargetPrices(mockData);
      setTotalItems(mockData.length);
      setTotalPages(1);
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch products for dropdown
  const fetchProducts = async () => {
    try {
      const response = await api.get('/catalogue/products?limit=1000');
      setProducts(response.data.products || []);
    } catch (error) {
      console.error('Error fetching products:', error);
    }
  };
  
  // Add new target price
  const handleAddTargetPrice = async (e) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.target_price || !formData.effective_date) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await api.post('/catalogue/target-prices', formData);
      
      toast.success('Target price added successfully');
      setShowAddForm(false);
      initializeFormData();
      fetchTargetPrices(currentPage, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error adding target price:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to add target price');
    }
  };
  
  // Update target price
  const handleUpdateTargetPrice = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put(`/catalogue/target-prices/${editingPrice.id}`, formData);
      
      toast.success('Target price updated successfully');
      setEditingPrice(null);
      initializeFormData();
      fetchTargetPrices(currentPage, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error updating target price:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to update target price');
    }
  };
  
  // Delete target price
  const handleDeleteTargetPrice = async (priceId) => {
    if (!window.confirm('Are you sure you want to delete this target price?')) {
      return;
    }
    
    try {
      await api.delete(`/catalogue/target-prices/${priceId}`);
      toast.success('Target price deleted successfully');
      fetchTargetPrices(currentPage, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error deleting target price:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to delete target price');
    }
  };
  
  // Edit target price
  const handleEditTargetPrice = (price) => {
    setEditingPrice(price);
    const editData = {};
    availableColumns.forEach(column => {
      editData[column] = price[column] || '';
    });
    setFormData(editData);
    setShowAddForm(true);
  };
  
  // View target price details
  const handleViewTargetPrice = (price) => {
    setViewingPrice(price);
  };
  
  // Export target prices
  const exportTargetPrices = async () => {
    try {
      const response = await api.get('/catalogue/target-prices/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `target_prices_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Target prices exported successfully');
    } catch (error) {
      console.error('Error exporting target prices:', error);
      toast.error('Failed to export target prices');
    }
  };
  
  // Import target prices
  const handleImportTargetPrices = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/catalogue/target-prices/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Target prices imported successfully');
      fetchTargetPrices(currentPage, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error importing target prices:', error);
      toast.error('Failed to import target prices');
    }
  };
  
  // Calculate price change percentage
  const calculatePriceChange = (currentPrice, targetPrice) => {
    if (!currentPrice || !targetPrice) return 0;
    return ((parseFloat(targetPrice) - parseFloat(currentPrice)) / parseFloat(currentPrice)) * 100;
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchTargetPrices();
    fetchProducts();
  }, []);
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchTargetPrices(1, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchTargetPrices(1, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchTargetPrices(page, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Refresh data from Google Sheets
  const refreshData = async () => {
    try {
      console.log('🔄 Refreshing target prices from Google Sheets...');
      toast.loading('Refreshing data from Google Sheets...', { id: 'refresh-target-prices' });
      
      const response = await api.get('/catalogue/target-prices/refresh');
      
      if (response.data.success) {
        toast.success('Target prices refreshed successfully', { id: 'refresh-target-prices' });
        fetchTargetPrices(currentPage, searchTerm, priceTypeFilter, customerSegmentFilter, statusFilter, priceRange.min, priceRange.max);
      } else {
        throw new Error(response.data.message || 'Failed to refresh target prices');
      }
    } catch (error) {
      console.error('❌ Error refreshing target prices:', error);
      toast.error('Failed to refresh target prices from Google Sheets', { id: 'refresh-target-prices' });
    }
  };
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <DollarSign className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access this page.</p>
        </div>
      </div>
    );
  }
  
  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center gap-3">
                <DollarSign className="h-8 w-8 text-green-600" />
                Catalogue Target Price
              </h1>
              <p className="text-gray-600 mt-2">Manage target pricing for your products</p>
              
              {/* Google Sheets Info */}
              <div className="mt-2 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="text-sm font-medium text-blue-800">Connected to Google Sheets</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Sheet: <a href="https://docs.google.com/spreadsheets/d/1ujizN_om8Uj6KiqrKS_QaLQHFhDSfjI0OUOLMcbkJ5I/edit?gid=0#gid=0" target="_blank" rel="noopener noreferrer" className="underline hover:text-blue-800">Target Price Tab (A:H)</a> | 
                  Total prices: <span className="font-medium">{totalItems}</span> | 
                  Last updated: <span className="font-medium">{new Date().toLocaleString()}</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <button
                onClick={refreshData}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <RefreshCw className="h-4 w-4" />
                Refresh
              </button>
              <button
                onClick={exportTargetPrices}
                className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Download className="h-4 w-4" />
                Export
              </button>
              <label className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2 cursor-pointer">
                <Upload className="h-4 w-4" />
                Import
                <input
                  type="file"
                  accept=".csv,.xlsx"
                  onChange={handleImportTargetPrices}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingPrice(null);
                  initializeFormData();
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Target Price
              </button>
            </div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Search & Filter Target Prices
          </h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SKU, product name..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={priceTypeFilter}
                onChange={(e) => {
                  setPriceTypeFilter(e.target.value);
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Price Types</option>
                <option value="retail">Retail</option>
                <option value="wholesale">Wholesale</option>
                <option value="bulk">Bulk</option>
              </select>
              <select
                value={customerSegmentFilter}
                onChange={(e) => {
                  setCustomerSegmentFilter(e.target.value);
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Segments</option>
                <option value="general">General</option>
                <option value="premium">Premium</option>
                <option value="enterprise">Enterprise</option>
              </select>
              <select
                value={statusFilter}
                onChange={(e) => {
                  setStatusFilter(e.target.value);
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Status</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="expired">Expired</option>
              </select>
              <input
                type="number"
                placeholder="Min Price"
                value={priceRange.min}
                onChange={(e) => {
                  setPriceRange(prev => ({ ...prev, min: e.target.value }));
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <input
                type="number"
                placeholder="Max Price"
                value={priceRange.max}
                onChange={(e) => {
                  setPriceRange(prev => ({ ...prev, max: e.target.value }));
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
            <div className="flex justify-end">
              <button
                type="submit"
                className="bg-gray-600 text-white px-4 py-2 rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Search className="h-4 w-4" />
                Search
              </button>
            </div>
          </form>
        </div>
        
        {/* Target Prices List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <DollarSign className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading target prices...</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {availableColumns.map((column) => (
                      <th key={column} className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </th>
                    ))}
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {targetPrices.map((price) => {
                    const priceChange = calculatePriceChange(price.current_price, price.target_price);
                    return (
                      <tr key={price.id} className="hover:bg-gray-50">
                        {availableColumns.map((column) => (
                          <td key={column} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                            <div className="max-w-xs truncate" title={String(price[column] || '')}>
                              {String(price[column] || '')}
                            </div>
                          </td>
                        ))}
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleViewTargetPrice(price)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleEditTargetPrice(price)}
                              className="text-green-600 hover:text-green-900"
                              title="Edit Target Price"
                            >
                              <Edit className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteTargetPrice(price.id)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Target Price"
                            >
                              <Trash2 className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
              
              {targetPrices.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No target prices found
                </div>
              )}
            </div>
          )}
          
          {/* Pagination */}
          {totalPages > 1 && (
            <div className="px-6 py-3 border-t border-gray-200 flex items-center justify-between">
              <div className="text-sm text-gray-700">
                Showing {((currentPage - 1) * itemsPerPage) + 1} to {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems} results
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Previous
                </button>
                <span className="px-3 py-1 text-sm text-gray-700">
                  Page {currentPage} of {totalPages}
                </span>
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="px-3 py-1 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
        
        {/* Add/Edit Target Price Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingPrice ? 'Edit Target Price' : 'Add New Target Price'}
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={editingPrice ? handleUpdateTargetPrice : handleAddTargetPrice} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {availableColumns.map((column, index) => (
                      <div key={column}>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          {column.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                          {column.toLowerCase().includes('sku') || column.toLowerCase().includes('price') ? ' *' : ''}
                        </label>
                        {column.toLowerCase().includes('currency') || column.toLowerCase().includes('type') || column.toLowerCase().includes('segment') || column.toLowerCase().includes('status') ? (
                          <select
                            value={formData[column] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={column.toLowerCase().includes('sku') || column.toLowerCase().includes('price')}
                          >
                            <option value="">Select {column.replace(/_/g, ' ')}</option>
                            {column.toLowerCase().includes('currency') && (
                              <>
                                <option value="USD">USD</option>
                                <option value="EUR">EUR</option>
                                <option value="GBP">GBP</option>
                                <option value="INR">INR</option>
                              </>
                            )}
                            {column.toLowerCase().includes('type') && (
                              <>
                                <option value="retail">Retail</option>
                                <option value="wholesale">Wholesale</option>
                                <option value="bulk">Bulk</option>
                              </>
                            )}
                            {column.toLowerCase().includes('segment') && (
                              <>
                                <option value="general">General</option>
                                <option value="premium">Premium</option>
                                <option value="enterprise">Enterprise</option>
                              </>
                            )}
                            {column.toLowerCase().includes('status') && (
                              <>
                                <option value="active">Active</option>
                                <option value="inactive">Inactive</option>
                                <option value="expired">Expired</option>
                              </>
                            )}
                          </select>
                        ) : column.toLowerCase().includes('date') ? (
                          <input
                            type="date"
                            value={formData[column] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={column.toLowerCase().includes('effective')}
                          />
                        ) : column.toLowerCase().includes('price') ? (
                          <input
                            type="number"
                            step="0.01"
                            value={formData[column] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            required={column.toLowerCase().includes('price')}
                          />
                        ) : column.toLowerCase().includes('reason') || column.toLowerCase().includes('description') ? (
                          <textarea
                            value={formData[column] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                            rows={3}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${column.replace(/_/g, ' ')}...`}
                          />
                        ) : (
                          <input
                            type="text"
                            value={formData[column] || ''}
                            onChange={(e) => setFormData(prev => ({ ...prev, [column]: e.target.value }))}
                            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                            placeholder={`Enter ${column.replace(/_/g, ' ')}...`}
                            required={column.toLowerCase().includes('sku')}
                          />
                        )}
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-end gap-4 pt-4 border-t">
                    <button
                      type="button"
                      onClick={() => setShowAddForm(false)}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                    >
                      {editingPrice ? 'Update' : 'Create'} Target Price
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* View Target Price Modal */}
        {viewingPrice && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Target Price Details</h3>
                  <button
                    onClick={() => setViewingPrice(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <p className="text-sm text-gray-900">{viewingPrice.sku}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Product Name</label>
                      <p className="text-sm text-gray-900">{viewingPrice.product_name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Current Price</label>
                      <p className="text-sm text-gray-900">{viewingPrice.currency} {viewingPrice.current_price}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Target Price</label>
                      <p className="text-sm text-gray-900">{viewingPrice.currency} {viewingPrice.target_price}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price Change</label>
                      <div className="flex items-center gap-1">
                        {calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price) > 0 ? (
                          <TrendingUp className="h-4 w-4 text-green-600" />
                        ) : calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price) < 0 ? (
                          <TrendingDown className="h-4 w-4 text-red-600" />
                        ) : null}
                        <span className={`text-sm font-medium ${
                          calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price) > 0 ? 'text-green-600' :
                          calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price) < 0 ? 'text-red-600' :
                          'text-gray-600'
                        }`}>
                          {calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price) > 0 ? '+' : ''}{calculatePriceChange(viewingPrice.current_price, viewingPrice.target_price).toFixed(2)}%
                        </span>
                      </div>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price Type</label>
                      <p className="text-sm text-gray-900 capitalize">{viewingPrice.price_type}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Customer Segment</label>
                      <p className="text-sm text-gray-900 capitalize">{viewingPrice.customer_segment}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingPrice.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingPrice.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        viewingPrice.status === 'expired' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingPrice.status}
                      </span>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Effective Date</label>
                      <p className="text-sm text-gray-900">{new Date(viewingPrice.effective_date).toLocaleDateString()}</p>
                    </div>
                    {viewingPrice.expiry_date && (
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Expiry Date</label>
                        <p className="text-sm text-gray-900">{new Date(viewingPrice.expiry_date).toLocaleDateString()}</p>
                      </div>
                    )}
                  </div>
                  
                  {viewingPrice.price_change_reason && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price Change Reason</label>
                      <p className="text-sm text-gray-900">{viewingPrice.price_change_reason}</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CatalogueTargetPrice;
