/**
 * Lightweight XML pretty printer for diff display.
 * - Keeps original attribute order
 * - Adds newlines between tags and indents by nesting depth
 * - Falls back to the original string if parsing fails
 */
export const prettifyXML = (xmlString: string): string => {
  if (!xmlString || typeof xmlString !== 'string') return '' + (xmlString as any)
  try {
    // Try to parse so we don't pretty print invalid XML
    const parser = new DOMParser()
    const doc = parser.parseFromString(xmlString, 'application/xml')
    const err = doc.querySelector('parsererror')
    if (err) return xmlString

    const serializer = new XMLSerializer()
    let s = serializer.serializeToString(doc)

    // Insert newlines between adjacent tags
    s = s.replace(/></g, '>$__NL__<')

    // Indent per tag nesting depth
    const lines = s.split('$__NL__')
    let depth = 0
    const out: string[] = []
    for (const raw of lines) {
      const line = raw.trim()
      // Closing tag reduces depth first
      const isClosing = /^<\/(?!\!)/.test(line)
      const isSelfClosing = /<[^>]+\/>$/.test(line)
      const isOpening = /^<(?!\/|\?|\!)[^>]+>$/.test(line) && !isSelfClosing

      if (isClosing) depth = Math.max(0, depth - 1)
      out.push('  '.repeat(depth) + line)
      if (isOpening) depth++
    }

    return out.join('\n')
  } catch {
    return xmlString
  }
}

