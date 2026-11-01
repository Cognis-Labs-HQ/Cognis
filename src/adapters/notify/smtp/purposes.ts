import { EMAIL_DELIVERY_RATE_LIMIT_MS } from "./rate-limit.js";
import { createEmailTemplates } from "./email-templates.js";
import {
    registerBootstrapFlow,
    requireBootstrapScope,
    type Ctx,
    type BootstrapDisposer,
} from "@cognis/core";

import type { NotifyAdapterBootstrapCtx } from "../../../gateways/notify/contracts/sender.js";

import type {
    NotificationAction,
    RegisterNotificationAction,
    SendEmailAction,
    EmailActionInput,
} from "../../../gateways/notify/contracts/action-delivery.js";
import type { SmtpNotificationSender } from "./notification-sender.js";

/** SMTP owns registration, rendering and delivery; contributors provide all message actions. */
export async function registerSmtpActions(
    ctx: NotifyAdapterBootstrapCtx,
    sender: SmtpNotificationSender,
) {
    const root = ctx.capabilities.require<Ctx>("system:ctx");
    const templates = await createEmailTemplates(root);
    ctx.capabilities.contribute("notify:emailTemplates", templates);
    root.contributePublicCapability("notify:emailTemplates", templates);
    const actions = new Map<
        string,
        {
            action: NotificationAction;
            render: ReturnType<typeof templates.bindFactory>;
        }
    >();
    const registrationFlow = "smtp:registerPurpose";
    const registration = registerBootstrapFlow(root, {
        id: registrationFlow,
        stages: ["validate", "register"],
    });
    registration.extend(
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
    registration.extend(
        "register",
        { id: "smtp:registerPurposeQueue" },
        ({ input, data }) => {
            const scope = requireBootstrapScope(root);
            const purpose = data.purpose as string;
            const action = (input as { action: NotificationAction }).action;
            const settings = (
                input as {
                    options?: {
                        factory?: string;
                        options?: Record<string, unknown>;
                    };
                }
            ).options;
            const render = templates.bindFactory(
                settings?.factory ?? "standard",
                settings?.options ?? {},
            );
            const queue = sender.registerPurpose(purpose);
            let registration = { action, render };
            actions.set(purpose, registration);
            const dispose: BootstrapDisposer = () => {
                if (actions.get(purpose) === registration)
                    actions.delete(purpose);
                return queue();
            };
            dispose.reactivate = async () => {
                await queue.reactivate?.();
                registration = { action, render };
                actions.set(purpose, registration);
            };
            scope.registerDisposer(dispose);
        },
    );
    const register: RegisterNotificationAction = async (
        id,
        action,
        options,
    ) => {
        requireBootstrapScope(root);
        return (await root.flow.run(registrationFlow, { id, action, options }))
            .data.purpose as string;
    };
    const sendFlow = "smtp:sendEmail";
    const delivery = registerBootstrapFlow(root, {
        id: sendFlow,
        stages: ["validate", "render", "enqueue"],
    });
    delivery.extend(
        "validate",
        { id: "smtp:validateEmail" },
        ({ input, data }) => {
            const request = input as EmailActionInput;
            if (
                !ctx.capabilities.require<(id: string) => boolean>(
                    "notify:isSenderEnabled",
                )(sender.senderId)
            )
                throw new Error("smtp_sender_disabled");
            const action = actions.get(request.purpose);
            if (!action) throw new Error("smtp_purpose_unregistered");
            if (!request.recipientEmail)
                throw new Error("smtp_sender_requires_recipient_email");
            data.action = action.action;
            data.registration = action;
        },
    );
    delivery.extend(
        "render",
        { id: "smtp:renderEmailAction" },
        async ({ input, data }) => {
            const request = input as EmailActionInput;
            data.theme = await sender.getRecipientTheme(request.recipientEmail);
            const message = await (data.action as NotificationAction)(
                request.variables,
            );
            const registration = data.registration as {
                render: ReturnType<typeof templates.bindFactory>;
            };
            data.message = await registration.render(
                message,
                data.theme as "light" | "dark",
                request.variables,
            );
        },
    );
    delivery.extend(
        "enqueue",
        { id: "smtp:enqueueEmail" },
        async ({ input, data }) => {
            const request = input as EmailActionInput;
            // Recheck after an async action: disabling its owner must prevent a late enqueue.
            if (actions.get(request.purpose) !== data.registration)
                throw new Error("smtp_purpose_unregistered");
            if (
                !ctx.capabilities.require<(id: string) => boolean>(
                    "notify:isSenderEnabled",
                )(sender.senderId)
            )
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
            data.receipt = await sender.enqueueEmail(
                request,
                message,
                data.theme as "light" | "dark",
            );
        },
    );
    const send: SendEmailAction = async (input) =>
        (await root.flow.run(sendFlow, input)).data.receipt as Awaited<
            ReturnType<SendEmailAction>
        >;
    ctx.capabilities.contribute("notify:registerEmailPurpose", register);
    ctx.capabilities.contribute("notify:sendEmail", send);
    const deliveryPolicy = () => ({
        codeLength: sender.getCodeLength(),
        minimumIntervalMs: EMAIL_DELIVERY_RATE_LIMIT_MS,
    });
    ctx.capabilities.contribute("notify:emailDeliveryPolicy", deliveryPolicy);
    root.contributePublicCapability(
        "notify:emailDeliveryPolicy",
        deliveryPolicy,
    );
    ctx.capabilities.contribute("notify:emailCodeLength", () =>
        sender.getCodeLength(),
    );
    ctx.capabilities.contribute(
        "notify:emailAvailable",
        () =>
            ctx.capabilities.require<(id: string) => boolean>(
                "notify:isSenderEnabled",
            )(sender.senderId) && sender.isConfigured(),
    );
    root.contributePublicCapability("notify:registerEmailPurpose", register);
    root.contributePublicCapability("notify:sendEmail", send);
    return { register, send };
}
