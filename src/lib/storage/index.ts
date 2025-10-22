import { dataStorage } from "./data";
import { securityStorage } from "./security";
import { settingsStorage } from "./settings";

export const store = {
  theme: settingsStorage.theme,
  trigger: settingsStorage.trigger,
  userSettings: settingsStorage.userSettings,
  syncState: settingsStorage.syncState,

  memories: dataStorage.memories,
  formMappings: dataStorage.formMappings,
  fillSessions: dataStorage.fillSessions,

  apiKeys: securityStorage.apiKeys,
};

export { dataStorage } from "./data";
export { securityStorage } from "./security";
export { settingsStorage } from "./settings";

