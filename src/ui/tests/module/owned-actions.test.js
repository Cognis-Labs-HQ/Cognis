import test from "node:test";
import assert from "node:assert/strict";
import { fixture, until } from "./fixtures/lifecycle-page.js";

const detail = "/administration/modules/b1adc29f-9d54-5785-9bea-2ce76f1981e4";
const settle = () => new Promise((resolve) => setTimeout(resolve, 50));
const settings = (page) =>
    page.pageRoot.querySelector("[data-module-preferences]");

async function close(page) {
    for (let index = 0; index < page.mutationRequests.length; index++)
        page.completeMutation(index);
    await settle();
    page.close();
}

for (const phase of ["enable", "rollback"]) {
    for (const committed of [false, true]) {
        test(`Settings ${phase} lost response ${committed ? "after" : "before"} commit retains owned outcome`, async () => {
            const page = await fixture({
                configurationCancelled: true,
                configurationRouteAvailable: true,
            });
            try {
                page.navigate();
                await page.mount(detail);
                settings(page).click();
                await until(
                    () => page.mutationRequests.length === 1,
                    "temporary settings enable",
                );
                if (phase === "rollback") {
                    page.completeMutation(0);
                    await until(
                        () => page.mutationRequests.length === 2,
                        "settings cancellation rollback",
                    );
                }
                page.persisted =
                    phase === "enable"
                        ? committed
                            ? "enabled"
                            : "disabled"
                        : committed
                          ? "disabled"
                          : "enabled";
                page.reject();
                await until(() => page.toasts.length, "owned settings result");
                await settle();
                assert.equal(
                    page.mutationRequests.length,
                    phase === "enable" ? 1 : 2,
                );
                assert.equal(
                    page.visible().action,
                    committed
                        ? phase === "enable"
                            ? "disable"
                            : "enable"
                        : "recheck",
                );
                assert.equal(settings(page).disabled, !committed);
                assert.equal(page.lifecycle.length, committed ? 1 : 0);
                if (committed)
                    assert.equal(page.lifecycle[0].source, "observed-state");
            } finally {
                await close(page);
            }
        });
    }
}

test("pending Settings owns the module across card remount and account replacement", async () => {
    const page = await fixture({
        configurationCancelled: true,
        configurationRouteAvailable: true,
    });
    try {
        page.navigate();
        await page.mount(detail);
        settings(page).click();
        await until(
            () => page.mutationRequests.length === 1,
            "settings enable",
        );
        page.navigate();
        await page.mount();
        assert.equal(page.visible().disabled, true);
        page.pageRoot
            .querySelector("[data-module-enable]")
            .dispatchEvent(
                new page.window.MouseEvent("click", { bubbles: true }),
            );
        await settle();
        assert.equal(page.mutationRequests.length, 1);
        page.window.localStorage.setItem("cognis_access_token", "replacement");
        page.completeMutation(0);
        await settle();
        assert.equal(page.configReads, 0);
        assert.equal(page.mutationRequests.length, 1);
        assert.equal(page.lifecycle.length, 0);
    } finally {
        await close(page);
    }
});

test("acknowledged Settings save confirms setup before dependent activation", async () => {
    const page = await fixture({
        moduleCount: 2,
        dependencyFlow: true,
        configurationCancelled: true,
        savePreferences: true,
    });
    try {
        await page.clickModule(0);
        await until(() => page.mutationRequests.length === 1, "initial enable");
        page.persisted = "enabled";
        page.reject();
        await until(() => page.lifecycle.length === 1, "enabled observation");
        page.navigate();
        await page.mount(detail);
        settings(page).click();
        await until(
            () => page.requests.some((request) => request.method === "PUT"),
            "configuration saved",
        );
        await settle();
        assert.equal(page.mutationRequests.length, 1);
        page.navigate();
        await page.mount();
        await page.clickModule(1);
        await until(
            () => page.mutationRequests.length === 2,
            "dependent enable",
        );
        assert.ok(
            page.mutationRequests[1].path.includes("fixture-module-1/enable"),
        );
        page.completeMutation(1);
        await settle();
    } finally {
        await close(page);
    }
});

