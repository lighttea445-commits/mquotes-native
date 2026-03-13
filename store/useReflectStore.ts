import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';
import { fetchRandomQuote, convertApiQuote } from '../lib/quotesApi';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface Reflection {
  id: string;
  dateKey: string;          // 'YYYY-MM-DD' local date — one per day
  quoteId: string;
  quoteText: string;
  quoteAuthor: string;
  quoteCategory: string;
  mood: string;
  reflectionText: string;
  createdAt: string;        // ISO timestamp
}

export interface DailyQuote {
  dateKey: string;
  quoteId: string;
  quoteText: string;
  quoteAuthor: string;
  quoteCategory: string;
}

export const MOODS = [
  { label: 'Great',    icon: 'emoticon-excited-outline' },
  { label: 'Good',     icon: 'emoticon-happy-outline' },
  { label: 'Neutral',  icon: 'emoticon-neutral-outline' },
  { label: 'Bad',      icon: 'emoticon-sad-outline' },
  { label: 'Terrible', icon: 'emoticon-cry-outline' },
  { label: 'Other',    icon: 'dots-horizontal-circle-outline' },
] as const;

export type MoodLabel = typeof MOODS[number]['label'];

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getTodayKey(): string {
  const d = new Date();
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

const MAX_REFLECTIONS = 365;

// ─── Store ────────────────────────────────────────────────────────────────────

interface ReflectState {
  reflections: Reflection[];
  dailyQuote: DailyQuote | null;

  refreshDailyQuote: () => Promise<void>;
  saveReflection: (mood: string, reflectionText: string) => void;
  hasReflectedToday: () => boolean;
  getTodaysReflection: () => Reflection | undefined;
  clearReflections: () => void;
}

export const useReflectStore = create<ReflectState>()(
  persist(
    (set, get) => ({
      reflections: [],
      dailyQuote: null,

      refreshDailyQuote: async () => {
        const today = getTodayKey();
        if (get().dailyQuote?.dateKey === today) return; // already fresh

        const apiQuote = await fetchRandomQuote();
        if (!apiQuote) return; // network failure — keep stale quote

        const converted = convertApiQuote(apiQuote);
        set({
          dailyQuote: {
            dateKey: today,
            quoteId: apiQuote._id,
            quoteText: apiQuote.content,
            quoteAuthor: apiQuote.author,
            quoteCategory: converted.category,
          },
        });
      },

      saveReflection: (mood, reflectionText) => {
        const { dailyQuote, reflections } = get();
        if (!dailyQuote) return;

        const entry: Reflection = {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2),
          dateKey: dailyQuote.dateKey,
          quoteId: dailyQuote.quoteId,
          quoteText: dailyQuote.quoteText,
          quoteAuthor: dailyQuote.quoteAuthor,
          quoteCategory: dailyQuote.quoteCategory,
          mood,
          reflectionText,
          createdAt: new Date().toISOString(),
        };

        // Replace any existing reflection for today (one per day)
        const filtered = reflections.filter(r => r.dateKey !== dailyQuote.dateKey);
        set({ reflections: [entry, ...filtered].slice(0, MAX_REFLECTIONS) });
      },

      hasReflectedToday: () => {
        const today = getTodayKey();
        return get().reflections.some(r => r.dateKey === today);
      },

      getTodaysReflection: () => {
        const today = getTodayKey();
        return get().reflections.find(r => r.dateKey === today);
      },

      clearReflections: () => set({ reflections: [] }),
    }),
    {
      name: 'reflect-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
