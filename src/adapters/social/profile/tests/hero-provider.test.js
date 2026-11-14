import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, deferred } from "./hero-fixture.js";

test("actual Profile provider disable releases rendered URLs, and re-enable establishes fresh owner", async (context) => {
    const fixture = await heroFixture(context, { useProviderLifecycle: true });
    const earlierPage = await fixture.mount();
    const earlierUrls = [fixture.image().src, fixture.banner().src];
    await fixture.lifecycle.reconcile([]);
    assert.equal(
        fixture.host.ctx.capabilities.get("social:profileRequest"),
        undefined,
    );
    assert.equal(fixture.image(), null);
    assert.equal(fixture.banner(), null);
    for (const url of earlierUrls)
        assert.equal(
            fixture.revoked.filter((value) => value === url).length,
            1,
        );
    await fixture.lifecycle.reconcile(fixture.providerCatalog);
    await fixture.mount();
    const current = [fixture.image(), fixture.banner()];
    earlierPage.abort();
    await settle();
    assert.equal(fixture.image(), current[0]);
    assert.equal(fixture.banner(), current[1]);
    for (const image of current)
        assert.equal(fixture.revoked.includes(image.src), false);
});

test("provider-disabled pending media cannot appear after provider re-enable", async (context) => {
    const fixture = await heroFixture(context, { useProviderLifecycle: true }),
        pending = deferred();
    fixture.setMedia((path) =>
        path.endsWith("/avatar")
            ? pending.promise
            : Promise.resolve(new Response("old-banner")),
    );
    const oldMount = fixture.mount();
    await settle();
    await fixture.lifecycle.reconcile([]);
    await fixture.lifecycle.reconcile(fixture.providerCatalog);
    fixture.setMedia(async (path) => new Response(`fresh:${path}`));
    await fixture.mount();
    const avatar = fixture.image(),
        banner = fixture.banner();
    pending.resolve(new Response("old-avatar"));
    await oldMount;
    assert.equal(fixture.image(), avatar);
    assert.equal(fixture.banner(), banner);
    assert.ok(
        (await fixture.blobs.get(avatar.src).text()).startsWith("fresh:"),
    );
    assert.equal(fixture.revoked.includes(avatar.src), false);
});
