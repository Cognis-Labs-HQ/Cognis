import assert from "node:assert/strict";
import test from "node:test";
import {
    CapabilityStore,
    createCtx,
    GatewayRegistry,
    runBootstrapScope,
} from "@cognis/core";
import { RouteRegistry } from "../../../api/reuse/route-registry.js";
import {
    InMemoryVerifyTokenStore,
    VerifyTokenService,
} from "../../../api/reuse/verify-token.js";
import { InMemoryTfaStore, TfaCodeService } from "../../reuse/tfa-code.js";
import { createEmailVerification } from "../bootstrap/email-verification.js";
import { registerEmailOnboarding } from "../bootstrap/onboarding.js";
import { DbNotificationStore } from "../notification-store.js";
import { NotificationTestDatabase } from "./reuse/database.js";
import { bootstrap } from "../bootstrap.js";

interface Operation {
    id: string;
    available?: () => boolean | Promise<boolean>;
    execute(
        context: {
            accountId: string;
            assertCurrent(): Promise<void>;
        },
        input: unknown,
    ): Promise<unknown>;
}

async function fixture() {
    const system = createCtx();
    const capabilities = new CapabilityStore();
    const operations = new Map<string, Operation>();
    capabilities.contribute("auth:onboarding", {
        registerOperation(operation: Operation) {
            assert.equal(operations.has(operation.id), false);
            operations.set(operation.id, operation);
        },
    });
    capabilities.contribute("system:ctx", system);
    const database = new NotificationTestDatabase();
    capabilities.contribute("db:executor", database);
    const store = new DbNotificationStore(database);
    await store.ensureSchema();
    const sent: Array<{
        recipientEmail: string;
        variables: Record<string, string>;
    }> = [];
    let deliver = true;
    let sendError: Error | undefined;
    let current = true;
    let checks = 0;
    let afterCheck: (() => void) | undefined;
    const context = {
        capabilities,
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry: new RouteRegistry(),
        flow: system.flow,
        adaptersRoot: "/unused",
    };
    const codes = new TfaCodeService(new InMemoryTfaStore());
    const service = createEmailVerification(
        store,
        codes,
        new VerifyTokenService(new InMemoryVerifyTokenStore()),
        {
            purpose: "notify:verification",
            canSendVerificationEmail: () => deliver,
            async sendEmail(input) {
                if (sendError) throw sendError;
                sent.push(input);
            },
        },
    );
    await runBootstrapScope(system, "gateway:notify", async () =>
        registerEmailOnboarding(
            capabilities.require("auth:onboarding"),
            service,
            () => deliver,
            () => true,
        ),
    );
    const call = async (id: string, input: unknown, accountId = "u_alice") => {
        const operation = operations.get(id);
        assert.ok(operation);
        return operation.execute(
            {
                accountId,
                async assertCurrent() {
                    checks++;
                    if (!current) throw new Error("onboarding_unauthorized");
                    afterCheck?.();
                },
            },
            input,
        );
    };
    return {
        store,
        sent,
        call,
        context,
        system,
        operations,
        unavailable: () => {
            deliver = false;
        },
        rejectDelivery: (error: Error) => {
            sendError = error;
        },
        revoke: () => {
            current = false;
        },
        revokeAfterCheck: (target: number) => {
            afterCheck = () => {
                if (checks === target) current = false;
            };
        },
    };
}

test("Notify registers executable self-only add and verify operations", async () => {
    const host = await fixture();
    assert.deepEqual(
        [...host.operations.keys()],
        ["notify:email:add", "notify:email:verify"],
    );
    await host.call("notify:email:add", { email: " Alice@Example.com " });
    assert.equal(host.sent[0].recipientEmail, "alice@example.com");
    assert.equal(
        (await host.store.getUserEmails("u_alice"))[0].verified,
        false,
    );
    assert.equal((await host.store.getUserEmails("u_bob")).length, 0);
    const code = host.sent[0].variables.code;
    await assert.rejects(
        host.call(
            "notify:email:verify",
            { email: "alice@example.com", code },
            "u_bob",
        ),
        { status: 422, code: "invalid_code" },
    );
    assert.deepEqual(
        await host.call("notify:email:verify", {
            email: "alice@example.com",
            code,
        }),
        { verified: true },
    );
    assert.equal((await host.store.getUserEmails("u_alice"))[0].verified, true);
    await assert.rejects(
        host.call("notify:email:verify", { email: "alice@example.com", code }),
        { status: 422, code: "invalid_code" },
    );
});

