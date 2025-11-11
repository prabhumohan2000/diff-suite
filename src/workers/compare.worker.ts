import { compareJSON } from '../utils/comparators/jsonComparator'
import { compareXML } from '../utils/comparators/xmlComparator'
import { validateJSON } from '../utils/validators/jsonValidator'
import { validateXML } from '../utils/validators/xmlValidator'
import { createLineDiff } from '../utils/diffUtils/lineDiff'
import { computeDiff, sortObjectKeys, computeLineDiff, type DiffResult, type DiffLine } from '../utils/diffChecker'
import { normalizeXMLAttributes } from '../utils/xmlNormalizer'
import { prettifyXML } from '../utils/xmlFormatter'
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

    const leftResult: DiffLine[] = []
    const rightResult: DiffLine[] = []
    let hasChanges = false
    let li = 0
    let ri = 0

    const normalize = (s: string) => {
      let n = s
      if (options.ignoreWhitespace) n = n.replace(/\s+/g, ' ').trim()
      if (options.caseSensitive === false) n = n.toLowerCase()
      return n
    }

    const linesMatch = (l: string, r: string) => normalize(l) === normalize(r)
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
        } else if (linesMatch(l, r)) {
          leftResult.push({ type: 'unchanged', content: l, lineNumber: li + 1, correspondingLine: ri + 1 })
          rightResult.push({ type: 'unchanged', content: r, lineNumber: ri + 1, correspondingLine: li + 1 })
          li++; ri++
        } else {
          const leftNextMatch = rightLines.findIndex((line, idx) => idx > ri && linesMatch(l, line))
          const rightNextMatch = leftLines.findIndex((line, idx) => idx > li && linesMatch(r, line))
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
        onProgress(100)
        resolve({ leftLines: leftResult, rightLines: rightResult, hasChanges })
      }
    }
    onProgress(0)
    setTimeout(step, 0)
  })
}

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
        const out: PostResult = { id, result: res }
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
        // Normalize key order for consistent line-by-line comparison only when ignoreKeyOrder is false
        if (!options?.ignoreKeyOrder) {
          try {
            const l = JSON.parse(leftText)
            const r = JSON.parse(rightText)
            if (l !== null && typeof l === 'object' && !Array.isArray(l) &&
                r !== null && typeof r === 'object' && !Array.isArray(r)) {
              // When ignoreKeyOrder is false, reorder right to match left's key order
              const { reorderObjectKeys } = await import('../utils/comparators/jsonComparator')
              const reorderedRight = reorderObjectKeys(r, l)
              leftText = JSON.stringify(l, null, 2)
              rightText = JSON.stringify(reorderedRight, null, 2)
            }
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
          // provide at least one difference to trigger UI rendering path
          differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] : [],
          leftLines: d.leftLines.map((l) => ({ lineNumber: l.lineNumber, type: l.type === 'changed' ? 'removed' : (l.type as any), content: l.content })),
          rightLines: d.rightLines.map((r) => ({ lineNumber: r.lineNumber, type: r.type === 'changed' ? 'added' : (r.type as any), content: r.content })),
        }
        const out: PostResult = { id, result }
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
          // Normalize both JSONs to same key order for line diff only when ignoreKeyOrder is false
          let leftForDiff = left
          let rightForDiff = right
          if (!options?.ignoreKeyOrder) {
            // When ignoreKeyOrder is false, normalize key order for consistent line-by-line comparison
            try {
              const leftParsed = JSON.parse(left)
              const rightParsed = JSON.parse(right)
              if (leftParsed !== null && typeof leftParsed === 'object' && !Array.isArray(leftParsed) &&
                  rightParsed !== null && typeof rightParsed === 'object' && !Array.isArray(rightParsed)) {
                // Reorder right to match left's key order
                const { reorderObjectKeys } = await import('../utils/comparators/jsonComparator')
                const reorderedRight = reorderObjectKeys(rightParsed, leftParsed)
                leftForDiff = JSON.stringify(leftParsed, null, 2)
                rightForDiff = JSON.stringify(reorderedRight, null, 2)
              }
            } catch {}
          }
          const ld = createLineDiff(leftForDiff, rightForDiff, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: !!options?.caseSensitive })
          resultWithLines = { ...comparisonResult, leftLines: ld.leftLines, rightLines: ld.rightLines }
        } catch (_) {}
      }
      const out: PostResult = { id, result: resultWithLines }
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
          const ld = createLineDiff(leftForDiff, rightForDiff, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: !!options?.caseSensitive })
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
      const leftLines = d.leftLines.map((l, idx) => {
        const base: any = { lineNumber: l.lineNumber, type: l.type === 'changed' ? 'removed' : (l.type as any), content: l.content }
        if (l.type === 'changed' && d.rightLines[idx] && d.rightLines[idx].type === 'changed') {
          const parts = computeLineDiff(l.content ?? '', d.rightLines[idx].content ?? '').parts
          base.changes = parts.map(p => p.removed ? { type: 'removed', value: p.value } : p.added ? { type: 'added', value: '' } : { type: 'unchanged', value: p.value })
        }
        return base
      })
      const rightLines = d.rightLines.map((r, idx) => {
        const base: any = { lineNumber: r.lineNumber, type: r.type === 'changed' ? 'added' : (r.type as any), content: r.content }
        if (r.type === 'changed' && d.leftLines[idx] && d.leftLines[idx].type === 'changed') {
          const parts = computeLineDiff(d.leftLines[idx].content ?? '', r.content ?? '').parts
          base.changes = parts.map(p => p.added ? { type: 'added', value: p.value } : p.removed ? { type: 'removed', value: '' } : { type: 'unchanged', value: p.value })
        }
        return base
      })
      const result = {
        identical: added === 0 && removed === 0 && modified === 0,
        summary: { added, removed, modified },
        differences: added + removed + modified > 0 ? [{ type: 'modified', path: '$' }] : [],
        leftLines,
        rightLines,
      }
      const out: PostResult = { id, result }
      // @ts-ignore
      self.postMessage(out)
    } else {
      const comparisonResult = compareTextEnhanced(left ?? '', right ?? '', options || {})
      const out: PostResult = { id, result: comparisonResult }
      // @ts-ignore
      self.postMessage(out)
    }
  } catch (err: any) {
    const out: PostResult = { id, error: err instanceof Error ? err.message : String(err) }
    // @ts-ignore
    self.postMessage(out)
  }
})

export {}
