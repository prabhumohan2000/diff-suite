/*
 * json.worker.ts
 * ---------------
 * Web Worker that parses and diffs large JSON blobs off the main thread.
 * Sends progress events and returns compact results.
 */

export type ParsePayload = { text: string; computePrettyLines?: boolean }
export type DiffPayload = { left: any; right: any; options?: { maxDiffs?: number; ignoreKeyOrder?: boolean; ignoreArrayOrder?: boolean } }

type RequestMessage =
  | { type: 'parse'; id: string; payload: ParsePayload }
  | { type: 'diff'; id: string; payload: DiffPayload }
  | { type: 'cancel'; id: string }

let cancelled: Record<string, boolean> = {}

function postProgress(id: string, message: string, progress?: number) {
  // @ts-ignore
  self.postMessage({ type: 'progress', id, message, progress })
}

function postResult(id: string, payload: any) {
  // @ts-ignore
  self.postMessage({ type: 'result', id, payload })
}

function postError(id: string, error: any) {
  // @ts-ignore
  self.postMessage({ type: 'error', id, error: String(error?.message ?? error) })
}

// Util: derive line/column from a character position
function computeLineCol(text: string, position: number | undefined) {
  if (typeof position !== 'number' || position < 0) return {}
  let line = 1
  let col = 1
  for (let i = 0; i < text.length && i < position; i++) {
    if (text.charCodeAt(i) === 10 /*\n*/) {
      line++
      col = 1
    } else {
      col++
    }
  }
  return { line, column: col }
}

// Compact diff (path oriented, capped)
function diffJson(
  left: any,
  right: any,
  options: { maxDiffs?: number; ignoreKeyOrder?: boolean; ignoreArrayOrder?: boolean } = {}
) {
  const max = options.maxDiffs ?? 2000
  const differences: Array<{ type: 'added' | 'removed' | 'modified'; path: string }> = []
  let added = 0, removed = 0, modified = 0

  const stack: Array<{ l: any; r: any; path: string }> = [{ l: left, r: right, path: '' }]

  const pushDiff = (type: 'added' | 'removed' | 'modified', path: string) => {
    if (differences.length < max) differences.push({ type, path })
    if (type === 'added') added++
    else if (type === 'removed') removed++
    else modified++
  }

  while (stack.length) {
    const { l, r, path } = stack.pop() as { l: any; r: any; path: string }
    if (l === r) continue

    const lType = Object.prototype.toString.call(l)
    const rType = Object.prototype.toString.call(r)
    if (lType !== rType) {
      pushDiff('modified', path)
      continue
    }

    if (Array.isArray(l) && Array.isArray(r)) {
      if (options.ignoreArrayOrder) {
        // Compare as multisets (best-effort; hash by JSON string)
        const countMap = new Map<string, number>()
        for (const item of l) {
          const key = JSON.stringify(item)
          countMap.set(key, (countMap.get(key) ?? 0) + 1)
        }
        for (const item of r) {
          const key = JSON.stringify(item)
          const n = (countMap.get(key) ?? 0) - 1
          if (n <= 0) countMap.delete(key)
          else countMap.set(key, n)
        }
        const remaining = [...countMap.values()].reduce((a, b) => a + b, 0)
        if (remaining !== 0) pushDiff('modified', path)
        continue
      }
      const len = Math.max(l.length, r.length)
      for (let i = 0; i < len; i++) {
        const next = `${path}[${i}]`
        if (i >= l.length) pushDiff('added', next)
        else if (i >= r.length) pushDiff('removed', next)
        else stack.push({ l: l[i], r: r[i], path: next })
      }
      continue
    }

    if (l && r && typeof l === 'object') {
      // Objects
      const lKeys = Object.keys(l)
      const rKeys = Object.keys(r)
      if (!options.ignoreKeyOrder) {
        // no-op: order doesn't matter for objects anyway
      }
      const all = new Set([...lKeys, ...rKeys])
      for (const k of all) {
        const next = path ? `${path}.${k}` : k
        if (!(k in l)) pushDiff('added', next)
        else if (!(k in r)) pushDiff('removed', next)
        else stack.push({ l: l[k], r: r[k], path: next })
      }
      continue
    }

    // Primitive mismatch
    pushDiff('modified', path)
  }

  return {
    identical: added === 0 && removed === 0 && modified === 0,
    summary: { added, removed, modified },
    differences,
  }
}

