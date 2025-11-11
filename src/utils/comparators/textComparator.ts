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

export function compareText(
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

  // Perform line-by-line diff
  const lineDiffs = diffLines(leftForDiff, rightForDiff, {
    ignoreWhitespace: false, // We already normalized above
    newlineIsToken: true,
  })

  const leftLines: TextDiffLine[] = []
  const rightLines: TextDiffLine[] = []
  let leftLineNumber = 1
  let rightLineNumber = 1

  let addedCount = 0
  let removedCount = 0
  let modifiedCount = 0

  for (const change of lineDiffs) {
    const lines = change.value.split('\n')
    // Remove empty last line if it exists (from split)
    if (lines[lines.length - 1] === '') {
      lines.pop()
    }

    if (change.added) {
      for (const line of lines) {
        if (line) {
          // Perform word-level diff for added lines to show inline changes
          const wordDiffs = diffWords('', line)
          const changes: TextDiffChange[] = wordDiffs.map(w => ({
            type: w.added ? 'added' : 'unchanged',
            value: w.value,
          }))

          rightLines.push({
            lineNumber: rightLineNumber++,
            type: 'added',
            content: line,
            changes,
          })
          addedCount++
        }
      }
    } else if (change.removed) {
      for (const line of lines) {
        if (line) {
          // Perform word-level diff for removed lines
          const wordDiffs = diffWords(line, '')
          const changes: TextDiffChange[] = wordDiffs.map(w => ({
            type: w.removed ? 'removed' : 'unchanged',
            value: w.value,
          }))

          leftLines.push({
            lineNumber: leftLineNumber++,
            type: 'removed',
            content: line,
            changes,
          })
          removedCount++
        }
      }
    } else {
      // Unchanged lines
      for (const line of lines) {
        if (line) {
          leftLines.push({
            lineNumber: leftLineNumber++,
            type: 'unchanged',
            content: line,
          })
          rightLines.push({
            lineNumber: rightLineNumber++,
            type: 'unchanged',
            content: line,
          })
        }
      }
    }
  }

  // Handle modified lines (where both added and removed occur together)
  // This is a simplified approach - in practice, we'd want to pair removed+added as modified
  modifiedCount = Math.min(addedCount, removedCount)
  addedCount -= modifiedCount
  removedCount -= modifiedCount

  return {
    identical: lineDiffs.every(d => !d.added && !d.removed),
    leftLines,
    rightLines,
    summary: {
      added: addedCount,
      removed: removedCount,
      modified: modifiedCount,
    },
  }
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