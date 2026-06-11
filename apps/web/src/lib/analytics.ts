import { analytics } from './firebase';

// Helper to safely log events only in the browser when analytics is ready
export const logCustomEvent = async (eventName: string, eventParams?: Record<string, any>) => {
  if (typeof window === 'undefined') return;
  
  if (analytics) {
    try {
      const { logEvent } = await import('firebase/analytics');
      logEvent(analytics, eventName, eventParams);
    } catch (e) {
      console.warn('Failed to log event', e);
    }
  }
};
