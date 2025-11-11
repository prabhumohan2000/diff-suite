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

