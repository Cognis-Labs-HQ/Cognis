import test from "node:test";
import assert from "node:assert/strict";
import { heroFixture, settle, deferred, profileFor } from "./hero-fixture.js";

for (const kind of ["avatar", "banner"])
    test(`public ${kind} file-selection upload adopts new URL and releases it exactly once on abort`, async (context) => {
        const fixture = await heroFixture(context);
        const page = await fixture.mount();
        const old =
            kind === "avatar" ? fixture.image().src : fixture.banner().src;
        fixture.setOverride((path, options) =>
            options.method === "PUT" && path.endsWith(`/profile/${kind}`)
                ? Promise.resolve(
                      Response.json({
                          data: {
                              profile: {
                                  ...profileFor(),
                                  [`${kind}Key`]: `learner/${kind}-new`,
                              },
                          },
                      }),
                  )
                : undefined,
        );
        await fixture.selectImage(kind);
        const image = kind === "avatar" ? fixture.image() : fixture.banner();
        assert.ok(image);
        assert.equal(
            await fixture.blobs.get(image.src).text(),
            "cropped-image",
        );
        assert.notEqual(image.src, old);
        assert.equal(
            fixture.revoked.filter((value) => value === old).length,
            1,
        );
        page.abort();
        for (const url of fixture.blobs.keys())
            assert.equal(
                fixture.revoked.filter((value) => value === url).length,
                1,
                url,
            );
    });

for (const phase of ["crop", "delivery", "receipt"])
    test(`pending avatar ${phase} cannot adopt media in a newer route`, async (context) => {
        const fixture = await heroFixture(context),
            pending = deferred();
        await fixture.mount();
        if (phase === "crop") fixture.setCropWork(() => pending.promise);
        else
            fixture.setOverride((path, options) =>
                options.method === "PUT" && path.endsWith("/profile/avatar")
                    ? phase === "delivery"
                        ? pending.promise
                        : Promise.resolve({
                              ok: true,
                              json: () => pending.promise,
                          })
                    : undefined,
            );
        await fixture.selectImage("avatar");
        fixture.setProfile(profileFor("newer"));
        await fixture.mount("/profile/newer");
        const avatar = fixture.image(),
            banner = fixture.banner();
        const before = fixture.requests.length;
        pending.resolve(
            phase === "crop"
                ? new Blob(["old crop"])
                : phase === "delivery"
                  ? Response.json({ data: { profile: profileFor() } })
                  : { data: { profile: profileFor() } },
        );
        await settle();
        assert.equal(fixture.image(), avatar);
        assert.equal(fixture.banner(), banner);
        assert.equal(fixture.revoked.includes(avatar.src), false);
        if (phase === "crop") assert.equal(fixture.requests.length, before);
    });

test("a file picker opened by the previous route cannot start a write on the newly mounted page", async (context) => {
    const fixture = await heroFixture(context);
    await fixture.mount();
    fixture.document.querySelector(".profile-hero-avatar-btn").click();
    const input = fixture.document.querySelector('input[type="file"]');
    await fixture.mount();
    const before = fixture.requests.length;
    Object.defineProperty(input, "files", {
        configurable: true,
        value: [new File(["obsolete"], "old.png", { type: "image/png" })],
    });
    input.dispatchEvent(new fixture.window.Event("change"));
    await settle();
    assert.equal(
        fixture.requests.slice(before).filter((item) => item.method === "PUT")
            .length,
        0,
    );
    await fixture.selectImage("avatar");
    assert.equal(
        fixture.requests.slice(before).filter((item) => item.method === "PUT")
            .length,
        1,
    );
});
