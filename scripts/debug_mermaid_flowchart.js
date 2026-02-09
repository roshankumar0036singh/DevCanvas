
const edgeRegex = /^\s*([A-Za-z0-9_.-]+)(\s*[( [{]{1,2}.*?[) \]}]{1,2})?\s*(?:(-+>?|-+\.?->|=+>?)|--\s+(?:"?(.+?)"?)\s+(-->|---))\s*(?:\|(?:("?)(.+?)\6)\|)?\s*([A-Za-z0-9_.-]+)(\s*[( [{]{1,2}.*?[) \]}]{1,2})?(?:\s*:\s*(.*))?$/;

const testCases = [
    'A["DevCanvas"] -->|uses| B["React"]',
    '    A["DevCanvas"] -->|uses| B["React"]',
    'A -->|uses| B',
    'A --> B',
    'A["App"] -.-> B["Lib"]',
    'A["App"] ==> B["Lib"]',
    'A -- "uses service" --> B',
];

console.log("--- Testing Mermaid Edge Regex ---");
testCases.forEach(tc => {
    const match = tc.match(edgeRegex);
    console.log(`Input: "${tc}"`);
    if (match) {
        console.log("MATCHED!");
        console.log("Source:", match[1]);
        console.log("Source Def:", match[2]);
        console.log("Arrow:", match[3] || match[5]);
        console.log("Label (Inline):", match[4]);
        console.log("Label (Pipe):", match[7]);
        console.log("Target:", match[8]);
        console.log("Target Def:", match[9]);
    } else {
        console.log("FAILED to match.");
    }
    console.log("---");
});
