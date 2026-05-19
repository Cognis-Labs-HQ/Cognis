import test from "node:test";
import assert from "node:assert/strict";
import { SmtpRateLimiter } from "../smtp-notification-sender.js";

test("SmtpRateLimiter allows first send", () => {
    const limiter = new SmtpRateLimiter(60_000);
    assert.equal(limiter.isThrottled("test@example.com"), false);
});

test("SmtpRateLimiter throttles sends within the window", () => {
    let now = 1000;
    const limiter = new SmtpRateLimiter(60_000, () => now);
    limiter.record("test@example.com");

    now = 30_000;
    assert.equal(limiter.isThrottled("test@example.com"), true);
});

test("SmtpRateLimiter allows sends after the window expires", () => {
    let now = 1000;
    const limiter = new SmtpRateLimiter(60_000, () => now);
    limiter.record("test@example.com");

    now = 62_000;
    assert.equal(limiter.isThrottled("test@example.com"), false);
});

test("SmtpRateLimiter tracks recipients independently", () => {
    let now = 1000;
    const limiter = new SmtpRateLimiter(60_000, () => now);
    limiter.record("a@example.com");

    now = 30_000;
    assert.equal(limiter.isThrottled("a@example.com"), true);
    assert.equal(limiter.isThrottled("b@example.com"), false);
});
