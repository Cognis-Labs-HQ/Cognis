import { requireBootstrapScope, type Ctx } from "@cognis/core";
import type { GatewayBootstrapContext } from "../../shared.js";
import type { CoreNotificationGateway } from "../gateway.js";

export type RegisterSmtpPurpose = (id: string) => Promise<string>;

/** Publish registration through the host's revocable bootstrap authority and staged flow. */
export function registerSmtpPurposeCapability(
    ctx: GatewayBootstrapContext,
    gateway: CoreNotificationGateway,
): RegisterSmtpPurpose | undefined {
    if (!gateway.canRegisterSenderPurpose("smtp")) return undefined;
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const flow = "notify:registerSmtpPurpose";
    root.registerFlow({ id: flow, stages: ["validate", "create"] });
    root.flow.extend(
        flow,
        "validate",
        { id: "notify:validateSmtpPurpose" },
        ({ input, data }) => {
            const scope = requireBootstrapScope(root);
            const id = (input as { id?: unknown }).id;
            if (
                typeof id !== "string" ||
                !/^[a-z][a-zA-Z0-9._-]{0,79}$/.test(id)
            )
                throw new Error("smtp_purpose_invalid");
            data.purpose = `${scope.owner}:${id}`;
        },
    );
    root.flow.extend(
        flow,
        "create",
        { id: "notify:createSmtpPurposeQueue" },
        ({ data }) => {
            const scope = requireBootstrapScope(root);
            const purpose = data.purpose as string;
            gateway.registerSenderPurpose("smtp", purpose);
            ctx.log?.("info", "SMTP purpose queue registered.", {
                component: "notify",
                operation: "registerSmtpPurpose",
                owner: scope.owner,
                purpose,
            });
        },
    );
    const register: RegisterSmtpPurpose = async (id) => {
        requireBootstrapScope(root);
        return (await root.flow.run(flow, { id })).data.purpose as string;
    };
    ctx.capabilities.contribute("notify:registerSmtpPurpose", register);
    root.contributePublicCapability("notify:registerSmtpPurpose", register);
    return register;
}
