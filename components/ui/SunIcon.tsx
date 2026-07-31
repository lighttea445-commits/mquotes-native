import React from 'react';
import { FONTS } from '../../constants/fonts';
import Svg, { Circle, Line, Text as SvgText } from 'react-native-svg';

interface SunIconProps {
  day: number;
  size?: number;
  color?: string;
}

export function SunIcon({ day, size = 64, color = '#B8975A' }: SunIconProps) {
  const center = size / 2;
  const innerRadius = size * 0.28;
  const rayLength = size * 0.17;
  const rayStart = innerRadius + 4;

  const rays = Array.from({ length: 8 }, (_, i) => {
    const angle = (i * 45 * Math.PI) / 180;
    const x1 = center + Math.cos(angle) * rayStart;
    const y1 = center + Math.sin(angle) * rayStart;
    const x2 = center + Math.cos(angle) * (rayStart + rayLength);
    const y2 = center + Math.sin(angle) * (rayStart + rayLength);
    return { x1, y1, x2, y2 };
  });

  return (
    <Svg width={size} height={size}>
      {/* Rays */}
      {rays.map((ray, i) => (
        <Line
          key={i}
          x1={ray.x1}
          y1={ray.y1}
          x2={ray.x2}
          y2={ray.y2}
          stroke={color}
          strokeWidth={1.5}
          strokeLinecap="round"
        />
      ))}
      {/* Inner circle */}
      <Circle
        cx={center}
        cy={center}
        r={innerRadius}
        stroke={color}
        strokeWidth={1.5}
        fill="transparent"
      />
      {/* Day number */}
      <SvgText
        x={center}
        y={center + (size * 0.07)}
        textAnchor="middle"
        fontSize={size * 0.26}
        fontWeight="700"
        fill={color}
        fontFamily={FONTS.display.bold}
      >
        {day}
      </SvgText>
    </Svg>
  );
}
