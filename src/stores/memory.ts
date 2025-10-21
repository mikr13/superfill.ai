import { store } from "@/lib/storage";
import type { MemoryEntry } from "@/types/memory";
import superjson from "superjson";
import { v7 as uuidv7 } from "uuid";
import { create } from "zustand";
import { createJSONStorage, persist } from "zustand/middleware";

// Types for store state and actions
type MemoryState = {
  entries: MemoryEntry[];
  loading: boolean;
  error: string | null;
};

type CreateMemoryEntry = Omit<MemoryEntry, "id" | "metadata">;
type UpdateMemoryEntry = Partial<Omit<MemoryEntry, "id" | "metadata">>;

type MemoryActions = {
  addEntry: (entry: CreateMemoryEntry) => Promise<MemoryEntry>;
  updateEntry: (id: string, updates: UpdateMemoryEntry) => Promise<void>;
  deleteEntry: (id: string) => Promise<void>;
  getEntryById: (id: string) => MemoryEntry | undefined;
  searchEntries: (query: string) => MemoryEntry[];
  getEntriesByCategory: (category: string) => MemoryEntry[];
  getEntriesByTags: (tags: string[]) => MemoryEntry[];
  importEntries: (entries: MemoryEntry[]) => Promise<void>;
  exportEntries: () => Promise<Blob>;
};

// Initialize store with persistence
export const useMemoryStore = create<MemoryState & MemoryActions>()(
  persist(
    (set, get) => ({
      // Initial state
      entries: [],
      loading: false,
      error: null,

      // Actions
      addEntry: async (entry: CreateMemoryEntry) => {
        try {
          set({ loading: true, error: null });

          const newEntry: MemoryEntry = {
            ...entry,
            id: uuidv7(),
            metadata: {
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              source: "manual",
              usageCount: 0,
            },
          };

          // Optimistic update
          set((state) => ({
            entries: [...state.entries, newEntry],
          }));

          // Persist to storage
          await store.memories.setValue([...get().entries]);

          set({ loading: false });
          return newEntry;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to add entry";
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },

      updateEntry: async (id: string, updates: UpdateMemoryEntry) => {
        try {
          set({ loading: true, error: null });

          const entry = get().entries.find((e) => e.id === id);
          if (!entry) {
            throw new Error(`Entry with id ${id} not found`);
          }

          const updatedEntry: MemoryEntry = {
            ...entry,
            ...updates,
            metadata: {
              ...entry.metadata,
              updatedAt: new Date().toISOString(),
            },
          };

          // Optimistic update
          set((state) => ({
            entries: state.entries.map((e) => (e.id === id ? updatedEntry : e)),
          }));

          // Persist to storage
          await store.memories.setValue(get().entries);

          set({ loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to update entry";
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },

      deleteEntry: async (id: string) => {
        try {
          set({ loading: true, error: null });

          // Optimistic update
          set((state) => ({
            entries: state.entries.filter((e) => e.id !== id),
          }));

          // Persist to storage
          await store.memories.setValue(get().entries);

          set({ loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to delete entry";
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },

      getEntryById: (id: string) => {
        return get().entries.find((e) => e.id === id);
      },

      searchEntries: (query: string) => {
        const normalizedQuery = query.toLowerCase().trim();
        return get().entries.filter((entry) => {
          return (
            entry.answer.toLowerCase().includes(normalizedQuery) ||
            entry.question?.toLowerCase().includes(normalizedQuery) ||
            entry.category.toLowerCase().includes(normalizedQuery) ||
            entry.tags.some((tag) =>
              tag.toLowerCase().includes(normalizedQuery),
            )
          );
        });
      },

      getEntriesByCategory: (category: string) => {
        return get().entries.filter((entry) => entry.category === category);
      },

      getEntriesByTags: (tags: string[]) => {
        return get().entries.filter((entry) =>
          tags.some((tag) => entry.tags.includes(tag)),
        );
      },

      importEntries: async (entries: MemoryEntry[]) => {
        try {
          set({ loading: true, error: null });

          // Ensure unique IDs and update timestamps
          const importedEntries = entries.map((entry) => ({
            ...entry,
            id: entry.id || uuidv7(),
            metadata: {
              ...entry.metadata,
              source: "import" as const,
              updatedAt: new Date().toISOString(),
            },
          }));

          // Optimistic update
          set((state) => ({
            entries: [...state.entries, ...importedEntries],
          }));

          // Persist to storage
          await store.memories.setValue(get().entries);

          set({ loading: false });
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to import entries";
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },

      exportEntries: async () => {
        try {
          set({ loading: true, error: null });

          const data = JSON.stringify(get().entries, null, 2);
          const blob = new Blob([data], { type: "application/json" });

          set({ loading: false });
          return blob;
        } catch (error) {
          const errorMessage =
            error instanceof Error ? error.message : "Failed to export entries";
          set({ loading: false, error: errorMessage });
          throw error;
        }
      },
    }),
    {
      name: "memory-storage",
      storage: createJSONStorage(() => ({
        getItem: async () => {
          const value = await store.memories.getValue();
          return superjson.stringify({
            state: { entries: value, loading: false, error: null },
          });
        },
        setItem: async (_name: string, value: string) => {
          const parsed = superjson.parse(value) as { state: MemoryState };
          await store.memories.setValue(parsed.state.entries);
        },
        removeItem: async () => {
          await store.memories.setValue([]);
        },
      })),
    },
  ),
);