test("onboarding rejects subject injection and malformed payloads before effects", async () => {
    const host = await fixture();
    for (const input of [
        null,
        [],
        {},
        { email: 4 },
        { email: " " },
        { email: "a@example.com", accountId: "u_bob" },
        { email: "a@example.com", primary: true },
    ]) {
        await assert.rejects(host.call("notify:email:add", input), {
            status: 400,
            code: "invalid_email_verification_request",
        });
    }
    assert.equal(host.sent.length, 0);
    assert.deepEqual(await host.store.getUserEmails("u_alice"), []);
});

test("onboarding preserves delivery availability, conflicts and retry code cooldown", async () => {
    const host = await fixture();
    await host.store.upsertVerifiedPrimaryEmail("u_bob", "taken@example.com");
    await assert.rejects(
        host.call("notify:email:add", { email: "taken@example.com" }),
        { status: 409, code: "email_taken" },
    );
    await host.call("notify:email:add", { email: "a@example.com" });
    const code = host.sent[0].variables.code;
    host.rejectDelivery(new Error("email_rate_limited"));
    await assert.rejects(
        host.call("notify:email:add", { email: "a@example.com" }),
        { status: 429, code: "rate_limited" },
    );
    await host.call("notify:email:verify", { email: "a@example.com", code });
    await assert.rejects(
        host.call("notify:email:add", { email: "a@example.com" }),
        { status: 409, code: "already_verified" },
    );
    host.unavailable();
    assert.equal(
        await host.operations.get("notify:email:add")?.available?.(),
        false,
    );
    await assert.rejects(
        host.call("notify:email:add", { email: "b@example.com" }),
        { status: 503, code: "email_delivery_unavailable" },
    );
    assert.equal((await host.store.getUserEmails("u_alice")).length, 1);
});

test("revocation before add prevents persistence and delivery", async () => {
    const host = await fixture();
    host.revoke();
    await assert.rejects(
        host.call("notify:email:add", { email: "a@example.com" }),
        /onboarding_unauthorized/,
    );
    assert.equal(host.sent.length, 0);
    assert.deepEqual(await host.store.getUserEmails("u_alice"), []);
});

test("revocation after address persistence prevents code delivery and reports failure", async () => {
    const host = await fixture();
    host.revokeAfterCheck(1);
    await assert.rejects(
        host.call("notify:email:add", { email: "a@example.com" }),
        /onboarding_unauthorized/,
    );
    assert.equal(host.sent.length, 0);
    assert.equal((await host.store.getUserEmails("u_alice")).length, 1);
});

test("revocation before verification prevents consuming the code or verifying email", async () => {
    const host = await fixture();
    await host.call("notify:email:add", { email: "a@example.com" });
    host.revoke();
    await assert.rejects(
        host.call("notify:email:verify", {
            email: "a@example.com",
            code: host.sent[0].variables.code,
        }),
        /onboarding_unauthorized/,
    );
    assert.equal(
        (await host.store.getUserEmails("u_alice"))[0].verified,
        false,
    );
});

test("delivery failure reports persisted pending address without claiming an email was sent", async () => {
    const host = await fixture();
    host.rejectDelivery(new Error("synthetic_delivery_failure"));
    assert.deepEqual(
        await host.call("notify:email:add", { email: "a@example.com" }),
        {
            added: true,
            pendingVerification: true,
            verificationEmailFailed: true,
        },
    );
    assert.equal(
        (await host.store.getUserEmails("u_alice"))[0].verified,
        false,
    );
});

test("real Notify bootstrap contributes the scoped operation contract", async () => {
    const host = await fixture();
    host.operations.clear();
    await runBootstrapScope(host.system, "gateway:notify", () =>
        bootstrap(host.context),
    );
    assert.equal(host.operations.size, 2);
    assert.equal(
        await host.operations.get("notify:email:verify")?.available?.(),
        true,
    );
    await assert.rejects(
        host.call("notify:email:verify", {
            email: "a@example.com",
            code: "123456",
        }),
        { status: 422, code: "invalid_code" },
    );
    await host.context.gatewayRegistry.disable("notify");
    assert.equal(
        await host.operations.get("notify:email:verify")?.available?.(),
        false,
    );
    assert.equal(
        await host.operations.get("notify:email:add")?.available?.(),
        false,
    );
    await host.context.gatewayRegistry.enable("notify");
    assert.equal(
        await host.operations.get("notify:email:verify")?.available?.(),
        true,
    );
});

test("missing onboarding authority fails before Notify exposes routes", async () => {
    const host = await fixture();
    await assert.rejects(
        bootstrap({
            ...host.context,
            capabilities: new CapabilityStore(),
        }),
        /auth:onboarding/,
    );
    assert.equal(host.context.routeRegistry.getEntries().length, 0);
    assert.equal(host.context.gatewayRegistry.get("notify"), undefined);
});
