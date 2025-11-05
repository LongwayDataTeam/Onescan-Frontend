import React, { useState, useEffect, useRef } from 'react';
import { Package, Search, Plus, Edit, Trash2, Eye, Filter, Download, Upload, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const CatalogueListing = () => {
  const { user } = useAuthStore();
  
  // State management
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);
  const [viewingProduct, setViewingProduct] = useState(null);
  const [availableColumns, setAvailableColumns] = useState([]);
  
  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    name: '',
    description: '',
    category: '',
    brand: '',
    price: '',
    currency: 'USD',
    weight: '',
    dimensions: '',
    images: [],
    specifications: {},
    tags: [],
    status: 'active'
  });
  
  // Filter state
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [brandFilter, setBrandFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [priceRange, setPriceRange] = useState({ min: '', max: '' });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;
  
  // Categories and brands
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  
  // Check if user has access
  const hasAccess = user?.role === 'super_admin' || user?.role === 'developer' || user?.role === 'admin';
  
  // Set document title
  useEffect(() => {
    document.title = 'Catalogue Listing - OneScan';
  }, []);
  
  // Fetch products from backend
  const fetchProducts = async (page = 1, search = '', category = 'all', brand = 'all', status = 'all', priceMin = '', priceMax = '') => {
    try {
      setLoading(true);
      console.log('📊 Fetching products from Google Sheets...');
      
      // Build search parameters
      const searchParams = {
        search_term: search,
        filters: JSON.stringify({
          category: category !== 'all' ? category : '',
          brand: brand !== 'all' ? brand : '',
          status: status !== 'all' ? status : '',
          price_min: priceMin,
          price_max: priceMax
        })
      };
      
      const params = new URLSearchParams(searchParams);
      const response = await api.get(`/catalogue/listings/search?${params}`);
      
      if (response.data.success) {
        const fetchedProducts = response.data.data || [];
        setProducts(fetchedProducts);
        setTotalItems(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / itemsPerPage));
        
        // Extract available columns from the first product
        if (fetchedProducts.length > 0) {
          const columns = Object.keys(fetchedProducts[0]).filter(key => 
            !['id', 'row_number', 'last_updated'].includes(key)
          );
          setAvailableColumns(columns);
          console.log('📋 Available columns:', columns);
          console.log('📊 Total columns found:', columns.length);
          console.log('📋 First 10 columns:', columns.slice(0, 10));
          console.log('📋 Last 10 columns:', columns.slice(-10));
          
          // Log the actual product data to see what we're getting
          console.log('📊 Sample product data:', fetchedProducts[0]);
        }
        
        console.log('✅ Successfully fetched', response.data.total, 'products from Google Sheets');
      } else {
        throw new Error(response.data.message || 'Failed to fetch products');
      }
    } catch (error) {
      console.error('❌ Error fetching products:', error);
      toast.error('Failed to fetch products from Google Sheets');
      
      // Fallback to mock data if Google Sheets fails
      console.log('🔄 Using fallback mock data...');
      const mockData = [
        {
          id: 1,
          sku: 'SKU001',
          name: 'Sample Product 1',
          description: 'This is a sample product description',
          category: 'Electronics',
          brand: 'Brand A',
          price: '99.99',
          currency: 'USD',
          weight: '0.5',
          dimensions: '10x5x2',
          status: 'active',
          color: 'Black',
          material: 'Plastic',
          warranty: '1 Year',
          supplier: 'Supplier A',
          cost_price: '75.00',
          margin: '33%',
          row_number: 2,
          last_updated: new Date().toISOString()
        },
        {
          id: 2,
          sku: 'SKU002',
          name: 'Sample Product 2',
          description: 'Another sample product description',
          category: 'Clothing',
          brand: 'Brand B',
          price: '49.99',
          currency: 'USD',
          weight: '0.2',
          dimensions: '8x6x1',
          status: 'active',
          color: 'Blue',
          material: 'Cotton',
          warranty: '6 Months',
          supplier: 'Supplier B',
          cost_price: '35.00',
          margin: '43%',
          row_number: 3,
          last_updated: new Date().toISOString()
        }
      ];
      setProducts(mockData);
      setTotalItems(mockData.length);
      setTotalPages(1);
      
      // Extract available columns from mock data
      if (mockData.length > 0) {
        const columns = Object.keys(mockData[0]).filter(key => 
          !['id', 'row_number', 'last_updated'].includes(key)
        );
        setAvailableColumns(columns);
        console.log('📋 Mock data columns:', columns);
      }
    } finally {
      setLoading(false);
    }
  };
  
  // Fetch categories and brands from Google Sheets
  const fetchCategoriesAndBrands = async () => {
    try {
      console.log('📋 Fetching categories and brands from Google Sheets...');
      
      const [categoriesRes, brandsRes] = await Promise.all([
        api.get('/catalogue/listings/filters/category'),
        api.get('/catalogue/listings/filters/brand')
      ]);
      
      if (categoriesRes.data.success) {
        setCategories(categoriesRes.data.data || []);
        console.log('✅ Categories fetched:', categoriesRes.data.data?.length || 0);
      }
      
      if (brandsRes.data.success) {
        setBrands(brandsRes.data.data || []);
        console.log('✅ Brands fetched:', brandsRes.data.data?.length || 0);
      }
    } catch (error) {
      console.error('❌ Error fetching categories and brands:', error);
      // Fallback to default categories and brands
      setCategories(['Electronics', 'Clothing', 'Home & Garden', 'Sports', 'Books']);
      setBrands(['Brand A', 'Brand B', 'Brand C', 'Generic']);
    }
  };
  
  // Add new product
  const handleAddProduct = async (e) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.name || !formData.price) {
      toast.error('Please fill in all required fields');
      return;
    }
    
    try {
      const response = await api.post('/catalogue/products', formData);
      
      toast.success('Product added successfully');
      setShowAddForm(false);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        brand: '',
        price: '',
        currency: 'USD',
        weight: '',
        dimensions: '',
        images: [],
        specifications: {},
        tags: [],
        status: 'active'
      });
      fetchProducts(currentPage, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error adding product:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to add product');
    }
  };
  
  // Update product
  const handleUpdateProduct = async (e) => {
    e.preventDefault();
    
    try {
      const response = await api.put(`/catalogue/products/${editingProduct.id}`, formData);
      
      toast.success('Product updated successfully');
      setEditingProduct(null);
      setFormData({
        sku: '',
        name: '',
        description: '',
        category: '',
        brand: '',
        price: '',
        currency: 'USD',
        weight: '',
        dimensions: '',
        images: [],
        specifications: {},
        tags: [],
        status: 'active'
      });
      fetchProducts(currentPage, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error updating product:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to update product');
    }
  };
  
  // Delete product
  const handleDeleteProduct = async (productId) => {
    if (!window.confirm('Are you sure you want to delete this product?')) {
      return;
    }
    
    try {
      await api.delete(`/catalogue/products/${productId}`);
      toast.success('Product deleted successfully');
      fetchProducts(currentPage, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error deleting product:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to delete product');
    }
  };
  
  // Edit product
  const handleEditProduct = (product) => {
    setEditingProduct(product);
    setFormData({
      sku: product.sku,
      name: product.name,
      description: product.description,
      category: product.category,
      brand: product.brand,
      price: product.price,
      currency: product.currency,
      weight: product.weight,
      dimensions: product.dimensions,
      images: product.images || [],
      specifications: product.specifications || {},
      tags: product.tags || [],
      status: product.status
    });
    setShowAddForm(true);
  };
  
  // View product details
  const handleViewProduct = (product) => {
    setViewingProduct(product);
  };
  
  // Export products
  const exportProducts = async () => {
    try {
      const response = await api.get('/catalogue/products/export', {
        responseType: 'blob'
      });
      
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `products_catalogue_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      
      toast.success('Products exported successfully');
    } catch (error) {
      console.error('Error exporting products:', error);
      toast.error('Failed to export products');
    }
  };
  
  // Import products
  const handleImportProducts = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    
    const formData = new FormData();
    formData.append('file', file);
    
    try {
      const response = await api.post('/catalogue/products/import', formData, {
        headers: {
          'Content-Type': 'multipart/form-data'
        }
      });
      
      toast.success('Products imported successfully');
      fetchProducts(currentPage, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
    } catch (error) {
      console.error('Error importing products:', error);
      toast.error('Failed to import products');
    }
  };
  
  // Load data on component mount
  useEffect(() => {
    fetchProducts();
    fetchCategoriesAndBrands();
  }, []);
  
  // Handle search
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchProducts(1, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Handle filter change
  const handleFilterChange = () => {
    setCurrentPage(1);
    fetchProducts(1, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Handle page change
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchProducts(page, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
  };
  
  // Refresh data
  const refreshData = async () => {
    try {
      console.log('🔄 Force refreshing data from Google Sheets...');
      toast.loading('Refreshing data from Google Sheets...', { id: 'refresh' });
      
      const response = await api.get('/catalogue/listings/refresh');
      
      if (response.data.success) {
        const refreshedProducts = response.data.data || [];
        setProducts(refreshedProducts);
        setTotalItems(response.data.total || 0);
        setTotalPages(Math.ceil((response.data.total || 0) / itemsPerPage));
        
        // Extract available columns from the first product
        if (refreshedProducts.length > 0) {
          const columns = Object.keys(refreshedProducts[0]).filter(key => 
            !['id', 'row_number', 'last_updated'].includes(key)
          );
          setAvailableColumns(columns);
          console.log('📋 Refreshed columns:', columns);
          console.log('📊 Total refreshed columns:', columns.length);
          console.log('📋 First 10 refreshed columns:', columns.slice(0, 10));
          console.log('📋 Last 10 refreshed columns:', columns.slice(-10));
        }
        
        toast.success(`Successfully refreshed ${response.data.total} products from Google Sheets`, { id: 'refresh' });
        console.log('✅ Data refreshed successfully');
      } else {
        throw new Error(response.data.message || 'Failed to refresh data');
      }
    } catch (error) {
      console.error('❌ Error refreshing data:', error);
      toast.error('Failed to refresh data from Google Sheets', { id: 'refresh' });
      
      // Fallback to regular fetch
      fetchProducts(currentPage, searchTerm, categoryFilter, brandFilter, statusFilter, priceRange.min, priceRange.max);
    }
  };

  const showAllColumns = () => {
    if (availableColumns.length > 0) {
      const columnList = availableColumns.map((col, index) => `${index + 1}. ${col}`).join('\n');
      alert(`All Available Columns (${availableColumns.length}):\n\n${columnList}`);
    } else {
      alert('No columns available. Please refresh the data first.');
    }
  };

  const debugData = async () => {
    try {
      console.log('🔍 Debugging Google Sheets data...');
      toast.loading('Debugging Google Sheets data...', { id: 'debug' });
      
      const response = await api.get('/catalogue/listings/debug');
      
      if (response.data.success) {
        const debugInfo = response.data.data[0];
        console.log('🔍 Debug Info:', debugInfo);
        
        toast.success(`Debug complete! Check console for details. Found ${debugInfo.header_count || 0} columns.`, { id: 'debug' });
        
        // Show debug info in an alert for easy viewing
        const debugMessage = `
Debug Information:
- Sheet Found: ${debugInfo.sheet_found}
- Sheet Name: ${debugInfo.sheet_name}
- Row Count: ${debugInfo.row_count || 'N/A'}
- Column Count: ${debugInfo.column_count || 'N/A'}

Method 1 Results:
- Headers Found: ${debugInfo.method1_header_count || 0}
- Data Rows: ${debugInfo.method1_data_rows || 0}

Method 2 Results:
- Headers Found: ${debugInfo.method2_header_count || 0}

Best Result:
- Total Headers: ${debugInfo.best_header_count || 0}

All Headers (first 20):
${debugInfo.all_headers ? debugInfo.all_headers.slice(0, 20).join(', ') : 'None'}
${debugInfo.all_headers && debugInfo.all_headers.length > 20 ? `\n... and ${debugInfo.all_headers.length - 20} more` : ''}
        `;
        
        alert(debugMessage);
      } else {
        throw new Error(response.data.message || 'Failed to debug data');
      }
    } catch (error) {
      console.error('❌ Error debugging data:', error);
      toast.error('Failed to debug Google Sheets data', { id: 'debug' });
    }
  };
  
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
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
                <Package className="h-8 w-8 text-blue-600" />
                Catalogue Listing
              </h1>
              <p className="text-gray-600 mt-2">Manage your product catalogue</p>
              
              {/* Google Sheets Info */}
              <div className="mt-3 p-3 bg-blue-50 border border-blue-200 rounded-lg">
                <div className="flex items-center gap-2 text-sm text-blue-800">
                  <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                  <span className="font-medium">Connected to Google Sheets</span>
                </div>
                <p className="text-xs text-blue-600 mt-1">
                  Data source: 
                  <a 
                    href="https://docs.google.com/spreadsheets/d/1ujizN_om8Uj6KiqrKS_QaLQHFhDSfjI0OUOLMcbkJ5I/edit?gid=0#gid=0" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="underline hover:text-blue-800 ml-1"
                  >
                    Listings Tab
                  </a>
                </p>
        <p className="text-xs text-blue-600">
          Total products: <span className="font-medium">{totalItems}</span> | 
          Columns displayed: <span className="font-medium">{availableColumns.length}</span> | 
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
                onClick={debugData}
                className="bg-purple-600 text-white px-4 py-2 rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 flex items-center gap-2"
              >
                🔍 Debug
              </button>
              <button
                onClick={showAllColumns}
                className="bg-orange-600 text-white px-4 py-2 rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 flex items-center gap-2"
              >
                📋 Show Columns ({availableColumns.length})
              </button>
              <button
                onClick={exportProducts}
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
                  onChange={handleImportProducts}
                  className="hidden"
                />
              </label>
              <button
                onClick={() => {
                  setShowAddForm(true);
                  setEditingProduct(null);
                  setFormData({
                    sku: '',
                    name: '',
                    description: '',
                    category: '',
                    brand: '',
                    price: '',
                    currency: 'USD',
                    weight: '',
                    dimensions: '',
                    images: [],
                    specifications: {},
                    tags: [],
                    status: 'active'
                  });
                }}
                className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
              >
                <Plus className="h-4 w-4" />
                Add Product
              </button>
            </div>
          </div>
        </div>
        
        {/* Search and Filters */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
          <h2 className="text-xl font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Search className="h-5 w-5 text-blue-600" />
            Search & Filter Products
          </h2>
          
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-6 gap-4">
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search by SKU, name, description..."
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
              <select
                value={categoryFilter}
                onChange={(e) => {
                  setCategoryFilter(e.target.value);
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Categories</option>
                {categories.map((category) => (
                  <option key={category.id} value={category.name}>
                    {category.name}
                  </option>
                ))}
              </select>
              <select
                value={brandFilter}
                onChange={(e) => {
                  setBrandFilter(e.target.value);
                  handleFilterChange();
                }}
                className="px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              >
                <option value="all">All Brands</option>
                {brands.map((brand) => (
                  <option key={brand.id} value={brand.name}>
                    {brand.name}
                  </option>
                ))}
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
                <option value="discontinued">Discontinued</option>
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
        
        {/* Products List */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          {loading ? (
            <div className="p-8 text-center">
              <Package className="h-8 w-8 animate-spin mx-auto text-gray-400" />
              <p className="text-gray-500 mt-2">Loading products...</p>
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
                  {products.map((product) => (
                    <tr key={product.id} className="hover:bg-gray-50">
                      {availableColumns.map((column) => (
                        <td key={column} className="px-3 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="max-w-xs truncate" title={String(product[column] || '')}>
                            {String(product[column] || '')}
                          </div>
                        </td>
                      ))}
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleViewProduct(product)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View Details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleEditProduct(product)}
                            className="text-green-600 hover:text-green-900"
                            title="Edit Product"
                          >
                            <Edit className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteProduct(product.id)}
                            className="text-red-600 hover:text-red-900"
                            title="Delete Product"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
              
              {products.length === 0 && (
                <div className="p-8 text-center text-gray-500">
                  No products found
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
        
        {/* Add/Edit Product Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingProduct ? 'Edit Product' : 'Add New Product'}
                  </h3>
                  <button
                    onClick={() => setShowAddForm(false)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
                
                <form onSubmit={editingProduct ? handleUpdateProduct : handleAddProduct} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">SKU *</label>
                      <input
                        type="text"
                        value={formData.sku}
                        onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Name *</label>
                      <input
                        type="text"
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Category</label>
                      <select
                        value={formData.category}
                        onChange={(e) => setFormData(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Category</option>
                        {categories.map((category) => (
                          <option key={category.id} value={category.name}>
                            {category.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Brand</label>
                      <select
                        value={formData.brand}
                        onChange={(e) => setFormData(prev => ({ ...prev, brand: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="">Select Brand</option>
                        {brands.map((brand) => (
                          <option key={brand.id} value={brand.name}>
                            {brand.name}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Price *</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.price}
                        onChange={(e) => setFormData(prev => ({ ...prev, price: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                      <select
                        value={formData.currency}
                        onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="USD">USD</option>
                        <option value="EUR">EUR</option>
                        <option value="GBP">GBP</option>
                        <option value="INR">INR</option>
                      </select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Weight (kg)</label>
                      <input
                        type="number"
                        step="0.01"
                        value={formData.weight}
                        onChange={(e) => setFormData(prev => ({ ...prev, weight: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dimensions</label>
                      <input
                        type="text"
                        value={formData.dimensions}
                        onChange={(e) => setFormData(prev => ({ ...prev, dimensions: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="L x W x H"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                      <select
                        value={formData.status}
                        onChange={(e) => setFormData(prev => ({ ...prev, status: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="active">Active</option>
                        <option value="inactive">Inactive</option>
                        <option value="discontinued">Discontinued</option>
                      </select>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <textarea
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      rows={3}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
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
                      {editingProduct ? 'Update' : 'Create'} Product
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}
        
        {/* View Product Modal */}
        {viewingProduct && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
            <div className="bg-white rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="p-6">
                <div className="flex justify-between items-center mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">Product Details</h3>
                  <button
                    onClick={() => setViewingProduct(null)}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <Trash2 className="h-6 w-6" />
                  </button>
                </div>
                
                <div className="space-y-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">SKU</label>
                      <p className="text-sm text-gray-900">{viewingProduct.sku}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Name</label>
                      <p className="text-sm text-gray-900">{viewingProduct.name}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Category</label>
                      <p className="text-sm text-gray-900">{viewingProduct.category}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Brand</label>
                      <p className="text-sm text-gray-900">{viewingProduct.brand}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Price</label>
                      <p className="text-sm text-gray-900">{viewingProduct.currency} {viewingProduct.price}</p>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Status</label>
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        viewingProduct.status === 'active' ? 'bg-green-100 text-green-800' :
                        viewingProduct.status === 'inactive' ? 'bg-gray-100 text-gray-800' :
                        viewingProduct.status === 'discontinued' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {viewingProduct.status}
                      </span>
                    </div>
                  </div>
                  
                  {viewingProduct.description && (
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Description</label>
                      <p className="text-sm text-gray-900">{viewingProduct.description}</p>
                    </div>
                  )}
                  
                  {(viewingProduct.weight || viewingProduct.dimensions) && (
                    <div className="grid grid-cols-2 gap-4">
                      {viewingProduct.weight && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Weight</label>
                          <p className="text-sm text-gray-900">{viewingProduct.weight} kg</p>
                        </div>
                      )}
                      {viewingProduct.dimensions && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700">Dimensions</label>
                          <p className="text-sm text-gray-900">{viewingProduct.dimensions}</p>
                        </div>
                      )}
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

export default CatalogueListing;
