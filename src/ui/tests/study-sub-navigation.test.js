import test from "node:test";
import assert from "node:assert/strict";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { readFileSync } from "node:fs";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("Study submenu links use the user-dropdown button class", () => {
    const source = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/sub-navigation.js"),
        "utf8",
    );
    const stylesheet = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.css"),
        "utf8",
    );

    assert.match(source, /class="dropdown-item\$\{activeClass\}"/);
    assert.match(source, /class="dropdown-item\$\{settingsActiveClass\}"/);
    assert.doesNotMatch(
        source,
        /class="[^"]*study-subnav-(?:link|module-link|language-option|settings-link)(?:\s|"|\$)/,
    );
    assert.doesNotMatch(
        stylesheet,
        /\.study-subnav-(?:module-link|language-option|settings-link)(?:\s|,|\{|:)/,
    );
});
