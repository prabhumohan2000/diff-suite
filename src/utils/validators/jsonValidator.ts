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
  if (!jsonString.trim()) {
    return {
      valid: false,
      error: {
        message: 'Empty input',
      },
    }
  }

  try {
    JSON.parse(jsonString)
    return { valid: true }
  } catch (error) {
    if (error instanceof SyntaxError) {
      const message = error.message
      
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

      return {
        valid: false,
        error: {
          message: message.replace(/JSON\.parse: /, '').replace(/in JSON at position \d+/, '').trim() || 'Invalid JSON syntax',
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

