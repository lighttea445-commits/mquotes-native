import { create } from 'zustand';

interface ShareState {
  quote: string;
  author: string;
  watermarkRemoved: boolean;
  setQuote: (quote: string, author: string) => void;
  setWatermarkRemoved: (v: boolean) => void;
  reset: () => void;
}

export const useShareStore = create<ShareState>((set) => ({
  quote: '',
  author: '',
  watermarkRemoved: false,
  setQuote: (quote, author) => set({ quote, author }),
  setWatermarkRemoved: (v) => set({ watermarkRemoved: v }),
  reset: () => set({ quote: '', author: '', watermarkRemoved: false }),
}));
