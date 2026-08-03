import React from 'react';
import Svg, { G, Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { Sparkle } from './primitives';
import { strokeFor } from '../../art/primitives';

interface Props {
  size?: number;
  color: string;
  /** Rendered on the phone screen. */
  time?: string;
  fontFamily?: string;
}

const VB = 200;

/**
 * Phone showing a lock-screen time with a bell ringing in front of it — the
 * art for the trial-reminder screen.
 *
 * The reference draws a hand holding the phone. It's dropped here: a hand is
 * the hardest thing in this set to draw convincingly at single-weight, and a
 * bad one costs more than the missing detail is worth.
 */
export function PhoneReminder({ size = 200, color, time = '11:11', fontFamily }: Props) {
  const STROKE = strokeFor(size, VB) / 1.5; // paths below multiply by 1.4–1.5
  return (
    <Svg width={size} height={size} viewBox={`0 0 ${VB} ${VB}`}>
      <G transform="rotate(-6, 112, 100)">
        {/* Handset */}
        <Rect
          x={72}
          y={30}
          width={82}
          height={148}
          rx={16}
          stroke={color}
          strokeWidth={STROKE * 1.5}
          fill="none"
        />
        {/* Camera */}
        <Circle cx={113} cy={44} r={3.5} stroke={color} strokeWidth={STROKE} fill="none" />
        {/* Time */}
        <SvgText
          x={113}
          y={92}
          textAnchor="middle"
          fontSize={30}
          fill={color}
          fontFamily={fontFamily}
        >
          {time}
        </SvgText>
        {/* Two notification slugs below the clock */}
        <Rect
          x={86}
          y={112}
          width={54}
          height={9}
          rx={4.5}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          opacity={0.55}
        />
        <Rect
          x={86}
          y={128}
          width={54}
          height={9}
          rx={4.5}
          stroke={color}
          strokeWidth={STROKE}
          fill="none"
          opacity={0.35}
        />
        {/* Home indicator */}
        <Path
          d="M 99 166 L 127 166"
          stroke={color}
          strokeWidth={STROKE * 1.4}
          strokeLinecap="round"
          opacity={0.6}
        />
      </G>

      {/* Bell, overlapping the lower left of the handset */}
      <G transform="rotate(-20, 62, 128)">
        <Path
          d="M 55 92 C 54 85, 66 85, 65 92"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 34 146 C 34 122, 41 104, 60 92 C 79 104, 86 122, 86 146"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Path
          d="M 28 146 C 45 153, 75 153, 92 146"
          stroke={color}
          strokeWidth={STROKE * 1.5}
          strokeLinecap="round"
          fill="none"
        />
        <Circle cx={60} cy={158} r={6.5} stroke={color} strokeWidth={STROKE * 1.5} fill="none" />
      </G>

      <Sparkle x={38} y={58} r={6} color={color} />
      <Sparkle x={168} y={40} r={5} color={color} opacity={0.85} />
      <Sparkle x={178} y={128} r={6.5} color={color} opacity={0.9} />
      <Sparkle x={22} y={104} r={4} color={color} opacity={0.7} />
      <Sparkle x={152} y={176} r={4.5} color={color} opacity={0.7} />
    </Svg>
  );
}
