import test from "node:test";
import assert from "node:assert/strict";
import {
    VerifyTokenService,
    InMemoryVerifyTokenStore,
} from "../../reuse/verify-token.js";

function makeService(now?: () => number) {
    return new VerifyTokenService(new InMemoryVerifyTokenStore(), now);
}

test("issued token verifies successfully and returns the key", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    assert.equal(typeof token, "string");
    assert.ok(token.length >= 32);
    const result = service.verify(token);
    assert.equal(result, "alice:alice@example.com");
});

test("token is consumed on first use", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    service.verify(token);
    assert.equal(service.verify(token), null);
});

test("unknown token returns null", () => {
    const service = makeService();
    assert.equal(service.verify("notavalidtoken"), null);
});

test("expired token returns null and is removed", () => {
    let now = 1000;
    const service = makeService(() => now);
    const token = service.issue("alice:alice@example.com", 5000);
    now = 7000;
    assert.equal(service.verify(token), null);
});

test("issuing a new token for the same key revokes the previous token", () => {
    const service = makeService();
    const first = service.issue("alice:alice@example.com");
    const second = service.issue("alice:alice@example.com");
    assert.notEqual(first, second);
    assert.equal(service.verify(first), null);
    assert.equal(service.verify(second), "alice:alice@example.com");
});

test("issueOrGet returns the existing live token without revoking it", () => {
    const service = makeService();
    const first = service.issue("alice:alice@example.com");
    const second = service.issueOrGet("alice:alice@example.com");
    assert.equal(first, second);
    assert.equal(service.verify(first), "alice:alice@example.com");
});

test("issueOrGet issues a new token when none is pending", () => {
    const service = makeService();
    const token = service.issueOrGet("alice:alice@example.com");
    assert.equal(typeof token, "string");
    assert.ok(token.length >= 32);
    assert.equal(service.verify(token), "alice:alice@example.com");
});

test("issueOrGet issues a new token when the existing one has expired", () => {
    let now = 1000;
    const service = makeService(() => now);
    const first = service.issue("alice:alice@example.com", 5000);
    now = 7000;
    const second = service.issueOrGet("alice:alice@example.com", 60_000);
    assert.notEqual(first, second);
    assert.equal(service.verify(second), "alice:alice@example.com");
});

test("hasPending returns true while token is live", () => {
    const service = makeService();
    service.issue("alice:alice@example.com");
    assert.equal(service.hasPending("alice:alice@example.com"), true);
});

test("hasPending returns false after token is consumed", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    service.verify(token);
    assert.equal(service.hasPending("alice:alice@example.com"), false);
});

test("hasPending returns false for expired token", () => {
    let now = 1000;
    const service = makeService(() => now);
    service.issue("alice:alice@example.com", 5000);
    now = 7000;
    assert.equal(service.hasPending("alice:alice@example.com"), false);
});

test("tokens for different keys are independent", () => {
    const service = makeService();
    const firstToken = service.issue("alice:a@example.com");
    const secondToken = service.issue("bob:b@example.com");
    assert.equal(service.verify(firstToken), "alice:a@example.com");
    assert.equal(service.verify(secondToken), "bob:b@example.com");
});

test("isLive returns true for a live token", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    assert.equal(service.isLive(token), true);
});

test("isLive does not consume the token", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    service.isLive(token);
    assert.equal(service.verify(token), "alice:alice@example.com");
});

test("isLive returns false for an unknown token", () => {
    const service = makeService();
    assert.equal(service.isLive("notavalidtoken"), false);
});

test("isLive returns false for a consumed token", () => {
    const service = makeService();
    const token = service.issue("alice:alice@example.com");
    service.verify(token);
    assert.equal(service.isLive(token), false);
});

test("isLive returns false for an expired token", () => {
    let now = 1000;
    const service = makeService(() => now);
    const token = service.issue("alice:alice@example.com", 5000);
    now = 7000;
    assert.equal(service.isLive(token), false);
});
