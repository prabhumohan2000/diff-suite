import { compareTextEnhanced } from '../textComparator'

describe('Text Comparator - Whitespace Edge Cases', () => {
    it('should treat texts as identical when only whitespace differs (ignoreWhitespace: true)', () => {
        const left = `This   is   a   sample   paragraph.
It has multiple   spaces between some words,
and a few\t\ttabs before this word.

Line three has a trailing space here. 
And this is the final line.`

        const right = `This is a sample paragraph.
It has  multiple spaces between   some words,   and a few tabs before this word.
Line three has a trailing space here.
And    this  is    the final   line.`

        const result = compareTextEnhanced(left, right, { ignoreWhitespace: true })

        // When ignoring whitespace, these should be identical
        expect(result.identical).toBe(true)
        expect(result.summary.added).toBe(0)
        expect(result.summary.removed).toBe(0)
        expect(result.summary.modified).toBe(0)
    })

    it('should detect differences when whitespace is NOT ignored', () => {
        const left = `This   is   a   sample   paragraph.
It has multiple   spaces between some words,
and a few\t\ttabs before this word.

Line three has a trailing space here. 
And this is the final line.`

        const right = `This is a sample paragraph.
It has  multiple spaces between   some words,   and a few tabs before this word.
Line three has a trailing space here.
And    this  is    the final   line.`

        const result = compareTextEnhanced(left, right, { ignoreWhitespace: false })

        // When NOT ignoring whitespace, these should be different
        expect(result.identical).toBe(false)
    })
})
