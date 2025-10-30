# Technical Decisions Log

## [2025-10-30] Field Analyzer Architecture & Label Extraction Strategy

### Decision: Multi-Tier Label Extraction with Spatial Analysis

**Decision**: Implement a comprehensive, priority-ordered label extraction strategy combining explicit labels, ARIA attributes, and geometric spatial analysis for positional labels.

**Context**:
Forms on the web are highly inconsistent. Many sites don't use proper `<label>` tags or ARIA attributes. Fields often rely on visual positioning (text to the left, right, or above) for labeling. To achieve 90%+ label extraction accuracy, we need multiple fallback strategies.

**Rationale**:

1. **Explicit Labels (Priority 1)**: Most reliable when present
   - `<label for="fieldId">` using document.querySelector
   - Implicit `<label>` wrapper (field nested inside label)
   - Clean extraction by cloning and removing nested inputs

2. **ARIA Labels (Priority 2)**: Accessibility standard
   - `aria-label` attribute (direct text)
   - `aria-labelledby` attribute (references another element by ID)
   - Industry best practice for modern web apps

3. **Positional Labels (Priority 3)**: Fallback for visual layouts
   - Left: Text elements to the left with vertical overlap
   - Right: Text elements to the right (less common but exists)
   - Top: Text elements above with horizontal alignment tolerance
   - Uses geometric calculations with `getBoundingClientRect()`

4. **Helper Text (Priority 4)**: Additional context
   - `aria-describedby` attribute
   - Common CSS classes: "help", "hint", "description"

5. **Fallbacks (Priority 5)**: Last resort
   - `placeholder` attribute
   - `name` or `id` attribute (humanized)

# Technical Decisions Log

## [2025-10-30] AI Matcher Implementation with Vercel AI SDK

### Decision: Two-Tier Matching Strategy with AI & Rule-Based Fallback

**Decision**: Implement a hybrid autofill matching system that categorizes fields into simple (rule-based) vs complex (AI-powered), with comprehensive fallback mechanisms and password field filtering.

**Context**:

- Need to match form fields to stored memories efficiently
- Some fields (email, phone, name) have deterministic validation patterns
- Other fields (company, title, unknown) require semantic understanding
- AI API calls are expensive and slow - minimize when possible
- Security requirement: NEVER autofill password fields
- Must support multiple AI providers (OpenAI, Anthropic, Groq, DeepSeek, Ollama)

**Rationale**:

1. **Simple Field Strategy (40-60% of fields)**:
   - **Fields**: name, email, phone
   - **Validation**: Email (Zod schema), Phone (E.164 format), Name (2-100 chars + letters)
   - **Matching**: Category-based memory filtering + format validation
   - **Confidence**: 0.95 (deterministic)
   - **Speed**: <50ms per form
   - **Benefits**: No AI calls, instant results, predictable behavior

2. **Complex Field Strategy (40-60% of fields)**:
   - **Fields**: address, city, state, zip, country, company, title, unknown
   - **Matching**: AI semantic understanding with context compression
   - **AI Tool**: Vercel AI SDK `generateObject()` with Zod schemas
   - **Confidence**: Variable (0-1) based on AI analysis
   - **Speed**: 1-2s per form
   - **Fallback**: Rule-based matcher if AI fails
   - **Benefits**: Handles ambiguity, context-aware, explainable

3. **Password Field Filtering**:
   - **Security Requirement**: ALWAYS filter out password fields before any processing
   - **Implementation**: Check `field.metadata.fieldType !== "password"`
   - **Logged**: Track filtered password field count
   - **Critical**: Prevents accidental credential leakage

4. **Vercel AI SDK Integration**:

   ```typescript
   const result = await generateObject({
     model,
     schema: AIBatchMatchSchema,
     schemaName: "FieldMemoryMatches",
     schemaDescription: "Mapping of form fields to stored memory entries",
     system: systemPrompt,
     prompt: userPrompt,
     temperature: 0.3, // Lower for deterministic results
   });
   ```

   - **Type Safety**: Zod schemas ensure structured, validated output
   - **Provider Agnostic**: Single API for OpenAI, Anthropic, Groq, DeepSeek, Ollama
   - **Reasoning Access**: AI explains each match decision
   - **Error Handling**: Automatic validation, fallback on failure

