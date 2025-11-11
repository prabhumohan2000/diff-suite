/**
 * XML Normalization Utility (ported from diff-checker)
 * Sorts attributes alphabetically and formats XML for stable text diffs.
 */

export const normalizeXMLAttributes = (xmlString: string): string => {
  try {
    const parser = new DOMParser()
    const xmlDoc = parser.parseFromString(xmlString, 'text/xml')

    const parserError = (xmlDoc as Document).querySelector('parsererror')
    if (parserError) {
      throw new Error('Invalid XML')
    }

    const sortAttributes = (node: Element) => {
      if (node.attributes && node.attributes.length > 0) {
        const attrs: Array<{ name: string; value: string }> = []
        for (let i = 0; i < node.attributes.length; i++) {
          const attr = node.attributes[i]
          attrs.push({ name: attr.name, value: attr.value })
        }

        attrs.sort((a, b) => a.name.localeCompare(b.name))

        while (node.attributes.length > 0) {
          node.removeAttribute(node.attributes[0].name)
        }

        attrs.forEach((attr) => {
          node.setAttribute(attr.name, attr.value)
        })
      }

      for (let i = 0; i < node.children.length; i++) {
        sortAttributes(node.children[i])
      }
    }

    if (xmlDoc.documentElement) {
      sortAttributes(xmlDoc.documentElement)
    }

    const serializer = new XMLSerializer()
    let normalized = serializer.serializeToString(xmlDoc)

    // Add newlines and indentation for readability and stable line-based diffs
    normalized = normalized
      .replace(/></g, '>\\n<')
      .split('\n')
      .map((line, index, arr) => {
        const trimmed = line.trim()
        const depth = arr.slice(0, index).reduce((d, l) => {
          const t = l.trim()
          if (t.startsWith('</')) return d - 1
          if (t.startsWith('<') && !t.startsWith('<?') && !t.endsWith('/>')) return d + 1
          return d
        }, 0)
        return '  '.repeat(Math.max(0, depth)) + trimmed
      })
      .join('\n')

    return normalized
  } catch (error) {
    // On failure, return original string to avoid breaking comparison
    return xmlString
  }
}
