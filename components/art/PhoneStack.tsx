import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB = 200;
const W = STROKE * 1.6;

/**
 * Three overlapping phone screens — the art for the Themes tile.
 *
 * The fan implies "swap between looks"; each screen carries two text rules
 * standing in for a quote, at decreasing opacity so depth reads without fills.
 */
export function PhoneStack({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back screen */}
      <G transform="rotate(-14, 148, 100)" opacity={0.5}>
        <Rect x={128} y={52} width={62} height={100} rx={13} stroke={color} strokeWidth={W} fill="none" />
        <Path
          d="M 142 96 H 176 M 142 110 H 166"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Middle screen */}
      <G transform="rotate(-7, 108, 100)" opacity={0.78}>
        <Rect x={82} y={44} width={68} height={112} rx={14} stroke={color} strokeWidth={W} fill="none" />
        <Path
          d="M 96 94 H 136 M 96 108 H 124"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Front screen — upright, with a notch and a home indicator */}
      <G>
        <Rect x={30} y={38} width={74} height={124} rx={15} stroke={color} strokeWidth={W} fill="none" />
        <Path d="M 56 48 H 78" stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.8} />
        <Path
          d="M 44 96 H 90 M 44 110 H 74"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.85}
        />
        <Path d="M 56 150 H 78" stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.6} />
      </G>

      <Sparkle x={158} y={34} r={7} color={color} />
      <Sparkle x={182} y={68} r={4} color={color} opacity={0.7} />
      <Sparkle x={20} y={170} r={4.5} color={color} opacity={0.65} />
    </Svg>
  );
}
