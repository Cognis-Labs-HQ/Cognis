import test from "node:test";
import assert from "node:assert/strict";
import { fixture, until } from "./fixtures/lifecycle-page.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 30));
const mutations = (page) =>
    page.requests.filter((entry) => /\/(enable|disable)$/.test(entry.path));

for (const mode of [
    "stay",
    "pending-navigation",
    "confirmed-navigation",
    "replacement",
]) {
    test(`acknowledged enable owns its result across ${mode}`, async () => {
        const page = await fixture({
            stallRead: mode === "confirmed-navigation",
        });
        try {
            await page.clickEnable();
            assert.equal(page.visible().busy, "true");
            assert.equal(page.visible().disabled, true);
            if (mode === "pending-navigation" || mode === "replacement")
                page.navigate();
            if (mode === "replacement") await page.mount();
            assert.equal(page.enableRequest.signal.aborted, false);
            page.complete();
            await until(
                () => page.lifecycle.length === 1,
                "one acknowledged receipt",
            );
            if (mode === "confirmed-navigation") page.navigate();
            await settle();
            assert.equal(page.errors.length, 0);
            assert.equal(
                page.toasts.filter((toast) => toast.options.type === "error")
                    .length,
                0,
            );
            assert.equal(
                page.toasts.filter((toast) => toast.route === "/study").length,
                0,
            );
            assert.equal(
                page.refreshes.filter((refresh) => refresh.aborted).length,
                0,
            );
            assert.equal(mutations(page).length, 1);
            assert.deepEqual(page.host.events, ["modules:runLifecycleAction"]);
            if (mode === "stay" || mode === "replacement")
                assert.equal(page.visible().action, "disable");
            if (mode === "pending-navigation") {
                await page.mount();
                await until(
                    () => page.visible()?.action === "disable",
                    "authoritative remount",
                );
            }
        } finally {
            page.close();
        }
    });
}

for (const initialStatus of ["enabled", "disabled"]) {
    test(`lost ${initialStatus === "enabled" ? "disable" : "enable"} response reconciles without replay`, async () => {
        const page = await fixture({ initialStatus });
        try {
            await page.clickEnable();
            page.persisted =
                initialStatus === "enabled" ? "disabled" : "enabled";
            page.reject();
            await until(
                () => page.lifecycle.length === 1,
                "reconciled receipt",
            );
            await settle();
            assert.equal(
                page.visible().action,
                initialStatus === "enabled" ? "enable" : "disable",
            );
            assert.equal(mutations(page).length, 1);
            assert.equal(
                page.toasts[0].message,
                page.i18n.t("ui.app.modules.state_reconciled"),
            );
            assert.equal(
                page.errors.some(
                    ([event]) => event === "module_lifecycle_action_failed",
                ),
                false,
            );
            assert.deepEqual(JSON.parse(JSON.stringify(page.errors)), [
                [
                    "error",
                    "module_lifecycle_outcome_unknown",
                    {
                        action:
                            initialStatus === "enabled" ? "disable" : "enable",
                        moduleId: "study-language-en",
                        name: "TypeError",
                    },
                ],
            ]);
            assert.equal(page.lifecycle[0].source, "observed-state");
        } finally {
            page.close();
        }
    });
}

for (const option of [{}, { readFailure: true }, { removed: true }]) {
    test(`unconfirmed mutation remains unknown with ${JSON.stringify(option)}`, async () => {
        const page = await fixture(option);
        try {
            await page.clickEnable();
            page.reject();
            await until(
                () => page.visible()?.action === "recheck",
                "explicit unknown state",
            );
            await settle();
            assert.equal(page.visible().disabled, false);
            assert.equal(page.lifecycle.length, 0);
            assert.equal(mutations(page).length, 1);
            assert.equal(
                page.toasts[0].message,
                page.i18n.t("ui.app.modules.outcome_unknown"),
            );
            page.readFailure = false;
            page.removed = false;
            page.persisted = "enabled";
            page.pageRoot.querySelector("[data-module-recheck]").click();
            await until(
                () => page.visible()?.action === "disable",
                "explicit authoritative recheck",
            );
            assert.equal(mutations(page).length, 1);
        } finally {
            page.close();
        }
    });
}

