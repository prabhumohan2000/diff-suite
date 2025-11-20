import { compareJSON } from '../utils/comparators/jsonComparator'
import { compareXML } from '../utils/comparators/xmlComparator'
import { validateJSON } from '../utils/validators/jsonValidator'
import { validateXML } from '../utils/validators/xmlValidator'
import { createLineDiff } from '../utils/diffUtils/lineDiff'
import { computeLineDiff, type DiffResult, type DiffLine } from '../utils/diffUtils/diffChecker'
import { normalizeXMLAttributes } from '../utils/diffUtils/xmlNormalizer'
import { prettifyXML } from '../utils/diffUtils/xmlFormatter'
import { compareTextEnhanced } from '@/utils/comparators/textComparator'

type MessageIn = {
  id: string
  left: string
  right: string
  formatType: string
  options: any
}

type PostResult = {
  id: string
  result?: any
  error?: string
  type?: 'result' | 'error'
}

type ProgressMsg = {
  id: string
  type: 'progress'
  progress?: number
  message?: string
}

function postProgress(id: string, progress?: number, message?: string) {
  const out: ProgressMsg = { id, type: 'progress', progress, message }
  // @ts-ignore
  self.postMessage(out)
}

// Progressive diff for large inputs: chunk by lines and yield progress
function computeDiffProgressive(
  left: string,
  right: string,
  options: { ignoreWhitespace?: boolean; caseSensitive?: boolean },
  onProgress: (p: number) => void
) {
  return new Promise<DiffResult>((resolve) => {
    const leftLines = (left ?? '').split('\n')
    const rightLines = (right ?? '').split('\n')
    const total = Math.max(1, leftLines.length + rightLines.length)

    // Pre-normalize once to avoid repeated regex and lowercasing in the hot loop
    const normalize = (s: string) => {
      let n = s
      if (options.ignoreWhitespace) n = n.replace(/\s+/g, ' ').trim()
      if (options.caseSensitive === false) n = n.toLowerCase()
      return n
    }
    const leftNorm = leftLines.map(normalize)
    const rightNorm = rightLines.map(normalize)

    const leftResult: DiffLine[] = []
    const rightResult: DiffLine[] = []
    let hasChanges = false
    let li = 0
    let ri = 0

    const CHUNK = 500
    let lastReported = -1

    const step = () => {
      let processed = 0
      while ((li < leftLines.length || ri < rightLines.length) && processed < CHUNK) {
        const l = leftLines[li]
        const r = rightLines[ri]
        if (li >= leftLines.length) {
          rightResult.push({ type: 'added', content: r, lineNumber: ri + 1 })
          hasChanges = true
          ri++
        } else if (ri >= rightLines.length) {
          leftResult.push({ type: 'removed', content: l, lineNumber: li + 1 })
          hasChanges = true
          li++
        } else if (leftNorm[li] === rightNorm[ri]) {
          leftResult.push({ type: 'unchanged', content: l, lineNumber: li + 1, correspondingLine: ri + 1 })
          rightResult.push({ type: 'unchanged', content: r, lineNumber: ri + 1, correspondingLine: li + 1 })
          li++; ri++
        } else {
          const leftNextMatch = rightNorm.indexOf(leftNorm[li], ri + 1)
          const rightNextMatch = leftNorm.indexOf(rightNorm[ri], li + 1)
          if (leftNextMatch !== -1 && (rightNextMatch === -1 || leftNextMatch < rightNextMatch)) {
            rightResult.push({ type: 'added', content: r, lineNumber: ri + 1 })
            hasChanges = true
            ri++
          } else if (rightNextMatch !== -1) {
            leftResult.push({ type: 'removed', content: l, lineNumber: li + 1 })
            hasChanges = true
            li++
          } else {
            leftResult.push({ type: 'changed', content: l, lineNumber: li + 1, correspondingLine: ri + 1 })
            rightResult.push({ type: 'changed', content: r, lineNumber: ri + 1, correspondingLine: li + 1 })
            hasChanges = true
            li++; ri++
          }
        }
        processed++
        const p = Math.floor(((li + ri) / total) * 100)
        if (p !== lastReported) { lastReported = p; onProgress(p) }
      }
      if (li < leftLines.length || ri < rightLines.length) {
        setTimeout(step, 0)
      } else {
        // Avoid posting a terminal 100% progress. The UI hides on result.
        onProgress(99)
        resolve({ leftLines: leftResult, rightLines: rightResult, hasChanges })
      }
    }
    onProgress(0)
    setTimeout(step, 0)
  })
}

