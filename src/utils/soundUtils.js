// Sound utility functions for OneScan application

// Create audio context for better sound management
let audioContext = null;
let successAudio = null;
let errorAudio = null;
let isAudioInitialized = false;
let userInteracted = false;

// Initialize audio context and load success sound
export const initializeAudio = async () => {
  console.log('🔊 initializeAudio called');
  console.log('🔊 window.AudioContext available:', !!(window.AudioContext || window.webkitAudioContext));
  
  try {
    // Create audio context if not exists
    if (!audioContext) {
      console.log('🔊 Creating new audio context...');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔊 Audio context created:', audioContext);
    }
    
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext.state === 'suspended') {
      console.log('🔊 Resuming suspended audio context...');
      await audioContext.resume();
      console.log('🔊 Audio context resumed, state:', audioContext.state);
    }
    
    // Load success sound
    if (!successAudio) {
      console.log('🔊 Loading success.mp3...');
      successAudio = new Audio('/success.mp3');
      successAudio.preload = 'auto';
      successAudio.volume = 0.8; // Set default volume
      console.log('🔊 Success audio loaded:', successAudio);
    }
    
    // Load error sound
    if (!errorAudio) {
      console.log('🔊 Loading Error.mp3...');
      errorAudio = new Audio('/Error.mp3');
      errorAudio.preload = 'auto';
      errorAudio.volume = 0.8; // Set default volume
      console.log('🔊 Error audio loaded:', errorAudio);
    }
    
    isAudioInitialized = true;
    console.log('🔊 Audio system initialized successfully');
    console.log('🔊 Final state - audioContext:', !!audioContext, 'successAudio:', !!successAudio, 'errorAudio:', !!errorAudio);
  } catch (error) {
    console.error('🔊 Audio initialization failed:', error);
    throw error;
  }
};

// Initialize audio on first user interaction
export const initializeAudioOnUserInteraction = async () => {
  if (!userInteracted) {
    console.log('🔊 First user interaction detected, initializing audio...');
    userInteracted = true;
    try {
      await initializeAudio();
    } catch (error) {
      console.error('🔊 Failed to initialize audio on user interaction:', error);
    }
  }
};

