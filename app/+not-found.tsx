import React from 'react';
import { View, Text, Pressable, StyleSheet } from 'react-native';
import { useRouter, usePathname } from 'expo-router';

/**
 * Fallback route for unmatched paths.
 *
 * Expo Router injects an internal fallback when this file is absent. Providing
 * it explicitly means an unmatched path lands somewhere real and visible rather
 * than on generated internals.
 *
 * Deliberately self-contained — no theme, store, or context imports. This is
 * the screen that has to render when something else has already gone wrong, so
 * it must not depend on anything that could itself fail.
 */
export default function NotFoundScreen() {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <View style={styles.root}>
      <Text style={styles.title}>Page not found</Text>
      <Text style={styles.path}>{pathname || '(no path)'}</Text>
      <Pressable style={styles.button} onPress={() => router.replace('/')}>
        <Text style={styles.buttonLabel}>Go home</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: '#0D0D0D',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  title: {
    color: '#F0ECE4',
    fontSize: 22,
    fontWeight: '700',
    marginBottom: 8,
  },
  path: {
    color: '#8A8078',
    fontSize: 13,
    marginBottom: 28,
    textAlign: 'center',
  },
  button: {
    backgroundColor: '#B8975A',
    borderRadius: 99,
    paddingVertical: 16,
    paddingHorizontal: 40,
  },
  buttonLabel: {
    color: '#1A1208',
    fontSize: 16,
    fontWeight: '600',
  },
});
