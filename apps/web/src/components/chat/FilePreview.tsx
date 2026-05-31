'use client';

import { useState, useCallback } from 'react';
import { createPortal } from 'react-dom';

interface FilePreviewProps {
  fileUrl: string;
  metadata: {
    fileName: string;
    fileSize: number;
    mimeType: string;
    width?: number;
    height?: number;
  };
  isMine: boolean;
}

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getFileExtension(fileName: string): string {
  return fileName.split('.').pop()?.toUpperCase() || 'FILE';
}

function isImage(mimeType: string): boolean {
  return mimeType.startsWith('image/');
}

function isVideo(mimeType: string): boolean {
  return mimeType.startsWith('video/');
}

/** Full-screen lightbox overlay for images */
function Lightbox({ src, alt, onClose }: { src: string; alt: string; onClose: () => void }) {
  if (typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 backdrop-blur-sm"
      onClick={onClose}
    >
      {/* Close button */}
      <button
        onClick={onClose}
        className="absolute top-4 right-4 z-[101] p-2 rounded-full bg-white/10 hover:bg-white/20 text-white transition-colors"
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-6 h-6">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
        </svg>
      </button>

      {/* Full-res image */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src={src}
        alt={alt}
        className="max-w-[90vw] max-h-[90vh] object-contain rounded-lg shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      />
    </div>,
    document.body
  );
}

/** Inline image preview with lightbox trigger */
function ImagePreview({
  fileUrl,
  metadata,
  isMine,
}: FilePreviewProps) {
  const [showLightbox, setShowLightbox] = useState(false);
  const [imageLoaded, setImageLoaded] = useState(false);

  const handleOpen = useCallback(() => setShowLightbox(true), []);
  const handleClose = useCallback(() => setShowLightbox(false), []);

  // Compute constrained dimensions for the thumbnail
  const maxThumbWidth = 300;
  const maxThumbHeight = 280;
  let thumbStyle: React.CSSProperties = { maxWidth: maxThumbWidth };
  if (metadata.width && metadata.height) {
    const aspect = metadata.width / metadata.height;
    let w = Math.min(metadata.width, maxThumbWidth);
    let h = w / aspect;
    if (h > maxThumbHeight) {
      h = maxThumbHeight;
      w = h * aspect;
    }
    thumbStyle = { width: w, height: h };
  }

  return (
    <>
      <button
        onClick={handleOpen}
        className="block rounded-xl overflow-hidden focus:outline-none focus:ring-2 focus:ring-[var(--color-imessage-blue)] transition-transform active:scale-[0.97]"
      >
        <div className="relative" style={thumbStyle}>
          {!imageLoaded && (
            <div className="absolute inset-0 bg-[var(--surface)] animate-pulse rounded-xl" />
          )}
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={fileUrl}
            alt={metadata.fileName}
            className={`w-full h-full object-cover rounded-xl transition-opacity duration-300 ${
              imageLoaded ? 'opacity-100' : 'opacity-0'
            }`}
            onLoad={() => setImageLoaded(true)}
          />
        </div>
      </button>

      {showLightbox && (
        <Lightbox src={fileUrl} alt={metadata.fileName} onClose={handleClose} />
      )}
    </>
  );
}

/** Inline video player */
function VideoPreview({
  fileUrl,
  metadata,
}: Pick<FilePreviewProps, 'fileUrl' | 'metadata'>) {
  return (
    <div className="rounded-xl overflow-hidden" style={{ maxWidth: 300 }}>
      <video
        src={fileUrl}
        controls
        preload="metadata"
        className="w-full rounded-xl"
        playsInline
      >
        <track kind="captions" />
        Your browser does not support the video tag.
      </video>
      <p className="text-xs mt-1 opacity-60 truncate">{metadata.fileName}</p>
    </div>
  );
}

/** Document preview card with download button */
function DocumentPreview({
  fileUrl,
  metadata,
  isMine,
}: FilePreviewProps) {
  const ext = getFileExtension(metadata.fileName);

  return (
    <div className="flex items-center gap-3 min-w-[200px] max-w-[300px]">
      {/* File type icon */}
      <div
        className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${
          isMine ? 'bg-white/20' : 'bg-[var(--color-imessage-blue)]/10'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke={isMine ? 'white' : 'var(--color-imessage-blue)'} className="w-5 h-5">
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
        </svg>
      </div>

      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium truncate">{metadata.fileName}</p>
        <p className={`text-xs ${isMine ? 'text-blue-100' : 'text-gray-500'}`}>
          {ext} · {formatFileSize(metadata.fileSize)}
        </p>
      </div>

      {/* Download button */}
      <a
        href={fileUrl}
        download={metadata.fileName}
        target="_blank"
        rel="noopener noreferrer"
        className={`p-2 rounded-full flex-shrink-0 transition-colors ${
          isMine
            ? 'bg-white/20 hover:bg-white/30 text-white'
            : 'bg-[var(--color-imessage-blue)]/10 hover:bg-[var(--color-imessage-blue)]/20 text-[var(--color-imessage-blue)]'
        }`}
      >
        <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
          <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5M16.5 12L12 16.5m0 0L7.5 12m4.5 4.5V3" />
        </svg>
      </a>
    </div>
  );
}

export default function FilePreview({ fileUrl, metadata, isMine }: FilePreviewProps) {
  if (isImage(metadata.mimeType)) {
    return <ImagePreview fileUrl={fileUrl} metadata={metadata} isMine={isMine} />;
  }

  if (isVideo(metadata.mimeType)) {
    return <VideoPreview fileUrl={fileUrl} metadata={metadata} />;
  }

  return <DocumentPreview fileUrl={fileUrl} metadata={metadata} isMine={isMine} />;
}
