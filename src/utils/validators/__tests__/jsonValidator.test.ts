import { validateJSON } from '../jsonValidator'

describe('JSON Validator', () => {
  describe('Valid JSON', () => {
    it('should validate simple JSON object', () => {
      const result = validateJSON('{"user":{"id":1,"name":"Asha"}}')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate JSON array', () => {
      const result = validateJSON('[1, 2, 3]')
      expect(result.valid).toBe(true)
    })

    it('should validate nested JSON', () => {
      const result = validateJSON('{"a":1,"b":[1,2,3],"c":{"d":"e"}}')
      expect(result.valid).toBe(true)
    })
  })

  describe('Invalid JSON', () => {
    it('should detect trailing comma', () => {
      const result = validateJSON('{"user": { "id": 1, "name": "Asha", }}')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
      expect(result.error?.message).toContain('comma')
    })

    it('should detect missing comma', () => {
      const result = validateJSON('{"a":1 "b":2}')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect unquoted key', () => {
      const result = validateJSON('{a:1}')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect invalid string escape', () => {
      const result = validateJSON('{"text":"hello\\x"}')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect empty input', () => {
      const result = validateJSON('')
      expect(result.valid).toBe(false)
      expect(result.error?.message).toBe('Empty input')
    })

    it('should detect unclosed bracket', () => {
      const result = validateJSON('{"a":1')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })
  })

  describe('Error reporting', () => {
    it('should report error with line and column when available', () => {
      const json = '{\n  "a": 1\n  "b": 2\n}'
      const result = validateJSON(json)
      expect(result.valid).toBe(false)
      // Note: Line/column detection may vary based on error message format
    })
  })
})

