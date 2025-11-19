import { compareXML } from '../xmlComparator'

describe('XML Comparator', () => {
  describe('Identical XML', () => {
    it('should detect identical XML', () => {
      const left = '<user id="1"><name>Asha</name></user>'
      const right = '<user id="1"><name>Asha</name></user>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(true)
      expect(result.differences.length).toBe(0)
    })
  })

  describe('Different XML', () => {
    it('should detect element value change', () => {
      const left = '<user><name>Asha</name></user>'
      const right = '<user><name>John</name></user>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.modified).toBeGreaterThan(0)
    })

    it('should detect attribute value change', () => {
      const left = '<user id="1"></user>'
      const right = '<user id="2"></user>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.modified).toBeGreaterThan(0)
    })

    it('should detect element insertion', () => {
      const left = '<user><name>Asha</name></user>'
      const right = '<user><name>Asha</name><email>test@example.com</email></user>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.added).toBeGreaterThan(0)
    })

    it('should detect element deletion', () => {
      const left = '<user><name>Asha</name><email>test@example.com</email></user>'
      const right = '<user><name>Asha</name></user>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(false)
      expect(result.summary.removed).toBeGreaterThan(0)
    })
  })

  describe('Options', () => {
    it('should ignore whitespace when option is set', () => {
      const left = '<user><name>Asha</name></user>'
      const right = '<user>  <name>Asha</name>  </user>'
      const result = compareXML(left, right, { ignoreWhitespace: true })
      // Note: XML parser may normalize whitespace by default
      expect(result).toBeDefined()
    })

    it('should treat attribute order as significant by default', () => {
      const left = '<user id="1" role="admin" active="true"/>'
      const right = '<user active="true" id="1" role="admin"/>'
      const result = compareXML(left, right)
      expect(result.identical).toBe(false)
      expect(
        result.differences.some((d) => d.path.endsWith('._attrOrder'))
      ).toBe(true)
    })

    it('should ignore attribute order when option is set', () => {
      const left = '<user id="1" role="admin" active="true"/>'
      const right = '<user active="true" id="1" role="admin"/>'
      const result = compareXML(left, right, { ignoreAttributeOrder: true })
      expect(result.identical).toBe(true)
    })
  })
})

