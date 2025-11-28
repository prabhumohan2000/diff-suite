
import { compareTextEnhanced } from './src/utils/comparators/textComparator';

const left = `line 1
line 2
line 3`;

const right = `line 1 modified
line 2 modified
line 3 modified`;

const result = compareTextEnhanced(left, right, { ignoreWhitespace: false });

console.log('Left Lines:', result.leftLines.map(l => `${l.lineNumber}: ${l.type}`));
console.log('Right Lines:', result.rightLines.map(l => `${l.lineNumber}: ${l.type}`));

const removedCount = result.leftLines.filter(l => l.type === 'removed' || l.type === 'modified').length;
const addedCount = result.rightLines.filter(l => l.type === 'added' || l.type === 'modified').length;

console.log('Calculated Removed:', removedCount);
console.log('Calculated Added:', addedCount);
