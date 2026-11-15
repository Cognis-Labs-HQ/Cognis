import assert from "node:assert/strict";
import { createAvatarRenderer } from "../fixtures/avatar-renderer.js";
import { escapeHtml } from "../../../../../ui/reuse/escape-html.js";

export const state = { messages: [], requests: [], popups: [], searches: [] };

export async function messagesFetch(path, options = {}) {
    state.requests.push({ path, options });
    assert.equal(options.method ?? "GET", "GET");
    return state.respond
        ? state.respond(path, options)
        : Response.json({ data: state.messages, pendingRequest: null });
}

export const formatDate = (value) => value?.slice(0, 10) ?? "";
export const formatTime = (value) => value?.slice(11, 16) ?? "";
export const getCachedEmojiList = () => [];
export const getQuickReactionEmojis = () => [];
export const registerSearchIndex = (options) => state.searches.push(options);
export const openPopup = (options) => state.popups.push(options);

export function createAnchoredPopup() {
    let visible = false;
    return {
        show() {
            visible = true;
        },
        hide() {
            visible = false;
        },
        destroy() {
            visible = false;
        },
        get visible() {
            return visible;
        },
    };
}

export function createAvatars() {
    const calls = [];
    const hydrated = [];
    return {
        ...createAvatarRenderer({ calls }),
        hydrated,
        buildMarkup(options) {
            calls.push({ operation: "markup", options });
            return `<span class="${escapeHtml(options.avatarClass)}" data-fixture-label="${escapeHtml(options.label)}" data-fixture-seed="${escapeHtml(options.colorSeed)}"></span>`;
        },
        async hydrate(root) {
            hydrated.push(root);
        },
    };
}

export async function createI18n() {
    return state.i18n;
}