5. **Fallback Matcher (Rule-Based)**:
   - **Multi-Strategy Scoring**:
     - Purpose match (40% weight): Keyword matching with memory category/question
     - Context similarity (30% weight): Token-based Jaccard similarity
     - Category match (20% weight): Category name in field labels
     - Label overlap (10% weight): Shared tokens between labels and memories
   - **Token Processing**: Stop word filtering, case-insensitive, alphanumeric split
   - **Performance**: <100ms for typical forms
   - **Accuracy**: ~70% of AI matcher accuracy (good enough for fallback)

**Architecture**:

```
AutofillService.processFields()
  ↓
1. Filter password fields (security)
  ↓
2. Categorize: simple vs complex
  ↓
3a. Simple → matchSimpleFields()
    - Category filtering
    - Format validation
    - High confidence (0.95)
  ↓
3b. Complex → matchComplexFields()
    - Get API key (keyVault)
    - Compress data (context optimization)
    - AI matching (Vercel AI SDK)
    - If fails → Fallback matcher
  ↓
4. Combine results (maintain field order)
  ↓
5. Return unified mappings
```

**Performance Impact**:

- **AI Call Reduction**: 40-60% fewer API calls (simple fields bypass AI)
- **Token Savings**: Context compression + field limits
- **Speed**: Simple fields <50ms, complex fields 1-2s
- **Accuracy**: Simple fields ~95%, complex fields ~85% (AI) or ~60% (fallback)

**Future Extensibility**:

- Easy to add new matchers (e.g., embedding-based)
- Constants module for easy parameter tuning
- Pluggable AI providers via registry
- Structured schemas enable versioning
- Fallback chain ensures resilience

**Trade-offs**:

- **Complexity**: Three separate matching strategies vs one
- **Maintenance**: Need to keep simple field list updated
- **Accuracy**: Simple fields miss nuanced context
- **Accepted**: Benefits (speed, cost, security) outweigh complexity

**Implementation Files**:

- `src/lib/autofill/constants.ts`: Configuration and field categorization
- `src/lib/autofill/fallback-matcher.ts`: Rule-based matching (fallback)
- `src/lib/autofill/ai-matcher.ts`: AI-powered matching (Vercel AI SDK)
- `src/lib/autofill/autofill-service.ts`: Orchestration and coordination

---

## [2025-10-30] Field Analyzer Architecture & Label Extraction Strategy

### Decision: Multi-Tier Label Extraction with Spatial Analysis

**Decision**: Implement a comprehensive, priority-ordered label extraction strategy combining explicit labels, ARIA attributes, and geometric spatial analysis for positional labels.

**Context**:
Forms on the web are highly inconsistent. Many sites don't use proper `<label>` tags or ARIA attributes. Fields often rely on visual positioning (text to the left, right, or above) for labeling. To achieve 90%+ label extraction accuracy, we need multiple fallback strategies.

**Rationale**:

1. **Explicit Labels (Priority 1)**: Most reliable when present
   - `<label for="fieldId">` using document.querySelector
   - Implicit `<label>` wrapper (field nested inside label)
   - Clean extraction by cloning and removing nested inputs

2. **ARIA Labels (Priority 2)**: Accessibility standard
   - `aria-label` attribute (direct text)
   - `aria-labelledby` attribute (references another element by ID)
   - Industry best practice for modern web apps

3. **Positional Labels (Priority 3)**: Fallback for visual layouts
   - Left: Text elements to the left with vertical overlap
   - Right: Text elements to the right (less common but exists)
   - Top: Text elements above with horizontal alignment tolerance
   - Uses geometric calculations with `getBoundingClientRect()`

4. **Helper Text (Priority 4)**: Additional context
   - `aria-describedby` attribute
   - Common CSS classes: "help", "hint", "description"

5. **Fallbacks (Priority 5)**: Last resort
   - `placeholder` attribute
   - `name` or `id` attribute (humanized)

**Spatial Analysis Implementation**:

```typescript
private calculateDistance(
  fieldRect: DOMRect,
  labelRect: DOMRect,
  direction: "left" | "right" | "top",
): number | null {
  // Left: Label must be to the left with vertical overlap
  // Right: Label must be to the right with vertical overlap
  // Top: Label must be above with horizontal alignment (±50px tolerance)
  
  // Returns distance in pixels or null if not a valid match
}
```

**Performance Optimizations**:

