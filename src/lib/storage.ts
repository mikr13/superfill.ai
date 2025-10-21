import type {
  FillSession,
  FormMapping,
  MemoryEntry,
  SyncState,
} from "@/types/memory";
import { Theme } from "@/types/theme";
import { Trigger } from "@/types/trigger";

// settings
const theme = storage.defineItem<Theme>("local:settings:vite-ui-theme", {
  fallback: Theme.DEFAULT,
  version: 1,
});

const trigger = storage.defineItem<Trigger>("local:settings:trigger", {
  init: () => Trigger.POPUP,
  version: 1,
});

const syncState = storage.defineItem<SyncState>("local:settings:sync-state", {
  fallback: {
    syncUrl: "",
    syncToken: "",
    lastSync: new Date().toISOString(),
    conflictResolution: "newest",
    status: "pending",
  },
  version: 1,
});

// data
const memories = storage.defineItem<MemoryEntry[]>("local:data:memories", {
  fallback: [],
  version: 1,
});

const formMappings = storage.defineItem<FormMapping[]>("local:data:form-mappings", {
  fallback: [],
  version: 1,
});

const fillSessions = storage.defineItem<FillSession[]>("local:data:fill-sessions", {
  fallback: [],
  version: 1,
});


export const store = {
  theme,
  trigger,
  memories,
  formMappings,
  fillSessions,
  syncState,
};
