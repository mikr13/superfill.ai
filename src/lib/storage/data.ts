import type { FillSession, FormMapping, MemoryEntry } from "@/types/memory";

const memories = storage.defineItem<MemoryEntry[]>("local:data:memories", {
  fallback: [],
  version: 1,
});

const formMappings = storage.defineItem<FormMapping[]>(
  "local:data:form-mappings",
  {
    fallback: [],
    version: 1,
  },
);

const fillSessions = storage.defineItem<FillSession[]>(
  "local:data:fill-sessions",
  {
    fallback: [],
    version: 1,
  },
);

export const dataStorage = {
  memories,
  formMappings,
  fillSessions,
};
