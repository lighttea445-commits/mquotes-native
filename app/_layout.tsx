import '../global.css';
import React from 'react';
import { Stack } from 'expo-router';
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
import { View, ActivityIndicator } from 'react-native';
import { useAppStore } from '../store/useAppStore';
import { useTheme } from '../hooks/useTheme';

function RootLayoutInner() {
  const theme = useTheme();
  const onboardingComplete = useAppStore((s) => s.onboardingComplete);

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
