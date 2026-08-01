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
const typescript = await import("typescript");
const structuredClassFiles = [
    "src/adapters/notify/smtp/notification-sender.ts",
    "src/gateways/calendar/gateway/index.ts",
];

for (const file of structuredClassFiles) {
    const text = readFileSync(file, "utf8");
    const sourceFile = typescript.createSourceFile(
        file,
        text,
        typescript.ScriptTarget.Latest,
        true,
        typescript.ScriptKind.TS,
    );
    const isCallableMember = (member) =>
        typescript.isConstructorDeclaration(member) ||
        typescript.isMethodDeclaration(member) ||
        typescript.isGetAccessorDeclaration(member) ||
        typescript.isSetAccessorDeclaration(member);
    const visit = (node) => {
        if (typescript.isClassLike(node)) {
            for (let index = 1; index < node.members.length; index += 1) {
                const previousMember = node.members[index - 1];
                const member = node.members[index];
                if (!isCallableMember(member)) continue;
                const boundary = text.slice(
                    previousMember.end,
                    member.getStart(sourceFile),
                );
                if (!/\n\s*\n/.test(boundary)) {
                    const line =
                        sourceFile.getLineAndCharacterOfPosition(
                            member.getStart(sourceFile),
                        ).line + 1;
                    console.error(
                        `Readability lint failed (class methods require a blank-line boundary): ${file}:${line}`,
                    );
                    failed = true;
                }
            }
        }
        typescript.forEachChild(node, visit);
    };
    visit(sourceFile);
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
