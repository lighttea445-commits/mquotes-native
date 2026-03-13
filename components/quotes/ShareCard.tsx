import React, { forwardRef } from 'react';
import { View, Text, StyleSheet, ImageBackground } from 'react-native';
import { Theme } from '../../constants/themes';

interface Props {
  quote: string;
  theme: Theme;
  size: number;
}

export const ShareCard = forwardRef<View, Props>(({ quote, theme, size }, ref) => {
  const fontSize = size * 0.065;
  const lineHeight = size * 0.092;
  const padding = size * 0.1;

  return (
    <View ref={ref} style={{ width: size, height: size }}>
      {theme.backgroundImage ? (
        <ImageBackground
          source={theme.backgroundImage}
          style={StyleSheet.absoluteFillObject}
          resizeMode="cover"
        />
      ) : (
        <View style={[StyleSheet.absoluteFillObject, { backgroundColor: theme.background }]} />
      )}
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding }}>
        <Text
          style={{
            color: theme.text,
            fontFamily: theme.quoteFontFamily,
            fontSize,
            lineHeight,
            textAlign: 'center',
          }}
        >
          {quote}
        </Text>
      </View>
    </View>
  );
});
