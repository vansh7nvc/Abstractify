import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

const wikiRepoUrl = 'https://github.com/vansh7nvc/Abstractify.wiki.git';
const tempWikiDir = path.join(process.cwd(), '.temp_wiki');
const sourceWikiDir = path.join(process.cwd(), 'wiki');

console.log('📚 Syncing local wiki/ documentation to native GitHub Wiki tab...');

try {
    // 1. Clean up temp dir if exists
    if (fs.existsSync(tempWikiDir)) {
        fs.rmSync(tempWikiDir, { recursive: true, force: true });
    }

    // 2. Clone GitHub Wiki repository
    console.log(`📥 Cloning ${wikiRepoUrl}...`);
    try {
        execSync(`git clone ${wikiRepoUrl} "${tempWikiDir}"`, { stdio: 'inherit' });
    } catch (err) {
        console.error('\n⚠️ Note: GitHub Wiki repository not initialized yet on GitHub.');
        console.log('👉 Please go to: https://github.com/vansh7nvc/Abstractify/wiki');
        console.log('👉 Click "Create the first page" and save it. Then re-run this script!');
        process.exit(1);
    }

    // 3. Copy files from local wiki/ to .temp_wiki
    const files = fs.readdirSync(sourceWikiDir);
    for (const file of files) {
        if (file.endsWith('.md')) {
            const srcPath = path.join(sourceWikiDir, file);
            const destPath = path.join(tempWikiDir, file);
            fs.copyFileSync(srcPath, destPath);
            console.log(`   📄 Copied ${file} -> GitHub Wiki`);
        }
    }

    // 4. Commit and push to GitHub Wiki git repo
    execSync('git add .', { cwd: tempWikiDir });
    try {
        execSync('git commit -m "docs(wiki): update GitHub Wiki pages"', { cwd: tempWikiDir });
    } catch (e) {
        console.log('   (No changes to commit)');
    }
    execSync('git push origin master || git push origin main', { cwd: tempWikiDir, stdio: 'inherit' });

    console.log('\n🎉 Successfully published all 6 pages to your native GitHub Wiki tab!');
    console.log('👉 View live: https://github.com/vansh7nvc/Abstractify/wiki');

    // Clean up temp directory
    fs.rmSync(tempWikiDir, { recursive: true, force: true });

} catch (err) {
    console.error('❌ Error publishing to GitHub Wiki:', err.message);
}
