import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../../../ui/reuse/escape-html.js";

for (const usageFails of [false, true]) {
    test(`the reusable reaction picker applies the reaction when usage recording ${usageFails ? "fails" : "succeeds"}`, async () => {
        const requests = [],
            updated = [],
            logs = [];
        let selected;
        class Button {
            dataset = { emoji: "♥" };
        }
        const { createMessageReactionsController } = loadTestModule(
            new URL("../ui/reactions.js", import.meta.url),
            {
                "./reaction-state.js": {
                    nextReactionState: (messageId, emoji) => {
                        assert.equal(messageId, "message");
                        assert.equal(emoji, "♥");
                        return true;
                    },
                },
                "./emoji-catalog.js": {
                    fetchEmojiCatalog: async () => [
                        { emoji: "♥", name: "heart" },
                    ],
                },
                "./offline-client.js": {
                    messagesFetch: (path, options) => {
                        const body = JSON.parse(options.body);
                        requests.push({ path, body });
                        if (usageFails && path.endsWith("emoji-usage"))
                            throw new Error("usage_unavailable");
                        return Promise.resolve(Response.json({ data: {} }));
                    },
                },
                "/static/reuse/popup.js": {
                    createAnchoredPopup: () => ({ destroy() {}, hide() {} }),
                    openPopup: async ({ onOpen }) =>
                        onOpen({
                            querySelector: (selector) => {
                                if (selector === ".messages-emoji-grid")
                                    return {
                                        addEventListener: (_name, callback) => {
                                            selected = callback;
                                        },
                                    };
                                if (selector === "[data-popup-action]")
                                    return { click() {} };
                                return { addEventListener() {}, focus() {} };
                            },
                        }),
                },
                "/static/reuse/escape-html.js": { escapeHtml },
                "/static/reuse/member-display-name.js": {
                    resolveMemberDisplayName: () => "member",
                },
            },
            {
                HTMLButtonElement: Button,
                console: { error: (...args) => logs.push(args) },
            },
        );
        const controller = createMessageReactionsController({
            i18n: { t: (key) => key },
            onReactionUpdated: (value) => updated.push(value),
        });
        await controller.openEmojiPickerPopup("room", "message");
        await selected({ target: { closest: () => new Button() } });
        await new Promise(setImmediate);
        assert.deepEqual(
            requests.find(({ path }) => path.endsWith("emoji-usage")).body,
            { emoji: "♥" },
        );
        assert.deepEqual(
            requests.find(({ path }) => path.endsWith("reactions")).body,
            { emoji: "♥", active: true },
        );
        assert.equal(updated.length, 1);
        assert.equal(logs.length, usageFails ? 1 : 0);
        controller.destroy();
    });
}
