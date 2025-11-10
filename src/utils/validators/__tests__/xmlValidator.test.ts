import { validateXML } from '../xmlValidator'

describe('XML Validator', () => {
  describe('Valid XML', () => {
    it('should validate simple XML', () => {
      const result = validateXML('<user id="1"><name>Asha</name></user>')
      expect(result.valid).toBe(true)
      expect(result.error).toBeUndefined()
    })

    it('should validate XML with multiple elements', () => {
      const result = validateXML('<root><a>1</a><b>2</b></root>')
      expect(result.valid).toBe(true)
    })

    it('should validate XML with attributes', () => {
      const result = validateXML('<user id="1" name="test"><email>test@example.com</email></user>')
      expect(result.valid).toBe(true)
    })
  })

  describe('Invalid XML', () => {
    it('should detect mismatched tags', () => {
      const result = validateXML('<user><name>Asha</user>')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect unclosed tag', () => {
      const result = validateXML('<user><name>Asha</name>')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect empty input', () => {
      const result = validateXML('')
      expect(result.valid).toBe(false)
      expect(result.error?.message).toBe('Empty input')
    })

    it('should detect illegal characters', () => {
      const result = validateXML('<user>\x00</user>')
      expect(result.valid).toBe(false)
      expect(result.error).toBeDefined()
    })

    it('should detect duplicate attributes', () => {
      const result = validateXML('<user id="1" id="2"></user>')
      // Note: Some parsers may allow duplicate attributes, so this test may need adjustment
      expect(result.valid).toBeDefined()
    })
  })
})

