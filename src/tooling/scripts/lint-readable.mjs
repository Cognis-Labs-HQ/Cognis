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

// Preserve visual boundaries in the large classes where accidental whitespace
// churn previously obscured reviews. Prettier keeps blank lines but does not
// create them, so this guard supplies the missing structural guarantee.
const structuredClassFiles = [
    "src/adapters/notify/smtp/notification-sender.ts",
    "src/gateways/calendar/gateway/index.ts",
];

for (const file of structuredClassFiles) {
    const lines = readFileSync(file, "utf8").split("\n");
    const callableMemberPattern =
        /^    (?!(?:if|for|while|switch|catch|function)\b)(?:(?:public|private|protected|static|abstract|override|async|get|set)\s+)*(?:constructor|[#A-Za-z_$][\w$]*)\s*(?:<[^>]+>)?\s*\(/;
    for (let index = 1; index < lines.length; index += 1) {
        if (!callableMemberPattern.test(lines[index])) continue;
        const previousLine = lines[index - 1].trim();
        if (previousLine && !/(?:^|\s)(?:class|{)$/.test(previousLine)) {
            console.error(
                `Readability lint failed (class methods require a blank-line boundary): ${file}:${index + 1}`,
            );
            failed = true;
        }
    }
}

const jitsiApp = readFileSync("src/modules/jitsi-meet/ui/app.js", "utf8");
if (
    !/state\.availableParticipants = [\s\S]*?;\n\n    const composer = createPageComposer/.test(
        jitsiApp,
    )
) {
    console.error(
        "Readability lint failed (Jitsi state and composer blocks require separation)",
    );
    failed = true;
}

if (failed) process.exit(1);
