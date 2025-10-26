import { useEffect, useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useMemoryStore } from "@/stores/memory";

export const useMemoryActions = () => {
  return useMemoryStore(
    useShallow((state) => ({
      initialize: state.initialize,
      addEntry: state.addEntry,
      updateEntry: state.updateEntry,
      deleteEntry: state.deleteEntry,
      getEntryById: state.getEntryById,
      searchEntries: state.searchEntries,
      getEntriesByCategory: state.getEntriesByCategory,
      getEntriesByTags: state.getEntriesByTags,
      importEntries: state.importEntries,
      exportEntries: state.exportEntries,
    })),
  );
};

export const useInitializeMemory = () => {
  const initialize = useMemoryStore((state) => state.initialize);

  useEffect(() => {
    initialize();
  }, [initialize]);
};

export const useMemoryEntry = (id: string | null) =>
  useMemoryStore((state) =>
    id ? state.entries.find((e) => e.id === id) : undefined,
  );

export const useSearchMemory = (query: string) => {
  const entries = useMemoryStore((state) => state.entries);

  return useMemo(() => {
    const normalizedQuery = query.toLowerCase().trim();
    return entries.filter((entry) => {
      return (
        entry.answer.toLowerCase().includes(normalizedQuery) ||
        entry.question?.toLowerCase().includes(normalizedQuery) ||
        entry.category.toLowerCase().includes(normalizedQuery) ||
        entry.tags.some((tag) => tag.toLowerCase().includes(normalizedQuery))
      );
    });
  }, [entries, query]);
};

export const useMemoryStats = () => {
  return useMemoryStore(
    useShallow((state) => {
      const memoryCount = state.entries.length;
      const totalAutofills = state.entries.reduce(
        (sum, entry) => sum + entry.metadata.usageCount,
        0,
      );
      return { memoryCount, totalAutofills };
    }),
  );
};

export const useTopMemories = (limit = 10) => {
  const entries = useMemoryStore((state) => state.entries);

  return useMemo(() => {
    return [...entries]
      .sort((a, b) => b.metadata.usageCount - a.metadata.usageCount)
      .slice(0, limit);
  }, [entries, limit]);
};
