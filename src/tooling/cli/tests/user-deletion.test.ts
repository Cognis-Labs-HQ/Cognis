import assert from "node:assert/strict";
import test from "node:test";
import { readFile } from "node:fs/promises";
import { deleteUserAccount, UserDeletionError } from "../user-deletion.ts";
import { resolveCliText } from "../reuse/locale.ts";

const partial = {
    error: { code: "user_deletion_cleanup_incomplete" },
    data: { deleted: true, outcome: "committed", cleanup: "incomplete" },
};
const rejected = {
    error: { code: "forbidden", message: "Owned refusal message" },
    data: { deleted: false, outcome: "rejected" },
};
const unknown = {
    error: { code: "user_deletion_outcome_unknown" },
    data: { deleted: null, outcome: "unknown" },
};
const cases: Array<{
    name: string;
    status: number;
    payload: unknown;
    outcome?: "committed" | "rejected" | "unknown";
}> = [
    {
        name: "explicit success",
        status: 200,
        payload: { data: { deleted: true } },
    },
    {
        name: "confirmed partial",
        status: 500,
        payload: partial,
        outcome: "committed",
    },
    {
        name: "confirmed rejection",
        status: 403,
        payload: rejected,
        outcome: "rejected",
    },
    {
        name: "explicit unknown",
        status: 500,
        payload: unknown,
        outcome: "unknown",
    },
    {
        name: "completed unavailable unknown",
        status: 503,
        payload: {
            error: {
                code: "account_policy_unavailable",
                message: "account_policy_unavailable",
            },
            data: { deleted: null, outcome: "unknown" },
        },
        outcome: "unknown",
    },
    {
        name: "unavailable cannot establish rejection",
        status: 503,
        payload: {
            error: {
                code: "account_policy_unavailable",
                message: "account_policy_unavailable",
            },
            data: { deleted: false, outcome: "rejected" },
        },
        outcome: "unknown",
    },
    {
        name: "unavailable cannot establish success",
        status: 503,
        payload: { data: { deleted: true } },
        outcome: "unknown",
    },
    {
        name: "missing acknowledgement",
        status: 200,
        payload: { data: {} },
        outcome: "unknown",
    },
    { name: "empty object", status: 200, payload: {}, outcome: "unknown" },
    {
        name: "false success",
        status: 200,
        payload: { data: { deleted: false } },
        outcome: "unknown",
    },
    {
        name: "string acknowledgement",
        status: 200,
        payload: { data: { deleted: "true" } },
        outcome: "unknown",
    },
    {
        name: "null acknowledgement",
        status: 200,
        payload: { data: { deleted: null } },
        outcome: "unknown",
    },
    {
        name: "contradictory successful body",
        status: 200,
        payload: partial,
        outcome: "unknown",
    },
    {
        name: "success with error",
        status: 200,
        payload: { data: { deleted: true }, error: { code: "forbidden" } },
        outcome: "unknown",
    },
    {
        name: "success with incomplete cleanup",
        status: 200,
        payload: { data: { deleted: true, cleanup: "incomplete" } },
        outcome: "unknown",
    },
    {
        name: "wrong partial status",
        status: 400,
        payload: partial,
        outcome: "unknown",
    },
    {
        name: "wrong partial code",
        status: 500,
        payload: { ...partial, error: { code: "bad_request" } },
        outcome: "unknown",
    },
    {
        name: "partial without discriminator",
        status: 500,
        payload: { ...partial, data: { deleted: true, cleanup: "incomplete" } },
        outcome: "unknown",
    },
    {
        name: "partial claiming completed cleanup",
        status: 500,
        payload: {
            ...partial,
            data: { deleted: true, outcome: "committed", cleanup: "complete" },
        },
        outcome: "unknown",
    },
    {
        name: "partial without deletion",
        status: 500,
        payload: {
            ...partial,
            data: {
                deleted: false,
                outcome: "committed",
                cleanup: "incomplete",
            },
        },
        outcome: "unknown",
    },
    {
        name: "wrong denial status",
        status: 404,
        payload: rejected,
        outcome: "unknown",
    },
    {
        name: "wrong denial code",
        status: 403,
        payload: {
            ...rejected,
            error: { code: "not_found", message: "Owned refusal message" },
        },
        outcome: "unknown",
    },
    {
        name: "invented denial code",
        status: 403,
        payload: {
            ...rejected,
            error: {
                code: "fixture_refusal",
                message: "Owned refusal message",
            },
        },
        outcome: "unknown",
    },
    {
        name: "missing denial discriminator",
        status: 403,
        payload: { ...rejected, data: { deleted: false } },
        outcome: "unknown",
    },
    {
        name: "unavailable evidence",
        status: 503,
        payload: {
            error: { code: "account_policy_unavailable" },
            data: { deleted: false, outcome: "rejected" },
        },
        outcome: "unknown",
    },
    {
        name: "generic failed response",
        status: 400,
        payload: { error: { message: "private response details" } },
        outcome: "unknown",
    },
];

