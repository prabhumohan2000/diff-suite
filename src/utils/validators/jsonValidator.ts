export interface ValidationError {
  message: string
  line?: number
  column?: number
  position?: number
}

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
}

export function validateJSON(jsonString: string): ValidationResult {
  // Basic empty-input check
  if (!jsonString.trim()) {
    return {
      valid: false,
      error: {
        message: 'Empty input',
      },
    }
  }

  try {
    const parsed = JSON.parse(jsonString)

    // Enforce object/array as the top-level JSON type so that
    // bare primitives like "t", 123, true, null are treated as
    // invalid for this tool's use cases.
    const isContainer = parsed !== null && typeof parsed === 'object'
    if (!isContainer) {
      return {
        valid: false,
        error: {
          message: 'Top-level JSON must be an object or array',
        },
      }
    }

    return { valid: true }
  } catch (error) {
    if (error instanceof SyntaxError) {
      let message = error.message
      
      // Try to extract line and column from error message
      const lineMatch = message.match(/position (\d+)/)
      const position = lineMatch ? parseInt(lineMatch[1], 10) : undefined
      
      let line: number | undefined
      let column: number | undefined
      
      if (position !== undefined) {
        const lines = jsonString.substring(0, position).split('\n')
        line = lines.length
        column = lines[lines.length - 1].length + 1
      }

      // Normalize message by stripping environment-specific prefixes/suffixes
      message =
        message
          .replace(/JSON\.parse:\s*/i, '')
          .replace(/in JSON at position \d+/i, '')
          .trim() || 'Invalid JSON syntax'

      // Heuristic: detect common trailing comma patterns and provide
      // a clearer, user-friendly error message that mentions "comma"
      if (/,(\s*)[}\]]/.test(jsonString)) {
        message = 'Trailing comma in JSON (remove the extra comma)'
      }

      return {
        valid: false,
        error: {
          message,
          line,
          column,
          position,
        },
      }
    }

    return {
      valid: false,
      error: {
        message: 'Unknown error occurred while parsing JSON',
      },
    }
  }
}

