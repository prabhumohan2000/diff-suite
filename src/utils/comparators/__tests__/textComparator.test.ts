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
      // Verify that the modified line is indeed marked as 'modified'
      const modifiedLine = result.leftLines.find(l => l.content === 'line two')
      expect(modifiedLine?.type).toBe('modified')
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

    it('should treat internal spaces as equal when ignoring whitespace', () => {
      const left = 'hi test TEXT'
      const right = 'hi test TE  XT'
      const result = compareTextEnhanced(left, right, { ignoreWhitespace: true })
      expect(result.identical).toBe(true)
      expect(result.summary.modified).toBe(0)
    })

    it('should treat blank lines as meaningful when whitespace is not ignored', () => {
      const left = 'A\n\nB'
      const right = 'A\nB'
      const result = compareTextEnhanced(left, right, { ignoreWhitespace: false })
      expect(result.identical).toBe(false)
      expect(result.summary.removed).toBe(1)
      expect(result.leftLines.some((l) => l.type === 'removed' && l.content === '')).toBe(true)
    })

    it('should attribute inline additions to the right side only for whitespace-only changes', () => {
      const left = 'foo bar'
      const right = 'foo  bar'
      const result = compareTextEnhanced(left, right, { ignoreWhitespace: false })

      const leftLine = result.leftLines[0]
      const rightLine = result.rightLines[0]

      expect(leftLine.type).toBe('modified')
      expect(rightLine.type).toBe('modified')

      const leftChanges = leftLine.changes ?? []
      const rightChanges = rightLine.changes ?? []

      // Left (original) should not show the extra space as a visible addition
      expect(leftChanges.some((c) => c.type === 'added' && c.value.trim().length > 0)).toBe(false)
      // Right (modified) should highlight the extra space as an addition
      expect(rightChanges.some((c) => c.type === 'added')).toBe(true)
      // No deletions should appear on the modified side for this case
      expect(rightChanges.some((c) => c.type === 'removed')).toBe(false)
    })

    it('should attribute inline removals to the left side only for whitespace-only changes', () => {
      const left = 'foo  bar'
      const right = 'foo bar'
      const result = compareTextEnhanced(left, right, { ignoreWhitespace: false })

      const leftLine = result.leftLines[0]
      const rightLine = result.rightLines[0]

      expect(leftLine.type).toBe('modified')
      expect(rightLine.type).toBe('modified')

      const leftChanges = leftLine.changes ?? []
      const rightChanges = rightLine.changes ?? []

      // Left (original) should highlight the removed space
      expect(leftChanges.some((c) => c.type === 'removed')).toBe(true)
      // Right (modified) should not show that space as a visible deletion
      expect(rightChanges.some((c) => c.type === 'removed' && c.value.trim().length > 0)).toBe(false)
    })
    it('should handle wrapped text without duplication', () => {
      const left = 'Technology has changed the way we live, work, and communicate with each other. Earlier, people had to travel long distances to share information or send letters that took days to arrive. Now, with the help of smartphones and the internet, communication happens instantly across the world. While technology saves time and increases efficiency, it is important to use it wisely so that it does not affect our physical health or personal relationships.'
      const right = 'Technology has changed the way we live, work, and communicate with each other. Earlier, people had to travel long distances to share information or send letters that took days to arrive. Now, with the help of smartphones and the internet, communication happens instantly across the world. While technology saves time and increases efficiency, \nit is important to use it wisely so that it does not affect our physical health or personal relationships.'

      const result = compareTextEnhanced(left, right, { ignoreWhitespace: true })

      // Check for duplication in left lines
      const removedLines = result.leftLines.filter(l => l.type === 'removed')
      const modifiedLines = result.leftLines.filter(l => l.type === 'modified')

      // Pure wrapping difference with ignoreWhitespace should be treated as identical
      // because the only difference is whitespace (the newline character).
      expect(result.identical).toBe(true)
      expect(result.summary.added).toBe(0)
      expect(result.summary.removed).toBe(0)
      expect(result.summary.modified).toBe(0)
    })
  })
})
