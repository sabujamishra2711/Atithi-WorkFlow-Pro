/**
 * Camera Utilities for Atithi WorkFlow Pro
 * Handles camera initialization and management
 */

// Enhanced Camera Functionality
export const initializeCamera = async (videoRef: React.RefObject<HTMLVideoElement>, options = {}) => {
  try {
    console.log('Initializing camera...');
    
    // Check if browser supports getUserMedia
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      throw new Error('Camera not supported in this browser');
    }

    // Request camera permissions
    const constraints = {
      video: {
        width: { ideal: 640, max: 1280 },
        height: { ideal: 480, max: 720 },
        facingMode: 'user',
        ...(options as any).video
      },
      audio: false
    };

    console.log('Requesting camera with constraints:', constraints);
    const stream = await navigator.mediaDevices.getUserMedia(constraints);
    
    if (videoRef.current) {
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready
      return new Promise<MediaStream>((resolve, reject) => {
        if (videoRef.current) {
          videoRef.current.onloadedmetadata = () => {
            console.log('Camera initialized successfully');
            resolve(stream);
          };
          
          videoRef.current.onerror = (error) => {
            console.error('Video element error:', error);
            reject(new Error('Failed to load video stream'));
          };
          
          // Timeout after 10 seconds
          setTimeout(() => {
            reject(new Error('Camera initialization timeout'));
          }, 10000);
        } else {
          reject(new Error('Video element not found'));
        }
      });
    } else {
      throw new Error('Video element not found');
    }
  } catch (error) {
    console.error('Camera initialization error:', error);
    
    // Provide user-friendly error messages
    let userMessage = 'Failed to access camera';
    if (error instanceof Error) {
      if (error.name === 'NotAllowedError') {
        userMessage = 'Camera permission denied. Please allow camera access and try again.';
      } else if (error.name === 'NotFoundError') {
        userMessage = 'No camera found. Please connect a camera and try again.';
      } else if (error.name === 'NotReadableError') {
        userMessage = 'Camera is being used by another application.';
      }
    }
    
    throw new Error(userMessage);
  }
};