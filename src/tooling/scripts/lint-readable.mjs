import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const files = execSync(
    "rg --files src/api src/core src/ui -g '*.ts' -g '*.js' -g '*.html' -g '*.css'",
)
    .toString()
    .trim()
    .split("\n")
    .filter(Boolean);
let failed = false;

for (const file of files) {
    const text = readFileSync(file, "utf8");

    if (/\t/.test(text)) {
        console.error(`Readability lint failed (tab character): ${file}`);
        failed = true;
    }

    if (/ +$/m.test(text)) {
        console.error(`Readability lint failed (trailing whitespace): ${file}`);
        failed = true;
    }

    if (/\n\n\n/.test(text)) {
        console.error(
            `Readability lint failed (consecutive blank lines): ${file}`,
        );
        failed = true;
    }
}

if (failed) process.exit(1);
