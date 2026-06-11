'use client';

import { useState } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Phone, Users, CircleDashed, User } from 'lucide-react';

interface BottomNavProps {
  onProfileClick: () => void;
}

export function BottomNav({ onProfileClick }: BottomNavProps) {
  const [activeTab, setActiveTab] = useState('chats');

  const tabs = [
    { id: 'chats', label: 'Chats', icon: MessageCircle },
    { id: 'you', label: 'You', icon: User },
  ];

  return (
    <div className="fixed bottom-6 left-1/2 -translate-x-1/2 z-50 md:hidden w-fit">
      <div className="bg-white/5 dark:bg-white/5 backdrop-blur-xl rounded-[32px] p-2 px-4 flex items-center justify-center gap-6 shadow-[0_2px_12px_rgba(0,0,0,0.1)] border border-white/30 dark:border-white/15">
        {tabs.map((tab) => {
          const isActive = activeTab === tab.id;
          const Icon = tab.icon;

          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id);
                if (tab.id === 'you') {
                  onProfileClick();
                }
              }}
              className="relative flex flex-col items-center justify-center w-16 h-14 rounded-2xl transition-colors"
            >
              {isActive && (
                <motion.div
                  layoutId="bottom-nav-active"
                  className="absolute inset-0 bg-black/5 dark:bg-white/10 rounded-[20px]"
                  transition={{ type: 'spring', bounce: 0.2, duration: 0.6 }}
                />
              )}
              <div className="relative z-10 flex flex-col items-center gap-1">
                <Icon 
                  size={24} 
                  strokeWidth={isActive ? 2.5 : 2}
                  className={isActive ? "text-[var(--color-accent)]" : "text-gray-500 dark:text-gray-400"}
                />
                <span className={`text-[10px] font-medium ${isActive ? "text-[var(--color-accent)]" : "text-gray-500 dark:text-gray-400"}`}>
                  {tab.label}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
