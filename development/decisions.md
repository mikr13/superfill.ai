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

## [2025-10-26] Options Page Architecture

### Decision: Two-Tab Layout with Resizable Split-Screen for Memory Management

**Decision**: Implement options page with Settings and Memory tabs, where Memory tab uses a resizable split-screen layout (EntryList on left, EntryForm on right).

**Rationale**:

- **Settings Separation**: Full-screen space allows comprehensive settings UI without cramping
- **Memory Workflow**: Split-screen enables viewing all memories while editing/creating
- **Discoverability**: All settings visible in one scrollable page, no navigation needed
- **Professional Feel**: Resizable panels give power-user control
- **Responsive Design**: Vertical split on mobile maintains usability on smaller screens

**Implementation Details**:

1. **Settings Tab Structure**:
   - Max-width container (3xl) for optimal reading width
   - Cards for logical grouping: Trigger Mode, AI Provider, Autofill Settings
   - Fill Trigger Mode: Disabled select with "Coming Soon" badge (content mode not yet implemented)
   - AI Provider: Password inputs for OpenAI and Anthropic keys with visibility toggle
   - Auto-selects provider based on which key is provided
   - Autofill Settings: Switch for enable/disable, SliderWithInput for confidence threshold
   - Toast notifications for successful API key saves

2. **Memory Tab Structure**:
   - ResizablePanelGroup with horizontal direction (desktop), vertical (mobile)
   - Left panel (default 50%, min 30%): EntryList with all filtering/sorting features
   - Right panel (default 50%, min 30%): EntryForm in Card wrapper
   - ResizableHandle with visual grip indicator
   - Clicking edit in list populates form on right
   - Form header changes between "Add New Memory" and "Edit Memory"
   - Cancel button only shows in edit mode

3. **Accessibility**:
   - Used useId() for all form field IDs to avoid conflicts
   - Proper Label associations with inputs
   - ARIA labels on icon buttons
   - Keyboard navigation support via shadcn components

4. **State Management**:
   - editingEntryId tracks which entry is being edited
   - Null state means create mode in form
   - Edit action from list sets editingEntryId and populates form
   - Success/cancel callbacks reset editingEntryId

**Alternatives Considered**:

1. **Modal-Based Edit**
   - Entry form opens in modal overlay
   - Pros: Focuses attention on single task
   - Cons: Can't reference other memories while editing, less efficient workflow

2. **Separate Pages for Settings/Memory**
   - Different routes for each section
   - Pros: Even more space per feature
   - Cons: Extra navigation layer, less immediate access

3. **Accordion-Based Settings**
   - Settings in collapsible sections
   - Pros: Saves vertical space
   - Cons: Requires clicks to access, less discoverable

4. **Grid View for Memory**
   - Cards in grid layout like Memories tab in popup
   - Pros: See more entries at once
   - Cons: Can't edit inline, requires modal or navigation

**Trade-offs**:

- ✅ Pros:
  - Efficient workflow for memory management
  - Full settings visible without scrolling much
  - Resizable panels adapt to user preference
  - Can create memory while viewing existing ones for reference
  - Professional desktop-app feel
  - Mobile-responsive with vertical layout
  - Clear visual hierarchy with cards

- ❌ Cons:
  - More complex layout code with ResizablePanelGroup
  - Higher cognitive load with split view
  - Initial panel sizes might not suit all users
  - Takes time to understand resizable functionality

### Decision: Password Field Visibility Toggles for API Keys

**Decision**: Add eye/eye-off icon buttons to toggle API key input visibility instead of always showing masked values.

**Rationale**:

- **User Control**: Users can verify they typed key correctly before saving
- **Security**: Keys masked by default to prevent shoulder-surfing
- **Common Pattern**: Familiar from password managers and banking apps
- **Trust**: Shows we care about security best practices

**Implementation**:

- Input type switches between "text" and "password"
- Button positioned absolutely in input field (right side)
- State tracks visibility for each key separately
- Uses lucide-react EyeIcon and EyeOffIcon

**Alternatives Considered**:

1. **Always Show Keys**
   - Pros: Simpler code, easier to verify
   - Cons: Security risk, unprofessional

2. **Never Show Keys**
   - Pros: Maximum security
   - Cons: Hard to verify, frustrating if mistyped

3. **Show Last 4 Characters Only**
   - Pros: Balance security and verification
   - Cons: Still hard to verify full key, more complex logic

**Trade-offs**:

- ✅ Pros: Standard pattern, good UX/security balance, simple to implement
- ❌ Cons: Slightly more state to manage, requires icon imports

### Decision: Use useIsMobile Hook for Responsive Resizable Direction

**Decision**: Use the existing `useIsMobile` hook to determine ResizablePanelGroup direction (horizontal vs vertical).

**Rationale**:

- **Consistency**: Same breakpoint (768px) used across app
- **DRY Principle**: Reuse existing responsive logic
- **Performance**: Hook efficiently uses matchMedia API
- **Maintainability**: Single source of truth for mobile breakpoint

**Implementation**:

```tsx
const isMobile = useIsMobile();
<ResizablePanelGroup direction={isMobile ? "vertical" : "horizontal"}>
```

**Alternatives Considered**:

1. **CSS Media Queries Only**
   - Pros: No JavaScript needed
   - Cons: Can't change component structure, only styling

2. **Window Width State**
   - Pros: Direct control
   - Cons: Reinventing the wheel, inconsistent with rest of app

**Trade-offs**:

- ✅ Pros: Reuses existing code, consistent behavior, efficient
- ❌ Cons: Couples to existing breakpoint definition (but that's intentional)

### Impact on Future Development

This options page implementation impacts future work:

1. **Settings Management**
   - All user-configurable settings in one place
   - Easy to add new settings cards
   - Can add import/export settings feature
   - Ready for settings sync in Phase 2

2. **Memory Management**
   - Full-featured memory CRUD interface
   - Can add bulk operations (import CSV, export JSON)
   - Search/filter/sort already implemented via EntryList
   - Resizable layout supports power users

3. **API Key Flow**
   - Clear UI for BYOK (Bring Your Own Key) approach
   - Can add key validation status indicators
   - Can add usage/quota tracking in future
   - Easy to add more AI providers

4. **Onboarding**
   - Can add first-run tutorial highlighting settings
   - Can add tooltips/hints for each setting
   - Can add "Getting Started" card with links

5. **Testing**
   - Clear component boundaries for unit testing
   - Settings isolated from memory UI
   - Easy to mock settings store for testing

## [2025-10-26] Field Component Pattern for Forms

### Decision: Use shadcn/ui Field Components Instead of Custom Form Layouts

**Decision**: Refactor all form fields to use the Field component pattern from shadcn/ui for better organization, consistency, and accessibility.

**Rationale**:

- **Consistency**: Unified form field structure across the entire application
- **Accessibility**: Field components provide built-in ARIA attributes and semantic HTML
- **Better Organization**: FieldGroup, FieldLabel, FieldDescription provide clear hierarchy
- **Error Handling**: FieldError component designed to work with validation libraries
- **Responsive Support**: Field orientation prop (vertical/horizontal/responsive) makes layouts flexible
- **Less Custom Code**: Leverage pre-built accessible components instead of custom markup

**Implementation Details**:

1. **Trigger Mode Field**:

```tsx
<Field data-invalid={false}>
  <FieldLabel htmlFor={triggerId}>
    Trigger Mode <Badge variant="secondary">Coming Soon</Badge>
  </FieldLabel>
  <Select...>...</Select>
  <FieldDescription>
    Currently only popup mode is supported
  </FieldDescription>
</Field>
```

2. **API Key Fields with FieldGroup**:

```tsx
<FieldGroup>
  <Field data-invalid={false}>
    <FieldLabel htmlFor={openaiKeyId}>OpenAI API Key</FieldLabel>
    <Input type="password" ... />
  </Field>
  <Field data-invalid={false}>
    <FieldLabel htmlFor={anthropicKeyId}>Anthropic API Key</FieldLabel>
    <Input type="password" ... />
  </Field>
</FieldGroup>
```

3. **Horizontal Layout for Switch**:

```tsx
<Field orientation="horizontal" data-invalid={false}>
  <FieldContent>
    <FieldLabel htmlFor={autofillEnabledId}>Enable Autofill</FieldLabel>
    <FieldDescription>
      Automatically fill forms with your stored memories
    </FieldDescription>
  </FieldContent>
  <Switch id={autofillEnabledId} ... />
</Field>
```

4. **Slider with Dynamic Description**:

```tsx
<Field data-invalid={false}>
  <FieldLabel htmlFor={confidenceThresholdId}>
    Confidence Threshold
  </FieldLabel>
  <Slider ... />
  <FieldDescription>
    Minimum confidence score required for autofill suggestions
    (currently: {confidenceThreshold.toFixed(2)})
  </FieldDescription>
</Field>
```

**Alternatives Considered**:

1. **Keep Custom SliderWithInput Component**
   - Pros: Self-contained with built-in input field
   - Cons: Doesn't follow Field pattern, harder to maintain, less flexible

2. **Use Plain div/Label Combinations**
   - Pros: Simpler initially, full control
   - Cons: Inconsistent, no built-in accessibility, more custom code to maintain

3. **Use Form Library Wrapper (React Hook Form)**
   - Pros: Powerful validation, form state management
   - Cons: Overkill for simple settings form, more dependencies
   - Note: Already using TanStack Form in EntryForm component

**Trade-offs**:

- ✅ Pros:
  - Consistent form styling across app
  - Built-in accessibility features
  - Less custom CSS and markup
  - Easier to add validation in future
  - Better responsiveness with orientation prop
  - FieldGroup provides semantic grouping
  - FieldDescription improves UX with helpful hints

- ❌ Cons:
  - Slight learning curve for Field component API
  - More verbose than simple div/label
  - Need to import multiple Field sub-components
  - May need to adjust existing forms in other components

**Replaced Components**:

- **SliderWithInput**: Now uses `Field` + `Slider` + `FieldDescription` with dynamic value display
- **Custom Label + div layouts**: Now uses `Field` + `FieldLabel` + optional `FieldDescription`
- **Plain div wrappers**: Now uses `FieldGroup` for semantic grouping

**Impact on Future Development**:

1. **EntryForm Consistency**
   - Already using TanStack Form with Field components
   - Settings form now matches same pattern
   - Easy to apply validation when needed

2. **Other Forms**
   - Can apply same pattern to any future forms
   - Login forms, profile forms, etc. will be consistent
   - Easy to add FieldError for validation feedback

3. **Accessibility**
   - All forms now have proper ARIA labels
   - Screen reader friendly out of the box
   - Keyboard navigation works correctly

4. **Maintenance**
   - Single source of truth for form field styling
   - Changes to Field components affect all forms
   - Less custom CSS to maintain