// Request audio permission from user
export const requestAudioPermission = async () => {
  try {
    console.log('🔊 Requesting audio permission...');
    
    // Initialize audio context first
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔊 Audio context created, state:', audioContext.state);
    }
    
    // Resume audio context (this will prompt user for permission if needed)
    if (audioContext.state === 'suspended') {
      console.log('🔊 Audio context suspended, requesting permission...');
      await audioContext.resume();
      console.log('🔊 Audio context resumed, state:', audioContext.state);
    }
    
    // Load audio files with proper error handling and multiple path attempts
    if (!successAudio) {
      console.log('🔊 Loading success.mp3...');
      
      // Try multiple possible paths for the audio file
      const successPaths = [
        '/success.mp3',
        './success.mp3',
        `${window.location.origin}/success.mp3`,
        `${process.env.PUBLIC_URL}/success.mp3`
      ];
      
      successAudio = new Audio();
      successAudio.preload = 'auto';
      successAudio.volume = 0.8;
      
      // Add error handling for audio loading
      successAudio.addEventListener('error', (e) => {
        console.error('🔊 Error loading success.mp3:', e);
        console.error('🔊 Audio src:', successAudio.src);
        console.error('🔊 Audio networkState:', successAudio.networkState);
        console.error('🔊 Audio readyState:', successAudio.readyState);
      });
      
      successAudio.addEventListener('canplaythrough', () => {
        console.log('🔊 Success audio loaded and ready');
      });
      
      successAudio.addEventListener('loadstart', () => {
        console.log('🔊 Success audio load started');
      });
      
      // Try to load the audio file
      let audioLoaded = false;
      for (const path of successPaths) {
        try {
          successAudio.src = path;
          console.log('🔊 Trying success audio path:', path);
          break;
        } catch (error) {
          console.error('🔊 Failed to set success audio src:', path, error);
        }
      }
    }
    
    if (!errorAudio) {
      console.log('🔊 Loading Error.mp3...');
      
      // Try multiple possible paths for the audio file
      const errorPaths = [
        '/Error.mp3',
        './Error.mp3',
        `${window.location.origin}/Error.mp3`,
        `${process.env.PUBLIC_URL}/Error.mp3`
      ];
      
      errorAudio = new Audio();
      errorAudio.preload = 'auto';
      errorAudio.volume = 0.8;
      
      // Add error handling for audio loading
      errorAudio.addEventListener('error', (e) => {
        console.error('🔊 Error loading Error.mp3:', e);
        console.error('🔊 Audio src:', errorAudio.src);
        console.error('🔊 Audio networkState:', errorAudio.networkState);
        console.error('🔊 Audio readyState:', errorAudio.readyState);
      });
      
      errorAudio.addEventListener('canplaythrough', () => {
        console.log('🔊 Error audio loaded and ready');
      });
      
      errorAudio.addEventListener('loadstart', () => {
        console.log('🔊 Error audio load started');
      });
      
      // Try to load the audio file
      for (const path of errorPaths) {
        try {
          errorAudio.src = path;
          console.log('🔊 Trying error audio path:', path);
          break;
        } catch (error) {
          console.error('🔊 Failed to set error audio src:', path, error);
        }
      }
    }
    
    // Test play a silent sound to ensure permission is granted
    console.log('🔊 Testing audio permission with silent sound...');
    const testAudio = new Audio('data:audio/wav;base64,UklGRigAAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQAAAAA=');
    await testAudio.play();
    testAudio.pause();
    console.log('🔊 Silent test sound played successfully');
    
    // Test play the actual success sound to make sure it works
    console.log('🔊 Testing success sound...');
    if (successAudio) {
      successAudio.currentTime = 0;
      await successAudio.play();
      console.log('🔊 Success sound test played successfully');
    }
    
    isAudioInitialized = true;
    userInteracted = true;
    console.log('🔊 Audio permission granted and tested successfully');
    return true;
  } catch (error) {
    console.error('🔊 Audio permission denied or failed:', error);
    console.error('🔊 Error details:', error.message);
    return false;
  }
};

// Play success sound
export const playSuccessSound = async () => {
  console.log('🔊 playSuccessSound called');
  
  try {
    // If audio not initialized, try to initialize on user interaction
    if (!isAudioInitialized) {
      console.log('🔊 Audio not initialized, attempting to initialize...');
      const permissionGranted = await requestAudioPermission();
      if (!permissionGranted) {
        console.warn('🔊 Audio permission not granted, skipping sound');
        return;
      }
    }
    
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
      console.log('🔊 Resuming suspended audio context...');
      await audioContext.resume();
    }
    
    // Play success sound
    if (successAudio && successAudio.readyState >= 2) {
      console.log('🔊 Playing success sound...');
      successAudio.currentTime = 0; // Reset to beginning
      await successAudio.play();
      console.log('🔊 Success sound played successfully');
    } else {
      console.log('🔊 Success audio not ready, using fallback beep...');
      generateBeepSound(1000, 150); // Higher frequency for success
    }
  } catch (error) {
    console.error('🔊 Failed to play success sound:', error);
    // Don't throw error, just log it to prevent breaking the app
  }
};

// Play success sound with volume control
export const playSuccessSoundWithVolume = async (volume = 0.7) => {
  try {
    if (!successAudio) {
      initializeAudio();
    }
    
    if (successAudio) {
      successAudio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
      await playSuccessSound();
    }
  } catch (error) {
    console.warn('⚠️ Failed to play success sound with volume:', error);
  }
};

