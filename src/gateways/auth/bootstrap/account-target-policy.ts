import {
    isAccessRole,
    registerBootstrapFlow,
    requireBootstrapScope,
    type CapabilityContracts,
    type Ctx,
    type FlowStageContext,
} from "@cognis/core";
import type { AuthBootstrapHookContext } from "./index.js";
import type {
    AccountTargetDecision,
    AccountTargetRequest,
    AuthorizeAccountTarget,
} from "../contracts/account-target.js";

interface AccountPolicyStore {
    getInfo(accountId: string): Promise<unknown>;
}

interface TargetMetadata {
    role: string;
    isFounder: boolean;
}

interface Operation {
    request: AccountTargetRequest;
    revision: number;
    data: Record<string, unknown>;
    stage: "validateRequest" | "readAccount" | "authorizeTarget" | "finished";
    store?: AccountPolicyStore;
    metadata?: TargetMetadata | null;
    decision?: AccountTargetDecision;
}

function validAccountId(value: unknown): value is string {
    return (
        typeof value === "string" &&
        value.length > 0 &&
        value === value.trim() &&
        !/[\s\p{Cc}/\\]/u.test(value)
    );
}

function deny(
    status: 400 | 403 | 404 | 503,
    code: string,
): AccountTargetDecision {
    return Object.freeze({ allowed: false, status, code });
}

