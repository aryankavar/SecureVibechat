'use client';

import { useState, useEffect } from 'react';
import { setupRecaptcha, sendOTP, verifyOTP, clearRecaptcha } from '@/services/authService';
import { useRouter } from 'next/navigation';

export default function PhoneAuth() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'phone' | 'otp'>('phone');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  useEffect(() => {
    // Initialize reCAPTCHA on mount
    setupRecaptcha('recaptcha-container');
    
    return () => {
      clearRecaptcha();
    };
  }, []);

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      // Basic formatting, assumes country code is included
      const formattedPhone = phoneNumber.startsWith('+') ? phoneNumber : `+${phoneNumber}`;
      await sendOTP(formattedPhone);
      setStep('otp');
    } catch (err: any) {
      setError(err.message || 'Failed to send OTP');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      await verifyOTP(otp);
      // AuthProvider will pick up the state change, redirect handled in page.tsx or layout
    } catch (err: any) {
      setError('Invalid OTP code');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md p-8 glass-panel rounded-3xl shadow-xl">
      <h1 className="text-2xl font-bold mb-6 text-center">
        {step === 'phone' ? 'Enter Phone Number' : 'Enter Code'}
      </h1>
      
      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-700 rounded-xl text-sm">
          {error}
        </div>
      )}

      {step === 'phone' ? (
        <form onSubmit={handleSendOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">Phone Number (with country code)</label>
            <input
              type="tel"
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="+1234567890"
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || !phoneNumber}
            className="w-full py-3 bg-[var(--color-imessage-blue)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Sending...' : 'Send Code'}
          </button>
        </form>
      ) : (
        <form onSubmit={handleVerifyOtp} className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-1 text-gray-500">6-Digit Code</label>
            <input
              type="text"
              value={otp}
              onChange={(e) => setOtp(e.target.value)}
              placeholder="123456"
              maxLength={6}
              className="w-full px-4 py-3 rounded-xl border border-[var(--border)] bg-[var(--surface)] focus:ring-2 focus:ring-[var(--color-imessage-blue)] outline-none tracking-widest text-center text-lg transition-all"
              required
            />
          </div>
          <button
            type="submit"
            disabled={loading || otp.length !== 6}
            className="w-full py-3 bg-[var(--color-imessage-blue)] text-white rounded-xl font-medium hover:opacity-90 disabled:opacity-50 transition-all"
          >
            {loading ? 'Verifying...' : 'Verify'}
          </button>
          <button
            type="button"
            onClick={() => setStep('phone')}
            className="w-full py-2 text-[var(--color-imessage-blue)] text-sm font-medium"
          >
            Back
          </button>
        </form>
      )}
      
      {/* Invisible reCAPTCHA container */}
      <div id="recaptcha-container"></div>
    </div>
  );
}
