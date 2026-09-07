import test from "node:test";
import assert from "node:assert/strict";
import {
    resolveQuickShareActions,
    type QuickShareAction,
} from "../gateway/quick-share-actions.js";

test("resolveQuickShareActions returns actions for active senders with matching capabilities", async () => {
    const capabilities = new Map<string, unknown>([
        [
            "notify:gateway",
            {
                listSenders() {
                    return [
                        {
                            senderId: "smtp",
                            name: "SMTP Email",
                            active: true,
                        },
                        {
                            senderId: "internal",
                            name: "Internal",
                            active: true,
                        },
                        {
                            senderId: "disabled",
                            name: "Disabled",
                            active: false,
                        },
                    ];
                },
            },
        ],
        [
            "notify:quickShare:smtp",
            ({ shareUrl }: { shareUrl: string }) => `mailto:?body=${shareUrl}`,
        ],
    ]);

    const actions = await resolveQuickShareActions(
        <T>(name: string) => capabilities.get(name) as T | undefined,
        {
            shareUrl: "https://example.com/share/test",
            label: "Planning",
        },
    );

    assert.deepEqual(actions, [
        {
            id: "smtp",
            label: "SMTP Email",
            href: "mailto:?body=https://example.com/share/test",
        } satisfies QuickShareAction,
    ]);
});

test("resolveQuickShareActions returns an empty array without notify gateway support", async () => {
    const actions = await resolveQuickShareActions(() => undefined, {
        shareUrl: "https://example.com/share/test",
        label: "Planning",
    });

    assert.deepEqual(actions, []);
});
