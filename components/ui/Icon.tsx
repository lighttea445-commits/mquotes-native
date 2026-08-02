import React, { useMemo } from 'react';
import { StyleProp, ViewStyle } from 'react-native';
import { SvgXml } from 'react-native-svg';
import { ICON_ALIAS, ICON_BODIES, ICON_ROTATE, ICON_SCALE, IconName } from '../../constants/icons';

export type { IconName };

interface IconProps {
  name: IconName;
  /** Glyph box in px. Tabler is drawn on a 24 grid, so stroke scales with this. */
  size?: number;
  color: string;
  /** Stroke weight on the 24 grid. Defaults to 2 — Tabler's native weight. */
  strokeWidth?: number;
  style?: StyleProp<ViewStyle>;
}

/**
 * The single icon primitive. Names are the MaterialCommunityIcons vocabulary the
 * app already speaks; `constants/icons.ts` maps each one onto a real glyph, so
 * changing icon sets never touches a call site.
 */
export function Icon({ name, size = 24, color, strokeWidth, style }: IconProps) {
  const xml = useMemo(() => {
    const glyph = ICON_ALIAS[name];
    let body = ICON_BODIES[glyph];
    if (!body) {
      // Reachable only through an `as any` call site. Fall back to a visible
      // marker rather than an empty box, so it gets caught in review.
      if (__DEV__) console.warn(`[Icon] unmapped name "${name}" — add it to scripts/generate-icons.mjs`);
      body = ICON_BODIES[ICON_ALIAS['information-outline']];
    }
    if (strokeWidth != null) {
      body = body.replace(/stroke-width="2"/g, `stroke-width="${strokeWidth}"`);
    }
    const rotate = ICON_ROTATE[name];
    if (rotate) body = `<g transform="rotate(${rotate} 12 12)">${body}</g>`;

    const scale = ICON_SCALE[glyph];
    if (scale) {
      // Scale about the centre of the 24 grid so the glyph stays aligned.
      body = `<g transform="translate(12 12) scale(${scale}) translate(-12 -12)">${body}</g>`;
    }
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">${body}</svg>`;
  }, [name, strokeWidth]);

  return <SvgXml xml={xml} width={size} height={size} color={color} style={style} />;
}
