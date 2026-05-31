'use client';

import { useState, useEffect } from 'react';
import { useAuthStore } from '@/lib/stores/authStore';
import { updateUserProfile } from '@/services/userService';
import Image from 'next/image';
import { auth } from '@/lib/firebase';
import { signOut } from 'firebase/auth';
import { useRouter } from 'next/navigation';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function ProfileModal({ isOpen, onClose }: ProfileModalProps) {
  const { user, profile, setProfile } = useAuthStore();
  const router = useRouter();
  
  const [isEditing, setIsEditing] = useState(false);
  const [displayName, setDisplayName] = useState('');
  const [about, setAbout] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.displayName || '');
      setAbout(profile.about || '');
    }
  }, [profile]);

  if (!isOpen || !user || !profile) return null;

  const handleSave = async () => {
    if (!displayName.trim()) return;
    
    setIsSaving(true);
    setError('');
    
    try {
      const updatedData = await updateUserProfile(displayName, about);
      setProfile({ ...profile, ...updatedData });
      setIsEditing(false);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to update profile');
    } finally {
      setIsSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      onClose();
      router.push('/');
    } catch (err) {
      console.error('Logout error:', err);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="glass-panel w-full max-w-md rounded-2xl shadow-2xl flex flex-col max-h-[85vh] animate-in zoom-in-95 duration-200 overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex justify-between items-center p-4 border-b border-[var(--border)]">
          <h2 className="text-xl font-bold">Profile</h2>
          <button 
            onClick={onClose}
            className="p-2 rounded-full hover:bg-[var(--hover)] text-gray-500 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="w-6 h-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>
        
        <div className="p-6 flex-1 overflow-y-auto flex flex-col items-center">
          {/* Avatar */}
          <div className="relative w-24 h-24 rounded-full overflow-hidden mb-4 border-4 border-[var(--background)] shadow-lg bg-[var(--surface)]">
            <Image
              src={profile.avatarUrl || `https://ui-avatars.com/api/?name=${encodeURIComponent(profile.displayName || 'User')}`}
              alt={profile.displayName}
              fill
              unoptimized
              className="object-cover"
            />
          </div>
          
          {/* Phone Number Display (Always visible) */}
          <div className="bg-[var(--hover)] px-4 py-2 rounded-full mb-6">
            <span className="text-sm font-mono text-[var(--color-imessage-blue)]">{user.phoneNumber || 'Unknown Number'}</span>
          </div>
          
          {error && (
            <div className="mb-4 p-3 bg-red-500/10 border border-red-500/20 text-red-500 rounded-xl text-sm w-full">
              {error}
            </div>
          )}

          {isEditing ? (
            <div className="w-full space-y-4">
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">Display Name</label>
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all text-[var(--foreground)]"
                  placeholder="Your Name"
                />
              </div>
              <div>
                <label className="block text-sm font-medium mb-1 text-gray-500">About</label>
                <input
                  type="text"
                  value={about}
                  onChange={(e) => setAbout(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--background)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all text-[var(--foreground)]"
                  placeholder="Hey there! I am using SecureVibeChat."
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button 
                  onClick={() => setIsEditing(false)}
                  className="flex-1 py-3 rounded-xl font-medium border border-[var(--border)] hover:bg-[var(--hover)] transition-colors text-[var(--foreground)]"
                  disabled={isSaving}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleSave}
                  className="flex-1 py-3 rounded-xl font-medium bg-[var(--color-imessage-blue)] text-white hover:opacity-90 transition-colors"
                  disabled={isSaving || !displayName.trim()}
                >
                  {isSaving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </div>
          ) : (
            <div className="w-full">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold text-[var(--foreground)]">{profile.displayName}</h3>
                <p className="text-gray-500 mt-1">{profile.about || 'Hey there! I am using SecureVibeChat.'}</p>
              </div>
              
              <div className="space-y-3 mt-8">
                <button 
                  onClick={() => setIsEditing(true)}
                  className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-[var(--border)] bg-[var(--background)] hover:bg-[var(--hover)] transition-colors font-medium text-[var(--foreground)]"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.89 1.147l-2.831.091c-.3.01-.55-.24-.54-.54l.091-2.831a4.5 4.5 0 011.147-1.89l13.418-13.418z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 7.125L16.862 4.487" />
                  </svg>
                  Edit Profile
                </button>
                
                <button 
                  onClick={handleLogout}
                  className="w-full py-3 flex items-center justify-center gap-2 rounded-xl border border-red-500/20 bg-red-500/10 text-red-500 hover:bg-red-500/20 transition-colors font-medium"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15M12 9l-3 3m0 0l3 3m-3-3h12.75" />
                  </svg>
                  Log Out
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
