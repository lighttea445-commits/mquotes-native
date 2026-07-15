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

// ─── Mood palette ─────────────────────────────────────────────────────────────
// Labels kept stable (Great/Good/Neutral/Bad/Terrible) for data continuity.
// Icons use a weather metaphor — "what's the weather inside?".
// Colors are a muted, editorial spectrum that sits next to the brand gold.

export const MOODS = [
  { label: 'Great',    color: '#7FA37A', colorLight: '#A3BF9A', icon: 'white-balance-sunny'   },
  { label: 'Good',     color: '#C9A65C', colorLight: '#E0C38A', icon: 'weather-sunset'        },
  { label: 'Neutral',  color: '#9A948C', colorLight: '#BAB3A9', icon: 'weather-partly-cloudy' },
  { label: 'Bad',      color: '#6D7E9E', colorLight: '#93A3BF', icon: 'weather-cloudy'        },
  { label: 'Terrible', color: '#8A5E7A', colorLight: '#AF82A0', icon: 'weather-rainy'         },
] as const;

export type MoodLabel = typeof MOODS[number]['label'];

export interface MoodMeta {
  label: string;
  color: string;
  colorLight: string;
  icon: string;
}

/** Resolve mood meta by label. Falls back for legacy/unknown moods (e.g. "Other"). */
export function getMoodMeta(label: string | null | undefined): MoodMeta {
  const m = MOODS.find(x => x.label === label);
  if (m) return m;
  return {
    label: label ?? 'Neutral',
    color: '#9A948C',
    colorLight: '#BAB3A9',
    icon: 'weather-partly-cloudy',
  };
}

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
  deleteReflection: (id: string) => void;
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

      deleteReflection: (id) =>
        set(s => ({ reflections: s.reflections.filter(r => r.id !== id) })),

      clearReflections: () => set({ reflections: [] }),
    }),
    {
      name: 'reflect-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
