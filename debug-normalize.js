// Debug script to understand the normalization
const left = `This   is   a   sample   paragraph.
It has multiple   spaces between some words,
and a few\t\ttabs before this word.

Line three has a trailing space here. 
And this is the final line.`

const right = `This is a sample paragraph.
It has  multiple spaces between   some words,   and a few tabs before this word.
Line three has a trailing space here.
And    this  is    the final   line.`

const normalize = (s) => s.replace(/\s+/g, '')

const leftLines = left.split('\n')
const rightLines = right.split('\n')

console.log('Left lines:', leftLines.length)
console.log('Right lines:', rightLines.length)
console.log('\nLeft normalized lines:')
leftLines.forEach((line, i) => console.log(`  ${i}: "${normalize(line)}"`))
console.log('\nRight normalized lines:')
rightLines.forEach((line, i) => console.log(`  ${i}: "${normalize(line)}"`))

console.log('\nFull normalized left:', normalize(left))
console.log('Full normalized right:', normalize(right))
console.log('\nAre they equal?', normalize(left) === normalize(right))
