'use client';

import { useEffect } from 'react';
import { useVoiceRecorder } from '@/hooks/useVoiceRecorder';

interface VoiceRecorderProps {
  onSend: (blob: Blob, duration: number) => void;
  onCancel: () => void;
}

/**
 * iMessage-style voice recording overlay.
 *
 * Appears in place of the normal message input area while recording.
 * Shows a pulsing red dot, a live MM:SS timer, and cancel / send controls.
 */
export default function VoiceRecorder({ onSend, onCancel }: VoiceRecorderProps) {
  const {
    isRecording,
    duration,
    audioBlob,
    startRecording,
    stopRecording,
    cancelRecording,
  } = useVoiceRecorder();

  // Begin recording as soon as the component mounts
  useEffect(() => {
    startRecording();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // When a blob becomes available after stopping, deliver it to the parent
  useEffect(() => {
    if (audioBlob && !isRecording) {
      onSend(audioBlob, duration);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [audioBlob, isRecording]);

  const handleCancel = () => {
    cancelRecording();
    onCancel();
  };

  const handleSend = () => {
    stopRecording(); // blob will be delivered via the effect above
  };

  // Format seconds → MM:SS
  const formatTime = (seconds: number): string => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="p-4 glass-panel border-t border-[var(--border)] z-10 w-full bg-[var(--background)]">
      <div className="flex items-center gap-3 max-w-4xl mx-auto w-full">
        {/* Cancel button */}
        <button
          type="button"
          onClick={handleCancel}
          className="p-2 rounded-full text-red-500 hover:bg-red-500/10 transition-colors flex-shrink-0"
          aria-label="Cancel recording"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            fill="none"
            viewBox="0 0 24 24"
            strokeWidth={2}
            stroke="currentColor"
            className="w-6 h-6"
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>

        {/* Recording indicator bar */}
        <div className="flex-1 flex items-center gap-3 px-4 py-2.5 bg-[var(--surface)] border border-[var(--border)] rounded-full">
          {/* Pulsing red dot */}
          <span className="relative flex h-3 w-3 flex-shrink-0">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-red-500 opacity-75" />
            <span className="relative inline-flex h-3 w-3 rounded-full bg-red-500" />
          </span>

          {/* Timer */}
          <span className="text-sm font-mono text-[var(--foreground)] tabular-nums select-none">
            {formatTime(duration)}
          </span>

          {/* Waveform placeholder */}
          <div className="flex-1 flex items-center justify-center gap-[3px] overflow-hidden">
            {Array.from({ length: 24 }).map((_, i) => (
              <span
                key={i}
                className="inline-block w-[3px] rounded-full bg-red-400/60"
                style={{
                  height: `${8 + Math.sin((i + duration) * 0.8) * 8}px`,
                  transition: 'height 0.3s ease',
                }}
              />
            ))}
          </div>
        </div>

        {/* Send button */}
        <button
          type="button"
          onClick={handleSend}
          className="p-2 rounded-full bg-[var(--color-imessage-blue)] text-white hover:opacity-90 transition-opacity flex-shrink-0"
          aria-label="Send voice message"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            viewBox="0 0 24 24"
            fill="currentColor"
            className="w-6 h-6"
          >
            <path d="M3.478 2.404a.75.75 0 00-.926.941l2.432 7.905H13.5a.75.75 0 010 1.5H4.984l-2.432 7.905a.75.75 0 00.926.94 60.519 60.519 0 0018.445-8.986.75.75 0 000-1.218A60.517 60.517 0 003.478 2.404z" />
          </svg>
        </button>
      </div>
    </div>
  );
}
