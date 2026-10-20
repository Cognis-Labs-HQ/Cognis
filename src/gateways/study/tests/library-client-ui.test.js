import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) =>
    readFileSync(new URL("../ui/" + file, import.meta.url), "utf8");
const clientSource = read("library-client.js");
const studySubNavigationSource = read("sub-navigation.js");
const studyStylesheet = read("study.css");
test("Study client and navigation retain their Library contract", () => {
    assert.doesNotMatch(studySubNavigationSource, /layer\.views/);
    assert.match(clientSource, /apiFetch\([\s\S]*\/audio\//);
    assert.match(
        clientSource,
        /URL\.createObjectURL\(await response\.blob\(\)\)/,
    );
    assert.match(clientSource, /export async function deleteLibraryEntries/);
    assert.match(clientSource, /method: "DELETE"/);
    assert.match(clientSource, /payload\.error\?\.code \?\? "update_failed"/);
    assert.match(clientSource, /payload\.error\?\.code \?\? "request_failed"/);
    assert.match(studyStylesheet, /\.study-browse-filters/);
    assert.match(clientSource, /fetchLibraryLookupProviders/);
    assert.match(clientSource, /fetchLibraryLookupSuggestions/);
});
