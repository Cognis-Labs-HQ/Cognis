/**
 * Tests for the shared Study sub-navigation rendering utilities.
 *
 * Tests renderStudySubNavigation output structure, clearStudySubNavCache
 * export, and the hasLibraryModule detection logic.
 */
import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const SOURCE_FILE = resolve(
    dirname(fileURLToPath(import.meta.url)),
    "..",
    "study-sub-navigation.js",
);
const source = readFileSync(SOURCE_FILE, "utf8");

test("study-sub-navigation exports clearStudySubNavCache", () => {
    assert.match(
        source,
        /export function clearStudySubNavCache\(\)/,
        "clearStudySubNavCache must be an exported function",
    );
});

test("study-sub-navigation clearStudySubNavCache resets the cache fields", () => {
    assert.match(
        source,
        /clearStudySubNavCache[\s\S]*?SUB_NAV_CACHE\.registeredLanguages\s*=\s*null/,
        "clearStudySubNavCache must reset registeredLanguages",
    );
    assert.match(
        source,
        /clearStudySubNavCache[\s\S]*?SUB_NAV_CACHE\.learningLanguages\s*=\s*null/,
        "clearStudySubNavCache must reset learningLanguages",
    );
    assert.match(
        source,
        /clearStudySubNavCache[\s\S]*?SUB_NAV_CACHE\.modulesByLanguage\s*=\s*new Map\(\)/,
        "clearStudySubNavCache must reset modulesByLanguage",
    );
});

test("study-sub-navigation exports loadStudySubNavigationModel", () => {
    assert.match(source, /export async function loadStudySubNavigationModel/);
});

test("study-sub-navigation exports renderStudySubNavigation", () => {
    assert.match(source, /export function renderStudySubNavigation/);
});

test("study-sub-navigation hasLibraryModule checks by id not pageUrl", () => {
    assert.match(
        source,
        /hasLibraryModule[\s\S]{0,200}component\?\.id[\s\S]{0,50}===\s*["']library["']/,
        "hasLibraryModule must check component.id === 'library', not pageUrl",
    );
    assert.doesNotMatch(
        source,
        /hasLibraryModule[\s\S]{0,200}pageUrl[\s\S]{0,50}===.*\/study\/library/,
        "hasLibraryModule must not rely on a hardcoded /study/library URL",
    );
});

test("study-sub-navigation renderStudySubNavigation renders module links from model", () => {
    assert.match(
        source,
        /model\.modules[\s\S]*?\.map\(/,
        "renderStudySubNavigation must map over model.modules",
    );
});

test("study-sub-navigation renderStudySubNavigation renders language switcher", () => {
    assert.match(
        source,
        /study-subnav-language-option/,
        "renderStudySubNavigation must render language options",
    );
});

test("study-sub-navigation admin library fallback uses buildLibraryUrl", () => {
    assert.match(
        source,
        /buildLibraryUrl\(\)/,
        "admin library link href must be built via buildLibraryUrl()",
    );
});

test("study-sub-navigation module cache uses SUB_NAV_CACHE", () => {
    assert.match(source, /SUB_NAV_CACHE\s*=\s*\{/);
    assert.match(source, /registeredLanguages:\s*null/);
    assert.match(source, /learningLanguages:\s*null/);
    assert.match(source, /modulesByLanguage:\s*new Map\(\)/);
});
