import test from "node:test";
import assert from "node:assert/strict";
import { requireSharedCalendarPassword } from "../bootstrap/shared-password.js";

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
                accessControls: { passwordProtected: true },
            })) as T;
        }
        if (id === "share:resolveToken") {
            return (async (_token: string, password: string | null) =>
                password === "correct" ? { id: "share-id" } : null) as T;
        }
        return undefined;
    };

    const denied = response();
    assert.equal(
        await requireSharedCalendarPassword({
            req: { headers: {} } as any,
            res: denied as any,
            shareTokenId: "share-id",
            getCapability,
        }),
        false,
    );
    assert.equal(denied.status, 401);
    assert.match(denied.payload, /share_password_required/);

    const allowed = response();
    assert.equal(
        await requireSharedCalendarPassword({
            req: {
                headers: { "x-cognis-share-password": "correct" },
            } as any,
            res: allowed as any,
            shareTokenId: "share-id",
            getCapability,
        }),
        true,
    );
});
