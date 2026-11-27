import test from "node:test";
import assert from "node:assert/strict";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

function walk(directory) {
    const discoveredFiles = [];
    for (const directoryEntry of readdirSync(directory)) {
        const entryPath = join(directory, directoryEntry);
        const entryStat = statSync(entryPath);
        if (entryStat.isDirectory()) discoveredFiles.push(...walk(entryPath));
        else discoveredFiles.push(entryPath);
    }
    return discoveredFiles;
}

const JS_ROOTS = ["src/ui/app", "src/ui/layouts"];

// Rules for quoted string literals (single/double quotes).
// Strings must have both letters AND whitespace to be considered user-facing by
// this check, so single-word labels are handled by the template-literal check below.
function isAllowed(value) {
    const trimmedValue = value.trim();
    if (trimmedValue.startsWith("<") && trimmedValue.endsWith(">")) return true;
    if (!trimmedValue) return true;
    if (trimmedValue.startsWith("ui.")) return true;
    if (/^cognis_|^application\/|^content-type$/.test(trimmedValue))
        return true;
    if (/^\/?[a-z0-9_./:-]+$/i.test(trimmedValue)) return true;
    if (/^Inter, Arial, sans-serif$/.test(trimmedValue)) return true;
    // Space-separated CSS class name tokens are not user-facing strings.
    if (/^[a-z][a-z0-9-]*( [a-z][a-z0-9-]*)+$/.test(trimmedValue)) return true;
    // Comma-separated element names are CSS selectors, not visible labels.
    if (/^[a-z][a-z0-9-]*(,\s*[a-z][a-z0-9-]*)+$/.test(trimmedValue))
        return true;
    if (trimmedValue.includes("${")) return true;
    if (trimmedValue.startsWith(".")) return true;
    if (/^aria-[a-z-]+="[a-z-]+"$/.test(trimmedValue)) return true;
    if (trimmedValue.includes("#") && trimmedValue.includes(",")) return true;
    if (
        /^(none|fade|float|dark|admin|user|enabled|disabled|available|ok|core|page|active)$/.test(
            trimmedValue,
        )
    )
        return true;
    // Regex character-class suffixes (e.g. `]$/g,`) can become false positives
    // when the quoted replacement argument immediately follows a `"` inside a
    // regex character class like /^['"]|['"]$/g. The pattern has letters (flag
    // chars) and trailing whitespace so it passes the basic letter+space gate,
    // but it is not user-facing text.
    if (/\$\/[gimsuy]*,?$/.test(trimmedValue)) return true;
    return false;
}

// Rules for literal text nodes extracted from HTML inside template literals.
// These are the characters that appear directly between > and < with no
// interpolation, so the bar is intentionally strict.
function isAllowedTemplateTextNode(value) {
    const trimmedValue = value.trim();
    if (!trimmedValue) return true;
    if (!/[A-Za-z]/.test(trimmedValue)) return true; // symbols, emoji, numbers only
    // Animation/motion values that double as <option> display text in settings
    if (/^(none|fade|float)$/.test(trimmedValue)) return true;
    return false;
}

test("no hardcoded user-facing string literals in ui js", () => {
    const hits = [];
    for (const root of JS_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".js")) continue;
            const sourceText = readFileSync(file, "utf8");
            for (const match of sourceText.matchAll(
                /(['"])((?:\\.|(?!\1).)*)\1/g,
            )) {
                const value = match[2];
                if (!/[A-Za-z]/.test(value) || !/\s/.test(value)) continue;
                if (isAllowed(value)) continue;
                hits.push(`${file}: ${value.trim()}`);
            }
        }
    }
    assert.equal(
        hits.length,
        0,
        `Hardcoded UI strings found:\n${[...new Set(hits)].join("\n")}`,
    );
});

test("no hardcoded text nodes inside HTML template literals in ui js", () => {
    const hits = [];
    for (const root of JS_ROOTS) {
        for (const file of walk(root)) {
            if (!file.endsWith(".js")) continue;
            const sourceText = readFileSync(file, "utf8");
            // Extract simple (non-nested) template literal segments.
            // Each match captures the literal content between backticks.
            // Note: this regex does not handle escaped backticks (\`) or nested
            // template literals (template expressions containing their own backtick
            // strings). Those patterns do not currently exist in this codebase; if
            // they are introduced, this check should be updated accordingly.
            for (const [, content] of sourceText.matchAll(/`([^`]*)`/g)) {
                // Match literal text between a closing and opening HTML tag.
                // The character class excludes backtick, `$`, `{`, and `}` so that
                // interpolated expressions never produce a false positive. Quotes are
                // intentionally allowed so that apostrophes and quoted phrases in text
                // content (e.g. "It's done") are still detected.
                for (const [, text] of content.matchAll(
                    />([^<>`${}]+)(?=<)/g,
                )) {
                    const value = text.trim();
                    if (!value) continue;
                    if (!/[A-Za-z]/.test(value)) continue;
                    if (isAllowedTemplateTextNode(value)) continue;
                    hits.push(`${file}: "${value}"`);
                }
            }
        }
    }
    assert.equal(
        hits.length,
        0,
        `Hardcoded HTML text nodes in template literals:\n${[...new Set(hits)].join("\n")}`,
    );
});
