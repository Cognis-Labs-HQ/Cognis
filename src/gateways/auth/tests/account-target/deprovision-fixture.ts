import { runBootstrapScope, type AccessRole } from "@cognis/core";
import { registerAuthBootstrapHook as registerTargetPolicy } from "../../bootstrap/account-target-policy.js";
import { createLoginFixture } from "../session-assurance/fixture.js";

export async function createDeprovisionFixture(
    options: Parameters<typeof createLoginFixture>[0] = {},
) {
    const host = await createLoginFixture(options);
    const state = {
        metadata: {
            accountId: "target",
            username: "target",
            role: "user" as AccessRole,
            isFounder: false,
            enabled: true,
        } as {
            accountId: string;
            username: string;
            role: AccessRole;
            isFounder: boolean;
            enabled: boolean;
        } | null,
        current: true,
        reads: 0,
        logs: host.state.logs,
        effects: [] as string[],
        readBarrier: undefined as (() => Promise<void>) | undefined,
    };
    host.context.accountStore.getInfo = async () => {
        state.reads++;
        await state.readBarrier?.();
        return state.metadata;
    };
    host.context.accountStore.delete = async (id) => {
        state.effects.push(`delete:${id}`);
    };
    host.context.accountStore.setEnabled = async (id, value) => {
        state.effects.push(`enabled:${id}:${value}`);
    };
    host.capabilities.contribute(
        "auth:accountStore",
        host.context.accountStore,
    );
    host.capabilities.contribute(
        "auth:revokeAccessTokensForSubject",
        (id: string) => {
            state.effects.push(`revoke:${id}`);
            return 2;
        },
    );
    const policyDisposers: typeof host.disposers = [];
    await runBootstrapScope(
        host.root,
        "gateway:auth-target-test",
        async () => registerTargetPolicy(host.context),
        (dispose) => policyDisposers.push(dispose),
    );
    const input = (action = "delete") =>
        Object.freeze({
            username: "target",
            action,
            callerRole: "admin",
            targetRole: "user",
            targetIsFounder: false,
            actor: Object.freeze({ sub: "actor", role: "admin" }),
            isAuthorizationCurrent: () => state.current,
        });
    const run = async (request: object = input()) => {
        const result = await host.root.flow.run("deprovision-user", request);
        return {
            persist: (
                result.stageResults["persist-state"] as Array<
                    Record<string, unknown>
                >
            )[0],
            cleanup: (
                result.stageResults["cleanup-dependencies"] as Array<
                    Record<string, unknown>
                >
            )[0],
        };
    };
    return { ...host, state, input, run, policyDisposers };
}
