import assert from "node:assert/strict";
import test from "node:test";
import { Readable } from "node:stream";
import type { IncomingMessage, ServerResponse } from "node:http";
import { createCtx } from "@cognis/core";
import type { TutorialDatabase } from "../../tutorials/store.js";
import type { RouteContext } from "../../reuse/route-context.js";
import { createTutorialCompletionRoutes } from "../../tutorials/routes.js";

function database() {
    const rows = new Map<string, Record<string, unknown>>();
    let fail = false;
    const executor = {
        ensureTable: async (definition) => {
            assert.equal(definition.name, "tutorial_completions");
        },
        executeCommand: async (
            command: Parameters<TutorialDatabase["executeCommand"]>[0],
        ) => {
            if (fail) throw new Error("database_unavailable");
            if (command.option === "SELECT")
                return {
                    rows: [...rows.values()].filter((row) =>
                        command.where!.every(
                            (condition) =>
                                row[condition.column] === condition.value,
                        ),
                    ),
                };
            assert.equal(command.option, "INSERT");
            if (
                command.option === "INSERT" &&
                !rows.has(String(command.values.completion_key))
            )
                rows.set(String(command.values.completion_key), {
                    ...command.values,
                });
            return {};
        },
        transaction: async (execute) => execute(executor),
    } as TutorialDatabase;
    return {
        db: executor,
        rows,
        fail: (value: boolean) => {
            fail = value;
        },
    };
}

function host(executor: TutorialDatabase) {
    const ctx = createCtx();
    const context = {
        getCapability: (id: string) =>
            id === "system:ctx"
                ? ctx
                : id === "db:executor"
                  ? executor
                  : undefined,
        requireAuth(req, res) {
            const account = req.headers.authorization;
            if (!account) {
                res.writeHead(401);
                res.end();
                return null;
            }
            return { sub: account, role: "user" };
        },
    } as RouteContext;
    const route = createTutorialCompletionRoutes(context);
    const events: string[] = [];
    for (const operation of ["list", "record"]) {
        ctx.flow.extend(
            `tutorial:completion:${operation}`,
            "after",
            { id: "test-observe-completion" },
            () => {
                events.push(operation);
            },
        );
    }
    const request = async (actor: string, body?: unknown) => {
        const request = Readable.from(
            body === undefined ? [] : [Buffer.from(JSON.stringify(body))],
        ) as IncomingMessage;
        request.method = body === undefined ? "GET" : "POST";
        request.headers = { authorization: actor };
        let status = 0;
        let payload = "";
        const response = {
            writeHead(code: number) {
                status = code;
            },
            end(value = "") {
                payload = String(value);
            },
        } as ServerResponse;
        assert.equal(
            await route(
                request,
                response,
                new URL("http://localhost/api/v1/tutorials/completions"),
            ),
            true,
        );
        return { status, data: payload ? JSON.parse(payload) : undefined };
    };
    return Object.assign(request, { events });
}

test("completion persists through new API instances, isolates accounts and makes duplicate writes idempotent", async () => {
    const state = database();
    const first = host(state.db);
    assert.equal(
        (await first("alice", { ids: ["ui.dashboard:overview"] })).status,
        204,
    );
    await first("alice", { ids: ["ui.dashboard:overview"] });
    assert.equal(state.rows.size, 1);
    assert.deepEqual(first.events, ["record", "record"]);
    const restarted = host(state.db);
    assert.deepEqual((await restarted("alice")).data.data, [
        "ui.dashboard:overview",
    ]);
    assert.deepEqual((await restarted("bob")).data.data, []);
    assert.equal((await restarted("")).status, 401);
});

test("clients cannot select another account, reset completion or submit invalid identifiers", async () => {
    const state = database();
    const request = host(state.db);
    for (const body of [
        { ids: ["ui.dashboard:overview"], accountId: "bob" },
        { ids: [] },
        { ids: ["invalid"] },
        { ids: Array(101).fill("ui.dashboard:overview") },
    ]) {
        assert.equal((await request("alice", body)).status, 400);
    }
    assert.equal(state.rows.size, 0);
});

test("database failures propagate without acknowledging completion and permit retry", async () => {
    const state = database();
    const request = host(state.db);
    state.fail(true);
    await assert.rejects(
        request("alice", { ids: ["ui.dashboard:overview"] }),
        /database_unavailable/,
    );
    state.fail(false);
    assert.equal(
        (await request("alice", { ids: ["ui.dashboard:overview"] })).status,
        204,
    );
});
