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

test("profile badges render localized hover labels at runtime", () => {
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

    assert.match(renderAvatarBadge("owner", i18n), /title="Owner"/);
    assert.match(renderAvatarBadge("admin", i18n), /title="Admin"/);
    assert.match(renderAvatarBadge("teacher", i18n), /title="Teacher"/);
    assert.match(
        renderAvatarBadge("owner", i18n),
        /aria-label="Owner" role="img"/,
    );
    assert.equal(renderAvatarBadge("user", i18n), "");
});

test("profile badge styles allow native hover tooltips", () => {
    const cssSource = readSourceFile(
        "src/adapters/social/profile/ui/profile-social.css",
    );

    assert.match(
        cssSource,
        /\.profile-avatar-badge \{[\s\S]*pointer-events: auto;/m,
    );
    assert.match(cssSource, /\.profile-avatar-badge \{[\s\S]*cursor: help;/m);
});
