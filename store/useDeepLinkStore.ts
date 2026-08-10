/**
 * Ephemeral (non-persisted) store for deep-link payloads.
 * Set by _layout.tsx when a notification or widget tap carries a specific quote.
 * Consumed (and cleared) by QuoteCard when pendingQuote changes.
 */
import { create } from 'zustand';

export interface PendingQuote {
  id: string;
  text: string;
  author: string;
}

interface DeepLinkStore {
  pendingQuote: PendingQuote | null;
  setPendingQuote: (quote: PendingQuote) => void;
  clearPendingQuote: () => void;
  /**
   * A sheet the deep link wants opened once the app is back on the home
   * screen. Set by the iOS widget's setup tap, which carries no quote to show:
   * the widget resolved no config, so the only useful thing to do is put the
   * user in front of the Widgets screen. Consumed and cleared by app/index.tsx.
   */
  pendingSheet: 'widgets' | null;
  setPendingSheet: (sheet: 'widgets') => void;
  clearPendingSheet: () => void;
}

export const useDeepLinkStore = create<DeepLinkStore>()((set) => ({
  pendingQuote: null,
  setPendingQuote: (quote) => set({ pendingQuote: quote }),
  clearPendingQuote: () => set({ pendingQuote: null }),
  pendingSheet: null,
  setPendingSheet: (sheet) => set({ pendingSheet: sheet }),
  clearPendingSheet: () => set({ pendingSheet: null }),
}));
