import { compareJSON } from '../utils/comparators/jsonComparator'
import { compareXML } from '../utils/comparators/xmlComparator'
import { compareTextEnhanced } from '../utils/comparators/textComparator'
import { validateJSON } from '../utils/validators/jsonValidator'
import { validateXML } from '../utils/validators/xmlValidator'

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

      const comparisonResult = compareJSON(left, right, options || {})
      const out: PostResult = { id, result: comparisonResult }
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

      const comparisonResult = compareXML(left, right, options || {})
      const out: PostResult = { id, result: comparisonResult }
      // @ts-ignore
      self.postMessage(out)
      return
    }

    // text
    const comparisonResult = compareTextEnhanced(left, right, options || {})
    const out: PostResult = { id, result: comparisonResult }
    // @ts-ignore
    self.postMessage(out)
  } catch (err: any) {
    const out: PostResult = { id, error: err instanceof Error ? err.message : String(err) }
    // @ts-ignore
    self.postMessage(out)
  }
})

export {}
