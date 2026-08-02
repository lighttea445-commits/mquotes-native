import React from 'react';
import Svg, { G, Path, Rect, Circle } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB = 200;
const W = STROKE * 1.6;

/**
 * Three scattered quote cards — the art for the Topics tile.
 *
 * Each card carries a small mark and a couple of text rules, so the fan reads
 * as "a stack of things to read" rather than three empty rectangles.
 */
export function Cards({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back card, tilted right and standing tallest */}
      <G transform="rotate(12, 128, 88)">
        <Rect
          x={100} y={38} width={62} height={98} rx={12}
          stroke={color} strokeWidth={W} fill="none"
        />
        <Circle cx={118} cy={58} r={7} stroke={color} strokeWidth={STROKE} fill="none" opacity={0.8} />
        <Path
          d="M 112 80 H 150 M 112 94 H 144 M 112 108 H 150"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.7}
        />
      </G>

      {/* Left card, tilted the other way */}
      <G transform="rotate(-16, 66, 118)">
        <Rect
          x={30} y={86} width={78} height={58} rx={11}
          stroke={color} strokeWidth={W} fill="none"
        />
        <Circle cx={48} cy={106} r={6} stroke={color} strokeWidth={STROKE} fill="none" opacity={0.8} />
        <Path
          d="M 64 100 V 118 M 74 100 V 118 M 84 100 V 118"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.6}
        />
      </G>

      {/* Front card, overlapping both */}
      <G transform="rotate(-4, 108, 140)">
        <Rect
          x={68} y={112} width={84} height={56} rx={11}
          stroke={color} strokeWidth={W} fill="none"
        />
        <Path
          d="M 82 130 H 124 M 82 144 H 112"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.7}
        />
        <Circle cx={136} cy={144} r={7} stroke={color} strokeWidth={STROKE} fill="none" opacity={0.8} />
      </G>

      <Sparkle x={72} y={40} r={7} color={color} />
      <Sparkle x={44} y={64} r={4} color={color} opacity={0.75} />
      <Sparkle x={176} y={128} r={4.5} color={color} opacity={0.7} />
    </Svg>
  );
}
