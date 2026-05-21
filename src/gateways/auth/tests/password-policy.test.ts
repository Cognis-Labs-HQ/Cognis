import test from "node:test";
import assert from "node:assert/strict";
import {
    defaultPasswordPolicy,
    parsePasswordPolicy,
    checkPasswordPolicy,
} from "../password-policy.js";

test("defaultPasswordPolicy returns expected defaults", () => {
    const policy = defaultPasswordPolicy();
    assert.equal(policy.minLength, 8);
    assert.equal(policy.requireUppercase, 0);
    assert.equal(policy.requireLowercase, false);
    assert.equal(policy.requireDigit, 0);
    assert.equal(policy.requireSpecial, 0);
});

test("parsePasswordPolicy coerces and clamps values", () => {
    const policy = parsePasswordPolicy({
        minLength: 12,
        requireUppercase: 2,
        requireDigit: 1,
    });
    assert.equal(policy.minLength, 12);
    assert.equal(policy.requireUppercase, 2);
    assert.equal(policy.requireDigit, 1);
    assert.equal(policy.requireLowercase, false);

    const tooLow = parsePasswordPolicy({ minLength: 0 });
    assert.equal(tooLow.minLength, 8);

    const tooHigh = parsePasswordPolicy({ minLength: 999 });
    assert.equal(tooHigh.minLength, 8);
});

test("parsePasswordPolicy clamps negative count fields to 0", () => {
    const policy = parsePasswordPolicy({
        requireUppercase: -1,
        requireDigit: -5,
        requireSpecial: -2,
    });
    assert.equal(policy.requireUppercase, 0);
    assert.equal(policy.requireDigit, 0);
    assert.equal(policy.requireSpecial, 0);
});

test("checkPasswordPolicy returns null for a valid password", () => {
    const policy = defaultPasswordPolicy();
    assert.equal(checkPasswordPolicy("password123", policy), null);
});

test("checkPasswordPolicy catches each failing criterion", () => {
    const base = {
        minLength: 10,
        requireUppercase: 1,
        requireLowercase: true,
        requireDigit: 1,
        requireSpecial: 1,
    };
    assert.match(
        checkPasswordPolicy("short", base) ?? "",
        /password_too_short/,
    );
    assert.match(
        checkPasswordPolicy("alllowercase1!", {
            ...base,
            minLength: 0,
        }) ?? "",
        /password_requires_uppercase/,
    );
    assert.equal(
        checkPasswordPolicy("ALLUPPERCASE1!", {
            ...base,
            minLength: 0,
        }),
        "password_requires_lowercase",
    );
    assert.match(
        checkPasswordPolicy("NoDigitsHere!", {
            ...base,
            minLength: 0,
        }) ?? "",
        /password_requires_digit/,
    );
    assert.match(
        checkPasswordPolicy("NoSpecial1aA", {
            ...base,
            minLength: 0,
        }) ?? "",
        /password_requires_special/,
    );
});

test("checkPasswordPolicy enforces minimum count for uppercase", () => {
    const policy = {
        minLength: 0,
        requireUppercase: 2,
        requireLowercase: false,
        requireDigit: 0,
        requireSpecial: 0,
    };
    assert.match(
        checkPasswordPolicy("Aonly", policy) ?? "",
        /password_requires_uppercase/,
    );
    assert.equal(checkPasswordPolicy("AAok", policy), null);
});

test("checkPasswordPolicy enforces minimum count for digit", () => {
    const policy = {
        minLength: 0,
        requireUppercase: 0,
        requireLowercase: false,
        requireDigit: 3,
        requireSpecial: 0,
    };
    assert.match(
        checkPasswordPolicy("only12", policy) ?? "",
        /password_requires_digit/,
    );
    assert.equal(checkPasswordPolicy("abc123", policy), null);
});

test("checkPasswordPolicy enforces minimum count for special", () => {
    const policy = {
        minLength: 0,
        requireUppercase: 0,
        requireLowercase: false,
        requireDigit: 0,
        requireSpecial: 2,
    };
    assert.match(
        checkPasswordPolicy("only!", policy) ?? "",
        /password_requires_special/,
    );
    assert.equal(checkPasswordPolicy("ok!!", policy), null);
});
