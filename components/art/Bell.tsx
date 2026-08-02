import React from 'react';
import Svg, { G, Path, Circle } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB = 200;
const W = STROKE * 1.6;

/**
 * Tilted bell — the art for the Reminders tile.
 *
 * The same bell as `onboarding/art/BellMoon`, without the crescent, recentred
 * so it sits square in a tile rather than beside a moon.
 */
export function Bell({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <G transform="rotate(12, 100, 104)">
        {/* Handle */}
        <Path
          d="M 93 47 C 92 36, 110 36, 109 47"
          stroke={color} strokeWidth={W} strokeLinecap="round" fill="none"
        />
        {/* Body — dome flaring to the rim */}
        <Path
          d="M 54 137 C 54 100, 65 70, 101 46 C 137 70, 148 100, 148 137"
          stroke={color} strokeWidth={W} strokeLinecap="round" fill="none"
        />
        {/* Rim */}
        <Path
          d="M 45 137 C 76 147, 126 147, 157 137"
          stroke={color} strokeWidth={W} strokeLinecap="round" fill="none"
        />
        {/* Band above the rim, echoing its curve */}
        <Path
          d="M 52 121 C 81 131, 121 131, 150 121"
          stroke={color} strokeWidth={STROKE} strokeLinecap="round" fill="none" opacity={0.7}
        />
        {/* Clapper */}
        <Circle cx={101} cy={154} r={9} stroke={color} strokeWidth={W} fill="none" />
      </G>

      <Sparkle x={166} y={54} r={7} color={color} />
      <Sparkle x={36} y={76} r={4.5} color={color} opacity={0.75} />
      <Sparkle x={176} y={116} r={4} color={color} opacity={0.65} />
    </Svg>
  );
}