for (const locale of ["en", "de", "id", "ja"]) {
    test(`HTTP rejection is localized for ${locale}`, async () => {
        const page = await fixture({ failEnable: true, locale });
        try {
            await page.clickEnable();
            page.complete();
            await until(() => page.toasts.length, "rejection feedback");
            await settle();
            assert.equal(page.visible().action, "enable");
            assert.equal(page.visible().disabled, false);
            assert.equal(page.lifecycle.length, 0);
            assert.equal(page.reads, 1);
            assert.equal(page.errors[0][0], "module_lifecycle_action_failed");
            assert.equal(
                page.toasts[0].message,
                page.i18n.t("ui.app.modules.lifecycle_failed"),
            );
            assert.throws(() =>
                page.i18n.t("ui.app.modules.missing_fixture_translation"),
            );
        } finally {
            page.close();
        }
    });
}

test("old account completion cannot publish state or start reconciliation", async () => {
    const page = await fixture();
    try {
        await page.clickEnable();
        page.window.localStorage.setItem(
            "cognis_access_token",
            "replacement-fixture-account",
        );
        page.reject();
        await settle();
        assert.equal(page.lifecycle.length, 0);
        assert.equal(page.toasts.length, 0);
        assert.equal(page.reads, 1);
        assert.equal(mutations(page).length, 1);
    } finally {
        page.close();
    }
});

for (const committed of [false, true]) {
    test(
        `actual apiFetch deadline reconciles ${committed ? "after" : "before"} commit`,
        { timeout: 35000 },
        async () => {
            const page = await fixture();
            try {
                await page.clickEnable();
                if (committed) page.persisted = "enabled";
                await until(
                    () => page.toasts.length,
                    "unmodified 30-second timeout",
                    32000,
                );
                assert.equal(
                    page.enableRequest.signal.reason.name,
                    "TimeoutError",
                );
                assert.equal(
                    page.visible().action,
                    committed ? "disable" : "recheck",
                );
                assert.equal(page.lifecycle.length, committed ? 1 : 0);
                assert.equal(mutations(page).length, 1);
                assert.ok(page.reads > 1);
                assert.equal(
                    page.errors.some(
                        (entry) =>
                            entry[0] === "module_lifecycle_action_failed",
                    ),
                    false,
                );
            } finally {
                page.close();
            }
        },
    );
}

for (const changedAccount of [false, true]) {
    test(`queued operations preserve order${changedAccount ? " but reject replacement authority" : " across remount"}`, async () => {
        const page = await fixture({ moduleCount: 2 });
        try {
            await page.clickModule(0);
            await page.clickModule(1);
            assert.equal(mutations(page).length, 1);
            page.navigate();
            if (changedAccount)
                page.window.localStorage.setItem(
                    "cognis_access_token",
                    "replacement",
                );
            await page.mount();
            page.completeMutation(0);
            if (!changedAccount) {
                await until(
                    () => mutations(page).length === 2,
                    "queued second mutation",
                );
                page.completeMutation(1);
                await until(
                    () =>
                        page.pageRoot.querySelectorAll("[data-module-disable]")
                            .length === 2,
                    "both authoritative states",
                );
                assert.equal(page.lifecycle.length, 2);
            } else {
                await settle();
                assert.equal(mutations(page).length, 1);
                assert.equal(page.lifecycle.length, 0);
                assert.equal(page.toasts.length, 0);
                assert.equal(page.visible().disabled, false);
            }
            assert.equal(
                page.refreshes.filter((entry) => entry.aborted).length,
                0,
            );
        } finally {
            page.close();
        }
    });
}