for (const phase of ["disable", "restore"]) {
    for (const committed of [false, true]) {
        test(`Update ${phase} lost response ${committed ? "after" : "before"} commit is reconciled without replay`, async () => {
            const page = await fixture({
                initialStatus: "enabled",
                updateAvailable: true,
            });
            try {
                page.pageRoot.querySelector("[data-module-update]").click();
                await until(
                    () => page.mutationRequests.length === 1,
                    "temporary disable",
                );
                if (phase === "restore") {
                    page.completeMutation(0);
                    await until(
                        () => page.installationRequest,
                        "real install job poll",
                    );
                    page.completeInstallation(422);
                    await until(
                        () => page.mutationRequests.length === 2,
                        "restore enable",
                    );
                }
                page.persisted =
                    phase === "disable"
                        ? committed
                            ? "disabled"
                            : "enabled"
                        : committed
                          ? "enabled"
                          : "disabled";
                page.reject();
                await until(() => page.toasts.length, "owned update result");
                await settle();
                assert.equal(
                    page.mutationRequests.length,
                    phase === "disable" ? 1 : 2,
                );
                assert.equal(
                    page.visible().action,
                    committed
                        ? phase === "disable"
                            ? "enable"
                            : "disable"
                        : "recheck",
                );
                if (phase === "disable")
                    assert.equal(
                        page.requests.some(
                            (request) =>
                                request.path === "/api/v1/modules/install",
                        ),
                        false,
                    );
                assert.equal(page.lifecycle.length, committed ? 1 : 0);
                if (committed)
                    assert.equal(page.lifecycle[0].source, "observed-state");
            } finally {
                await close(page);
            }
        });
    }
}

for (const phase of ["before-poll", "pending-poll"]) {
    test(`Update ${phase} account replacement cannot poll or restore under new authority`, async () => {
        const page = await fixture({
            initialStatus: "enabled",
            updateAvailable: true,
        });
        try {
            page.pageRoot.querySelector("[data-module-update]").click();
            await until(
                () => page.mutationRequests.length === 1,
                "temporary disable",
            );
            page.completeMutation(0);
            await until(
                () =>
                    page.requests.some(
                        (request) => request.path === "/api/v1/modules/install",
                    ),
                "install submitted",
            );
            if (phase === "pending-poll")
                await until(() => page.installationRequest, "old account poll");
            page.window.localStorage.setItem(
                "cognis_access_token",
                "replacement",
            );
            if (phase === "pending-poll") page.completeInstallation();
            await new Promise((resolve) => setTimeout(resolve, 600));
            assert.equal(page.mutationRequests.length, 1);
            assert.equal(
                page.requests.filter((request) =>
                    request.path.includes("/install/"),
                ).length,
                phase === "pending-poll" ? 1 : 0,
            );
            assert.equal(page.lifecycle.length, 0);
            assert.equal(page.toasts.length, 0);
        } finally {
            await close(page);
        }
    });
}

test("rejected installation with acknowledged restore retains completed dependency setup", async () => {
    const page = await fixture({
        moduleCount: 2,
        moduleStatuses: ["enabled", "disabled"],
        dependencyFlow: true,
        updateAvailable: true,
    });
    try {
        page.pageRoot.querySelector("[data-module-update]").click();
        await until(
            () => page.mutationRequests.length === 1,
            "temporary disable",
        );
        page.completeMutation(0);
        await until(() => page.installationRequest, "install poll");
        page.completeInstallation(422);
        await until(
            () => page.mutationRequests.length === 2,
            "restore after rejected install",
        );
        page.completeMutation(1);
        await settle();
        await page.clickModule(1);
        await until(
            () => page.mutationRequests.length === 3,
            "dependent enable after known restore",
        );
        page.completeMutation(2);
        await settle();
    } finally {
        await close(page);
    }
});

