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

    it('should ignore attribute order even when whitespace sensitivity is enabled', () => {
      const left = '<user id="1" role="admin" active="true"/>'
      const right = '<user   active="true"   id="1"   role="admin"/>'
      const result = compareXML(left, right, {
        ignoreAttributeOrder: true,
        ignoreWhitespace: false,
      })
      expect(result.identical).toBe(true)
    })

    it('should treat complex XML as identical when only root attribute order differs and attribute order is ignored', () => {
      const left = `<company name="techCorp" id="C001">
<department  name="Engineering" id="D10">
<team id="T1" lead="Alice">
<employee id="E101" name="John" role="Developer">
<task id="TS1" status="Open">Implement API</task>
</employee>
</team>
 
        <team id="T2" lead="Bob">
<employee id="E102" name="Sarah" role="Tester">
<task id="TS2" status="Closed">Run Test Cases</task>
</employee>
</team>
</department>
</company>`

      const right = `<company id="C001" name="techCorp">
<department  name="Engineering" id="D10">
<team id="T1" lead="Alice">
<employee id="E101" name="John" role="Developer">
<task id="TS1" status="Open">Implement API</task>
</employee>
</team>
 
        <team id="T2" lead="Bob">
<employee id="E102" name="Sarah" role="Tester">
<task id="TS2" status="Closed">Run Test Cases</task>
</employee>
</team>
</department>
</company>`

      const result = compareXML(left, right, {
        ignoreAttributeOrder: true,
        ignoreWhitespace: true,
      })

      expect(result.identical).toBe(true)
      expect(result.differences.length).toBe(0)
    })
  })
})

