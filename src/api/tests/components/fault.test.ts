import assert from "node:assert/strict";
import test from "node:test";
import { createCtx, runBootstrapScope } from "@cognis/core";
import { RouteRegistry } from "../../reuse/route-registry.js";
import { recoverComponentRequest } from "../../components/http-failure.js";
import {
    attributeComponentFault,
    componentFaultOwner,
} from "../../components/fault.js";

test("route ownership follows the registering bootstrap scope and cannot be forged through an error payload", async () => {
    const registry = new RouteRegistry();
    const root = createCtx();
    const failure = Object.assign(new Error("backend_failure"), {
        componentOwner: { type: "gateway", id: "forged" },
    });
    await runBootstrapScope(root, "adapter:study:library", async () => {
        registry.register(async () => {
            throw failure;
        }, "study");
    });
    let attributed: unknown;
    await assert.rejects(
        registry.getHandlers()[0](
            {} as never,
            {} as never,
            new URL("http://test/api"),
        ),
        (error) => {
            attributed = error;
            return true;
        },
    );
    assert.deepEqual(componentFaultOwner(attributed), {
        type: "adapter",
        gatewayId: "study",
        id: "library",
    });
    const input = Object.assign(new Error("invalid_input"), { status: 400 });
    assert.equal(
        attributeComponentFault(input, { type: "module", id: "example" }),
        input,
    );
    assert.equal(componentFaultOwner(input), undefined);
    const syntax = new SyntaxError("invalid JSON");
    attributeComponentFault(syntax, { type: "module", id: "example" });
    assert.equal(componentFaultOwner(syntax), undefined);
});

test("owned request failures report their canonical owner and contain recovery failures", async () => {
    const owner = { type: "module" as const, id: "example" };
    const failure = attributeComponentFault(
        new Error("private_details"),
        owner,
    );
    const reported: unknown[] = [];
    const logs: unknown[] = [];
    let status = 0;
    let body = "";
    await recoverComponentRequest(
        {} as never,
        {
            headersSent: false,
            writeHead(code: number) {
                status = code;
            },
            end(value: string) {
                body = value;
            },
        } as never,
        failure,
        Promise.resolve({
            async reportServerFailure(_request, target) {
                reported.push(target);
                throw new Error("recovery_failed");
            },
        }),
        (...args) => logs.push(args),
    );
    assert.deepEqual(reported, [owner]);
    assert.equal(status, 500);
    assert.equal(JSON.parse(body).error.message, "Request failed");
    assert.equal(body.includes("private_details"), false);
    assert.equal(logs.length, 1);
});
