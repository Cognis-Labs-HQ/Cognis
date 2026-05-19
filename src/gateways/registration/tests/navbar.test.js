import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../..");

test("registration navbar excludes admin-equivalent founders from Invite menu", () => {
    const navbarSource = readFileSync(
        resolve(ROOT, "src/gateways/registration/ui/navbar.js"),
        "utf8",
    );
    assert.ok(
        navbarSource.includes('return role === "admin" || role === "owner";'),
        "navbar admin-role gate should include owner accounts",
    );
    assert.ok(
        navbarSource.includes("if (isAdminRole() || !isFounder) return;"),
        "Invite menu should not render for admin-equivalent founders",
    );
});
