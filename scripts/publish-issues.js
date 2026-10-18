import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { issuesToCreate } from './issues-data.js';

const issuesDir = path.resolve('issues');

const args = process.argv.slice(2).map(n => parseInt(n, 10)).filter(n => !isNaN(n));
const filteredIssues = args.length > 0 
    ? issuesToCreate.filter(i => args.includes(i.num))
    : issuesToCreate.filter(i => i.num >= 37);

console.log(`Starting GitHub issue publication for ${filteredIssues.length} issue(s) (Numbers: ${filteredIssues.map(i => i.num).join(', ')})...`);

for (const issue of filteredIssues) {
    const filePath = path.join(issuesDir, issue.file);
    if (!fs.existsSync(filePath)) {
        console.error(`Missing spec file: ${filePath}`);
        continue;
    }

    const bodyContent = fs.readFileSync(filePath, 'utf-8');
    const tempBodyFile = path.resolve(`temp_issue_${issue.num}.md`);
    fs.writeFileSync(tempBodyFile, bodyContent, 'utf-8');

    const labelsArg = issue.labels.map(l => `--label "${l}"`).join(' ');
    const cmd = `gh issue create --title "${issue.title}" --body-file "${tempBodyFile}" ${labelsArg}`;

    console.log(`Publishing Issue #${issue.num}: ${issue.title}...`);
    try {
        const out = execSync(cmd, { encoding: 'utf-8' });
        console.log(`✓ Published: ${out.trim()}`);
    } catch (err) {
        console.error(`✗ Error publishing Issue #${issue.num}:`, err.message);
    } finally {
        if (fs.existsSync(tempBodyFile)) {
            fs.unlinkSync(tempBodyFile);
        }
    }
}

console.log('Finished publishing all issues.');
