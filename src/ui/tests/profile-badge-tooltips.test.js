import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function read(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("profile badges expose localized hover labels", () => {
    const renderSource = read("src/adapters/social/profile/ui/profile-render.js");
    const cssSource = read("src/adapters/social/profile/ui/profile-social.css");

    assert.match(
        renderSource,
        /import \{ getRoleLabel \} from "\/static\/reuse\/access-role\.js";/,
    );
    assert.match(renderSource, /export function renderAvatarBadge\(roleValue, i18n\)/);
    assert.match(renderSource, /title="\$\{roleLabel\}" aria-label="\$\{roleLabel\}" role="img"/);
    assert.match(renderSource, /function renderUserRoleIcons\(user, i18n\)/);
    assert.match(renderSource, /title="\$\{ownerLabel\}"/);
    assert.match(renderSource, /title="\$\{adminLabel\}"/);
    assert.match(renderSource, /title="\$\{teacherLabel\}"/);
    assert.match(cssSource, /\.profile-avatar-badge \{[\s\S]*pointer-events: auto;[\s\S]*cursor: help;/m);
});
