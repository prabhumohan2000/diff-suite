
import { compareXML } from './src/utils/comparators/xmlComparator';

const xml1 = `<company id="C001" name="techCorp">
<department  name="Engineering" id="D10">
</department>
</company>`;

const xml2 = `<company       id="C001" name="techCorp">
<department  name="Engineering" id="D10">
</department>
</company>`;

console.log("--- Test Case: Ignore Whitespace TRUE ---");
const resultTrue = compareXML(xml1, xml2, { ignoreWhitespace: true });
console.log("Identical:", resultTrue.identical);

console.log("\n--- Test Case: Ignore Whitespace FALSE ---");
const resultFalse = compareXML(xml1, xml2, { ignoreWhitespace: false });
console.log("Identical:", resultFalse.identical);
