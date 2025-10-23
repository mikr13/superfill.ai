# Technical Decisions Log

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

### Decision 2: Use superjson for State Serialization

**Decision**: Use superjson for serializing Zustand state in persist middleware.

**Rationale**:  

- Better handling of complex data types (Date, Map, Set)
- Preserves undefined values and special types
- Type-safe serialization/deserialization

**Alternatives Considered**:  

1. Default JSON.stringify/parse
   - Loses type information
   - No support for undefined
   - Date objects become strings

2. Custom serializer
   - More maintenance burden
   - Potential for bugs
   - Extra code to maintain

**Trade-offs**:  

- ✅ Pros:
  - Type-safe serialization
  - Handles complex types correctly
  - Well-maintained library
  - Small size increase

- ❌ Cons:
  - Additional dependency
  - Slightly increased bundle size
  - Potential version compatibility issues

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

### Decision: Emoji Icon Instead of SVG/Image

**Decision**: Use emoji (🤖) for app branding in popup instead of importing icon files.

**Rationale**:

- **Bundle Size**: No additional image imports needed
- **Simplicity**: Works across all themes automatically
- **Visual Appeal**: Modern, friendly, recognizable
- **Quick Implementation**: No need to process/optimize images
- **Universal**: Emojis render consistently across browsers

**Alternatives Considered**:

1. **Use public/icon/48.png**
   - Pros: Matches extension icon
   - Cons: Needs import, build configuration, doesn't scale well at small sizes

2. **Lucide Icon**
   - Pros: Consistent with other icons
   - Cons: Less distinctive, harder to brand

**Trade-offs**:

- ✅ Pros: Zero bundle impact, instant implementation, theme-agnostic
- ❌ Cons: Can't customize design, relies on OS emoji rendering

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

- No additional components needed to be imported
- All dependencies already used in EntryForm and EntryCard
- Popup bundle remains lightweight

### Impact on Future Development

This popup implementation impacts future work:

1. **Autofill Functionality**
   - Main tab button ready to connect to autofill logic
   - Stats tracking already wired to memory store usage counts
   - Can add loading states and progress indicators

2. **Settings Integration**
   - Settings button opens options page correctly
   - Can add quick settings dropdown in future if needed
   - Theme preference automatically applied via MainContainer

3. **Memory Management**
   - Full CRUD operations supported in popup
   - Can add bulk actions (export, clear all) in future
   - Search/filter could be added to Memories tab

4. **Phase 2 Cloud Sync**
   - Sync status indicator can be added to topbar
   - Conflict resolution UI can be modal or new tab
   - Loading states ready for async sync operations

5. **Testing**
   - Clear component boundaries for unit testing
   - State management isolated in stores
   - Easy to mock memory data for UI testing

**Trade-offs**:

- ✅ Pros:
  - Granular control over updates
  - Better performance for individual setting changes
  - Strong type safety per setting category
  - Easy to add new setting categories
  - Clear separation between UI and functional settings
  - Can read settings outside of Zustand if needed
  - Proper versioning per storage item

- ❌ Cons:
  - More storage keys to manage
  - Need to coordinate updates across multiple storage items
  - Slightly more complex reset logic
  - More code in persist storage adapter

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