test(
    "reconciliation timeout is bounded and does not leave pending controls",
    { timeout: 8000 },
    async () => {
        const page = await fixture({ stallRead: true });
        try {
            await page.clickEnable();
            page.reject();
            await until(
                () =>
                    page.visible()?.action === "recheck" &&
                    !page.visible().disabled,
                "five-second reconciliation bound",
                6500,
            );
            assert.equal(page.lifecycle.length, 0);
            assert.equal(mutations(page).length, 1);
            assert.equal(page.reads, 2);
        } finally {
            page.close();
        }
    },
);

test("an unknown operation remount reads the current state without replay", async () => {
    const page = await fixture();
    try {
        await page.clickEnable();
        page.reject();
        await until(
            () => page.visible()?.action === "recheck",
            "unknown result",
        );
        page.persisted = "enabled";
        page.navigate();
        await page.mount();
        await until(
            () => page.visible()?.action === "disable",
            "current remount state",
        );
        assert.equal(mutations(page).length, 1);
    } finally {
        page.close();
    }
});

test("missing current outcome translations reject the actual registered action", async () => {
    const page = await fixture({ failEnable: true });
    try {
        page.translations.delete("ui.app.modules.lifecycle_failed");
        const pending = page.runRegisteredClick();
        const rejected = assert.rejects(pending, {
            code: "missing_translation",
        });
        await until(() => page.enableRequest, "mutation started");
        page.complete();
        await rejected;
        assert.equal(page.toasts.length, 0);
    } finally {
        page.close();
    }
});

test("cancelled required configuration reconciles a lost rollback without repeating disable", async () => {
    const page = await fixture({ configurationCancelled: true });
    try {
        await page.clickEnable();
        page.completeMutation(0);
        await until(
            () => mutations(page).length === 2,
            "one rollback after cancellation",
        );
        page.persisted = "disabled";
        page.mutationRequests[1].fail(new TypeError("rollback response lost"));
        await until(
            () => page.lifecycle.length === 1,
            "rollback state reconciled",
        );
        await settle();
        assert.equal(mutations(page).length, 2);
        assert.equal(page.popups.length, 1);
        assert.equal(page.lifecycle[0].status, "disabled");
        assert.equal(page.lifecycle[0].action, "disable");
        assert.equal(page.visible().action, "enable");
        assert.equal(
            page.toasts.some((toast) => toast.options.type === "success"),
            false,
        );
    } finally {
        page.close();
    }
});

test("an integrity response after navigation cannot open a stale acknowledgement", async () => {
    const page = await fixture({ integrityRequired: true });
    try {
        await page.clickEnable();
        page.navigate();
        page.complete();
        await settle();
        assert.equal(page.popups.length, 0);
        assert.equal(mutations(page).length, 1);
        assert.equal(page.toasts.length, 0);
        assert.equal(page.lifecycle.length, 0);
    } finally {
        page.close();
    }
});

for (const barrier of [2, 3]) {
    test(`replacement authority cannot continue required configuration at read ${barrier}`, async () => {
        const page = await fixture({
            configurationCancelled: true,
            configurationBarrier: barrier,
        });
        try {
            await page.clickEnable();
            page.completeMutation(0);
            await until(() => page.configRequest, "configuration stalled");
            page.window.localStorage.setItem(
                "cognis_access_token",
                "replacement",
            );
            page.completeConfiguration();
            await settle();
            assert.equal(page.configReads, barrier);
            assert.equal(page.popups.length, 0);
            assert.equal(mutations(page).length, 1);
            assert.equal(page.lifecycle.length, 0);
            assert.equal(page.toasts.length, 0);
        } finally {
            page.close();
        }
    });
}

test("optional guidance failure preserves acknowledged enable", async () => {
    const page = await fixture({ guidanceFailure: true });
    try {
        await page.clickEnable();
        page.complete();
        await until(
            () => page.lifecycle.length === 1,
            "acknowledged enable retained",
        );
        await settle();
        assert.equal(page.visible().action, "disable");
        assert.equal(page.popups.length, 1);
        assert.equal(mutations(page).length, 1);
        assert.equal(
            page.errors.some(
                (entry) => entry[0] === "module_lifecycle_action_failed",
            ),
            false,
        );
        assert.ok(
            page.toasts.some(
                (toast) =>
                    toast.message ===
                    page.i18n.t("ui.app.modules.guidance_unavailable"),
            ),
        );
    } finally {
        page.close();
    }
});

