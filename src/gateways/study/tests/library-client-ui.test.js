import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";

const read = (file) =>
    readFileSync(new URL("../ui/" + file, import.meta.url), "utf8");
const clientSource = read("library-client.js");
const studyStylesheet = read("study.css");
test("Study client and navigation retain their Library contract", () => {
    assert.match(clientSource, /request\([\s\S]*\/audio\//);
    assert.match(
        clientSource,
        /URL\.createObjectURL\(await response\.blob\(\)\)/,
    );
    assert.match(clientSource, /async function executeDeleteLibraryEntries/);
    assert.match(clientSource, /method: "DELETE"/);
    assert.match(clientSource, /payload\.error\?\.code \?\? "update_failed"/);
    assert.match(clientSource, /payload\.error\?\.code \?\? "request_failed"/);
    assert.match(studyStylesheet, /\.study-browse-filters/);
    assert.match(clientSource, /fetchLibraryLookupProviders/);
    assert.match(clientSource, /fetchLibraryLookupSuggestions/);
});
