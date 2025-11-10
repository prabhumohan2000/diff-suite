import { compareTextEnhanced } from '../textComparator'

describe('Text Comparator', () => {
  describe('Identical text', () => {
    it('should detect identical text', () => {
      const left = 'line one\nline two'
      const right = 'line one\nline two'
      const result = compareTextEnhanced(left, right)
      expect(result.identical).toBe(true)
      expect(result.summary.added).toBe(0)
      expect(result.summary.removed).toBe(0)
      expect(result.summary.modified).toBe(0)
    })
  })

  describe('Different text', () => {
    it('should detect line addition', () => {
      const left = 'line one\nline two'
      const right = 'line one\nline two\nline three'
      const result = compareTextEnhanced(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.added).toBeGreaterThan(0)
    })

    it('should detect line removal', () => {
      const left = 'line one\nline two\nline three'
      const right = 'line one\nline two'
      const result = compareTextEnhanced(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.removed).toBeGreaterThan(0)
    })

    it('should detect line modification', () => {
      const left = 'line one\nline two'
      const right = 'line one\nline too'
      const result = compareTextEnhanced(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.modified).toBeGreaterThan(0)
    })
  })

  describe('Options', () => {
    it('should be case sensitive by default', () => {
      const left = 'Hello World'
      const right = 'hello world'
      const result = compareTextEnhanced(left, right, { caseSensitive: true })
      expect(result.identical).toBe(false)
    })

    it('should be case insensitive when option is set', () => {
      const left = 'Hello World'
      const right = 'hello world'
      const result = compareTextEnhanced(left, right, { caseSensitive: false })
      expect(result.identical).toBe(true)
    })

    it('should ignore whitespace when option is set', () => {
      const left = 'line one\nline two'
      const right = 'line one  \n  line two'
      const result = compareTextEnhanced(left, right, { ignoreWhitespace: true })
      expect(result.identical).toBe(true)
    })
  })
})

