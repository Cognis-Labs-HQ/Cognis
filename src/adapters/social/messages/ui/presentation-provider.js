import { isValidMessageStyle } from "/static/reuse/message-style-options.js";
import { renderConversationMarkup } from "./reuse/conversation-presentation.js";

const capabilityName = "social:messagePresentation";
const flowName = "messages:presentConversation";
const changeEvent = "cognis:message-presentation-changed";

function validatePresentation(input) {
    if (
        !isValidMessageStyle(input?.style) ||
        typeof input?.currentAccountId !== "string" ||
        !Array.isArray(input?.records)
    ) {
        throw new TypeError("invalid_message_presentation");
    }
    const fields = [
        "id",
        "senderId",
        "senderDisplayName",
        "senderHandle",
        "text",
        "createdAt",
    ];
    const records = input.records.map((record) => {
        if (
            fields.some((field) => typeof record?.[field] !== "string") ||
            !Number.isFinite(Date.parse(record.createdAt))
        ) {
            throw new TypeError("invalid_message_presentation_record");
        }
        return Object.fromEntries(
            fields.map((field) => [field, record[field]]),
        );
    });
    return {
        records,
        style: input.style,
        currentAccountId: input.currentAccountId,
    };
}

function nonInteractiveMarkup(markup) {
    const template = document.createElement("template");
    template.innerHTML = markup;
    for (const element of template.content.querySelectorAll("a, button")) {
        const label = document.createElement("span");
        label.append(...element.childNodes);
        element.replaceWith(label);
    }
    for (const element of template.content.querySelectorAll(
        "img, video, audio, iframe, input, select, textarea",
    )) {
        element.remove();
    }
    return template.innerHTML;
}

export function mountProvider(ctx) {
    ctx.signal.throwIfAborted();
    const log = ctx.capabilities.get("ui:log");
    ctx.registerFlow(flowName, ["validate", "render"]);
    ctx.extendFlow(
        flowName,
        "validate",
        { id: "messages:presentationInput" },
        ({ input, data }) => {
            ctx.signal.throwIfAborted();
            data.presentation = validatePresentation(input);
        },
    );
    ctx.extendFlow(
        flowName,
        "render",
        { id: "messages:presentationMarkup" },
        ({ data }) => {
            ctx.signal.throwIfAborted();
            const avatars = ctx.capabilities.get("ui:profileAvatarRenderer");
            if (typeof avatars?.buildMarkup !== "function") {
                throw new Error("profile_avatar_presentation_unavailable");
            }
            data.markup = nonInteractiveMarkup(
                renderConversationMarkup(data.presentation, {
                    buildAvatar: avatars.buildMarkup,
                    interactive: false,
                }),
            );
        },
    );
    const capability = Object.freeze({
        version: 1,
        signal: ctx.signal,
        stylesheets: Object.freeze([
            "/static/adapters/social/messages/messages.css",
            "/static/adapters/social/messages/thread.css",
            "/static/adapters/social/messages/messages-style-variants.css",
        ]),
        async render(input) {
            ctx.signal.throwIfAborted();
            try {
                const result = await ctx.runFlow(flowName, input);
                ctx.signal.throwIfAborted();
                if (typeof result.data.markup !== "string") {
                    throw new Error("message_presentation_unavailable");
                }
                return result.data.markup;
            } catch (error) {
                if (!ctx.signal.aborted)
                    log?.("error", "Message presentation failed.", {
                        component: "social-messages",
                        operation: "presentConversation",
                        errorName: error.name,
                    });
                throw error;
            }
        },
    });
    ctx.capabilities.contribute(capabilityName, capability);
    const notify = () => window.dispatchEvent(new Event(changeEvent));
    ctx.signal.addEventListener("abort", notify, { once: true });
    notify();
}
