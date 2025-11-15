import { XMLParser } from 'fast-xml-parser'

export interface ValidationError {
  message: string
  line?: number
  column?: number
  code?: string
}

export interface ValidationResult {
  valid: boolean
  error?: ValidationError
}

export function validateXML(xmlString: string): ValidationResult {
  // Empty input is always invalid
  if (!xmlString.trim()) {
    return {
      valid: false,
      error: {
        message: 'Empty input',
      },
    }
  }

  // XML 1.0 does not allow most control characters (including \x00)
  // Only allow tab (0x09), line feed (0x0A), and carriage return (0x0D)
  const illegalControlCharPattern = /[\x00-\x08\x0B\x0C\x0E-\x1F]/
  if (illegalControlCharPattern.test(xmlString)) {
    return {
      valid: false,
      error: {
        message: 'Illegal control character in XML',
      },
    }
  }

  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: true,
    numberParseOptions: {
      hex: true,
      leadingZeros: true
    },
    stopNodes: [],
    isArray: () => false
  })

  try {
    const result = parser.parse(xmlString, true)
    // If parsing succeeds, validate it's not just whitespace
    if (result === null || result === undefined) {
      return {
        valid: false,
        error: {
          message: 'Empty XML document',
        },
      }
    }
    return { valid: true }
  } catch (error: any) {
    if (error && typeof error === 'object') {
      const xmlError = error
      
      // fast-xml-parser provides error details
      let line: number | undefined
      let column: number | undefined
      
      // Try to extract line/column from error
      if (xmlError.line !== undefined) {
        line = xmlError.line
      }
      if (xmlError.col !== undefined) {
        column = xmlError.col
      }

      // If not available, try to estimate from error position or message
      if (!line && xmlString) {
        const errMsg = xmlError.message || xmlError.err?.msg || String(xmlError)
        const match = errMsg.match(/position\s+(\d+)/i) || errMsg.match(/at\s+(\d+)/i)
        if (match) {
          const pos = parseInt(match[1], 10)
          if (pos < xmlString.length) {
            const lines = xmlString.substring(0, pos).split('\n')
            line = lines.length
            column = lines[lines.length - 1].length + 1
          }
        }
      }

      const errorMessage = xmlError.message || xmlError.err?.msg || 'Invalid XML syntax'

      return {
        valid: false,
        error: {
          message: errorMessage,
          line,
          column,
          code: xmlError.code,
        },
      }
    }

    return {
      valid: false,
      error: {
        message: error?.message || 'Unknown error occurred while parsing XML',
      },
    }
  }
}

