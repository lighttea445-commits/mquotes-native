import { create } from 'zustand';

interface ShareState {
  /** Quote id — needed so collections can dedupe and show what's already saved. */
  quoteId: string;
  quote: string;
  author: string;
  watermarkRemoved: boolean;
  setQuote: (quoteId: string, quote: string, author: string) => void;
  setWatermarkRemoved: (v: boolean) => void;
  reset: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  quoteId: '',
  quote: '',
  author: '',
  watermarkRemoved: false,
  setQuote: (quoteId, quote, author) => set({ quoteId, quote, author }),
  setWatermarkRemoved: (v) => set({ watermarkRemoved: v }),
  reset: () => set({ quoteId: '', quote: '', author: '', watermarkRemoved: false }),
}));
