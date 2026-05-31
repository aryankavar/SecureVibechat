'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { createUserProfile } from '@/services/userService';
import { useAuthStore } from '@/lib/stores/authStore';

export default function ProfileSetup() {
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  const { setProfile } = useAuthStore();

  const handleSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!displayName.trim()) return;

    setLoading(true);
    setError('');

    try {
      const newProfile = await createUserProfile(displayName, about);
      setProfile(newProfile as any);
      router.push('/chat');
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to create profile');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen w-full items-center justify-center bg-[var(--background)] p-4">
      <div className="w-full max-w-md p-8 glass-panel rounded-3xl shadow-xl">
        <h1 className="text-2xl font-bold mb-2 text-center">Complete your profile</h1>
        <p className="text-gray-500 text-center mb-6">Enter your details to start messaging.</p>
        
        {error && (
          <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSetup} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">Display Name</label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="John Doe"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all"
              required
              minLength={2}
            />
          </div>
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">About (Optional)</label>
            <input
              type="text"
              value={about}
              onChange={(e) => setAbout(e.target.value)}
              placeholder="Hey there! I am using SecureVibeChat."
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all"
            />
          </div>
          <button
            type="submit"
            disabled={loading || displayName.length < 2}
            className="w-full py-3 bg-[var(--color-imessage-blue)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all mt-6"
          >
            {loading ? 'Saving...' : 'Start Messaging'}
          </button>
        </form>
      </div>
    </div>
  );
}
