export type FormatType = 'json' | 'xml' | 'text'
export type ActionType = 'validate' | 'compare'

export interface AppState {
  formatType: FormatType
  actionType: ActionType
  leftContent: string
  rightContent: string
  options: ComparisonOptions
}

export interface ComparisonOptions {
  ignoreKeyOrder?: boolean
  ignoreArrayOrder?: boolean
  caseSensitive?: boolean
  ignoreWhitespace?: boolean
  ignoreAttributeOrder?: boolean
}

export interface ValidationResult {
  valid: boolean
  error?: {
    message: string
    line?: number
    column?: number
    [key: string]: any
  }
}

export interface SnackbarState {
  open: boolean
  message: string
  severity?: 'error' | 'warning' | 'info' | 'success'
}

interface ValidationError {
  message: string
  line?: number
  column?: number
  position?: number
  code?: string
}

export interface ComparisonResult {
  identical: boolean
  differences?: any[]
  summary?: {
    added: number
    removed: number
    modified: number
  }
  leftLines?: any[]
  rightLines?: any[]
  errors?: {
    left?: ValidationError
    right?: ValidationError
  }
}

