import test from "node:test";
import assert from "node:assert/strict";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

function fixture(initial = ["/old.css"], declared = initial) {
    const links = [];
    function link(href = "", loaded = false) {
        const listeners = new Map();
        return {
            href,
            media: "",
            dataset: {},
            sheet: loaded ? {} : null,
            removed: false,
            addEventListener(type, listener) {
                listeners.set(type, listener);
            },
            fire(type) {
                if (type === "load") this.sheet = {};
                listeners.get(type)?.();
            },
            remove() {
                this.removed = true;
            },
        };
    }
    links.push(...initial.map((href) => link(href, true)));
    const document = {
        head: {
            querySelectorAll: () => links.filter((entry) => !entry.removed),
            appendChild(entry) {
                links.push(entry);
            },
        },
        createElement: () => link(),
    };
    const styles = loadTestModule(
        new URL("../page-styles.js", import.meta.url),
        {},
        {
            document,
            window: { location: { origin: "https://cognis.test" } },
            URL,
            console,
        },
    );
    styles.adoptPageStylesheets(declared);
    return { styles, links, last: () => links.at(-1) };
}

test("outgoing styles remain active while destination CSS loads and until commit", async () => {
    const { styles, links, last } = fixture();
    const ready = styles.preparePageStylesheets(["/next.css"]);
    assert.equal(links[0].removed, false);
    assert.equal(links[0].media, "");
    assert.equal(last().media, "not all");
    last().fire("load");
    const commit = await ready;
    assert.equal(last().media, "not all");
    assert.equal(links[0].removed, false);
    commit();
    assert.equal(last().media, "");
    assert.equal(links[0].removed, true);
});

test("cancel and failed CSS discard only staged resources, and failure permits retry", async () => {
    const { styles, links, last } = fixture();
    const controller = new AbortController();
    const pending = styles.preparePageStylesheets(["/canceled.css"], {
        signal: controller.signal,
    });
    controller.abort();
    assert.equal(await pending, null);
    assert.equal(last().removed, true);
    assert.equal(links[0].removed, false);
    const failed = styles.preparePageStylesheets(["/retry.css"]);
    last().fire("error");
    await assert.rejects(failed, /page_stylesheet_unavailable/);
    assert.equal(last().removed, true);
    const retry = styles.preparePageStylesheets(["/retry.css"]);
    last().fire("load");
    (await retry)();
    assert.equal(last().removed, false);
});

test("superseding navigation cannot release the successor's shared pending sheet", async () => {
    const { styles, last } = fixture();
    const controller = new AbortController();
    const first = styles.preparePageStylesheets(["/shared.css"], {
        signal: controller.signal,
    });
    const second = styles.preparePageStylesheets(["/shared.css"]);
    controller.abort();
    assert.equal(await first, null);
    assert.equal(last().removed, false);
    last().fire("load");
    (await second)();
    assert.equal(last().media, "");
});

test("component ownership retains route CSS until its own signal is disposed", async () => {
    const { styles, links } = fixture();
    const component = new AbortController();
    await styles.ensurePageStylesheet("/old.css", { signal: component.signal });
    (await styles.preparePageStylesheets([]))();
    assert.equal(links[0].removed, false);
    component.abort();
    assert.equal(links[0].removed, true);
});

test("persistent shell styles survive route commits, and module revisions remain distinct", async () => {
    const { styles, links, last } = fixture();
    await styles.ensurePersistentStylesheet("/old.css");
    (await styles.preparePageStylesheets([]))();
    assert.equal(links[0].removed, false);
    for (const revision of ["one", "two"]) {
        const pending = styles.preparePageStylesheets([
            `/static/modules/example/page.css?revision=${revision}`,
        ]);
        last().fire("load");
        (await pending)();
    }
    assert.equal(links[1].removed, true);
    assert.equal(links[2].removed, false);
});

test("production stylesheet aliases are adopted and reused without a second fetch", async () => {
    const { links } = fixture(["/assets/page-ABCDEFGH.css"]);
    // The build preserves the logical source URL on emitted HTML links.
    links[0].dataset.pageStylesheetSource = "/static/styles/page.css";
    // Use a fresh document so adoption reads the server-provided attribute.
    const module = loadTestModule(
        new URL("../page-styles.js", import.meta.url),
        {},
        {
            document: { head: { querySelectorAll: () => links } },
            window: { location: { origin: "https://cognis.test" } },
            URL,
            console,
        },
    );
    module.adoptPageStylesheets();
    (await module.preparePageStylesheets(["/static/styles/page.css"]))();
    assert.equal(links[0].removed, false);
});

test("initial adoption leaves provider-injected notification and header styles under provider ownership", async () => {
    const { styles, links, last } = fixture(
        [
            "/old.css",
            "/static/gateways/notify-internal/notifications.css",
            "/broadcast.css",
        ],
        ["/old.css"],
    );
    const controller = new AbortController();
    const pending = styles.preparePageStylesheets(["/cancel.css"], {
        signal: controller.signal,
    });
    controller.abort();
    assert.equal(await pending, null);
    for (const href of ["/next.css", "/last.css", "/old.css"]) {
        const prepared = styles.preparePageStylesheets([href]);
        last().fire("load");
        (await prepared)();
        assert.equal(links[1].removed, false);
        assert.equal(links[1].media, "");
        assert.equal(links[2].removed, false);
    }
    assert.equal(
        links[0].removed,
        true,
        "the outgoing declared route still releases its styles",
    );
    links[1].remove();
    (await styles.preparePageStylesheets([]))();
    assert.equal(
        links[1].removed,
        true,
        "provider disposal is not reversed by route ownership",
    );
});
