import React from 'react';
import Svg, { G, Path, Circle, Line } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB_W = 240;
const VB_H = 190;

const SUN_X = 120;
const SUN_Y = 74;
const SUN_R = 26;

/** Rays across the upper arc only — the book occupies the lower half. */
const RAYS = Array.from({ length: 11 }, (_, i) => {
  const deg = 200 + i * 14; // 200°..340°, sweeping over the top
  const rad = (deg * Math.PI) / 180;
  const inner = SUN_R + 9;
  const outer = SUN_R + 21;
  return {
    x1: SUN_X + Math.cos(rad) * inner,
    y1: SUN_Y + Math.sin(rad) * inner,
    x2: SUN_X + Math.cos(rad) * outer,
    y2: SUN_Y + Math.sin(rad) * outer,
  };
});

/**
 * Splash hero: a sun rising over an open book.
 *
 * The sun deliberately reuses the SunIcon motif from the streak card, so the
 * first screen and the habit surface share a mark. Drawn as one composition at
 * a single stroke weight — the point is that it reads as an illustration
 * rather than as scaled-up icons sitting next to each other.
 */
export function SplashArt({ size = 260, color }: Props) {
  const h = size * (VB_H / VB_W);

  return (
    <Svg width={size} height={h} viewBox={`0 0 ${VB_W} ${VB_H}`}>
      {/* Sun */}
      <G>
        {RAYS.map((r, i) => (
          <Line
            key={i}
            x1={r.x1}
            y1={r.y1}
            x2={r.x2}
            y2={r.y2}
            stroke={color}
            strokeWidth={STROKE}
            strokeLinecap="round"
            opacity={0.9}
          />
        ))}
        <Circle
          cx={SUN_X}
          cy={SUN_Y}
          r={SUN_R}
          stroke={color}
          strokeWidth={STROKE * 1.4}
          fill="none"
        />
      </G>

      {/* Open book */}
      <G>
        {/* Page tops, meeting at the spine */}
        <Path
          d="M 120 130 C 96 117, 60 112, 26 119"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 120 130 C 144 117, 180 112, 214 119"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Outer edges */}
        <Path
          d="M 26 119 L 26 146"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 214 119 L 214 146"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Page bottoms */}
        <Path
          d="M 26 146 C 60 139, 96 144, 120 158"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 214 146 C 180 139, 144 144, 120 158"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Spine */}
        <Path
          d="M 120 130 L 120 158"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        {/* Leaf depth — a second page under each side */}
        <Path
          d="M 34 126 C 64 121, 95 126, 118 138"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          opacity={0.45}
        />
        <Path
          d="M 206 126 C 176 121, 145 126, 122 138"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinecap="round"
          fill="none"
          opacity={0.45}
        />
      </G>

      <Sparkle x={52} y={44} r={7} color={color} />
      <Sparkle x={198} y={34} r={5.5} color={color} opacity={0.85} />
      <Sparkle x={30} y={82} r={4.5} color={color} opacity={0.7} />
      <Sparkle x={214} y={78} r={4} color={color} opacity={0.7} />
      <Sparkle x={168} y={172} r={4.5} color={color} opacity={0.6} />
      <Sparkle x={62} y={176} r={4} color={color} opacity={0.55} />
    </Svg>
  );
}
