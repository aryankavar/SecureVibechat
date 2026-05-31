'use client';

import { useState, useRef, useEffect, useCallback } from 'react';

interface VoicePlayerProps {
  audioUrl: string;
  duration?: number;
  isMine: boolean;
}

const PLAYBACK_SPEEDS = [1, 1.5, 2] as const;

function formatTime(seconds: number): string {
  if (!isFinite(seconds) || seconds < 0) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export default function VoicePlayer({ audioUrl, duration: initialDuration, isMine }: VoicePlayerProps) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const progressRef = useRef<HTMLDivElement>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [totalDuration, setTotalDuration] = useState(initialDuration ?? 0);
  const [speedIndex, setSpeedIndex] = useState(0);

  const currentSpeed = PLAYBACK_SPEEDS[speedIndex];

  // Sync duration from the audio element once metadata loads
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const onLoadedMetadata = () => {
      if (isFinite(audio.duration)) {
        setTotalDuration(audio.duration);
      }
    };

    const onTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
    };

    const onEnded = () => {
      setIsPlaying(false);
      setCurrentTime(0);
      audio.currentTime = 0;
    };

    audio.addEventListener('loadedmetadata', onLoadedMetadata);
    audio.addEventListener('timeupdate', onTimeUpdate);
    audio.addEventListener('ended', onEnded);

    return () => {
      audio.removeEventListener('loadedmetadata', onLoadedMetadata);
      audio.removeEventListener('timeupdate', onTimeUpdate);
      audio.removeEventListener('ended', onEnded);
    };
  }, []);

  const togglePlay = useCallback(async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        console.error('Playback failed:', err);
      }
    }
  }, [isPlaying]);

  const handleSeek = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    const audio = audioRef.current;
    const bar = progressRef.current;
    if (!audio || !bar || !totalDuration) return;

    const rect = bar.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
    audio.currentTime = ratio * totalDuration;
    setCurrentTime(audio.currentTime);
  }, [totalDuration]);

  const cycleSpeed = useCallback(() => {
    const nextIndex = (speedIndex + 1) % PLAYBACK_SPEEDS.length;
    setSpeedIndex(nextIndex);
    if (audioRef.current) {
      audioRef.current.playbackRate = PLAYBACK_SPEEDS[nextIndex];
    }
  }, [speedIndex]);

  const progressPercent = totalDuration > 0 ? (currentTime / totalDuration) * 100 : 0;

  // Colour scheme based on bubble ownership
  const colors = isMine
    ? {
        icon: 'text-white',
        track: 'bg-white/25',
        fill: 'bg-white',
        time: 'text-blue-100',
        speedBg: 'bg-white/20 hover:bg-white/30 text-white',
        dot: 'bg-white',
      }
    : {
        icon: 'text-[var(--color-imessage-blue)]',
        track: 'bg-gray-300 dark:bg-gray-600',
        fill: 'bg-[var(--color-imessage-blue)]',
        time: 'text-gray-500 dark:text-gray-400',
        speedBg: 'bg-[var(--color-imessage-blue)]/10 hover:bg-[var(--color-imessage-blue)]/20 text-[var(--color-imessage-blue)]',
        dot: 'bg-[var(--color-imessage-blue)]',
      };

  return (
    <div className="flex items-center gap-2.5 min-w-[200px] max-w-[280px] select-none">
      {/* Hidden audio element */}
      <audio ref={audioRef} src={audioUrl} preload="metadata" />

      {/* Play / Pause button */}
      <button
        onClick={togglePlay}
        className={`w-9 h-9 rounded-full flex items-center justify-center flex-shrink-0 transition-transform active:scale-90 ${colors.icon}`}
      >
        {isPlaying ? (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M6.75 5.25a.75.75 0 01.75-.75H9a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H7.5a.75.75 0 01-.75-.75V5.25zm7.5 0A.75.75 0 0115 4.5h1.5a.75.75 0 01.75.75v13.5a.75.75 0 01-.75.75H15a.75.75 0 01-.75-.75V5.25z" clipRule="evenodd" />
          </svg>
        ) : (
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="w-5 h-5">
            <path fillRule="evenodd" d="M4.5 5.653c0-1.426 1.529-2.33 2.779-1.643l11.54 6.348c1.295.712 1.295 2.573 0 3.285L7.28 19.991c-1.25.687-2.779-.217-2.779-1.643V5.653z" clipRule="evenodd" />
          </svg>
        )}
      </button>

      {/* Centre column: waveform bar + times */}
      <div className="flex-1 min-w-0">
        {/* Seekable progress bar */}
        <div
          ref={progressRef}
          onClick={handleSeek}
          className={`relative w-full h-1.5 rounded-full cursor-pointer ${colors.track}`}
          role="slider"
          aria-label="Seek"
          aria-valuenow={Math.round(currentTime)}
          aria-valuemin={0}
          aria-valuemax={Math.round(totalDuration)}
        >
          <div
            className={`absolute inset-y-0 left-0 rounded-full transition-[width] duration-100 ease-linear ${colors.fill}`}
            style={{ width: `${progressPercent}%` }}
          />
          {/* Thumb dot */}
          <div
            className={`absolute top-1/2 -translate-y-1/2 w-3 h-3 rounded-full shadow-sm transition-[left] duration-100 ease-linear ${colors.dot}`}
            style={{ left: `calc(${progressPercent}% - 6px)` }}
          />
        </div>

        {/* Time display */}
        <div className={`flex items-center justify-between mt-1 text-[10px] font-medium ${colors.time}`}>
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(totalDuration)}</span>
        </div>
      </div>

      {/* Playback speed toggle */}
      <button
        onClick={cycleSpeed}
        className={`px-1.5 py-0.5 rounded-md text-[10px] font-bold flex-shrink-0 transition-colors ${colors.speedBg}`}
      >
        {currentSpeed}x
      </button>
    </div>
  );
}
