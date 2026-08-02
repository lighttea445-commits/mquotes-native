import React from 'react';
import Svg, { G, Path } from 'react-native-svg';
import { Sparkle, STROKE } from './primitives';

interface Props {
  size?: number;
  color: string;
}

const VB = 200;
const W = STROKE * 1.6;

/**
 * Faceted crystal cluster — the art on the "Unlock everything" banner.
 *
 * One tall central gem flanked by two smaller ones, each drawn as an outline
 * plus interior facet lines so the form reads at banner scale without any fill.
 */
export function Crystals({ size = 200, color }: Props) {
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      {/* Tall centre crystal */}
      <G>
        <Path
          d="M 96 30 L 128 54 L 132 128 L 100 168 L 66 128 L 68 54 Z"
          stroke={color}
          strokeWidth={W}
          strokeLinejoin="round"
          fill="none"
        />
        {/* Facets — the crown, then the two long body edges */}
        <Path
          d="M 68 54 L 100 74 L 128 54 M 100 74 L 100 168"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity={0.75}
        />
        <Path
          d="M 66 128 L 100 116 L 132 128"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          fill="none"
          opacity={0.55}
        />
      </G>

      {/* Small crystal, right */}
      <G>
        <Path
          d="M 150 74 L 172 92 L 170 142 L 148 160 L 138 132 L 140 92 Z"
          stroke={color}
          strokeWidth={W}
          strokeLinejoin="round"
          fill="none"
        />
        <Path
          d="M 140 92 L 156 106 L 172 92 M 156 106 L 148 160"
          stroke={color}
          strokeWidth={STROKE}
          strokeLinejoin="round"
          strokeLinecap="round"
          fill="none"
          opacity={0.7}
        />
      </G>

      {/* Shard, lower left — mostly cropped by the banner edge */}
      <Path
        d="M 40 104 L 56 118 L 54 158 L 36 168 L 28 132 Z"
        stroke={color}
        strokeWidth={W}
        strokeLinejoin="round"
        fill="none"
        opacity={0.85}
      />

      <Sparkle x={168} y={38} r={8} color={color} />
      <Sparkle x={140} y={22} r={4.5} color={color} opacity={0.8} />
      <Sparkle x={186} y={168} r={5} color={color} opacity={0.7} />
      <Sparkle x={40} y={62} r={4} color={color} opacity={0.6} />
    </Svg>
  );
}
