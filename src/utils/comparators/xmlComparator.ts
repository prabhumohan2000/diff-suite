import { XMLParser, XMLBuilder } from 'fast-xml-parser'

export interface DiffItem {
  type: 'added' | 'removed' | 'modified' | 'unchanged'
  path: string
  oldValue?: string
  newValue?: string
  element?: string
  attribute?: string
}

export interface ComparisonOptions {
  ignoreAttributeOrder?: boolean
  ignoreWhitespace?: boolean
  caseSensitive?: boolean
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

function normalizeXML(xmlString: string, options: ComparisonOptions): string {
  let normalized = xmlString.trim()
  
  if (options.ignoreWhitespace) {
    // Remove whitespace between tags and normalize internal whitespace
    normalized = normalized
      .replace(/>\s+</g, '><')
      .replace(/\s+/g, ' ')
  }
  // If NOT ignoring whitespace, preserve it as-is (don't normalize)
  
  // Normalize case for tag names and attribute names if case insensitive
  if (!options.caseSensitive) {
    // Convert tag names to lowercase
    normalized = normalized.replace(/<\/?([a-zA-Z][a-zA-Z0-9_-]*)/g, (match, tagName) => {
      return match.replace(tagName, tagName.toLowerCase())
    })
    
    // Convert attribute names to lowercase (but not values)
    normalized = normalized.replace(/([a-zA-Z][a-zA-Z0-9_-]*)\s*=/g, (match, attrName) => {
      return attrName.toLowerCase() + '='
    })
  }
  
  return normalized
}

function parseXMLToObject(xmlString: string, options: ComparisonOptions): any {
  const parser = new XMLParser({
    ignoreAttributes: false,
    parseTagValue: true,
    trimValues: options.ignoreWhitespace !== false, // Only trim if ignoring whitespace
    numberParseOptions: {
      hex: true,
      leadingZeros: true
    },
    isArray: () => false,
    attributeNamePrefix: '@_',
    textNodeName: '#text',
    preserveOrder: false
  })

  return parser.parse(xmlString)
}

function objectToXMLString(obj: any): string {
  const builder = new XMLBuilder({
    ignoreAttributes: false,
    format: true,
    indentBy: '  ',
    attributeNamePrefix: '@_',
    textNodeName: '#text',
  })

  return builder.build(obj)
}

function normalizeValue(value: string, options: ComparisonOptions): string {
  let normalized = value
  
  if (options.ignoreWhitespace) {
    normalized = normalized.replace(/\s+/g, ' ').trim()
  }
  
  if (!options.caseSensitive) {
    normalized = normalized.toLowerCase()
  }
  
  return normalized
}

function compareAttributes(
  leftAttrs: Record<string, any>,
  rightAttrs: Record<string, any>,
  path: string,
  options: ComparisonOptions,
  differences: DiffItem[]
): void {
  const leftAttrKeys = Object.keys(leftAttrs).filter(k => k.startsWith('@_'))
  const rightAttrKeys = Object.keys(rightAttrs).filter(k => k.startsWith('@_'))
  
  // Normalize attribute names for case-insensitive comparison
  const normalizeAttrKey = (key: string) => {
    if (!options.caseSensitive) {
      return '@_' + key.substring(2).toLowerCase()
    }
    return key
  }
  
  // Create maps for comparison
  const leftAttrMap = new Map(leftAttrKeys.map(k => [normalizeAttrKey(k), { key: k, value: leftAttrs[k] }]))
  const rightAttrMap = new Map(rightAttrKeys.map(k => [normalizeAttrKey(k), { key: k, value: rightAttrs[k] }]))
  
  // Check for removed and modified attributes
  for (const [normalizedKey, leftData] of leftAttrMap) {
    const attrName = leftData.key.substring(2)
    
    if (!rightAttrMap.has(normalizedKey)) {
      differences.push({
        type: 'removed',
        path: `${path}.${leftData.key}`,
        attribute: attrName,
        oldValue: String(leftData.value),
      })
    } else {
      const rightData = rightAttrMap.get(normalizedKey)!
      const leftValue = normalizeValue(String(leftData.value), options)
      const rightValue = normalizeValue(String(rightData.value), options)
      
      if (leftValue !== rightValue) {
        differences.push({
          type: 'modified',
          path: `${path}.${leftData.key}`,
          attribute: attrName,
          oldValue: String(leftData.value),
          newValue: String(rightData.value),
        })
      }
    }
  }
  
  // Check for added attributes
  for (const [normalizedKey, rightData] of rightAttrMap) {
    if (!leftAttrMap.has(normalizedKey)) {
      const attrName = rightData.key.substring(2)
      differences.push({
        type: 'added',
        path: `${path}.${rightData.key}`,
        attribute: attrName,
        newValue: String(rightData.value),
      })
    }
  }
}

function compareXMLObjects(
  left: any,
  right: any,
  path: string = '',
  options: ComparisonOptions,
  differences: DiffItem[] = []
): void {
  // Handle primitive types
  if (typeof left !== 'object' || typeof right !== 'object') {
    const leftNorm = normalizeValue(String(left), options)
    const rightNorm = normalizeValue(String(right), options)
    
    if (leftNorm !== rightNorm) {
      differences.push({
        type: 'modified',
        path,
        oldValue: String(left),
        newValue: String(right),
      })
    }
    return
  }

  // Handle null values
  if (left === null || right === null) {
    if (left !== right) {
      differences.push({
        type: left === null ? 'removed' : 'added',
        path,
        oldValue: left === null ? undefined : String(left),
        newValue: right === null ? undefined : String(right),
      })
    }
    return
  }

  // Normalize element keys for case-insensitive comparison
  const normalizeKey = (key: string) => {
    if (!options.caseSensitive && !key.startsWith('@_')) {
      return key.toLowerCase()
    }
    return key
  }

  // Separate attributes from elements
  const leftKeys = Object.keys(left)
  const rightKeys = Object.keys(right)
  
  const leftAttrKeys = leftKeys.filter(k => k.startsWith('@_'))
  const rightAttrKeys = rightKeys.filter(k => k.startsWith('@_'))
  
  const leftElemKeys = leftKeys.filter(k => !k.startsWith('@_'))
  const rightElemKeys = rightKeys.filter(k => !k.startsWith('@_'))

  // Compare attributes
  if (leftAttrKeys.length > 0 || rightAttrKeys.length > 0) {
    const leftAttrs: Record<string, any> = {}
    const rightAttrs: Record<string, any> = {}
    
    leftAttrKeys.forEach(k => leftAttrs[k] = left[k])
    rightAttrKeys.forEach(k => rightAttrs[k] = right[k])
    
    compareAttributes(leftAttrs, rightAttrs, path, options, differences)
  }

  // Compare elements - use normalized keys for case-insensitive comparison
  const leftElemMap = new Map(leftElemKeys.map(k => [normalizeKey(k), k]))
  const rightElemMap = new Map(rightElemKeys.map(k => [normalizeKey(k), k]))
  
  const allNormalizedKeys = new Set([...leftElemMap.keys(), ...rightElemMap.keys()])

  for (const normalizedKey of allNormalizedKeys) {
    const leftKey = leftElemMap.get(normalizedKey)
    const rightKey = rightElemMap.get(normalizedKey)
    const currentPath = path ? `${path}.${leftKey || rightKey || ''}` : (leftKey || rightKey || '')
    const leftHasKey = leftKey !== undefined
    const rightHasKey = rightKey !== undefined

    if (!leftHasKey && rightHasKey) {
      differences.push({
        type: 'added',
        path: currentPath,
        element: rightKey!,
        newValue: typeof right[rightKey!] === 'object' ? JSON.stringify(right[rightKey!]) : String(right[rightKey!]),
      })
    } else if (leftHasKey && !rightHasKey) {
      differences.push({
        type: 'removed',
        path: currentPath,
        element: leftKey!,
        oldValue: typeof left[leftKey!] === 'object' ? JSON.stringify(left[leftKey!]) : String(left[leftKey!]),
      })
    } else if (leftHasKey && rightHasKey) {
      const leftValue = left[leftKey!]
      const rightValue = right[rightKey!]

      if (typeof leftValue === 'object' && leftValue !== null &&
          typeof rightValue === 'object' && rightValue !== null) {
        compareXMLObjects(leftValue, rightValue, currentPath, options, differences)
      } else {
        const leftNorm = normalizeValue(String(leftValue), options)
        const rightNorm = normalizeValue(String(rightValue), options)
        
        if (leftNorm !== rightNorm) {
          differences.push({
            type: 'modified',
            path: currentPath,
            element: leftKey!,
            oldValue: String(leftValue),
            newValue: String(rightValue),
          })
        }
      }
    }
  }
}

export function compareXML(
  leftXML: string,
  rightXML: string,
  options: ComparisonOptions = {}
): ComparisonResult {
  try {
    // Set default for caseSensitive to true if not specified
    const finalOptions: ComparisonOptions = {
      caseSensitive: true,
      ...options
    }
    
    const normalizedLeft = normalizeXML(leftXML, finalOptions)
    const normalizedRight = normalizeXML(rightXML, finalOptions)

    const leftObj = parseXMLToObject(normalizedLeft, finalOptions)
    const rightObj = parseXMLToObject(normalizedRight, finalOptions)

    const differences: DiffItem[] = []
    compareXMLObjects(leftObj, rightObj, '', finalOptions, differences)

    const summary = {
      added: differences.filter(d => d.type === 'added').length,
      removed: differences.filter(d => d.type === 'removed').length,
      modified: differences.filter(d => d.type === 'modified').length,
    }

    return {
      identical: differences.length === 0,
      differences,
      summary,
    }
  } catch (error) {
    throw new Error(`Failed to parse XML: ${error instanceof Error ? error.message : 'Unknown error'}`)
  }
}