'use client';

import { useState, useRef, useCallback, useEffect } from 'react';

const MAX_DURATION_SECONDS = 120; // 2 minutes

interface UseVoiceRecorderReturn {
  isRecording: boolean;
  duration: number;
  audioBlob: Blob | null;
  startRecording: () => void;
  stopRecording: () => void;
  cancelRecording: () => void;
}

/**
 * Custom hook for recording audio via the MediaRecorder API.
 *
 * - Records in audio/webm;codecs=opus (falls back to audio/webm)
 * - Auto-stops after 2 minutes
 * - Cleans up MediaStream tracks on stop / cancel / unmount
 */
export function useVoiceRecorder(): UseVoiceRecorderReturn {
  const [isRecording, setIsRecording] = useState(false);
  const [duration, setDuration] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const maxTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Determine a supported mime type
  const getMimeType = (): string => {
    if (typeof MediaRecorder !== 'undefined') {
      if (MediaRecorder.isTypeSupported('audio/webm;codecs=opus')) {
        return 'audio/webm;codecs=opus';
      }
      if (MediaRecorder.isTypeSupported('audio/webm')) {
        return 'audio/webm';
      }
    }
    return 'audio/webm';
  };

  // Release all tracks on the active MediaStream
  const cleanupStream = useCallback(() => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
  }, []);

  // Clear running timers
  const clearTimers = useCallback(() => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (maxTimerRef.current) {
      clearTimeout(maxTimerRef.current);
      maxTimerRef.current = null;
    }
  }, []);

  const startRecording = useCallback(async () => {
    try {
      // Reset previous state
      setAudioBlob(null);
      setDuration(0);
      chunksRef.current = [];

      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = getMimeType();
      const recorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = recorder;

      recorder.ondataavailable = (e: BlobEvent) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      recorder.onstop = () => {
        const mType = recorder.mimeType || mimeType;
        const blob = new Blob(chunksRef.current, { type: mType });
        setAudioBlob(blob);
        cleanupStream();
        clearTimers();
        setIsRecording(false);
      };

      recorder.start();
      setIsRecording(true);

      // Duration ticker – updates every second
      timerRef.current = setInterval(() => {
        setDuration((prev) => prev + 1);
      }, 1000);

      // Auto-stop at max duration
      maxTimerRef.current = setTimeout(() => {
        if (mediaRecorderRef.current?.state === 'recording') {
          mediaRecorderRef.current.stop();
        }
      }, MAX_DURATION_SECONDS * 1000);
    } catch (error) {
      console.error('Failed to start recording:', error);
      cleanupStream();
      clearTimers();
      setIsRecording(false);
    }
  }, [cleanupStream, clearTimers]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop(); // triggers onstop → sets blob
    }
  }, []);

  const cancelRecording = useCallback(() => {
    // Discard chunks so onstop produces an empty blob — then we override to null
    chunksRef.current = [];

    if (mediaRecorderRef.current?.state === 'recording') {
      // Remove the default onstop handler so we don't set a blob
      mediaRecorderRef.current.onstop = () => {
        cleanupStream();
        clearTimers();
        setIsRecording(false);
        setAudioBlob(null);
        setDuration(0);
      };
      mediaRecorderRef.current.stop();
    } else {
      cleanupStream();
      clearTimers();
      setIsRecording(false);
      setAudioBlob(null);
      setDuration(0);
    }
  }, [cleanupStream, clearTimers]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (mediaRecorderRef.current?.state === 'recording') {
        mediaRecorderRef.current.stop();
      }
      cleanupStream();
      clearTimers();
    };
  }, [cleanupStream, clearTimers]);

  return {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  };
}
