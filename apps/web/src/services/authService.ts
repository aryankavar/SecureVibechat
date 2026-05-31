import { auth, db } from '../lib/firebase';
import { 
  RecaptchaVerifier, 
  signInWithPhoneNumber, 
  ConfirmationResult,
  signOut as firebaseSignOut
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';

declare global {
  interface Window {
    recaptchaVerifier?: RecaptchaVerifier;
    confirmationResult?: ConfirmationResult;
  }
}

export const setupRecaptcha = (containerId: string) => {
  if (!window.recaptchaVerifier) {
    window.recaptchaVerifier = new RecaptchaVerifier(auth, containerId, {
      size: 'invisible',
    });
  }
};

export const clearRecaptcha = () => {
  if (window.recaptchaVerifier) {
    window.recaptchaVerifier.clear();
    window.recaptchaVerifier = undefined;
  }
};

export const sendOTP = async (phoneNumber: string): Promise<void> => {
  try {
    const appVerifier = window.recaptchaVerifier;
    if (!appVerifier) throw new Error('Recaptcha not initialized');
    const confirmationResult = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
    window.confirmationResult = confirmationResult;
  } catch (error) {
    console.error('Error sending OTP:', error);
    throw error;
  }
};

export const verifyOTP = async (otp: string): Promise<void> => {
  try {
    if (!window.confirmationResult) throw new Error('No confirmation result found');
    const result = await window.confirmationResult.confirm(otp);
    // User is signed in. The onAuthStateChanged listener will pick this up.
    
    // Check if profile exists, if not, we'll need to create one. 
    // This logic can be handled in a profile setup screen.
  } catch (error) {
    console.error('Error verifying OTP:', error);
    throw error;
  }
};

export const signOut = async () => {
  try {
    await firebaseSignOut(auth);
  } catch (error) {
    console.error('Error signing out:', error);
    throw error;
  }
};

export const checkUserProfile = async (uid: string) => {
  const docRef = doc(db, 'users', uid);
  const docSnap = await getDoc(docRef);
  return docSnap.exists() ? docSnap.data() : null;
};
