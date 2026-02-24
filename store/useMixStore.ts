import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

interface MixState {
  selectedCategories: string[]; // category IDs
  mixActive: boolean;
  activeCategory: string | null; // single-category browsing mode

  // Actions
  setCategories: (categories: string[]) => void;
  toggleCategory: (categoryId: string) => void;
  clearMix: () => void;
  activateMix: () => void;
  deactivateMix: () => void;
  setActiveCategory: (id: string | null) => void;
}

export const useMixStore = create<MixState>()(
  persist(
    (set, get) => ({
      selectedCategories: [],
      mixActive: false,
      activeCategory: null,

      setCategories: (categories) =>
        set({ selectedCategories: categories, mixActive: categories.length > 0, activeCategory: null }),

      toggleCategory: (categoryId) => {
        const { selectedCategories } = get();
        const has = selectedCategories.includes(categoryId);
        const updated = has
          ? selectedCategories.filter(c => c !== categoryId)
          : [...selectedCategories, categoryId];
        set({ selectedCategories: updated, mixActive: updated.length > 0 });
      },

      clearMix: () => set({ selectedCategories: [], mixActive: false }),

      activateMix: () => set({ mixActive: true }),
      deactivateMix: () => set({ mixActive: false }),
      setActiveCategory: (id) => set({ activeCategory: id, mixActive: false }),
    }),
    {
      name: 'mix-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
