/**
 * Custom hook for camera functionality in Atithi WorkFlow Pro
 */

import { useRef, useState } from 'react';
import { initializeCamera } from '@/utils/cameraUtils';

export const useCamera = () => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isCameraActive, setIsCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);

  const startCamera = async (options = {}) => {
    try {
      setCameraError(null);
      const stream = await initializeCamera(videoRef, options);
      setIsCameraActive(true);
      return stream;
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Failed to start camera';
      setCameraError(errorMessage);
      setIsCameraActive(false);
      throw error;
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      const tracks = stream.getTracks();
      tracks.forEach(track => track.stop());
      videoRef.current.srcObject = null;
      setIsCameraActive(false);
    }
  };

  return {
    videoRef,
    isCameraActive,
    cameraError,
    startCamera,
    stopCamera
  };
};