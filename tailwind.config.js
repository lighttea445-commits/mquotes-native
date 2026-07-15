/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './app/**/*.{js,jsx,ts,tsx}',
    './components/**/*.{js,jsx,ts,tsx}',
  ],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      fontFamily: {
        'playfair': ['PlayfairDisplay_400Regular'],
        'playfair-bold': ['PlayfairDisplay_700Bold'],
        'playfair-italic': ['PlayfairDisplay_400Regular_Italic'],
        'inter': ['Inter_400Regular'],
        'inter-medium': ['Inter_500Medium'],
        'inter-semibold': ['Inter_600SemiBold'],
        'inter-bold': ['Inter_700Bold'],
      },
      colors: {
        accent: {
          DEFAULT: '#7C3AED',
          light: '#A78BFA',
          dark: '#5B21B6',
        },
      },
    },
  },
  plugins: [],
};
