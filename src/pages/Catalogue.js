import React, { useState, useEffect } from 'react';
import { Plus, Edit, Trash2, Search, Package, Hash, QrCode, Save, X, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuthStore } from '../stores/authStore';
import api from '../services/api';

const Catalogue = () => {
  const { user } = useAuthStore();
  
  // State management
  const [skus, setSkus] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingSku, setEditingSku] = useState(null);
  
  // Form state
  const [formData, setFormData] = useState({
    sku: '',
    eans: [''],
    g_code: '',
    description: ''
  });
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const itemsPerPage = 20;

  // Check if user has access
  const hasAccess = user?.role === 'super_admin' || user?.role === 'developer';
  
  // Fetch SKUs from backend
  const fetchSkus = async (page = 1, search = '') => {
    try {
      setLoading(true);
      const response = await api.get(`/catalogue/skus?page=${page}&limit=${itemsPerPage}&search=${encodeURIComponent(search)}`);
      
      setSkus(response.data.skus || []);
      setTotalPages(response.data.total_pages || 1);
      setTotalItems(response.data.total_items || 0);
    } catch (error) {
      console.error('Error fetching SKUs:', error);
      toast.error('Failed to fetch SKUs');
    } finally {
      setLoading(false);
    }
  };

  // Add new SKU
  const handleAddSku = async (e) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.g_code || formData.eans.length === 0 || formData.eans.every(ean => !ean.trim())) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Filter out empty EANs
      const filteredEans = formData.eans.filter(ean => ean.trim());
      
      const response = await api.post('/catalogue/skus', {
        ...formData,
        eans: filteredEans
      });

      toast.success('SKU added successfully');
      setShowAddForm(false);
      setFormData({ sku: '', eans: [''], g_code: '', description: '' });
      fetchSkus(currentPage, searchTerm);
    } catch (error) {
      console.error('Error adding SKU:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to add SKU');
    }
  };

  // Update SKU
  const handleUpdateSku = async (e) => {
    e.preventDefault();
    
    if (!formData.sku || !formData.g_code || formData.eans.length === 0 || formData.eans.every(ean => !ean.trim())) {
      toast.error('Please fill in all required fields');
      return;
    }

    try {
      // Filter out empty EANs
      const filteredEans = formData.eans.filter(ean => ean.trim());
      
      const response = await api.put(`/catalogue/skus/${editingSku.id}`, {
        ...formData,
        eans: filteredEans
      });

      toast.success('SKU updated successfully');
      setEditingSku(null);
      setFormData({ sku: '', eans: [''], g_code: '', description: '' });
      fetchSkus(currentPage, searchTerm);
    } catch (error) {
      console.error('Error updating SKU:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to update SKU');
    }
  };

  // Delete SKU
  const handleDeleteSku = async (skuId) => {
    if (!window.confirm('Are you sure you want to delete this SKU?')) {
      return;
    }

    try {
      const response = await api.delete(`/catalogue/skus/${skuId}`);

      toast.success('SKU deleted successfully');
      fetchSkus(currentPage, searchTerm);
    } catch (error) {
      console.error('Error deleting SKU:', error);
      toast.error(error.response?.data?.detail || error.message || 'Failed to delete SKU');
    }
  };

  // Edit SKU
  const handleEditSku = (sku) => {
    setEditingSku(sku);
    setFormData({
      sku: sku.sku,
      eans: sku.eans && sku.eans.length > 0 ? sku.eans : [''],
      g_code: sku.g_code,
      description: sku.description || ''
    });
    setShowAddForm(true);
  };

  // Cancel edit
  const handleCancelEdit = () => {
    setEditingSku(null);
    setShowAddForm(false);
    setFormData({ sku: '', eans: [''], g_code: '', description: '' });
  };

  // Add EAN field
  const handleAddEan = () => {
    setFormData(prev => ({
      ...prev,
      eans: [...prev.eans, '']
    }));
  };

  // Remove EAN field
  const handleRemoveEan = (index) => {
    if (formData.eans.length > 1) {
      setFormData(prev => ({
        ...prev,
        eans: prev.eans.filter((_, i) => i !== index)
      }));
    }
  };

  // Update EAN value
  const handleEanChange = (index, value) => {
    setFormData(prev => ({
      ...prev,
      eans: prev.eans.map((ean, i) => i === index ? value : ean)
    }));
  };

  // Search handler
  const handleSearch = (e) => {
    e.preventDefault();
    setCurrentPage(1);
    fetchSkus(1, searchTerm);
  };

  // Pagination handlers
  const handlePageChange = (page) => {
    setCurrentPage(page);
    fetchSkus(page, searchTerm);
  };

  // Load data on component mount
  useEffect(() => {
    if (hasAccess) {
      fetchSkus();
    }
  }, [hasAccess]);

  // Access denied component
  if (!hasAccess) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="mx-auto h-12 w-12 text-red-500 mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600">You don't have permission to access the Catalogue page.</p>
          <p className="text-sm text-gray-500 mt-2">This page is only available to Super Admin and Developer roles.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Catalogue Management</h1>
              <p className="mt-2 text-gray-600">Manage SKU, EAN, and G-Code mappings</p>
            </div>
            <button
              onClick={() => setShowAddForm(true)}
              className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <Plus className="h-5 w-5 mr-2" />
              Add SKU
            </button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Stats */}
        <div className="bg-white rounded-lg shadow mb-6">
          <div className="p-6">
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900">SKU Catalogue</h2>
              <div className="text-sm text-gray-500">
                Total: {totalItems} SKUs
              </div>
            </div>
            
            {/* Search Form */}
            <form onSubmit={handleSearch} className="flex gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by SKU, EAN, or G-Code..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                  />
                </div>
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
              >
                Search
              </button>
            </form>
          </div>
        </div>

        {/* Add/Edit Form Modal */}
        {showAddForm && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-6">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-semibold text-gray-900">
                    {editingSku ? 'Edit SKU' : 'Add New SKU'}
                  </h3>
                  <button
                    onClick={handleCancelEdit}
                    className="text-gray-400 hover:text-gray-600"
                  >
                    <X className="h-6 w-6" />
                  </button>
                </div>

                <form onSubmit={editingSku ? handleUpdateSku : handleAddSku} className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      SKU <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData({ ...formData, sku: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter SKU"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      EANs <span className="text-red-500">*</span>
                    </label>
                    <div className="space-y-2">
                      {formData.eans.map((ean, index) => (
                        <div key={index} className="flex items-center space-x-2">
                          <input
                            type="text"
                            value={ean}
                            onChange={(e) => handleEanChange(index, e.target.value)}
                            className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            placeholder={`Enter EAN ${index + 1}`}
                            required
                          />
                          {formData.eans.length > 1 && (
                            <button
                              type="button"
                              onClick={() => handleRemoveEan(index)}
                              className="p-2 text-red-600 hover:text-red-800 hover:bg-red-50 rounded-md"
                              title="Remove EAN"
                            >
                              <X className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      ))}
                      <button
                        type="button"
                        onClick={handleAddEan}
                        className="flex items-center text-blue-600 hover:text-blue-800 text-sm font-medium"
                      >
                        <Plus className="h-4 w-4 mr-1" />
                        Add another EAN
                      </button>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      G-Code <span className="text-red-500">*</span>
                    </label>
                    <input
                      type="text"
                      value={formData.g_code}
                      onChange={(e) => setFormData({ ...formData, g_code: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter G-Code"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                      placeholder="Enter description (optional)"
                    />
                  </div>

                  <div className="flex justify-end space-x-3 pt-4">
                    <button
                      type="button"
                      onClick={handleCancelEdit}
                      className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <Save className="h-4 w-4 mr-2 inline" />
                      {editingSku ? 'Update' : 'Add'} SKU
                    </button>
                  </div>
                </form>
              </div>
            </div>
          </div>
        )}

        {/* SKU Table */}
        <div className="bg-white rounded-lg shadow overflow-hidden">
          {loading ? (
            <div className="p-8 text-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto"></div>
              <p className="mt-2 text-gray-600">Loading SKUs...</p>
            </div>
          ) : (
            <>
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        SKU
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        EAN
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        G-Code
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Description
                      </th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Created
                      </th>
                      <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                        Actions
                      </th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {skus.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-6 py-8 text-center text-gray-500">
                          <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                          <p>No SKUs found</p>
                          <p className="text-sm">Add your first SKU to get started</p>
                        </td>
                      </tr>
                    ) : (
                      skus.map((sku) => (
                        <tr key={sku.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Package className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm font-medium text-gray-900">{sku.sku}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <div className="space-y-1">
                              {sku.eans && sku.eans.length > 0 ? (
                                sku.eans.map((ean, index) => (
                                  <div key={index} className="flex items-center">
                                    <QrCode className="h-4 w-4 text-gray-400 mr-2 flex-shrink-0" />
                                    <span className="text-sm text-gray-900">{ean}</span>
                                  </div>
                                ))
                              ) : (
                                <span className="text-sm text-gray-500">No EANs</span>
                              )}
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <Hash className="h-5 w-5 text-gray-400 mr-2" />
                              <span className="text-sm text-gray-900">{sku.g_code}</span>
                            </div>
                          </td>
                          <td className="px-6 py-4">
                            <span className="text-sm text-gray-900">{sku.description || '-'}</span>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                            {new Date(sku.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                            <div className="flex justify-end space-x-2">
                              <button
                                onClick={() => handleEditSku(sku)}
                                className="text-blue-600 hover:text-blue-900"
                                title="Edit SKU"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => handleDeleteSku(sku.id)}
                                className="text-red-600 hover:text-red-900"
                                title="Delete SKU"
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="bg-white px-4 py-3 flex items-center justify-between border-t border-gray-200 sm:px-6">
                  <div className="flex-1 flex justify-between sm:hidden">
                    <button
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1}
                      className="relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Previous
                    </button>
                    <button
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages}
                      className="ml-3 relative inline-flex items-center px-4 py-2 border border-gray-300 text-sm font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Next
                    </button>
                  </div>
                  <div className="hidden sm:flex-1 sm:flex sm:items-center sm:justify-between">
                    <div>
                      <p className="text-sm text-gray-700">
                        Showing <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> to{' '}
                        <span className="font-medium">
                          {Math.min(currentPage * itemsPerPage, totalItems)}
                        </span>{' '}
                        of <span className="font-medium">{totalItems}</span> results
                      </p>
                    </div>
                    <div>
                      <nav className="relative z-0 inline-flex rounded-md shadow-sm -space-x-px">
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1}
                          className="relative inline-flex items-center px-2 py-2 rounded-l-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Previous
                        </button>
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map((page) => (
                          <button
                            key={page}
                            onClick={() => handlePageChange(page)}
                            className={`relative inline-flex items-center px-4 py-2 border text-sm font-medium ${
                              page === currentPage
                                ? 'z-10 bg-blue-50 border-blue-500 text-blue-600'
                                : 'bg-white border-gray-300 text-gray-500 hover:bg-gray-50'
                            }`}
                          >
                            {page}
                          </button>
                        ))}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages}
                          className="relative inline-flex items-center px-2 py-2 rounded-r-md border border-gray-300 bg-white text-sm font-medium text-gray-500 hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                        >
                          Next
                        </button>
                      </nav>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default Catalogue;
