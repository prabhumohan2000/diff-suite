/**
 * Diff Checker Utility (shared)
 *
 * Copied from diff-checker/src/utils/diffChecker.ts to reuse the same
 * validation and comparison logic inside diff-suite without changing the UI.
 */

export type DiffType = 'added' | 'removed' | 'changed' | 'unchanged'

export interface DiffLine {
  type: DiffType
  content: string
  lineNumber: number
  correspondingLine?: number // Line number in the other input
}

export interface DiffResult {
  leftLines: DiffLine[]
  rightLines: DiffLine[]
  hasChanges: boolean
}

export interface DiffOptions {
  ignoreWhitespace?: boolean
  caseSensitive?: boolean
  ignoreKeyOrder?: boolean // For JSON comparison (not used directly here)
  ignoreAttributeOrder?: boolean // For XML comparison (not used directly here)
}

/**
 * Normalize a line based on diff options
 */
const normalizeLine = (line: string, options: DiffOptions): string => {
  let normalized = line

  if (options.ignoreWhitespace) {
    // Collapse all whitespace to single spaces and trim
    normalized = normalized.replace(/\s+/g, ' ').trim()
  }

  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase()
  }

  return normalized
}

/**
 * Recursively sort object keys for comparison
 * Used for JSON key order normalization
 */
export const sortObjectKeys = (obj: any): any => {
  if (obj === null || typeof obj !== 'object') {
    return obj
  }

  if (Array.isArray(obj)) {
    return obj.map(sortObjectKeys)
  }

  const sorted: any = {}
  Object.keys(obj)
    .sort()
    .forEach((key) => {
      sorted[key] = sortObjectKeys(obj[key])
    })

  return sorted
}

/**
 * Performs a simple line-by-line diff between two strings
 * Uses a basic LCS-inspired algorithm
 */
export const computeDiff = (
  left: string,
  right: string,
  options: DiffOptions = { ignoreWhitespace: false, caseSensitive: true, ignoreKeyOrder: false, ignoreAttributeOrder: false }
): DiffResult => {
  const leftLines = left.split('\n')
  const rightLines = right.split('\n')

  const leftResult: DiffLine[] = []
  const rightResult: DiffLine[] = []

  let hasChanges = false
  let leftIndex = 0
  let rightIndex = 0

  // Helper function to compare lines based on options
  const linesMatch = (leftLine: string, rightLine: string): boolean => {
    const normalizedLeft = normalizeLine(leftLine, options)
    const normalizedRight = normalizeLine(rightLine, options)
    return normalizedLeft === normalizedRight
  }

  // Simple diff algorithm
  while (leftIndex < leftLines.length || rightIndex < rightLines.length) {
    const leftLine = leftLines[leftIndex]
    const rightLine = rightLines[rightIndex]

    if (leftIndex >= leftLines.length) {
      // Only right lines remain - they are added
      rightResult.push({
        type: 'added',
        content: rightLine,
        lineNumber: rightIndex + 1,
      })
      hasChanges = true
      rightIndex++
    } else if (rightIndex >= rightLines.length) {
      // Only left lines remain - they are removed
      leftResult.push({
        type: 'removed',
        content: leftLine,
        lineNumber: leftIndex + 1,
      })
      hasChanges = true
      leftIndex++
    } else if (linesMatch(leftLine, rightLine)) {
      // Lines are identical
      leftResult.push({
        type: 'unchanged',
        content: leftLine,
        lineNumber: leftIndex + 1,
        correspondingLine: rightIndex + 1,
      })
      rightResult.push({
        type: 'unchanged',
        content: rightLine,
        lineNumber: rightIndex + 1,
        correspondingLine: leftIndex + 1,
      })
      leftIndex++
      rightIndex++
    } else {
      // Lines are different - check if next lines match
      const leftNextMatch = rightLines.findIndex((line, idx) => idx > rightIndex && linesMatch(leftLine, line))
      const rightNextMatch = leftLines.findIndex((line, idx) => idx > leftIndex && linesMatch(rightLine, line))

      if (leftNextMatch !== -1 && (rightNextMatch === -1 || leftNextMatch < rightNextMatch)) {
        // Right line was added
        rightResult.push({
          type: 'added',
          content: rightLine,
          lineNumber: rightIndex + 1,
        })
        hasChanges = true
        rightIndex++
      } else if (rightNextMatch !== -1) {
        // Left line was removed
        leftResult.push({
          type: 'removed',
          content: leftLine,
          lineNumber: leftIndex + 1,
        })
        hasChanges = true
        leftIndex++
      } else {
        // Lines are changed
        leftResult.push({
          type: 'changed',
          content: leftLine,
          lineNumber: leftIndex + 1,
          correspondingLine: rightIndex + 1,
        })
        rightResult.push({
          type: 'changed',
          content: rightLine,
          lineNumber: rightIndex + 1,
          correspondingLine: leftIndex + 1,
        })
        hasChanges = true
        leftIndex++
        rightIndex++
      }
    }
  }

  return {
    leftLines: leftResult,
    rightLines: rightResult,
    hasChanges,
  }
}

/**
 * Computes character-level diff for a single line
 * Useful for highlighting specific changes within a line
 */
export const computeLineDiff = (
  left: string,
  right: string
): { same: boolean; parts: Array<{ value: string; added?: boolean; removed?: boolean }> } => {
  if (left === right) {
    return { same: true, parts: [{ value: left }] }
  }

  // Simple character-level diff
  const parts: Array<{ value: string; added?: boolean; removed?: boolean }> = []
  let i = 0
  let j = 0

  while (i < left.length || j < right.length) {
    if (i < left.length && j < right.length && left[i] === right[j]) {
      // Characters match
      let matchStr = ''
      while (i < left.length && j < right.length && left[i] === right[j]) {
        matchStr += left[i]
        i++
        j++
      }
      parts.push({ value: matchStr })
    } else {
      // Characters differ
      let removedStr = ''
      let addedStr = ''

      if (i < left.length) {
        removedStr = left[i]
        i++
      }

      if (j < right.length) {
        addedStr = right[j]
        j++
      }

      if (removedStr) parts.push({ value: removedStr, removed: true })
      if (addedStr) parts.push({ value: addedStr, added: true })
    }
  }

  return { same: false, parts }
}

