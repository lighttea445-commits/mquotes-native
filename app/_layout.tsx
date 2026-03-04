import '../global.css';
import React, { useEffect, useRef } from 'react';
import { Stack, useRouter } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import {
  useFonts,
  PlayfairDisplay_400Regular,
  PlayfairDisplay_700Bold,
  PlayfairDisplay_400Regular_Italic,
} from '@expo-google-fonts/playfair-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Allkin_400Regular } from '@expo-google-fonts/allkin';
import { View, ActivityIndicator, AppState } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';
import { WidgetBridge } from '../modules/widget-bridge';
import { initializeRevenueCat } from '../lib/revenuecat';

function RootLayoutInner() {
  const theme = useTheme();
  const router = useRouter();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);
  const appStateRef = useRef(AppState.currentState);
  // Prevents concurrent or duplicate navigation when AppState and mount both fire.
  const pendingNavRef = useRef(false);

  // Check if a widget was just placed and is waiting for configuration.
  // getPendingConfiguration is a one-shot read: it clears the pending config
  // immediately so a second call (e.g. from an AppState event) finds nothing.
  // The setTimeout ensures Expo Router's initial route has fully rendered before
  // we push a new screen — calling router.push() synchronously on layout mount
  // is unreliable because the navigator hasn't committed its initial state yet.
  const checkPendingWidget = async (delay = 0) => {
    if (pendingNavRef.current) return;
    const pending = await WidgetBridge.getPendingConfiguration();
    if (!pending) return;
    pendingNavRef.current = true;
    setTimeout(() => {
      pendingNavRef.current = false;
      router.push({
        pathname: '/widgets',
        params: {
          widgetId:    pending.widgetId.toString(),
          type:        pending.type,
          configuring: 'true',
        },
      });
    }, delay);
  };

  useEffect(() => {
    // Initialize RevenueCat on app launch
    initializeRevenueCat().catch((err) =>
      console.warn('RevenueCat initialization failed:', err)
    );

    // Initial mount: defer long enough for the first screen to settle.
    checkPendingWidget(400);

    // Re-check whenever the app returns to the foreground (widget just placed).
    const sub = AppState.addEventListener('change', (next) => {
      if (appStateRef.current.match(/inactive|background/) && next === 'active') {
        // Foreground resume: shorter delay is fine since the stack is already initialised.
        checkPendingWidget(150);
      }
      appStateRef.current = next;
    });

    return () => sub.remove();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <>
      <StatusBar style={theme.isDark ? 'light' : 'dark'} />
      <Stack screenOptions={{ headerShown: false }}>
        {!onboardingComplete ? (
          <Stack.Screen name="onboarding/index" options={{ animation: 'fade' }} />
        ) : (
          <Stack.Screen name="index" options={{ animation: 'fade' }} />
        )}
        <Stack.Screen name="categories" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="profile" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="mix/create" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="history" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="mood" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="themes" options={{ animation: 'slide_from_bottom', presentation: 'modal' }} />
        <Stack.Screen name="favorites" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="widgets" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="notifications" options={{ animation: 'slide_from_right' }} />
        <Stack.Screen name="subscriptions" options={{ animation: 'slide_from_right' }} />
      </Stack>
    </>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    PlayfairDisplay_400Regular,
    PlayfairDisplay_700Bold,
    PlayfairDisplay_400Regular_Italic,
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    Allkin_400Regular,
  });

  if (!fontsLoaded) {
    return (
      <View style={{ flex: 1, backgroundColor: '#0D0D0D', justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator color="#B8975A" />
      </View>
    );
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <RootLayoutInner />
    </GestureHandlerRootView>
  );
}
