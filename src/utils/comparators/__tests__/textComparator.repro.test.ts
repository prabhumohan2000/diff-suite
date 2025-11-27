import { compareTextEnhanced } from '../textComparator'

describe('Text Comparator Reproduction', () => {
    it('should correctly detect added lines when ignoring whitespace', () => {
        const left = `hi
TYE`
        const right = `hi
TYE
SAMPLE  HDJ`

        const result = compareTextEnhanced(left, right, { ignoreWhitespace: true })

        // User expects: Added: 1, Removed: 0, Modified: 0
        // Current buggy behavior (expected to fail): Added: 0, Removed: 0, Modified: 1
        expect(result.summary.added).toBe(1)
        expect(result.summary.removed).toBe(0)
        expect(result.summary.modified).toBe(0)
    })
})