// Normalize all string values in a JSON-like structure according to options
function normalizeJSONStrings(
  value: any,
  options: { ignoreWhitespace?: boolean; caseSensitive?: boolean }
): any {
  if (typeof value === 'string') {
    let v = value
    if (options.ignoreWhitespace) {
      v = v.replace(/\s+/g, ' ').trim()
    }
    if (options.caseSensitive === false) {
      v = v.toLowerCase()
    }
    return v
  }
  if (Array.isArray(value)) {
    return value.map((item) => normalizeJSONStrings(item, options))
  }
  if (value && typeof value === 'object') {
    const out: any = {}
    for (const k of Object.keys(value)) {
      out[k] = normalizeJSONStrings(value[k], options)
    }
    return out
  }
  return value
}

// Canonicalize object key order for display when ignoreKeyOrder is enabled.
// Arrays keep their element order, but objects inside arrays are normalized.
function sortObjectKeysDeep(value: any): any {
  if (value === null || typeof value !== 'object') {
    return value
  }

  if (Array.isArray(value)) {
    return value.map((item) => sortObjectKeysDeep(item))
  }

  const out: any = {}
  const keys = Object.keys(value).sort()
  for (const key of keys) {
    const v = (value as any)[key]
    out[key] = v && typeof v === 'object' ? sortObjectKeysDeep(v) : v
  }
  return out
}

const processLines = (
  lines: Array<{ lineNumber: number; type: string; content?: string }>,
  oppositeLines: Array<{ lineNumber: number; type: string; content?: string }>,
  isLeft: boolean
) => {
  return lines.map((line, idx) => {
    const base: any = {
      lineNumber: line.lineNumber,
      type: line.type === 'changed' ? (isLeft ? 'removed' : 'added') : line.type,
      content: line.content
    };

    const oppositeLine = oppositeLines[idx];
    if (line.type === 'changed' && oppositeLine?.type === 'changed') {
      const [content1, content2] = isLeft 
        ? [line.content ?? '', oppositeLine.content ?? '']
        : [oppositeLine.content ?? '', line.content ?? ''];
      
      const parts = computeLineDiff(content1, content2).parts;
      
      base.changes = parts.map(p => {
        if (isLeft) {
          return p.removed ? { type: 'removed', value: p.value }
               : p.added ? { type: 'added', value: '' }
               : { type: 'unchanged', value: p.value };
        } else {
          return p.added ? { type: 'added', value: p.value }
               : p.removed ? { type: 'removed', value: '' }
               : { type: 'unchanged', value: p.value };
        }
      });
    }

    return base;
  });
};

