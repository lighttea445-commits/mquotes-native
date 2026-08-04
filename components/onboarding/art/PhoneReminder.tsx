import React from 'react';
import Svg, { G, Path, Rect, Circle, Text as SvgText } from 'react-native-svg';
import { strokeFor } from '../../art/primitives';
import { Bell } from '../../art/Bell';

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

      {/* Bell, overlapping the lower left of the handset — same mark used on
          the Reminders tile and the onboarding notification screen. */}
      <G transform="rotate(-80, 62, 128) translate(5.5, 71.5)">
        <Bell size={113} color={color} />
      </G>
    </Svg>
  );
}
