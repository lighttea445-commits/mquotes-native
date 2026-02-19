import React from 'react';
import { Tabs } from 'expo-router';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../../hooks/useTheme';

function TabIcon({ name, focused, color }: { name: string; focused: boolean; color: string }) {
  const icons: Record<string, string> = {
    index: '✦',
    favorites: '♥',
    profile: '◉',
  };
  return (
    <Text style={{ fontSize: focused ? 20 : 16, color, opacity: focused ? 1 : 0.5 }}>
      {icons[name] ?? '●'}
    </Text>
  );
}

export default function TabsLayout() {
  const theme = useTheme();
  const insets = useSafeAreaInsets();

  return (
    <Tabs
      screenOptions={{
        headerShown: false,
        tabBarStyle: {
          backgroundColor: theme.navBackground,
          borderTopColor: theme.border,
          borderTopWidth: StyleSheet.hairlineWidth,
          height: 56 + insets.bottom,
          paddingBottom: insets.bottom,
        },
        tabBarActiveTintColor: theme.text,
        tabBarInactiveTintColor: theme.textMuted,
        tabBarShowLabel: false,
      }}
    >
      <Tabs.Screen
        name="index"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="index" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="favorites"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="favorites" focused={focused} color={color} />
          ),
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          tabBarIcon: ({ focused, color }) => (
            <TabIcon name="profile" focused={focused} color={color} />
          ),
        }}
      />
    </Tabs>
  );
}

const styles = StyleSheet.create({});
