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
  // Split original texts into lines first
  const leftOriginalLines = leftText.split('\n')
  const rightOriginalLines = rightText.split('\n')

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
    ignoreWhitespace: false,
    newlineIsToken: true,
  })

  const leftDiffLines: TextDiffLine[] = []
  const rightDiffLines: TextDiffLine[] = []
  
  let leftLineIdx = 0
  let rightLineIdx = 0
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
      const removedLines = change.value.split('\n').filter(l => l !== '')
      const addedLines = nextChange.value.split('\n').filter(l => l !== '')
      
      const maxLines = Math.max(removedLines.length, addedLines.length)
      
      for (let j = 0; j < maxLines; j++) {
        const hasRemoved = j < removedLines.length
        const hasAdded = j < addedLines.length

        if (hasRemoved && hasAdded) {
          // Modified line - get original content
          const removedOriginal = leftOriginalLines[leftLineIdx] || ''
          const addedOriginal = rightOriginalLines[rightLineIdx] || ''
          
          // Perform word-level diff on the ORIGINAL text
          const wordDiffs = diffWords(removedOriginal, addedOriginal, { 
            ignoreCase: !options.caseSensitive,
            ignoreWhitespace: options.ignoreWhitespace || false
          })
          
          // Build changes array from the word diff
          const leftChanges: TextDiffChange[] = []
          const rightChanges: TextDiffChange[] = []
          
          for (const wordDiff of wordDiffs) {
            if (wordDiff.removed) {
              leftChanges.push({
                type: 'removed',
                value: wordDiff.value
              })
            } else if (wordDiff.added) {
              rightChanges.push({
                type: 'added',
                value: wordDiff.value
              })
            } else {
              // Unchanged portion
              leftChanges.push({ type: 'unchanged', value: wordDiff.value })
              rightChanges.push({ type: 'unchanged', value: wordDiff.value })
            }
          }

          leftDiffLines.push({
            lineNumber: leftLineIdx + 1,
            type: 'removed',
            content: removedOriginal,
            changes: leftChanges.length > 0 ? leftChanges : undefined,
          })
          rightDiffLines.push({
            lineNumber: rightLineIdx + 1,
            type: 'added',
            content: addedOriginal,
            changes: rightChanges.length > 0 ? rightChanges : undefined,
          })
          leftLineIdx++
          rightLineIdx++
          modified++
        } else if (hasRemoved) {
          const removedOriginal = leftOriginalLines[leftLineIdx] || ''
          leftDiffLines.push({
            lineNumber: leftLineIdx + 1,
            type: 'removed',
            content: removedOriginal,
            changes: [{ type: 'removed', value: removedOriginal }],
          })
          leftLineIdx++
          removed++
        } else if (hasAdded) {
          const addedOriginal = rightOriginalLines[rightLineIdx] || ''
          rightDiffLines.push({
            lineNumber: rightLineIdx + 1,
            type: 'added',
            content: addedOriginal,
            changes: [{ type: 'added', value: addedOriginal }],
          })
          rightLineIdx++
          added++
        }
      }
      i += 2 // Skip next change as we've processed it
    } else if (change.removed) {
      // Removed only
      const lines = change.value.split('\n').filter(l => l !== '')
      for (let j = 0; j < lines.length; j++) {
        const removedOriginal = leftOriginalLines[leftLineIdx] || ''
        leftDiffLines.push({
          lineNumber: leftLineIdx + 1,
          type: 'removed',
          content: removedOriginal,
          changes: [{ type: 'removed', value: removedOriginal }],
        })
        leftLineIdx++
        removed++
      }
      i++
    } else if (change.added) {
      // Added only
      const lines = change.value.split('\n').filter(l => l !== '')
      for (let j = 0; j < lines.length; j++) {
        const addedOriginal = rightOriginalLines[rightLineIdx] || ''
        rightDiffLines.push({
          lineNumber: rightLineIdx + 1,
          type: 'added',
          content: addedOriginal,
          changes: [{ type: 'added', value: addedOriginal }],
        })
        rightLineIdx++
        added++
      }
      i++
    } else {
      // Unchanged
      const lines = change.value.split('\n').filter(l => l !== '')
      for (let j = 0; j < lines.length; j++) {
        const leftOriginal = leftOriginalLines[leftLineIdx] || ''
        const rightOriginal = rightOriginalLines[rightLineIdx] || ''
        
        leftDiffLines.push({
          lineNumber: leftLineIdx + 1,
          type: 'unchanged',
          content: leftOriginal,
        })
        rightDiffLines.push({
          lineNumber: rightLineIdx + 1,
          type: 'unchanged',
          content: rightOriginal,
        })
        leftLineIdx++
        rightLineIdx++
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