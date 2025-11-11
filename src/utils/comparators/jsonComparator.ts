export interface DiffItem {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  path: string
  oldValue?: any
  newValue?: any
}

export interface ComparisonOptions {
  ignoreKeyOrder?: boolean
  ignoreArrayOrder?: boolean
  caseSensitive?: boolean
  ignoreWhitespace?: boolean
  formattingSensitive?: boolean
}

export interface ComparisonResult {
  identical: boolean
  differences: DiffItem[]
  summary: {
    added: number
    removed: number
    modified: number
  }
}

// -----------------------------
// Normalization helpers
// -----------------------------

/**
 * Reorder object keys to match a reference object's key order
 * Used when ignoreKeyOrder is false to ensure both JSONs have the same key order
 */
export function reorderObjectKeys(target: any, reference: any): any {
  if (target === null || typeof target !== 'object' || Array.isArray(target)) {
    return target
  }
  if (reference === null || typeof reference !== 'object' || Array.isArray(reference)) {
    return target
  }

  const reordered: any = {}
  const refKeys = Object.keys(reference)
  const targetKeys = Object.keys(target)
  
  // First, add keys in reference order
  for (const key of refKeys) {
    if (key in target) {
      const value = target[key]
      if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
        const refValue = reference[key]
        if (refValue !== null && typeof refValue === 'object' && !Array.isArray(refValue)) {
          reordered[key] = reorderObjectKeys(value, refValue)
        } else {
          reordered[key] = value
        }
      } else if (Array.isArray(value)) {
        const refValue = reference[key]
        if (Array.isArray(refValue)) {
          reordered[key] = value.map((item, idx) => {
            if (item !== null && typeof item === 'object' && !Array.isArray(item)) {
              const refItem = refValue[idx]
              if (refItem !== null && typeof refItem === 'object' && !Array.isArray(refItem)) {
                return reorderObjectKeys(item, refItem)
              }
            }
            return item
          })
        } else {
          reordered[key] = value
        }
      } else {
        reordered[key] = value
      }
    }
  }
  
  // Then add any extra keys from target that aren't in reference
  for (const key of targetKeys) {
    if (!(key in reordered)) {
      reordered[key] = target[key]
    }
  }
  
  return reordered
}

function normalizeValue(value: any, options: ComparisonOptions): any {
  if (typeof value === 'string') {
    let normalized = value

    // Collapse internal whitespace if requested (affects only STRING contents)
    if (options.ignoreWhitespace) {
      normalized = normalized.replace(/\s+/g, ' ').trim()
    }

    if (options.caseSensitive === false) {
      normalized = normalized.toLowerCase()
    }
    return normalized
  }
  return value
}

function normalizeObject(obj: any, options: ComparisonOptions): any {
  if (obj === null || typeof obj !== 'object' || Array.isArray(obj)) {
    return normalizeValue(obj, options)
  }

  const normalized: any = {}

  let keys = Object.keys(obj)
  if (options.ignoreKeyOrder) keys = keys.sort()

  for (const key of keys) {
    const normalizedKey = options.caseSensitive === false ? key.toLowerCase() : key
    const value = (obj as any)[key]

    if (value !== null && typeof value === 'object') {
      if (Array.isArray(value)) {
        normalized[normalizedKey] = normalizeArray(value, options)
      } else {
        normalized[normalizedKey] = normalizeObject(value, options)
      }
    } else {
      normalized[normalizedKey] = normalizeValue(value, options)
    }
  }

  return normalized
}

function normalizeArray(arr: any[], options: ComparisonOptions): any[] {
  const normalizedItems = arr.map((item) => {
    if (item !== null && typeof item === 'object') {
      return Array.isArray(item) ? normalizeArray(item, options) : normalizeObject(item, options)
    }
    return normalizeValue(item, options)
  })

  if (options.ignoreArrayOrder) {
    // Sort by deterministic string form
    return normalizedItems.sort((a, b) => JSON.stringify(a).localeCompare(JSON.stringify(b)))
  }

  return normalizedItems
}

