'use client';

import { useState, useRef, useCallback } from 'react';
import { storage } from '@/lib/firebase';
import { ref, uploadBytesResumable, getDownloadURL } from 'firebase/storage';

export interface FileMetadata {
  fileName: string;
  fileSize: number;
  mimeType: string;
  width?: number;
  height?: number;
}

interface FileUploaderProps {
  chatId: string;
  onUploadComplete: (fileUrl: string, metadata: FileMetadata) => void;
  onClose: () => void;
}

const MAX_FILE_SIZE = 25 * 1024 * 1024; // 25MB
const MAX_IMAGE_DIMENSION = 1920;

const ACCEPTED_TYPES: Record<string, string[]> = {
  image: ['image/jpeg', 'image/png', 'image/webp', 'image/gif'],
  document: [
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  ],
  video: ['video/mp4', 'video/webm'],
};

const ALL_ACCEPTED = Object.values(ACCEPTED_TYPES).flat();

function formatFileSize(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function isAcceptedType(mimeType: string): boolean {
  return ALL_ACCEPTED.includes(mimeType);
}

function isImageType(mimeType: string): boolean {
  return ACCEPTED_TYPES.image.includes(mimeType);
}

/**
 * Compress an image file using an offscreen canvas.
 * Returns a Blob capped at MAX_IMAGE_DIMENSION on the longest side.
 * GIFs are returned as-is to preserve animation.
 */
async function compressImage(
  file: File,
): Promise<{ blob: Blob; width: number; height: number }> {
  if (file.type === 'image/gif') {
    // Don't re-encode GIFs — we'd lose animation frames
    return new Promise((resolve, reject) => {
      const img = new Image();
      img.onload = () => {
        resolve({ blob: file, width: img.naturalWidth, height: img.naturalHeight });
        URL.revokeObjectURL(img.src);
      };
      img.onerror = reject;
      img.src = URL.createObjectURL(file);
    });
  }

  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      let { naturalWidth: w, naturalHeight: h } = img;

      // Scale down if exceeds max dimension
      if (w > MAX_IMAGE_DIMENSION || h > MAX_IMAGE_DIMENSION) {
        const ratio = Math.min(MAX_IMAGE_DIMENSION / w, MAX_IMAGE_DIMENSION / h);
        w = Math.round(w * ratio);
        h = Math.round(h * ratio);
      }

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0, w, h);

      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, width: w, height: h });
          } else {
            reject(new Error('Canvas toBlob returned null'));
          }
          URL.revokeObjectURL(img.src);
        },
        file.type === 'image/png' ? 'image/png' : 'image/jpeg',
        0.85,
      );
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

