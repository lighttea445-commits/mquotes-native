import React from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import Svg, { Rect, Circle, Path } from 'react-native-svg';
import { strokeFor } from '../../art/primitives';

interface Props {
  width?: number;
  height?: number;
  color: string;
  style?: StyleProp<ViewStyle>;
}

const VB_W = 200;
const VB_H = 320;

/**
 * Bare handset outline — camera dot and home indicator, no screen content.
 * Sits behind the widget/app-icon overlay on the widget-install screen, same
 * single-weight line-art idiom as the rest of `art/`.
 */
export function PhoneFrame({ width = VB_W, height = VB_H, color, style }: Props) {
  const STROKE = strokeFor(width, VB_W);
  return (
    <Svg width={width} height={height} viewBox={`0 0 ${VB_W} ${VB_H}`} style={style}>
      <Rect
        x={2}
        y={2}
        width={VB_W - 4}
        height={VB_H - 4}
        rx={32}
        stroke={color}
        strokeWidth={STROKE * 1.5}
        fill="none"
      />
      <Circle cx={VB_W / 2} cy={22} r={4} stroke={color} strokeWidth={STROKE} fill="none" />
      <Path
        d={`M ${VB_W / 2 - 18} ${VB_H - 14} L ${VB_W / 2 + 18} ${VB_H - 14}`}
        stroke={color}
        strokeWidth={STROKE * 1.4}
        strokeLinecap="round"
        opacity={0.6}
      />
    </Svg>
  );
}