// Pretty printer that emits lines without concatenating one giant string
function jsonToPrettyLines(value: any, indent = 2): string[] {
  const lines: string[] = []
  const pad = (n: number) => ' '.repeat(n)

  const stack: Array<{ v: any; key?: string; depth: number; stage?: number; keys?: string[]; index?: number }>
    = [{ v: value, depth: 0, stage: 0 }]

  while (stack.length) {
    const frame = stack.pop()!
    const { v, key, depth } = frame
    const pfx = pad(depth * indent)
    const kStr = key !== undefined ? JSON.stringify(key) + ': ' : ''

    if (v === null || typeof v !== 'object') {
      lines.push(`${pfx}${kStr}${JSON.stringify(v)}`)
      continue
    }

    if (Array.isArray(v)) {
      if (v.length === 0) {
        lines.push(`${pfx}${kStr}[]`)
        continue
      }
      // Header
      lines.push(`${pfx}${kStr}[`)
      // Close later
      lines.push(pfx + ']')
      // Push children in reverse so they render in-order
      for (let i = v.length - 1; i >= 0; i--) {
        const child = v[i]
        const cpfx = pad((depth + 1) * indent)
        // Insert comma for all but last
        const lineStart = `${cpfx}${JSON.stringify(child)}`
        if (child && typeof child === 'object') {
          // Replace the placeholder closing ']' with children
          lines.pop() // remove the immediate closing bracket
          // open
          lines.push(`${pfx}${kStr}[`)
          // Restore closing after children
          lines.push(pfx + ']')
          // Now actually expand children via stack method
          // Push a wrapper frame where `v` is the marker and `depth` is the frame depth
          stack.push({ v: { __arrWrapper__: true, value: v, index: i } as any, depth })
          // Fallback for non-object added above; break as we switch strategy
          break
        } else {
          lines.splice(lines.length - 1, 0, i === v.length - 1 ? lineStart : lineStart + ',')
        }
      }
      continue
    }

    // Object
    const keys = Object.keys(v)
    if (keys.length === 0) {
      lines.push(`${pfx}${kStr}{}`)
      continue
    }
    lines.push(`${pfx}${kStr}{`)
    for (let i = 0; i < keys.length; i++) {
      const k = keys[i]
      const val = v[k]
      if (val === null || typeof val !== 'object') {
        const tail = i === keys.length - 1 ? '' : ','
        lines.push(`${pad((depth + 1) * indent)}${JSON.stringify(k)}: ${JSON.stringify(val)}${tail}`)
      } else {
        // Expand complex children via stack push so we don't recurse deeply on the JS stack
        lines.push(`__PENDING_COMPLEX__`)
        stack.push({ v: '__OBJECT_PATCH__', key: k, depth, stage: 1, keys, index: i } as any)
        stack.push({ v: val, key: k, depth: depth + 1, stage: 0 } as any)
      }
    }
    lines.push(`${pfx}}`)
  }

  // Clean up any placeholders left by complex children (simple linear approach)
  for (let i = 0; i < lines.length; i++) {
    if (lines[i] === '__PENDING_COMPLEX__') {
      lines.splice(i, 1)
      i--
    }
  }
  return lines
}

// Main worker message handler
self.onmessage = (e: MessageEvent<RequestMessage>) => {
  const { type, id } = e.data
  if (type === 'cancel') {
    cancelled[id] = true
    return
  }

  if (type === 'parse') {
    const { text, computePrettyLines } = e.data.payload
    try {
      postProgress(id, 'Parsing…')
      // JSON.parse is internally streaming in some engines; we rely on worker isolation
      const json = JSON.parse(text)
      if (cancelled[id]) return

      let prettyLinesLength: number | undefined
      if (computePrettyLines) {
        postProgress(id, 'Formatting…')
        const lines = jsonToPrettyLines(json)
        prettyLinesLength = lines.length
        // We do not send lines back to avoid huge cross-thread copies;
        // the UI can regenerate lines on demand from the canonical instance.
      }

      postResult(id, { ok: true, json, prettyLinesLength })
    } catch (err: any) {
      const message = String(err?.message ?? err)
      let position: number | undefined
      const match = /position\s(\d+)/i.exec(message)
      if (match) position = Number(match[1])
      const lc = computeLineCol(e.data.payload.text, position)
      postResult(id, {
        ok: false,
        error: {
          message,
          position,
          ...lc,
        },
      })
    } finally {
      // cleanup
      // @ts-ignore
      cancelled[id] = false
    }
    return
  }

  if (type === 'diff') {
    try {
      const { left, right, options } = e.data.payload
      postProgress(id, 'Diffing…')
      const result = diffJson(left, right, options)
      if (cancelled[id]) return
      postResult(id, result)
    } catch (err) {
      postError(id, err)
    } finally {
      // @ts-ignore
      cancelled[id] = false
    }
    return
  }
}