export function registerAuthBootstrapHook({
    ctx,
}: Pick<AuthBootstrapHookContext, "ctx">): void {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const contracts =
        root.requireCapability<CapabilityContracts>("system:contracts");
    const log = ctx.log;
    let active = true;
    let revision = 0;
    const operations = new WeakMap<object, Operation>();
    const dispose = () => {
        active = false;
        revision += 1;
    };
    dispose.reactivate = () => {
        active = true;
        revision += 1;
    };
    requireBootstrapScope(root).registerDisposer(dispose);
    const isCurrent = (operation: Operation): boolean =>
        active &&
        operation.revision === revision &&
        ctx.gatewayRegistry.get("auth")?.status !== "disabled" &&
        ctx.capabilities.get("system:ctx") === root &&
        root.getCapability("system:contracts") === contracts &&
        contracts.describe("auth:authorizeAccountTarget") === declaration &&
        root.isPublicCapability("auth:authorizeAccountTarget") &&
        root.getCapability("auth:authorizeAccountTarget") === authorize &&
        (!operation.store ||
            ctx.capabilities.get("auth:accountStore") === operation.store);
    const assertCurrent = (operation: Operation) => {
        if (!isCurrent(operation))
            throw new Error("account_policy_unavailable");
    };
    const enter = (
        context: FlowStageContext,
        stage: Operation["stage"],
        next: Operation["stage"],
    ): Operation => {
        if (!Object.isFrozen(context)) {
            revision += 1;
            throw new Error("account_policy_unavailable");
        }
        const { input, data } = context;
        const operation =
            input && typeof input === "object"
                ? operations.get(input)
                : undefined;
        if (!operation || operation.data !== data || operation.stage !== stage)
            throw new Error("account_policy_unavailable");
        assertCurrent(operation);
        operation.stage = next;
        return operation;
    };
    const readMetadata = async (
        operation: Operation,
    ): Promise<TargetMetadata | null> => {
        assertCurrent(operation);
        const store =
            ctx.capabilities.get<AccountPolicyStore>("auth:accountStore");
        if (!store || typeof store.getInfo !== "function")
            throw new Error("account_policy_unavailable");
        operation.store = store;
        const metadata = await store.getInfo(operation.request.accountId);
        assertCurrent(operation);
        if (metadata === null) return null;
        if (!metadata || typeof metadata !== "object")
            throw new Error("account_policy_unavailable");
        const { accountId, role, isFounder } = metadata as Record<
            string,
            unknown
        >;
        if (
            accountId !== operation.request.accountId ||
            !isAccessRole(role) ||
            typeof isFounder !== "boolean"
        )
            throw new Error("account_policy_unavailable");
        return { role, isFounder };
    };
    const decide = (
        operation: Operation,
        metadata: TargetMetadata | null,
    ): AccountTargetDecision => {
        if (!metadata) return deny(404, "not_found");
        if (operation.request.allowFounder === false && metadata.isFounder)
            return deny(403, "protected_founder_account");
        const role =
            metadata.isFounder && ["admin", "owner"].includes(metadata.role)
                ? "owner"
                : metadata.role;
        if (
            operation.request.actor.sub !== operation.request.accountId &&
            operation.request.actor.role !== "owner" &&
            ["admin", "owner"].includes(role)
        )
            return deny(403, "protected_admin_account");
        return Object.freeze({
            allowed: true,
            accountId: operation.request.accountId,
            isCurrent: () => isCurrent(operation),
        });
    };
    contracts.define("auth:authorizeAccountTarget", {
        version: 1,
        kind: "function",
        description:
            "Authorize an account target using verified actor claims and current privileged-account metadata.",
    });
    const flow = registerBootstrapFlow(root, {
        id: "auth:authorizeAccountTarget",
        stages: ["validateRequest", "readAccount", "authorizeTarget"],
    });
    flow.extend(
        "validateRequest",
        { id: "auth:validateAccountTarget" },
        (context) => {
            const operation = enter(context, "validateRequest", "readAccount");
            const { actor, accountId, allowSelf, allowFounder } =
                operation.request;
            if (
                !validAccountId(accountId) ||
                !validAccountId(actor?.sub) ||
                !isAccessRole(actor?.role) ||
                typeof allowSelf !== "boolean" ||
                (Object.hasOwn(operation.request, "allowFounder") &&
                    typeof allowFounder !== "boolean")
            ) {
                operation.decision = deny(400, "bad_request");
            } else if (actor.sub === accountId) {
                if (!allowSelf)
                    operation.decision = deny(403, "protected_self_account");
                else if (allowFounder !== false)
                    operation.decision = Object.freeze({
                        allowed: true,
                        accountId,
                        isCurrent: () => isCurrent(operation),
                    });
            } else if (actor.role !== "admin" && actor.role !== "owner") {
                operation.decision = deny(403, "forbidden");
            }
        },
    );
    flow.extend(
        "readAccount",
        { id: "auth:readAccountTarget" },
        async (context) => {
            const operation = enter(context, "readAccount", "authorizeTarget");
            if (!operation.decision)
                operation.metadata = await readMetadata(operation);
        },
    );
    flow.extend(
        "authorizeTarget",
        { id: "auth:authorizeAccountTarget" },
        (context) => {
            const operation = enter(context, "authorizeTarget", "finished");
            if (!operation.decision) {
                if (operation.metadata === undefined)
                    throw new Error("account_policy_unavailable");
                operation.decision = decide(operation, operation.metadata);
            }
        },
    );
    const authorize: AuthorizeAccountTarget = async (request) => {
        const input = Object.freeze({
            actor: Object.freeze({
                sub: request?.actor?.sub,
                role: request?.actor?.role,
            }),
            accountId: request?.accountId,
            allowSelf: request?.allowSelf,
            ...(request &&
            typeof request === "object" &&
            "allowFounder" in request
                ? { allowFounder: request.allowFounder }
                : {}),
        });
        const operation: Operation = {
            request: input,
            revision,
            data: {},
            stage: "validateRequest",
        };
        operations.set(input, operation);
        try {
            assertCurrent(operation);
            await root.flow.run("auth:authorizeAccountTarget", input, {
                data: operation.data,
            });
            assertCurrent(operation);
            if (operation.stage !== "finished" || !operation.decision)
                throw new Error("account_policy_unavailable");
            // Re-read after extensible stages so a delayed hook cannot retain an earlier target role.
            if (operation.decision.allowed && operation.store)
                operation.decision = decide(
                    operation,
                    await readMetadata(operation),
                );
            assertCurrent(operation);
            if (!operation.decision.allowed) {
                log?.("warn", "Account target authorization denied.", {
                    component: "auth-gateway",
                    operation: "authorizeAccountTarget",
                    accountId: input.actor.sub,
                    targetAccountId: input.accountId,
                    code: operation.decision.code,
                });
            }
            return operation.decision;
        } catch (error) {
            log?.("error", "Account target authorization unavailable.", {
                component: "auth-gateway",
                operation: "authorizeAccountTarget",
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return deny(503, "account_policy_unavailable");
        } finally {
            operations.delete(input);
        }
    };
    const publish = () => {
        const local = ctx.capabilities.get("auth:authorizeAccountTarget");
        const published = root.getCapability("auth:authorizeAccountTarget");
        if (
            (ctx.capabilities.has("auth:authorizeAccountTarget") &&
                local !== authorize) ||
            (root.hasCapability("auth:authorizeAccountTarget") &&
                published !== authorize)
        )
            throw new Error("account_policy_conflict");
        ctx.capabilities.contribute("auth:authorizeAccountTarget", authorize);
        root.contributePublicCapability(
            "auth:authorizeAccountTarget",
            authorize,
        );
    };
    publish();
    const unpublish = () => {
        if (ctx.capabilities.get("auth:authorizeAccountTarget") === authorize)
            ctx.capabilities.remove("auth:authorizeAccountTarget");
        if (root.getCapability("auth:authorizeAccountTarget") === authorize)
            root.removeCapability("auth:authorizeAccountTarget");
    };
    unpublish.reactivate = publish;
    requireBootstrapScope(root).registerDisposer(unpublish);
    const declaration = contracts.describe("auth:authorizeAccountTarget");
}
