import React, { useState, useEffect } from 'react';
import { Volume2, VolumeX, X, Play } from 'lucide-react';
import { requestAudioPermission, testAudio } from '../utils/soundUtils';

const AudioPermissionBanner = () => {
  const [showBanner, setShowBanner] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [permissionGranted, setPermissionGranted] = useState(false);

  useEffect(() => {
    // Check if audio permission is needed
    const checkAudioPermission = () => {
      // Show banner if audio context is suspended (permission needed)
      if (window.AudioContext || window.webkitAudioContext) {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        if (audioContext.state === 'suspended') {
          setShowBanner(true);
        }
      }
    };

    // Check after a short delay to allow page to load
    const timer = setTimeout(checkAudioPermission, 2000);
    return () => clearTimeout(timer);
  }, []);

  const handleRequestPermission = async () => {
    setIsRequesting(true);
    try {
      const granted = await requestAudioPermission();
      if (granted) {
        setPermissionGranted(true);
        setShowBanner(false);
        // Show success message
        console.log('🔊 Audio permission granted!');
      } else {
        console.log('🔊 Audio permission denied');
      }
    } catch (error) {
      console.error('🔊 Error requesting audio permission:', error);
    } finally {
      setIsRequesting(false);
    }
  };

  const handleTestSound = async () => {
    try {
      const success = await testAudio();
      if (success) {
        console.log('🔊 Test sound played successfully!');
      } else {
        console.log('🔊 Test sound failed');
      }
    } catch (error) {
      console.error('🔊 Error testing sound:', error);
    }
  };

  const handleDismiss = () => {
    setShowBanner(false);
  };

  if (!showBanner || permissionGranted) {
    return null;
  }

  return (
    <div className="fixed top-4 right-4 z-50 max-w-sm">
      <div className="bg-blue-600 text-white p-4 rounded-lg shadow-lg border border-blue-700">
        <div className="flex items-start justify-between">
          <div className="flex items-center space-x-3">
            <Volume2 className="w-5 h-5 text-blue-200 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-sm">Enable Audio Notifications</h3>
              <p className="text-xs text-blue-100 mt-1">
                Allow audio notifications for scan results and alerts
              </p>
            </div>
          </div>
          <button
            onClick={handleDismiss}
            className="text-blue-200 hover:text-white ml-2"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
        
        <div className="mt-3 flex space-x-2">
          <button
            onClick={handleRequestPermission}
            disabled={isRequesting}
            className="flex-1 bg-blue-700 hover:bg-blue-800 disabled:bg-blue-500 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
          >
            {isRequesting ? 'Requesting...' : 'Enable Audio'}
          </button>
          <button
            onClick={handleTestSound}
            className="bg-green-600 hover:bg-green-700 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
            title="Test Sound"
          >
            <Play className="w-4 h-4" />
          </button>
          <button
            onClick={handleDismiss}
            className="bg-blue-500 hover:bg-blue-600 text-white text-xs font-medium py-2 px-3 rounded transition-colors"
          >
            <VolumeX className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default AudioPermissionBanner;
