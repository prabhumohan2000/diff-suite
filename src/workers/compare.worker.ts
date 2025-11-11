import { compareJSON } from '../utils/comparators/jsonComparator'
import { compareXML } from '../utils/comparators/xmlComparator'
import { validateJSON } from '../utils/validators/jsonValidator'
import { validateXML } from '../utils/validators/xmlValidator'
import { createLineDiff } from '../utils/diffUtils/lineDiff'
import { computeDiff, sortObjectKeys, computeLineDiff } from '../utils/diffChecker'
import { normalizeXMLAttributes } from '../utils/xmlNormalizer'
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

self.addEventListener('message', (ev: MessageEvent<MessageIn>) => {
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
        // Optional key-order normalization like diff-checker
        if (options?.ignoreKeyOrder) {
          try {
            const l = JSON.parse(leftText)
            const r = JSON.parse(rightText)
            leftText = JSON.stringify(sortObjectKeys(l))
            rightText = JSON.stringify(sortObjectKeys(r))
          } catch {}
        }
        const diffOptions = {
          ignoreWhitespace: !!options?.ignoreWhitespace,
          caseSensitive: options?.caseSensitive !== false,
        }
        const d = computeDiff(leftText, rightText, diffOptions)
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
          const ld = createLineDiff(left, right, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: !!options?.caseSensitive })
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
        const d = computeDiff(leftText, rightText, diffOptions)
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
          const ld = createLineDiff(left, right, { ignoreWhitespace: !!options?.ignoreWhitespace, caseSensitive: !!options?.caseSensitive })
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
      const d = computeDiff(left ?? '', right ?? '', diffOptions)
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