self.addEventListener('message', async (ev: MessageEvent<MessageIn>) => {
  const { id, left, right, formatType, options } = ev.data

  try {
    if (formatType === 'json') {
      // validate first
      const leftValidation = validateJSON(left)
      const rightValidation = validateJSON(right)
      if (!leftValidation.valid || !rightValidation.valid) {
        const res = {
          identical: false,
          errors: {
            left: !leftValidation.valid ? {
              message: leftValidation.error?.message || 'Invalid JSON',
              position: leftValidation.error?.position,
              line: leftValidation.error?.line,
              column: leftValidation.error?.column,
            } : undefined,
            right: !rightValidation.valid ? {
              message: rightValidation.error?.message || 'Invalid JSON',
              position: rightValidation.error?.position,
              line: rightValidation.error?.line,
              column: rightValidation.error?.column,
            } : undefined,
          }
        }
        const out: PostResult = { id, result: res, type: 'result' }
        // @ts-ignore - worker context
        self.postMessage(out)
        return
      }

      // Large JSON can be very expensive to structurally diff. For large inputs,
      // emulate diff-checker behavior: normalize (optional) then perform text diff.
      const LARGE_JSON_THRESHOLD = 300_000 // ~300KB
      const isLarge = (left?.length ?? 0) > LARGE_JSON_THRESHOLD || (right?.length ?? 0) > LARGE_JSON_THRESHOLD

      if (isLarge) {
        let leftText = left
        let rightText = right
        const shouldNormalizeWhitespace = !!options?.ignoreWhitespace
        const shouldNormalizeKeys = !!options?.ignoreKeyOrder || !!options?.ignoreArrayOrder
        if (shouldNormalizeWhitespace || shouldNormalizeKeys) {
          try {
            const leftParsed = JSON.parse(leftText)
            const rightParsed = JSON.parse(rightText)

            // Normalize all string values based on whitespace/case options
            let normLeft = normalizeJSONStrings(leftParsed, {
              ignoreWhitespace: !!options?.ignoreWhitespace,
              caseSensitive: options?.caseSensitive !== false,
            })
            let normRight = normalizeJSONStrings(rightParsed, {
              ignoreWhitespace: !!options?.ignoreWhitespace,
              caseSensitive: options?.caseSensitive !== false,
            })

            // When ignoreKeyOrder is true, sort keys on both sides so that
            // key-order-only differences disappear from the visual diff.
            if (options?.ignoreKeyOrder) {
              normLeft = sortObjectKeysDeep(normLeft)
              normRight = sortObjectKeysDeep(normRight)
            }

            leftText = JSON.stringify(normLeft, null, 2)
            rightText = JSON.stringify(normRight, null, 2)
          } catch {
            // If normalization fails, fall back to raw text comparison below.
          }
        }

        const diffOptions = {
          // After structural normalization above, we only need line-level
          // whitespace ignore for indentation/formatting differences.
          ignoreWhitespace: !!options?.ignoreWhitespace,
          caseSensitive: options?.caseSensitive !== false,
        }
        const d = await computeDiffProgressive(leftText, rightText, diffOptions, (p) => postProgress(id, p, 'Comparing…'))
        const added = d.rightLines.filter((x) => x.type === 'added').length
        const removed = d.leftLines.filter((x) => x.type === 'removed').length
        const modified = Math.min(
          d.leftLines.filter((x) => x.type === 'changed').length,
          d.rightLines.filter((x) => x.type === 'changed').length
        )
        const result = {
          identical: added === 0 && removed === 0 && modified === 0,
          summary: { added, removed, modified },
          // provide at least one difference to trigger UI rendering path
          differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] : [],
          leftLines: d.leftLines.map((l) => ({ lineNumber: l.lineNumber, type: l.type === 'changed' ? 'removed' : (l.type as any), content: l.content })),
          rightLines: d.rightLines.map((r) => ({ lineNumber: r.lineNumber, type: r.type === 'changed' ? 'added' : (r.type as any), content: r.content })),
        }
        const out: PostResult = { id, result, type: 'result' }
        // @ts-ignore
        self.postMessage(out)
        return
      }

      // Default: structural diff for moderate inputs
      const comparisonResult = compareJSON(left, right, options || {})
      // Optionally include precomputed line diff for UI (avoids main-thread work)
      let resultWithLines: any = comparisonResult
      if (options?.includeLineDiff) {
        try {
          let leftForDiff = left
          let rightForDiff = right

          const shouldNormalizeWhitespace = !!options?.ignoreWhitespace
          const shouldNormalizeKeys = !!options?.ignoreKeyOrder || !!options?.ignoreArrayOrder
          if (shouldNormalizeWhitespace || shouldNormalizeKeys) {
            try {
              const leftParsed = JSON.parse(left)
              const rightParsed = JSON.parse(right)

              let normLeft = normalizeJSONStrings(leftParsed, {
                ignoreWhitespace: !!options?.ignoreWhitespace,
                caseSensitive: options?.caseSensitive !== false,
              })
              let normRight = normalizeJSONStrings(rightParsed, {
                ignoreWhitespace: !!options?.ignoreWhitespace,
                caseSensitive: options?.caseSensitive !== false,
              })

              if (options?.ignoreKeyOrder) {
                normLeft = sortObjectKeysDeep(normLeft)
                normRight = sortObjectKeysDeep(normRight)
              }

              leftForDiff = JSON.stringify(normLeft, null, 2)
              rightForDiff = JSON.stringify(normRight, null, 2)
            } catch {
              // keep raw strings if normalization fails
              leftForDiff = left
              rightForDiff = right
            }
          }

          const ld = createLineDiff(leftForDiff, rightForDiff, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: options?.caseSensitive !== false })
          resultWithLines = { ...comparisonResult, leftLines: ld.leftLines, rightLines: ld.rightLines }
        } catch (_) {}
      }
      const out: PostResult = { id, result: resultWithLines, type: 'result' }
      // @ts-ignore
      self.postMessage(out)
      return
    }

    if (formatType === 'xml') {
      const leftValidation = validateXML(left)
      const rightValidation = validateXML(right)
      if (!leftValidation.valid || !rightValidation.valid) {
        const res = {
          identical: false,
          errors: {
            left: !leftValidation.valid ? {
              message: leftValidation.error?.message || 'Invalid XML',
              line: leftValidation.error?.line,
              column: leftValidation.error?.column,
              code: leftValidation.error?.code,
            } : undefined,
            right: !rightValidation.valid ? {
              message: rightValidation.error?.message || 'Invalid XML',
              line: rightValidation.error?.line,
              column: rightValidation.error?.column,
              code: rightValidation.error?.code,
            } : undefined,
          }
        }
        const out: PostResult = { id, result: res }
        // @ts-ignore
        self.postMessage(out)
        return
      }

      // For very large XML, fall back to efficient text diff similar to JSON
      const LARGE_XML_THRESHOLD = 300_000
      const isLarge = (left?.length ?? 0) > LARGE_XML_THRESHOLD || (right?.length ?? 0) > LARGE_XML_THRESHOLD

      if (isLarge) {
        let leftText = left
        let rightText = right
        if (options?.ignoreAttributeOrder) {
          try {
            leftText = normalizeXMLAttributes(leftText)
            rightText = normalizeXMLAttributes(rightText)
          } catch {}
        }
        const diffOptions = {
          ignoreWhitespace: !!options?.ignoreWhitespace,
          caseSensitive: options?.caseSensitive !== false,
        }
        const d = await computeDiffProgressive(leftText, rightText, diffOptions, (p) => postProgress(id, p, 'Comparing…'))
        const added = d.rightLines.filter((x) => x.type === 'added').length
        const removed = d.leftLines.filter((x) => x.type === 'removed').length
        const modified = Math.min(
          d.leftLines.filter((x) => x.type === 'changed').length,
          d.rightLines.filter((x) => x.type === 'changed').length
        )
        const result = {
          identical: added === 0 && removed === 0 && modified === 0,
          summary: { added, removed, modified },
          differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] : [],
          leftLines: d.leftLines.map((l) => ({ lineNumber: l.lineNumber, type: l.type === 'changed' ? 'removed' : (l.type as any), content: l.content })),
          rightLines: d.rightLines.map((r) => ({ lineNumber: r.lineNumber, type: r.type === 'changed' ? 'added' : (r.type as any), content: r.content })),
        }
        const out: PostResult = { id, result }
        // @ts-ignore
        self.postMessage(out)
        return
      }

      const comparisonResult = compareXML(left, right, options || {})
      let resultWithLines: any = comparisonResult
      if (options?.includeLineDiff) {
        try {
          // Pretty-print XML for inline diff display. When ignoring attribute order,
          // also normalize attributes for a stable comparison.
          let leftForDiff = left
          let rightForDiff = right
          try {
            if (options?.ignoreAttributeOrder) {
              leftForDiff = normalizeXMLAttributes(left)
              rightForDiff = normalizeXMLAttributes(right)
            } else {
              leftForDiff = prettifyXML(left)
              rightForDiff = prettifyXML(right)
            }
          } catch { /* keep originals on failure */ }
          const ld = createLineDiff(leftForDiff, rightForDiff, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: options?.caseSensitive !== false })
          resultWithLines = { ...comparisonResult, leftLines: ld.leftLines, rightLines: ld.rightLines }
        } catch (_) {}
      }
      const out: PostResult = { id, result: resultWithLines }
      // @ts-ignore
      self.postMessage(out)
      return
    }

    // text: prefer efficient diff for large inputs; lightweight compare for small
    const LARGE_TEXT_THRESHOLD = 300_000
    const isLarge = (left?.length ?? 0) > LARGE_TEXT_THRESHOLD || (right?.length ?? 0) > LARGE_TEXT_THRESHOLD
    if (isLarge) {
      const diffOptions = {
        ignoreWhitespace: !!options?.ignoreWhitespace,
        caseSensitive: options?.caseSensitive !== false,
      }
      const d = await computeDiffProgressive(left ?? '', right ?? '', diffOptions, (p) => postProgress(id, p, 'Comparing…'))
      const added = d.rightLines.filter((x) => x.type === 'added').length
      const removed = d.leftLines.filter((x) => x.type === 'removed').length
      const modified = Math.min(
        d.leftLines.filter((x) => x.type === 'changed').length,
        d.rightLines.filter((x) => x.type === 'changed').length
      )
      // Build inline changes for 'changed' pairs
      const leftLines = processLines(d.leftLines, d.rightLines, true);
      const rightLines = processLines(d.rightLines, d.leftLines, false);
      const result = {
        identical: added === 0 && removed === 0 && modified === 0,
        summary: { added, removed, modified },
        differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] : [],
        leftLines,
        rightLines,
      }
      const out: PostResult = { id, result, type: 'result' }
      // @ts-ignore
      self.postMessage(out)
    } else {
      const comparisonResult = compareTextEnhanced(left ?? '', right ?? '', options || {})
      const out: PostResult = { id, result: comparisonResult, type: 'result' }
      // @ts-ignore
      self.postMessage(out)
    }
  } catch (err: any) {
    const out: PostResult = { id, error: err instanceof Error ? err.message : String(err), type: 'error' }
    // @ts-ignore
    self.postMessage(out)
  }
})


export {}
