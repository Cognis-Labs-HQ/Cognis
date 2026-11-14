import test from "node:test";
import assert from "node:assert/strict";
import { fixture, until } from "./fixtures/lifecycle-page.js";
import { registerTutorials } from "../../reuse/tutorials/runtime.js";
import { registerFloatingMenus } from "../../reuse/floating-menu-queue.js";
import { guides } from "../../app/modules/guides.js";

for (const locale of ["en", "de", "id", "ja"]) {
    test(`Check State guide progresses, restarts and replays in ${locale}`, async () => {
        const page = await fixture({ locale });
        const lifetime = new AbortController();
        try {
            const rect = {
                left: 0,
                top: 0,
                right: 100,
                bottom: 40,
                width: 100,
                height: 40,
            };
            page.window.HTMLElement.prototype.getBoundingClientRect = () =>
                rect;
            page.window.HTMLElement.prototype.getClientRects = () => [rect];
            page.window.HTMLElement.prototype.checkVisibility = () => true;
            registerFloatingMenus(page.host.ctx);
            page.host.ctx.capabilities.contribute(
                "session:isAuthenticated",
                () => true,
            );
            const rendered = [];
            const api = registerTutorials(page.host.ctx, {
                document: page.window.document,
                role: () => "admin",
                view: async (entry) => {
                    rendered.push(entry);
                    return { dispose() {} };
                },
            });
            await api.mountPage({
                ...guides[0],
                root: page.pageRoot,
                signal: lifetime.signal,
                i18n: page.i18n,
            });
            let session = await api.start("ui.marketplace:browse");
            await session.ready;
            await session.next();
            await session.next();
            assert.equal(session.state().stepId, "install-and-update");
            await session.cancel();
            await page.clickEnable();
            page.reject();
            await until(
                () =>
                    page.visible()?.action === "recheck" &&
                    !page.visible().disabled,
                "unknown control available",
            );
            session = await api.start("ui.marketplace:browse");
            await session.ready;
            await session.next();
            await session.next();
            assert.equal(session.state().stepId, "check-state");
            assert.equal(
                rendered.at(-1).text.body,
                page.i18n.t("ui.tutorial.marketplace.check.state.body"),
            );
            await session.back();
            assert.equal(session.state().stepId, "module-details");
            await session.restart();
            assert.equal(session.state().stepId, "discovery-and-sources");
            await session.next();
            await session.next();
            await session.next();
            await session.next();
            await session.finished;
            const replay = await api.start("ui.marketplace:browse");
            await replay.ready;
            lifetime.abort();
            await replay.finished;
            assert.equal(api.current(), null);
            assert.deepEqual(await api.list(), []);
        } finally {
            lifetime.abort();
            page.close();
        }
    });
}
