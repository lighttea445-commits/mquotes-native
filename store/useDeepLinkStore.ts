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

/** Route to open via BottomSheet when the app launches from a deep link. */
export type PendingRoute = 'reflect' | null;

interface DeepLinkStore {
  pendingQuote: PendingQuote | null;
  pendingRoute: PendingRoute;
  setPendingQuote: (quote: PendingQuote) => void;
  clearPendingQuote: () => void;
  setPendingRoute: (route: PendingRoute) => void;
  clearPendingRoute: () => void;
}

export const useDeepLinkStore = create<DeepLinkStore>()((set) => ({
  pendingQuote: null,
  pendingRoute: null,
  setPendingQuote: (quote) => set({ pendingQuote: quote }),
  clearPendingQuote: () => set({ pendingQuote: null }),
  setPendingRoute: (route) => set({ pendingRoute: route }),
  clearPendingRoute: () => set({ pendingRoute: null }),
}));
