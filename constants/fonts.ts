/**
 * Type system — three roles, one place.
 *
 *   display  Peachi          affirmations, quote text, headings, the wordmark
 *   ui       Averta          functional interface: buttons, labels, controls
 *   body     Inter           formal body and legal copy
 *
 * Themes expose these as `quoteFontFamily` / `uiFontFamily` / `bodyFontFamily`.
 * Nothing outside this file should name a font directly.
 *
 * React Native does no synthetic bolding on custom families — `fontWeight` is
 * inert on Peachi and Averta. A weight change means naming a different family.
 */

/** Peachi — display. Six OTFs in assets/fonts, registered in app/_layout.tsx. */
export const PEACHI = {
  thin: 'Peachi-Thin',
  light: 'Peachi-Light',
  regular: 'Peachi-Regular',
  medium: 'Peachi-Medium',
  bold: 'Peachi-Bold',
  black: 'Peachi-Black',
} as const;

/**
 * Averta — functional UI.
 *
 * Commercial licence, so the files can't be fetched the way the Google faces
 * were. To switch the UI role over:
 *
 *   1. Put the weights in assets/fonts as Averta-Regular / -Semibold / -Bold
 *      (.otf or .ttf — match the names below to whatever you have)
 *   2. Register them in the useFonts call in app/_layout.tsx, same as Peachi
 *   3. Flip AVERTA_READY to true
 *
 * Until then the UI role falls back to Inter, which is the nearest thing
 * already installed — both are geometric-humanist sans faces.
 */
export const AVERTA = {
  regular: 'Averta-Regular',
  medium: 'Averta-Semibold',
  bold: 'Averta-Bold',
} as const;

export const AVERTA_READY = false;

/**
 * Inter — body and legal, and the UI stand-in until Averta lands.
 *
 * The spec allows DM Sans here instead. Inter is used because it's already
 * installed; DM Sans would mean adding @expo-google-fonts/dm-sans and
 * registering it. Swap INTER for a DM_SANS block below to change it.
 */
const INTER = {
  regular: 'Inter_400Regular',
  medium: 'Inter_500Medium',
  semibold: 'Inter_600SemiBold',
  bold: 'Inter_700Bold',
} as const;

const UI_FALLBACK = {
  regular: INTER.regular,
  medium: INTER.medium,
  bold: INTER.semibold,
} as const;

export const FONTS = {
  display: {
    regular: PEACHI.regular,
    medium: PEACHI.medium,
    bold: PEACHI.bold,
  },
  ui: AVERTA_READY ? AVERTA : UI_FALLBACK,
  body: {
    regular: INTER.regular,
    medium: INTER.medium,
    bold: INTER.semibold,
  },
} as const;
