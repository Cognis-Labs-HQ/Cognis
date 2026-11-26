import {
    requireBootstrapScope,
    registerBootstrapEntry,
    type BootstrapRegistrationState,
    registerBootstrapFlow,
    type Ctx,
    type CapabilityContracts,
} from "@cognis/core";
import type { GatewayBootstrapContext } from "../shared.js";

export interface UserValidationMode {
    id: string;
    labelKey: string;
    stringsBaseUrl?: string;
    requiredFields?: string[];
    available?: () => boolean | Promise<boolean>;
    validate(account: {
        accountId: string;
        role: string;
    }): boolean | Promise<boolean>;
    integration?: { scriptUrl: string };
}
export interface UserValidationModes {
    register(mode: UserValidationMode): void;
    list(): Promise<
        Array<{
            id: string;
            labelKey: string;
            stringsBaseUrl?: string;
            requiredFields?: string[];
            available: boolean;
        }>
    >;
    assertSelectable(id: string, previous?: string): Promise<void>;
    evaluate(
        id: string,
        account: { accountId: string; role: string; isFounder?: boolean },
    ): Promise<{
        verified: boolean;
        integrations: Array<{ scriptUrl: string }>;
    }>;
}

/** Auth evaluates policies; each provider supplies its own validator and setup UI. */
export function registerUserValidationModes(
    ctx: GatewayBootstrapContext,
): UserValidationModes {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const modes = new Map<string, Readonly<UserValidationMode>>();
    const lifetimes = new WeakMap<object, BootstrapRegistrationState>();
    const definition = {
        version: 1,
        kind: "object" as const,
        description:
            "Lifecycle-owned account validation policies and setup requirements.",
        members: {
            register: "function" as const,
            list: "function" as const,
            evaluate: "function" as const,
            assertSelectable: "function" as const,
        },
    };
    root.requireCapability<CapabilityContracts>("system:contracts").define(
        "auth:userValidationModes",
        definition,
    );
    const available = async (mode: UserValidationMode) => {
        try {
            return !mode.available || (await mode.available()) === true;
        } catch (error) {
            ctx.log?.("warn", "User validation provider availability failed.", {
                component: "auth",
                operation: "validationAvailability",
                modeId: mode.id,
                errorName: error instanceof Error ? error.name : "UnknownError",
            });
            return false;
        }
    };
    const api: UserValidationModes = {
        register(input) {
            const scope = requireBootstrapScope(root);
            if (
                scope.owner.startsWith("module:") &&
                !input?.id?.startsWith(scope.owner.slice(7) + ":")
            )
                throw new Error("user_validation_namespace_denied");
            if (
                !/^[a-z][a-zA-Z0-9:._-]{0,149}$/.test(input?.id) ||
                typeof input.labelKey !== "string" ||
                !input.labelKey ||
                typeof input.validate !== "function" ||
                (input.available !== undefined &&
                    typeof input.available !== "function") ||
                (input.stringsBaseUrl !== undefined &&
                    !/^\/static\/[a-zA-Z0-9/._-]+$/.test(
                        input.stringsBaseUrl,
                    )) ||
                (input.integration &&
                    !/^\/static\/[a-zA-Z0-9/._-]+\.js$/.test(
                        input.integration.scriptUrl,
                    )) ||
                (input.requiredFields !== undefined &&
                    (!Array.isArray(input.requiredFields) ||
                        input.requiredFields.some(
                            (field) =>
                                typeof field !== "string" ||
                                !/^[a-z][a-zA-Z0-9_-]*$/.test(field),
                        )))
            )
                throw new Error("invalid_user_validation_mode");
            const mode = Object.freeze({
                ...input,
                requiredFields: Object.freeze([
                    ...(input.requiredFields ?? []),
                ]) as unknown as string[],
                ...(input.integration
                    ? { integration: Object.freeze({ ...input.integration }) }
                    : {}),
            });
            lifetimes.set(
                mode,
                registerBootstrapEntry(
                    root,
                    modes,
                    mode.id,
                    mode,
                    "user_validation_mode_conflict",
                ),
            );
        },
        async list() {
            return Promise.all(
                [...modes.values()].map(async (mode) => ({
                    id: mode.id,
                    labelKey: mode.labelKey,
                    stringsBaseUrl: mode.stringsBaseUrl,
                    requiredFields: [...(mode.requiredFields ?? [])],
                    available: await available(mode),
                })),
            );
        },
        async assertSelectable(id, previous) {
            if (id === previous) return;
            const mode = modes.get(id);
            if (!mode || !(await available(mode)) || modes.get(id) !== mode)
                throw new Error("user_validation_unavailable");
        },
        async evaluate(id, account) {
            return (
                await root.flow.run("auth:evaluateUserValidation", {
                    id,
                    account,
                })
            ).data.result as Awaited<
                ReturnType<UserValidationModes["evaluate"]>
            >;
        },
    };
    const validation = registerBootstrapFlow(root, {
        id: "auth:evaluateUserValidation",
        stages: ["resolvePolicy", "validateAccount", "verifyResult"],
    });
    validation.extend(
        "resolvePolicy",
        { id: "auth:resolveUserValidationPolicy" },
        async ({ input, data }) => {
            const { id, account } = input as {
                id: string;
                account: {
                    accountId: string;
                    role: string;
                    isFounder?: boolean;
                };
            };
            if (
                account.isFounder &&
                ["owner", "admin"].includes(account.role)
            ) {
                data.result = { verified: true, integrations: [] };
                return;
            }
            const mode = modes.get(id);
            if (!mode || !(await available(mode)) || modes.get(id) !== mode)
                throw new Error("user_validation_unavailable");
            data.revision = lifetimes.get(mode)!.revision;
            data.mode = mode;
        },
    );
    validation.extend(
        "validateAccount",
        { id: "auth:validateAccountPolicy" },
        async ({ input, data }) => {
            if (data.result) return;
            const { account } = input as {
                account: { accountId: string; role: string };
            };
            data.verified = await (data.mode as UserValidationMode).validate(
                account,
            );
        },
    );
    validation.extend(
        "verifyResult",
        { id: "auth:verifyUserValidationResult" },
        ({ data }) => {
            if (data.result) return;
            const mode = data.mode as UserValidationMode;
            if (
                modes.get(mode.id) !== mode ||
                !lifetimes.get(mode)?.active ||
                lifetimes.get(mode)?.revision !== data.revision
            )
                throw new Error("user_validation_unavailable");
            if (typeof data.verified !== "boolean")
                throw new Error("invalid_user_validation_result");
            if (!data.verified && !mode.integration)
                throw new Error("user_validation_failed");
            data.result = {
                verified: data.verified,
                integrations: data.verified ? [] : [{ ...mode.integration! }],
            };
        },
    );
    api.register({
        id: "none",
        labelKey: "ui.reuse.none",
        validate: () => true,
    });
    ctx.capabilities.contribute("auth:userValidationModes", api);
    root.contributePublicCapability("auth:userValidationModes", api);
    return api;
}
