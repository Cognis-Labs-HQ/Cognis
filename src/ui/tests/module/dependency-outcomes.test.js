import test from "node:test";
import assert from "node:assert/strict";
import { fixture, until } from "./fixtures/lifecycle-page.js";

const settle = () => new Promise((resolve) => setTimeout(resolve, 40));
const rejectedResponse = () =>
    new Response(JSON.stringify({ error: { code: "fixture_rejected" } }), {
        status: 409,
        headers: { "content-type": "application/json" },
    });

async function attemptDependent(page) {
    const before = page.mutationRequests.length;
    const popupCount = page.dependencyPopups.length;
    await page.clickModule(1);
    await settle();
    const popup = page.dependencyPopups[popupCount];
    if (popup) {
        const button = popup.overlay.querySelector("[data-install-dependency]");
        let finished = false;
        const pending = popup.actions
            .get(button)()
            .finally(() => {
                finished = true;
            });
        await until(
            () => finished || page.mutationRequests.length > before,
            "dependency callback outcome",
        );
        if (page.mutationRequests.length > before)
            page.completeMutation(before);
        await pending;
        popup.complete("cancel");
    } else if (page.mutationRequests.length > before) {
        page.completeMutation(before);
    }
    await settle();
    return page.mutationRequests.slice(before).map((request) => request.path);
}

for (const action of ["enable", "disable", "rollback"]) {
    for (const response of ["confirmed", "rejected", "unknown"]) {
        for (const observation of ["target", "opposite", "failed"]) {
            test(`${action} dependency readiness after ${response} response and ${observation} read`, async () => {
                const target = action === "enable" ? "enabled" : "disabled";
                const opposite = target === "enabled" ? "disabled" : "enabled";
                const page = await fixture({
                    moduleCount: 2,
                    moduleStatuses: [
                        action === "disable" ? "enabled" : "disabled",
                        "disabled",
                    ],
                    dependencyFlow: true,
                    configurationCancelled: action === "rollback",
                });
                try {
                    await page.clickModule(0);
                    await until(
                        () => page.mutationRequests.length === 1,
                        "initial mutation",
                    );
                    if (action === "rollback") {
                        page.completeMutation(0);
                        await until(
                            () => page.mutationRequests.length === 2,
                            "required setup rollback",
                        );
                    }
                    const requestIndex = page.mutationRequests.length - 1;
                    page.readFailure = observation === "failed";
                    if (response === "confirmed")
                        page.completeMutation(requestIndex);
                    else if (response === "rejected")
                        page.mutationRequests[requestIndex].complete(
                            rejectedResponse(),
                        );
                    else
                        page.mutationRequests[requestIndex].fail(
                            new TypeError("Synthetic response lost"),
                        );
                    page.persisted =
                        observation === "target" ? target : opposite;
                    await until(
                        () =>
                            page.visible() &&
                            !page.visible().busy &&
                            !page.visible().disabled,
                        "settled lifecycle result",
                    );
                    const reads = page.reads;
                    page.pageRoot
                        .querySelector("#module-source-refresh")
                        .click();
                    await until(
                        () => page.reads > reads,
                        "authoritative state refresh",
                    );
                    await settle();
                    page.configurationValues = { required: "fixture value" };
                    const blocked =
                        response === "unknown"
                            ? action === "enable" || observation !== "target"
                            : action === "rollback" &&
                              response === "rejected" &&
                              observation !== "target";
                    const first = await attemptDependent(page);
                    assert.equal(
                        first.length,
                        blocked ? 0 : 1,
                        "readiness controls explicit dependency activation",
                    );
                    if (blocked) {
                        assert.equal(
                            (await attemptDependent(page)).length,
                            0,
                            "repeated action stays blocked",
                        );
                        page.readFailure = false;
                        page.navigate();
                        await page.mount();
                        assert.equal(
                            (await attemptDependent(page)).length,
                            0,
                            "SPA remount retains unresolved outcome or incomplete setup",
                        );
                    }
                } finally {
                    page.close();
                }
            });
        }
    }
}

test("queued activation rechecks dependencies after an uncertain disable", async () => {
    const page = await fixture({
        moduleCount: 3,
        moduleStatuses: ["enabled", "disabled", "disabled"],
        dependencyFlow: true,
    });
    try {
        await page.clickModule(0);
        await page.clickModule(1);
        await page.clickModule(2);
        assert.equal(page.mutationRequests.length, 1);
        page.mutationRequests[0].fail(
            new TypeError("Synthetic disable response lost"),
        );
        await until(
            () => page.mutationRequests.length === 2,
            "unrelated queued module proceeds",
        );
        assert.ok(
            page.mutationRequests[1].path.includes("fixture-module-2/enable"),
        );
        page.completeMutation(1);
        await settle();
        assert.equal(page.mutationRequests.length, 2);
        assert.ok(page.pageRoot.querySelector("[data-module-recheck]"));
        page.persisted = "disabled";
        page.pageRoot.querySelector("[data-module-recheck]").click();
        await until(
            () => page.visible()?.action === "enable",
            "expected disabled state observed",
        );
        const recovery = await attemptDependent(page);
        assert.equal(recovery.length, 1);
        assert.ok(recovery[0].includes("study-language-en/enable"));
    } finally {
        page.close();
    }
});

