import test from "node:test";
import assert from "node:assert/strict";
import { securityFixture } from "./localization-fixture.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`Security guide retains real targets, Next/Back/Restart and replay: ${locale}`, async (context) => {
        const host = await securityFixture(context, { locale });
        const { window, document, browserCtx } = host;
        window.HTMLElement.prototype.getClientRects = function () {
            return this.hidden ? [] : [{ width: 100, height: 30 }];
        };
        window.HTMLElement.prototype.getBoundingClientRect = function () {
            return {
                left: 10,
                top: 10,
                right: 110,
                bottom: 40,
                width: 100,
                height: 30,
            };
        };
        const rendered = [];
        const feedback = [];
        browserCtx.capabilities.contribute(
            "session:isAuthenticated",
            () => true,
        );
        browserCtx.capabilities.contribute("ui:reuse", {
            importModule: host.loadShared,
        });
        const { registerFloatingMenus } = await host.loadShared(
            "floating-menu-queue.js",
        );
        registerFloatingMenus(browserCtx);
        const { registerTutorials } = await host.loadShared(
            "tutorials/runtime.js",
        );
        const api = registerTutorials(browserCtx, {
            document,
            role: () => "user",
            identity: () => "synthetic-account",
            page: () => ({ pathname: "/settings" }),
            view: async (options) => {
                const entry = {
                    ...options,
                    disposed: false,
                    dispose() {
                        this.disposed = true;
                    },
                };
                rendered.push(entry);
                return entry;
            },
            feedback: (...args) => feedback.push(args),
        });
        const provider = await host.loadOwned("tutorials.js");
        const dispose = await provider.mountProvider(browserCtx);
        context.after(dispose);
        assert.equal((await api.list()).length, 1);
        for (let replay = 0; replay < 2; replay++) {
            const session = await api.start("auth.security.tutorials:security");
            await session.ready;
            assert.equal(
                rendered.at(-1).target.id,
                "auth-security-reset-panel",
            );
            assert.equal(rendered.at(-1).total, 2);
            assert.equal(
                rendered.at(-1).text.body,
                host.i18n.t(
                    "gateway.auth.tutorial.security.password.changes.body",
                ),
            );
            assert.equal(rendered.at(-1).step.highlightNext, true);
            await session.next();
            assert.equal(
                rendered.at(-1).target.id,
                "settings-login-session-timeout",
            );
            await session.back();
            assert.equal(
                rendered.at(-1).target.id,
                "auth-security-reset-panel",
            );
            await session.next();
            await session.restart();
            assert.equal(
                rendered.at(-1).target.id,
                "auth-security-reset-panel",
            );
            await session.next();
            await session.next();
            assert.equal((await session.finished).status, "completed");
        }
        dispose();
        assert.equal((await api.list()).length, 0);
        assert.equal(
            rendered.every((entry) => entry.disposed),
            true,
        );
        assert.deepEqual(feedback, []);
        assert.equal(
            host.requests.filter(({ options }) => options.method === "POST")
                .length,
            0,
        );
    });
}
