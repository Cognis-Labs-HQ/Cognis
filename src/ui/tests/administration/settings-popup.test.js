import test from "node:test";
import assert from "node:assert/strict";
import { createAdapterSettingsPopup } from "../../app/administration/reuse/settings-popup.js";
import { transientSurfaces } from "../../reuse/transient-surfaces.js";

const identity = { gatewayId: "auth", adapterId: "example" };

function surface() {
    const attributes = new Map();
    const bodyAttributes = new Map();
    const body = {
        attributes: bodyAttributes,
        setAttribute: (key, value) => bodyAttributes.set(key, value),
    };
    return {
        attributes,
        body,
        querySelector: () => body,
        setAttribute: (key, value) => attributes.set(key, value),
    };
}

test("custom settings publish shared content targets, retain callbacks and release with the tutorial", async () => {
    const editor = surface();
    let settle;
    let dismissals = 0;
    let options;
    const api = { pageId: "servers" };
    const dismiss = () => {
        dismissals++;
        settle("cancel");
    };
    const openSettings = createAdapterSettingsPopup((input) => {
        options = input;
        return new Promise((resolve) => {
            settle = resolve;
            input.onOpen(editor, dismiss, api);
        });
    }, identity);
    let pages = 0;
    const pending = openSettings({
        closeProtection: true,
        onOpen(overlay, close, popup) {
            assert.equal(overlay, editor);
            assert.equal(close, dismiss);
            assert.equal(popup, api);
            pages++;
        },
    });
    assert.equal(options.closeProtection, true);
    assert.ok(editor.attributes.has("data-component-settings-popup"));
    assert.equal(
        editor.attributes.get("data-adapter-settings-gateway"),
        "auth",
    );
    assert.equal(editor.attributes.get("data-adapter-settings-id"), "example");
    assert.ok(editor.body.attributes.has("data-component-settings-content"));
    options.onOpen(editor, dismiss, api);
    assert.equal(pages, 2);
    const branch = new AbortController();
    assert.equal(transientSurfaces.attachLifetime(editor, branch.signal), true);
    branch.abort();
    assert.equal(await pending, "cancel");
    assert.equal(dismissals, 1);
    assert.equal(
        transientSurfaces.attachLifetime(editor, new AbortController().signal),
        false,
    );
});

test("nested decisions preserve their own modal identity instead of becoming the adapter editor", async () => {
    const editor = surface();
    const decision = surface();
    let closeEditor;
    const openSettings = createAdapterSettingsPopup((options) => {
        if (options.id === "editor")
            return new Promise((resolve) => {
                closeEditor = resolve;
                options.onOpen(editor, () => resolve(null), {});
            });
        options.onOpen?.(decision, () => {}, {});
        return Promise.resolve("confirmed");
    }, identity);
    const pending = openSettings({ id: "editor" });
    let opened = false;
    assert.equal(
        await openSettings({
            id: "decision",
            onOpen: () => {
                opened = true;
            },
        }),
        "confirmed",
    );
    assert.equal(opened, true);
    assert.equal(
        transientSurfaces.attachLifetime(
            decision,
            new AbortController().signal,
        ),
        false,
    );
    assert.equal(
        transientSurfaces.attachLifetime(editor, new AbortController().signal),
        true,
    );
    closeEditor("save");
    assert.equal(await pending, "save");
});

test("failed editor initialization rolls back its published lifetime", async () => {
    const editor = surface();
    const openSettings = createAdapterSettingsPopup(async (options) => {
        options.onOpen(editor, () => {}, {});
        throw new Error("editor_failed");
    }, identity);
    await assert.rejects(openSettings({}), /editor_failed/);
    assert.equal(
        transientSurfaces.attachLifetime(editor, new AbortController().signal),
        false,
    );
});

