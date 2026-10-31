import {
    requireBootstrapScope,
    type Ctx,
    type BootstrapDisposer,
} from "@cognis/core";
import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/gateway.js";
import type {
    NotificationAction,
    RegisterNotificationAction,
    SendEmailAction,
    EmailActionInput,
} from "@cognis/core";
import type { SmtpNotificationSender } from "./notification-sender.js";

/** SMTP owns registration, rendering and delivery; contributors provide all message actions. */
export function registerSmtpActions(
    ctx: NotifyAdapterBootstrapCtx,
    sender: SmtpNotificationSender,
) {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const actions = new Map<string, { action: NotificationAction }>();
    const registrationFlow = "smtp:registerPurpose";
    root.registerFlow({
        id: registrationFlow,
        stages: ["validate", "register"],
    });
    root.flow.extend(
        registrationFlow,
        "validate",
        { id: "smtp:validatePurpose" },
        ({ input, data }) => {
            const scope = requireBootstrapScope(root);
            const { id, action } = input as { id: unknown; action: unknown };
            if (
                typeof id !== "string" ||
                !/^[a-z][a-zA-Z0-9._-]{0,79}$/.test(id) ||
                typeof action !== "function"
            )
                throw new Error("smtp_purpose_invalid");
            data.purpose = `${scope.owner}:${id}`;
        },
    );
    root.flow.extend(
        registrationFlow,
        "register",
        { id: "smtp:registerPurposeQueue" },
        ({ input, data }) => {
            const scope = requireBootstrapScope(root);
            const purpose = data.purpose as string;
            const action = (input as { action: NotificationAction }).action;
            const queue = sender.registerPurpose(purpose);
            let registration = { action };
            actions.set(purpose, registration);
            const dispose: BootstrapDisposer = () => {
                if (actions.get(purpose) === registration)
                    actions.delete(purpose);
                return queue();
            };
            dispose.reactivate = async () => {
                await queue.reactivate?.();
                registration = { action };
                actions.set(purpose, registration);
            };
            scope.registerDisposer(dispose);
        },
    );
    const register: RegisterNotificationAction = async (id, action) => {
        requireBootstrapScope(root);
        return (await root.flow.run(registrationFlow, { id, action })).data
            .purpose as string;
    };
    const sendFlow = "smtp:sendEmail";
    root.registerFlow({
        id: sendFlow,
        stages: ["validate", "render", "enqueue"],
    });
    root.flow.extend(
        sendFlow,
        "validate",
        { id: "smtp:validateEmail" },
        ({ input, data }) => {
            const request = input as EmailActionInput;
            if (!ctx.gateway.isSenderEnabled(sender.senderId))
                throw new Error("smtp_sender_disabled");
            const action = actions.get(request.purpose);
            if (!action) throw new Error("smtp_purpose_unregistered");
            if (!request.recipientEmail)
                throw new Error("smtp_sender_requires_recipient_email");
            data.action = action.action;
            data.registration = action;
        },
    );
    root.flow.extend(
        sendFlow,
        "render",
        { id: "smtp:renderEmailAction" },
        async ({ input, data }) => {
            data.message = await (data.action as NotificationAction)(
                (input as EmailActionInput).variables,
            );
        },
    );
    root.flow.extend(
        sendFlow,
        "enqueue",
        { id: "smtp:enqueueEmail" },
        async ({ input, data }) => {
            const request = input as EmailActionInput;
            // Recheck after an async action: disabling its owner must prevent a late enqueue.
            if (actions.get(request.purpose) !== data.registration)
                throw new Error("smtp_purpose_unregistered");
            if (!ctx.gateway.isSenderEnabled(sender.senderId))
                throw new Error("smtp_sender_disabled");
            const message = data.message as Awaited<
                ReturnType<NotificationAction>
            >;
            if (
                !message ||
                typeof message.subject !== "string" ||
                typeof message.body !== "string"
            )
                throw new Error("smtp_action_message_invalid");
            data.receipt = await sender.enqueueEmail(request, message);
        },
    );
    const send: SendEmailAction = async (input) =>
        (await root.flow.run(sendFlow, input)).data.receipt as Awaited<
            ReturnType<SendEmailAction>
        >;
    ctx.capabilities.contribute("notify:registerSmtpPurpose", register);
    ctx.capabilities.contribute("notify:sendEmail", send);
    ctx.capabilities.contribute(
        "notify:emailAvailable",
        () =>
            ctx.gateway.isSenderEnabled(sender.senderId) &&
            sender.isConfigured(),
    );
    root.contributePublicCapability("notify:registerSmtpPurpose", register);
    root.contributePublicCapability("notify:sendEmail", send);
    return { register, send };
}
