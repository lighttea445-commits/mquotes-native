import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { zustandMMKVStorage } from '../lib/storage';
import { TOPIC_GENERAL } from '../constants/categories';

/**
 * Topics the user follows. The quote feed is the union of everything in here —
 * there is no separate "active category" or "mix" mode.
 */
interface TopicsState {
  followed: string[];

  follow: (id: string) => void;
  unfollow: (id: string) => void;
  toggleTopic: (id: string) => void;
  /** Follow every id in one go — backs the "Follow all" section action. */
  followAll: (ids: string[]) => void;
  /** Unfollow every id in one go — backs the "Unfollow all" section action. */
  unfollowAll: (ids: string[]) => void;
  isFollowing: (id: string) => boolean;
  /** Back to just General, e.g. on account deletion. */
  resetTopics: () => void;
}

const defaultFollowed = [TOPIC_GENERAL];

export const useTopicsStore = create<TopicsState>()(
  persist(
    (set, get) => ({
      followed: defaultFollowed,

      follow: (id) => {
        if (get().followed.includes(id)) return;
        set({ followed: [...get().followed, id] });
      },

      unfollow: (id) => set({ followed: get().followed.filter(t => t !== id) }),

      toggleTopic: (id) => {
        const { followed } = get();
        set({
          followed: followed.includes(id)
            ? followed.filter(t => t !== id)
            : [...followed, id],
        });
      },

      followAll: (ids) => {
        const next = new Set(get().followed);
        ids.forEach(id => next.add(id));
        set({ followed: [...next] });
      },

      unfollowAll: (ids) => {
        const drop = new Set(ids);
        const next = get().followed.filter(t => !drop.has(t));
        // The feed can never be empty — General is the fallback.
        set({ followed: next.length > 0 ? next : defaultFollowed });
      },

      isFollowing: (id) => get().followed.includes(id),

      resetTopics: () => set({ followed: defaultFollowed }),
    }),
    {
      name: 'topics-store',
      storage: createJSONStorage(() => zustandMMKVStorage),
    },
  ),
);