for (const kind of ["generic", "custom"]) {
    test(`${kind} settings honor the captured branch before any target attaches`, async () => {
        const branch = new AbortController();
        const editor = surface();
        let dismissals = 0;
        let initialized = 0;
        const openSettings = createAdapterSettingsPopup(
            (options) => {
                assert.equal(options.closeProtection, true);
                return new Promise((resolve) => {
                    options.onOpen(
                        editor,
                        () => {
                            dismissals++;
                            resolve("cancel");
                        },
                        {},
                    );
                });
            },
            { ...identity, signal: branch.signal },
        );
        const pending = openSettings({
            closeProtection: true,
            ...(kind === "custom"
                ? {
                      onOpen: () => {
                          initialized++;
                      },
                  }
                : {}),
        });
        assert.equal(initialized, kind === "custom" ? 1 : 0);
        branch.abort();
        assert.equal(dismissals, 1);
        assert.equal(await pending, "cancel");
    });
}

test("an abort during popup preparation dismisses on opening without initializing custom content", async () => {
    const branch = new AbortController();
    let options;
    let settle;
    let dismissals = 0;
    const openSettings = createAdapterSettingsPopup(
        (input) => {
            options = input;
            return new Promise((resolve) => {
                settle = resolve;
            });
        },
        { ...identity, signal: branch.signal },
    );
    const pending = openSettings({
        onOpen: () => assert.fail("cancelled custom initialization"),
    });
    branch.abort();
    options.onOpen(
        surface(),
        () => {
            dismissals++;
            settle("cancel");
        },
        {},
    );
    assert.equal(dismissals, 1);
    assert.equal(await pending, "cancel");
});

test("branch cancellation retains the popup's protected keep/discard decision", async () => {
    const branch = new AbortController();
    let settle;
    let dismissals = 0;
    let finished = false;
    const openSettings = createAdapterSettingsPopup(
        (options) =>
            new Promise((resolve) => {
                settle = resolve;
                options.onOpen(
                    surface(),
                    () => {
                        dismissals++;
                        return false;
                    },
                    {},
                );
            }),
        { ...identity, signal: branch.signal },
    );
    const pending = openSettings({ closeProtection: true }).then(() => {
        finished = true;
    });
    branch.abort();
    await Promise.resolve();
    assert.equal(dismissals, 1);
    assert.equal(finished, false);
    settle("cancel");
    await pending;
});

test("closing an editor releases the captured abort listener", async () => {
    const branch = new AbortController();
    let settle;
    let dismissals = 0;
    const openSettings = createAdapterSettingsPopup(
        (options) =>
            new Promise((resolve) => {
                settle = resolve;
                options.onOpen(
                    surface(),
                    () => {
                        dismissals++;
                    },
                    {},
                );
            }),
        { ...identity, signal: branch.signal },
    );
    const pending = openSettings({});
    settle("save");
    await pending;
    branch.abort();
    assert.equal(dismissals, 0);
});

for (const asynchronous of [false, true]) {
    test(`kept custom editors initialize later pages after cancellation (${asynchronous ? "asynchronous" : "synchronous"} protection)`, async () => {
        const branch = new AbortController();
        const editor = surface();
        let options;
        let settle;
        let dismissals = 0;
        const pages = [];
        const openSettings = createAdapterSettingsPopup(
            (input) => {
                options = input;
                return new Promise((resolve) => {
                    settle = resolve;
                    input.onOpen(
                        editor,
                        () => {
                            dismissals++;
                            return asynchronous
                                ? Promise.resolve(false)
                                : false;
                        },
                        { pageId: "home" },
                    );
                });
            },
            { ...identity, signal: branch.signal },
        );
        const pending = openSettings({
            closeProtection: true,
            onOpen: (_overlay, _dismiss, api) => pages.push(api.pageId),
        });
        branch.abort();
        await Promise.resolve();
        for (const pageId of ["server", "review", "home"])
            options.onOpen(
                editor,
                () => {
                    dismissals++;
                    return false;
                },
                { pageId },
            );
        assert.deepEqual(pages, ["home", "server", "review", "home"]);
        assert.equal(dismissals, 1);
        settle("cancel");
        await pending;
    });
}