- **WeakMap Caching**: Label lookups cached per element (prevents memory leaks as cache auto-cleans when element GC'd)
- **TreeWalker API**: Efficient DOM traversal (faster than querySelectorAll for text nodes)
- **Early Termination**: Stop after finding 20 candidates within distance threshold
- **NodeFilter**: Skip irrelevant elements (script, style, form inputs) during traversal

**Alternatives Considered**:

1. **Only Explicit Labels**
   - Pros: Simple, reliable when present
   - Cons: Fails on 40-60% of real-world forms
   - Rejected: Insufficient coverage

2. **ML/Computer Vision Approach**
   - Pros: Could handle any visual layout
   - Cons: Requires image processing, much slower, needs training data
   - Rejected: Overkill for browser extension, performance issues

3. **Heuristics Only (No Spatial)**
   - Pros: Simpler implementation
   - Cons: Misses visually-positioned labels (common in admin panels, internal tools)
   - Rejected: Doesn't meet 90% accuracy target

4. **Z-Index Aware Positioning**
   - Pros: More accurate for overlapping elements
   - Cons: Complex to implement, rare edge case
   - Deferred: Can add if needed in Phase 2

**Trade-offs**:

✅ **Pros**:

- High accuracy across diverse websites (target: 90%+)
- Handles modern frameworks (React, Vue, Angular) with ARIA
- Handles legacy forms (table-based, positional)
- Performance-optimized with caching
- Extensible for future improvements

❌ **Cons**:

- More complex than simple label lookup
- Geometric calculations add minor CPU cost
- May occasionally pick wrong text in complex layouts
- Needs testing across many websites

**Field Purpose Inference Strategy**:

Combined approach using multiple signals:

1. Field type hints (email input → email purpose)
2. HTML autocomplete attribute (follows standard)
3. Regex pattern matching on all label sources
4. Fallback to "unknown" for AI matching layer

**Integration Pattern**:

```typescript
// Content script creates analyzer once
const fieldAnalyzer = new FieldAnalyzer();
const formDetector = new FormDetector(fieldAnalyzer);

// FormDetector uses analyzer for each field
const field = this.createDetectedField(element);
field.metadata = this.analyzer.analyzeField(field);
```

**Impact on Future Development**:

1. **AI Matching (TASK-019)**:
   - Rich metadata enables better semantic matching
   - Multiple label sources provide context redundancy
   - Field purpose reduces AI workload (simple fields bypass AI)

2. **Form Preview UI**:
   - Display best available label for user review
   - Show confidence indicators based on label source
   - Allow manual label editing if wrong

3. **Analytics & Improvement**:
   - Track which label extraction methods succeed most
   - Identify patterns where spatial analysis fails
   - Iterate on regex patterns based on real data

4. **Accessibility**:
   - Prioritizing ARIA labels encourages proper markup
   - Can generate accessibility reports for site owners
   - Helper text extraction aids user understanding

**Testing Strategy**:

- Test on 20+ diverse websites (e-commerce, social, admin, forms)
- Verify label priority (explicit beats positional)
- Validate spatial calculations with various layouts
- Check purpose inference accuracy against known fields
- Performance benchmarking (should be <50ms per field)

## [2025-10-30] Background-to-Content Script Communication Architecture

### Decision: Use @webext-core/messaging Instead of @webext-core/proxy-service for Content Scripts

**Decision**: Use `@webext-core/messaging` for background ↔ content script communication instead of extending `@webext-core/proxy-service`.

**Rationale**:

- **Technical Limitation**: `@webext-core/proxy-service` only supports background script services, not content script services
- **Library Design**: The proxy-service uses `defineProxyService()` which is designed for services that run in the background context
- **Content Script Reality**: Content scripts run in a different execution context and require explicit message passing via `browser.runtime.sendMessage` / `browser.tabs.sendMessage`
- **Consistency**: Both `@webext-core/proxy-service` and `@webext-core/messaging` are from the same library family, providing consistent patterns
- **Type Safety**: `defineExtensionMessaging()` provides the same type-safe communication as proxy-service, just with explicit message passing

**Initial Approach (TASK-016)**:

Used `browser.scripting.executeScript` with `Reflect.set` to expose functions on the window object:

```typescript
// Content script exposed function globally
Reflect.set(window, DETECT_FORMS_GLOBAL_KEY, detectForms);

// Background called it via executeScript
const [injectionResult] = await browser.scripting.executeScript({
  target: { tabId: tab.id },
  func: (key: string) => {
    const detect = window[key];
    return detect();
  },
  args: [DETECT_FORMS_GLOBAL_KEY],
});
```

**Problems with Initial Approach**:

- Global window pollution (modifying window object)
- Not a standard extension messaging pattern
- `Reflect.set` felt hacky and non-idiomatic
- No persistent listener (new execution context each time)
- Cannot maintain state across calls easily

**Final Approach (TASK-016b)**:

Use `@webext-core/messaging` for type-safe message passing:

```typescript
// Define protocol
interface ContentAutofillProtocolMap {
  detectForms: () => DetectFormsResult;
  fillField: (data: { fieldOpid: string; value: string }) => boolean;
}

export const contentAutofillMessaging = 
  defineExtensionMessaging<ContentAutofillProtocolMap>();

// Content script registers listeners
contentAutofillMessaging.onMessage("detectForms", async () => {
  const forms = formDetector.detectAll();
  return { success: true, forms, totalFields };
});

// Background sends messages
const result = await contentAutofillMessaging.sendMessage(
  "detectForms",
  undefined,
  tab.id
);
```

**Alternatives Considered**:

1. **Direct browser.runtime.sendMessage API**
   - Pros: No additional abstraction
   - Cons: No type safety, manual message routing, more boilerplate

2. **Continue with executeScript + Reflect.set**
   - Pros: Works, simpler mental model (just call a function)
   - Cons: Global pollution, non-standard, can't maintain state

3. **Custom message wrapper**
   - Pros: Full control over implementation
   - Cons: Reinventing the wheel, more code to maintain

**Trade-offs**:

- ✅ Pros:
  - No global window pollution
  - Standard Chrome extension messaging pattern
  - Type-safe protocol definition via TypeScript interfaces
  - Persistent listeners in content script (better for repeated calls)
  - Can maintain state in content script (FormDetector instance persists)
  - Consistent with existing architecture (@webext-core family)
  - Easy to add more message types (fillField already defined)
  - Better aligned with Chrome extension V3 best practices

- ❌ Cons:
  - Slightly more boilerplate than executeScript approach
  - Need to define protocol interface (but this is actually a pro for type safety)
  - Requires understanding message passing (but this is standard knowledge)

**Architecture Summary**:

- **Background ↔ Popup/Options**: Use `@webext-core/proxy-service`
  - Services run in background, called from UI contexts
  - Example: `getAutofillService().startAutofillOnActiveTab()`
  
- **Background ↔ Content Script**: Use `@webext-core/messaging`
  - Content scripts run in page context, need explicit messaging
  - Example: `contentAutofillMessaging.sendMessage("detectForms", undefined, tabId)`

**Impact on Future Development**:

1. **Field Population (TASK-019)**
   - `fillField` message handler already defined in protocol
   - Background can send fill commands to specific tabs
   - Content script maintains references to detected fields

2. **Dynamic Form Detection**
   - Can add `watchForms` message for MutationObserver setup
   - Content script can send proactive messages to background

3. **Multi-tab Support**
   - TabId parameter makes it easy to target specific tabs
   - Each tab's content script maintains its own state

4. **Testing**
   - Easier to mock message passing than executeScript
   - Protocol interface makes contract explicit

## [2025-10-21] Memory Store Implementation

### Decision 1: Use Zustand with WXT Storage API

**Decision**: Use Zustand's persist middleware with WXT's storage API for state management and persistence.

**Rationale**:  

- WXT's storage API provides cross-browser compatibility
- Zustand's persist middleware handles serialization and hydration
- Type-safe implementation with TypeScript support
- Built-in support for optimistic updates and error handling

**Alternatives Considered**:  

1. Redux Toolkit
   - More boilerplate
   - Larger bundle size
   - More complex setup

2. React Context + useReducer
   - No built-in persistence
   - Manual storage sync required
   - More code to maintain

**Trade-offs**:  

- ✅ Pros:
  - Simpler API surface
  - Built-in TypeScript support
  - Minimal boilerplate
  - Easy integration with WXT storage
  - Small bundle size

- ❌ Cons:
  - Less ecosystem tools compared to Redux
  - No Redux DevTools support out of the box

### Decision 2: Use Native JSON for State Serialization

**Decision**: Use native `JSON.stringify`/`JSON.parse` for serializing Zustand state in persist middleware.

**Rationale**:  

- No additional dependencies needed
- Zustand's `createJSONStorage` already handles JSON serialization internally
- Our data structures (simple objects with primitives and ISO date strings) don't require special serialization
- Lighter bundle size and simpler implementation
- Better compatibility with Zustand's internal mechanisms

**Alternatives Considered**:  

1. SuperJSON
   - Initially used but caused issues with Zustand's automatic serialization
   - Adds unnecessary complexity when `createJSONStorage` already handles JSON
   - Additional dependency and bundle size

2. Custom serializer
   - More maintenance burden
   - Potential for bugs
   - Extra code to maintain

**Trade-offs**:  

- ✅ Pros:
  - No additional dependencies
  - Works seamlessly with Zustand's internal serialization
  - Smaller bundle size
  - Simpler code and easier to debug
  - Standard JSON format

- ❌ Cons:
  - Cannot serialize complex types like Map, Set, or class instances (not needed in our case)
  - Date objects stored as ISO strings (already our pattern)

### Decision 3: Implement Optimistic Updates

**Decision**: Use optimistic updates for all state mutations with rollback on error.

**Rationale**:  

- Better user experience with immediate feedback
- Reduces perceived latency
- Handles offline scenarios gracefully

**Alternatives Considered**:  

1. Wait for storage operations
   - Slower perceived performance
   - More visible loading states
   - Safer but worse UX

2. Queue-based updates
   - More complex implementation
   - Harder to reason about state
   - Better for offline-first apps

**Trade-offs**:  

- ✅ Pros:
  - Instant user feedback
  - Better perceived performance
  - Smoother UX
  - Works well with offline capabilities

- ❌ Cons:
  - More complex error handling
  - Need to handle edge cases
  - Potential for temporary state inconsistency
  - Must implement rollback logic

### Impact on Future Development

These decisions impact future work in several ways:

1. **Form Store Development**

   - Will follow same patterns as memory store
   - Can reuse optimistic update patterns
   - Will benefit from superjson serialization

2. **Settings Store**

   - Simpler implementation possible
   - Less need for optimistic updates
   - Can use same persistence layer

3. **Sync Implementation (Phase 2)**

   - superjson helps with data consistency
   - Optimistic updates support offline mode
   - Foundation for conflict resolution

## [2025-10-22] Storage Architecture Refactoring

### Decision: Modular Storage Structure

**Decision**: Split the monolithic storage file into separate modules based on data domains (settings, data, security).

**Rationale**:

- **Separation of Concerns**: Each storage module handles a specific domain
- **Better Maintainability**: Easier to locate and modify storage definitions
- **Scalability**: New storage types can be added without cluttering a single file
- **Code Organization**: Clear boundaries between different types of data
- **Team Collaboration**: Multiple developers can work on different storage modules without conflicts

**Implementation**:

Created a `src/lib/storage/` directory structure:

```typescript
src/lib/storage/
├── index.ts       # Central export point
├── settings.ts    # UI/UX settings (theme, trigger, sync configuration)
├── data.ts        # User data (memories, form mappings, fill sessions)
└── security.ts    # Encrypted data (API keys)
```

**Alternatives Considered**:

1. **Keep Single File**
   - Simpler initially
   - Becomes unwieldy as project grows
   - Harder to maintain separation of concerns

2. **Split by Feature Instead of Type**
   - Could organize by feature (memory/, forms/, etc.)
   - Would duplicate storage patterns
   - Less clear for storage-specific concerns

3. **Use Sub-namespaces**
   - Keep single file with nested objects
   - Still results in large file
   - Doesn't provide clear module boundaries

**Trade-offs**:

- ✅ Pros:
  - Clear separation of concerns
  - Easier to find specific storage definitions
  - Better scalability for future growth
  - Maintains backward compatibility through index re-exports
  - Each module is focused and manageable
  - Easier to test individual storage modules

- ❌ Cons:
  - More files to navigate
  - Slightly more complex import structure
  - Need to maintain index.ts for re-exports

### Impact on Future Development

This refactoring impacts future work in several ways:

1. **New Storage Requirements**
   - Easy to add new storage modules (e.g., `analytics.ts`, `cache.ts`)
   - Clear pattern to follow for new storage types
   - Doesn't affect existing code due to backward compatibility

2. **Testing**
   - Can mock individual storage modules in unit tests
   - Easier to test specific storage domains in isolation
   - Better test organization matching storage structure

3. **Phase 2 Cloud Sync**
   - Clear separation makes it easier to identify what needs syncing
   - Security storage can remain local-only
   - Settings and data can be synced independently

4. **Code Reviews**
   - Changes to specific storage domains are isolated
   - Easier to review and understand impact of changes
   - Reduced merge conflicts in storage definitions

5. **Documentation**
   - Each module can have focused documentation
   - Easier to document storage patterns per domain
   - Better JSDoc organization

## [2025-10-22] Complete Settings Store Implementation

### Decision: Separate Settings into Theme/Trigger and UserSettings

**Decision**: Split settings into distinct storage items (theme, trigger, userSettings) instead of storing everything as one object.

**Rationale**:

- **Granular Updates**: Each setting can be updated independently without affecting others
- **Performance**: Only need to read/write the specific setting that changes
- **Type Safety**: Each storage item has its own specific type
- **Clear Boundaries**: UI settings (theme/trigger) vs. functional settings (provider, autoFill, threshold)
- **Flexibility**: Easy to add new settings categories in the future

**Implementation**:

```typescript
// Storage layer (src/lib/storage/settings.ts)
const theme = storage.defineItem<Theme>(...)
const trigger = storage.defineItem<Trigger>(...)
const userSettings = storage.defineItem<UserSettings>(...) // selectedProvider, autoFillEnabled, confidenceThreshold

// Type definitions (src/types/settings.ts)
interface UserSettings {
  selectedProvider: "openai" | "anthropic";
  autoFillEnabled: boolean;
  confidenceThreshold: number;
}
```

**Store Methods Implemented**:

1. **Theme Management**:
   - `setTheme(theme)` - Set specific theme
   - `toggleTheme()` - Cycle through light/dark/system

2. **Trigger Management**:
   - `setTrigger(trigger)` - Set fill trigger mode

3. **User Settings Management**:
   - `setSelectedProvider(provider)` - Set AI provider
   - `setAutoFillEnabled(enabled)` - Toggle auto-fill
   - `setConfidenceThreshold(threshold)` - Set matching confidence
   - `updateUserSettings(partial)` - Bulk update multiple settings

4. **API Key Management**:
   - `setApiKey(provider, key)` - Validate and store encrypted key
   - `getApiKey(provider)` - Retrieve encrypted key

5. **Reset**:
   - `resetSettings()` - Reset all settings to defaults

**Alternatives Considered**:

1. **Single Settings Object**
   - Store all settings in one object
   - Simpler storage structure
   - But: Every update writes entire object
   - But: Less type safety
   - But: Harder to manage partial updates

2. **Each Field Separate**
   - Store each setting as individual storage item
   - Most granular approach
   - But: Too many storage keys
   - But: Harder to manage related settings

3. **Store Everything in Zustand Only**
   - Let Zustand persist handle everything
   - Simpler implementation
   - But: Less control over storage format
   - But: Harder to read settings outside Zustand
   - But: Can't version storage schema easily

## [2025-10-23] Extension Popup UI Architecture

### Decision: Three-Tab Layout with Conditional Navigation

**Decision**: Implement a three-tab popup interface (Main/Add Memory/Memories) with conditional tab enabling based on memory availability.

**Rationale**:

- **User Flow**: Natural progression from adding memories to using them for autofill
- **Discoverability**: All major features visible in tab bar
- **Space Efficiency**: Popup has limited space (400x500-600px), tabs maximize usable area
- **Progressive Disclosure**: Main autofill features only available after memories exist
- **Context Switching**: Easy navigation between viewing, adding, and using memories

**Implementation Details**:

1. **Tab Behavior**:
   - Main tab disabled when no memories exist
   - Default to "Add Memory" tab when no memories
   - Auto-switch to Main tab after first memory created
   - Clicking edit from Memories tab switches to Add Memory with pre-filled form

2. **Topbar Design**:
   - Robot emoji (🤖) as lightweight icon alternative
   - App name prominently displayed
   - Settings button (gear icon) opens options page in new tab
   - Gradient background for visual hierarchy (primary/10 to primary/5)

3. **Main Tab Contents**:
   - Large prominent autofill button (disabled if no memories)
   - Blue informational card explaining functionality
   - Quick stats card showing memory count and autofill success count

4. **Add Memory Integration**:
   - Reuses existing EntryForm component
   - Supports both create and edit modes
   - Edit mode triggered from Memories tab edit button
   - Cancel button only shown in edit mode

5. **Memories Tab**:
   - Shows top 10 memories by usage count (most frequently used)
   - Uses compact EntryCard mode to fit more entries
   - Empty state for first-time users
   - Full integration with edit/delete/duplicate actions

**Alternatives Considered**:

1. **Single-Page Dashboard**
   - All features on one page with sections
   - Pros: No tab switching needed
   - Cons: Too cramped in 400px width, harder to focus on specific task

2. **Wizard-Style Flow**
   - Step-by-step guided experience
   - Pros: Better onboarding
   - Cons: More clicks for returning users, less flexible

3. **Modal-Based Navigation**
   - Main page with modal popups for add/edit
   - Pros: Maintains context
   - Cons: Modals awkward in small popup, can't see background content

4. **Dropdown Menu Navigation**
   - Single view with dropdown to switch modes
   - Pros: More space for content
   - Cons: Less discoverable, hidden navigation

**Trade-offs**:

- ✅ Pros:
  - Clear visual separation of concerns
  - Easy to understand at a glance
  - Familiar tab pattern from other extensions
  - Efficient use of limited popup space
  - Progressive onboarding (start with Add Memory)
  - All features accessible within 1-2 clicks

- ❌ Cons:
  - Tab bar takes up vertical space
  - Can't see multiple sections simultaneously
  - State management for active tab and edit mode
  - Disabled tab might be confusing initially

### Decision: Use Existing Components Over Custom Implementation

**Decision**: Maximize use of shadcn/ui components (Tabs, Card, Badge, Empty, Button) and existing feature components (EntryForm, EntryCard).

**Rationale**:

- **Consistency**: Matches design system across popup and options page
- **Maintainability**: Single source of truth for component behavior
- **Accessibility**: shadcn components have built-in ARIA labels and keyboard support
- **Development Speed**: No need to reinvent UI patterns
- **Type Safety**: Pre-built TypeScript types and interfaces

**Implementation**:

- `Tabs`: Main navigation structure
- `Card`: Content containers for each section
- `Badge`: Quick stats display
- `Empty`: No memories state with helpful messaging
- `Button`: Actions (autofill, settings)
- `EntryForm`: Memory creation/editing (from TASK-008)
- `EntryCard`: Memory display in compact mode (from TASK-009)

**Impact on Bundle Size**:

## [2025-10-28] CSV Import/Export Implementation

### Decision: Custom CSV Parser Over External Libraries

**Decision**: Implement custom CSV parsing and stringification utilities instead of using external libraries like PapaParse or csv-parse.

**Rationale**:

- **Bundle Size**: No additional dependencies, keeps extension lightweight
- **Specific Requirements**: Our use case is simple (fixed schema, known fields)
- **Control**: Full control over parsing behavior and error handling
- **Type Safety**: Can integrate directly with TypeScript types
- **Performance**: No overhead from feature-rich libraries we don't need

**Implementation Details**:

Created `src/lib/csv.ts` with:

1. **stringifyToCSV**: Converts array of objects to CSV
   - Handles quoted fields (when containing delimiter, quotes, or newlines)
   - Escapes quotes by doubling them (RFC 4180 standard)
   - Joins array values with semicolons
   - Type-safe with generic parameter

2. **parseCSV**: Parses CSV to array of objects
   - Respects quoted fields
   - Handles escaped quotes
   - Auto-detects semicolon-separated arrays
   - Returns typed objects

3. **Helper Functions**:
   - `downloadCSV`: Triggers browser download
   - `readCSVFile`: Reads from File input
   - `escapeField`: Proper RFC 4180 escaping

**Alternatives Considered**:

1. **PapaParse**
   - Pros: Feature-rich, well-tested, handles edge cases
   - Cons: 45KB minified, overkill for our simple needs
   - Why not: Bundle size impact for features we don't use

2. **csv-parse (from csv package)**
   - Pros: Node.js standard, streaming support
   - Cons: 25KB+ minified, designed for Node.js
   - Why not: Not optimized for browser, unnecessary streaming features

3. **Built-in browser APIs only**
   - Pros: Zero dependencies
   - Cons: Complex parsing logic, hard to handle edge cases
   - Why not: Reinventing the wheel poorly

**Trade-offs**:

- ✅ Pros:
  - Zero bundle impact
  - Full control over behavior
  - Type-safe implementation
  - Simple and maintainable
  - Sufficient for our use case

- ❌ Cons:
  - Limited to basic CSV features
  - May need updates for edge cases
  - No streaming support (not needed for memory data)

### Settings Store: Future Impact

This implementation impacts future work:

1. **Settings UI Development**
   - Clear methods for each setting type
   - Easy to bind UI controls to specific setters
   - Can show loading/error states per setting

2. **API Key Management**
   - Integrated validation before storage
   - Automatic provider selection on key save
   - Ready for multiple provider support

3. **Phase 2 Cloud Sync**
   - User settings can be synced to cloud
   - Theme/trigger can remain local preferences
   - Clear distinction between syncable and local-only settings

4. **Feature Flags**
   - Easy to add new boolean settings to UserSettings
   - Can extend without changing structure

5. **Analytics**
   - Can track setting changes independently
   - Better understanding of user preferences

### Decision**: Use Vercel AI SDK v5 with `generateObject` for AI categorization

- **Rationale**: Provides type-safe structured output via Zod schemas, supports multiple providers (OpenAI, Anthropic), built-in error handling
- **Alternatives**: Direct API calls to OpenAI/Anthropic, LangChain, custom AI wrapper
- **Trade-offs**: Adds dependency on Vercel AI SDK but significantly improves type safety and developer experience

### Decision**: Implement AI categorization in background service worker

- **Rationale**: Follows Chrome extension best practices for service worker lifecycle, centralizes AI logic, enables message-passing architecture
- **Alternatives**: Run AI calls directly in popup/options pages, use content scripts
- **Trade-offs**: More complex message passing but better architecture and state management

### Decision**: Use fallback rule-based categorization when AI fails

- **Rationale**: Ensures the extension remains functional even if API keys are missing or AI service is down
- **Alternatives**: Require AI to work, show error only
- **Trade-offs**: Maintains dual system but provides better user experience and reliability

### Decision**: Use @tanstack/react-virtual for TASK-010 instead of pagination

- **Rationale**: Better UX for browsing large lists, no page load interruptions, smooth scrolling
- **Alternatives**: Traditional pagination (50 items/page as originally specified)
- **Trade-offs**: Slightly more complex implementation but significantly better performance

## [2025-10-28] Temporary Removal of Virtualization from EntryList

### Decision: Remove @tanstack/react-virtual and Render List Normally

**Decision**: Temporarily remove virtualization from EntryList component and render all entries directly until performance issues are observed.

**Rationale**:

- **Premature Optimization**: Virtualization adds complexity before we have real performance data
- **Simpler Code**: Direct rendering is easier to understand and maintain
- **Easier Debugging**: No virtual positioning calculations to debug during development
- **User Testing First**: Better to validate UX with real users before optimizing
- **Can Re-add Later**: Well-documented decision makes it easy to restore virtualization if needed

**Implementation Changes**:

1. **Removed Dependencies**:
   - `useVirtualizer` from `@tanstack/react-virtual`
   - `useRef` for parent container reference
   - Virtual row calculations and positioning

2. **Simplified Rendering**:
   - Grid view: Direct map over entries in CSS grid
   - List view: Direct map over entries in flex column with gap-4
   - No more absolute positioning or transform calculations
   - No more estimated row heights or overscan configuration

3. **Code Removed**:

```tsx
// Before:
const rowVirtualizer = useVirtualizer({
  count: filteredAndSortedEntries.length,
  getScrollElement: () => parentRef.current,
  estimateSize: () => (viewMode === "list" ? 220 : 180),
  overscan: 5,
});

// After: Direct render
{filteredAndSortedEntries.map((entry) => (
  <EntryCard key={entry.id} ... />
))}
```

**When to Re-add Virtualization**:

Consider restoring virtualization when:

- User reports laggy scrolling with 100+ entries
- Profiling shows render performance issues
- List view becomes noticeably slow to interact with
- Users request better performance for large datasets

**Alternatives Considered**:

1. **Keep Virtualization**
   - Pros: Future-proof for large lists
   - Cons: Adds complexity now without proven need

2. **Use Pagination Instead**
   - Pros: Simpler than virtualization, limits rendered items
   - Cons: Worse UX than infinite scroll, interrupts browsing flow

3. **Implement Lazy Loading**
   - Pros: Progressive rendering, good for very large lists
   - Cons: More complex than simple render, still need intersection observer

**Trade-offs**:

- ✅ Pros:
  - Simpler, more maintainable code
  - Easier to debug layout issues
  - Faster development iteration
  - Less bundle size (@tanstack/react-virtual no longer needed)
  - More predictable rendering behavior
  - Can use CSS features without virtual positioning constraints

- ❌ Cons:
  - May see performance issues with 500+ entries
  - All entries rendered to DOM at once
  - Potential memory usage with very large lists
  - Will need refactoring if performance becomes issue

**Impact on Future Development**:

1. **Performance Monitoring**
   - Should monitor scroll performance as user base grows
   - Can add analytics to track average number of entries per user
   - Easy to A/B test virtualization vs direct render later

2. **Re-implementation Path**:
   - Decision documented makes it easy to restore
   - Can reference git history for previous implementation
   - May choose different virtualization library if re-adding (react-window, react-virtuoso)

3. **Current Benefits**:
   - Faster development of other features
   - Easier to implement new filtering/sorting features
   - Simpler testing without virtual scroll considerations

**Related Components**:

- This decision only affects EntryList in options page
- Popup Memories tab already uses simple render (top 10 entries only)
- No other components currently use virtualization
