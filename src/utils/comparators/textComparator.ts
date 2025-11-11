import { diffLines, diffWords } from 'diff'

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

export function compareTextEnhanced(
  leftText: string,
  rightText: string,
  options: ComparisonOptions = {}
): ComparisonResult {
  // Split original texts into lines - preserve original content
  const leftOriginalLines = leftText.split('\n')
  const rightOriginalLines = rightText.split('\n')

  // Prepare normalized versions for comparison
  const prepareForComparison = (lines: string[]) => {
    return lines.map(line => {
      let result = line
      if (options.ignoreWhitespace) {
        result = normalizeText(result, options)
      }
      if (!options.caseSensitive) {
        result = result.toLowerCase()
      }
      return result
    })
  }

  const leftNormalized = prepareForComparison(leftOriginalLines)
  const rightNormalized = prepareForComparison(rightOriginalLines)

  // Perform line diff on normalized content
  const lineDiffs = diffLines(leftNormalized.join('\n'), rightNormalized.join('\n'), {
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

  // Process diffs while tracking original line indices
  let i = 0
  while (i < lineDiffs.length) {
    const change = lineDiffs[i]
    const nextChange = i + 1 < lineDiffs.length ? lineDiffs[i + 1] : null

    // Count lines in this change (excluding trailing empty string from split)
    const getLineCount = (value: string) => {
      const lines = value.split('\n')
      return lines[lines.length - 1] === '' ? lines.length - 1 : lines.length
    }

    if (change.removed && nextChange && nextChange.added) {
      // Modification: removed lines followed by added lines
      const removedCount = getLineCount(change.value)
      const addedCount = getLineCount(nextChange.value)
      
      const maxLines = Math.max(removedCount, addedCount)
      
      for (let j = 0; j < maxLines; j++) {
        const hasRemoved = j < removedCount && leftLineIdx < leftOriginalLines.length
        const hasAdded = j < addedCount && rightLineIdx < rightOriginalLines.length

        if (hasRemoved && hasAdded) {
          // Modified line - use original content for display
          const leftOriginal = leftOriginalLines[leftLineIdx]
          const rightOriginal = rightOriginalLines[rightLineIdx]
          
          // Perform word-level diff on original text
          const wordDiffs = diffWords(leftOriginal, rightOriginal, { 
            ignoreCase: !options.caseSensitive,
            ignoreWhitespace: options.ignoreWhitespace || false
          })
          
          const leftChanges: TextDiffChange[] = []
          const rightChanges: TextDiffChange[] = []
          
          for (const wordDiff of wordDiffs) {
            if (wordDiff.removed) {
              leftChanges.push({ type: 'removed', value: wordDiff.value })
            } else if (wordDiff.added) {
              rightChanges.push({ type: 'added', value: wordDiff.value })
            } else {
              leftChanges.push({ type: 'unchanged', value: wordDiff.value })
              rightChanges.push({ type: 'unchanged', value: wordDiff.value })
            }
          }

          leftDiffLines.push({
            lineNumber: leftLineIdx + 1,
            type: 'removed',
            content: leftOriginal,
            changes: leftChanges,
          })
          rightDiffLines.push({
            lineNumber: rightLineIdx + 1,
            type: 'added',
            content: rightOriginal,
            changes: rightChanges,
          })
          
          leftLineIdx++
          rightLineIdx++
          modified++
        } else if (hasRemoved) {
          // Extra removed line
          const leftOriginal = leftOriginalLines[leftLineIdx]
          leftDiffLines.push({
            lineNumber: leftLineIdx + 1,
            type: 'removed',
            content: leftOriginal,
            changes: [{ type: 'removed', value: leftOriginal }],
          })
          leftLineIdx++
          removed++
        } else if (hasAdded) {
          // Extra added line
          const rightOriginal = rightOriginalLines[rightLineIdx]
          rightDiffLines.push({
            lineNumber: rightLineIdx + 1,
            type: 'added',
            content: rightOriginal,
            changes: [{ type: 'added', value: rightOriginal }],
          })
          rightLineIdx++
          added++
        }
      }
      i += 2 // Skip the next change as we've processed both
    } else if (change.removed) {
      // Only removed lines
      const lineCount = getLineCount(change.value)
      for (let j = 0; j < lineCount && leftLineIdx < leftOriginalLines.length; j++) {
        const leftOriginal = leftOriginalLines[leftLineIdx]
        leftDiffLines.push({
          lineNumber: leftLineIdx + 1,
          type: 'removed',
          content: leftOriginal,
          changes: [{ type: 'removed', value: leftOriginal }],
        })
        leftLineIdx++
        removed++
      }
      i++
    } else if (change.added) {
      // Only added lines
      const lineCount = getLineCount(change.value)
      for (let j = 0; j < lineCount && rightLineIdx < rightOriginalLines.length; j++) {
        const rightOriginal = rightOriginalLines[rightLineIdx]
        rightDiffLines.push({
          lineNumber: rightLineIdx + 1,
          type: 'added',
          content: rightOriginal,
          changes: [{ type: 'added', value: rightOriginal }],
        })
        rightLineIdx++
        added++
      }
      i++
    } else {
      // Unchanged lines
      const lineCount = getLineCount(change.value)
      for (let j = 0; j < lineCount; j++) {
        if (leftLineIdx < leftOriginalLines.length && rightLineIdx < rightOriginalLines.length) {
          const leftOriginal = leftOriginalLines[leftLineIdx]
          const rightOriginal = rightOriginalLines[rightLineIdx]
          
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