/**
 * Peachi — the app's text face.
 *
 * Six OTF weights live in assets/fonts and are registered under these exact
 * names in app/_layout.tsx. React Native has no synthetic bolding on custom
 * families: `fontWeight` is ignored, so a weight change means naming a
 * different family here.
 */
export const PEACHI = {
  thin: 'Peachi-Thin',
  light: 'Peachi-Light',
  regular: 'Peachi-Regular',
  medium: 'Peachi-Medium',
  bold: 'Peachi-Bold',
  black: 'Peachi-Black',
} as const;

/**
 * Maps the Inter weights the app was built against onto Peachi's.
 *
 * Peachi has no SemiBold, so 600 resolves to Bold — the nearer of the two, and
 * the one that keeps emphasis reading as emphasis.
 */
export const PEACHI_FOR_INTER: Record<string, string> = {
  Inter_400Regular: PEACHI.regular,
  Inter_500Medium: PEACHI.medium,
  Inter_600SemiBold: PEACHI.bold,
  Inter_700Bold: PEACHI.bold,
};
