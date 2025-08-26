import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuthStore } from '../stores/authStore';
import { Package, Eye, EyeOff, Shield } from 'lucide-react';
import toast from 'react-hot-toast';
import { testDeviceInfoCollection } from '../services/api';


const Login = () => {
  const navigate = useNavigate();
  const { login, isAuthenticated, checkAuth, user } = useAuthStore();
  const [formData, setFormData] = useState({
    username: '',
    password: '',
  });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [deviceInfoCollected, setDeviceInfoCollected] = useState(false);
  const [deviceInfo, setDeviceInfo] = useState(null);



  // Set document title
  useEffect(() => {
    document.title = 'Login - OneScan';
  }, []);

  // Check if user is already authenticated
  useEffect(() => {
    if (isAuthenticated) {
              navigate('/data-view');
    }
  }, [isAuthenticated, navigate]);

  // Check auth on mount
  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  // Automatically collect device info when page loads
  useEffect(() => {
    const collectDeviceInfoOnLoad = async () => {
      try {
        console.log('🔄 Auto-collecting device info on page load...');
        
        // Small delay to show the collection process
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        const result = await testDeviceInfoCollection();
        if (result) {
          setDeviceInfo(result);
          setDeviceInfoCollected(true);
          console.log('✅ Device info auto-collected successfully:', result);
          toast.success('Device information collected successfully!');
          

        } else {
          console.error('❌ Device info auto-collection failed');
        }
      } catch (error) {
        console.error('❌ Device info auto-collection error:', error);
      }
    };

    // Collect device info immediately when page loads
    collectDeviceInfoOnLoad();
  }, []);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.username || !formData.password) {
      toast.error('Please fill in all fields');
      return;
    }

    // Check if device info is collected
    if (!deviceInfoCollected) {
      toast.error('System validation is still in progress. Please wait a moment and try again.');
      return;
    }

    setLoading(true);
    
    try {
      // Use the pre-collected device info
      const result = await login(formData.username, formData.password, deviceInfo);
      
      if (result.success) {
        toast.success('Login successful!');
        navigate('/data-view');
      } else {
        toast.error(result.error || 'Login failed');
      }
    } catch (error) {
      toast.error('An unexpected error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSubmit(e);
    }
  };



  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full space-y-8">
        {/* Header */}
        <div className="text-center">
          <div className="mx-auto h-16 w-16 bg-primary-100 rounded-full flex items-center justify-center">
            <Package className="h-8 w-8 text-primary-600" />
          </div>
          <h2 className="mt-6 text-3xl font-extrabold text-gray-900">
            OneScan
          </h2>
          <p className="mt-2 text-sm text-gray-600">
            Sign in to your account
          </p>
        </div>

        {/* Login Form */}
        <form className="mt-8 space-y-6" onSubmit={handleSubmit}>
          <div className="space-y-4">
            {/* Username Field */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-700">
                Username
              </label>
              <div className="mt-1">
                <input
                  id="username"
                  name="username"
                  type="text"
                  autoComplete="username"
                  required
                  value={formData.username}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="input text-center"
                  placeholder="Enter username"
                  autoFocus
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-700">
                Password
              </label>
              <div className="mt-1 relative">
                <input
                  id="password"
                  name="password"
                  type={showPassword ? 'text' : 'password'}
                  autoComplete="current-password"
                  required
                  value={formData.password}
                  onChange={handleInputChange}
                  onKeyPress={handleKeyPress}
                  className="input text-center pr-10"
                  placeholder="Enter password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? (
                    <EyeOff className="h-5 w-5 text-gray-400" />
                  ) : (
                    <Eye className="h-5 w-5 text-gray-400" />
                  )}
                </button>
              </div>
            </div>

            {/* Internal Tool Notice */}
            <div className="mt-4 p-4 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200 shadow-sm">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Shield className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-semibold text-blue-800">Internal Tool Security</span>
              </div>
              <p className="text-xs text-blue-700 text-center mb-3">
                Device and location information is automatically collected for security and audit purposes.
              </p>
              

              
              {/* Device Info Collection Status */}
              <div className="flex items-center justify-center space-x-2 mt-3">
                {deviceInfoCollected ? (
                  <>
                    <div className="w-3 h-3 bg-green-500 rounded-full animate-bounce"></div>
                    <span className="text-xs text-green-700 font-medium">Device Info Ready</span>
                  </>
                ) : (
                  <>
                    <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                    <span className="text-xs text-yellow-700 font-medium">Collecting Device Info...</span>
                  </>
                )}
              </div>
              
              {/* Progress Bar */}
              {!deviceInfoCollected && (
                <div className="mt-2 w-full bg-blue-200 rounded-full h-1.5">
                  <div className="bg-blue-600 h-1.5 rounded-full animate-pulse" style={{ width: '100%' }}></div>
                </div>
              )}
              
              
            </div>

            
          </div>

          {/* Submit Button */}
          <div>
            <button
              type="submit"
              disabled={loading || !deviceInfoCollected}
                              className={`w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${
                  loading || !deviceInfoCollected
                    ? 'bg-gray-400 cursor-not-allowed'
                    : 'bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500'
                } transition-colors`}
            >
              {loading ? (
                <div className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                  <span>Signing in...</span>
                </div>
              ) : !deviceInfoCollected ? (
                <div className="flex items-center space-x-2">
                  <div className="w-2 h-2 bg-yellow-500 rounded-full animate-pulse"></div>
                  <span>Collecting Device Info...</span>
                </div>
              ) : (
                'Sign in'
              )}
            </button>
          </div>
        </form>

        {/* Footer */}
        <div className="text-center">
          <p className="text-xs text-gray-500">
            Warehouse Shipment Scanning System v1.0.0
          </p>
        </div>
      </div>
    </div>
  );
};

export default Login;
