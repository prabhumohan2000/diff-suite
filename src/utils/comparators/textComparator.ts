import { diffLines, diffWords, Change } from 'diff'

export interface TextDiffLine {
  lineNumber: number
  type: 'added' | 'removed' | 'unchanged'
  content: string
  changes?: TextDiffChange[]
}

export interface TextDiffChange {
  type: 'added' | 'removed' | 'unchanged'
  value: string
}

export interface ComparisonOptions {
  caseSensitive?: boolean
  ignoreWhitespace?: boolean
}

export interface ComparisonResult {
  identical: boolean
  leftLines: TextDiffLine[]
  rightLines: TextDiffLine[]
  summary: {
    added: number
    removed: number
    modified: number
  }
}

function normalizeText(text: string, options: ComparisonOptions): string {
  if (options.ignoreWhitespace) {
    return text.replace(/\s+/g, ' ').trim()
  }
  return text
}

// Enhanced version that properly detects modified lines
export function compareTextEnhanced(
  leftText: string,
  rightText: string,
  options: ComparisonOptions = {}
): ComparisonResult {
  // Prepare text for diffing based on options
  const textForDiff = (text: string) => {
    let result = text
    if (options.ignoreWhitespace) {
      result = normalizeText(result, options)
    }
    if (!options.caseSensitive) {
      result = result.toLowerCase()
    }
    return result
  }

  const leftForDiff = textForDiff(leftText)
  const rightForDiff = textForDiff(rightText)

  // Use diffLines to get the diff
  const lineDiffs = diffLines(leftForDiff, rightForDiff, {
    ignoreWhitespace: false, // We already normalized above
    newlineIsToken: false,
  })

  const leftDiffLines: TextDiffLine[] = []
  const rightDiffLines: TextDiffLine[] = []
  
  let leftLineNum = 1
  let rightLineNum = 1
  let added = 0
  let removed = 0
  let modified = 0

  // Process diff to identify added, removed, and modified lines
  let i = 0
  while (i < lineDiffs.length) {
    const change = lineDiffs[i]
    const nextChange = i + 1 < lineDiffs.length ? lineDiffs[i + 1] : null

    if (change.removed && nextChange && nextChange.added) {
      // This is a modification (removed followed by added)
      const removedLines = change.value.split('\n').filter(l => l)
      const addedLines = nextChange.value.split('\n').filter(l => l)
      
      const maxLines = Math.max(removedLines.length, addedLines.length)
      for (let j = 0; j < maxLines; j++) {
        const removedLine = removedLines[j]
        const addedLine = addedLines[j]

        if (removedLine && addedLine) {
          // Modified line - show word-level diff
          const removedForDiff = textForDiff(removedLine)
          const addedForDiff = textForDiff(addedLine)
          const wordDiffs = diffWords(removedForDiff, addedForDiff, { ignoreWhitespace: false })
          const changes: TextDiffChange[] = wordDiffs.map(w => ({
            type: w.added ? 'added' : w.removed ? 'removed' : 'unchanged',
            value: w.value,
          }))

          leftDiffLines.push({
            lineNumber: leftLineNum++,
            type: 'removed',
            content: removedLine,
            changes: changes.filter(c => c.type !== 'added'),
          })
          rightDiffLines.push({
            lineNumber: rightLineNum++,
            type: 'added',
            content: addedLine,
            changes: changes.filter(c => c.type !== 'removed'),
          })
          modified++
        } else if (removedLine) {
          leftDiffLines.push({
            lineNumber: leftLineNum++,
            type: 'removed',
            content: removedLine,
          })
          removed++
        } else if (addedLine) {
          rightDiffLines.push({
            lineNumber: rightLineNum++,
            type: 'added',
            content: addedLine,
          })
          added++
        }
      }
      i += 2 // Skip next change as we've processed it
    } else if (change.removed) {
      // Removed only
      const lines = change.value.split('\n').filter(l => l)
      for (const line of lines) {
        leftDiffLines.push({
          lineNumber: leftLineNum++,
          type: 'removed',
          content: line,
        })
        removed++
      }
      i++
    } else if (change.added) {
      // Added only
      const lines = change.value.split('\n').filter(l => l)
      for (const line of lines) {
        rightDiffLines.push({
          lineNumber: rightLineNum++,
          type: 'added',
          content: line,
        })
        added++
      }
      i++
    } else {
      // Unchanged
      const lines = change.value.split('\n').filter(l => l)
      for (const line of lines) {
        leftDiffLines.push({
          lineNumber: leftLineNum++,
          type: 'unchanged',
          content: line,
        })
        rightDiffLines.push({
          lineNumber: rightLineNum++,
          type: 'unchanged',
          content: line,
        })
      }
      i++
    }
  }

  return {
    identical: added === 0 && removed === 0 && modified === 0,
    leftLines: leftDiffLines,
    rightLines: rightDiffLines,
    summary: {
      added,
      removed,
      modified,
    },
  }
}