import { computeLineDiff, type DiffLine } from '../diffUtils/diffChecker'

export interface TextDiffLine {
  lineNumber: number
  type: 'added' | 'removed' | 'unchanged' | 'modified'
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

function normalizeLineEndings(s: string) {
  return s.replace(/\r\n?/g, '\n')
}

function computeTextDiff(
  left: string,
  right: string,
  options: ComparisonOptions
): { leftLines: DiffLine[]; rightLines: DiffLine[] } {
  const leftLinesRaw = normalizeLineEndings(left ?? '').split('\n')
  const rightLinesRaw = normalizeLineEndings(right ?? '').split('\n')

  const normalize = (s: string) => {
    let n = s
    if (options.ignoreWhitespace) {
      // Ignore all whitespace differences (spaces, tabs, etc.)
      n = n.replace(/\s+/g, '')
    }
    if (options.caseSensitive === false) {
      n = n.toLowerCase()
    }
    return n
  }

  // When ignoring whitespace, check if the full normalized texts are identical first.
  // This handles cases where lines are split/merged differently but content is the same.
  if (options.ignoreWhitespace) {
    const leftFullNorm = normalize(left ?? '')
    const rightFullNorm = normalize(right ?? '')

    if (leftFullNorm === rightFullNorm) {
      // Texts are identical when whitespace is ignored - mark all lines as unchanged
      const leftResult: DiffLine[] = leftLinesRaw.map((content, idx) => ({
        type: 'unchanged',
        content,
        lineNumber: idx + 1,
        correspondingLine: Math.min(idx + 1, rightLinesRaw.length)
      }))

      const rightResult: DiffLine[] = rightLinesRaw.map((content, idx) => ({
        type: 'unchanged',
        content,
        lineNumber: idx + 1,
        correspondingLine: Math.min(idx + 1, leftLinesRaw.length)
      }))

      return { leftLines: leftResult, rightLines: rightResult }
    }
  }

  const leftNorm = leftLinesRaw.map(normalize)
  const rightNorm = rightLinesRaw.map(normalize)

  const leftResult: DiffLine[] = []
  const rightResult: DiffLine[] = []

  let li = 0
  let ri = 0

  while (li < leftLinesRaw.length || ri < rightLinesRaw.length) {
    const l = leftLinesRaw[li]
    const r = rightLinesRaw[ri]

    if (li >= leftLinesRaw.length) {
      rightResult.push({ type: 'added', content: r, lineNumber: ri + 1 })
      ri++
    } else if (ri >= rightLinesRaw.length) {
      leftResult.push({ type: 'removed', content: l, lineNumber: li + 1 })
      li++
    } else if (leftNorm[li] === rightNorm[ri]) {
      leftResult.push({ type: 'unchanged', content: l, lineNumber: li + 1, correspondingLine: ri + 1 })
      rightResult.push({ type: 'unchanged', content: r, lineNumber: ri + 1, correspondingLine: li + 1 })
      li++
      ri++
    } else {
      const leftNextMatch = rightNorm.indexOf(leftNorm[li], ri + 1)
      const rightNextMatch = leftNorm.indexOf(rightNorm[ri], li + 1)
      if (leftNextMatch !== -1 && (rightNextMatch === -1 || leftNextMatch < rightNextMatch)) {
        rightResult.push({ type: 'added', content: r, lineNumber: ri + 1 })
        ri++
      } else if (rightNextMatch !== -1) {
        leftResult.push({ type: 'removed', content: l, lineNumber: li + 1 })
        li++
      } else {
        leftResult.push({ type: 'changed', content: l, lineNumber: li + 1, correspondingLine: ri + 1 })
        rightResult.push({ type: 'changed', content: r, lineNumber: ri + 1, correspondingLine: li + 1 })
        li++
        ri++
      }
    }
  }

  // When ignoring whitespace, avoid treating pure line-wrapping changes
  // (e.g., newline vs space) as added/removed lines if the textual content
  // still exists on the opposite side.
  if (options.ignoreWhitespace) {
    const relaxLineMoves = (
      main: DiffLine[],
      mainNorm: string[],
      otherNorm: string[]
    ) => {
      for (let i = 0; i < main.length; i++) {
        const line = main[i]
        if (line.type !== 'removed' && line.type !== 'added') continue

        const idx = (line.lineNumber ?? 1) - 1
        const normalized = mainNorm[idx] ?? ''

        // Empty lines (after normalization) should be treated as unchanged when ignoring whitespace
        if (!normalized) {
          main[i] = {
            ...line,
            type: 'unchanged',
          }
          continue
        }

        // Check if this exact normalized content exists in the other side
        const existsInOther = otherNorm.some((n) => n === normalized)
        if (existsInOther) {
          main[i] = {
            ...line,
            type: 'unchanged',
          }
        }
      }
    }

    relaxLineMoves(leftResult, leftNorm, rightNorm)
    relaxLineMoves(rightResult, rightNorm, leftNorm)
  }

  return { leftLines: leftResult, rightLines: rightResult }
}

function buildTextLines(
  lines: DiffLine[],
  oppositeLines: DiffLine[],
  isLeft: boolean,
  options: ComparisonOptions
): TextDiffLine[] {
  return lines.map((line, idx) => {
    const mappedType: TextDiffLine['type'] =
      line.type === 'changed'
        ? 'modified'
        : line.type === 'added' || line.type === 'removed'
          ? line.type
          : 'unchanged'

    const base: TextDiffLine = {
      lineNumber: line.lineNumber,
      type: mappedType,
      content: line.content,
    }

    const opposite = oppositeLines[idx]
    if (line.type === 'changed' && opposite?.type === 'changed') {
      const [content1, content2] = isLeft
        ? [line.content ?? '', opposite.content ?? '']
        : [opposite.content ?? '', line.content ?? '']

      const diffParts = computeLineDiff(content1, content2, {
        ignoreWhitespace: !!options.ignoreWhitespace,
        caseSensitive: options.caseSensitive !== false,
      }).parts

      base.changes = diffParts.map((p) => {
        if (isLeft) {
          // For the left side, show removals (old text) and treat additions
          // as empty spans so they don't appear as changes on this side.
          return p.removed
            ? { type: 'removed', value: p.value }
            : p.added
              ? { type: 'added', value: '' }
              : { type: 'unchanged', value: p.value }
        }

        // For the right side, show additions (new text) and treat removals
        // as empty spans so they don't appear as changes on this side.
        return p.added
          ? { type: 'added', value: p.value }
          : p.removed
            ? { type: 'removed', value: '' }
            : { type: 'unchanged', value: p.value }
      })
    }

    return base
  })
}

// Enhanced version that properly detects modified lines
export function compareTextEnhanced(
  leftText: string,
  rightText: string,
  options: ComparisonOptions = {}
): ComparisonResult {
  const diffOptions: ComparisonOptions = {
    ignoreWhitespace: !!options.ignoreWhitespace,
    caseSensitive: options.caseSensitive !== false,
  }

  // When ignoring whitespace, treat all text as a single logical line so that
  // line-wrapping differences (spaces vs newlines) don't produce extra lines
  // or counts. Only substantive text changes are highlighted inline.
  // Default path: line-aware diff with inline character changes.
  const diffResult = computeTextDiff(leftText ?? '', rightText ?? '', diffOptions)

  const added = diffResult.rightLines.filter((x) => x.type === 'added').length
  const removed = diffResult.leftLines.filter((x) => x.type === 'removed').length
  const modified = Math.min(
    diffResult.leftLines.filter((x) => x.type === 'changed').length,
    diffResult.rightLines.filter((x) => x.type === 'changed').length
  )

  const leftLines = buildTextLines(diffResult.leftLines, diffResult.rightLines, true, diffOptions)
  const rightLines = buildTextLines(diffResult.rightLines, diffResult.leftLines, false, diffOptions)

  return {
    identical: added === 0 && removed === 0 && modified === 0,
    leftLines,
    rightLines,
    summary: {
      added,
      removed,
      modified,
    },
  }
}
