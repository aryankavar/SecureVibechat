'use client';

import { useAuthStore } from '@/lib/stores/authStore';
import PhoneAuth from '@/components/auth/PhoneAuth';
import { useRouter } from 'next/navigation';
import { useEffect } from 'react';

export default function Home() {
  const { user, profile, isLoading } = useAuthStore();
  const router = useRouter();

  useEffect(() => {
    if (!isLoading && user) {
      if (profile) {
        router.push('/chat');
      } else {
        router.push('/profile/setup');
      }
    }
  }, [user, profile, isLoading, router]);

  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-[var(--background)]">
        <div className="animate-pulse flex flex-col items-center">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-imessage-blue)] mb-4"></div>
          <div className="text-xl font-medium text-[var(--color-imessage-gray)]">Loading...</div>
        </div>
      </div>
    );
  }

  return (
    <main className="flex h-screen w-full flex-col items-center justify-center p-4 bg-gradient-to-br from-blue-50 to-purple-50 dark:from-gray-900 dark:to-black">
      <div className="text-center mb-8">
        <div className="w-20 h-20 bg-[var(--color-imessage-blue)] rounded-3xl mx-auto mb-4 shadow-lg flex items-center justify-center">
          <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
          </svg>
        </div>
        <h1 className="text-4xl font-bold mb-2">SecureVibeChat</h1>
        <p className="text-gray-500">Private messaging, reimagined.</p>
      </div>
      
      <PhoneAuth />
    </main>
  );
}
