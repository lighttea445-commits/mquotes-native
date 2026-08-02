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
 * Tilted phone carrying two home-screen widgets — the art for the Widgets tile.
 *
 * A wide widget above a small square one, matching the two sizes the app
 * actually ships, with text rules inside the wide one so it reads as a quote.
 */
export function WidgetPhone({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <G transform="rotate(-11, 100, 100)">
        {/* Handset */}
        <Rect x={44} y={22} width={112} height={172} rx={20} stroke={color} strokeWidth={W} fill="none" />
        {/* Side buttons */}
        <Path
          d="M 41 68 V 88 M 41 98 V 118"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.7}
        />

        {/* Wide widget */}
        <Rect x={60} y={44} width={80} height={50} rx={11} stroke={color} strokeWidth={W} fill="none" />
        <Path
          d="M 72 64 H 128 M 72 78 H 110"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.75}
        />

        {/* Small square widget */}
        <Rect x={60} y={106} width={46} height={46} rx={11} stroke={color} strokeWidth={W} fill="none" />
        <Path
          d="M 71 124 H 95 M 71 136 H 87"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.7}
        />
      </G>

      <Sparkle x={172} y={40} r={7} color={color} />
      <Sparkle x={26} y={140} r={4.5} color={color} opacity={0.7} />
      <Sparkle x={180} y={162} r={4} color={color} opacity={0.6} />
    </Svg>
  );
}
