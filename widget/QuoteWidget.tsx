import React from 'react';
import { FlexWidget, TextWidget } from 'react-native-android-widget';
import type { WidgetInfo } from 'react-native-android-widget';
import type { WidgetInstanceConfig } from '../store/useWidgetStore';

export interface QuoteData {
  id?: string;
  text: string;
  author: string;
}

function adaptiveFontSize(
  widgetInfo: WidgetInfo,
  quoteLength: number,
  textSize: WidgetInstanceConfig['textSize'],
): number {
  const h = widgetInfo.height;
  let base: number;
  if (quoteLength > 200) base = Math.min(Math.max(h / 10, 10), 18);
  else if (quoteLength > 120) base = Math.min(Math.max(h / 8, 11), 20);
  else if (quoteLength > 60)  base = Math.min(Math.max(h / 7, 12), 24);
  else                         base = Math.min(Math.max(h / 6, 13), 28);

  const offset = textSize === 'small' ? -2 : textSize === 'large' ? 3 : 0;
  return Math.max(Math.round(base) + offset, 10);
}

interface Props {
  quote: QuoteData;
  config: Pick<WidgetInstanceConfig, 'showAuthor' | 'transparentBg' | 'textSize'>;
  widgetInfo: WidgetInfo;
}

export function QuoteWidget({ quote, config, widgetInfo }: Props) {
  const fontSize   = adaptiveFontSize(widgetInfo, quote.text.length, config.textSize);
  const authorSize = Math.max(Math.round(fontSize * 0.65), 10);

  // Adaptive padding: tight for short 1-cell widgets, standard for taller ones
  const padding    = Math.max(8, Math.min(16, Math.floor(widgetInfo.height / 7)));
  // Show fewer lines of quote text in short widgets so nothing overflows
  const maxLines   = widgetInfo.height < 80 ? 3 : widgetInfo.height < 140 ? 5 : 8;

  // Embed the quote content in the tap URI so the deep-link handler can display
  // the exact quote visible on-screen without reading AsyncStorage (which may
  // have already been overwritten by a concurrent background refresh).
  const tapUri = `quotable://?src=widget&widgetId=${widgetInfo.widgetId}&id=${encodeURIComponent(quote.id ?? '')}&text=${encodeURIComponent(quote.text)}&author=${encodeURIComponent(quote.author)}`;

  return (
    <FlexWidget
      style={{
        width: widgetInfo.width,
        height: widgetInfo.height,
        justifyContent: 'center',
        alignItems: 'center',
        padding,
        borderRadius: 16,
        backgroundColor: (config.transparentBg ? '#00000000' : '#080808') as `#${string}`,
      }}
      clickAction="OPEN_URI"
      clickActionData={{ uri: tapUri }}
    >
      <TextWidget
        text={`\u201c${quote.text}\u201d`}
        style={{
          color: '#FFFFFF',
          fontSize,
          fontFamily: 'serif',
          textAlign: 'center',
        }}
        maxLines={maxLines}
        clickAction="OPEN_URI"
        clickActionData={{ uri: tapUri }}
      />
      {config.showAuthor && quote.author ? (
        <TextWidget
          text={`\u2014 ${quote.author}`}
          style={{
            color: 'rgba(255, 255, 255, 0.65)' as const,
            fontSize: authorSize,
            fontFamily: 'sans-serif',
            textAlign: 'right',
            marginTop: 8,
          }}
          maxLines={1}
          clickAction="OPEN_URI"
          clickActionData={{ uri: tapUri }}
        />
      ) : null}
    </FlexWidget>
  );
}
