import { Stack } from 'expo-router';
import { useEffect, useState } from 'react';
import { View, StyleSheet, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Animated, { useSharedValue, useAnimatedStyle, withRepeat, withTiming, Easing } from 'react-native-reanimated';
import { onAuthStateChanged, User } from 'firebase/auth';
import { auth } from '../lib/firebase';
import { initEncryption } from '@securevibechat/shared';

const AnimatedLinearGradient = Animated.createAnimatedComponent(LinearGradient);

export default function RootLayout() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

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
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const animatedGradientStyle = useAnimatedStyle(() => {
    return {
      transform: [
        { translateX: bgX.value * -100 },
        { scale: 1.5 }
      ],
    };
  });

  if (loading) {
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
          headerTransparent: true,
          headerBlurEffect: 'light',
          headerStyle: { backgroundColor: 'transparent' },
          headerTitleStyle: { color: '#1c1c1e' },
          contentStyle: { backgroundColor: 'transparent' },
        }}
      >
        <Stack.Screen name="index" options={{ title: 'Chats' }} />
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
