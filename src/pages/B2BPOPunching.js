import React, { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { Plus, Edit, Trash2, Search, XCircle, Eye, Database, Upload, FileText, Image, RefreshCw, Truck, Package, CheckCircle, Calendar, Clock, MapPin, User, DollarSign } from 'lucide-react';
import toast from 'react-hot-toast';
import api from '../services/api';
import { useAuthStore } from '../stores/authStore';

const B2BPOPunching = () => {
  const { user } = useAuthStore();
  const location = useLocation();
  const [poList, setPOList] = useState([]);
  const [poListLoading, setPOListLoading] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingPO, setEditingPO] = useState(null);
  
  // Determine initial tab based on route
  const [activeTab, setActiveTab] = useState(() => {
    const path = location.pathname;
    if (path === '/b2b-dashboard') return 'dashboard';
    if (path === '/b2b-pending-po') return 'pending';
    if (path === '/b2b-planning-po') return 'planned';
    if (path === '/b2b-dispatch-po') return 'dispatched';
    if (path === '/b2b-delivered-po') return 'delivered';
    return 'dashboard'; // default for /b2b-po-punching
  });
  
  // Update tab when route changes
  useEffect(() => {
    const path = location.pathname;
    if (path === '/b2b-dashboard') {
      setActiveTab('dashboard');
    } else if (path === '/b2b-pending-po') {
      setActiveTab('pending');
    } else if (path === '/b2b-planning-po') {
      setActiveTab('planned');
    } else if (path === '/b2b-dispatch-po') {
      setActiveTab('dispatched');
    } else if (path === '/b2b-delivered-po') {
      setActiveTab('delivered');
    } else if (path === '/b2b-po-punching') {
      setActiveTab('dashboard');
    }
  }, [location.pathname]);
  
  // Filter states
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [platformFilter, setPlatformFilter] = useState('');
  const [skuFilter, setSkuFilter] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  
  // Form state for new PO
  const [formData, setFormData] = useState({
    platform: '',
    po_number: '',
    t_wh: '',
    po_date: '',
    po_expire: '',
    location: '',
    lid: '',
    quantity: '',
    rate: '',
    sku: '',
    description: '',
    currency: 'INR',
    status: 'pending',
    items: [],
    uploaded_files: [],
    planning_items: []
  });

  // Planning state
  const [showPlanningModal, setShowPlanningModal] = useState(false);
  const [selectedPOForPlanning, setSelectedPOForPlanning] = useState(null);
  const [planningItems, setPlanningItems] = useState([]);
  
  // Paste preview state
  const [pastePreview, setPastePreview] = useState([]);
  const [showPastePreview, setShowPastePreview] = useState(false);
  const [selectedPasteRow, setSelectedPasteRow] = useState(0);
  const [showPODetails, setShowPODetails] = useState(false);
  const [selectedPODetails, setSelectedPODetails] = useState(null);
  
  // Target price data state
  const [targetPriceData, setTargetPriceData] = useState([]);
  
  // File upload states
  const [uploadedFiles, setUploadedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  
  // Dispatch states
  const [showDispatchModal, setShowDispatchModal] = useState(false);
  const [selectedPOForDispatch, setSelectedPOForDispatch] = useState(null);
  const [dispatchData, setDispatchData] = useState({
    courier: '',
    dispatchDate: new Date().toISOString().split('T')[0],
    notes: '',
    // New fields
    dispatchQty: {},
    invoiceFile: null,
    vehicleNo: '',
    waybillNo: '',
    eWaybillNo: '',
    waybillFile: null,
    eWaybillFile: null,
    appointmentDate: '',
    proofOfDispatchFile: null
  });
  
  // SKU Breakdown Modal states
  const [showSKUBreakdownModal, setShowSKUBreakdownModal] = useState(false);
  const [selectedSKUBreakdown, setSelectedSKUBreakdown] = useState(null);
  const [showDispatchDetailsModal, setShowDispatchDetailsModal] = useState(false);
  const [selectedDispatchDetails, setSelectedDispatchDetails] = useState(null);
  
  // Delivered Quantity Details Modal
  const [showDeliveredQtyModal, setShowDeliveredQtyModal] = useState(false);
  const [selectedDeliveredQtyPO, setSelectedDeliveredQtyPO] = useState(null);
  
  const openDeliveredQtyModal = (po) => {
    setSelectedDeliveredQtyPO(po);
    setShowDeliveredQtyModal(true);
  };
  
  const closeDeliveredQtyModal = () => {
    setShowDeliveredQtyModal(false);
    setSelectedDeliveredQtyPO(null);
  };

  // Delivered modal state
  const [showDeliveredModal, setShowDeliveredModal] = useState(false);
  const [selectedPOForDelivery, setSelectedPOForDelivery] = useState(null);
  const [deliverySubmitting, setDeliverySubmitting] = useState(false);
  const [deliveryForm, setDeliveryForm] = useState({
    podFile: null,
    unloadingCharges: '',
    forwardCost: '',
    reverseCost: '',
    remark: '',
    reattempts: [
      { code: '', cost: '' }
    ],
    skuDeliveries: {}
  });

  const openDeliveredModal = (po) => {
    setSelectedPOForDelivery(po);
    // Preload per-SKU delivery rows from dispatch quantities
    const dispatchQtyMap = (po?.dispatch_data?.dispatch_qty) || {};
    // Map SKU to LID from PO items
    const skuToLid = (po?.items || []).reduce((acc, item) => {
      if (item && item.sku) {
        acc[item.sku] = item.lid || item.LID || '';
      }
      return acc;
    }, {});
    const skuDeliveries = Object.keys(dispatchQtyMap).reduce((acc, sku) => {
      acc[sku] = {
        dispatch_qty: Number(dispatchQtyMap[sku]) || 0,
        delivered_qty: '',
        reject_qty: '',
        short_qty: '',
        excess_qty: '',
        reverse_qty: 0,
        lid: skuToLid[sku] || ''
      };
      return acc;
    }, {});
    setDeliveryForm({
      podFile: null,
      unloadingCharges: '',
      forwardCost: '',
      reverseCost: '',
      remark: '',
      reattempts: [
        { code: '', cost: '' }
      ],
      skuDeliveries
    });
    setShowDeliveredModal(true);
  };

  const closeDeliveredModal = () => {
    setShowDeliveredModal(false);
    setSelectedPOForDelivery(null);
  };

  const handleDeliveryInputChange = (e) => {
    const { name, value } = e.target;
    setDeliveryForm(prev => ({ ...prev, [name]: value }));
  };

  const handlePODFileChange = (e) => {
    const file = e.target.files && e.target.files[0] ? e.target.files[0] : null;
    setDeliveryForm(prev => ({ ...prev, podFile: file }));
  };

  const handleReattemptChange = (index, field, value) => {
    setDeliveryForm(prev => {
      const next = { ...prev };
      next.reattempts = next.reattempts.map((ra, i) => i === index ? { ...ra, [field]: value } : ra);
      return next;
    });
  };

  const addReattemptRow = () => {
    setDeliveryForm(prev => ({ ...prev, reattempts: [...prev.reattempts, { code: '', cost: '' }] }));
  };

  const removeReattemptRow = (index) => {
    setDeliveryForm(prev => ({ ...prev, reattempts: prev.reattempts.filter((_, i) => i !== index) }));
  };

  const getReattemptTotal = () => {
    return deliveryForm.reattempts.reduce((sum, ra) => sum + (parseFloat(ra.cost) || 0), 0);
  };

  const handleSkuDeliveryChange = (sku, field, value) => {
    setDeliveryForm(prev => {
      const next = { ...prev, skuDeliveries: { ...prev.skuDeliveries } };
      const row = { ...next.skuDeliveries[sku], [field]: value };
      // Keep reverse_qty as Reject + Excess, auto-calc
      const rejectVal = field === 'reject_qty' ? (Number(value) || 0) : (Number(row.reject_qty) || 0);
      const excessVal = field === 'excess_qty' ? (Number(value) || 0) : (Number(row.excess_qty) || 0);
      row.reverse_qty = rejectVal + excessVal;
      next.skuDeliveries[sku] = row;
      return next;
    });
  };

  const submitDelivered = async () => {
    if (!selectedPOForDelivery) return;
    try {
      setDeliverySubmitting(true);

      let uploadedPodMeta = null;
      if (deliveryForm.podFile) {
        const formDataObj = new FormData();
        formDataObj.append('file', deliveryForm.podFile);
        formDataObj.append('po_number', selectedPOForDelivery.po_number);
        formDataObj.append('file_type', 'pod');
        const uploadResp = await api.post('/gcs-po/upload-file', formDataObj, {
          headers: { 'Content-Type': 'multipart/form-data' }
        });   
        if (uploadResp.data?.ok) {
          uploadedPodMeta = uploadResp.data.data;
        } else {
          toast.error('POD upload failed');
          return;
        }
      }

      const reattempt_total = getReattemptTotal();
      const total_logistic_cost =
        (parseFloat(deliveryForm.unloadingCharges) || 0) +
        (parseFloat(deliveryForm.forwardCost) || 0) +
        (parseFloat(deliveryForm.reverseCost) || 0) +
        reattempt_total;

      const sku_delivery = Object.fromEntries(
        Object.entries(deliveryForm.skuDeliveries || {}).map(([sku, row]) => [
          sku,
          {
            dispatch_qty: Number(row.dispatch_qty) || 0,
            delivered_qty: row.delivered_qty === '' ? 0 : Number(row.delivered_qty),
            reject_qty: row.reject_qty === '' ? 0 : Number(row.reject_qty),
            short_qty: row.short_qty === '' ? 0 : Number(row.short_qty),
            excess_qty: row.excess_qty === '' ? 0 : Number(row.excess_qty),
            reverse_qty: (Number(row.reject_qty) || 0) + (Number(row.excess_qty) || 0)
          }
        ])
      );

      const deliveredPayload = {
        status: 'delivered',
        delivered_data: {
          delivered_date: new Date().toISOString(),
          delivered_by: user?.username || user?.user_id || 'Unknown',
          pod_file: uploadedPodMeta,
          unloading_charges: deliveryForm.unloadingCharges ? Number(deliveryForm.unloadingCharges) : 0,
          forward_cost: deliveryForm.forwardCost ? Number(deliveryForm.forwardCost) : 0,
          reverse_cost: deliveryForm.reverseCost ? Number(deliveryForm.reverseCost) : 0,
          remark: deliveryForm.remark || '',
          reattempts: deliveryForm.reattempts.map(r => ({ code: r.code, cost: r.cost ? Number(r.cost) : 0 })),
          reattempt_total,
          total_logistic_cost,
          sku_delivery
        }
      };

      const resp = await api.put(`/gcs-po/po-test/${selectedPOForDelivery.po_number}`, deliveredPayload);
      if (resp.data?.ok) {
        // Refetch PO list to get the latest data from backend
        await fetchPOList();
        toast.success('PO marked as Delivered');
        closeDeliveredModal();
      } else {
        toast.error(resp.data?.message || 'Failed to mark as delivered');
      }
    } catch (err) {
      toast.error(err.response?.data?.detail || err.message || 'Failed to mark as delivered');
    } finally {
      setDeliverySubmitting(false);
    }
  };
  
  // File upload handler
  const handleFileUpload = async (event) => {
    const files = Array.from(event.target.files);
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/jpg', 'image/png'];
    const maxSize = 10 * 1024 * 1024; // 10MB
    
    // Validate files
    const validFiles = files.filter(file => {
      if (!allowedTypes.includes(file.type)) {
        toast.error(`${file.name} is not a valid file type. Only PDF, JPEG, JPG, PNG are allowed.`);
        return false;
      }
      if (file.size > maxSize) {
        toast.error(`${file.name} is too large. Maximum size is 10MB.`);
        return false;
      }
      return true;
    });
    
    if (validFiles.length === 0) return;
    
    // Check if PO number is available
    if (!formData.po_number || formData.po_number.trim() === '') {
      toast.error('Please enter PO Number before uploading files');
      return;
    }
    
    setIsUploading(true);
    setUploadProgress(0);
    
    try {
      const uploadPromises = validFiles.map(async (file, index) => {
        const formDataObj = new FormData();
        formDataObj.append('file', file);
        formDataObj.append('po_number', formData.po_number.trim());
        formDataObj.append('file_type', 'po_document');
        
        // Simulate upload progress
        const progressInterval = setInterval(() => {
          setUploadProgress(prev => Math.min(prev + 10, (index + 1) * 20));
        }, 100);
        
        try {
          const response = await api.post('/gcs-po/upload-file', formDataObj, {
            headers: { 'Content-Type': 'multipart/form-data' },
            onUploadProgress: (progressEvent) => {
              const progress = Math.round((progressEvent.loaded * 100) / progressEvent.total);
              setUploadProgress(progress);
            }
          });
          
          clearInterval(progressInterval);
          
          if (response.data.ok) {
            return {
              id: response.data.data.file_id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: response.data.data.file_url,
              uploaded_at: new Date().toISOString()
            };
          } else {
            throw new Error(response.data.message || 'Upload failed');
          }
        } catch (error) {
          clearInterval(progressInterval);
          throw error;
        }
      });
      
      const uploadedFileData = await Promise.all(uploadPromises);
      setUploadedFiles(prev => [...prev, ...uploadedFileData]);
      toast.success(`Successfully uploaded ${uploadedFileData.length} file(s)`);
      
    } catch (error) {
      console.error('File upload error:', error);
      toast.error(`Failed to upload files: ${error.message}`);
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
    }
  };
  
  // Remove file handler
  const handleRemoveFile = async (fileId) => {
    try {
      await api.delete(`/gcs-po/delete-file/${fileId}`);
      setUploadedFiles(prev => prev.filter(file => file.id !== fileId));
      toast.success('File removed successfully');
    } catch (error) {
      console.error('File removal error:', error);
      toast.error('Failed to remove file');
    }
  };

  // Dispatch handlers
  const handleOpenDispatch = (po) => {
    setSelectedPOForDispatch(po);
    
    // Initialize dispatch quantities based on planning quantities
    const dispatchQty = {};
    
    // Try different data structures for items
    const items = po.planning_items || po.items || [];
    if (items && items.length > 0) {
      items.forEach(item => {
        const hasPlanningQty = (item.planned_qty || item.planning_qty || 0) > 0;
        const isSelected = item.selected_for_planning === true;
        const sku = item.sku || item.lid;
        
        if ((hasPlanningQty || isSelected) && sku) {
          const qty = item.planned_qty || item.planning_qty || item.quantity || 0;
          dispatchQty[sku] = qty;
        }
      });
    }
    
    console.log('Initialized dispatch quantities:', dispatchQty);
    
    setDispatchData({
      courier: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      notes: '',
      // New fields
      dispatchQty: dispatchQty,
      invoiceFile: null,
      vehicleNo: '',
      waybillNo: '',
      eWaybillNo: '',
      waybillFile: null,
      eWaybillFile: null,
      appointmentDate: '',
      proofOfDispatchFile: null
    });
    setShowDispatchModal(true);
  };

  const handleDispatchSubmit = async () => {
    try {
      if (!dispatchData.courier) {
        toast.error('Please select a courier');
        return;
      }

      // Validate dispatch quantities against planned quantities
      const validationErrors = [];
      if (dispatchData.dispatchQty) {
        Object.entries(dispatchData.dispatchQty).forEach(([sku, dispatchQty]) => {
          const plannedItem = selectedPOForDispatch.planning_items?.find(item => item.sku === sku);
          if (plannedItem && dispatchQty > plannedItem.planned_qty) {
            validationErrors.push(`${sku}: Dispatch quantity (${dispatchQty}) exceeds planned quantity (${plannedItem.planned_qty})`);
          }
        });
      }

      if (validationErrors.length > 0) {
        toast.error(`❌ Dispatch quantities exceed planned quantities:\n${validationErrors.join('\n')}`);
        return;
      }

      // Upload dispatch files first
      const filesToUpload = {
        invoice: dispatchData.invoiceFile,
        waybill: dispatchData.waybillFile,
        e_waybill: dispatchData.eWaybillFile,
        proof_of_dispatch: dispatchData.proofOfDispatchFile
      };

      console.log('📁 Files to upload:', filesToUpload);
      console.log('📁 Invoice file:', dispatchData.invoiceFile);
      console.log('📁 Waybill file:', dispatchData.waybillFile);
      console.log('📁 E-Waybill file:', dispatchData.eWaybillFile);
      console.log('📁 Proof of Dispatch file:', dispatchData.proofOfDispatchFile);

      console.log('Uploading dispatch files...');
      const uploadedFiles = await uploadDispatchFiles(selectedPOForDispatch.po_number, filesToUpload);
      console.log('Uploaded files:', uploadedFiles);

      const dispatchPayload = {
        po_number: selectedPOForDispatch.po_number,
        courier: dispatchData.courier,
        dispatch_date: dispatchData.dispatchDate,
        notes: dispatchData.notes,
        dispatched_by: user?.username || 'unknown_user',
        status: 'dispatched',
        // New fields
        dispatch_qty: Object.fromEntries(
          Object.entries(dispatchData.dispatchQty || {}).map(([sku, qty]) => [sku, parseFloat(qty) || 0.0])
        ),
        vehicle_no: dispatchData.vehicleNo,
        waybill_no: dispatchData.waybillNo,
        e_waybill_no: dispatchData.eWaybillNo,
        appointment_date: dispatchData.appointmentDate ? dispatchData.appointmentDate : null, // Ensure null instead of empty string
        // Use uploaded file references
        files: uploadedFiles
      };

      console.log('Dispatching PO:', dispatchPayload);
      console.log('Dispatch quantities:', dispatchData.dispatchQty);
      console.log('Dispatch quantities type:', typeof dispatchData.dispatchQty);
      console.log('Dispatch quantities keys:', Object.keys(dispatchData.dispatchQty || {}));
      console.log('Processed dispatch_qty:', Object.fromEntries(
        Object.entries(dispatchData.dispatchQty || {}).map(([sku, qty]) => [sku, parseFloat(qty) || 0.0])
      ));
      console.log('Appointment Date Value:', dispatchData.appointmentDate);
      console.log('Appointment Date Type:', typeof dispatchData.appointmentDate);
      console.log('Files being sent:', uploadedFiles);

      // Call dispatch API
      const response = await api.post('/gcs-po/dispatch-po', dispatchPayload);
      
      if (response.data.success) {
        toast.success(`PO ${selectedPOForDispatch.po_number} dispatched successfully!`);
        setShowDispatchModal(false);
        setSelectedPOForDispatch(null);
        // Refresh PO list
        await fetchPOList();
      } else {
        throw new Error(response.data.message || 'Failed to dispatch PO');
      }
    } catch (error) {
      console.error('Error dispatching PO:', error);
      
      // Handle validation errors from backend
      if (error.response?.status === 422) {
        const errorDetail = error.response?.data?.detail;
        if (errorDetail && errorDetail.includes('exceeds planned quantity')) {
          toast.error(`❌ ${errorDetail}`);
        } else {
          toast.error(`❌ Validation Error: ${errorDetail || 'Invalid dispatch data'}`);
        }
      } else {
      toast.error(`Failed to dispatch PO: ${error.response?.data?.message || error.message}`);
      }
    }
  };

  const handleDispatchCancel = () => {
    setShowDispatchModal(false);
    setSelectedPOForDispatch(null);
    setDispatchData({
      courier: '',
      dispatchDate: new Date().toISOString().split('T')[0],
      notes: '',
      // New fields
      dispatchQty: {},
      invoiceFile: null,
      vehicleNo: '',
      waybillNo: '',
      eWaybillNo: '',
      waybillFile: null,
      eWaybillFile: null,
      appointmentDate: '',
      proofOfDispatchFile: null
    });
  };

  // Delete dispatch data
  const handleDeleteDispatch = async (po) => {
    if (!window.confirm(`Are you sure you want to delete dispatch data for PO ${po.po_number}? This will revert the PO back to planning status.`)) {
      return;
    }

    try {
      const response = await api.delete(`/gcs-po/dispatch-po/${po.po_number}`);
      
      if (response.data.success) {
        toast.success(`Dispatch data deleted successfully for PO ${po.po_number}`);
        // Refresh PO list
        await fetchPOList();
      } else {
        throw new Error(response.data.message || 'Failed to delete dispatch data');
      }
    } catch (error) {
      console.error('Error deleting dispatch data:', error);
      toast.error(`Failed to delete dispatch data: ${error.response?.data?.message || error.message}`);
    }
  };

  // Dispatch file upload handlers
  const handleDispatchFileUpload = (fileType, file) => {
    console.log(`📁 File upload handler called for ${fileType}:`, file);
    console.log(`📁 File name:`, file?.name);
    console.log(`📁 File size:`, file?.size);
    console.log(`📁 File type:`, file?.type);
    
    setDispatchData(prev => {
      const newData = {
      ...prev,
      [fileType]: file
      };
      console.log(`📁 Updated dispatch data for ${fileType}:`, newData[fileType]);
      return newData;
    });
  };

  // Upload dispatch files to server
  const uploadDispatchFiles = async (poNumber, files) => {
    const uploadedFiles = {};
    
    console.log('🚀 Starting file upload process...');
    console.log('PO Number:', poNumber);
    console.log('Files to upload:', files);
    
    for (const [fileType, file] of Object.entries(files)) {
      if (file) {
        try {
          console.log(`📤 Uploading ${fileType} file:`, file.name, file.size, file.type);
          
          const formData = new FormData();
          formData.append('file', file);
          formData.append('po_number', poNumber);
          formData.append('file_type', fileType);
          formData.append('category', 'dispatch'); // Mark as dispatch files
          
          console.log('FormData created, sending request...');
          
          const response = await api.post('/gcs-po/upload-dispatch-file', formData, {
            headers: {
              'Content-Type': 'multipart/form-data',
            },
          });
          
          console.log('Upload response:', response.data);
          
          if (response.data.success) {
            uploadedFiles[fileType] = {
              id: response.data.file_id,
              name: file.name,
              type: file.type,
              size: file.size,
              url: response.data.file_url,
              serve_url: response.data.serve_url,
              uploaded_at: new Date().toISOString()
            };
            console.log(`✅ ${fileType} uploaded successfully:`, response.data.file_url);
            toast.success(`${fileType} file uploaded successfully`);
          } else {
            console.error(`❌ Failed to upload ${fileType}:`, response.data.message);
            toast.error(`Failed to upload ${fileType}: ${response.data.message}`);
          }
        } catch (error) {
          console.error(`❌ Error uploading ${fileType}:`, error);
          console.error('Error details:', error.response?.data);
          toast.error(`Error uploading ${fileType}: ${error.response?.data?.detail || error.message}`);
        }
      } else {
        console.log(`⏭️ Skipping ${fileType} - no file selected`);
      }
    }
    
    console.log('📋 Final uploaded files:', uploadedFiles);
    return uploadedFiles;
  };

  const handleDispatchQtyChange = (sku, qty) => {
    setDispatchData(prev => ({
      ...prev,
      dispatchQty: {
        ...prev.dispatchQty,
        [sku]: parseFloat(qty) || 0
      }
    }));
  };

  // Sync all files handler
  const handleSyncAllFiles = async () => {
    try {
      console.log('🔄 Starting sync all files...');
      toast.loading('Syncing all PO files...', { id: 'sync-files' });
      
      const response = await api.post('/gcs-po/sync-all-files-test');
      
      if (response.data.ok) {
        toast.success('All PO files synced successfully!', { id: 'sync-files' });
        console.log('✅ Sync completed:', response.data.data.script_output);
        
        // Refresh PO list to show updated file links
        await fetchPOList();
      } else {
        throw new Error(response.data.message || 'Sync failed');
      }
    } catch (error) {
      console.error('❌ Sync error:', error);
      toast.error(`Failed to sync files: ${error.response?.data?.detail || error.message}`, { id: 'sync-files' });
    }
  };

  // Planning handlers
  const handleOpenPlanning = (po) => {
    setSelectedPOForPlanning(po);
    // Initialize planning items with PO items, all unchecked
    const initialPlanningItems = po.items.map(item => ({
      ...item,
      selected_for_planning: false,
      planned_qty: 0
    }));
    setPlanningItems(initialPlanningItems);
    setShowPlanningModal(true);
  };

  const handlePlanningItemToggle = (index) => {
    setPlanningItems(prev => prev.map((item, i) => 
      i === index 
        ? { ...item, selected_for_planning: !item.selected_for_planning, planned_qty: !item.selected_for_planning ? item.quantity : 0 }
        : item
    ));
  };

  const handlePlanningQtyChange = (index, qty) => {
    setPlanningItems(prev => prev.map((item, i) => 
      i === index ? { ...item, planned_qty: parseFloat(qty) || 0 } : item
    ));
  };

  const handleSavePlanning = async () => {
    try {
      const selectedItems = planningItems.filter(item => item.selected_for_planning);
      
      if (selectedItems.length === 0) {
        toast.error('Please select at least one item for planning');
        return;
      }

      const planningData = {
        ...selectedPOForPlanning,
        status: 'planning',
        planning_items: selectedItems,
        planned_qty_total: selectedItems.reduce((sum, item) => sum + (item.planned_qty || 0), 0),
        planned_amount_total: selectedItems.reduce((sum, item) => sum + ((item.planned_qty || 0) * (item.unit_price || 0)), 0)
      };

      const response = await api.put(`/gcs-po/po-test/${selectedPOForPlanning.po_number}`, planningData);
      
      if (response.data.ok) {
        toast.success('Planning saved successfully!');
        setShowPlanningModal(false);
        await fetchPOList();
      } else {
        throw new Error(response.data.message || 'Failed to save planning');
      }
    } catch (error) {
      console.error('Planning save error:', error);
      toast.error(`Failed to save planning: ${error.response?.data?.detail || error.message}`);
    }
  };
  
  // Fetch target price data
  const fetchTargetPriceData = async () => {
    try {
      console.log('📊 Fetching target price data for PO validation...');
      const response = await api.get('/catalogue/target-prices');
      
      if (response.data.success) {
        setTargetPriceData(response.data.data || []);
        console.log('✅ Successfully fetched', response.data.data.length, 'target price records');
      } else {
        console.warn('⚠️ Failed to fetch target price data:', response.data.message);
      }
    } catch (error) {
      console.error('❌ Error fetching target price data:', error);
      // Don't show error toast as this is background data
    }
  };

  // Match target price data with PO items
  const getTargetPriceForItem = (item, poDate) => {
    if (!targetPriceData.length || !poDate) return null;
    
    try {
      const poDateObj = new Date(poDate);
      
      // Find matching records by SKU or LID (using correct column names from Target Price data)
      const matches = targetPriceData.filter(tp => {
        const skuMatch = tp.sku && item.sku && tp.sku.toLowerCase() === item.sku.toLowerCase();
        const lidMatch = tp.lid && item.lid && tp.lid.toLowerCase() === item.lid.toLowerCase();
        return skuMatch || lidMatch;
      });
      
      if (matches.length === 0) return null;
      
      // Filter by platform match (handle {"Platform Name", "PO"} format)
      const platformMatches = matches.filter(tp => {
        if (!tp.sales_platform || !formData.platform) return true; // Include if no platform filter
        
        // Handle {"Platform Name", "PO"} format
        let tpPlatform = tp.sales_platform;
        if (tpPlatform.includes('{') && tpPlatform.includes('}')) {
          // Extract platform name from {"Platform Name", "PO"} format
          const match = tpPlatform.match(/\{"([^"]+)",\s*"[^"]+"\}/);
          if (match) {
            tpPlatform = match[1].toLowerCase();
          }
        } else {
          tpPlatform = tpPlatform.toLowerCase();
        }
        
        const poPlatform = formData.platform.toLowerCase();
        return tpPlatform === poPlatform;
      });
      
      if (platformMatches.length === 0) return null;
      
      // Filter by date condition: Target Price date <= PO Date
      const validMatches = platformMatches.filter(tp => {
        if (!tp.date) return false;
        
        // Parse dates with proper format handling
        let tpDateObj, poDateObj;
        
        try {
          // Handle different date formats
          if (tp.date.includes('/')) {
            // Handle M/D/YYYY format (e.g., "8/13/2025")
            const [month, day, year] = tp.date.split('/');
            tpDateObj = new Date(year, month - 1, day); // month is 0-indexed
          } else {
            tpDateObj = new Date(tp.date);
          }
          
          if (poDate.includes('/')) {
            // Handle M/D/YYYY format for PO date too
            const [month, day, year] = poDate.split('/');
            poDateObj = new Date(year, month - 1, day);
          } else {
            poDateObj = new Date(poDate);
          }
          
          // Check if dates are valid
          if (isNaN(tpDateObj.getTime()) || isNaN(poDateObj.getTime())) {
            console.warn('⚠️ Invalid date format:', { tpDate: tp.date, poDate });
            return false;
          }
          
          console.log('📅 Date comparison:', {
            tpDate: tp.date,
            tpDateObj: tpDateObj.toISOString().split('T')[0],
            poDate: poDate,
            poDateObj: poDateObj.toISOString().split('T')[0],
            isValid: tpDateObj <= poDateObj
          });
          
          return tpDateObj <= poDateObj;
        } catch (error) {
          console.error('❌ Error parsing dates:', error, { tpDate: tp.date, poDate });
          return false;
        }
      });
      
      if (validMatches.length === 0) return null;
      
      // Get the latest valid match (closest to PO date)
      const latestMatch = validMatches.reduce((latest, current) => {
        try {
          // Parse dates with proper format handling
          let latestDate, currentDate;
          
          if (latest.date.includes('/')) {
            const [month, day, year] = latest.date.split('/');
            latestDate = new Date(year, month - 1, day);
          } else {
            latestDate = new Date(latest.date);
          }
          
          if (current.date.includes('/')) {
            const [month, day, year] = current.date.split('/');
            currentDate = new Date(year, month - 1, day);
          } else {
            currentDate = new Date(current.date);
          }
          
          return currentDate > latestDate ? current : latest;
        } catch (error) {
          console.error('❌ Error comparing dates:', error);
          return latest; // Return latest as fallback
        }
      });
      
      console.log('🎯 Found target price match for', item.sku || item.lid, 'with platform', formData.platform, ':', latestMatch);
      return latestMatch;
      
    } catch (error) {
      console.error('❌ Error matching target price:', error);
      return null;
    }
  };
  

  // Fetch PO list
  const fetchPOList = async () => {
    setPOListLoading(true);
    try {
      console.log('📊 Fetching PO list from GCS...');
      const response = await api.get('/gcs-po/po-list-test');
      
      console.log('🔍 Raw GCS response:', response.data);
      console.log('📋 PO list data:', response.data.data?.po_list);
      
      if (response.data.ok && response.data.data?.po_list) {
        // Transform GCS data to frontend format
        const transformedData = response.data.data.po_list.map((po, index) => {
          console.log(`🔍 Processing PO ${index + 1}:`, po);
          console.log(`📦 PO items:`, po.items);
          console.log(`🚚 Dispatch data:`, po.dispatch_data);
          console.log(`📦 Delivered data:`, po.delivered_data);
          
          // Spread the entire PO object to preserve all fields, then override specific ones
          return {
            ...po,
            id: index + 1, // Frontend expects numeric ID
            platform: po.platform || po.Platform,
            po_number: po.po_number || po.PO_Number,
            t_wh: po.t_wh || po.T_WH,
            po_date: po.po_date || po.PO_Date,
            po_expire: po.po_expire || po.PO_Expire,
            location: po.location || po.Location,
            status: po.status || po.Status || 'pending',
            currency: po.currency || po.Currency || 'INR',
            entry_by_userid: po.entry_by_userid || po.Entry_By_UserID,
            created_date: po.created_date || po.Created_Date,
            last_modified_date: po.last_modified_date || po.Last_Modified_Date,
            created_by: po.created_by || po.Created_By,
            dispatch_data: po.dispatch_data || null,
            delivered_data: po.delivered_data || null,
            delivered_qty: po.delivered_qty || null,
            planned_qty_total: po.planned_qty_total || null,
            planned_amount_total: po.planned_amount_total || null,
            items: po.items || [],
            planning_items: po.planning_items || [],
            items_count: po.items ? po.items.length : 0,
            aggregated_files: po.aggregated_files || po.uploaded_files || [],
            uploaded_files: po.aggregated_files || po.uploaded_files || []
          };
        });
        
        setPOList(transformedData);
        console.log('✅ Successfully fetched', transformedData.length, 'PO records from GCS');
        console.log('Sample PO data:', transformedData[0]); // Debug log to check planning_items
        if (transformedData[0] && transformedData[0].po_number === '3254665') {
          console.log('🔍 Transformed PO delivered_data:', transformedData[0].delivered_data);
          console.log('🔍 Transformed PO unloading_charges:', transformedData[0].delivered_data?.unloading_charges);
        }
        toast.success(`Fetched ${transformedData.length} PO records from GCS`);
      } else {
        console.warn('⚠️ No PO list data in response:', response.data);
        setPOList([]);
        toast.error('Failed to fetch PO list from GCS');
      }
    } catch (error) {
      console.error('❌ Error fetching PO list from GCS:', error);
      console.error('Error response:', error.response?.data);
      setPOList([]);
      toast.error(`Failed to fetch PO list: ${error.response?.data?.message || error.message}`);
    } finally {
      setPOListLoading(false);
    }
  };

  // Add new PO
  const handleAddPO = async () => {
    try {
      if (!formData.platform || !formData.po_number || !formData.t_wh || !formData.po_date) {
        toast.error('Please fill in all required fields (Platform, PO Number, T-WH, PO Date)');
        return;
      }

      // Always create items array - never send empty items
      let items = [];
      
      // First, check if we have items in the items array
      if (formData.items && formData.items.length > 0) {
        // Filter out empty items and ensure they have required fields
        items = formData.items.filter(item => 
          item.sku && item.sku.trim() !== '' && 
          item.quantity && parseFloat(item.quantity) > 0
        ).map(item => ({
          sku: item.sku || 'DEFAULT_SKU',
          lid: item.lid || '',
          g_code: item.g_code || '',
          ean: item.ean || '',
          quantity: parseFloat(item.quantity) || 0,
          unit_price: parseFloat(item.unit_price) || 0,
          total_price: parseFloat(item.total_price) || (parseFloat(item.quantity) * parseFloat(item.unit_price)) || 0,
          target_price: parseFloat(item.target_price) || 0
        }));
      }
      
      // If no valid items from items array, try to create from main form fields
      if (items.length === 0 && formData.lid && formData.quantity && formData.rate) {
        items = [{
          sku: formData.sku || formData.lid || 'DEFAULT_SKU',
          lid: formData.lid,
          g_code: formData.g_code || '',
          ean: formData.ean || '',
          quantity: parseFloat(formData.quantity) || 0,
          unit_price: parseFloat(formData.rate) || 0,
          total_price: (parseFloat(formData.quantity) * parseFloat(formData.rate)) || 0,
          target_price: parseFloat(formData.target_price) || 0
        }];
      }
      
      // If still no items, show error
      if (items.length === 0) {
        toast.error('Please add at least one item with SKU and quantity > 0');
        return;
      }

      // Create clean PO data for backend
      const poData = {
        platform: formData.platform,
        po_number: formData.po_number,
        t_wh: formData.t_wh,
        po_date: formData.po_date,
        po_expire: formData.po_expire || null,
        location: formData.location || null,
        currency: formData.currency || 'INR',
        status: formData.status || 'pending',
        items: items,
        entry_by_userid: user?.username || 'unknown_user',
        created_by: user?.username || 'unknown_user'
      };

      console.log('Sending PO data:', poData); // Debug log
      
      try {
        // Save to GCS
        const response = await api.post('/gcs-po/po-test', poData);
        
        if (response.data.ok) {
          toast.success(`PO ${poData.po_number} created successfully in GCS`);
        } else {
          throw new Error(response.data.message || 'Failed to create PO');
        }
      } catch (apiError) {
        console.error('GCS API Error:', apiError);
        
        // Fallback: Save locally if GCS fails
        const newPO = {
          id: Date.now(), // Generate a temporary ID
          ...poData,
          created_by: 'current_user', // Mock user ID
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        };
        
        setPOList(prev => [newPO, ...prev]);
        toast.error(`PO ${poData.po_number} saved locally (GCS unavailable)`);
      }
      
      // Refresh PO list to get latest data from GCS
      await fetchPOList();
      
      setShowAddForm(false);
      setFormData({
        platform: '',
        po_number: '',
        t_wh: '',
        po_date: '',
        po_expire: '',
        location: '',
        lid: '',
        sku: '',
        description: '',
        quantity: '',
        rate: '',
        currency: 'INR',
        status: 'pending',
        items: []
      });
      setUploadedFiles([]); // Clear uploaded files after successful creation
      
      // Uncomment when backend endpoint is ready:
      // await api.post('/b2b/po-punching', poData);
      // fetchPOList();
    } catch (error) {
      console.error('Error adding PO:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to add PO: ${error.response?.data?.message || error.message}`);
    }
  };

  // Update PO
  const handleUpdatePO = async () => {
    try {
      if (!formData.platform || !formData.po_number || !formData.t_wh || !formData.po_date) {
        toast.error('Please fill in all required fields (Platform, PO Number, T-WH, PO Date)');
        return;
      }

      // Check if we have items or main form data
      let items = [];
      if (formData.items.length > 0) {
        items = formData.items;
      } else if (formData.lid && formData.quantity && formData.rate) {
        // Create main item from form fields
        items = [{
          sku: formData.sku || formData.lid || 'DEFAULT_SKU', // Add required SKU field
          lid: formData.lid,
          description: formData.lid,
          quantity: formData.quantity,
          unit_price: formData.rate,
          total_price: (parseFloat(formData.quantity) * parseFloat(formData.rate)).toFixed(2)
        }];
      } else {
        toast.error('Please add at least one item or fill in LID, Quantity, and Rate');
        return;
      }

      const poData = {
        ...formData,
        items: items,
        uploaded_files: uploadedFiles,
        planning_items: formData.status === 'planning' ? items.map(item => ({
          ...item,
          selected_for_planning: item.selected_for_planning || false,
          planning_qty: item.planning_qty || 0
        })) : []
      };

      console.log('Updating PO data:', poData); // Debug log
      
      try {
        // Update PO in GCS
        const response = await api.put(`/gcs-po/po-test/${editingPO.po_number}`, poData);
        
        if (response.data.ok) {
          toast.success(`PO ${editingPO.po_number} updated successfully in GCS`);
        } else {
          throw new Error(response.data.message || 'Failed to update PO');
        }
      } catch (apiError) {
        console.error('GCS Update API Error:', apiError);
        
        // Fallback: Update locally if GCS fails
        setPOList(prev => prev.map(po => 
          po.id === editingPO.id 
            ? { ...po, ...poData, updated_at: new Date().toISOString() }
            : po
        ));
        toast.error(`PO ${editingPO.po_number} updated locally (GCS unavailable)`);
      }
      
      // Refresh PO list to get latest data from GCS
      await fetchPOList();
      
      setShowAddForm(false);
      setEditingPO(null);
      setFormData({
        platform: '',
        po_number: '',
        t_wh: '',
        po_date: '',
        po_expire: '',
        location: '',
        lid: '',
        sku: '',
        description: '',
        quantity: '',
        rate: '',
        currency: 'INR',
        status: 'pending',
        items: []
      });
      
      // Uncomment when backend endpoint is ready:
      // await api.put(`/b2b/po-punching/${editingPO.id}`, poData);
      // fetchPOList();
    } catch (error) {
      console.error('Error updating PO:', error);
      console.error('Error response:', error.response?.data);
      toast.error(`Failed to update PO: ${error.response?.data?.message || error.message}`);
    }
  };

  // Delete PO
  const handleDeletePO = async (id) => {
    const po = poList.find(p => p.id === id);
    if (!po) return;
    
    const poNumber = po.po_number;
    
    if (window.confirm(`Are you sure you want to delete PO ${poNumber}?`)) {
      try {
        // Delete PO from GCS
        const response = await api.delete(`/gcs-po/po-test/${poNumber}`);
        
        if (response.data.ok) {
          toast.success(`PO ${poNumber} deleted successfully from GCS`);
        } else {
          throw new Error(response.data.message || 'Failed to delete PO');
        }
        
        // Refresh PO list to get latest data from GCS
        await fetchPOList();
        
      } catch (apiError) {
        console.error('GCS Delete API Error:', apiError);
        
        // Fallback: Delete locally if GCS fails
        setPOList(prev => prev.filter(po => po.id !== id));
        toast.error(`PO ${poNumber} deleted locally (GCS unavailable)`);
      }
    }
  };


  // Smart paste functionality
  // Search for SKU by LID and platform (where platform is a column name)
  const searchSKUByLID = async (lid, platform) => {
    if (!lid || !platform) {
      return null;
    }

    try {
      console.log(`🔍 Searching for LID: ${lid} in platform column: ${platform}`);
      
      // Get all data from catalogue listings
      const response = await api.get('/catalogue/listings/search');
      
      if (!response.data.success || response.data.data.length === 0) {
        console.log('❌ No data found in Catalogue Listing');
        toast.error('No data found in Catalogue Listing');
        return null;
      }
      
      console.log(`✅ Found ${response.data.data.length} total records in Catalogue Listing`);
      
      // Search for LID in the specific platform column
      const exactMatch = response.data.data.find(item => {
        // The platform name is a column name, so we access it directly
        const platformValue = item[platform.toLowerCase()] || item[platform] || 
                             item[platform.replace(/\s+/g, '_').toLowerCase()] ||
                             item[platform.replace(/\s+/g, '').toLowerCase()];
        
        return platformValue && platformValue.toString().toLowerCase() === lid.toLowerCase();
      });
      
      if (exactMatch) {
        console.log('✅ Found exact LID match:', exactMatch);
        
        // Get SKU from the first column (SKU column)
        const skuValue = exactMatch.sku || Object.values(exactMatch)[0];
        
        // Get G-Code from column E and EAN from column Z
        const gCode = exactMatch.g_code || exactMatch.gcode || exactMatch.g_code_e || exactMatch.e;
        const ean = exactMatch['ean/gtin'] || exactMatch.ean_gtin || exactMatch.ean || exactMatch.gtin || exactMatch.ean_z || exactMatch.z;
        
        // Debug: Log all available keys to see what columns are actually available
        console.log('🔍 Available columns in exactMatch:', Object.keys(exactMatch));
        console.log('🔍 Looking for EAN in:', {
          'ean/gtin': exactMatch['ean/gtin'],
          'ean_gtin': exactMatch.ean_gtin,
          'ean': exactMatch.ean,
          'gtin': exactMatch.gtin,
          'ean_z': exactMatch.ean_z,
          'z': exactMatch.z
        });
        
        const result = {
          ...exactMatch,
          sku: skuValue,
          g_code: gCode,
          ean: ean,
          platform: platform,
          lid: lid,
          found_in_column: platform
        };
        
        console.log('✅ Extracted SKU:', skuValue);
        console.log('✅ Extracted G-Code:', gCode);
        console.log('✅ Extracted EAN:', ean);
        console.log('📊 Final result:', result);
        
        return result;
      }
      
      // If no exact match, show partial matches for debugging
      const partialMatches = response.data.data.filter(item => {
        const platformValue = item[platform.toLowerCase()] || item[platform] || 
                             item[platform.replace(/\s+/g, '_').toLowerCase()] ||
                             item[platform.replace(/\s+/g, '').toLowerCase()];
        
        return platformValue && platformValue.toString().toLowerCase().includes(lid.toLowerCase());
      });
      
      if (partialMatches.length > 0) {
        console.log(`⚠️ No exact LID match, but found ${partialMatches.length} partial matches:`, partialMatches);
        toast.error(`LID "${lid}" not found exactly in ${platform} column. Found ${partialMatches.length} similar items.`);
      } else {
        console.log(`❌ No LID match found for "${lid}" in platform column "${platform}"`);
        toast.error(`LID "${lid}" not found in ${platform} column`);
      }
      
      return null;
    } catch (error) {
      console.error('❌ Error searching for SKU:', error);
      toast.error('Failed to search for SKU');
      return null;
    }
  };

  // Debug function to show all available columns from Google Sheets
  const debugAllColumns = async () => {
    try {
      console.log('🔍 Debugging all columns in Catalogue Listing...');
      toast.loading('Loading all columns...', { id: 'debug-all-columns' });
      
      // Get all data without any filters
      const response = await api.get('/catalogue/listings/search');
      
      if (response.data.success && response.data.data.length > 0) {
        // Get all column names from the first record
        const allColumns = Object.keys(response.data.data[0]);
        
        console.log('📊 All columns found:', allColumns);
        console.log('📊 Total columns:', allColumns.length);
        console.log('📊 Sample data structure:', response.data.data[0]);
        
        // Look for EAN/GTIN related columns
        const eanColumns = allColumns.filter(col => 
          col.toLowerCase().includes('ean') || 
          col.toLowerCase().includes('gtin') ||
          col.toLowerCase().includes('ean/gtin')
        );
        
        // Look for G-Code related columns
        const gCodeColumns = allColumns.filter(col => 
          col.toLowerCase().includes('g_code') || 
          col.toLowerCase().includes('gcode') ||
          col.toLowerCase().includes('g-code')
        );
        
        const columnText = allColumns.map((col, index) => `${index + 1}. "${col}"`).join('\n');
        const eanText = eanColumns.length > 0 ? eanColumns.map(col => `"${col}"`).join(', ') : 'None found';
        const gCodeText = gCodeColumns.length > 0 ? gCodeColumns.map(col => `"${col}"`).join(', ') : 'None found';
        
        alert(`Found ${allColumns.length} columns in Catalogue Listing:\n\n${columnText}\n\nEAN/GTIN columns: ${eanText}\nG-Code columns: ${gCodeText}\n\nNote: Use exact column names (including capitalization) in the search.`);
        
        toast.success(`Found ${allColumns.length} columns`, { id: 'debug-all-columns' });
      } else {
        toast.error('No data found in Catalogue Listing', { id: 'debug-all-columns' });
      }
    } catch (error) {
      console.error('❌ Error debugging columns:', error);
      toast.error('Failed to debug columns', { id: 'debug-all-columns' });
    }
  };

  // Debug function to show all available platforms (column names)
  const debugAllPlatforms = async () => {
    try {
      console.log('🔍 Debugging all platforms in Catalogue Listing...');
      toast.loading('Loading all platforms...', { id: 'debug-all-platforms' });
      
      // Get all data without any filters
      const response = await api.get('/catalogue/listings/search');
      
      if (response.data.success && response.data.data.length > 0) {
        // Get all column names from the first record
        const allColumns = Object.keys(response.data.data[0]);
        
        // Filter for platform columns (exclude metadata columns)
        const platformColumns = allColumns.filter(col => 
          !['id', 'row_number', 'last_updated', 'sku', 'brand', 'vertical', 'vertical_segregation', 
            'g_code', 'hsn', 'specification', 'category', 'l_cm', 'b_cm', 'h_cm', 'gross_weight_kg', 
            'mrp', 'ean_gtin', 'sp', 'web_link'].includes(col.toLowerCase())
        );
        
        console.log('📊 All columns found:', allColumns);
        console.log('📊 Platform columns:', platformColumns);
        console.log('📊 Sample data structure:', response.data.data[0]);
        
        const platformText = platformColumns.map((p, index) => `${index + 1}. "${p}"`).join('\n');
        
        alert(`Found ${platformColumns.length} platform columns in Catalogue Listing:\n\n${platformText}\n\nThese are the column names you can use as platforms.`);
        
        toast.success(`Found ${platformColumns.length} platform columns`, { id: 'debug-all-platforms' });
      } else {
        toast.error('No data found in Catalogue Listing', { id: 'debug-all-platforms' });
      }
    } catch (error) {
      console.error('❌ Error debugging platforms:', error);
      toast.error('Failed to debug platforms', { id: 'debug-all-platforms' });
    }
  };

  // Enhanced smart paste with SKU search
  const handleSmartPaste = async (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text');
    
    // Check if platform is selected
    if (!formData.platform) {
      toast.error('Please select a platform first before pasting LID');
      return;
    }
    
    let parsedData = [];
    if (pastedData.includes('\t')) {
      const lines = pastedData.split('\n').filter(line => line.trim());
      parsedData = lines.map((line, index) => {
        const values = line.split('\t').map(v => v.trim());
        return {
          id: index,
          lid: values[0] || '',
          quantity: values[1] || '',
          rate: values[2] || '',
          sku: '', // Will be filled after search
          description: '' // Will be filled after search
        };
      });
    } else if (pastedData.includes(',')) {
      const lines = pastedData.split('\n').filter(line => line.trim());
      parsedData = lines.map((line, index) => {
        const values = line.split(',').map(v => v.trim());
        return {
          id: index,
          lid: values[0] || '',
          quantity: values[1] || '',
          rate: values[2] || '',
          sku: '', // Will be filled after search
          description: '' // Will be filled after search
        };
      });
    } else {
      // Single LID paste - search for SKU immediately
      toast.loading('Searching for SKU...', { id: 'sku-search' });
      
      const skuData = await searchSKUByLID(pastedData, formData.platform);
      
      if (skuData) {
        setFormData(prev => ({
          ...prev,
          lid: pastedData,
          // Auto-populate SKU information if available
          sku: skuData.sku || skuData.product_name || '',
          description: skuData.description || skuData.product_description || '',
          // You can add more fields as needed
        }));
        
        toast.success(`Found SKU: ${skuData.sku || skuData.product_name || 'Unknown'}`, { id: 'sku-search' });
      } else {
        setFormData(prev => ({
          ...prev,
          lid: pastedData
        }));
        toast.error('No SKU found for this LID', { id: 'sku-search' });
      }
      return;
    }
    
    // For multiple rows, search for SKU for each LID
    toast.loading('Searching SKUs for all LIDs...', { id: 'sku-search-all' });
    
    const enrichedData = [];
    for (let i = 0; i < parsedData.length; i++) {
      const row = parsedData[i];
      if (row.lid) {
        const skuData = await searchSKUByLID(row.lid, formData.platform);
        enrichedData.push({
          ...row,
          sku: skuData ? (skuData.sku || skuData.product_name || '') : '',
          description: skuData ? (skuData.description || skuData.product_description || '') : '',
          g_code: skuData ? (skuData.g_code || '') : '',
          ean: skuData ? (skuData.ean || '') : ''
        });
      } else {
        enrichedData.push(row);
      }
    }
    
    setPastePreview(enrichedData);
    setSelectedPasteRow(0);
    setShowPastePreview(true);
    
    const foundSkus = enrichedData.filter(row => row.sku).length;
    toast.success(`Found ${foundSkus}/${enrichedData.length} SKUs. Preview ready.`, { id: 'sku-search-all' });
  };

  // Apply selected row from paste preview with SKU search
  const applyPasteRow = async (rowIndex) => {
    const selectedRow = pastePreview[rowIndex];
    if (selectedRow) {
      // Search for SKU if platform is selected
      if (formData.platform && selectedRow.lid) {
        toast.loading('Searching for SKU...', { id: 'sku-search-row' });
        
        const skuData = await searchSKUByLID(selectedRow.lid, formData.platform);
        
        if (skuData) {
          setFormData(prev => ({
            ...prev,
            lid: selectedRow.lid,
            quantity: selectedRow.quantity,
            rate: selectedRow.rate,
            // Auto-populate SKU information
            sku: skuData.sku || skuData.product_name || '',
            description: skuData.description || skuData.product_description || '',
          }));
          
          toast.success(`Applied row with SKU: ${skuData.sku || skuData.product_name || 'Unknown'}`, { id: 'sku-search-row' });
        } else {
          setFormData(prev => ({
            ...prev,
            lid: selectedRow.lid,
            quantity: selectedRow.quantity,
            rate: selectedRow.rate
          }));
          toast.error('No SKU found for this LID', { id: 'sku-search-row' });
        }
      } else {
        setFormData(prev => ({
          ...prev,
          lid: selectedRow.lid,
          quantity: selectedRow.quantity,
          rate: selectedRow.rate
        }));
        toast.success(`Applied row ${rowIndex + 1}: LID=${selectedRow.lid}, Qty=${selectedRow.quantity}, Rate=${selectedRow.rate}`);
      }
      
      setShowPastePreview(false);
    }
  };
  
  // Apply all rows from paste preview with SKU information
  const applyAllPasteRows = () => {
    const newItems = pastePreview.map((row, index) => ({
      sku: row.sku || row.lid, // Use found SKU or fallback to LID
      description: row.description || `Item ${index + 1}`,
      g_code: row.g_code || '',
      ean: row.ean || '',
      quantity: row.quantity,
      unit_price: row.rate,
      total_price: (parseFloat(row.quantity) * parseFloat(row.rate)).toFixed(2),
      lid: row.lid,
      platform: formData.platform
    }));
    
    setFormData(prev => ({
      ...prev,
      items: [...prev.items, ...newItems]
    }));
    
    setShowPastePreview(false);
    
    const foundSkus = newItems.filter(item => item.sku && item.sku !== item.lid).length;
    toast.success(`Added ${newItems.length} items to the PO (${foundSkus} with SKU found)`);
  };
  
  // Close paste preview
  const closePastePreview = () => {
    setShowPastePreview(false);
    setPastePreview([]);
  };

  // View PO details
  const viewPODetails = (po) => {
    setSelectedPODetails(po);
    setShowPODetails(true);
  };

  // View planned SKUs for a PO
  const viewPlannedSKUs = (po) => {
    // Create a modified PO object with only planned items
    const plannedPO = {
      ...po,
      items: po.planning_items ? po.planning_items.filter(item => 
        item.selected_for_planning === true || item.planned_qty > 0
      ) : []
    };
    setSelectedPODetails(plannedPO);
    setShowPODetails(true);
  };

  // Close PO details
  const closePODetails = () => {
    setShowPODetails(false);
    setSelectedPODetails(null);
  };

  // Handle editing a PO
  const handleEditPO = (po) => {
    setEditingPO(po);
    setShowAddForm(true);
    
    // Populate form data with the selected PO's data
    setFormData({
      platform: po.platform || '',
      po_number: po.po_number || '',
      t_wh: po.t_wh || '',
      po_date: po.po_date || '',
      po_expire: po.po_expire || '',
      location: po.location || '',
      status: po.status || 'pending',
      currency: po.currency || 'INR',
      lid: '',
      quantity: '',
      rate: '',
      items: po.items || [],
      uploaded_files: po.uploaded_files || po.aggregated_files || [],
      planning_items: po.planning_items || []
    });
    
    // Populate uploaded files state
    setUploadedFiles(po.uploaded_files || po.aggregated_files || []);
    
    // If PO has planning items, populate planning data in form items
    if (po.planning_items && po.planning_items.length > 0) {
      setFormData(prev => ({
        ...prev,
        items: prev.items.map((item, index) => {
          const planningItem = po.planning_items[index];
          return planningItem ? {
            ...item,
            selected_for_planning: planningItem.selected_for_planning || false,
            planning_qty: planningItem.planning_qty || 0
          } : item;
        })
      }));
    }
    
    toast.success(`Editing PO: ${po.po_number}`);
  };

  // Get available status options based on current status for workflow
  const getAvailableStatuses = () => {
    const currentStatus = formData.status;
    
    const statusFlow = {
      'pending': [
        { value: 'pending', label: 'Pending' },
        { value: 'planning', label: 'Planning' },
        { value: 'cancel', label: 'Cancel' }
      ],
      'planning': [
        { value: 'planning', label: 'Planning' },
        { value: 'dispatch', label: 'Dispatch' },
        { value: 'cancel', label: 'Cancel' }
      ],
      'dispatch': [
        { value: 'dispatch', label: 'Dispatch' },
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancel', label: 'Cancel' }
      ],
      'delivered': [
        { value: 'delivered', label: 'Delivered' },
        { value: 'cancel', label: 'Cancel' }
      ],
      'cancel': [
        { value: 'cancel', label: 'Cancel' }
      ]
    };
    
    return statusFlow[currentStatus] || statusFlow['pending'];
  };

  // Load PO list and target price data on component mount
  useEffect(() => {
    fetchPOList();
    fetchTargetPriceData();
  }, []);

  // Filter PO list based on search term and active tab
  const getFilteredPOList = () => {
    let filteredList = poList;
    
    // Apply tab-specific filtering
    switch (activeTab) {
      case 'all':
        // Show all POs
        filteredList = poList;
        break;
      case 'pending':
        filteredList = poList.filter(po => po.status === 'pending');
        break;
      case 'planned':
        filteredList = poList.filter(po => po.status === 'planning');
        break;
      case 'dispatched':
        filteredList = poList.filter(po => po.status === 'dispatch');
        break;
      case 'cancelled':
        filteredList = poList.filter(po => po.status === 'cancel');
        break;
      case 'delivered':
        filteredList = poList.filter(po => po.status === 'delivered');
        break;
      default:
        // Dashboard - show summary only, not individual POs
        filteredList = poList;
    }
    
    // Apply search filter
    let result = filteredList.filter(po =>
      po.po_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.platform?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.t_wh?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      po.location?.toLowerCase().includes(searchTerm.toLowerCase())
    );
    
    // Apply platform filter
    if (platformFilter) {
      result = result.filter(po => 
        po.platform?.toLowerCase() === platformFilter.toLowerCase()
      );
    }
    
    // Apply SKU filter
    if (skuFilter) {
      result = result.filter(po => {
        // Check if SKU exists in items
        if (po.items && po.items.length > 0) {
          return po.items.some(item => 
            item.sku?.toLowerCase().includes(skuFilter.toLowerCase()) ||
            item.lid?.toLowerCase().includes(skuFilter.toLowerCase())
          );
        }
        // Fallback to checking if SKU matches any field
        return po.sku?.toLowerCase().includes(skuFilter.toLowerCase()) ||
               po.lid?.toLowerCase().includes(skuFilter.toLowerCase());
      });
    }
    
    // Apply date filters
    if (dateFrom || dateTo) {
      result = result.filter(po => {
        const poDate = po.po_date ? new Date(po.po_date) : null;
        if (!poDate) return false;
        
        let matchesFrom = true;
        let matchesTo = true;
        
        if (dateFrom) {
          const fromDate = new Date(dateFrom);
          fromDate.setHours(0, 0, 0, 0);
          matchesFrom = poDate >= fromDate;
        }
        
        if (dateTo) {
          const toDate = new Date(dateTo);
          toDate.setHours(23, 59, 59, 999);
          matchesTo = poDate <= toDate;
        }
        
        return matchesFrom && matchesTo;
      });
    }
    
    return result;
  };

  const filteredPOList = getFilteredPOList();

  return (
    <div className="p-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-gray-900 mb-2">B2B PO Punching</h1>
        <p className="text-gray-600">Manage Purchase Orders for B2B operations</p>
      </div>

      {/* Search and Filters */}
      <div className="mb-6">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center space-x-4">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
              <input
                type="text"
                placeholder="Search POs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent w-64"
              />
            </div>
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center gap-2 px-4 py-2 rounded-md border transition-colors ${
                showFilters || dateFrom || dateTo || platformFilter || skuFilter
                  ? 'bg-blue-50 border-blue-500 text-blue-700'
                  : 'bg-white border-gray-300 text-gray-700 hover:bg-gray-50'
              }`}
            >
              <Database className="h-4 w-4" />
              Filters
              {(dateFrom || dateTo || platformFilter || skuFilter) && (
                <span className="bg-blue-600 text-white text-xs rounded-full px-2 py-0.5">
                  Active
                </span>
              )}
            </button>
            {(dateFrom || dateTo || platformFilter || skuFilter) && (
              <button
                onClick={() => {
                  setDateFrom('');
                  setDateTo('');
                  setPlatformFilter('');
                  setSkuFilter('');
                }}
                className="flex items-center gap-2 px-3 py-2 text-sm text-gray-600 hover:text-gray-800 rounded-md hover:bg-gray-100"
              >
                <XCircle className="h-4 w-4" />
                Clear Filters
              </button>
            )}
          </div>
          
          <div className="flex gap-3">
            <button
              onClick={handleSyncAllFiles}
              className="bg-green-600 text-white px-4 py-2 rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
              title="Sync all PO files with their data"
            >
              <RefreshCw className="h-4 w-4" />
              Sync Files
            </button>
            <button
              onClick={() => {
                setShowAddForm(true);
                setEditingPO(null);
                setFormData({
                  platform: '',
                  po_number: '',
                  t_wh: '',
                  po_date: '',
                  po_expire: '',
                  location: '',
                  lid: '',
                  quantity: '',
                  rate: '',
                  currency: 'INR',
                  status: 'pending',
                  items: []
                });
              }}
              className="bg-blue-600 text-white px-4 py-2 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 flex items-center gap-2"
            >
              <Plus className="h-4 w-4" />
              Add New PO
            </button>
          </div>
        </div>
        
        {/* Filter Panel */}
        {showFilters && (
          <div className="mt-4 p-4 bg-white border border-gray-200 rounded-lg shadow-sm">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Date From Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date From
                </label>
                <input
                  type="date"
                  value={dateFrom}
                  onChange={(e) => setDateFrom(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              
              {/* Date To Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Calendar className="inline h-4 w-4 mr-1" />
                  Date To
                </label>
                <input
                  type="date"
                  value={dateTo}
                  onChange={(e) => setDateTo(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min={dateFrom || ''}
                />
              </div>
              
              {/* Platform Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Package className="inline h-4 w-4 mr-1" />
                  Platform
                </label>
                <select
                  value={platformFilter}
                  onChange={(e) => setPlatformFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">All Platforms</option>
                  {[...new Set(poList.map(po => po.platform).filter(Boolean))].sort().map(platform => (
                    <option key={platform} value={platform}>
                      {platform}
                    </option>
                  ))}
                </select>
              </div>
              
              {/* SKU Filter */}
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  <Database className="inline h-4 w-4 mr-1" />
                  SKU / LID
                </label>
                <input
                  type="text"
                  placeholder="Search by SKU or LID..."
                  value={skuFilter}
                  onChange={(e) => setSkuFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
            </div>
            
            {/* Filter Summary */}
            {(dateFrom || dateTo || platformFilter || skuFilter) && (
              <div className="mt-4 pt-4 border-t border-gray-200">
                <div className="flex items-center gap-2 text-sm text-gray-600">
                  <span className="font-medium">Active Filters:</span>
                  {dateFrom && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                      From: {new Date(dateFrom).toLocaleDateString()}
                    </span>
                  )}
                  {dateTo && (
                    <span className="px-2 py-1 bg-blue-100 text-blue-800 rounded-md">
                      To: {new Date(dateTo).toLocaleDateString()}
                    </span>
                  )}
                  {platformFilter && (
                    <span className="px-2 py-1 bg-green-100 text-green-800 rounded-md">
                      Platform: {platformFilter}
                    </span>
                  )}
                  {skuFilter && (
                    <span className="px-2 py-1 bg-purple-100 text-purple-800 rounded-md">
                      SKU/LID: {skuFilter}
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Tabs - Only show on main PO Punching page, not on dedicated pages */}
      {location.pathname === '/b2b-po-punching' && (
      <div className="border-b border-gray-200 mb-6">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setActiveTab('dashboard')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dashboard'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dashboard
          </button>
          <button
            onClick={() => setActiveTab('all')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'all'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            All PO
          </button>
          <button
            onClick={() => setActiveTab('pending')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'pending'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Pending PO
          </button>
          <button
            onClick={() => setActiveTab('planned')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'planned'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Planning PO
          </button>
          <button
            onClick={() => setActiveTab('dispatched')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'dispatched'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Dispatch PO
          </button>
          <button
            onClick={() => setActiveTab('cancelled')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'cancelled'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Cancel PO
          </button>
          <button
            onClick={() => setActiveTab('delivered')}
            className={`py-2 px-1 border-b-2 font-medium text-sm ${
              activeTab === 'delivered'
                ? 'border-blue-500 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Delivered PO
          </button>
        </nav>
      </div>
      )}

      {/* Dashboard Content */}
      {activeTab === 'dashboard' && (() => {
        // Calculate KPIs
        const totalPOs = poList.length;
        const pendingPOs = poList.filter(po => po.status === 'pending').length;
        const planningPOs = poList.filter(po => po.status === 'planning').length;
        const dispatchedPOs = poList.filter(po => po.status === 'dispatched' || po.status === 'dispatch').length;
        const deliveredPOs = poList.filter(po => po.status === 'delivered').length;
        
        // Total quantities and amounts
        const totalSKUs = poList.reduce((sum, po) => sum + (po.items?.length || 0), 0);
        const totalPOQuantity = poList.reduce((sum, po) => {
          if (po.items && po.items.length > 0) {
            return sum + po.items.reduce((itemSum, item) => itemSum + (Number(item.quantity) || 0), 0);
          }
          return sum + (Number(po.quantity) || 0);
        }, 0);
        const totalPOAmount = poList.reduce((sum, po) => {
          if (po.items && po.items.length > 0) {
            return sum + po.items.reduce((itemSum, item) => itemSum + (Number(item.total_price) || 0), 0);
          }
          return sum + (Number(po.total_amount || po.amount || po.rate) || 0);
        }, 0);
        const totalPlannedQty = poList.reduce((sum, po) => sum + (Number(po.planned_qty_total) || 0), 0);
        const totalDispatchedQty = poList.reduce((sum, po) => {
          if (po.dispatch_data?.dispatch_qty) {
            return sum + Object.values(po.dispatch_data.dispatch_qty).reduce((qtySum, qty) => qtySum + (Number(qty) || 0), 0);
          }
          return sum;
        }, 0);
        const totalDeliveredQty = poList.reduce((sum, po) => {
          if (po.delivered_data?.sku_delivery) {
            return sum + Object.values(po.delivered_data.sku_delivery).reduce((rowSum, row) => rowSum + (Number(row.delivered_qty) || 0), 0);
          }
          if (po.delivered_qty) {
            return sum + Object.values(po.delivered_qty).reduce((qtySum, qty) => qtySum + (Number(qty) || 0), 0);
          }
          return sum;
        }, 0);
        const totalLogisticCost = poList.reduce((sum, po) => sum + (Number(po.delivered_data?.total_logistic_cost) || 0), 0);
        const avgLogisticCost = deliveredPOs > 0 ? totalLogisticCost / deliveredPOs : 0;
        
        // Platform distribution
        const platformStats = poList.reduce((acc, po) => {
          const platform = po.platform || 'Unknown';
          acc[platform] = (acc[platform] || 0) + 1;
          return acc;
        }, {});
        
        // Location distribution
        const locationStats = poList.reduce((acc, po) => {
          const location = po.location || 'Unknown';
          acc[location] = (acc[location] || 0) + 1;
          return acc;
        }, {});
        
        // Status distribution for chart
        const statusDistribution = {
          pending: pendingPOs,
          planning: planningPOs,
          dispatched: dispatchedPOs,
          delivered: deliveredPOs
        };
        const totalForStatusChart = Object.values(statusDistribution).reduce((a, b) => a + b, 0);
        
        return (
          <div className="space-y-6">
            {/* KPI Cards Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Total POs Card */}
              <div className="bg-gradient-to-br from-blue-500 to-blue-600 p-6 rounded-xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-blue-100 uppercase tracking-wide">Total POs</p>
                    <p className="text-3xl font-bold mt-2">{totalPOs}</p>
                    <p className="text-xs text-blue-100 mt-1">All purchase orders</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Total SKUs Card */}
              <div className="bg-gradient-to-br from-indigo-500 to-indigo-600 p-6 rounded-xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-indigo-100 uppercase tracking-wide">Total SKUs</p>
                    <p className="text-3xl font-bold mt-2">{totalSKUs}</p>
                    <p className="text-xs text-indigo-100 mt-1">Across all POs</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Total PO Quantity Card */}
              <div className="bg-gradient-to-br from-green-500 to-green-600 p-6 rounded-xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-green-100 uppercase tracking-wide">Total PO Quantity</p>
                    <p className="text-3xl font-bold mt-2">{totalPOQuantity.toLocaleString()}</p>
                    <p className="text-xs text-green-100 mt-1">Units ordered</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>

              {/* Total PO Amount Card */}
              <div className="bg-gradient-to-br from-emerald-500 to-emerald-600 p-6 rounded-xl shadow-lg text-white">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-emerald-100 uppercase tracking-wide">Total PO Amount</p>
                    <p className="text-3xl font-bold mt-2">₹{(totalPOAmount / 100000).toFixed(1)}L</p>
                    <p className="text-xs text-emerald-100 mt-1">Total value (₹{totalPOAmount.toLocaleString()})</p>
                  </div>
                  <div className="w-12 h-12 bg-white bg-opacity-20 rounded-xl flex items-center justify-center">
                    <DollarSign className="w-6 h-6 text-white" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards Row 2 - Status Cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Pending POs Card */}
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-yellow-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Pending POs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{pendingPOs}</p>
                    <p className="text-xs text-gray-400 mt-1">{totalPOs > 0 ? ((pendingPOs / totalPOs) * 100).toFixed(1) : 0}% of total</p>
                  </div>
                  <div className="w-12 h-12 bg-yellow-100 rounded-xl flex items-center justify-center">
                    <FileText className="w-6 h-6 text-yellow-600" />
                  </div>
                </div>
              </div>

              {/* Planning POs Card */}
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-blue-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Planning POs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{planningPOs}</p>
                    <p className="text-xs text-gray-400 mt-1">In planning stage</p>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-xl flex items-center justify-center">
                    <Database className="w-6 h-6 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Dispatched POs Card */}
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-green-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Dispatched POs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{dispatchedPOs}</p>
                    <p className="text-xs text-gray-400 mt-1">Qty: {totalDispatchedQty.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-xl flex items-center justify-center">
                    <Truck className="w-6 h-6 text-green-600" />
                  </div>
                </div>
              </div>

              {/* Delivered POs Card */}
              <div className="bg-white p-6 rounded-xl shadow border-l-4 border-purple-500">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Delivered POs</p>
                    <p className="text-3xl font-bold text-gray-900 mt-2">{deliveredPOs}</p>
                    <p className="text-xs text-gray-400 mt-1">Qty: {totalDeliveredQty.toLocaleString()}</p>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-xl flex items-center justify-center">
                    <CheckCircle className="w-6 h-6 text-purple-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* KPI Cards Row 3 - Metrics */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
              {/* Planned Quantity Card */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Planned Quantity</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">{totalPlannedQty.toLocaleString()}</p>
                    <p className="text-xs text-blue-600 mt-1">From planning POs</p>
                  </div>
                  <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center">
                    <Package className="w-5 h-5 text-blue-600" />
                  </div>
                </div>
              </div>

              {/* Total Logistic Cost Card */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Total Logistic Cost</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">₹{(totalLogisticCost / 1000).toFixed(1)}K</p>
                    <p className="text-xs text-purple-600 mt-1">From delivered POs</p>
                  </div>
                  <div className="w-10 h-10 bg-purple-50 rounded-lg flex items-center justify-center">
                    <Truck className="w-5 h-5 text-purple-600" />
                  </div>
                </div>
              </div>

              {/* Average Logistic Cost Card */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Avg Logistic Cost</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">₹{avgLogisticCost.toFixed(0)}</p>
                    <p className="text-xs text-gray-400 mt-1">Per delivered PO</p>
                  </div>
                  <div className="w-10 h-10 bg-gray-50 rounded-lg flex items-center justify-center">
                    <DollarSign className="w-5 h-5 text-gray-600" />
                  </div>
                </div>
              </div>

              {/* Delivery Rate Card */}
              <div className="bg-white p-6 rounded-xl shadow">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-gray-500 uppercase tracking-wide">Delivery Rate</p>
                    <p className="text-2xl font-bold text-gray-900 mt-2">
                      {dispatchedPOs > 0 ? ((deliveredPOs / dispatchedPOs) * 100).toFixed(1) : 0}%
                    </p>
                    <p className="text-xs text-green-600 mt-1">Delivered / Dispatched</p>
                  </div>
                  <div className="w-10 h-10 bg-green-50 rounded-lg flex items-center justify-center">
                    <CheckCircle className="w-5 h-5 text-green-600" />
                  </div>
                </div>
              </div>
            </div>

            {/* Charts Section */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Status Distribution Chart */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Status Distribution</h3>
                <div className="space-y-4">
                  {Object.entries(statusDistribution).map(([status, count]) => {
                    const percentage = totalForStatusChart > 0 ? (count / totalForStatusChart) * 100 : 0;
                    const colorMap = {
                      pending: 'bg-yellow-500',
                      planning: 'bg-blue-500',
                      dispatched: 'bg-green-500',
                      delivered: 'bg-purple-500'
                    };
                    return (
                      <div key={status}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700 capitalize">{status}</span>
                          <span className="text-sm font-bold text-gray-900">{count} ({percentage.toFixed(1)}%)</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`${colorMap[status] || 'bg-gray-500'} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Platform Distribution Chart */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Platform Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(platformStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([platform, count], index) => {
                      const percentage = totalPOs > 0 ? (count / totalPOs) * 100 : 0;
                      const colors = ['bg-blue-500', 'bg-purple-500', 'bg-green-500', 'bg-orange-500', 'bg-indigo-500'];
                      return (
                        <div key={platform}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700 capitalize">{platform}</span>
                            <span className="text-sm font-bold text-gray-900">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(platformStats).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No platform data available</p>
                  )}
                </div>
              </div>

              {/* Location Distribution Chart */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Location Distribution</h3>
                <div className="space-y-3">
                  {Object.entries(locationStats)
                    .sort((a, b) => b[1] - a[1])
                    .slice(0, 5)
                    .map(([location, count], index) => {
                      const percentage = totalPOs > 0 ? (count / totalPOs) * 100 : 0;
                      const colors = ['bg-teal-500', 'bg-cyan-500', 'bg-emerald-500', 'bg-amber-500', 'bg-rose-500'];
                      return (
                        <div key={location}>
                          <div className="flex items-center justify-between mb-1">
                            <span className="text-sm font-medium text-gray-700">{location}</span>
                            <span className="text-sm font-bold text-gray-900">{count} ({percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2.5">
                            <div
                              className={`${colors[index % colors.length]} h-2.5 rounded-full transition-all duration-500`}
                              style={{ width: `${percentage}%` }}
                            />
                          </div>
                        </div>
                      );
                    })}
                  {Object.keys(locationStats).length === 0 && (
                    <p className="text-sm text-gray-400 text-center py-4">No location data available</p>
                  )}
                </div>
              </div>

              {/* Quantity Flow Chart */}
              <div className="bg-white p-6 rounded-xl shadow">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Quantity Flow</h3>
                <div className="space-y-4">
                  {[
                    { label: 'PO Quantity', value: totalPOQuantity, color: 'bg-blue-500' },
                    { label: 'Planned Qty', value: totalPlannedQty, color: 'bg-purple-500' },
                    { label: 'Dispatched Qty', value: totalDispatchedQty, color: 'bg-green-500' },
                    { label: 'Delivered Qty', value: totalDeliveredQty, color: 'bg-emerald-500' }
                  ].map((item, index) => {
                    const maxQty = Math.max(totalPOQuantity, totalPlannedQty, totalDispatchedQty, totalDeliveredQty, 1);
                    const percentage = (item.value / maxQty) * 100;
                    return (
                      <div key={item.label}>
                        <div className="flex items-center justify-between mb-1">
                          <span className="text-sm font-medium text-gray-700">{item.label}</span>
                          <span className="text-sm font-bold text-gray-900">{item.value.toLocaleString()}</span>
                        </div>
                        <div className="w-full bg-gray-200 rounded-full h-3">
                          <div
                            className={`${item.color} h-3 rounded-full transition-all duration-500`}
                            style={{ width: `${percentage}%` }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Recent Activity Summary */}
            <div className="bg-white p-6 rounded-xl shadow">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">Recent Activity Summary</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-200">
                  <p className="text-sm font-medium text-blue-700">Today's Deliveries</p>
                  <p className="text-2xl font-bold text-blue-900 mt-1">
                    {poList.filter(po => {
                      if (!po.delivered_data?.delivered_date) return false;
                      const deliveredDate = new Date(po.delivered_data.delivered_date);
                      const today = new Date();
                      return deliveredDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <div className="p-4 bg-green-50 rounded-lg border border-green-200">
                  <p className="text-sm font-medium text-green-700">Today's Dispatches</p>
                  <p className="text-2xl font-bold text-green-900 mt-1">
                    {poList.filter(po => {
                      if (!po.dispatch_data?.dispatch_date) return false;
                      const dispatchDate = new Date(po.dispatch_data.dispatch_date);
                      const today = new Date();
                      return dispatchDate.toDateString() === today.toDateString();
                    }).length}
                  </p>
                </div>
                <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
                  <p className="text-sm font-medium text-purple-700">Pending Actions</p>
                  <p className="text-2xl font-bold text-purple-900 mt-1">{pendingPOs + planningPOs}</p>
                </div>
              </div>
            </div>
          </div>
        );
      })()}


      {/* Dispatch PO Tab Content */}
      {activeTab === 'dispatched' && (
        <div className="space-y-6">
          {/* Dispatch Summary Cards */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-green-500 rounded-md flex items-center justify-center">
                    <Truck className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Dispatched</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {poList.filter(po => po.status === 'dispatched').length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-blue-500 rounded-md flex items-center justify-center">
                    <Eye className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Complete Data</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {poList.filter(po => po.status === 'dispatched' && po.dispatch_data && po.dispatch_data.courier && po.dispatch_data.waybill_no).length}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-purple-500 rounded-md flex items-center justify-center">
                    <Package className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Items</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {poList.filter(po => po.status === 'dispatched' && po.dispatch_data?.dispatch_qty)
                      .reduce((total, po) => total + Object.values(po.dispatch_data.dispatch_qty).reduce((sum, qty) => sum + qty, 0), 0)}
                  </p>
                </div>
              </div>
            </div>
            
            <div className="bg-white p-6 rounded-lg shadow">
              <div className="flex items-center">
                <div className="flex-shrink-0">
                  <div className="w-8 h-8 bg-orange-500 rounded-md flex items-center justify-center">
                    <Database className="w-4 h-4 text-white" />
                  </div>
                </div>
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Missing Data</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {poList.filter(po => po.status === 'dispatched' && !po.dispatch_data).length}
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Dispatch Records Table */}
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200">
              <h3 className="text-lg font-medium text-gray-900">Dispatched Purchase Orders</h3>
              <p className="text-sm text-gray-500">View all dispatched POs with their dispatch details</p>
            </div>
            
            {poListLoading ? (
              <div className="flex justify-center items-center py-12">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
                <p className="text-gray-500 mt-2">Loading dispatched orders...</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waybill No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Waybill No.</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatched By</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Date</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Qty</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Files</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waybill</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Waybill</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof of Dispatch</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                      <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {poList.filter(po => po.status === 'dispatched').map((po) => {
                      console.log(`🚚 Displaying dispatched PO:`, po);
                      console.log(`🚚 Dispatch data for ${po.po_number}:`, po.dispatch_data);
                      return (
                      <tr key={po.id} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <span className="capitalize">{po.platform || 'N/A'}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {po.po_number}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.location || 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium text-blue-600">
                            {po.dispatch_data?.courier || 'Not Assigned'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-gray-700">
                            {po.dispatch_data?.vehicle_no || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-gray-700">
                            {po.dispatch_data?.waybill_no || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-mono text-gray-700">
                            {po.dispatch_data?.e_waybill_no || 'N/A'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.dispatch_date ? new Date(po.dispatch_data.dispatch_date).toLocaleDateString() : 'N/A'}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-medium text-green-600">
                            {po.dispatch_data?.dispatched_by || 'Unknown'}
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.appointment_date ? (
                            <span className="text-blue-600 font-medium">
                              {new Date(po.dispatch_data.appointment_date).toLocaleDateString()}
                            </span>
                          ) : (
                            <span className="text-gray-400 text-xs">Not set</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.dispatch_qty ? (
                            <div className="flex items-center space-x-2">
                              <div className="text-center">
                                <div className="text-xs text-gray-500">SKUs</div>
                                <div className="font-semibold text-blue-600">
                                  {Object.keys(po.dispatch_data.dispatch_qty).length}
                                </div>
                              </div>
                              <div className="text-center">
                                <div className="text-xs text-gray-500">Total Qty</div>
                                <div className="font-semibold text-green-600">
                                  {Object.values(po.dispatch_data.dispatch_qty).reduce((sum, qty) => sum + qty, 0)}
                                </div>
                              </div>
                              <button
                                onClick={() => {
                                  // Prepare SKU breakdown data
                                  const dispatchQty = po.dispatch_data.dispatch_qty;
                                  const poItems = po.items || [];
                                  const planningItems = po.planning_items || [];
                                  
                                  const breakdownData = Object.keys(dispatchQty).map(sku => {
                                    const poItem = poItems.find(item => item.sku === sku);
                                    const planningItem = planningItems.find(item => item.sku === sku);
                                    const dispatchQtyValue = dispatchQty[sku];
                                    const poQty = poItem?.quantity || 0;
                                    const planningQty = planningItem?.planned_qty || 0;
                                    const poRate = poItem?.unit_price || 0;
                                    
                                    // Find target price for this SKU
                                    const targetPriceItem = targetPriceData.find(tp => tp.sku === sku);
                                    const targetPrice = targetPriceItem?.target_price || 'N/A';
                                    
                                    return {
                                      sku,
                                      poQty,
                                      poRate,
                                      planningQty,
                                      dispatchQty: dispatchQtyValue,
                                      targetPrice
                                    };
                                  });
                                  
                                  setSelectedSKUBreakdown({
                                    poNumber: po.po_number,
                                    platform: po.platform,
                                    breakdownData
                                  });
                                  setShowSKUBreakdownModal(true);
                                }}
                                className="text-blue-600 hover:text-blue-900 p-1"
                                title="View detailed SKU breakdown"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            </div>
                          ) : (
                            <span className="text-gray-400">No quantities</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.uploaded_files && po.uploaded_files.length > 0 ? (
                            <div className="flex flex-col space-y-1">
                              <div className="text-xs text-gray-500">PO Documents:</div>
                              <div className="flex flex-wrap gap-1">
                                {po.uploaded_files.map((file, index) => {
                                  // Skip dispatch files that might still be in uploaded_files
                                  if (file.name && (
                                    file.name.toLowerCase().includes('invoice') ||
                                    file.name.toLowerCase().includes('waybill') ||
                                    file.name.toLowerCase().includes('dispatch') ||
                                    file.name.toLowerCase().includes('proof')
                                  )) {
                                    return null;
                                  }
                                  
                                  return (
                                    <a
                                      key={index}
                                      href={file.serve_url ? `http://localhost:8000${file.serve_url}` : file.url}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200"
                                      title={`${file.name} (${(file.size / 1024).toFixed(1)} KB)`}
                                      onClick={(e) => {
                                        e.preventDefault();
                                        try {
                                          let url;
                                          if (file.serve_url) {
                                            // Check if serve_url already contains the full URL
                                            if (file.serve_url.startsWith('http')) {
                                              url = file.serve_url;
                                            } else {
                                              url = `http://localhost:8000${file.serve_url}`;
                                            }
                                          } else {
                                            url = file.url;
                                          }
                                          
                                          console.log('Opening file:', url);
                                          
                                          // Validate URL before opening
                                          if (url && url.startsWith('http')) {
                                            window.open(url, '_blank');
                                          } else {
                                            console.error('Invalid URL:', url);
                                            toast.error('Invalid file URL');
                                          }
                                        } catch (error) {
                                          console.error('Error opening file:', error);
                                          toast.error('Failed to open file');
                                        }
                                      }}
                                    >
                                      <Package className="h-3 w-3 mr-1" />
                                      {file.name.length > 15 ? `${file.name.substring(0, 15)}...` : file.name}
                                    </a>
                                  );
                                })}
                              </div>
                            </div>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.files?.invoice && po.dispatch_data.files.invoice.name ? (
                            <a
                              href={po.dispatch_data.files.invoice.serve_url ? `http://localhost:8000${po.dispatch_data.files.invoice.serve_url}` : po.dispatch_data.files.invoice.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                              title={`${po.dispatch_data.files.invoice.name} (${(po.dispatch_data.files.invoice.size / 1024).toFixed(1)} KB)`}
                              onClick={(e) => {
                                e.preventDefault();
                                try {
                                  let url;
                                  if (po.dispatch_data.files.invoice.serve_url) {
                                    // Check if serve_url already contains the full URL
                                    if (po.dispatch_data.files.invoice.serve_url.startsWith('http')) {
                                      url = po.dispatch_data.files.invoice.serve_url;
                                    } else {
                                      url = `http://localhost:8000${po.dispatch_data.files.invoice.serve_url}`;
                                    }
                                  } else {
                                    url = po.dispatch_data.files.invoice.url;
                                  }
                                  
                                  console.log('Opening invoice:', url);
                                  
                                  // Validate URL before opening
                                  if (url && url.startsWith('http')) {
                                    window.open(url, '_blank');
                                  } else {
                                    console.error('Invalid invoice URL:', url);
                                    toast.error('Invalid invoice file URL');
                                  }
                                } catch (error) {
                                  console.error('Error opening invoice:', error);
                                  toast.error('Failed to open invoice file');
                                }
                              }}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Invoice
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.files?.waybill && po.dispatch_data.files.waybill.name ? (
                            <a
                              href={po.dispatch_data.files.waybill.serve_url ? `http://localhost:8000${po.dispatch_data.files.waybill.serve_url}` : po.dispatch_data.files.waybill.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                              title={`${po.dispatch_data.files.waybill.name} (${(po.dispatch_data.files.waybill.size / 1024).toFixed(1)} KB)`}
                              onClick={(e) => {
                                e.preventDefault();
                                try {
                                  let url;
                                  if (po.dispatch_data.files.waybill.serve_url) {
                                    // Check if serve_url already contains the full URL
                                    if (po.dispatch_data.files.waybill.serve_url.startsWith('http')) {
                                      url = po.dispatch_data.files.waybill.serve_url;
                                    } else {
                                      url = `http://localhost:8000${po.dispatch_data.files.waybill.serve_url}`;
                                    }
                                  } else {
                                    url = po.dispatch_data.files.waybill.url;
                                  }
                                  
                                  console.log('Opening waybill:', url);
                                  
                                  // Validate URL before opening
                                  if (url && url.startsWith('http')) {
                                    window.open(url, '_blank');
                                  } else {
                                    console.error('Invalid waybill URL:', url);
                                    toast.error('Invalid waybill file URL');
                                  }
                                } catch (error) {
                                  console.error('Error opening waybill:', error);
                                  toast.error('Failed to open waybill file');
                                }
                              }}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Waybill
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.files?.e_waybill && po.dispatch_data.files.e_waybill.name ? (
                            <a
                              href={po.dispatch_data.files.e_waybill.serve_url ? `http://localhost:8000${po.dispatch_data.files.e_waybill.serve_url}` : po.dispatch_data.files.e_waybill.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                              title={`${po.dispatch_data.files.e_waybill.name} (${(po.dispatch_data.files.e_waybill.size / 1024).toFixed(1)} KB)`}
                              onClick={(e) => {
                                e.preventDefault();
                                try {
                                  let url;
                                  if (po.dispatch_data.files.e_waybill.serve_url) {
                                    // Check if serve_url already contains the full URL
                                    if (po.dispatch_data.files.e_waybill.serve_url.startsWith('http')) {
                                      url = po.dispatch_data.files.e_waybill.serve_url;
                                    } else {
                                      url = `http://localhost:8000${po.dispatch_data.files.e_waybill.serve_url}`;
                                    }
                                  } else {
                                    url = po.dispatch_data.files.e_waybill.url;
                                  }
                                  
                                  console.log('Opening e-waybill:', url);
                                  
                                  // Validate URL before opening
                                  if (url && url.startsWith('http')) {
                                    window.open(url, '_blank');
                                  } else {
                                    console.error('Invalid e-waybill URL:', url);
                                    toast.error('Invalid e-waybill file URL');
                                  }
                                } catch (error) {
                                  console.error('Error opening e-waybill:', error);
                                  toast.error('Failed to open e-waybill file');
                                }
                              }}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              E-Waybill
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.dispatch_data?.files?.proof_of_dispatch && po.dispatch_data.files.proof_of_dispatch.name ? (
                            <a
                              href={po.dispatch_data.files.proof_of_dispatch.serve_url ? `http://localhost:8000${po.dispatch_data.files.proof_of_dispatch.serve_url}` : po.dispatch_data.files.proof_of_dispatch.url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                              title={`${po.dispatch_data.files.proof_of_dispatch.name} (${(po.dispatch_data.files.proof_of_dispatch.size / 1024).toFixed(1)} KB)`}
                              onClick={(e) => {
                                e.preventDefault();
                                try {
                                  let url;
                                  if (po.dispatch_data.files.proof_of_dispatch.serve_url) {
                                    // Check if serve_url already contains the full URL
                                    if (po.dispatch_data.files.proof_of_dispatch.serve_url.startsWith('http')) {
                                      url = po.dispatch_data.files.proof_of_dispatch.serve_url;
                                    } else {
                                      url = `http://localhost:8000${po.dispatch_data.files.proof_of_dispatch.serve_url}`;
                                    }
                                  } else {
                                    url = po.dispatch_data.files.proof_of_dispatch.url;
                                  }
                                  
                                  console.log('Opening proof of dispatch:', url);
                                  
                                  // Validate URL before opening
                                  if (url && url.startsWith('http')) {
                                    window.open(url, '_blank');
                                  } else {
                                    console.error('Invalid proof URL:', url);
                                    toast.error('Invalid proof file URL');
                                  }
                                } catch (error) {
                                  console.error('Error opening proof:', error);
                                  toast.error('Failed to open proof file');
                                }
                              }}
                            >
                              <Package className="h-3 w-3 mr-1" />
                              Proof
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                            Dispatched
                          </span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                          <div className="flex space-x-2">
                            {po.dispatch_data && (
                              <button
                                onClick={() => {
                                  setSelectedDispatchDetails({
                                    po: po,
                                    dispatchData: po.dispatch_data
                                  });
                                  setShowDispatchDetailsModal(true);
                                }}
                                className="text-green-600 hover:text-green-900"
                                title="View Full Dispatch Details"
                              >
                                <Eye className="h-4 w-4" />
                              </button>
                            )}
                            <button
                              onClick={() => openDeliveredModal(po)}
                              className="text-purple-600 hover:text-purple-900"
                              title="Mark as Delivered"
                            >
                              <CheckCircle className="h-4 w-4" />
                            </button>
                            <button
                              onClick={() => handleDeleteDispatch(po)}
                              className="text-red-600 hover:text-red-900"
                              title="Delete Dispatch Data"
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
                
                {poList.filter(po => po.status === 'dispatched').length === 0 && (
                  <div className="text-center py-12">
                    <Truck className="mx-auto h-12 w-12 text-gray-400" />
                    <h3 className="mt-2 text-sm font-medium text-gray-900">No dispatched orders</h3>
                    <p className="mt-1 text-sm text-gray-500">No purchase orders have been dispatched yet.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {activeTab === 'delivered' && (
        <div className="space-y-6">
          <div className="bg-white rounded-lg shadow">
            <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
              <div>
                <h3 className="text-lg font-medium text-gray-900">Delivered Purchase Orders</h3>
                <p className="text-sm text-gray-500">POD, delivered quantities and charges summary</p>
              </div>
              <div className="text-sm text-gray-500">
                Total Delivered: <span className="font-semibold text-purple-600">{poList.filter(po => po.status === 'delivered').length}</span>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Courier</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vehicle No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waybill No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Waybill No.</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Appointment Date</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered Date</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">PO Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Delivered Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Short Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Excess Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reject Qty</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Unloading Charges (₹)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Forward Cost (₹)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reverse Cost (₹)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Reattempt Total (₹)</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Total Logistic Cost (₹)</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical PO</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Invoice</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Waybill</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">E-Waybill</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Proof of Dispatch</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">POD</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Remark</th>
                    <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {poList.filter(po => po.status === 'delivered').map((po) => {
                    const dd = po.delivered_data || {};
                    const d = po.dispatch_data || {};
                    const files = d.files || {};
                    
                    // Calculate all quantity totals
                    const poQty = (po.items || []).reduce((s, i) => s + (Number(i.quantity) || 0), 0);
                    const plannedQty = po.planned_qty_total || (po.planning_items || []).reduce((s, i) => s + (Number(i.planned_qty || i.planning_qty) || 0), 0);
                    const dispatchQty = d.dispatch_qty ? Object.values(d.dispatch_qty).reduce((s, q) => s + (Number(q) || 0), 0) : 0;
                    const deliveredQty = dd.sku_delivery ? Object.values(dd.sku_delivery).reduce((s, row) => s + (Number(row.delivered_qty) || 0), 0) : (po.delivered_qty ? Object.values(po.delivered_qty).reduce((s, q) => s + (Number(q) || 0), 0) : 0);
                    const shortQty = dd.sku_delivery ? Object.values(dd.sku_delivery).reduce((s, row) => s + (Number(row.short_qty) || 0), 0) : 0;
                    const excessQty = dd.sku_delivery ? Object.values(dd.sku_delivery).reduce((s, row) => s + (Number(row.excess_qty) || 0), 0) : 0;
                    const rejectQty = dd.sku_delivery ? Object.values(dd.sku_delivery).reduce((s, row) => s + (Number(row.reject_qty) || 0), 0) : 0;

                    // POD file
                    let pod = dd.pod_file;
                    if (!pod) {
                      const allFiles = [...(po.aggregated_files || []), ...(po.uploaded_files || [])];
                      const deliveredFile = allFiles.find(f => (f.serve_url || f.url || f.file_url || '').toString().includes('/Delivered/'));
                      if (deliveredFile) {
                        pod = {
                          file_name: deliveredFile.name || deliveredFile.file_name,
                          serve_url: deliveredFile.serve_url,
                          file_url: deliveredFile.url || deliveredFile.file_url
                        };
                      }
                    }

                    const deliveredDate = dd.delivered_date || po.last_modified_date || po.created_date || '';
                    const fileLink = (f) => {
                      if (!f) return null;
                      const href = f.serve_url ? (f.serve_url.startsWith('http') ? f.serve_url : `http://localhost:8000${f.serve_url}`) : f.url;
                      return href;
                    };
                    
                    const QuantityCell = ({ value, title }) => (
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                        <div className="flex items-center justify-center gap-1">
                          <span className="font-medium text-gray-900">{value}</span>
                          <button
                            onClick={() => openDeliveredQtyModal(po)}
                            className="text-blue-600 hover:text-blue-900"
                            title={title}
                          >
                            <Eye className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    );
                    
                    return (
                      <tr key={po.po_number} className="hover:bg-gray-50">
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.platform || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{po.po_number}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{po.location || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{d.courier || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{d.vehicle_no || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{d.waybill_no || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 font-mono">{d.e_waybill_no || 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{po.po_date ? new Date(po.po_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{d.dispatch_date ? new Date(d.dispatch_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{d.appointment_date ? new Date(d.appointment_date).toLocaleDateString() : 'N/A'}</td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">{deliveredDate ? new Date(deliveredDate).toLocaleString() : 'N/A'}</td>
                        <QuantityCell value={poQty} title="View PO Qty breakdown" />
                        <QuantityCell value={plannedQty} title="View Planned Qty breakdown" />
                        <QuantityCell value={dispatchQty} title="View Dispatch Qty breakdown" />
                        <QuantityCell value={deliveredQty} title="View Delivered Qty breakdown" />
                        <QuantityCell value={shortQty} title="View Short Qty breakdown" />
                        <QuantityCell value={excessQty} title="View Excess Qty breakdown" />
                        <QuantityCell value={rejectQty} title="View Reject Qty breakdown" />
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {(() => {
                            const val = (dd && dd.unloading_charges !== undefined && dd.unloading_charges !== null) ? dd.unloading_charges : ((po && po.unloading_charges !== undefined && po.unloading_charges !== null) ? po.unloading_charges : 0);
                            return `₹${Number(val).toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {(() => {
                            const val = (dd && dd.forward_cost !== undefined && dd.forward_cost !== null) ? dd.forward_cost : ((po && po.forward_cost !== undefined && po.forward_cost !== null) ? po.forward_cost : 0);
                            return `₹${Number(val).toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {(() => {
                            const val = (dd && dd.reverse_cost !== undefined && dd.reverse_cost !== null) ? dd.reverse_cost : ((po && po.reverse_cost !== undefined && po.reverse_cost !== null) ? po.reverse_cost : 0);
                            return `₹${Number(val).toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center text-gray-900">
                          {(() => {
                            const val = (dd && dd.reattempt_total !== undefined && dd.reattempt_total !== null) ? dd.reattempt_total : ((po && po.reattempt_total !== undefined && po.reattempt_total !== null) ? po.reattempt_total : 0);
                            return `₹${Number(val).toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center font-medium text-gray-900">
                          {(() => {
                            const val = (dd && dd.total_logistic_cost !== undefined && dd.total_logistic_cost !== null) ? dd.total_logistic_cost : ((po && po.total_logistic_cost !== undefined && po.total_logistic_cost !== null) ? po.total_logistic_cost : 0);
                            return `₹${Number(val).toFixed(2)}`;
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Filter out dispatch files and delivered files to get only Physical PO files
                            const allFiles = [...(po.uploaded_files || []), ...(po.aggregated_files || [])];
                            const dispatchFileUrls = d.files ? [
                              d.files.invoice?.url,
                              d.files.invoice?.serve_url,
                              d.files.waybill?.url,
                              d.files.waybill?.serve_url,
                              d.files.e_waybill?.url,
                              d.files.e_waybill?.serve_url,
                              d.files.proof_of_dispatch?.url,
                              d.files.proof_of_dispatch?.serve_url
                            ].filter(Boolean) : [];
                            
                            const podFileUrl = dd.pod_file ? [
                              dd.pod_file.file_url,
                              dd.pod_file.serve_url
                            ].filter(Boolean) : [];
                            
                            // Filter out files that are dispatch or delivered files
                            const physicalPOFiles = allFiles.filter(file => {
                              const fileUrl = file.url || file.file_url || file.serve_url || '';
                              // Exclude dispatch files
                              if (dispatchFileUrls.some(dispatchUrl => fileUrl.includes(dispatchUrl))) return false;
                              // Exclude delivered/POD files
                              if (fileUrl.includes('/Delivered/') || fileUrl.includes('/delivered/')) return false;
                              if (podFileUrl.some(podUrl => fileUrl.includes(podUrl))) return false;
                              // Exclude dispatch-files folder
                              if (fileUrl.includes('/dispatch-files/')) return false;
                              return true;
                            });
                            
                            // Deduplicate by file id
                            const uniquePhysicalPOFiles = physicalPOFiles.filter((file, index, self) =>
                              index === self.findIndex(f => f.id === file.id)
                            );
                            
                            if (uniquePhysicalPOFiles.length === 0) {
                              return <span className="text-gray-400 text-xs">-</span>;
                            }
                            
                            // Show clickable links for Physical PO files
                            if (uniquePhysicalPOFiles.length === 1) {
                              const file = uniquePhysicalPOFiles[0];
                              const fileUrl = fileLink(file);
                              return fileUrl ? (
                                <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200" title={file.name || file.file_name || 'Physical PO'}>
                                  PO
                                </a>
                              ) : (
                                <span className="text-xs text-gray-700">1 file</span>
                              );
                            }
                            
                            // Multiple files - show count with dropdown or just count
                            return (
                              <div className="flex flex-wrap gap-1">
                                {uniquePhysicalPOFiles.slice(0, 3).map((file, idx) => {
                                  const fileUrl = fileLink(file);
                                  return fileUrl ? (
                                    <a key={file.id || idx} href={fileUrl} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200" title={file.name || file.file_name || 'Physical PO'}>
                                      PO {idx + 1}
                                    </a>
                                  ) : null;
                                })}
                                {uniquePhysicalPOFiles.length > 3 && (
                                  <span className="text-xs text-gray-600">+{uniquePhysicalPOFiles.length - 3}</span>
                                )}
                              </div>
                            );
                          })()}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {files.invoice ? (
                            <a href={fileLink(files.invoice)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">Invoice</a>
                          ) : (<span className="text-gray-400 text-xs">-</span>)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {files.waybill ? (
                            <a href={fileLink(files.waybill)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">Waybill</a>
                          ) : (<span className="text-gray-400 text-xs">-</span>)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {files.e_waybill ? (
                            <a href={fileLink(files.e_waybill)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">E-Waybill</a>
                          ) : (<span className="text-gray-400 text-xs">-</span>)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {files.proof_of_dispatch ? (
                            <a href={fileLink(files.proof_of_dispatch)} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-2 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200">Proof</a>
                          ) : (<span className="text-gray-400 text-xs">-</span>)}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          {pod && (pod.file_url || pod.serve_url) ? (
                            <a
                              href={pod.serve_url ? (pod.serve_url.startsWith('http') ? pod.serve_url : `http://localhost:8000${pod.serve_url}`) : pod.file_url}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-2 py-1 text-xs bg-purple-100 text-purple-800 rounded hover:bg-purple-200"
                              title={pod.file_name || 'POD'}
                            >
                              POD
                            </a>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-purple-100 text-purple-800">{(po.status || 'delivered').toString().toUpperCase()}</span>
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-900 max-w-xs">
                          {dd.remark ? (
                            <span className="truncate block" title={dd.remark}>{dd.remark}</span>
                          ) : (
                            <span className="text-gray-400 text-xs">-</span>
                          )}
                        </td>
                        <td className="px-4 py-4 whitespace-nowrap text-sm text-center">
                          <button
                            onClick={() => viewPODetails(po)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View PO"
                          >
                            <Eye className="h-4 w-4 inline" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>

              {poList.filter(po => po.status === 'delivered').length === 0 && (
                <div className="text-center py-12">
                  <Package className="mx-auto h-12 w-12 text-gray-400" />
                  <h3 className="mt-2 text-sm font-medium text-gray-900">No delivered orders</h3>
                  <p className="mt-1 text-sm text-gray-500">Mark POs as delivered to see them here.</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* PO List for other tabs */}
      {activeTab !== 'dashboard' && activeTab !== 'dispatched' && activeTab !== 'delivered' && (
        <div className="bg-white rounded-lg shadow">
        {poListLoading ? (
          <div className="flex justify-center items-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <p className="text-gray-500 mt-2">Loading purchase orders...</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Platform</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Number</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">T-WH</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Date</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Expire</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Location</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKUs</th>
                  {(activeTab === 'planned' || activeTab === 'all') && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned SKU Count</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Qty</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total PO Amount</th>
                    </>
                  )}
                  {(activeTab !== 'planned' && activeTab !== 'all') && (
                    <>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Amount</th>
                    </>
                  )}
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Physical PO</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {filteredPOList.map((po) => (
                  <tr key={po.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      <span className="capitalize">{po.platform || 'N/A'}</span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {po.po_number}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.t_wh || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.po_date ? new Date(po.po_date).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.po_expire ? new Date(po.po_expire).toLocaleDateString() : 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.location || 'N/A'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {po.items && po.items.length > 0 ? (
                        <div className="flex items-center gap-2">
                          <span className="text-blue-600 font-medium">
                            {po.items.length} SKU{po.items.length > 1 ? 's' : ''}
                          </span>
                          <button
                            onClick={() => viewPODetails(po)}
                            className="text-blue-600 hover:text-blue-900"
                            title="View all SKUs and details"
                          >
                            <Eye className="h-4 w-4" />
                          </button>
                        </div>
                      ) : (
                        <span className="text-gray-400">No SKUs</span>
                      )}
                    </td>
                    {(activeTab === 'planned' || activeTab === 'all') && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <div className="flex items-center space-x-2">
                            <span className="text-green-600 font-medium">
                              {po.planning_items && po.planning_items.length > 0 
                                ? po.planning_items.filter(item => item.selected_for_planning === true || item.planned_qty > 0).length 
                                : 0}
                            </span>
                            <button
                              onClick={() => viewPlannedSKUs(po)}
                              className="text-blue-600 hover:text-blue-900"
                              title="View planned SKUs"
                            >
                              <Eye className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.items && po.items.length > 0 ? (
                            <span className="text-blue-600 font-medium">
                              {po.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}
                            </span>
                          ) : (
                            po.quantity || 'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {(() => {
                            // Calculate planned qty from planning_items
                            if (po.planning_items && po.planning_items.length > 0) {
                              const plannedQty = po.planning_items.reduce((sum, item) => {
                                const qty = parseFloat(item.planned_qty || item.planning_qty || 0);
                                return sum + (isNaN(qty) ? 0 : qty);
                              }, 0);
                              return (
                                <span className="text-purple-600 font-medium">
                                  {plannedQty}
                                </span>
                              );
                            }
                            // Fallback to planned_qty_total
                            if (po.planned_qty_total) {
                              const totalQty = parseFloat(po.planned_qty_total);
                              return (
                                <span className="text-purple-600 font-medium">
                                  {isNaN(totalQty) ? 0 : totalQty}
                                </span>
                              );
                            }
                            // Default to 0
                            return <span className="text-gray-400">0</span>;
                          })()}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.planning_items && po.planning_items.length > 0 ? (
                            <span className="text-green-600 font-medium">
                              ₹{po.planning_items.reduce((sum, item) => sum + (parseFloat(item.planned_qty || item.planning_qty || 0) * parseFloat(item.unit_price || 0)), 0).toFixed(2)}
                            </span>
                          ) : po.planned_amount_total ? (
                            <span className="text-green-600 font-medium">
                              ₹{po.planned_amount_total.toFixed(2)}
                            </span>
                          ) : (
                            <span className="text-gray-400">₹0.00</span>
                          )}
                        </td>
                      </>
                    )}
                    {(activeTab !== 'planned' && activeTab !== 'all') && (
                      <>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.items && po.items.length > 0 ? (
                            <span className={`font-medium ${activeTab === 'planned' ? 'text-purple-600' : 'text-blue-600'}`}>
                              {po.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)}
                            </span>
                          ) : (
                            po.quantity || 'N/A'
                          )}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {po.items && po.items.length > 0 ? (
                            <span className="text-blue-600 font-medium">
                              ₹{po.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0).toFixed(2)}
                            </span>
                          ) : (
                            po.rate ? `₹${po.rate}` : 'N/A'
                          )}
                        </td>
                      </>
                    )}
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        po.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        po.status === 'planning' ? 'bg-blue-100 text-blue-800' :
                        po.status === 'dispatch' ? 'bg-green-100 text-green-800' :
                        po.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                        po.status === 'cancel' ? 'bg-red-100 text-red-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {po.status || 'pending'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                      {(() => {
                        // Filter out dispatch files and delivered files to get only Physical PO files
                        const allFiles = [...(po.uploaded_files || []), ...(po.aggregated_files || [])];
                        const d = po.dispatch_data || {};
                        const dd = po.delivered_data || {};
                        
                        const dispatchFileUrls = d.files ? [
                          d.files.invoice?.url,
                          d.files.invoice?.serve_url,
                          d.files.waybill?.url,
                          d.files.waybill?.serve_url,
                          d.files.e_waybill?.url,
                          d.files.e_waybill?.serve_url,
                          d.files.proof_of_dispatch?.url,
                          d.files.proof_of_dispatch?.serve_url
                        ].filter(Boolean) : [];
                        
                        const podFileUrl = dd.pod_file ? [
                          dd.pod_file.file_url,
                          dd.pod_file.serve_url
                        ].filter(Boolean) : [];
                        
                        // Filter out files that are dispatch or delivered files
                        const physicalPOFiles = allFiles.filter(file => {
                          const fileUrl = file.url || file.file_url || file.serve_url || '';
                          // Exclude dispatch files
                          if (dispatchFileUrls.some(dispatchUrl => fileUrl && dispatchUrl && fileUrl.includes(dispatchUrl))) return false;
                          // Exclude delivered/POD files
                          if (fileUrl.includes('/Delivered/') || fileUrl.includes('/delivered/')) return false;
                          if (podFileUrl.some(podUrl => fileUrl && podUrl && fileUrl.includes(podUrl))) return false;
                          // Exclude dispatch-files folder
                          if (fileUrl.includes('/dispatch-files/')) return false;
                          return true;
                        });
                        
                        // Deduplicate by file id
                        const uniquePhysicalPOFiles = physicalPOFiles.filter((file, index, self) =>
                          index === self.findIndex(f => f.id === file.id)
                        );
                        
                        if (uniquePhysicalPOFiles.length === 0) {
                          return <span className="text-gray-400 text-xs">No files</span>;
                        }
                        
                        // Show all Physical PO files as clickable links
                        return (
                          <div className="flex flex-wrap gap-1">
                            {uniquePhysicalPOFiles.map((file, index) => {
                              const fileUrl = file.serve_url ? (file.serve_url.startsWith('http') ? file.serve_url : `http://localhost:8000${file.serve_url}`) : (file.url || `http://localhost:8000/files/serve-file/${po.po_number}/${file.id}`);
                              return (
                                <a
                                  key={file.id || index}
                                  href={fileUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="inline-flex items-center px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200 font-medium"
                                  title={file.name || file.file_name || `Physical PO ${index + 1}`}
                                >
                                  <FileText className="h-3 w-3 mr-1" />
                                  PO {index + 1}
                                </a>
                              );
                            })}
                          </div>
                        );
                      })()}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        {po.status === 'pending' && (
                          <button
                            onClick={() => handleOpenPlanning(po)}
                            className="text-green-600 hover:text-green-900"
                            title="Move to Planning"
                          >
                            <Database className="h-4 w-4" />
                          </button>
                        )}
                        {po.status === 'planning' && (
                          <button
                            onClick={() => handleOpenDispatch(po)}
                            className="text-orange-600 hover:text-orange-900"
                            title="Dispatch PO"
                          >
                            <Truck className="h-4 w-4" />
                          </button>
                        )}
                        <button
                          onClick={() => handleEditPO(po)}
                          className="text-blue-600 hover:text-blue-900"
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeletePO(po.id)}
                          className="text-red-600 hover:text-red-900"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      )}

      {/* Add/Edit PO Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6">
                <h2 className="text-xl font-semibold text-gray-900">
                  {editingPO ? 'Edit PO' : 'Add New PO'}
                </h2>
                <button
                  onClick={() => setShowAddForm(false)}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <form 
                className="space-y-6"
                onSubmit={(e) => {
                  e.preventDefault(); // Prevent form default submission which causes page reload
                  if (editingPO) {
                    handleUpdatePO();
                  } else {
                    handleAddPO();
                  }
                }}
              >
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Platform *</label>
                    <div className="flex gap-2">
                      <select
                        value={formData.platform}
                        onChange={(e) => setFormData(prev => ({ ...prev, platform: e.target.value }))}
                        className="flex-1 px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        required
                      >
                        <option value="">Select Platform</option>
                        <option value="flipkart">Flipkart</option>
                        <option value="amazon">Amazon</option>
                        <option value="moglix">Moglix</option>
                        <option value="jiomart">Jiomart</option>
                        <option value="shopify">Shopify</option>
                        <option value="cred">Cred</option>
                        <option value="ondc">Ondc</option>
                        <option value="snapmint">Snapmint</option>
                        <option value="meesho">Meesho</option>
                        <option value="shopsy">Shopsy</option>
                        <option value="flipkart_po">Flipkart Po</option>
                        <option value="amazon_po">Amazon Po</option>
                        <option value="city_mall_po">City Mall Po</option>
                        <option value="deal_share_po">Deal Share Po</option>
                        <option value="rozana_po">Rozana Po</option>
                        <option value="zepto_po">Zepto Po</option>
                        <option value="swiggy_po">Swiggy Po</option>
                        <option value="apnamart_po">Apnamart Po</option>
                        <option value="blinkit">Blinkit</option>
                        <option value="jiomart_fbj">Jiomart Fbj</option>
                        <option value="meesho_grocery_po">Meesho Grocery Po</option>
                        <option value="instaplay">Instaplay</option>
                        <option value="reward_big">Reward Big</option>
                        <option value="gem">Gem</option>
                        <option value="other">Other</option>
                      </select>
        <button
          type="button"
          onClick={debugAllPlatforms}
          className="px-3 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 text-sm"
          title="Show All Available Platforms"
        >
          📋
        </button>
        <button
          type="button"
          onClick={debugAllColumns}
          className="px-3 py-2 bg-orange-600 text-white rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500 focus:ring-offset-2 text-sm"
          title="Show All Available Columns"
        >
          🔍
        </button>
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PO Number *</label>
                    <input
                      type="text"
                      value={formData.po_number}
                      onChange={(e) => setFormData(prev => ({ ...prev, po_number: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter PO number"
                      required
                      readOnly={editingPO} // Make PO Number readonly when editing since it's the identifier
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">T-WH *</label>
                    <select
                      value={formData.t_wh}
                      onChange={(e) => setFormData(prev => ({ ...prev, t_wh: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    >
                      <option value="">Select T-WH</option>
                      <option value="ixd">IXD</option>
                      <option value="non_ixd">Non-IXD</option>
                      <option value="sourcing_hub">Sourcing Hub</option>
                      <option value="non_sourcing_hub">Non-Sourcing Hub</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PO Date *</label>
                    <input
                      type="date"
                      value={formData.po_date}
                      onChange={(e) => setFormData(prev => ({ ...prev, po_date: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      required
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">PO Expire</label>
                    <input
                      type="date"
                      value={formData.po_expire}
                      onChange={(e) => setFormData(prev => ({ ...prev, po_expire: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Location</label>
                    <input
                      type="text"
                      value={formData.location}
                      onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter location"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">LID</label>
                    <input
                      type="text"
                      value={formData.lid}
                      onChange={(e) => setFormData(prev => ({ ...prev, lid: e.target.value }))}
                      onPaste={handleSmartPaste}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter LID or paste data"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">SKU</label>
                    <input
                      type="text"
                      value={formData.sku}
                      onChange={(e) => setFormData(prev => ({ ...prev, sku: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="SKU (auto-filled from LID search)"
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
                    <input
                      type="text"
                      value={formData.description}
                      onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Product description (auto-filled from LID search)"
                      readOnly
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Quantity</label>
                    <input
                      type="number"
                      value={formData.quantity}
                      onChange={(e) => setFormData(prev => ({ ...prev, quantity: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter quantity"
                    />
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Rate</label>
                    <input
                      type="number"
                      step="0.01"
                      value={formData.rate}
                      onChange={(e) => setFormData(prev => ({ ...prev, rate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      placeholder="Enter rate"
                    />
                  </div>
                  <div className="md:col-span-3">
                    <p className="text-xs text-gray-500 mt-1">
                      💡 Tip: Paste multiple rows to see all entries. You can add all as items to the PO or apply individual rows to the form fields.
                    </p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Currency</label>
                    <select
                      value={formData.currency}
                      onChange={(e) => setFormData(prev => ({ ...prev, currency: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      <option value="INR">INR</option>
                      <option value="USD">USD</option>
                      <option value="EUR">EUR</option>
                      <option value="GBP">GBP</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
                    <select
                      value={formData.status}
                      onChange={(e) => {
                        const newStatus = e.target.value;
                        setFormData(prev => {
                          const updatedData = { ...prev, status: newStatus };
                          
                          // If changing to planning status, initialize planning data for all items
                          if (newStatus === 'planning') {
                            updatedData.items = prev.items.map(item => ({
                              ...item,
                              selected_for_planning: true, // Select all SKUs by default
                              planning_qty: item.quantity || 0 // Initialize planning qty with original quantity
                            }));
                          }
                          
                          return updatedData;
                        });
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    >
                      {getAvailableStatuses().map(status => (
                        <option key={status.value} value={status.value}>
                          {status.label}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div className="mt-2">
                    <div className="text-xs text-gray-500 mb-2">Status Flow:</div>
                    <div className="flex items-center space-x-2 text-xs">
                      <span className={`px-2 py-1 rounded-full ${
                        formData.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        Pending
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        formData.status === 'planning' ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        Planning
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        formData.status === 'dispatch' ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        Dispatch
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        formData.status === 'delivered' ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        Delivered
                      </span>
                      <span className={`px-2 py-1 rounded-full ${
                        formData.status === 'cancel' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-500'
                      }`}>
                        Cancel
                      </span>
                    </div>
                    <div className="mt-1 text-xs text-gray-400">
                      Valid paths: Pending➔Planning➔Dispatch➔Delivered➔Cancel | Pending➔Planning➔Dispatch➔Cancel | Pending➔Planning➔Cancel | Pending➔Cancel
                    </div>
                  </div>
                </div>

                {/* File Upload Section */}
                <div className="mt-6">
                  <h3 className="text-lg font-medium text-gray-900 mb-4">
                    Physical PO Documents (PDF/JPEG)
                  </h3>
                  
                  <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                    <div className="text-center">
                      <Upload className="mx-auto h-12 w-12 text-gray-400" />
                      <p className="mt-2 text-sm text-gray-600">
                        Upload PDF documents or JPEG images
                      </p>
                      <p className="text-xs text-gray-500">Maximum file size: 10MB per file</p>
                      
                      <div className="mt-4">
                        <label htmlFor="file-upload" className="cursor-pointer">
                          <span className="mt-2 block w-full bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md transition-colors duration-200">
                            Choose Files
                          </span>
                          <input
                            id="file-upload"
                            type="file"
                            multiple
                            accept=".pdf,.jpeg,.jpg,.png"
                            onChange={handleFileUpload}
                            className="sr-only"
                            disabled={isUploading}
                          />
                        </label>
                      </div>
                      
                      {isUploading && (
                        <div className="mt-4">
                          <div className="bg-gray-200 rounded-full h-2">
                            <div 
                              className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                              style={{ width: `${uploadProgress}%` }}
                            ></div>
                          </div>
                          <p className="text-sm text-gray-600 mt-2">Uploading... {uploadProgress}%</p>
                        </div>
                      )}
                    </div>
                    
                    {/* Uploaded Files List */}
                    {uploadedFiles.length > 0 && (
                      <div className="mt-6">
                        <h4 className="text-sm font-medium text-gray-900 mb-3">Uploaded Files:</h4>
                        <div className="space-y-2">
                          {uploadedFiles.map((file) => (
                            <div key={file.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                              <div className="flex items-center space-x-3">
                                {file.type === 'application/pdf' ? (
                                  <FileText className="h-5 w-5 text-red-500" />
                                ) : (
                                  <Image className="h-5 w-5 text-green-500" />
                                )}
                                <div>
                                  <p className="text-sm font-medium text-gray-900">{file.name}</p>
                                  <p className="text-xs text-gray-500">
                                    {(file.size / 1024 / 1024).toFixed(2)} MB • 
                                    {new Date(file.uploaded_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                                  </p>
                                </div>
                              </div>
                              <div className="flex items-center space-x-2">
                                <a
                                  href={file.url}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-blue-600 hover:text-blue-800 text-sm"
                                >
                                  View
                                </a>
                                <button
                                  onClick={() => handleRemoveFile(file.id)}
                                  className="text-red-600 hover:text-red-800 text-sm"
                                >
                                  Remove
                                </button>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </div>

                {/* Items Preview Section */}
                {formData.items.length > 0 && (
                  <div className="border-t pt-6">
                    <h3 className="text-lg font-medium text-gray-900 mb-4">
                      Items Preview ({formData.items.length} items)
                      <button
                        onClick={fetchTargetPriceData}
                        className="ml-4 px-3 py-1 bg-blue-600 text-white text-xs rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                        title="Refresh Target Price Data"
                      >
                        🔄 Refresh TP Data
                      </button>
                    </h3>
                    
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-gray-50">
                          <tr>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EAN</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LID</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price</th>
                            {formData.status === 'planning' && (
                              <>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select for Planning</th>
                                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planning Qty</th>
                              </>
                            )}
                            <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                          {formData.items.map((item, index) => (
                            <tr key={index} className="hover:bg-gray-50">
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  item.sku && item.sku !== item.lid ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                                }`}>
                                  {item.sku || 'LID as SKU'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  item.g_code ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.g_code || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                <span className={`px-2 py-1 rounded-full text-xs ${
                                  item.ean ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                                }`}>
                                  {item.ean || 'N/A'}
                                </span>
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.lid}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {item.quantity}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                ₹{item.unit_price}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                                ₹{item.total_price}
                              </td>
                              <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                                {(() => {
                                  const targetPrice = getTargetPriceForItem(item, formData.po_date);
                                  if (!targetPrice) {
                                    return <span className="text-gray-400 text-xs">No match</span>;
                                  }
                                  
                                  // Display 7 columns from target price data (using correct column names)
                                  const columns = [
                                    targetPrice.date || 'N/A',
                                    targetPrice.sku || 'N/A',
                                    targetPrice.mrp || 'N/A', // MRP instead of current_price
                                    targetPrice.target_price || 'N/A',
                                    targetPrice.price_incl_gst || 'N/A', // Price (Incl GST) instead of currency
                                    targetPrice.ean_gtin || 'N/A', // EAN/GTIN instead of price_type
                                    targetPrice.actions || 'N/A' // Actions instead of status
                                  ];
                                  
                                  // Extract platform name from {"Platform Name", "PO"} format
                                  let platformDisplay = targetPrice.sales_platform || 'N/A';
                                  if (platformDisplay.includes('{') && platformDisplay.includes('}')) {
                                    const match = platformDisplay.match(/\{"([^"]+)",\s*"[^"]+"\}/);
                                    if (match) {
                                      platformDisplay = match[1];
                                    }
                                  }
                                  
                                  return (
                                    <div className="space-y-1">
                                      <div className="text-xs">
                                        <span className="font-medium text-gray-600">Platform:</span>
                                        <span className="ml-1 text-gray-900">{platformDisplay}</span>
                                      </div>
                                      {columns.map((col, idx) => (
                                        <div key={idx} className="text-xs">
                                          <span className="font-medium text-gray-600">
                                            {['Date', 'SKU', 'MRP', 'Target Price', 'Price (Incl GST)', 'EAN/GTIN', 'Actions'][idx]}:
                                          </span>
                                          <span className="ml-1 text-gray-900">{col}</span>
                                        </div>
                                      ))}
                                    </div>
                                  );
                                })()}
                              </td>
                              {formData.status === 'planning' && (
                                <>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <input
                                      type="checkbox"
                                      checked={item.selected_for_planning || false}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: prev.items.map((el, i) => 
                                            i === index ? {...el, selected_for_planning: e.target.checked} : el
                                          )
                                        }));
                                      }}
                                      className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                                    />
                                  </td>
                                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                                    <input
                                      type="number"
                                      value={item.planning_qty || ''}
                                      onChange={(e) => {
                                        setFormData(prev => ({
                                          ...prev,
                                          items: prev.items.map((el, i) => 
                                            i === index ? {...el, planning_qty: parseInt(e.target.value) || 0} : el
                                          )
                                        }));
                                      }}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-center"
                                      min="0"
                                      placeholder="0"
                                    />
                                  </td>
                                </>
                              )}
                              <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                <button
                                  onClick={() => {
                                    setFormData(prev => ({
                                      ...prev,
                                      items: prev.items.filter((_, i) => i !== index)
                                    }));
                                    toast.success('Item removed');
                                  }}
                                  className="text-red-600 hover:text-red-900"
                                  title="Remove item"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                        <tfoot className="bg-gray-50">
                          <tr>
                            <td colSpan="3" className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                              <span className="text-lg">
                                {formData.status === 'planning' ? 'Total Planned Qty:' : 'Total Quantity:'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              <span className="text-lg font-bold text-blue-600">
                                {formData.status === 'planning' 
                                  ? formData.items.reduce((sum, item) => sum + (parseInt(item.planning_qty) || 0), 0)
                                  : formData.items.reduce((sum, item) => sum + (parseInt(item.quantity) || 0), 0)
                                }
                              </span>
                            </td>
                            {formData.status === 'planning' && (
                              <>
                                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                                  <span className="text-lg font-bold text-blue-600">
                                    {formData.items.filter(item => item.selected_for_planning).length}
                                  </span>
                                </td>
                                <td className="px-6 py-3 text-sm font-medium text-gray-900">
                                  <span className="text-lg font-bold text-blue-600">
                                    {formData.items.filter(item => item.selected_for_planning).length}
                                  </span>
                                </td>
                              </>
                            )}
                            <td colSpan={formData.status === 'planning' ? 0 : 2} className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                              <span className="text-lg">
                                {formData.status === 'planning' ? 'Total Planned Amount:' : 'Total Amount:'}
                              </span>
                            </td>
                            <td className="px-6 py-3 text-sm font-medium text-gray-900">
                              <span className="text-lg font-bold text-blue-600">
                                ₹{formData.status === 'planning' 
                                  ? formData.items.reduce((sum, item) => sum + (parseFloat(item.planning_qty || 0) * parseFloat(item.unit_price || 0)), 0).toFixed(2)
                                  : formData.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0).toFixed(2)
                                }
                              </span>
                            </td>
                            <td></td>
                          </tr>
                        </tfoot>
                      </table>
                    </div>
                  </div>
                )}

                <div className="flex justify-end space-x-4 pt-6 border-t">
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
                    {editingPO ? 'Update PO' : 'Add PO'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Paste Preview Modal */}
      {showPastePreview && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-4xl w-full max-h-[80vh] overflow-y-auto">
            <div className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Pasted Data Preview</h3>
                <button
                  onClick={closePastePreview}
                  className="text-gray-400 hover:text-gray-600"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="mb-4">
                <p className="text-sm text-gray-600">
                  Found {pastePreview.length} rows. You can apply individual rows or add all as items to the PO.
                </p>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Row</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LID</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EAN</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Action</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {pastePreview.map((row, index) => (
                      <tr 
                        key={row.id} 
                        className={`hover:bg-gray-50 cursor-pointer ${
                          selectedPasteRow === index ? 'bg-blue-50' : ''
                        }`}
                        onClick={() => setSelectedPasteRow(index)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          {index + 1}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.lid}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            row.sku ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                          }`}>
                            {row.sku || 'Not Found'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            row.g_code ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.g_code || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className={`px-2 py-1 rounded-full text-xs ${
                            row.ean ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                          }`}>
                            {row.ean || 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.quantity}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          {row.rate}
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              applyPasteRow(index);
                            }}
                            className="bg-blue-600 text-white px-3 py-1 rounded-md hover:bg-blue-700 text-sm"
                          >
                            Apply
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="flex justify-between gap-4 mt-6 pt-4 border-t">
                <button
                  onClick={applyAllPasteRows}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 flex items-center gap-2"
                >
                  <Plus className="h-4 w-4" />
                  Add All as Items ({pastePreview.length})
                </button>
                <div className="flex gap-2">
                  <button
                    onClick={closePastePreview}
                    className="px-4 py-2 text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => applyPasteRow(selectedPasteRow)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2"
                  >
                    Apply Selected Row
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Modal */}
      {showDeliveredModal && selectedPOForDelivery && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-4xl w-full border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <CheckCircle className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Mark PO as Delivered</h3>
                  <div className="text-xs text-gray-500 mt-0.5">PO: <span className="font-medium text-gray-700">{selectedPOForDelivery.po_number}</span></div>
                </div>
              </div>
              <button onClick={closeDeliveredModal} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 space-y-4 overflow-y-auto flex-1">
              <div>
                <label className="block text-sm font-medium text-gray-900 mb-2">Upload POD</label>
                <input type="file" accept=".pdf,image/*" onChange={handlePODFileChange} className="block w-full text-sm border rounded-md p-2 focus:outline-none focus:ring-2 focus:ring-purple-500/50 focus:border-purple-500" />
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Unloading Charges</label>
                  <input name="unloadingCharges" type="number" value={deliveryForm.unloadingCharges} onChange={handleDeliveryInputChange} className="input h-10" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Forward Cost</label>
                  <input name="forwardCost" type="number" value={deliveryForm.forwardCost} onChange={handleDeliveryInputChange} className="input h-10" placeholder="0" />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Reverse Cost</label>
                  <input name="reverseCost" type="number" value={deliveryForm.reverseCost} onChange={handleDeliveryInputChange} className="input h-10" placeholder="0" />
                </div>
              </div>

              {/* Per-SKU Delivery Breakdown */}
              {Object.keys(deliveryForm.skuDeliveries || {}).length > 0 && (
                <div className="mt-4">
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-sm font-medium text-gray-900">Delivery Breakdown by SKU</label>
                    <span className="text-xs text-gray-500">Fill Delivered, Reject, Short, Excess. Reverse auto-calculates.</span>
                  </div>
                  <div className="overflow-x-auto border border-gray-200 rounded-lg">
                    <table className="min-w-full text-sm">
                      <thead className="bg-gray-50 sticky top-0 z-10">
                        <tr>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Dispatch Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivered Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reject Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Excess Qty</th>
                          <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">Reverse Qty</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-100">
                        {Object.entries(deliveryForm.skuDeliveries).map(([sku, row]) => (
                          <tr key={sku} className="hover:bg-gray-50">
                            <td className="px-3 py-2">
                              <div className="font-medium text-gray-900">{sku}</div>
                              <div className="text-xs text-gray-500">LID: {row.lid || 'N/A'}</div>
                            </td>
                            <td className="px-3 py-2 text-gray-800">{row.dispatch_qty}</td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="input h-9"
                                value={row.delivered_qty}
                                onChange={(e) => handleSkuDeliveryChange(sku, 'delivered_qty', e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="input h-9"
                                value={row.reject_qty}
                                onChange={(e) => handleSkuDeliveryChange(sku, 'reject_qty', e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="input h-9"
                                value={row.short_qty}
                                onChange={(e) => handleSkuDeliveryChange(sku, 'short_qty', e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2">
                              <input
                                type="number"
                                className="input h-9"
                                value={row.excess_qty}
                                onChange={(e) => handleSkuDeliveryChange(sku, 'excess_qty', e.target.value)}
                                placeholder="0"
                              />
                            </td>
                            <td className="px-3 py-2 text-gray-900 font-medium">
                              {row.reverse_qty || 0}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  <div className="text-xs text-gray-500 mt-2">
                    Reverse Qty = Reject Qty + Excess Qty
                  </div>
                </div>
              )}

              {/* Reattempts Section */}
              <div className="mt-2">
                <div className="flex items-center justify-between mb-2">
                  <label className="block text-sm font-medium text-gray-900">Reattempts</label>
                  <button type="button" onClick={addReattemptRow} className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded hover:bg-blue-200">Add Reattempt</button>
                </div>
                <div className="space-y-2">
                  {deliveryForm.reattempts.map((ra, idx) => (
                    <div key={idx} className="grid grid-cols-12 gap-2 items-center">
                      <div className="col-span-6">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Attempt Code</label>
                        <input type="text" value={ra.code} onChange={(e) => handleReattemptChange(idx, 'code', e.target.value)} className="input" placeholder="Enter attempt code" />
                      </div>
                      <div className="col-span-5">
                        <label className="block text-xs font-medium text-gray-700 mb-1">Cost of Reattempt</label>
                        <input type="number" value={ra.cost} onChange={(e) => handleReattemptChange(idx, 'cost', e.target.value)} className="input" placeholder="0" />
                      </div>
                      <div className="col-span-1 flex items-end pb-1">
                        <button type="button" onClick={() => removeReattemptRow(idx)} className="px-2 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200" title="Remove">
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <div className="mt-2 text-sm text-gray-700">
                  <span className="font-medium">Total Reattempt Charges:</span> ₹{getReattemptTotal().toFixed(2)}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Remark</label>
                <textarea name="remark" value={deliveryForm.remark} onChange={handleDeliveryInputChange} className="input" rows="3" placeholder="Notes or remarks..." />
              </div>

              {/* Total Logistic Cost */}
              <div className="p-3 bg-gray-50 border rounded-lg text-sm text-gray-800">
                <div>
                  <span className="font-medium">Total Logistic Cost:</span> ₹{(
                    (parseFloat(deliveryForm.unloadingCharges) || 0) +
                    (parseFloat(deliveryForm.forwardCost) || 0) +
                    (parseFloat(deliveryForm.reverseCost) || 0) +
                    getReattemptTotal()
                  ).toFixed(2)}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Unloading Charges + Forward Cost + Reverse Cost + All Reattempt charges
                </div>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={closeDeliveredModal} className="px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50">Cancel</button>
              <button onClick={submitDelivered} disabled={deliverySubmitting} className="px-4 py-2 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed inline-flex items-center shadow-sm">
                {deliverySubmitting ? (
                  <>
                    <div className="spinner w-4 h-4 mr-2"></div>
                    Saving...
                  </>
                ) : (
                  <>
                    <CheckCircle className="w-4 h-4 mr-2" />
                    Mark Delivered
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PO Details Modal */}
      {showPODetails && selectedPODetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      PO Details - {selectedPODetails.po_number}
                    </h3>
                    <div className="flex items-center gap-3 mt-1">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                        selectedPODetails.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                        selectedPODetails.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                        selectedPODetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                        selectedPODetails.status === 'approved' ? 'bg-green-100 text-green-800' :
                        'bg-gray-100 text-gray-800'
                      }`}>
                        {selectedPODetails.status?.toUpperCase() || 'PENDING'}
                      </span>
                      {activeTab === 'planned' && (
                        <span className="text-xs text-green-600 font-medium">
                          • Planning Mode
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <button
                  onClick={closePODetails}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  title="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              {/* PO Basic Info - Enhanced */}
              <div className="mb-6 p-5 bg-gradient-to-br from-gray-50 to-gray-100 rounded-xl border border-gray-200 shadow-sm">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                  {/* Platform */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Package className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Platform</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">{selectedPODetails.platform || 'N/A'}</p>
                  </div>

                  {/* T-WH */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Database className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">T-WH</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedPODetails.t_wh || 'N/A'}</p>
                  </div>

                  {/* PO Date */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Calendar className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PO Date</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPODetails.po_date ? new Date(selectedPODetails.po_date).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>

                  {/* PO Expire */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Clock className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">PO Expire</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">
                      {selectedPODetails.po_expire ? new Date(selectedPODetails.po_expire).toLocaleDateString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric' }) : 'N/A'}
                    </p>
                  </div>

                  {/* Location */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <MapPin className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Location</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900">{selectedPODetails.location || 'N/A'}</p>
                  </div>

                  {/* Status */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <CheckCircle className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Status</label>
                    </div>
                    <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full ${
                      selectedPODetails.status === 'delivered' ? 'bg-purple-100 text-purple-800' :
                      selectedPODetails.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                      selectedPODetails.status === 'approved' ? 'bg-green-100 text-green-800' :
                      selectedPODetails.status === 'dispatched' ? 'bg-blue-100 text-blue-800' :
                      selectedPODetails.status === 'rejected' ? 'bg-red-100 text-red-800' :
                      'bg-gray-100 text-gray-800'
                    }`}>
                      {(selectedPODetails.status || 'pending').toUpperCase()}
                    </span>
                  </div>

                  {/* Entry By Username */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <User className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Entry By</label>
                    </div>
                    <p className="text-sm font-semibold text-gray-900 capitalize">
                      {selectedPODetails.created_by || selectedPODetails.entry_by || selectedPODetails.username || selectedPODetails.entry_by_userid || 'N/A'}
                    </p>
                  </div>

                  {/* Created Date */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <Plus className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Created Date</label>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedPODetails.created_date ? new Date(selectedPODetails.created_date).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 
                       selectedPODetails.created_at ? new Date(selectedPODetails.created_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'N/A'}
                    </p>
                  </div>

                  {/* Last Modified Date */}
                  <div className="bg-white rounded-lg p-3 border border-gray-200 shadow-sm">
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className="w-8 h-8 rounded-lg bg-gray-100 flex items-center justify-center">
                        <RefreshCw className="w-4 h-4 text-gray-600" />
                      </div>
                      <label className="text-xs font-medium text-gray-500 uppercase tracking-wide">Last Modified</label>
                    </div>
                    <p className="text-sm font-medium text-gray-900">
                      {selectedPODetails.last_modified_date ? new Date(selectedPODetails.last_modified_date).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 
                       selectedPODetails.updated_at ? new Date(selectedPODetails.updated_at).toLocaleString('en-IN', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true, timeZone: 'Asia/Kolkata' }) : 'N/A'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Items Table */}
              <div className="mb-4">
                <h4 className="text-md font-semibold text-gray-900 mb-3">
                  Items ({selectedPODetails.items ? selectedPODetails.items.length : (selectedPODetails.lid ? 1 : 0)})
                </h4>
                
                {/* Planning Summary */}
                {selectedPODetails.status === 'planning' && selectedPODetails.planning_items && selectedPODetails.planning_items.length > 0 && (
                  <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                    <h5 className="text-sm font-medium text-blue-800 mb-2">Planning Summary:</h5>
                    <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                      <div>
                        <span className="font-medium">Planned SKUs:</span> {selectedPODetails.planning_items.filter(item => item.selected_for_planning === true || item.planned_qty > 0).length}/{selectedPODetails.planning_items.length}
                      </div>
                      <div>
                        <span className="font-medium">Total Planned Qty:</span> {selectedPODetails.planning_items.reduce((sum, item) => {
                          const qty = parseFloat(item.planned_qty || item.planning_qty || 0);
                          return sum + (isNaN(qty) ? 0 : qty);
                        }, 0)}
                      </div>
                      <div>
                        <span className="font-medium">Total Planned Amount:</span> ₹{selectedPODetails.planning_items.reduce((sum, item) => {
                          const qty = parseFloat(item.planned_qty || item.planning_qty || 0);
                          const price = parseFloat(item.unit_price || 0);
                          return sum + (qty * price);
                        }, 0).toFixed(2)}
                      </div>
                      <div>
                        <span className="font-medium">Original Amount:</span> ₹{selectedPODetails.planning_items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0).toFixed(2)} 
                      </div>
                    </div>
                  </div>
                )}
                
                {selectedPODetails.items && selectedPODetails.items.length > 0 ? (
                  <div className="overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                      <thead className="bg-gray-50">
                        <tr>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">G-Code</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">EAN</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LID</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Quantity</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Total Price</th>
                          <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price</th>
                        </tr>
                      </thead>
                      <tbody className="bg-white divide-y divide-gray-200">
                        {selectedPODetails.items.map((item, index) => {
                          const targetPrice = getTargetPriceForItem(item, selectedPODetails.po_date);
                          const targetPriceValue = targetPrice ? parseFloat(targetPrice.target_price) || 0 : 0;
                          const poRate = parseFloat(item.unit_price) || 0;
                          const isTargetGreaterOrEqual = targetPriceValue >= poRate;
                          
                          return (
                            <tr key={index} className={`hover:bg-gray-50 ${
                              targetPrice ? (isTargetGreaterOrEqual ? 'bg-green-50' : 'bg-red-50') : ''
                            }`}>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {item.sku || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.g_code ? 'bg-blue-100 text-blue-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.g_code || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              <span className={`px-2 py-1 rounded-full text-xs ${
                                item.ean ? 'bg-purple-100 text-purple-800' : 'bg-gray-100 text-gray-800'
                              }`}>
                                {item.ean || 'N/A'}
                              </span>
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.lid || 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {activeTab === 'planned' && selectedPODetails.status === 'planning' ? (
                                <div>
                                  <div className="text-purple-600 font-medium">
                                    Planned: {item.planned_qty || item.planning_qty || 0}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Original: {item.quantity || 'N/A'}
                                  </div>
                                </div>
                              ) : (
                                item.quantity || 'N/A'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {item.unit_price ? `₹${item.unit_price}` : 'N/A'}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                              {activeTab === 'planned' && selectedPODetails.status === 'planning' ? (
                                <div>
                                  <div className="text-green-600 font-medium">
                                    Planned: ₹{((item.planned_qty || item.planning_qty || 0) * (item.unit_price || 0)).toFixed(2)}
                                  </div>
                                  <div className="text-gray-500 text-xs">
                                    Original: {item.total_price ? `₹${item.total_price}` : 'N/A'}
                                  </div>
                                </div>
                              ) : (
                                item.total_price ? `₹${item.total_price}` : 'N/A'
                              )}
                            </td>
                            <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                              {(() => {
                                const targetPrice = getTargetPriceForItem(item, selectedPODetails.po_date);
                                if (!targetPrice) {
                                  return <span className="text-gray-400 text-xs">No match</span>;
                                }
                                
                                const targetPriceValue = parseFloat(targetPrice.target_price) || 0;
                                const poRate = parseFloat(item.unit_price) || 0;
                                const isTargetGreaterOrEqual = targetPriceValue >= poRate;
                                
                                return (
                                  <div className="space-y-1">
                                    <div className="text-xs">
                                      <span className="font-medium text-gray-600">Target:</span>
                                      <span className="ml-1 text-gray-900">{targetPriceValue}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className="font-medium text-gray-600">Rate:</span>
                                      <span className="ml-1 text-gray-900">{poRate}</span>
                                    </div>
                                    <div className="text-xs">
                                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                                        isTargetGreaterOrEqual ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                      }`}>
                                        {isTargetGreaterOrEqual ? 'Target ≥ Rate' : 'Target < Rate'}
                                      </span>
                                    </div>
                                  </div>
                                );
                              })()}
                            </td>
                          </tr>
                          );
                        })}
                      </tbody>
                      <tfoot className="bg-gray-50">
                        <tr>
                          <td colSpan="6" className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                            Total:
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            ₹{selectedPODetails.items.reduce((sum, item) => sum + (parseFloat(item.total_price) || 0), 0).toFixed(2)}
                          </td>
                          <td className="px-6 py-3 text-sm font-medium text-gray-900">
                            {/* Target Price Summary */}
                          </td>
                        </tr>
                      </tfoot>
                    </table>
                  </div>
                ) : selectedPODetails.lid ? (
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-gray-700">LID</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.lid}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">SKU</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.sku || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">G-Code</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.g_code || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">EAN</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.ean || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Quantity</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.quantity || 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Rate</label>
                        <p className="text-sm text-gray-900">{selectedPODetails.rate ? `₹${selectedPODetails.rate}` : 'N/A'}</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-700">Total</label>
                        <p className="text-sm font-medium text-gray-900">
                          {selectedPODetails.quantity && selectedPODetails.rate ? 
                            `₹${(parseFloat(selectedPODetails.quantity) * parseFloat(selectedPODetails.rate)).toFixed(2)}` : 
                            'N/A'
                          }
                        </p>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-gray-50 rounded-lg text-center">
                    <p className="text-gray-500">No items found for this PO</p>
                  </div>
                )}
              </div>

              {/* Dispatch Information Section */}
              {selectedPODetails.dispatch_data && (
                <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-xl border border-blue-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-blue-100 flex items-center justify-center">
                      <Truck className="w-5 h-5 text-blue-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Dispatch Information</h4>
                  </div>
                  
                  <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Courier</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.dispatch_data.courier || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Vehicle No.</label>
                      <p className="text-sm font-medium text-gray-900 font-mono">{selectedPODetails.dispatch_data.vehicle_no || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dispatch Date</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.dispatch_data.dispatch_date ? new Date(selectedPODetails.dispatch_data.dispatch_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Waybill No.</label>
                      <p className="text-sm font-medium text-gray-900 font-mono">{selectedPODetails.dispatch_data.waybill_no || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">E-Waybill No.</label>
                      <p className="text-sm font-medium text-gray-900 font-mono">{selectedPODetails.dispatch_data.e_waybill_no || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Appointment Date</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.dispatch_data.appointment_date ? new Date(selectedPODetails.dispatch_data.appointment_date).toLocaleDateString() : 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Dispatched By</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.dispatch_data.dispatched_by || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-blue-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Dispatch Qty</label>
                      <p className="text-sm font-medium text-blue-600">
                        {selectedPODetails.dispatch_data.dispatch_qty ? Object.values(selectedPODetails.dispatch_data.dispatch_qty).reduce((sum, qty) => sum + (Number(qty) || 0), 0) : 0}
                      </p>
                    </div>
                  </div>
                  
                  {/* Dispatch Files */}
                  {selectedPODetails.dispatch_data.files && (
                    <div className="mt-4 pt-4 border-t border-blue-200">
                      <label className="block text-sm font-medium text-gray-700 mb-2">Dispatch Documents:</label>
                      <div className="flex flex-wrap gap-2">
                        {selectedPODetails.dispatch_data.files.invoice && (
                          <a href={selectedPODetails.dispatch_data.files.invoice.serve_url ? (selectedPODetails.dispatch_data.files.invoice.serve_url.startsWith('http') ? selectedPODetails.dispatch_data.files.invoice.serve_url : `http://localhost:8000${selectedPODetails.dispatch_data.files.invoice.serve_url}`) : selectedPODetails.dispatch_data.files.invoice.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 font-medium">
                            <FileText className="w-3 h-3 mr-1.5" />
                            Invoice
                          </a>
                        )}
                        {selectedPODetails.dispatch_data.files.waybill && (
                          <a href={selectedPODetails.dispatch_data.files.waybill.serve_url ? (selectedPODetails.dispatch_data.files.waybill.serve_url.startsWith('http') ? selectedPODetails.dispatch_data.files.waybill.serve_url : `http://localhost:8000${selectedPODetails.dispatch_data.files.waybill.serve_url}`) : selectedPODetails.dispatch_data.files.waybill.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 font-medium">
                            <FileText className="w-3 h-3 mr-1.5" />
                            Waybill
                          </a>
                        )}
                        {selectedPODetails.dispatch_data.files.e_waybill && (
                          <a href={selectedPODetails.dispatch_data.files.e_waybill.serve_url ? (selectedPODetails.dispatch_data.files.e_waybill.serve_url.startsWith('http') ? selectedPODetails.dispatch_data.files.e_waybill.serve_url : `http://localhost:8000${selectedPODetails.dispatch_data.files.e_waybill.serve_url}`) : selectedPODetails.dispatch_data.files.e_waybill.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 font-medium">
                            <FileText className="w-3 h-3 mr-1.5" />
                            E-Waybill
                          </a>
                        )}
                        {selectedPODetails.dispatch_data.files.proof_of_dispatch && (
                          <a href={selectedPODetails.dispatch_data.files.proof_of_dispatch.serve_url ? (selectedPODetails.dispatch_data.files.proof_of_dispatch.serve_url.startsWith('http') ? selectedPODetails.dispatch_data.files.proof_of_dispatch.serve_url : `http://localhost:8000${selectedPODetails.dispatch_data.files.proof_of_dispatch.serve_url}`) : selectedPODetails.dispatch_data.files.proof_of_dispatch.url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center px-3 py-1.5 text-xs bg-green-100 text-green-800 rounded-md hover:bg-green-200 font-medium">
                            <FileText className="w-3 h-3 mr-1.5" />
                            Proof of Dispatch
                          </a>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Delivered Information Section */}
              {selectedPODetails.delivered_data && (
                <div className="mb-6 p-5 bg-gradient-to-br from-purple-50 to-pink-50 rounded-xl border border-purple-200 shadow-sm">
                  <div className="flex items-center gap-3 mb-4">
                    <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                      <CheckCircle className="w-5 h-5 text-purple-600" />
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Delivered Information</h4>
                  </div>
                  
                  {/* Delivered Summary */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-4">
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivered Date</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.delivered_data.delivered_date ? new Date(selectedPODetails.delivered_data.delivered_date).toLocaleString() : 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Delivered By</label>
                      <p className="text-sm font-medium text-gray-900">{selectedPODetails.delivered_data.delivered_by || 'N/A'}</p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Delivered Qty</label>
                      <p className="text-sm font-medium text-purple-600">
                        {selectedPODetails.delivered_data.sku_delivery ? Object.values(selectedPODetails.delivered_data.sku_delivery).reduce((sum, row) => sum + (Number(row.delivered_qty) || 0), 0) : 0}
                      </p>
                    </div>
                    <div className="bg-white rounded-lg p-3 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Total Logistic Cost</label>
                      <p className="text-sm font-bold text-purple-700">
                        ₹{Number(selectedPODetails.delivered_data.total_logistic_cost || 0).toFixed(2)}
                      </p>
                    </div>
                  </div>
                  
                  {/* Charges Breakdown */}
                  <div className="bg-white rounded-lg p-4 mb-4 border border-purple-100">
                    <h5 className="text-sm font-semibold text-gray-700 mb-3">Logistic Charges Breakdown</h5>
                    <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Unloading Charges</label>
                        <p className="text-sm font-medium text-gray-900">₹{Number(selectedPODetails.delivered_data.unloading_charges || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Forward Cost</label>
                        <p className="text-sm font-medium text-gray-900">₹{Number(selectedPODetails.delivered_data.forward_cost || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Reverse Cost</label>
                        <p className="text-sm font-medium text-gray-900">₹{Number(selectedPODetails.delivered_data.reverse_cost || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Reattempt Total</label>
                        <p className="text-sm font-medium text-gray-900">₹{Number(selectedPODetails.delivered_data.reattempt_total || 0).toFixed(2)}</p>
                      </div>
                      <div>
                        <label className="block text-xs font-medium text-gray-500 mb-1">Total Logistic Cost</label>
                        <p className="text-sm font-bold text-purple-700">₹{Number(selectedPODetails.delivered_data.total_logistic_cost || 0).toFixed(2)}</p>
                      </div>
                    </div>
                  </div>
                  
                  {/* Reattempts */}
                  {selectedPODetails.delivered_data.reattempts && selectedPODetails.delivered_data.reattempts.length > 0 && selectedPODetails.delivered_data.reattempts.some(r => r.code || r.cost) && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-purple-100">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">Reattempt Details</h5>
                      <div className="space-y-2">
                        {selectedPODetails.delivered_data.reattempts.filter(r => r.code || r.cost).map((reattempt, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                            <span className="text-sm text-gray-700">{reattempt.code || 'N/A'}</span>
                            <span className="text-sm font-medium text-gray-900">₹{Number(reattempt.cost || 0).toFixed(2)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                  
                  {/* Remark */}
                  {selectedPODetails.delivered_data.remark && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-1">Remark</label>
                      <p className="text-sm text-gray-900">{selectedPODetails.delivered_data.remark}</p>
                    </div>
                  )}
                  
                  {/* POD File */}
                  {selectedPODetails.delivered_data.pod_file && (
                    <div className="bg-white rounded-lg p-4 mb-4 border border-purple-100">
                      <label className="block text-xs font-medium text-gray-500 uppercase tracking-wide mb-2">Proof of Delivery (POD)</label>
                      <a 
                        href={selectedPODetails.delivered_data.pod_file.serve_url ? (selectedPODetails.delivered_data.pod_file.serve_url.startsWith('http') ? selectedPODetails.delivered_data.pod_file.serve_url : `http://localhost:8000${selectedPODetails.delivered_data.pod_file.serve_url}`) : selectedPODetails.delivered_data.pod_file.file_url} 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="inline-flex items-center px-3 py-1.5 text-xs bg-purple-100 text-purple-800 rounded-md hover:bg-purple-200 font-medium"
                      >
                        <FileText className="w-3 h-3 mr-1.5" />
                        {selectedPODetails.delivered_data.pod_file.file_name || 'View POD'}
                      </a>
                    </div>
                  )}
                  
                  {/* SKU Delivery Breakdown */}
                  {selectedPODetails.delivered_data.sku_delivery && Object.keys(selectedPODetails.delivered_data.sku_delivery).length > 0 && (
                    <div className="bg-white rounded-lg p-4 border border-purple-100">
                      <h5 className="text-sm font-semibold text-gray-700 mb-3">SKU Delivery Breakdown</h5>
                      <div className="overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead className="bg-gray-50">
                            <tr>
                              <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase">SKU</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Dispatch Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Delivered Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Short Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Excess Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Reject Qty</th>
                              <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase">Reverse Qty</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-gray-200">
                            {Object.entries(selectedPODetails.delivered_data.sku_delivery).map(([sku, data]) => (
                              <tr key={sku} className="hover:bg-gray-50">
                                <td className="px-3 py-2">
                                  <div className="font-medium text-gray-900">{sku}</div>
                                  {selectedPODetails.items && selectedPODetails.items.find(i => i.sku === sku)?.lid && (
                                    <div className="text-xs text-gray-500">LID: {selectedPODetails.items.find(i => i.sku === sku).lid}</div>
                                  )}
                                </td>
                                <td className="px-3 py-2 text-center text-gray-900">{data.dispatch_qty || 0}</td>
                                <td className="px-3 py-2 text-center font-medium text-purple-600">{data.delivered_qty || 0}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{data.short_qty || 0}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{data.excess_qty || 0}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{data.reject_qty || 0}</td>
                                <td className="px-3 py-2 text-center text-gray-900">{data.reverse_qty || 0}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Physical PO Files Section */}
              {(() => {
                const allFiles = [...(selectedPODetails.aggregated_files || []), ...(selectedPODetails.uploaded_files || [])];
                const uniqueFiles = allFiles.filter((file, index, self) => 
                  index === self.findIndex(f => f.id === file.id)
                );
                return uniqueFiles.length > 0 ? (
                  <div className="mb-6">
                    <h4 className="text-md font-semibold text-gray-900 mb-3">
                      Physical PO Documents ({uniqueFiles.length})
                    </h4>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {uniqueFiles.map((file, index) => (
                        <div key={index} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                        <div className="flex items-center space-x-3">
                          {file.type === 'application/pdf' ? (
                            <FileText className="h-8 w-8 text-red-500 flex-shrink-0" />
                          ) : (
                            <Image className="h-8 w-8 text-green-500 flex-shrink-0" />
                          )}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium text-gray-900 truncate">{file.name}</p>
                            <p className="text-xs text-gray-500">
                              {(file.size / 1024 / 1024).toFixed(2)} MB • {file.type.split('/')[1].toUpperCase()}
                            </p>
                            <p className="text-xs text-gray-500">
                              Uploaded: {new Date(file.uploaded_at).toLocaleDateString('en-IN', { timeZone: 'Asia/Kolkata' })}
                            </p>
                          </div>
                          <div className="flex-shrink-0">
                            <a
                              href={`http://localhost:8000/files/serve-file/${selectedPODetails.po_number}/${file.id}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center px-3 py-1 border border-transparent text-xs font-medium rounded-md text-blue-700 bg-blue-100 hover:bg-blue-200 transition-colors"
                            >
                              View
                            </a>
                          </div>
                        </div>
                      </div>
                    ))}
                    </div>
                    
                    {uniqueFiles.length === 0 && (
                      <div className="p-4 bg-gray-50 rounded-lg text-center">
                        <FileText className="mx-auto h-8 w-8 text-gray-400 mb-2" />
                        <p className="text-gray-500">No physical PO documents uploaded</p>
                      </div>
                    )}
                  </div>
                ) : null;
              })()}

              <div className="flex justify-end">
                <button
                  onClick={closePODetails}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Planning Modal */}
      {showPlanningModal && selectedPOForPlanning && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center">
                    <Database className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h2 className="text-xl font-bold text-gray-900">
                      Planning for PO: {selectedPOForPlanning.po_number}
                    </h2>
                    <span className="text-xs text-blue-600 font-medium mt-1 inline-block">Select items and quantities for planning</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowPlanningModal(false)}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  title="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>

              <div className="mb-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                <h3 className="text-sm font-medium text-blue-800 mb-2">PO Details:</h3>
                <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                  <div><span className="font-medium">Platform:</span> {selectedPOForPlanning.platform}</div>
                  <div><span className="font-medium">Location:</span> {selectedPOForPlanning.location}</div>
                  <div><span className="font-medium">PO Date:</span> {selectedPOForPlanning.po_date}</div>
                  <div><span className="font-medium">PO Expire:</span> {selectedPOForPlanning.po_expire}</div>
                </div>
              </div>

              <div className="mb-6">
                <h3 className="text-lg font-medium text-gray-900 mb-4">Select Items for Planning</h3>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Select</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">LID</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Unit Price</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Qty</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planned Amount</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {planningItems.map((item, index) => (
                        <tr key={index} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="checkbox"
                              checked={item.selected_for_planning}
                              onChange={() => handlePlanningItemToggle(index)}
                              className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.sku || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.lid || 'N/A'}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            {item.quantity || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{item.unit_price || 0}
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <input
                              type="number"
                              min="0"
                              max={item.quantity || 0}
                              value={item.planned_qty || 0}
                              onChange={(e) => handlePlanningQtyChange(index, e.target.value)}
                              disabled={!item.selected_for_planning}
                              className="w-20 px-2 py-1 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
                            />
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                            ₹{((item.planned_qty || 0) * (item.unit_price || 0)).toFixed(2)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                    <tfoot className="bg-gray-50">
                      <tr>
                        <td colSpan="5" className="px-6 py-3 text-right text-sm font-medium text-gray-900">
                          <span className="text-lg">Total Planned:</span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          <span className="text-lg font-bold text-blue-600">
                            {planningItems
                              .filter(item => item.selected_for_planning)
                              .reduce((sum, item) => sum + (item.planned_qty || 0), 0)}
                          </span>
                        </td>
                        <td className="px-6 py-3 text-sm font-medium text-gray-900">
                          <span className="text-lg font-bold text-blue-600">
                            ₹{planningItems
                              .filter(item => item.selected_for_planning)
                              .reduce((sum, item) => sum + ((item.planned_qty || 0) * (item.unit_price || 0)), 0)
                              .toFixed(2)}
                          </span>
                        </td>
                      </tr>
                    </tfoot>
                  </table>
                </div>
              </div>

              <div className="flex justify-end space-x-3">
                <button
                  onClick={() => setShowPlanningModal(false)}
                  className="px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSavePlanning}
                  className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
                >
                  Save Planning
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Enhanced Dispatch Modal */}
      {showDispatchModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-cyan-600 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Dispatch PO: {selectedPOForDispatch?.po_number}
                    </h3>
                    <span className="text-xs text-blue-600 font-medium mt-1 inline-block">Enter dispatch information and upload documents</span>
                  </div>
                </div>
                <button
                  onClick={handleDispatchCancel}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  title="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Left Column - Basic Info */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Basic Information</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Courier *
                    </label>
                    <select
                      value={dispatchData.courier}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, courier: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      required
                    >
                      <option value="">Select Courier</option>
                      <option value="Blue Dart">Blue Dart</option>
                      <option value="DTDC">DTDC</option>
                      <option value="Delhivery">Delhivery</option>
                      <option value="Ecom Express">Ecom Express</option>
                      <option value="FedEx">FedEx</option>
                      <option value="India Post">India Post</option>
                      <option value="Professional">Professional</option>
                      <option value="Shadowfax">Shadowfax</option>
                      <option value="Xpressbees">Xpressbees</option>
                      <option value="Other">Other</option>
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Dispatch Date
                    </label>
                    <input
                      type="date"
                      value={dispatchData.dispatchDate}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, dispatchDate: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Vehicle Number
                    </label>
                    <input
                      type="text"
                      value={dispatchData.vehicleNo}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, vehicleNo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter vehicle number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Waybill Number
                    </label>
                    <input
                      type="text"
                      value={dispatchData.waybillNo}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, waybillNo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter waybill number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      E-Waybill Number
                    </label>
                    <input
                      type="text"
                      value={dispatchData.eWaybillNo}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, eWaybillNo: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Enter e-waybill number"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Appointment Date (Optional)
                    </label>
                    <input
                      type="datetime-local"
                      value={dispatchData.appointmentDate}
                      onChange={(e) => {
                        console.log('Appointment date changed:', e.target.value);
                        setDispatchData(prev => ({ ...prev, appointmentDate: e.target.value }));
                      }}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="Select appointment date and time"
                    />
                    {dispatchData.appointmentDate && (
                      <p className="text-sm text-green-600 mt-1">
                        ✓ Appointment scheduled for: {new Date(dispatchData.appointmentDate).toLocaleString()}
                      </p>
                    )}
                  </div>
                </div>

                {/* Right Column - Files and Quantities */}
                <div className="space-y-4">
                  <h4 className="text-lg font-medium text-gray-900 border-b pb-2">Files & Documents</h4>
                  
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Invoice
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDispatchFileUpload('invoiceFile', e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dispatchData.invoiceFile && (
                      <p className="text-sm text-green-600 mt-1">✓ {dispatchData.invoiceFile.name}</p>
                    )}
                    <button
                      onClick={() => {
                        console.log('Invoice file debug:', dispatchData.invoiceFile);
                        console.log('File type:', typeof dispatchData.invoiceFile);
                        console.log('File name:', dispatchData.invoiceFile?.name);
                        console.log('File size:', dispatchData.invoiceFile?.size);
                      }}
                      className="text-xs text-blue-600 hover:text-blue-800"
                    >
                      Debug Invoice File
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Waybill
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDispatchFileUpload('waybillFile', e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dispatchData.waybillFile && (
                      <p className="text-sm text-green-600 mt-1">✓ {dispatchData.waybillFile.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload E-Waybill
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDispatchFileUpload('eWaybillFile', e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dispatchData.eWaybillFile && (
                      <p className="text-sm text-green-600 mt-1">✓ {dispatchData.eWaybillFile.name}</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Upload Proof of Dispatch
                    </label>
                    <input
                      type="file"
                      accept=".pdf,.jpg,.jpeg,.png"
                      onChange={(e) => handleDispatchFileUpload('proofOfDispatchFile', e.target.files[0])}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                    {dispatchData.proofOfDispatchFile && (
                      <p className="text-sm text-green-600 mt-1">✓ {dispatchData.proofOfDispatchFile.name}</p>
                    )}
                  </div>

                  {/* Dispatch Quantities */}
                  <div>
                    <h5 className="text-md font-medium text-gray-900 mb-3">Dispatch Quantities</h5>
                    {(() => {
                      // Debug: Log the PO data structure
                      console.log('Selected PO for dispatch:', selectedPOForDispatch);
                      console.log('Planning items:', selectedPOForDispatch?.planning_items);
                      console.log('Items:', selectedPOForDispatch?.items);
                      
                      // Try different data structures
                      const items = selectedPOForDispatch?.planning_items || selectedPOForDispatch?.items || [];
                      const hasPlanningItems = items && items.length > 0;
                      
                      if (hasPlanningItems) {
                        // Filter items that have planning data or are selected
                        const plannedItems = items.filter(item => {
                          const hasPlanningQty = (item.planned_qty || item.planning_qty || 0) > 0;
                          const isSelected = item.selected_for_planning === true;
                          return hasPlanningQty || isSelected;
                        });
                        
                        console.log('Planned items for dispatch:', plannedItems);
                        
                        if (plannedItems.length > 0) {
                          return (
                            <div className="space-y-2">
                              {plannedItems.map((item, index) => {
                                const planningQty = item.planned_qty || item.planning_qty || item.quantity || 0;
                                const sku = item.sku || item.lid || `Item ${index + 1}`;
                                
                                return (
                                  <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded">
                                    <div>
                                      <span className="font-medium text-sm">{sku}</span>
                                      <span className="text-xs text-gray-500 ml-2">(Planned: {planningQty})</span>
                                    </div>
                                    <input
                                      type="number"
                                      min="0"
                                      max={planningQty}
                                      value={dispatchData.dispatchQty[sku] || planningQty}
                                      onChange={(e) => handleDispatchQtyChange(sku, e.target.value)}
                                      className="w-20 px-2 py-1 border border-gray-300 rounded text-sm"
                                    />
                                  </div>
                                );
                              })}
                            </div>
                          );
                        }
                      }
                      
                      // Fallback: Show message
                      return (
                        <div className="text-sm text-gray-500 p-3 bg-gray-100 rounded">
                          <p>No planned items found for dispatch.</p>
                          <p className="text-xs mt-1">
                            Items need to be planned first before they can be dispatched.
                          </p>
                        </div>
                      );
                    })()}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Notes
                    </label>
                    <textarea
                      value={dispatchData.notes}
                      onChange={(e) => setDispatchData(prev => ({ ...prev, notes: e.target.value }))}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      rows="3"
                      placeholder="Add any notes about the dispatch..."
                    />
                  </div>
                </div>
              </div>
              
              <div className="flex items-center justify-end space-x-3 mt-8 pt-6 border-t">
                <button
                  onClick={handleDispatchCancel}
                  className="px-6 py-2 text-sm font-medium text-gray-700 bg-gray-100 border border-gray-300 rounded-md hover:bg-gray-200 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Cancel
                </button>
                <button
                  onClick={handleDispatchSubmit}
                  className="px-6 py-2 text-sm font-medium text-white bg-orange-600 border border-transparent rounded-md hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-500"
                >
                  <Truck className="h-4 w-4 inline mr-2" />
                  Dispatch PO
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* SKU Breakdown Modal */}
      {showSKUBreakdownModal && selectedSKUBreakdown && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-emerald-600 flex items-center justify-center">
                    <Package className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      SKU Breakdown - {selectedSKUBreakdown.platform} PO {selectedSKUBreakdown.poNumber}
                    </h3>
                    <span className="text-xs text-green-600 font-medium mt-1 inline-block">Detailed SKU information and quantities</span>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowSKUBreakdownModal(false);
                    setSelectedSKUBreakdown(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  title="Close"
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                  <thead className="bg-gray-50">
                    <tr>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">SKU Name</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">PO Rate</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Planning Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Dispatch Quantity</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Target Price</th>
                      <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-200">
                    {selectedSKUBreakdown.breakdownData.map((item, index) => (
                      <tr key={index} className="hover:bg-gray-50">
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                          <div className="max-w-xs">
                            <div className="truncate" title={item.sku}>
                              {item.sku}
                            </div>
                          </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-blue-600">{item.poQty}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-indigo-600">
                            {item.poRate ? `₹${item.poRate}` : 'N/A'}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-orange-600">{item.planningQty}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-green-600">{item.dispatchQty}</span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">
                          <span className="font-semibold text-purple-600">
                            {item.targetPrice === 'N/A' ? 'N/A' : `₹${item.targetPrice}`}
                          </span>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          {item.dispatchQty === item.poQty ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                              Complete
                            </span>
                          ) : item.dispatchQty > 0 ? (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-yellow-100 text-yellow-800">
                              Partial
                            </span>
                          ) : (
                            <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-red-100 text-red-800">
                              Not Dispatched
                            </span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              
              <div className="mt-6 flex justify-end">
                <button
                  onClick={() => {
                    setShowSKUBreakdownModal(false);
                    setSelectedSKUBreakdown(null);
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Dispatch Details Modal */}
      {showDispatchDetailsModal && selectedDispatchDetails && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-xl max-w-6xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-gray-200">
            <div className="p-6">
              <div className="flex justify-between items-center mb-6 pb-4 border-b border-gray-200">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-green-500 to-teal-600 flex items-center justify-center">
                    <Truck className="w-6 h-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-gray-900">
                      Dispatch Details
                    </h3>
                    <p className="text-sm text-gray-600 mt-1">
                      PO: {selectedDispatchDetails.po.po_number} | Platform: {selectedDispatchDetails.po.platform}
                    </p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowDispatchDetailsModal(false);
                    setSelectedDispatchDetails(null);
                  }}
                  className="text-gray-400 hover:text-gray-600 transition-colors p-2 hover:bg-gray-100 rounded-full"
                  title="Close"
              >
                <XCircle className="h-6 w-6" />
              </button>
              </div>
              
              <div className="overflow-y-auto max-h-[calc(90vh-120px)] px-6 pb-6">
                {/* Dispatch Information Cards */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-8">
                  {/* Basic Info Card */}
                  <div className="bg-blue-50 rounded-lg p-4 border border-blue-200">
                    <h4 className="text-lg font-semibold text-blue-900 mb-3 flex items-center">
                      <Database className="h-5 w-5 mr-2" />
                      Basic Information
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dispatch ID:</span>
                        <span className="text-sm font-medium text-gray-900 font-mono break-all max-w-48" title={selectedDispatchDetails.dispatchData.dispatch_id || 'N/A'}>
                          {selectedDispatchDetails.dispatchData.dispatch_id ? 
                            selectedDispatchDetails.dispatchData.dispatch_id.length > 20 ? 
                              `${selectedDispatchDetails.dispatchData.dispatch_id.substring(0, 20)}...` : 
                              selectedDispatchDetails.dispatchData.dispatch_id : 
                            'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Courier:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {selectedDispatchDetails.dispatchData.courier || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dispatched By:</span>
                        <span className="text-sm font-medium text-green-600">
                          {selectedDispatchDetails.dispatchData.dispatched_by || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Status:</span>
                        <span className="inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-green-100 text-green-800">
                          {selectedDispatchDetails.dispatchData.status || 'dispatched'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Logistics Card */}
                  <div className="bg-green-50 rounded-lg p-4 border border-green-200">
                    <h4 className="text-lg font-semibold text-green-900 mb-3 flex items-center">
                      <Truck className="h-5 w-5 mr-2" />
                      Logistics Details
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Vehicle No:</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {selectedDispatchDetails.dispatchData.vehicle_no || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Waybill No:</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {selectedDispatchDetails.dispatchData.waybill_no || 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">E-Waybill No:</span>
                        <span className="text-sm font-medium text-gray-900 font-mono">
                          {selectedDispatchDetails.dispatchData.e_waybill_no || 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Dates Card */}
                  <div className="bg-purple-50 rounded-lg p-4 border border-purple-200">
                    <h4 className="text-lg font-semibold text-purple-900 mb-3 flex items-center">
                      <RefreshCw className="h-5 w-5 mr-2" />
                      Important Dates
                    </h4>
                    <div className="space-y-2">
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dispatch Date:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDispatchDetails.dispatchData.dispatch_date ? 
                            new Date(selectedDispatchDetails.dispatchData.dispatch_date).toLocaleDateString() : 'N/A'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Appointment Date:</span>
                        <span className="text-sm font-medium text-blue-600">
                          {selectedDispatchDetails.dispatchData.appointment_date ? 
                            new Date(selectedDispatchDetails.dispatchData.appointment_date).toLocaleDateString() : 'Not set'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-sm text-gray-600">Dispatched At:</span>
                        <span className="text-sm font-medium text-gray-900">
                          {selectedDispatchDetails.dispatchData.dispatched_at ? 
                            new Date(selectedDispatchDetails.dispatchData.dispatched_at).toLocaleString() : 'N/A'}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Dispatch Quantities */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Package className="h-5 w-5 mr-2 text-orange-600" />
                    Dispatch Quantities
                  </h4>
                  <div className="bg-gray-50 rounded-lg p-4">
                    {selectedDispatchDetails.dispatchData.dispatch_qty ? (
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        {Object.entries(selectedDispatchDetails.dispatchData.dispatch_qty).map(([sku, qty]) => (
                          <div key={sku} className="flex justify-between items-center p-3 bg-white rounded border">
                            <span className="text-sm font-medium text-gray-900 truncate max-w-xs" title={sku}>
                              {sku}
                            </span>
                            <span className="text-sm font-semibold text-blue-600 bg-blue-100 px-2 py-1 rounded">
                              {qty}
                            </span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-gray-500 text-center py-4">No dispatch quantities available</p>
                    )}
                  </div>
                </div>

                {/* Files Section */}
                <div className="mb-8">
                  <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <FileText className="h-5 w-5 mr-2 text-indigo-600" />
                    Dispatch Files
                  </h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    {/* Invoice */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Invoice</h5>
                      {selectedDispatchDetails.dispatchData.files?.invoice?.name ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 truncate" title={selectedDispatchDetails.dispatchData.files.invoice.name}>
                            {selectedDispatchDetails.dispatchData.files.invoice.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(selectedDispatchDetails.dispatchData.files.invoice.size / 1024).toFixed(1)} KB
                          </p>
                          <a
                            href={selectedDispatchDetails.dispatchData.files.invoice.serve_url?.startsWith('http') ? 
                              selectedDispatchDetails.dispatchData.files.invoice.serve_url : 
                              `http://localhost:8000${selectedDispatchDetails.dispatchData.files.invoice.serve_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>

                    {/* Waybill */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Waybill</h5>
                      {selectedDispatchDetails.dispatchData.files?.waybill?.name ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 truncate" title={selectedDispatchDetails.dispatchData.files.waybill.name}>
                            {selectedDispatchDetails.dispatchData.files.waybill.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(selectedDispatchDetails.dispatchData.files.waybill.size / 1024).toFixed(1)} KB
                          </p>
                          <a
                            href={selectedDispatchDetails.dispatchData.files.waybill.serve_url?.startsWith('http') ? 
                              selectedDispatchDetails.dispatchData.files.waybill.serve_url : 
                              `http://localhost:8000${selectedDispatchDetails.dispatchData.files.waybill.serve_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>

                    {/* E-Waybill */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">E-Waybill</h5>
                      {selectedDispatchDetails.dispatchData.files?.e_waybill?.name ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 truncate" title={selectedDispatchDetails.dispatchData.files.e_waybill.name}>
                            {selectedDispatchDetails.dispatchData.files.e_waybill.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(selectedDispatchDetails.dispatchData.files.e_waybill.size / 1024).toFixed(1)} KB
                          </p>
                          <a
                            href={selectedDispatchDetails.dispatchData.files.e_waybill.serve_url?.startsWith('http') ? 
                              selectedDispatchDetails.dispatchData.files.e_waybill.serve_url : 
                              `http://localhost:8000${selectedDispatchDetails.dispatchData.files.e_waybill.serve_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>

                    {/* Proof of Dispatch */}
                    <div className="bg-white border rounded-lg p-4">
                      <h5 className="font-medium text-gray-900 mb-2">Proof of Dispatch</h5>
                      {selectedDispatchDetails.dispatchData.files?.proof_of_dispatch?.name ? (
                        <div className="space-y-2">
                          <p className="text-sm text-gray-600 truncate" title={selectedDispatchDetails.dispatchData.files.proof_of_dispatch.name}>
                            {selectedDispatchDetails.dispatchData.files.proof_of_dispatch.name}
                          </p>
                          <p className="text-xs text-gray-500">
                            {(selectedDispatchDetails.dispatchData.files.proof_of_dispatch.size / 1024).toFixed(1)} KB
                          </p>
                          <a
                            href={selectedDispatchDetails.dispatchData.files.proof_of_dispatch.serve_url?.startsWith('http') ? 
                              selectedDispatchDetails.dispatchData.files.proof_of_dispatch.serve_url : 
                              `http://localhost:8000${selectedDispatchDetails.dispatchData.files.proof_of_dispatch.serve_url}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center px-3 py-1 text-xs bg-green-100 text-green-800 rounded hover:bg-green-200"
                          >
                            <Eye className="h-3 w-3 mr-1" />
                            View
                          </a>
                        </div>
                      ) : (
                        <p className="text-sm text-gray-400">Not available</p>
                      )}
                    </div>
                  </div>
                </div>

                {/* Notes Section */}
                {selectedDispatchDetails.dispatchData.notes && (
                  <div className="mb-8">
                    <h4 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                      <FileText className="h-5 w-5 mr-2 text-yellow-600" />
                      Notes
                    </h4>
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                      <p className="text-sm text-gray-700">{selectedDispatchDetails.dispatchData.notes}</p>
                    </div>
                  </div>
                )}
              </div>
              
              <div className="px-6 py-4 border-t border-gray-200 flex justify-end">
                <button
                  onClick={() => {
                    setShowDispatchDetailsModal(false);
                    setSelectedDispatchDetails(null);
                  }}
                  className="px-6 py-2 text-sm font-medium text-white bg-gray-600 border border-transparent rounded-md hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-gray-500"
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Delivered Quantity Details Modal */}
      {showDeliveredQtyModal && selectedDeliveredQtyPO && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-5xl w-full border border-gray-200 max-h-[90vh] flex flex-col">
            <div className="flex items-center justify-between p-6 border-b border-gray-200 bg-gradient-to-r from-purple-50 to-white rounded-t-xl flex-shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-purple-100 flex items-center justify-center">
                  <Package className="w-5 h-5 text-purple-600" />
                </div>
                <div>
                  <h3 className="text-lg font-semibold text-gray-900">Quantity Breakdown</h3>
                  <div className="text-xs text-gray-500 mt-0.5">PO: <span className="font-medium text-gray-700">{selectedDeliveredQtyPO.po_number}</span></div>
                </div>
              </div>
              <button onClick={closeDeliveredQtyModal} className="text-gray-400 hover:text-gray-600">
                <XCircle className="w-6 h-6" />
              </button>
            </div>
            <div className="p-6 overflow-y-auto flex-1">
              <div className="overflow-x-auto border border-gray-200 rounded-lg">
                <table className="min-w-full text-sm">
                  <thead className="bg-gray-50 sticky top-0 z-10">
                    <tr>
                      <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 uppercase tracking-wider">SKU</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">PO Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Planned Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Dispatch Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Delivered Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Short Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Excess Qty</th>
                      <th className="px-3 py-2 text-center text-xs font-semibold text-gray-700 uppercase tracking-wider">Reject Qty</th>
                    </tr>
                  </thead>
                  <tbody className="bg-white divide-y divide-gray-100">
                    {(() => {
                      const po = selectedDeliveredQtyPO;
                      const dd = po.delivered_data || {};
                      const d = po.dispatch_data || {};
                      const items = po.items || [];
                      const planningItems = po.planning_items || [];
                      const dispatchQty = d.dispatch_qty || {};
                      const skuDelivery = dd.sku_delivery || {};
                      
                      // Get all unique SKUs from items
                      const allSkus = [...new Set(items.map(i => i.sku).filter(Boolean))];
                      
                      return allSkus.length === 0 ? (
                        <tr>
                          <td colSpan="8" className="px-3 py-4 text-center text-sm text-gray-500">No SKUs found</td>
                        </tr>
                      ) : (
                        allSkus.map((sku) => {
                          const item = items.find(i => i.sku === sku);
                          const planningItem = planningItems.find(i => i.sku === sku);
                          const skuDeliveryData = skuDelivery[sku] || {};
                          
                          const poQty = Number(item?.quantity) || 0;
                          const plannedQty = Number(planningItem?.planned_qty || planningItem?.planning_qty) || 0;
                          const dispatchQtyValue = Number(dispatchQty[sku]) || 0;
                          const deliveredQty = Number(skuDeliveryData.delivered_qty) || 0;
                          const shortQty = Number(skuDeliveryData.short_qty) || 0;
                          const excessQty = Number(skuDeliveryData.excess_qty) || 0;
                          const rejectQty = Number(skuDeliveryData.reject_qty) || 0;
                          
                          return (
                            <tr key={sku} className="hover:bg-gray-50">
                              <td className="px-3 py-2">
                                <div className="font-medium text-gray-900">{sku}</div>
                                <div className="text-xs text-gray-500">LID: {item?.lid || 'N/A'}</div>
                              </td>
                              <td className="px-3 py-2 text-center text-gray-900">{poQty}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{plannedQty}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{dispatchQtyValue}</td>
                              <td className="px-3 py-2 text-center text-gray-900 font-medium">{deliveredQty}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{shortQty}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{excessQty}</td>
                              <td className="px-3 py-2 text-center text-gray-900">{rejectQty}</td>
                            </tr>
                          );
                        })
                      );
                    })()}
                  </tbody>
                </table>
              </div>
            </div>
            <div className="p-6 border-t border-gray-200 bg-gray-50 rounded-b-xl flex items-center justify-end gap-3 flex-shrink-0">
              <button onClick={closeDeliveredQtyModal} className="px-4 py-2 bg-white text-gray-700 rounded border border-gray-300 hover:bg-gray-50">Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default B2BPOPunching;
