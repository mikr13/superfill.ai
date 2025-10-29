export default defineContentScript({
  matches: ["<all_urls>"],
  runAt: "document_idle",

  async main() {
    console.log("[Superfill] Content script loaded on:", window.location.href);

    // Initialize autofill system
    initAutofill();
  },
});

async function initAutofill() {
  console.log("[Superfill] Autofill system initialized");
  // Will be implemented in TASK-017: Form Detection
  // Will set up MutationObserver for dynamic forms
}
