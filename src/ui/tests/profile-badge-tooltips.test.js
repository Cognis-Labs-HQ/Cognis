import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

function readSourceFile(relativePath) {
    return readFileSync(resolve(ROOT, relativePath), "utf8");
}

test("profile badges render localized accessible labels at runtime", () => {
    const renderSource = readSourceFile(
        "src/adapters/social/profile/ui/profile-render.js",
    );
    const testableSource =
        renderSource
            .replace(/^import[\s\S]*?from .*;\n/gm, "")
            .replace(/\bexport\s+/g, "") +
        "\n" +
        "globalThis.__testExports = { renderAvatarBadge };\n";
    const context = {
        createFormBuilder() {},
        getInitialsText() {
            return "";
        },
        pickInitialsColor() {
            return "#000";
        },
        escapeHtml(value) {
            return String(value ?? "")
                .replaceAll("&", "&amp;")
                .replaceAll("<", "&lt;")
                .replaceAll(">", "&gt;")
                .replaceAll('"', "&quot;");
        },
        renderMarkdown(value) {
            return String(value ?? "");
        },
        formatDate(value) {
            return String(value ?? "");
        },
        renderInfoTooltip() {
            return "";
        },
        getRoleLabel(i18n, role) {
            return i18n.t(`ui.reuse.role_${role}`);
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "profile-render.js",
    });

    const { renderAvatarBadge } = context.__testExports;
    const i18n = {
        t(key) {
            const labels = {
                "ui.reuse.role_owner": "Owner",
                "ui.reuse.role_admin": "Admin",
                "ui.reuse.role_teacher": "Teacher",
            };
            return labels[key] ?? key;
        },
    };

    assert.doesNotMatch(renderAvatarBadge("owner", i18n), /title="/);
    assert.doesNotMatch(renderAvatarBadge("admin", i18n), /title="/);
    assert.doesNotMatch(renderAvatarBadge("teacher", i18n), /title="/);
    assert.match(
        renderAvatarBadge("owner", i18n),
        /aria-label="Owner" role="img"/,
    );
    assert.equal(renderAvatarBadge("user", i18n), "");
});

test("profile badge styles do not show hover tooltip affordance", () => {
    const cssSource = readSourceFile(
        "src/adapters/social/profile/ui/profile-social.css",
    );
    const badgeRule = cssSource.match(
        /\.profile-avatar-badge\s*\{([\s\S]*?)\n\}/m,
    );
    assert.ok(badgeRule);
    assert.match(badgeRule[1], /pointer-events:\s*none;/);
    assert.match(badgeRule[1], /cursor:\s*default;/);
});
