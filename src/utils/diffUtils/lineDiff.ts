import { diffLines } from 'diff'

export interface LineDiffResult {
  leftLines: Array<{
    lineNumber: number
    type: 'added' | 'removed' | 'unchanged'
    content: string
  }>
  rightLines: Array<{
    lineNumber: number
    type: 'added' | 'removed' | 'unchanged'
    content: string
  }>
}

export function createLineDiff(
  leftText: string,
  rightText: string,
  options: { ignoreWhitespace?: boolean; caseSensitive?: boolean } = {}
): LineDiffResult {

  // When ignoreWhitespace is enabled and the texts are identical after normalization,
  // we want to show the original text on both sides (to show what was ignored)
  // rather than using diffLines which would show the same content on both sides.
  if (options.ignoreWhitespace) {
    const lineDiffs = diffLines(leftText, rightText, {
      ignoreWhitespace: true,
      newlineIsToken: false,
    })

    // Check if they're identical after ignoring whitespace
    const hasChanges = lineDiffs.some(change => change.added || change.removed)

    if (!hasChanges) {
      // They're identical - show original text on both sides without diff highlighting
      const leftLines = leftText.split('\n')
      const rightLines = rightText.split('\n')
      const maxLines = Math.max(leftLines.length, rightLines.length)

      const leftDiffLines: LineDiffResult['leftLines'] = []
      const rightDiffLines: LineDiffResult['rightLines'] = []

      for (let i = 0; i < maxLines; i++) {
        if (i < leftLines.length) {
          leftDiffLines.push({
            lineNumber: i + 1,
            type: 'unchanged',
            content: leftLines[i],
          })
        }
        if (i < rightLines.length) {
          rightDiffLines.push({
            lineNumber: i + 1,
            type: 'unchanged',
            content: rightLines[i],
          })
        }
      }

      return {
        leftLines: leftDiffLines,
        rightLines: rightDiffLines,
      }
    }
  }

  // Normal diff with highlighting
  const lineDiffs = diffLines(leftText, rightText, {
    ignoreWhitespace: options.ignoreWhitespace || false,
    newlineIsToken: false,
  })

  const leftDiffLines: LineDiffResult['leftLines'] = []
  const rightDiffLines: LineDiffResult['rightLines'] = []

  let leftLineNum = 1
  let rightLineNum = 1

  for (const change of lineDiffs) {
    const lines = change.value.split('\n')
    // Remove empty last line if it exists
    if (lines[lines.length - 1] === '') {
      lines.pop()
    }

    if (change.added) {
      for (const line of lines) {
        if (line !== undefined) {
          rightDiffLines.push({
            lineNumber: rightLineNum++,
            type: 'added',
            content: line,
          })
        }
      }
    } else if (change.removed) {
      for (const line of lines) {
        if (line !== undefined) {
          leftDiffLines.push({
            lineNumber: leftLineNum++,
            type: 'removed',
            content: line,
          })
        }
      }
    } else {
      // Unchanged
      for (const line of lines) {
        if (line !== undefined) {
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
      }
    }
  }

  return {
    leftLines: leftDiffLines,
    rightLines: rightDiffLines,
  }
}


