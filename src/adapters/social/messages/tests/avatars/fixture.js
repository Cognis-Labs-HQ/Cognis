import { registerHooks } from "node:module";
import { JSDOM } from "jsdom";
import { readFileSync } from "node:fs";
import { uiCtx } from "../../../../../ui/reuse/ui-ctx.js";
import { createProviderLifecycle } from "../../../../../ui/reuse/provider-lifecycle.js";
import { createAvatars, state } from "./contracts.js";

const contracts = new URL("./contracts.js", import.meta.url).href;
const reuse = new URL("../../../../../ui/reuse/", import.meta.url);
const replacements = new Set([
    "/static/reuse/popup.js",
    "/static/reuse/timestamp.js",
    "/static/reuse/search-util/popup.js",
]);
registerHooks({
    resolve(specifier, context, nextResolve) {
        if (
            (specifier === "./i18n.js" &&
                context.parentURL?.endsWith("/reuse/markdown-renderer.js")) ||
            replacements.has(specifier) ||
            (context.parentURL?.includes("/social/messages/ui/") &&
                ["./offline-client.js", "./emoji-helpers.js"].includes(
                    specifier,
                ))
        ) {
            return { url: contracts, shortCircuit: true };
        }
        if (specifier.startsWith("/static/reuse/"))
            return nextResolve(
                new URL(specifier.slice("/static/reuse/".length), reuse).href,
                context,
            );
        return nextResolve(specifier, context);
    },
});

export async function fixture(context) {
    const dom = new JSDOM("<main></main>", {
        url: "https://fixture.invalid/messages/synthetic",
    });
    const globals = [
        "window",
        "document",
        "HTMLElement",
        "HTMLButtonElement",
        "CustomEvent",
        "Event",
        "fetch",
    ];
    const previous = new Map(globals.map((name) => [name, globalThis[name]]));
    for (const name of globals)
        globalThis[name] = name === "window" ? dom.window : dom.window[name];
    globalThis.fetch = () => {
        throw new Error("Network is forbidden in conversation fixtures");
    };
    const avatars = createAvatars();
    uiCtx.capabilities.contribute("ui:profileAvatarRenderer", avatars);
    state.messages = [];
    state.requests = [];
    state.respond = null;
    const lifecycle = createProviderLifecycle({
        uiCtx,
        importProvider: async () => import("../../ui/presentation-provider.js"),
    });
    const catalog = [
        {
            scriptUrl:
                "/static/adapters/social/messages/presentation-provider.js",
            component: {
                type: "adapter",
                gatewayId: "social",
                id: "social-messages",
                version: "2.8.3",
            },
        },
    ];
    await lifecycle.reconcile(catalog);
    const strings = new Map();
    for (const path of [
        "../../ui/languages/en/strings.xml",
        "../../../../../ui/languages/en/strings.xml",
    ]) {
        const xml = new dom.window.DOMParser().parseFromString(
            readFileSync(new URL(path, import.meta.url), "utf8"),
            "text/xml",
        );
        for (const entry of xml.querySelectorAll("string"))
            strings.set(entry.getAttribute("name"), entry.textContent);
    }
    const i18n = {
        t(key) {
            if (!strings.has(key))
                throw new Error(`missing_translation:${key}`);
            return strings.get(key);
        },
    };
    state.i18n = i18n;
    const messages = await import("../../ui/message-render.js");
    const conversation =
        await import("../../ui/reuse/conversation-presentation.js");
    context.after(async () => {
        await lifecycle.reconcile([]);
        uiCtx.capabilities.remove("ui:profileAvatarRenderer", avatars);
        dom.window.close();
        for (const [name, value] of previous) {
            if (value === undefined) delete globalThis[name];
            else globalThis[name] = value;
        }
    });
    return {
        dom,
        avatars,
        state,
        lifecycle,
        catalog,
        messages,
        conversation,
        i18n,
        root: dom.window.document.querySelector("main"),
        provider: uiCtx.capabilities.get("social:messagePresentation"),
    };
}
