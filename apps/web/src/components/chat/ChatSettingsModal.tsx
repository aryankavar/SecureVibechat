'use client';

import { useState } from 'react';
import { db } from '@/lib/firebase';
import { doc, updateDoc } from 'firebase/firestore';

interface ChatSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  chatId: string;
  currentSetting: string;
}

export default function ChatSettingsModal({ isOpen, onClose, chatId, currentSetting }: ChatSettingsModalProps) {
  const [setting, setSetting] = useState(currentSetting || 'off');
  const [loading, setLoading] = useState(false);

  if (!isOpen) return null;

  const handleSave = async () => {
    setLoading(true);
    try {
      await updateDoc(doc(db, 'chats', chatId), {
        disappearingSetting: setting,
      });
      onClose();
    } catch (err) {
      console.error('Failed to update chat settings:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      
      <div className="relative w-full max-w-sm p-6 mx-4 bg-[var(--background)] border border-[var(--border)] rounded-3xl shadow-xl z-10 animate-in zoom-in-95 fade-in duration-200">
        <div className="flex justify-between items-center mb-5">
          <h2 className="text-xl font-semibold text-[var(--foreground)]">Chat Settings</h2>
          <button onClick={onClose} className="p-2 hover:bg-gray-100 dark:hover:bg-gray-800 rounded-full transition-colors">
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5 text-gray-500">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-500 mb-3">Disappearing Messages</h3>
          <p className="text-xs text-gray-400 mb-4">
            Messages will be automatically deleted from this chat after the selected time limit.
          </p>

          <div className="space-y-2">
            {[
              { id: 'off', label: 'Off' },
              { id: '1hr', label: '1 Hour' },
              { id: '24hr', label: '24 Hours' },
              { id: '7days', label: '7 Days' }
            ].map(option => (
              <label key={option.id} className={`flex items-center justify-between p-3 rounded-xl border cursor-pointer transition-colors ${setting === option.id ? 'border-[var(--color-imessage-blue)] bg-[var(--color-imessage-blue)]/5' : 'border-[var(--border)] hover:bg-gray-50 dark:hover:bg-gray-800/50'}`}>
                <span className="text-[var(--foreground)] font-medium">{option.label}</span>
                <input
                  type="radio"
                  name="disappearing"
                  value={option.id}
                  checked={setting === option.id}
                  onChange={() => setSetting(option.id)}
                  className="w-5 h-5 text-[var(--color-imessage-blue)] focus:ring-[var(--color-imessage-blue)]"
                />
              </label>
            ))}
          </div>
        </div>

        <button
          onClick={handleSave}
          disabled={loading || setting === currentSetting}
          className="w-full py-3 bg-[var(--color-imessage-blue)] text-white rounded-xl font-semibold hover:opacity-90 transition-opacity disabled:opacity-50"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
}
