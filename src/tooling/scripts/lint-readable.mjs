import { readFileSync } from 'node:fs';
import { execSync } from 'node:child_process';

const files = execSync("rg --files api core ui -g '*.ts' -g '*.js' -g '*.html' -g '*.css'").toString().trim().split('\n').filter(Boolean);
let failed = false;
for (const file of files) {
  const text = readFileSync(file, 'utf8');
  if (/\t/.test(text) || / +$/m.test(text)) {
    console.error(`Readability lint failed: ${file}`);
    failed = true;
  }
}
if (failed) process.exit(1);