export default function FileUploader({ chatId, onUploadComplete, onClose }: FileUploaderProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback((file: File) => {
    setError(null);

    if (!isAcceptedType(file.type)) {
      setError('Unsupported file type. Please upload an image, document, or video.');
      return;
    }

    if (file.size > MAX_FILE_SIZE) {
      setError(`File too large. Maximum size is ${formatFileSize(MAX_FILE_SIZE)}.`);
      return;
    }

    setSelectedFile(file);
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setIsDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleBrowse = useCallback(() => {
    fileInputRef.current?.click();
  }, []);

  const handleInputChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const handleUpload = useCallback(async () => {
    if (!selectedFile) return;

    setUploading(true);
    setProgress(0);
    setError(null);

    try {
      let uploadBlob: Blob = selectedFile;
      let width: number | undefined;
      let height: number | undefined;

      // Compress images client-side
      if (isImageType(selectedFile.type)) {
        const result = await compressImage(selectedFile);
        uploadBlob = result.blob;
        width = result.width;
        height = result.height;
      }

      const timestamp = Date.now();
      const safeName = selectedFile.name.replace(/[^a-zA-Z0-9._-]/g, '_');
      const storagePath = `chats/${chatId}/files/${timestamp}_${safeName}`;
      const storageRef = ref(storage, storagePath);

      const uploadTask = uploadBytesResumable(storageRef, uploadBlob, {
        contentType: selectedFile.type,
      });

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const pct = Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100);
          setProgress(pct);
        },
        (uploadError) => {
          console.error('Upload failed:', uploadError);
          setError('Upload failed. Please try again.');
          setUploading(false);
        },
        async () => {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          const metadata: FileMetadata = {
            fileName: selectedFile.name,
            fileSize: uploadBlob.size,
            mimeType: selectedFile.type,
            ...(width !== undefined && { width }),
            ...(height !== undefined && { height }),
          };
          onUploadComplete(downloadUrl, metadata);
        },
      );
    } catch (err) {
      console.error('Upload error:', err);
      setError('Something went wrong. Please try again.');
      setUploading(false);
    }
  }, [selectedFile, chatId, onUploadComplete]);

  const acceptString = ALL_ACCEPTED.join(',');

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm">
      <div className="glass-panel flex flex-col w-full max-w-md max-h-[90vh] mx-4 rounded-2xl border border-[var(--border)] shadow-2xl overflow-hidden bg-[var(--background)]">
        {/* Header */}
        <div className="flex-shrink-0 flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h3 className="text-lg font-semibold">Send File</h3>
          <button
            onClick={onClose}
            disabled={uploading}
            className="p-1 rounded-full hover:bg-[var(--surface)] transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto">
          {!selectedFile ? (
            /* Drop zone */
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={handleBrowse}
              className={`
                flex flex-col items-center justify-center gap-3 p-8
                border-2 border-dashed rounded-2xl cursor-pointer
                transition-all duration-200
                ${isDragging
                  ? 'border-[var(--color-imessage-blue)] bg-[var(--color-imessage-blue)]/5 scale-[1.02]'
                  : 'border-[var(--border)] hover:border-[var(--color-imessage-blue)] hover:bg-[var(--surface)]'
                }
              `}
            >
              <div className="w-14 h-14 rounded-full bg-[var(--color-imessage-blue)]/10 flex items-center justify-center">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-imessage-blue)" className="w-7 h-7">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
                </svg>
              </div>
              <div className="text-center">
                <p className="font-medium">
                  {isDragging ? 'Drop file here' : 'Drag & drop or tap to browse'}
                </p>
                <p className="text-xs text-gray-500 mt-1">
                  Images, Documents, Videos · Max {formatFileSize(MAX_FILE_SIZE)}
                </p>
              </div>
            </div>
          ) : (
            /* Selected file preview */
            <div className="space-y-4">
              <div className="flex items-center gap-3 p-4 rounded-2xl bg-[var(--surface)]">
                {/* File icon */}
                <div className="w-12 h-12 rounded-xl bg-[var(--color-imessage-blue)]/10 flex items-center justify-center flex-shrink-0">
                  {isImageType(selectedFile.type) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-imessage-blue)" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                    </svg>
                  ) : ACCEPTED_TYPES.video.includes(selectedFile.type) ? (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-imessage-blue)" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M15.91 11.672a.375.375 0 010 .656l-5.603 3.113a.375.375 0 01-.557-.328V8.887c0-.286.307-.466.557-.327l5.603 3.112z" />
                    </svg>
                  ) : (
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="var(--color-imessage-blue)" className="w-6 h-6">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
                    </svg>
                  )}
                </div>

                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium truncate">{selectedFile.name}</p>
                  <p className="text-xs text-gray-500">{formatFileSize(selectedFile.size)}</p>
                </div>

                {!uploading && (
                  <button
                    onClick={() => setSelectedFile(null)}
                    className="p-1.5 rounded-full hover:bg-[var(--border)] transition-colors flex-shrink-0"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                    </svg>
                  </button>
                )}
              </div>

              {/* Progress bar */}
              {uploading && (
                <div className="space-y-2">
                  <div className="w-full h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                    <div
                      className="h-full rounded-full bg-[var(--color-imessage-blue)] transition-all duration-300 ease-out"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                  <p className="text-xs text-center text-gray-500">
                    {progress < 100 ? `Uploading… ${progress}%` : 'Processing…'}
                  </p>
                </div>
              )}

              {/* Send button */}
              {!uploading && (
                <button
                  onClick={handleUpload}
                  className="w-full py-3 rounded-xl bg-[var(--color-imessage-blue)] text-white font-semibold text-sm hover:opacity-90 transition-opacity active:scale-[0.98]"
                >
                  Send File
                </button>
              )}
            </div>
          )}

          {/* Error display */}
          {error && (
            <div className="mt-3 flex items-center gap-2 px-4 py-3 rounded-xl bg-red-500/10 text-red-500 text-sm">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-5 h-5 flex-shrink-0">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
              </svg>
              <span>{error}</span>
            </div>
          )}
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept={acceptString}
          onChange={handleInputChange}
          className="hidden"
        />
      </div>
    </div>
  );
}
