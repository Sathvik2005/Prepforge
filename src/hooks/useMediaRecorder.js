/**
 * useMediaRecorder – shared browser media recording hook
 *
 * Works across VideoInterview, AsyncInterview, and MockInterviewRoom.
 * Handles video+audio capture, pause/resume, preview blob, and upload
 * to POST /api/media/upload.
 *
 * Usage:
 *   const { isRecording, startRecording, stopRecording, pauseRecording,
 *           resumeRecording, recordedBlob, previewUrl, uploadMedia,
 *           recordedSeconds, error } = useMediaRecorder(videoRef);
 */
import { useState, useRef, useCallback, useEffect } from 'react';
import { mediaAPI } from '../services/api';

// Prefer browser-supported codec
const getSupportedMimeType = () => {
  const types = [
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
    'video/mp4',
  ];
  return types.find((t) => MediaRecorder.isTypeSupported(t)) || '';
};

export default function useMediaRecorder(videoRef, options = {}) {
  const {
    maxDurationSeconds = 1800, // 30 min hard cap
    mimeType: forcedMimeType = null,
  } = options;

  const [isRecording, setIsRecording] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [recordedBlob, setRecordedBlob] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [recordedSeconds, setRecordedSeconds] = useState(0);
  const [error, setError] = useState(null);
  const [isUploading, setIsUploading] = useState(false);

  const mediaRecorderRef = useRef(null);
  const streamRef = useRef(null);
  const chunksRef = useRef([]);
  const timerRef = useRef(null);
  const startTimeRef = useRef(null);
  const pausedSecondsRef = useRef(0);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopStream();
      clearInterval(timerRef.current);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopStream = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
  };

  // ── Start ─────────────────────────────────────────────────────────────────
  const startRecording = useCallback(async (constraints = { video: true, audio: true }) => {
    try {
      setError(null);
      setRecordedBlob(null);
      if (previewUrl) {
        URL.revokeObjectURL(previewUrl);
        setPreviewUrl(null);
      }
      chunksRef.current = [];
      pausedSecondsRef.current = 0;

      const stream = await navigator.mediaDevices.getUserMedia(constraints);
      streamRef.current = stream;

      // Show live feed in video element
      if (videoRef?.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.muted = true;
        videoRef.current.play().catch(() => {});
      }

      const mimeType = forcedMimeType || getSupportedMimeType();
      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : {});
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e) => {
        if (e.data && e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, {
          type: mimeType || 'video/webm',
        });
        setRecordedBlob(blob);
        const url = URL.createObjectURL(blob);
        setPreviewUrl(url);
      };

      recorder.start(1000); // collect data every second
      startTimeRef.current = Date.now();
      setIsRecording(true);
      setIsPaused(false);
      setRecordedSeconds(0);

      // Ticker
      timerRef.current = setInterval(() => {
        setRecordedSeconds((s) => {
          const next = s + 1;
          if (next >= maxDurationSeconds) {
            stopRecording();
          }
          return next;
        });
      }, 1000);
    } catch (err) {
      console.error('[useMediaRecorder] startRecording error:', err);
      setError(err.message || 'Could not access camera/microphone');
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [videoRef, maxDurationSeconds, forcedMimeType, previewUrl]);

  // ── Pause ─────────────────────────────────────────────────────────────────
  const pauseRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.pause();
      clearInterval(timerRef.current);
      setIsPaused(true);
    }
  }, []);

  // ── Resume ────────────────────────────────────────────────────────────────
  const resumeRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'paused') {
      mediaRecorderRef.current.resume();
      timerRef.current = setInterval(() => {
        setRecordedSeconds((s) => {
          const next = s + 1;
          if (next >= maxDurationSeconds) stopRecording();
          return next;
        });
      }, 1000);
      setIsPaused(false);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [maxDurationSeconds]);

  // ── Stop ──────────────────────────────────────────────────────────────────
  const stopRecording = useCallback(() => {
    clearInterval(timerRef.current);
    if (
      mediaRecorderRef.current &&
      mediaRecorderRef.current.state !== 'inactive'
    ) {
      mediaRecorderRef.current.stop();
    }
    stopStream();
    setIsRecording(false);
    setIsPaused(false);
  }, []);

  // ── Reset ─────────────────────────────────────────────────────────────────
  const resetRecording = useCallback(() => {
    stopRecording();
    chunksRef.current = [];
    setRecordedBlob(null);
    if (previewUrl) {
      URL.revokeObjectURL(previewUrl);
      setPreviewUrl(null);
    }
    setRecordedSeconds(0);
    setError(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [stopRecording, previewUrl]);

  // ── Upload to /api/media/upload ───────────────────────────────────────────
  /**
   * @param {object} metadata  – { sessionId, questionId, questionIndex, userId }
   * @returns {{ mediaId, url }} on success
   */
  const uploadMedia = useCallback(
    async (metadata = {}) => {
      if (!recordedBlob) {
        throw new Error('No recording to upload');
      }

      setIsUploading(true);
      try {
        const response = await mediaAPI.uploadVideo(recordedBlob, metadata);
        return response.data?.data || response.data;
      } finally {
        setIsUploading(false);
      }
    },
    [recordedBlob]
  );

  return {
    // State
    isRecording,
    isPaused,
    recordedBlob,
    previewUrl,
    recordedSeconds,
    error,
    isUploading,

    // Controls
    startRecording,
    pauseRecording,
    resumeRecording,
    stopRecording,
    resetRecording,
    uploadMedia,

    // Expose refs for advanced use
    streamRef,
    mediaRecorderRef,
  };
}
