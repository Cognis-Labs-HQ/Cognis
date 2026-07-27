import assert from "node:assert/strict";
import test from "node:test";
import {
    readSharePassphrase,
    resolveGatewayCalendarShare,
} from "../reuse/share-auth.js";

test("readSharePassphrase prefers explicit header over query", () => {
    const passphrase = readSharePassphrase(
        {
            headers: {
                "x-cognis-calendar-passphrase": "header-secret",
            },
        },
        new URL("http://localhost/calendar.ics?passphrase=query-secret"),
    );
    assert.equal(passphrase, "header-secret");
});

test("readSharePassphrase prefers basic auth over query", () => {
    const encoded = Buffer.from("user:basic-secret", "utf8").toString("base64");
    const passphrase = readSharePassphrase(
        {
            headers: {
                authorization: `Basic ${encoded}`,
            },
        },
        new URL("http://localhost/calendar.ics?passphrase=query-secret"),
    );
    assert.equal(passphrase, "basic-secret");
});

test("readSharePassphrase accepts a query passphrase without auth headers", () => {
    const passphrase = readSharePassphrase(
        { headers: {} },
        new URL("http://localhost/calendar.ics?passphrase=query-secret"),
    );
    assert.equal(passphrase, "query-secret");
});

test("resolveGatewayCalendarShare resolves a central token with its supplied password", async () => {
    const observedPasswords: Array<string | null | undefined> = [];
    const capabilities = {
        get<T>(name: string): T | undefined {
            if (name !== "share:resolveToken") return undefined;
            return (async (_token: string, password?: string | null) => {
                observedPasswords.push(password);
                return password === "client-secret"
                    ? {
                          resourceType: "calendar",
                          resourceId: "calendar-1",
                      }
                    : null;
            }) as T;
        },
    };
    assert.deepEqual(
        await resolveGatewayCalendarShare(
            capabilities,
            "shared-token",
            "client-secret",
        ),
        { calendarId: "calendar-1" },
    );
    assert.deepEqual(observedPasswords, ["client-secret"]);
});
