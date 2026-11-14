import type { CapabilityContracts, Ctx } from "@cognis/core";
import { isAccountTargetDenial } from "./account-target.js";

export type DeprovisionOutcome =
    | Readonly<{
          persisted: true;
          username: string;
          action: "delete" | "disable" | "archive";
          revokedTokenCount?: number;
      }>
    | Readonly<{
          persisted: false;
          status: 400 | 403 | 404 | 503;
          reason: string;
      }>;

export interface DeprovisionOutcomeReader {
    read(input: unknown, stageResults: object): DeprovisionOutcome | undefined;
    deletedAccount(input: unknown, stageResults: object): string | undefined;
}

const CAPABILITY = "auth:deprovisionOutcome";
const UNAVAILABLE: DeprovisionOutcome = Object.freeze({
    persisted: false,
    status: 503,
    reason: "account_policy_unavailable",
});

function validateOutcome(value: unknown): DeprovisionOutcome {
    if (value instanceof Promise) {
        void value.catch(() => undefined);
        return UNAVAILABLE;
    }
    if (!value || typeof value !== "object" || Array.isArray(value))
        return UNAVAILABLE;
    const descriptors = Object.getOwnPropertyDescriptors(value);
    if (
        Reflect.ownKeys(value).some(
            (key) =>
                typeof key !== "string" ||
                !Object.hasOwn(descriptors[key], "value"),
        )
    )
        return UNAVAILABLE;
    const persisted = descriptors.persisted?.value;
    if (persisted === true) {
        const username = descriptors.username?.value;
        const action = descriptors.action?.value;
        const count = descriptors.revokedTokenCount?.value;
        if (
            Object.keys(descriptors).some(
                (key) =>
                    ![
                        "persisted",
                        "username",
                        "action",
                        "revokedTokenCount",
                    ].includes(key),
            ) ||
            typeof username !== "string" ||
            !username ||
            username.trim() !== username ||
            !["delete", "disable", "archive"].includes(action) ||
            (count !== undefined && (!Number.isSafeInteger(count) || count < 0))
        )
            return UNAVAILABLE;
        return Object.freeze({
            persisted: true,
            username,
            action,
            ...(count === undefined ? {} : { revokedTokenCount: count }),
        });
    }
    const status = descriptors.status?.value;
    const reason = descriptors.reason?.value;
    const denial = { allowed: false, status, code: reason };
    if (
        persisted !== false ||
        Object.keys(descriptors).some(
            (key) => !["persisted", "status", "reason"].includes(key),
        ) ||
        !isAccountTargetDenial(denial)
    )
        return UNAVAILABLE;
    return Object.freeze({
        persisted: false,
        status: denial.status,
        reason: denial.code,
    });
}

/** Bind Auth's receipt reader before the flow. Public stage results are not authority. */
export function bindDeprovisionOutcome(
    getRoot: () => Ctx | undefined,
): ((input: unknown, stageResults: object) => DeprovisionOutcome) | undefined {
    try {
        const root = getRoot();
        const contracts =
            root?.getCapability<CapabilityContracts>("system:contracts");
        const implementation =
            root?.getCapability<DeprovisionOutcomeReader>(CAPABILITY);
        const declaration = contracts?.describe(CAPABILITY);
        if (
            !root ||
            !contracts ||
            !declaration ||
            !implementation ||
            !root.isPublicCapability(CAPABILITY)
        )
            return undefined;
        const reader = contracts.resolve<DeprovisionOutcomeReader>(
            CAPABILITY,
            1,
        );
        const current = () =>
            getRoot() === root &&
            root.getCapability("system:contracts") === contracts &&
            root.getCapability(CAPABILITY) === implementation &&
            root.isPublicCapability(CAPABILITY) &&
            contracts.describe(CAPABILITY) === declaration;
        const probe = reader.read(Object.freeze({}), Object.freeze({}));
        if (probe !== undefined || !current()) {
            if (probe instanceof Promise) void probe.catch(() => undefined);
            return undefined;
        }
        return (input, stageResults) => {
            try {
                if (!current()) return UNAVAILABLE;
                const outcome = validateOutcome(
                    reader.read(input, stageResults),
                );
                return current() ? outcome : UNAVAILABLE;
            } catch {
                return UNAVAILABLE;
            }
        };
    } catch {
        return undefined;
    }
}
