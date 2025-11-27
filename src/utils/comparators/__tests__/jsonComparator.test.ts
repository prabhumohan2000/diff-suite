import { compareJSON } from '../jsonComparator'

describe('JSON Comparator', () => {
  describe('Identical JSON', () => {
    it('should detect identical objects', () => {
      const left = '{"a":1,"b":2}'
      const right = '{"a":1,"b":2}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(true)
      expect(result.differences.length).toBe(0)
    })

    it('should detect identical objects with different key order when ignoreKeyOrder is true', () => {
      const left = '{"a":1,"b":2}'
      const right = '{"b":2,"a":1}'
      const result = compareJSON(left, right, { ignoreKeyOrder: true })
      expect(result.identical).toBe(true)
    })
  })

  describe('Different JSON', () => {
    it('should detect value change', () => {
      const left = '{"a":1,"b":2}'
      const right = '{"a":1,"b":3}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.modified).toBeGreaterThan(0)
    })

    it('should detect missing key', () => {
      const left = '{"a":1,"b":2}'
      const right = '{"a":1}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.removed).toBeGreaterThan(0)
    })

    it('should detect extra key', () => {
      const left = '{"a":1}'
      const right = '{"a":1,"b":2}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.added).toBeGreaterThan(0)
    })

    it('should detect nested object difference', () => {
      const left = '{"user":{"id":1,"name":"Asha"}}'
      const right = '{"user":{"id":1,"name":"John"}}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.modified).toBeGreaterThan(0)
    })
  })

  describe('Options', () => {
    it('should ignore key order when option is set', () => {
      const left = '{"a":1,"b":[1,2,3]}'
      const right = '{"b":[1,2,3],"a":1}'
      const result = compareJSON(left, right, { ignoreKeyOrder: true })
      expect(result.identical).toBe(true)
    })

    it('should treat key order as significant by default', () => {
      const left = '{"a":1,"b":2}'
      const right = '{"b":2,"a":1}'
      const result = compareJSON(left, right)
      expect(result.identical).toBe(false)
      expect(
        result.differences.some(
          (d) => d.path === '_keyOrder' || d.path.endsWith('._keyOrder')
        )
      ).toBe(true)
    })

    it('should ignore array order when option is set', () => {
      const left = '{"a":[1,2,3]}'
      const right = '{"a":[3,2,1]}'
      const result = compareJSON(left, right, { ignoreArrayOrder: true })
      expect(result.identical).toBe(true)
      expect(result.summary.modified).toBe(0)
    })

    it('should ignore array order even when whitespace is significant', () => {
      const left = '{\n  "items": [\n    "apple",\n    "banana",\n    "cherry"\n  ]\n}'
      const right = '{\n  "items": [\n    "cherry",\n    "banana",\n    "apple"\n  ]\n}'
      const result = compareJSON(left, right, { ignoreArrayOrder: true, ignoreWhitespace: false })
      expect(result.identical).toBe(true)
      expect(result.summary.added).toBe(0)
      expect(result.summary.removed).toBe(0)
      expect(result.summary.modified).toBe(0)
    })

    it('should be case sensitive by default', () => {
      const left = '{"name":"John"}'
      const right = '{"name":"john"}'
      const result = compareJSON(left, right, { caseSensitive: true })
      expect(result.identical).toBe(false)
    })

    it('should be case insensitive when option is set', () => {
      const left = '{"name":"John"}'
      const right = '{"name":"john"}'
      const result = compareJSON(left, right, { caseSensitive: false })
      expect(result.identical).toBe(true)
    })
  })
})

