import React from 'react';
import Svg, { G, Path, Rect, Circle } from 'react-native-svg';
import { strokeFor } from './primitives';

interface Props {
  size?: number;
  color: string;
  /**
   * Surface the art sits on. Each card is filled with it so the card in front
   * hides the ones behind. Without a fill these outlines are see-through and
   * every card's lines run straight through its neighbours.
   */
  bg?: string;
}

const VB = 200;

/**
 * Three scattered quote cards — the art for the Topics tile.
 *
 * Drawn back to front. The front card overlaps both others and occludes them,
 * so the fan reads as a stack rather than as crossed outlines.
 */
export function Cards({ size = 200, color, bg = 'none' }: Props) {
  const W = strokeFor(size, VB);
  const STROKE = strokeFor(size, VB, true);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back card, tilted right and standing tallest */}
      <G transform="rotate(12, 128, 88)">
        <Rect
          x={100} y={38} width={62} height={98} rx={12}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Circle cx={118} cy={58} r={7} stroke={color} strokeWidth={STROKE} fill="none" />
        <Path
          d="M 112 80 H 150 M 112 94 H 144 M 112 108 H 150"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Left card, tilted the other way */}
      <G transform="rotate(-16, 66, 118)">
        <Rect
          x={30} y={86} width={78} height={58} rx={11}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Circle cx={48} cy={106} r={6} stroke={color} strokeWidth={STROKE} fill="none" />
        <Path
          d="M 64 100 V 118 M 74 100 V 118 M 84 100 V 118"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Front card, overlapping both */}
      <G transform="rotate(-4, 108, 140)">
        <Rect
          x={68} y={112} width={84} height={56} rx={11}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Path
          d="M 82 130 H 124 M 82 144 H 112"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
        <Circle cx={136} cy={144} r={7} stroke={color} strokeWidth={STROKE} fill="none" />
      </G>
    </Svg>
  );
}
