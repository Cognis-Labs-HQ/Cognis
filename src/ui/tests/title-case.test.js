import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { join } from "node:path";

const EN_STRINGS_PATH = join(process.cwd(), "src/ui/languages/en/strings.xml");

function parseStrings(xml) {
    const entries = new Map();
    const re = /<string name="([^"]+)">([^<]*)<\/string>/g;
    let m;
    while ((m = re.exec(xml)) !== null) {
        entries.set(m[1], m[2]);
    }
    return entries;
}

function isTitleCase(text) {
    const words = text.split(/\s+/).filter(Boolean);
    return words.every((word) => {
        const stripped = word
            .replace(/^[^A-Za-z]*/, "")
            .replace(/[^A-Za-z]*$/, "");
        if (!stripped) return true;
        return stripped[0] === stripped[0].toUpperCase();
    });
}

const TITLE_CASE_PATTERNS = [
    (key) => key.endsWith(".title") && !key.endsWith("page_title"),
    (key) => key.endsWith("page_title"),
    (key) => key.startsWith("ui.reuse.menu."),
];

test("English headings and titles use Title Case", () => {
    const xml = readFileSync(EN_STRINGS_PATH, "utf8");
    const strings = parseStrings(xml);
    const violations = [];

    for (const [key, value] of strings) {
        const isTitle = TITLE_CASE_PATTERNS.some((fn) => fn(key));
        if (!isTitle) continue;
        if (!value.trim()) continue;
        if (!/[A-Za-z]/.test(value)) continue;
        if (!isTitleCase(value)) {
            violations.push(`  ${key}: "${value}"`);
        }
    }

    assert.deepEqual(
        violations,
        [],
        `Title Case violations found in en/strings.xml:\n${violations.join("\n")}`,
    );
});