test("opposite authoritative reads and remounts preserve unresolved state", async () => {
    const page = await fixture();
    try {
        await page.clickEnable();
        page.reject();
        await until(
            () =>
                page.visible()?.action === "recheck" &&
                !page.visible().disabled,
            "unknown result",
        );
        page.pageRoot.querySelector("[data-module-recheck]").click();
        await until(() => page.reads === 3, "opposite state recheck");
        await settle();
        assert.equal(page.visible().action, "recheck");
        page.navigate();
        const pendingMount = page.mount();
        await pendingMount;
        assert.equal(page.visible().action, "recheck");
        assert.equal(mutations(page).length, 1);
        assert.equal(page.lifecycle.length, 0);
        page.persisted = "enabled";
        page.pageRoot.querySelector("[data-module-recheck]").click();
        await until(
            () => page.visible()?.action === "disable",
            "observed target state",
        );
        assert.equal(page.lifecycle[0].source, "observed-state");
        assert.equal(mutations(page).length, 1);
    } finally {
        page.close();
    }
});

test("observed enabled state cannot release or repeat dependency activation", async () => {
    const page = await fixture({
        moduleCount: 2,
        dependencyFlow: true,
        configurationCancelled: true,
    });
    try {
        await page.clickModule(1);
        await until(
            () => page.dependencyPopups.length === 1,
            "dependency popup",
        );
        const popup = page.dependencyPopups[0];
        const enable = popup.overlay.querySelector("[data-install-dependency]");
        enable.click();
        await until(() => mutations(page).length === 1, "dependency enable");
        page.persisted = "enabled";
        page.reject();
        await until(
            () => page.lifecycle.length === 1,
            "observed enabled state",
        );
        await settle();
        assert.equal(page.lifecycle[0].source, "observed-state");
        assert.equal(
            popup.overlay.querySelector('[data-popup-action="enable"]')
                .disabled,
            true,
        );
        enable.click();
        await settle();
        assert.equal(
            popup.overlay.querySelector('[data-popup-action="enable"]')
                .disabled,
            true,
        );
        assert.equal(mutations(page).length, 1);
        assert.ok(
            page.toasts.some(
                (toast) =>
                    toast.message ===
                    page.i18n.t("ui.app.modules.setup_unconfirmed"),
            ),
        );
        popup.complete("enable");
        await settle();
        assert.equal(
            mutations(page).length,
            1,
            "even a stale parent confirmation cannot continue activation",
        );
    } finally {
        page.close();
    }
});

test("dependency popup propagates a missing readiness translation", async () => {
    const page = await fixture({
        moduleCount: 2,
        dependencyFlow: true,
        configurationCancelled: true,
    });
    try {
        await page.clickModule(1);
        await until(
            () => page.dependencyPopups.length === 1,
            "dependency popup",
        );
        const popup = page.dependencyPopups[0];
        const enable = popup.overlay.querySelector("[data-install-dependency]");
        enable.click();
        await until(() => mutations(page).length === 1, "dependency enable");
        page.persisted = "enabled";
        page.reject();
        await until(
            () => page.lifecycle.length === 1 && !enable.disabled,
            "dependency result observed",
        );
        page.translations.delete("ui.app.modules.setup_unconfirmed");
        await assert.rejects(popup.actions.get(enable)(), {
            code: "missing_translation",
            key: "ui.app.modules.setup_unconfirmed",
        });
        assert.equal(enable.disabled, false);
        assert.equal(enable.hasAttribute("aria-busy"), false);
        assert.equal(
            popup.overlay.querySelector('[data-popup-action="enable"]')
                .disabled,
            true,
        );
        assert.equal(mutations(page).length, 1);
        assert.equal(
            page.toasts.some((toast) =>
                toast.message.includes("missing_translation"),
            ),
            false,
        );
        popup.complete("cancel");
        await settle();
    } finally {
        page.close();
    }
});