for (const entry of cases) {
    test(`deletion response contract: ${entry.name}`, async (context) => {
        const originalFetch = globalThis.fetch;
        context.after(() => {
            globalThis.fetch = originalFetch;
        });
        let requests = 0;
        globalThis.fetch = async () => {
            requests += 1;
            return Response.json(entry.payload, { status: entry.status });
        };
        const execute = () =>
            deleteUserAccount(
                "https://cli-audit.invalid",
                "target",
                "fixture-only",
            );
        if (entry.outcome) {
            await assert.rejects(execute, (error: unknown) => {
                assert.ok(error instanceof UserDeletionError);
                assert.equal(error.outcome, entry.outcome);
                assert.doesNotMatch(error.message, /private response details/);
                return true;
            });
        } else assert.deepEqual(await execute(), entry.payload);
        assert.equal(requests, 1);
    });
}

for (const response of ["unreadable", "empty", "transport"] as const) {
    test(`deletion ${response} response cannot prove rejection or success`, async (context) => {
        const originalFetch = globalThis.fetch;
        context.after(() => {
            globalThis.fetch = originalFetch;
        });
        let requests = 0;
        globalThis.fetch = async () => {
            requests += 1;
            if (response === "transport")
                throw new TypeError("private transport details");
            if (response === "empty")
                return new Response(null, { status: 204 });
            return new Response("{not-json", {
                headers: { "content-type": "application/json" },
            });
        };
        await assert.rejects(
            () =>
                deleteUserAccount(
                    "https://cli-audit.invalid",
                    "target",
                    "fixture-only",
                ),
            (error: unknown) => {
                assert.ok(error instanceof UserDeletionError);
                assert.equal(error.outcome, "unknown");
                assert.doesNotMatch(error.message, /private transport details/);
                return true;
            },
        );
        assert.equal(requests, 1);
    });
}

test("deletion text uses all shipped catalogs, English fallback and explicit missing-key failures", async () => {
    const catalogs = await Promise.all(
        ["en", "de", "id", "ja"].map(async (locale) => {
            const source = await readFile(
                new URL(`../languages/${locale}/strings.xml`, import.meta.url),
                "utf8",
            );
            return Object.fromEntries(
                Array.from(
                    source.matchAll(
                        /<string name="([^"]+)">([^<]*)<\/string>/g,
                    ),
                    (match) => [match[1], match[2]],
                ),
            );
        }),
    );
    for (const outcome of ["committed", "rejected", "unknown"]) {
        const key = `cli.terminal.delete.${outcome}`;
        const english = catalogs[0];
        assert.ok(english[key]);
        for (const preferred of catalogs.slice(1)) {
            assert.ok(preferred[key]);
            assert.notEqual(preferred[key], english[key]);
            assert.equal(
                resolveCliText(key, { preferred, english }),
                preferred[key],
            );
        }
        assert.equal(
            resolveCliText(key, { preferred: { [key]: " " }, english }),
            english[key],
        );
        assert.throws(
            () => resolveCliText(key, { preferred: {}, english: {} }),
            /Missing translation/,
        );
    }
});

test("a refused preflight does not dispatch deletion or report an unknown submitted outcome", async (context) => {
    const { executeRegisteredCommand } = await import("../index.ts");
    const { ApiRequestError } = await import("../http.ts");
    const originalFetch = globalThis.fetch;
    context.after(() => {
        globalThis.fetch = originalFetch;
    });
    const methods: string[] = [];
    globalThis.fetch = async (_url, options) => {
        methods.push(options?.method ?? "GET");
        return Response.json({ error: { code: "forbidden" } }, { status: 403 });
    };
    await assert.rejects(
        () =>
            executeRegisteredCommand("user:delete", ["target"], {
                apiBaseUrl: "https://cli-audit.invalid",
                getApiToken: async () => "fixture-only",
            }),
        (error: unknown) => {
            assert.ok(error instanceof ApiRequestError);
            assert.equal(error.status, 403);
            return true;
        },
    );
    assert.deepEqual(methods, ["GET"]);
});
