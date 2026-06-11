import assert from "node:assert/strict";
import test from "node:test";

import { resolveSafeJitsiAvatarUrl } from "../meeting-embed.js";

test("resolveSafeJitsiAvatarUrl keeps same-origin avatar URLs", () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: {
            origin: "https://meet.example.com",
        },
    };
    try {
        const avatarUrl = resolveSafeJitsiAvatarUrl(
            "https://meet.example.com/api/v1/files/avatar.png",
            "https://meet.example.com/room-1",
        );
        assert.equal(
            avatarUrl,
            "https://meet.example.com/api/v1/files/avatar.png",
        );
    } finally {
        globalThis.window = previousWindow;
    }
});

test("resolveSafeJitsiAvatarUrl drops cross-origin avatar URLs", () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: {
            origin: "http://localhost:3000",
        },
    };
    try {
        const avatarUrl = resolveSafeJitsiAvatarUrl(
            "http://localhost:3000/api/v1/files/avatar.png",
            "https://meet.example.com/room-1",
        );
        assert.equal(avatarUrl, "");
    } finally {
        globalThis.window = previousWindow;
    }
});

test("resolveSafeJitsiAvatarUrl resolves relative URLs against window origin", () => {
    const previousWindow = globalThis.window;
    globalThis.window = {
        location: {
            origin: "https://meet.example.com",
        },
    };
    try {
        const avatarUrl = resolveSafeJitsiAvatarUrl(
            "/api/v1/files/avatar.png",
            "https://meet.example.com/room-1",
        );
        assert.equal(
            avatarUrl,
            "https://meet.example.com/api/v1/files/avatar.png",
        );
    } finally {
        globalThis.window = previousWindow;
    }
});
