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
}

export const useDeepLinkStore = create<DeepLinkStore>()((set) => ({
  pendingQuote: null,
  setPendingQuote: (quote) => set({ pendingQuote: quote }),
  clearPendingQuote: () => set({ pendingQuote: null }),
}));
