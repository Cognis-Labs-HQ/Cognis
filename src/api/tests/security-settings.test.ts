import test from "node:test";
import assert from "node:assert/strict";
import {
    isTrustedHttpUrl,
    matchesTrustedDomain,
    normalizeTrustedDomains,
    parseSecuritySettings,
} from "../reuse/security-settings.js";

test("normalizeTrustedDomains trims, deduplicates, and strips surrounding dots", () => {
    assert.deepEqual(
        normalizeTrustedDomains([
            " Example.com ",
            ".docs.example.com.",
            "example.com",
            "",
            5,
        ]),
        ["example.com", "docs.example.com"],
    );
});

test("matchesTrustedDomain accepts direct and subdomain matches", () => {
    assert.equal(matchesTrustedDomain("example.com", ["example.com"]), true);
    assert.equal(
        matchesTrustedDomain("status.example.com", ["example.com"]),
        true,
    );
    assert.equal(matchesTrustedDomain("example.net", ["example.com"]), false);
});

test("isTrustedHttpUrl allows same-origin and trusted external HTTP(S) URLs only", () => {
    assert.equal(
        isTrustedHttpUrl("/docs", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: [],
        }),
        true,
    );
    assert.equal(
        isTrustedHttpUrl("https://status.example.com/landing", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: ["example.com"],
        }),
        true,
    );
    assert.equal(
        isTrustedHttpUrl("https://attacker.example.net/landing", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: ["example.com"],
        }),
        false,
    );
    assert.equal(
        isTrustedHttpUrl("https://user:pass@example.com/private", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: ["example.com"],
        }),
        false,
    );
});

test("parseSecuritySettings returns default settings when raw is null", () => {
    const settings = parseSecuritySettings(null);
    assert.deepEqual(settings?.trustedDomains, []);
    assert.equal(settings?.registrationsEnabled, false);
    assert.equal(settings?.userValidationMode, "none");
    assert.equal(settings?.requireTeacherManualApproval, true);
    assert.equal(settings?.enforceTfaForAllUsers, false);
});