for (const installationFailure of ["post", "poll", "missing"]) {
    test(`uncertain installation ${installationFailure} never restores or unlocks from a catalog snapshot`, async () => {
        const page = await fixture({
            initialStatus: "enabled",
            updateAvailable: true,
            installationFailure,
        });
        try {
            page.pageRoot.querySelector("[data-module-update]").click();
            await until(
                () => page.mutationRequests.length === 1,
                "temporary disable",
            );
            page.completeMutation(0);
            await until(
                () => page.visible()?.action === "recheck",
                "installation remains unknown",
            );
            assert.equal(page.mutationRequests.length, 1);
            assert.equal(page.lifecycle.length, 0);
            assert.ok(
                page.toasts.some(
                    (toast) =>
                        toast.message ===
                        page.i18n.t("ui.app.modules.installation_unknown"),
                ),
            );
            page.pageRoot.querySelector("[data-module-recheck]").click();
            await settle();
            assert.equal(page.visible().action, "recheck");
            page.navigate();
            await page.mount();
            assert.equal(page.visible().action, "recheck");
            assert.equal(page.mutationRequests.length, 1);
            assert.equal(
                page.requests.filter(
                    (request) => request.path === "/api/v1/modules/install",
                ).length,
                1,
            );
        } finally {
            await close(page);
        }
    });
}

test("successful enabled-module update retains the server restart requirement without restoration", async () => {
    const page = await fixture({
        initialStatus: "enabled",
        updateAvailable: true,
    });
    try {
        page.pageRoot.querySelector("[data-module-update]").click();
        await until(
            () => page.mutationRequests.length === 1,
            "temporary disable",
        );
        page.completeMutation(0);
        await until(() => page.installationRequest, "job poll");
        page.completeInstallation();
        await until(
            () =>
                page.toasts.some(
                    (toast) =>
                        toast.message ===
                        page.i18n.t("ui.app.modules.restart_required"),
                ),
            "restart required",
        );
        assert.equal(page.mutationRequests.length, 1);
        assert.equal(page.lifecycle[0].source, "acknowledged-response");
        assert.equal(page.lifecycle[0].status, "disabled");
    } finally {
        await close(page);
    }
});

test("known install POST rejection permits one acknowledged restoration", async () => {
    const page = await fixture({
        initialStatus: "enabled",
        updateAvailable: true,
        installationFailure: "rejected-post",
    });
    try {
        page.pageRoot.querySelector("[data-module-update]").click();
        await until(
            () => page.mutationRequests.length === 1,
            "temporary disable",
        );
        page.completeMutation(0);
        await until(
            () => page.mutationRequests.length === 2,
            "known-rejected install restoration",
        );
        page.completeMutation(1);
        await settle();
        assert.equal(page.visible().action, "disable");
        assert.equal(page.mutationRequests.length, 2);
        assert.equal(
            page.requests.filter((request) =>
                request.path.includes("/install/"),
            ).length,
            0,
        );
    } finally {
        await close(page);
    }
});

test("update cannot restore a module whose required dependency outcome is unresolved", async () => {
    const page = await fixture({
        moduleCount: 2,
        moduleStatuses: ["enabled", "enabled"],
        updateAvailable: true,
        dependencyFlow: true,
    });
    try {
        await page.clickModule(0);
        page.reject();
        await until(
            () => page.visible()?.action === "recheck",
            "dependency disable remains unknown",
        );
        page.pageRoot.querySelectorAll("[data-module-update]")[0].click();
        await settle();
        assert.equal(page.mutationRequests.length, 1);
        assert.equal(
            page.requests.some(
                (request) => request.path === "/api/v1/modules/install",
            ),
            false,
        );
    } finally {
        await close(page);
    }
});
