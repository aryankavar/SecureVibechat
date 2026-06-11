import 'react-native-get-random-values';
import { Stack, useRouter, useSegments } from 'expo-router';
import { useEffect } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { onAuthStateChanged } from 'firebase/auth';
import { auth, db } from '../lib/firebase';
import { initEncryption } from '@securevibechat/shared';
import { useAuthStore } from '../lib/stores/authStore';
import { doc, getDoc } from 'firebase/firestore';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RootLayout() {
  const { user, profile, isLoading, setUser, setProfile, setLoading } = useAuthStore();
  const router = useRouter();
  const segments = useSegments();

  // Mesh gradient animation values
  const bgX = useSharedValue(0);
  
  useEffect(() => {
    // Initialize libsodium wrappers (which points to react-native-libsodium via Babel)
    initEncryption().catch(console.error);

    // Setup Mesh Gradient Animation
    bgX.value = withRepeat(
      withTiming(1, { duration: 15000, easing: Easing.inOut(Easing.ease) }),
      -1,
      true
    );

    // Firebase Auth State
    const unsubscribe = onAuthStateChanged(auth, async (u) => {
      setUser(u);
      
      if (u) {
        // Fetch user profile
        try {
          const profileSnap = await getDoc(doc(db, 'users', u.uid));
          if (profileSnap.exists()) {
            setProfile(profileSnap.data() as any);
          } else {
            setProfile(null);
          }
        } catch (e) {
          console.error("Error fetching profile:", e);
        }
      } else {
        setProfile(null);
      }
      
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  // Auth Guard
  useEffect(() => {
    if (isLoading) return;

    const inAuthGroup = segments[0] === '(auth)';

    if (!user && !inAuthGroup) {
      // Redirect to login if not authenticated
      router.replace('/(auth)/login');
    } else if (user && inAuthGroup) {
      // Redirect to chat list if authenticated
      router.replace('/(app)/(tabs)');
    }
  }, [user, isLoading, segments]);

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: bgX.value * -100 },
        { scale: 1.5 }
      ],
    };
  });

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#0A84FF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <AnimatedLinearGradient
        colors={['#e0eafc', '#cfdef3', '#e6d3f8', '#c4e0e5']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={[StyleSheet.absoluteFill, animatedGradientStyle]}
      />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="(auth)/login" options={{ headerShown: false }} />
        <Stack.Screen name="(app)/(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="(app)/chat/[id]" options={{ headerShown: false }} />
      </Stack>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f4f6f8',
  }
});
