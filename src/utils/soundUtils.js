// Sound utility functions for OneScan application

// Create audio context for better sound management
let audioContext = null;
let successAudio = null;
let errorAudio = null;

// Initialize audio context and load success sound
export const initializeAudio = () => {
  console.log('🔊 initializeAudio called');
  console.log('🔊 window.AudioContext available:', !!(window.AudioContext || window.webkitAudioContext));
  
  try {
    // Create audio context if not exists
    if (!audioContext) {
      console.log('🔊 Creating new audio context...');
      audioContext = new (window.AudioContext || window.webkitAudioContext)();
      console.log('🔊 Audio context created:', audioContext);
    }
    
    // Load success sound
    if (!successAudio) {
      console.log('🔊 Loading success.mp3...');
      successAudio = new Audio('/success.mp3');
      successAudio.preload = 'auto';
      console.log('🔊 Success audio loaded:', successAudio);
    }
    
    // Load error sound
    if (!errorAudio) {
      console.log('🔊 Loading Error.mp3...');
      errorAudio = new Audio('/Error.mp3');
      errorAudio.preload = 'auto';
      console.log('🔊 Error audio loaded:', errorAudio);
    }
    
    console.log('🔊 Audio system initialized successfully');
    console.log('🔊 Final state - audioContext:', !!audioContext, 'successAudio:', !!successAudio, 'errorAudio:', !!errorAudio);
  } catch (error) {
    console.error('🔊 Audio initialization failed:', error);
    throw error;
  }
};

// Play success sound
export const playSuccessSound = async () => {
  console.log('🔊 playSuccessSound called');
  console.log('🔊 successAudio exists:', !!successAudio);
  console.log('🔊 audioContext exists:', !!audioContext);
  console.log('🔊 audioContext state:', audioContext?.state);
  
  try {
    // Initialize audio if not already done
    if (!successAudio) {
      console.log('🔊 Initializing audio...');
      initializeAudio();
    }
    
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext && audioContext.state === 'suspended') {
      console.log('🔊 Resuming suspended audio context...');
      await audioContext.resume();
    }
    
    // Play success sound
    if (successAudio) {
      console.log('🔊 Playing success sound...');
      successAudio.currentTime = 0; // Reset to beginning
      await successAudio.play();
      console.log('🔊 Success sound played successfully');
    } else {
      console.error('🔊 successAudio is null/undefined');
    }
  } catch (error) {
    console.error('🔊 Failed to play success sound:', error);
    throw error; // Re-throw to see the error in the calling function
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
    // Initialize audio if not already done
    if (!errorAudio) {
      initializeAudio();
    }
    
    // Resume audio context if suspended (required for autoplay policies)
    if (audioContext && audioContext.state === 'suspended') {
      await audioContext.resume();
    }
    
    // Play error sound
    if (errorAudio) {
      errorAudio.currentTime = 0; // Reset to beginning
      await errorAudio.play();
      console.log('🔊 Error sound played');
    }
  } catch (error) {
    console.warn('⚠️ Failed to play error sound:', error);
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
