'use client';

import { useState } from 'react';
import { restoreDeviceWithPIN, registerDevice } from '@/services/userService';
import ConfirmDialog from '@/components/ui/ConfirmDialog';

interface RestorePINModalProps {
  uid: string;
  onSuccess: () => void;
}

export default function RestorePINModal({ uid, onSuccess }: RestorePINModalProps) {
  const [pin, setPin] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [showConfirmSkip, setShowConfirmSkip] = useState(false);

  const handleRestore = async (e: React.FormEvent) => {
    e.preventDefault();
    if (pin.length !== 6) return;

    setLoading(true);
    setError('');

    try {
      await restoreDeviceWithPIN(uid, pin);
      onSuccess();
    } catch (err: any) {
      console.error(err);
      if (err.message === 'WRONG_PIN') {
        setError('Incorrect PIN. Please try again.');
      } else {
        setError('Failed to restore keys. Please check your PIN.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleSkip = async () => {
    setShowConfirmSkip(false);
    setLoading(true);
    try {
      await registerDevice(uid);
      onSuccess();
    } catch (err: any) {
      setError('Failed to setup new device.');
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/60 backdrop-blur-sm px-4">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl shadow-2xl animate-in zoom-in-95 fade-in duration-200">
        <div className="text-center mb-6">
          <div className="w-16 h-16 bg-[var(--color-imessage-blue)]/20 text-[var(--color-imessage-blue)] rounded-full flex items-center justify-center mx-auto mb-4">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-8 h-8">
              <path strokeLinecap="round" strokeLinejoin="round" d="M16.5 10.5V6.75a4.5 4.5 0 10-9 0v3.75m-.75 11.25h10.5a2.25 2.25 0 002.25-2.25v-6.75a2.25 2.25 0 00-2.25-2.25H6.75a2.25 2.25 0 00-2.25 2.25v6.75a2.25 2.25 0 002.25 2.25z" />
            </svg>
          </div>
          <h2 className="text-2xl font-bold mb-2">New Device Detected</h2>
          <p className="text-sm text-gray-500">
            Enter your 6-digit Security PIN to restore your end-to-end encryption keys and read your message history.
          </p>
        </div>

        {error && (
          <div className="mb-4 p-3 bg-red-100/10 border border-red-500/20 text-red-500 rounded-xl text-sm text-center">
            {error}
          </div>
        )}

        <form onSubmit={handleRestore} className="space-y-4">
          <div>
            <input
              type="password"
              inputMode="numeric"
              maxLength={6}
              value={pin}
              onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
              placeholder="••••••"
              className="w-full px-4 py-4 text-center text-2xl tracking-[0.5em] rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all"
              required
              autoFocus
            />
          </div>
          <button
            type="submit"
            disabled={loading || pin.length !== 6}
            className="w-full py-3 bg-[var(--color-imessage-blue)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Restoring...' : 'Restore Keys'}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => setShowConfirmSkip(true)}
            disabled={loading}
            className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
          >
            Skip and start fresh (lose message history)
          </button>
        </div>
      </div>

      <ConfirmDialog
        isOpen={showConfirmSkip}
        title="Skip Device Restore?"
        message="Are you sure? If you skip, you won't be able to read any previous encrypted messages on this device."
        confirmText="Skip & Lose History"
        isDestructive={true}
        onConfirm={handleSkip}
        onCancel={() => setShowConfirmSkip(false)}
      />
    </div>
  );
}
