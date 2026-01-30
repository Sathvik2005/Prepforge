/**
 * Production-Grade Media Recorder Hook
 * 
 * Handles video + audio capture using WebRTC MediaRecorder API
 * - Requests camera + microphone permissions
 * - Records in video/webm; codecs=vp8,opus
 * - Handles chunking for long recordings
 * - Manages stream lifecycle
 * - Provides error handling
 */

import { useRef, useState, useCallback } from 'react';

export function useMediaRecorder() {
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const streamRef = useRef(null);
  
  const [stream, setStream] = useState(null);
  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [error, setError] = useState(null);
  const [recordingDuration, setRecordingDuration] = useState(0);
  
  const timerRef = useRef(null);
  
  /**
   * Request camera + microphone permissions and start stream
   */
  const requestPermissions = useCallback(async (constraints = {}) => {
    try {
      setError(null);
      
      const defaultConstraints = {
        video: {
          width: { ideal: 1280 },
          height: { ideal: 720 },
          facingMode: 'user'
        },
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true
        }
      };
      
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        ...defaultConstraints,
        ...constraints
      });
      
      streamRef.current = mediaStream;
      setStream(mediaStream);
      
      return { success: true, stream: mediaStream };
      
    } catch (err) {
      console.error('Media permission error:', err);
      
      let errorMessage = 'Failed to access camera/microphone';
      
      if (err.name === 'NotAllowedError') {
        errorMessage = 'Camera/microphone permission denied. Please allow access and try again.';
      } else if (err.name === 'NotFoundError') {
        errorMessage = 'No camera or microphone found. Please connect a device.';
      } else if (err.name === 'NotReadableError') {
        errorMessage = 'Camera/microphone is already in use by another application.';
      } else if (err.name === 'OverconstrainedError') {
        errorMessage = 'Camera/microphone does not meet the required constraints.';
      }
      
      setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }, []);
  
  /**
   * Start recording video + audio
   */
  const startRecording = useCallback(async () => {
    try {
      if (!streamRef.current) {
        const result = await requestPermissions();
        if (!result.success) return { success: false, error: result.error };
      }
      
      // Check browser support
      if (!MediaRecorder.isTypeSupported('video/webm; codecs=vp8,opus')) {
        setError('Browser does not support required video format');
        return { success: false, error: 'Unsupported format' };
      }
      
      const recorder = new MediaRecorder(streamRef.current, {
        mimeType: 'video/webm; codecs=vp8,opus',
        videoBitsPerSecond: 2500000, // 2.5 Mbps
        audioBitsPerSecond: 128000   // 128 kbps
      });
      
      chunksRef.current = [];
      
      recorder.ondataavailable = (event) => {
        if (event.data && event.data.size > 0) {
          chunksRef.current.push(event.data);
        }
      };
      
      recorder.onerror = (event) => {
        console.error('MediaRecorder error:', event.error);
        setError('Recording failed: ' + event.error.message);
        setIsRecording(false);
      };
      
      recorder.onstart = () => {
        setIsRecording(true);
        setRecordingDuration(0);
        
        // Start timer
        timerRef.current = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
      };
      
      recorder.onstop = () => {
        setIsRecording(false);
        if (timerRef.current) {
          clearInterval(timerRef.current);
          timerRef.current = null;
        }
      };
      
      // Request data every 1 second for safe chunking
      recorder.start(1000);
      
      mediaRecorderRef.current = recorder;
      
      return { success: true };
      
    } catch (err) {
      console.error('Start recording error:', err);
      setError('Failed to start recording: ' + err.message);
      return { success: false, error: err.message };
    }
  }, [requestPermissions]);
  
  /**
   * Stop recording and return video blob
   */
  const stopRecording = useCallback(() => {
    return new Promise((resolve, reject) => {
      if (!mediaRecorderRef.current) {
        reject(new Error('No active recording'));
        return;
      }
      
      const recorder = mediaRecorderRef.current;
      
      if (recorder.state === 'inactive') {
        reject(new Error('Recording already stopped'));
        return;
      }
      
      recorder.onstop = () => {
        try {
          const blob = new Blob(chunksRef.current, { 
            type: 'video/webm; codecs=vp8,opus' 
          });
          
          const duration = recordingDuration;
          
          resolve({
            blob,
            duration,
            size: blob.size,
            mimeType: blob.type,
            timestamp: new Date().toISOString()
          });
          
          chunksRef.current = [];
          
        } catch (err) {
          reject(err);
        }
      };
      
      recorder.stop();
    });
  }, [recordingDuration]);
  
  /**
   * Pause recording
   */
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'recording') {
      mediaRecorderRef.current.pause();
      setIsPaused(true);
      
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    }
  }, []);
  
  /**
   * Resume recording
   */
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current && mediaRecorderRef.current.state === 'paused') {
      mediaRecorderRef.current.resume();
      setIsPaused(false);
      
      // Restart timer
      timerRef.current = setInterval(() => {
        setRecordingDuration(prev => prev + 1);
      }, 1000);
    }
  }, []);
  
  /**
   * Stop all tracks and clean up
   */
  const cleanup = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    
    setStream(null);
    setIsRecording(false);
    setIsPaused(false);
    setRecordingDuration(0);
    chunksRef.current = [];
  }, []);
  
  /**
   * Get current recording state
   */
  const getState = useCallback(() => {
    if (!mediaRecorderRef.current) return 'inactive';
    return mediaRecorderRef.current.state;
  }, []);
  
  return {
    // Stream
    stream,
    
    // State
    isRecording,
    isPaused,
    error,
    recordingDuration,
    
    // Methods
    requestPermissions,
    startRecording,
    stopRecording,
    pauseRecording,
    resumeRecording,
    cleanup,
    getState
  };
}
