
const fs = require('fs');
const { execSync } = require('child_process');

const FILE_NAME = 'TEST_COMMITS.md';
const TOTAL_COMMITS = 100;

if (!fs.existsSync(FILE_NAME)) {
    fs.writeFileSync(FILE_NAME, '# Test Commits History\n\n');
}

console.log(`Starting to generate ${TOTAL_COMMITS} commits...`);

for (let i = 1; i <= TOTAL_COMMITS; i++) {
    const timestamp = new Date().toISOString();
    const content = `- Commit #${i}: ${timestamp}\n`;

    fs.appendFileSync(FILE_NAME, content);

    try {
        execSync(`git add ${FILE_NAME}`);
        execSync(`git commit -m "chore: test commit ${i} for visualization testing"`);
        process.stdout.write(`\rCommitted ${i}/${TOTAL_COMMITS}`);
    } catch (error) {
        console.error(`\nFailed at commit ${i}:`, error.message);
        break;
    }
}

console.log('\nDone!');