// -----------------------------
// Raw-text (formatting-sensitive) comparison
// -----------------------------
function normalizeLineEndings(s: string) {
  // Keep comparison stable across CRLF/LF
  return s.replace(/\r\n/g, '\n')
}

function compareRawTextJSON(leftRaw: string, rightRaw: string): DiffItem[] {
  const left = normalizeLineEndings(leftRaw)
  const right = normalizeLineEndings(rightRaw)

  if (left === right) return []

  const diffs: DiffItem[] = []
  const l = left.split('\n')
  const r = right.split('\n')
  const max = Math.max(l.length, r.length)

  for (let i = 0; i < max; i++) {
    const lv = l[i]
    const rv = r[i]
    const path = `$:line[${i + 1}]`

    if (lv === undefined) {
      diffs.push({ type: 'added', path, newValue: rv })
    } else if (rv === undefined) {
      diffs.push({ type: 'removed', path, oldValue: lv })
    } else if (lv !== rv) {
      diffs.push({ type: 'modified', path, oldValue: lv, newValue: rv })
    }
  }
  return diffs
}

// -----------------------------
// Deep structural comparison (post-normalization)
// -----------------------------
function keysEqualWithOrder(a: string[], b: string[]) {
  if (a.length !== b.length) return false
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false
  return true
}

function compareObjects(
  left: any,
  right: any,
  path: string,
  options: ComparisonOptions,
  differences: DiffItem[]
): void {
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)

  // If order should matter, flag key-order change up-front.
  if (!options.ignoreKeyOrder && !keysEqualWithOrder(leftKeys, rightKeys)) {
    differences.push({
      type: 'modified',
      path: path ? `${path}._keyOrder` : '_keyOrder',
      oldValue: leftKeys,
      newValue: rightKeys,
    })
  }

  // Build traversal order
  let traversalKeys: string[]
  if (options.ignoreKeyOrder) {
    const all = new Set([...leftKeys, ...rightKeys])
    traversalKeys = Array.from(all).sort()
  } else {
    const extrasOnRight = rightKeys.filter((k) => !leftKeys.includes(k))
    traversalKeys = [...leftKeys, ...extrasOnRight]
  }

  for (const key of traversalKeys) {
    const currentPath = path ? `${path}.${key}` : key
    const leftHasKey = Object.prototype.hasOwnProperty.call(left, key)
    const rightHasKey = Object.prototype.hasOwnProperty.call(right, key)

    if (!leftHasKey && rightHasKey) {
      differences.push({ type: 'added', path: currentPath, newValue: (right as any)[key] })
      continue
    }

    if (leftHasKey && !rightHasKey) {
      differences.push({ type: 'removed', path: currentPath, oldValue: (left as any)[key] })
      continue
    }

    const leftValue = (left as any)[key]
    const rightValue = (right as any)[key]

    const leftIsObj = leftValue !== null && typeof leftValue === 'object'
    const rightIsObj = rightValue !== null && typeof rightValue === 'object'

    if (leftIsObj && rightIsObj) {
      if (Array.isArray(leftValue) && Array.isArray(rightValue)) {
        compareArrays(leftValue, rightValue, currentPath, options, differences)
      } else if (!Array.isArray(leftValue) && !Array.isArray(rightValue)) {
        compareObjects(leftValue, rightValue, currentPath, options, differences)
      } else {
        // One is array, the other is object
        differences.push({ type: 'modified', path: currentPath, oldValue: leftValue, newValue: rightValue })
      }
    } else {
      const normalizedLeft = normalizeValue(leftValue, options)
      const normalizedRight = normalizeValue(rightValue, options)
      if (JSON.stringify(normalizedLeft) !== JSON.stringify(normalizedRight)) {
        differences.push({ type: 'modified', path: currentPath, oldValue: leftValue, newValue: rightValue })
      }
    }
  }
}

