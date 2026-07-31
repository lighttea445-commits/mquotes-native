import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB = 200;

/**
 * Tilted bell with a crescent moon and scattered sparkles — the art for the
 * notification permission screen.
 *
 * Replaces a 112px `bell-outline` glyph sitting next to a 30px `weather-night`
 * glyph: two unrelated stroke weights overlapping by coincidence. Drawn as one
 * composition so the weights match and the elements relate.
 */
export function BellMoon({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Crescent moon, upper left */}
      <Path
        d="M 64 34
           A 21 21 0 1 0 88 63
           A 16 16 0 1 1 64 34 Z"
        stroke={color}
        strokeWidth={STROKE * 1.5}
        strokeLinejoin="round"
        fill="none"
      />

      <G transform="rotate(14, 118, 116)">
        {/* Handle */}
        <Path
          d="M 111 55 C 110 45, 126 45, 125 55"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Body — dome flaring to the rim */}
        <Path
          d="M 76 143
             C 76 108, 86 80, 118 56
             C 150 80, 160 108, 160 143"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Rim */}
        <Path
          d="M 68 143 C 96 152, 140 152, 168 143"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Band above the rim, echoing the rim's curve */}
        <Path
          d="M 74 128 C 100 137, 136 137, 162 128"
          stroke={color}
          strokeWidth={STROKE * 1.2}
          strokeLinecap="round"
          fill="none"
          opacity={0.75}
        />
        {/* Clapper */}
        <Circle
          cx={118}
          cy={158}
          r={8}
          stroke={color}
          strokeWidth={STROKE * 1.5}
          fill="none"
        />
      </G>

      <Sparkle x={122} y={26} r={7} color={color} />
      <Sparkle x={96} y={48} r={4} color={color} opacity={0.8} />
      <Sparkle x={172} y={62} r={5.5} color={color} opacity={0.9} />
      <Sparkle x={44} y={92} r={4} color={color} opacity={0.7} />
      <Sparkle x={182} y={110} r={4} color={color} opacity={0.7} />
    </Svg>
  );
}
