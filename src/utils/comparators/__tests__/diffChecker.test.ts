import { computeLineDiff } from '../../diffUtils/diffChecker'

describe('diffChecker', () => {
    describe('computeLineDiff', () => {
        it('should handle insertions correctly without scrambling the rest of the line', () => {
            const left = 'The quick brown fox'
            const right = 'The quick red brown fox'
            const result = computeLineDiff(left, right)

            // Expect "The quick " (unchanged), "red " (added), "brown fox" (unchanged)
            const addedParts = result.parts.filter(p => p.added)
            expect(addedParts.length).toBeGreaterThan(0)
            expect(addedParts[0].value).toContain('red')

            const unchangedParts = result.parts.filter(p => !p.added && !p.removed)
            const lastPart = unchangedParts[unchangedParts.length - 1]
            expect(lastPart.value).toContain('brown fox')
        })

        it('should handle deletions correctly', () => {
            const left = 'The quick red brown fox'
            const right = 'The quick brown fox'
            const result = computeLineDiff(left, right)

            const removedParts = result.parts.filter(p => p.removed)
            expect(removedParts.length).toBeGreaterThan(0)
            expect(removedParts[0].value).toContain('red')
        })

        it('should ignore whitespace when option is set', () => {
            const left = '  foo  '
            const right = 'foo'
            const result = computeLineDiff(left, right, { ignoreWhitespace: true })
            expect(result.same).toBe(true)
        })

        it('should show whitespace differences if there are other changes even with ignoreWhitespace', () => {
            const left = 'foo bar'
            const right = 'foo  baz'

            const result = computeLineDiff(left, right, { ignoreWhitespace: true })
            expect(result.same).toBe(false)

            // We want to ensure that purely whitespace additions/removals are NOT marked as added/removed.
            const whitespaceOnlyAdditions = result.parts.filter(p => p.added && p.value.trim().length === 0)
            expect(whitespaceOnlyAdditions.length).toBe(0)
        })
    })
})