test("pending dependency ownership prevents duplicate enable across popup and remount", async () => {
    const page = await fixture({ moduleCount: 2, dependencyFlow: true });
    try {
        await page.clickModule(0);
        await until(() => page.mutationRequests.length === 1, "initial enable");
        assert.equal((await attemptDependent(page)).length, 0);
        page.navigate();
        await page.mount();
        assert.equal((await attemptDependent(page)).length, 0);
        assert.equal(page.mutationRequests.length, 1);
        page.completeMutation(0);
        await until(
            () => page.lifecycle.length === 1,
            "original enable acknowledged",
        );
        await settle();
        assert.equal((await attemptDependent(page)).length, 1);
        assert.equal(page.mutationRequests.length, 2);
        assert.ok(
            page.mutationRequests[1].path.includes("fixture-module-1/enable"),
        );
    } finally {
        page.completeMutation(0);
        await settle();
        page.close();
    }
});

test("obsolete completion cannot release a newer account dependency action", async () => {
    const page = await fixture({ moduleCount: 2, dependencyFlow: true });
    let newer;
    try {
        await page.clickModule(0);
        await until(
            () => page.mutationRequests.length === 1,
            "old account enable",
        );
        page.window.localStorage.setItem(
            "cognis_access_token",
            "new-fixture-account",
        );
        page.navigate();
        await page.mount();
        await page.clickModule(1);
        const popup = page.dependencyPopups.at(-1);
        const button = popup.overlay.querySelector("[data-install-dependency]");
        newer = popup.actions.get(button)();
        await until(
            () => page.mutationRequests.length === 2,
            "new account enable",
        );
        popup.complete("cancel");
        await settle();
        page.completeMutation(0);
        await settle();
        page.navigate();
        await page.mount();
        assert.equal(
            page.visible().disabled,
            true,
            "new account pending action owns the card after remount",
        );
        assert.equal((await attemptDependent(page)).length, 0);
        assert.equal(page.mutationRequests.length, 2);
        page.completeMutation(1);
        await newer;
        await settle();
        assert.equal((await attemptDependent(page)).length, 1);
        assert.equal(page.mutationRequests.length, 3);
    } finally {
        for (let index = 0; index < page.mutationRequests.length; index++)
            page.completeMutation(index);
        await newer;
        await settle();
        page.close();
    }
});

test("queued readiness check retains an explicit optional dependency skip", async () => {
    const page = await fixture({
        moduleCount: 2,
        dependencyFlow: true,
        optionalDependencies: true,
    });
    try {
        await page.clickModule(1);
        await until(
            () => page.dependencyPopups.length === 1,
            "optional dependency prompt",
        );
        page.dependencyPopups[0].complete("enable");
        await settle();
        assert.equal(page.dependencyPopups.length, 1);
        await until(
            () => page.mutationRequests.length === 1,
            "parent enable without optional dependency",
        );
        assert.ok(
            page.mutationRequests[0].path.includes("fixture-module-1/enable"),
        );
        page.completeMutation(0);
        await settle();
        assert.equal(page.mutationRequests.length, 1);
    } finally {
        page.close();
    }
});

test("queued activation rejects a dependency removed after preflight", async () => {
    const page = await fixture({
        moduleCount: 3,
        moduleStatuses: ["enabled", "disabled", "disabled"],
        dependencyFlow: true,
    });
    try {
        await page.clickModule(2);
        await page.clickModule(1);
        page.removed = true;
        page.pageRoot.querySelector("#module-source-refresh").click();
        await until(() => page.reads === 2, "dependency catalog removal");
        await settle();
        page.completeMutation(0);
        await settle();
        assert.equal(page.mutationRequests.length, 1);
        assert.ok(
            page.toasts.some(
                (toast) =>
                    toast.message ===
                    page.i18n.t("ui.app.modules.hard_dependency_blocked"),
            ),
        );
    } finally {
        for (let index = 0; index < page.mutationRequests.length; index++)
            page.completeMutation(index);
        await settle();
        page.close();
    }
});

test("settings cannot repeat an unresolved enable but remains available for setup recovery", async () => {
    const page = await fixture({ configurationCancelled: true });
    try {
        await page.clickModule(0);
        await until(() => page.mutationRequests.length === 1, "initial enable");
        page.reject();
        await until(
            () => page.visible()?.action === "recheck",
            "unresolved enable",
        );
        page.navigate();
        await page.mount(
            "/administration/modules/b1adc29f-9d54-5785-9bea-2ce76f1981e4",
        );
        const settings = page.pageRoot.querySelector(
            "[data-module-preferences]",
        );
        assert.equal(settings.disabled, true);
        settings.dispatchEvent(
            new page.window.MouseEvent("click", { bubbles: true }),
        );
        await settle();
        assert.equal(page.mutationRequests.length, 1);
        assert.equal(page.popups.length, 0);
        page.persisted = "enabled";
        page.pageRoot.querySelector("[data-module-recheck]").click();
        await until(
            () => page.visible()?.action === "disable",
            "enabled state observed",
        );
        const recovery = page.pageRoot.querySelector(
            "[data-module-preferences]",
        );
        assert.equal(recovery.disabled, false);
        recovery.click();
        await until(() => page.popups.length === 1, "setup recovery popup");
        assert.equal(page.mutationRequests.length, 1);
    } finally {
        for (let index = 0; index < page.mutationRequests.length; index++)
            page.completeMutation(index);
        await settle();
        page.close();
    }
});
