import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';

export interface CollectionQuote {
  id: string;
  text: string;
  author: string;
  addedAt: string; // ISO timestamp
}

export interface Collection {
  id: string;
  name: string;
  createdAt: string; // ISO timestamp
  quotes: CollectionQuote[];
}

interface CollectionsState {
  collections: Collection[];

  /** Returns the new collection's id so callers can drop straight into it. */
  createCollection: (name: string) => string;
  renameCollection: (id: string, name: string) => void;
  deleteCollection: (id: string) => void;

  addQuote: (collectionId: string, quote: Omit<CollectionQuote, 'addedAt'>) => void;
  removeQuote: (collectionId: string, quoteId: string) => void;
  /** True when the quote is already in that collection. */
  hasQuote: (collectionId: string, quoteId: string) => boolean;
  /** Ids of every collection holding this quote — drives the picker's checkmarks. */
  collectionsWithQuote: (quoteId: string) => string[];

  clearCollections: () => void;
}

const MAX_NAME = 60;

function newId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
}

export const useCollectionsStore = create<CollectionsState>()(
  persist(
    (set, get) => ({
      collections: [],

      createCollection: (name) => {
        const id = newId();
        const collection: Collection = {
          id,
          name: name.trim().slice(0, MAX_NAME) || 'Untitled',
          createdAt: new Date().toISOString(),
          quotes: [],
        };
        set({ collections: [collection, ...get().collections] });
        return id;
      },

      renameCollection: (id, name) =>
        set({
          collections: get().collections.map(c =>
            c.id === id ? { ...c, name: name.trim().slice(0, MAX_NAME) || c.name } : c,
          ),
        }),

      deleteCollection: (id) =>
        set({ collections: get().collections.filter(c => c.id !== id) }),

      addQuote: (collectionId, quote) =>
        set({
          collections: get().collections.map(c => {
            if (c.id !== collectionId) return c;
            // Adding the same quote twice is a no-op rather than a duplicate row.
            if (c.quotes.some(q => q.id === quote.id)) return c;
            return {
              ...c,
              quotes: [{ ...quote, addedAt: new Date().toISOString() }, ...c.quotes],
            };
          }),
        }),

      removeQuote: (collectionId, quoteId) =>
        set({
          collections: get().collections.map(c =>
            c.id === collectionId ? { ...c, quotes: c.quotes.filter(q => q.id !== quoteId) } : c,
          ),
        }),

      hasQuote: (collectionId, quoteId) =>
        get().collections.find(c => c.id === collectionId)?.quotes.some(q => q.id === quoteId) ?? false,

      collectionsWithQuote: (quoteId) =>
        get().collections.filter(c => c.quotes.some(q => q.id === quoteId)).map(c => c.id),

      clearCollections: () => set({ collections: [] }),
    }),
    {
      name: 'collections-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
