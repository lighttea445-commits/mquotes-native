import React from 'react';
import Svg, { G, Path, Rect } from 'react-native-svg';
import { strokeFor } from './primitives';

interface Props {
  size?: number;
  color: string;
  /**
   * Surface the art sits on. Each screen is filled with it so the one in front
   * hides the ones behind. Without a fill these outlines are see-through and
   * every screen's lines run straight through its neighbours.
   */
  bg?: string;
}

const VB = 200;

/**
 * Three overlapping phone screens — the art for the Themes tile.
 *
 * Drawn back to front. Depth comes from the front screen occluding the ones
 * behind it, which is why the screens no longer need to be faded: the earlier
 * version dropped the back two to 50% and 78% opacity to fake the same effect,
 * and translucent fills would let the hidden edges bleed through.
 */
export function PhoneStack({ size = 200, color, bg = 'none' }: Props) {
  const W = strokeFor(size, VB);
  const STROKE = strokeFor(size, VB, true);

  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Back screen */}
      <G transform="rotate(-14, 148, 100)">
        <Rect
          x={128} y={52} width={62} height={100} rx={13}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Path
          d="M 142 96 H 176 M 142 110 H 166"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Middle screen */}
      <G transform="rotate(-7, 108, 100)">
        <Rect
          x={82} y={44} width={68} height={112} rx={14}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Path
          d="M 96 94 H 136 M 96 108 H 124"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
      </G>

      {/* Front screen — upright, with a notch and a home indicator */}
      <G>
        <Rect
          x={30} y={38} width={74} height={124} rx={15}
          stroke={color} strokeWidth={W} fill={bg}
        />
        <Path d="M 56 48 H 78" stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
        <Path
          d="M 44 96 H 90 M 44 110 H 74"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none"
        />
        <Path d="M 56 150 H 78" stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" />
      </G>
    </Svg>
  );
}