function compareArrays(
  left: any[],
  right: any[],
  path: string,
  options: ComparisonOptions,
  differences: DiffItem[]
): void {
  if (options.ignoreArrayOrder) {
    const normalizedLeft = normalizeArray(left, options)
    const normalizedRight = normalizeArray(right, options)

    if (JSON.stringify(normalizedLeft) !== JSON.stringify(normalizedRight)) {
      const leftSet = new Set(normalizedLeft.map((item) => JSON.stringify(item)))
      const rightSet = new Set(normalizedRight.map((item) => JSON.stringify(item)))

      for (const item of normalizedLeft) {
        const s = JSON.stringify(item)
        if (!rightSet.has(s)) {
          differences.push({ type: 'removed', path: `${path}[]`, oldValue: item })
        }
      }

      for (const item of normalizedRight) {
        const s = JSON.stringify(item)
        if (!leftSet.has(s)) {
          differences.push({ type: 'added', path: `${path}[]`, newValue: item })
        }
      }
    }
  } else {
    const maxLength = Math.max(left.length, right.length)
    for (let i = 0; i < maxLength; i++) {
      const currentPath = `${path}[${i}]`
      if (i >= left.length) {
        differences.push({ type: 'added', path: currentPath, newValue: right[i] })
        continue
      }
      if (i >= right.length) {
        differences.push({ type: 'removed', path: currentPath, oldValue: left[i] })
        continue
      }

      const li = left[i]
      const ri = right[i]

      const liIsObj = li !== null && typeof li === 'object'
      const riIsObj = ri !== null && typeof ri === 'object'

      if (liIsObj && riIsObj) {
        if (Array.isArray(li) && Array.isArray(ri)) {
          compareArrays(li, ri, currentPath, options, differences)
        } else if (!Array.isArray(li) && !Array.isArray(ri)) {
          compareObjects(li, ri, currentPath, options, differences)
        } else {
          differences.push({ type: 'modified', path: currentPath, oldValue: li, newValue: ri })
        }
      } else {
        const nl = normalizeValue(li, options)
        const nr = normalizeValue(ri, options)
        if (JSON.stringify(nl) !== JSON.stringify(nr)) {
          differences.push({ type: 'modified', path: currentPath, oldValue: li, newValue: ri })
        }
      }
    }
  }
}

// -----------------------------
// Public API
// -----------------------------
export function compareJSON(
  leftJSON: string,
  rightJSON: string,
  options: ComparisonOptions = {}
): ComparisonResult {
  // 1) Formatting-sensitive path: compare RAW bytes/lines first
  if (options.formattingSensitive) {
    const differences = compareRawTextJSON(leftJSON, rightJSON)
    return {
      identical: differences.length === 0,
      differences,
      summary: {
        added: differences.filter((d) => d.type === 'added').length,
        removed: differences.filter((d) => d.type === 'removed').length,
        modified: differences.filter((d) => d.type === 'modified').length,
      },
    }
  }

  // 2) Structural path: parse and deeply compare with normalizations
  try {
    const left = JSON.parse(leftJSON)
    const right = JSON.parse(rightJSON)

    // When ignoreKeyOrder is false and both are objects, reorder right to match left's key order
    // This ensures line-by-line diff shows exact differences
    let normalizedLeft = left
    let normalizedRight = right
    
    if (!options.ignoreKeyOrder && 
        left !== null && typeof left === 'object' && !Array.isArray(left) &&
        right !== null && typeof right === 'object' && !Array.isArray(right)) {
      // Reorder right to match left's key order for consistent line-by-line comparison
      normalizedRight = reorderObjectKeys(right, left)
    }

    normalizedLeft = normalizeObject(normalizedLeft, options)
    normalizedRight = normalizeObject(normalizedRight, options)

    const differences: DiffItem[] = []
    compareObjects(normalizedLeft, normalizedRight, '', options, differences)

    return {
      identical: differences.length === 0,
      differences,
      summary: {
        added: differences.filter((d) => d.type === 'added').length,
        removed: differences.filter((d) => d.type === 'removed').length,
        modified: differences.filter((d) => d.type === 'modified').length,
      },
    }
  } catch (error) {
    throw new Error(`Failed to parse JSON: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}
