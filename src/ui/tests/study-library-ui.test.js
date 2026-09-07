import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const source = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/app/index.js"),
    "utf8",
);
const stylesheet = readFileSync(
    resolve(ROOT, "src/adapters/study/library/ui/library.css"),
    "utf8",
);
const clientSource = readFileSync(
    resolve(ROOT, "src/gateways/study/ui/library-client.js"),
    "utf8",
);

test("Study Library presents browsable layers as filterable card tabs", () => {
    assert.match(source, /role="tablist"/);
    assert.match(source, /role="tabpanel"/);
    assert.match(source, /class="library-entry-card btn-neutral"/);
    assert.match(source, /class="library-filter-pill btn-neutral"/);
    assert.match(source, /aria-pressed="false"/);
    assert.match(source, /function applyLibraryFilters/);
    assert.match(source, /data-library-filter-exclusive/);
    assert.match(source, /classList\.toggle\("active", willActivate\)/);
    assert.match(stylesheet, /\.library-entry-grid/);
    assert.match(stylesheet, /\.library-filters/);
    assert.match(stylesheet, /\.library-filter-pill\.active/);
    assert.match(stylesheet, /\.library-entry-card\[hidden\]/);
    assert.match(stylesheet, /\.study-subnav-language-options/);
});

test("Study Library integrates definitions and particles into item details", () => {
    assert.match(source, /function isMeaningLayer/);
    assert.match(source, /layer\.semanticRole !== "particle"/);
    assert.match(source, /class="library-detail-summary"/);
    assert.match(source, /class="library-component-box btn-neutral"/);
    assert.match(source, /layer\?\.semanticRole === "particle"/);
    assert.match(source, /const components = references\.filter/);
});

test("Study Library renders metadata and scope indicators", () => {
    assert.match(source, /detail\?\.renderer === "badge"/);
    assert.match(source, /class="library-metadata-pill"/);
    assert.match(source, /class="library-scope"/);
    assert.match(stylesheet, /\.library-metadata-pill/);
});

test("Study Library renders writing-unit pronunciation and audio", () => {
    assert.match(source, /function renderPronunciation/);
    assert.match(source, /function renderAudio/);
    assert.match(source, /<audio class="library-audio" controls/);
    assert.match(source, /fetchLibraryAudioUrl/);
    assert.match(source, /audio\.src = objectUrl/);
    assert.match(source, /audio\.replaceWith\(message\)/);
    assert.match(source, /gateway\.study\.library_audio_load_error/);
    assert.match(source, /URL\.revokeObjectURL/);
    assert.match(clientSource, /apiFetch\([\s\S]*\/audio\//);
    assert.match(
        clientSource,
        /URL\.createObjectURL\(await response\.blob\(\)\)/,
    );
    assert.match(stylesheet, /\.library-audio/);
    assert.match(stylesheet, /color-scheme: light dark/);
    assert.match(stylesheet, /body\[data-theme="light"\] \.library-audio/);
    assert.match(stylesheet, /body\[data-theme="dark"\] \.library-audio/);
    assert.match(stylesheet, /background: var\(--surface-2\)/);
    assert.match(stylesheet, /\.library-audio-error/);
});

test("Study Library popup uses equal directional navigation controls", () => {
    assert.match(source, /label: `← \$\{i18n\.t/);
    assert.match(source, /i18n\.t\("gateway\.study\.library_next"\)\} →`/);
    assert.match(stylesheet, /flex: 1 1 calc\(50% - 0\.5rem\)/);
});
