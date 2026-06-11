import { View, Text, TextInput, TouchableOpacity, StyleSheet, KeyboardAvoidingView, Platform, ActivityIndicator } from 'react-native';
import { BlurView } from 'expo-blur';
import { useState } from 'react';
import { auth, db } from '../../lib/firebase';
import { signInWithPhoneNumber, RecaptchaVerifier, ConfirmationResult } from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { useRouter } from 'expo-router';
import { generateKeyPair } from '@securevibechat/shared';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { FirebaseRecaptchaVerifierModal } from 'expo-firebase-recaptcha';

// Note: In a real Expo app, to use Firebase Phone Auth with the web SDK, 
// you typically need a polyfill for RecaptchaVerifier or use expo-firebase-recaptcha.
// We'll scaffold the basic logic here.

export default function LoginScreen() {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState('');
  const [confirmationResult, setConfirmationResult] = useState<ConfirmationResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();

  // For a real app, you'd use a ref to the RecaptchaVerifier Modal
  // const recaptchaVerifier = useRef(null);

  const handleSendCode = async () => {
    if (!phoneNumber) return;
    setLoading(true);
    setError('');
    try {
      // Stub: Web SDK's signInWithPhoneNumber expects a RecaptchaVerifier instance.
      // const appVerifier = new RecaptchaVerifier(auth, recaptchaContainerId, { size: 'invisible' });
      // const confirmation = await signInWithPhoneNumber(auth, phoneNumber, appVerifier);
      // setConfirmationResult(confirmation);
      
      // For development, we might mock this or use an emulator
      console.log('Sending OTP to', phoneNumber);
      setError('Phone auth on Expo requires expo-firebase-recaptcha. Implement native recaptcha here.');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyCode = async () => {
    if (!otp || !confirmationResult) return;
    setLoading(true);
    setError('');
    try {
      const userCredential = await confirmationResult.confirm(otp);
      const user = userCredential.user;
      
      // Check if user has profile
      const profileSnap = await getDoc(doc(db, 'users', user.uid));
      
      if (!profileSnap.exists()) {
        // We should redirect to a profile setup screen here, but we'll mock creating one for MVP
        const deviceId = Math.random().toString(36).substring(7);
        const keyPair = generateKeyPair();
        
        await AsyncStorage.setItem(`privateKey_${user.uid}`, keyPair.privateKey);
        await AsyncStorage.setItem(`deviceId_${user.uid}`, deviceId);

        await setDoc(doc(db, 'users', user.uid), {
          uid: user.uid,
          phoneNumber: user.phoneNumber,
          displayName: 'New User',
          createdAt: new Date(),
          updatedAt: new Date(),
          isOnline: true,
          lastSeen: new Date()
        });
        
        await setDoc(doc(db, `users/${user.uid}/devices/${deviceId}`), {
          deviceId,
          publicKey: keyPair.publicKey,
          deviceName: 'Mobile App',
          lastSeen: new Date()
        });
      }
      // router handles redirection via _layout
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={styles.container} 
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <View style={styles.content}>
        <BlurView intensity={80} tint="light" style={styles.card}>
          <Text style={styles.title}>Welcome to SecureVibeChat</Text>
          <Text style={styles.subtitle}>End-to-end encrypted messaging.</Text>

          {error ? <Text style={styles.errorText}>{error}</Text> : null}

          {!confirmationResult ? (
            <>
              <TextInput
                style={styles.input}
                placeholder="Phone Number (e.g. +1234567890)"
                placeholderTextColor="#8e8e93"
                value={phoneNumber}
                onChangeText={setPhoneNumber}
                keyboardType="phone-pad"
              />
              <TouchableOpacity style={styles.button} onPress={handleSendCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
              </TouchableOpacity>
            </>
          ) : (
            <>
              <TextInput
                style={styles.input}
                placeholder="Verification Code"
                placeholderTextColor="#8e8e93"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
              />
              <TouchableOpacity style={styles.button} onPress={handleVerifyCode} disabled={loading}>
                {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
              </TouchableOpacity>
            </>
          )}
        </BlurView>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 20,
  },
  content: {
    width: '100%',
    maxWidth: 400,
    alignSelf: 'center',
  },
  card: {
    padding: 24,
    borderRadius: 24,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.4)',
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#1c1c1e',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 15,
    color: '#3a3a3c',
    textAlign: 'center',
    marginBottom: 24,
  },
  input: {
    backgroundColor: 'rgba(255,255,255,0.5)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.7)',
    borderRadius: 16,
    padding: 16,
    fontSize: 16,
    marginBottom: 16,
  },
  button: {
    backgroundColor: '#0A84FF',
    borderRadius: 16,
    padding: 16,
    alignItems: 'center',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  errorText: {
    color: '#FF3B30',
    marginBottom: 16,
    textAlign: 'center',
  }
});