// Play error sound (for scanning errors only)
export const playErrorSound = async () => {
  try {
    // If audio not initialized, try to initialize on user interaction
    if (!isAudioInitialized) {
      console.log('🔊 Audio not initialized, attempting to initialize for error sound...');
      const permissionGranted = await requestAudioPermission();
      if (!permissionGranted) {
        console.warn('🔊 Audio permission not granted, skipping error sound');
        return;
      }
    }
    
    // Resume audio context if suspended
    if (audioContext && audioContext.state === 'suspended') {
      console.log('🔊 Resuming suspended audio context for error sound...');
      await audioContext.resume();
    }
    
    // Play error sound
    if (errorAudio && errorAudio.readyState >= 2) {
      console.log('🔊 Playing error sound...');
      errorAudio.currentTime = 0; // Reset to beginning
      await errorAudio.play();
      console.log('🔊 Error sound played successfully');
    } else {
      console.log('🔊 Error audio not ready, using fallback beep...');
      generateBeepSound(400, 300); // Lower frequency for error
    }
  } catch (error) {
    console.warn('⚠️ Failed to play error sound:', error);
    // Don't throw error, just log it to prevent breaking the app
  }
};

// Play error sound with volume control
export const playErrorSoundWithVolume = async (volume = 0.7) => {
  try {
    if (!errorAudio) {
      initializeAudio();
    }
    
    if (errorAudio) {
      errorAudio.volume = Math.max(0, Math.min(1, volume)); // Clamp between 0 and 1
      await playErrorSound();
    }
  } catch (error) {
    console.warn('⚠️ Failed to play error sound with volume:', error);
  }
};

// Stop all sounds
export const stopAllSounds = () => {
  try {
    if (successAudio) {
      successAudio.pause();
      successAudio.currentTime = 0;
    }
    if (errorAudio) {
      errorAudio.pause();
      errorAudio.currentTime = 0;
    }
  } catch (error) {
    console.warn('⚠️ Failed to stop sounds:', error);
  }
};

// Check if audio is supported
export const isAudioSupported = () => {
  return !!(window.AudioContext || window.webkitAudioContext);
};

// Get audio context state
export const getAudioContextState = () => {
  return audioContext ? audioContext.state : 'not_initialized';
};

// Generate a simple beep sound using Web Audio API as fallback
export const generateBeepSound = (frequency = 800, duration = 200) => {
  try {
    if (!audioContext) {
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
    }
    
    const oscillator = audioContext.createOscillator();
    const gainNode = audioContext.createGain();
    
    oscillator.connect(gainNode);
    gainNode.connect(audioContext.destination);
    
    oscillator.frequency.value = frequency;
    oscillator.type = 'sine';
    
    gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
    gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + duration / 1000);
    
    oscillator.start(audioContext.currentTime);
    oscillator.stop(audioContext.currentTime + duration / 1000);
    
    console.log('🔊 Generated beep sound');
    return true;
  } catch (error) {
    console.error('🔊 Failed to generate beep sound:', error);
    return false;
  }
};

// Test audio function - play a test sound to verify everything works
export const testAudio = async () => {
  try {
    console.log('🔊 Testing audio system...');
    
    // Initialize if needed
    if (!isAudioInitialized) {
      const granted = await requestAudioPermission();
      if (!granted) {
        console.error('🔊 Audio permission not granted for test');
        return false;
      }
    }
    
    // Test success sound
    if (successAudio && successAudio.readyState >= 2) {
      console.log('🔊 Playing test success sound...');
      successAudio.currentTime = 0;
      await successAudio.play();
      console.log('🔊 Test success sound played');
      return true;
    } else {
      console.log('🔊 Success audio not ready, trying fallback beep...');
      return generateBeepSound(800, 200);
    }
  } catch (error) {
    console.error('🔊 Audio test failed:', error);
    console.log('🔊 Trying fallback beep sound...');
    return generateBeepSound(800, 200);
  }
};
