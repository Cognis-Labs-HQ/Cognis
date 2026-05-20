import test from "node:test";
import assert from "node:assert/strict";
import {
    isTrustedHttpUrl,
    matchesTrustedDomain,
    normalizeTrustedDomains,
    parsePasswordPolicy,
    checkPasswordPolicy,
    defaultPasswordPolicy,
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

test("defaultPasswordPolicy returns expected defaults", () => {
    const policy = defaultPasswordPolicy();
    assert.equal(policy.minLength, 8);
    assert.equal(policy.requireUppercase, false);
    assert.equal(policy.requireLowercase, false);
    assert.equal(policy.requireDigit, false);
    assert.equal(policy.requireSpecial, false);
});

test("parsePasswordPolicy coerces and clamps values", () => {
    const policy = parsePasswordPolicy({
        minLength: 12,
        requireUppercase: true,
        requireDigit: true,
    });
    assert.equal(policy.minLength, 12);
    assert.equal(policy.requireUppercase, true);
    assert.equal(policy.requireDigit, true);
    assert.equal(policy.requireLowercase, false);

    const tooLow = parsePasswordPolicy({ minLength: 0 });
    assert.equal(tooLow.minLength, 8);

    const tooHigh = parsePasswordPolicy({ minLength: 999 });
    assert.equal(tooHigh.minLength, 8);
});

test("checkPasswordPolicy returns null for a valid password", () => {
    const policy = defaultPasswordPolicy();
    assert.equal(checkPasswordPolicy("password123", policy), null);
});

test("checkPasswordPolicy catches each failing criterion", () => {
    const base = {
        minLength: 10,
        requireUppercase: true,
        requireLowercase: true,
        requireDigit: true,
        requireSpecial: true,
    };
    assert.match(
        checkPasswordPolicy("short", base) ?? "",
        /password_too_short/,
    );
    assert.equal(
        checkPasswordPolicy("alllowercase1!", {
            ...base,
            minLength: 0,
        }),
        "password_requires_uppercase",
    );
    assert.equal(
        checkPasswordPolicy("ALLUPPERCASE1!", {
            ...base,
            minLength: 0,
        }),
        "password_requires_lowercase",
    );
    assert.equal(
        checkPasswordPolicy("NoDigitsHere!", {
            ...base,
            minLength: 0,
        }),
        "password_requires_digit",
    );
    assert.equal(
        checkPasswordPolicy("NoSpecial1aA", {
            ...base,
            minLength: 0,
        }),
        "password_requires_special",
    );
});

test("parseSecuritySettings preserves passwordPolicy from stored JSON", () => {
    const raw = JSON.stringify({
        trustedDomains: [],
        passwordPolicy: {
            minLength: 16,
            requireUppercase: true,
            requireSpecial: true,
        },
    });
    const settings = parseSecuritySettings(raw);
    assert.equal(settings?.passwordPolicy.minLength, 16);
    assert.equal(settings?.passwordPolicy.requireUppercase, true);
    assert.equal(settings?.passwordPolicy.requireSpecial, true);
    assert.equal(settings?.passwordPolicy.requireDigit, false);
});
