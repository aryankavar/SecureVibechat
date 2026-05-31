'use client';

import { useState, useEffect, useRef, useCallback } from 'react';

interface GifPickerProps {
  onSelect: (gifUrl: string, previewUrl: string, width: number, height: number) => void;
  onClose: () => void;
}

interface TenorMediaFormat {
  url: string;
  dims: [number, number];
  size: number;
}

interface TenorGif {
  id: string;
  title: string;
  media_formats: {
    gif: TenorMediaFormat;
    tinygif: TenorMediaFormat;
  };
}

interface TenorResponse {
  results: TenorGif[];
  next: string;
}

const TENOR_API_KEY = 'AIzaSyAyimkuYQYF_FXVALexPuGQctUWRURdCYQ';
const TENOR_CLIENT_KEY = 'securevibechat';

function buildTenorUrl(endpoint: 'search' | 'featured', query?: string): string {
  const base = `https://tenor.googleapis.com/v2/${endpoint}?key=${TENOR_API_KEY}&client_key=${TENOR_CLIENT_KEY}&limit=20`;
  if (endpoint === 'search' && query) {
    return `${base}&q=${encodeURIComponent(query)}`;
  }
  return base;
}

/** Skeleton placeholder for a single GIF cell */
function GifSkeleton({ height }: { height: number }) {
  return (
    <div
      className="rounded-xl bg-gray-200 dark:bg-gray-700 animate-pulse"
      style={{ height }}
    />
  );
}

/** Single lazy-loaded GIF thumbnail */
function GifThumbnail({
  gif,
  onSelect,
}: {
  gif: TenorGif;
  onSelect: GifPickerProps['onSelect'];
}) {
  const imgRef = useRef<HTMLImageElement>(null);
  const [loaded, setLoaded] = useState(false);

  const preview = gif.media_formats.tinygif;
  const full = gif.media_formats.gif;
  // Compute aspect-ratio-based height for the thumbnail (column width is ~50%)
  const aspectRatio = preview.dims[1] / preview.dims[0];
  const estimatedHeight = Math.round(160 * aspectRatio);

  return (
    <button
      type="button"
      onClick={() => onSelect(full.url, preview.url, full.dims[0], full.dims[1])}
      className="relative w-full rounded-xl overflow-hidden cursor-pointer group focus:outline-none focus:ring-2 focus:ring-[var(--color-imessage-blue)] transition-transform active:scale-95"
      style={{ height: estimatedHeight }}
    >
      {!loaded && <GifSkeleton height={estimatedHeight} />}
      <img
        ref={imgRef}
        src={preview.url}
        alt={gif.title || 'GIF'}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        className={`absolute inset-0 w-full h-full object-cover rounded-xl transition-opacity duration-200 ${
          loaded ? 'opacity-100' : 'opacity-0'
        }`}
      />
      {/* Hover overlay */}
      <div className="absolute inset-0 bg-black/0 group-hover:bg-black/10 transition-colors rounded-xl" />
    </button>
  );
}

export default function GifPicker({ onSelect, onClose }: GifPickerProps) {
  const [query, setQuery] = useState('');
  const [gifs, setGifs] = useState<TenorGif[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const pickerRef = useRef<HTMLDivElement>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Fetch GIFs (trending or search)
  const fetchGifs = useCallback(async (searchQuery: string) => {
    setLoading(true);
    setError(null);
    try {
      const url = searchQuery.trim()
        ? buildTenorUrl('search', searchQuery.trim())
        : buildTenorUrl('featured');
      const res = await fetch(url);
      if (!res.ok) throw new Error(`Tenor API error: ${res.status}`);
      const data: TenorResponse = await res.json();
      setGifs(data.results ?? []);
    } catch (err) {
      console.error('Failed to fetch GIFs:', err);
      setError('Failed to load GIFs. Please try again.');
      setGifs([]);
    } finally {
      setLoading(false);
    }
  }, []);

  // Load trending on mount
  useEffect(() => {
    fetchGifs('');
  }, [fetchGifs]);

  // Debounced search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      fetchGifs(query);
    }, 300);
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, fetchGifs]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (pickerRef.current && !pickerRef.current.contains(event.target as Node)) {
        onClose();
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [onClose]);

  // Close on Escape
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  // Split GIFs into two columns for masonry layout
  const leftColumn: TenorGif[] = [];
  const rightColumn: TenorGif[] = [];
  gifs.forEach((gif, i) => {
    if (i % 2 === 0) leftColumn.push(gif);
    else rightColumn.push(gif);
  });

  return (
    <div
      ref={pickerRef}
      className="absolute bottom-full left-4 mb-2 z-50 w-[340px] bg-white dark:bg-[#1C1C1E] border border-[var(--border)] rounded-2xl shadow-2xl overflow-hidden animate-in fade-in slide-in-from-bottom-2 duration-200 flex flex-col"
      style={{ maxHeight: 400 }}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-3 pt-3 pb-1">
        <h3 className="text-sm font-semibold text-[var(--foreground)]">GIFs</h3>
        <button
          type="button"
          onClick={onClose}
          className="p-1 rounded-full text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-white/10 transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Search input */}
      <div className="px-3 pb-2">
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search GIFs..."
          autoFocus
          className="w-full px-3 py-1.5 text-sm bg-[var(--surface)] border border-[var(--border)] rounded-full focus:outline-none focus:border-[var(--color-imessage-blue)] transition-colors placeholder:text-gray-400"
        />
      </div>

      {/* GIF grid */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 scrollbar-thin">
        {loading ? (
          /* Loading skeletons */
          <div className="flex gap-1.5">
            <div className="flex-1 flex flex-col gap-1.5">
              {[120, 90, 110, 80].map((h, i) => (
                <GifSkeleton key={`l-${i}`} height={h} />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {[80, 120, 100, 90].map((h, i) => (
                <GifSkeleton key={`r-${i}`} height={h} />
              ))}
            </div>
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
            </svg>
            <p className="text-sm">{error}</p>
          </div>
        ) : gifs.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-400">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8 mb-2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-5.197-5.197m0 0A7.5 7.5 0 105.196 5.196a7.5 7.5 0 0010.607 10.607z" />
            </svg>
            <p className="text-sm">No GIFs found</p>
          </div>
        ) : (
          <div className="flex gap-1.5">
            <div className="flex-1 flex flex-col gap-1.5">
              {leftColumn.map((gif) => (
                <GifThumbnail key={gif.id} gif={gif} onSelect={onSelect} />
              ))}
            </div>
            <div className="flex-1 flex flex-col gap-1.5">
              {rightColumn.map((gif) => (
                <GifThumbnail key={gif.id} gif={gif} onSelect={onSelect} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Powered by Tenor footer */}
      <div className="px-3 py-1.5 border-t border-[var(--border)] text-center">
        <span className="text-[10px] text-gray-400">Powered by Tenor</span>
      </div>
    </div>
  );
}
