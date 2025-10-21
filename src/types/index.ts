// Core data structures

export interface MemoryEntry {
  id: string                    // UUID v7
  syncId?: string               // Phase 2 only
  question?: string             // Optional question
  answer: string                // Required answer/thought
  category: string              // AI-generated category
  tags: string[]                // AI + manual tags
  confidence: number            // AI confidence score (0-1)
  metadata: {
    createdAt: string           // ISO timestamp
    updatedAt: string           // ISO timestamp
    source: 'manual' | 'import' // Entry source
    usageCount: number          // Times used for form filling
    lastUsed?: string           // ISO timestamp
  }
  embedding?: number[]          // Phase 2: Vector embedding
}

export interface FormField {
  element: HTMLElement
  type: string                  // 'text' | 'email' | 'textarea' | etc.
  name: string                  // Field name/id
  label: string                 // Visible label
  placeholder?: string
  required: boolean
  currentValue: string
}

export interface FormMapping {
  url: string
  fields: FormField[]
  matches: Map<FormField, MemoryEntry[]>  // Field → potential matches
  confidence: number                       // Overall confidence
  timestamp: string
}

export interface SyncState {
  syncUrl: string               // Phase 2: Unique sync URL
  syncToken: string             // Phase 2: Auth token
  lastSync: string              // ISO timestamp
  conflictResolution: 'local' | 'remote' | 'newest'
  status: 'synced' | 'pending' | 'error'
}
