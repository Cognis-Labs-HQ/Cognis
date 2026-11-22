import test from "node:test";
import assert from "node:assert/strict";
import { requireSharedCalendarAccess } from "../bootstrap/shared-access.js";

function response() {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(value = "") {
            payload = value;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    };
}

test("password-protected recipient calendars validate every supplied password", async () => {
    const getCapability = <T>(id: string): T | undefined => {
        if (id === "share:getTokenById") {
            return (async () => ({
                tokenValue: "share-token",
                grantedCapabilities: ["calendar:read"],
                accessControls: { passwordProtected: true },
            })) as T;
        }
        if (id === "share:resolveUserAccess")
            return (async () => ({ authorized: false })) as T;
        if (id === "share:unlockUserAccess") {
            return (async (input: {
                shareId: string;
                accountId: string;
                resourceType: string;
                resourceId: string;
                requiredCapability: string;
                password: string;
            }) =>
                input.shareId === "share-id" &&
                input.accountId === "recipient" &&
                input.resourceType === "calendar" &&
                input.resourceId === "owner-calendar" &&
                input.requiredCapability === "calendar:read" &&
                input.password === "correct") as T;
        }
        return undefined;
    };

    const denied = response();
    assert.equal(
        await requireSharedCalendarAccess({
            req: { headers: {} } as any,
            res: denied as any,
            shareTokenId: "share-id",
            accountId: "recipient",
            ownerCalendarId: "owner-calendar",
            getCapability,
        }),
        false,
    );
    assert.equal(denied.status, 401);
    assert.match(denied.payload, /share_password_required/);

    const allowed = response();
    assert.equal(
        await requireSharedCalendarAccess({
            req: {
                headers: { "x-cognis-share-password": "correct" },
            } as any,
            res: allowed as any,
            shareTokenId: "share-id",
            accountId: "recipient",
            ownerCalendarId: "owner-calendar",
            getCapability,
        }),
        true,
    );
});

test("an unlocked account share does not require resubmitting its calendar password", async () => {
    let passwordUnlockAttempted = false;
    const getCapability = <T>(id: string): T | undefined => {
        if (id === "share:getTokenById") {
            return (async () => ({
                tokenValue: "share-token",
                grantedCapabilities: ["calendar:read"],
                accessControls: { passwordProtected: true },
            })) as T;
        }
        if (id === "share:resolveUserAccess") {
            return (async (input: {
                accountId: string;
                resourceId: string;
            }) => ({
                authorized:
                    input.accountId === "recipient" &&
                    input.resourceId === "owner-calendar",
            })) as T;
        }
        if (id === "share:unlockUserAccess") {
            return (async () => {
                passwordUnlockAttempted = true;
                return false;
            }) as T;
        }
        return undefined;
    };
    assert.equal(
        await requireSharedCalendarAccess({
            req: { headers: {} } as any,
            res: response() as any,
            shareTokenId: "share-id",
            accountId: "recipient",
            ownerCalendarId: "owner-calendar",
            getCapability,
        }),
        true,
    );
    assert.equal(passwordUnlockAttempted, false);
});

test("a token-backed Calendar denies access when the Share authorization contract is unavailable", async () => {
    let unlockAttempted = false;
    const denied = response();
    const getCapability = <T>(id: string): T | undefined => {
        if (id === "share:getTokenById")
            return (async () => ({
                grantedCapabilities: ["calendar:read"],
                accessControls: { passwordProtected: true },
            })) as T;
        if (id === "share:unlockUserAccess")
            return (async () => {
                unlockAttempted = true;
                return true;
            }) as T;
        return undefined;
    };
    assert.equal(
        await requireSharedCalendarAccess({
            req: {
                headers: { "x-cognis-share-password": "fixture-password" },
            } as any,
            res: denied as any,
            shareTokenId: "share-id",
            accountId: "recipient",
            ownerCalendarId: "owner-calendar",
            getCapability,
        }),
        false,
    );
    assert.equal(denied.status, 403);
    assert.equal(unlockAttempted, false);
});
