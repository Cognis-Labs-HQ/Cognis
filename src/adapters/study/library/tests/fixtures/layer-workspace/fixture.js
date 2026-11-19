import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import { createSideMenu } from "/static/reuse/side-menu.js";
import { createLayerWorkspace } from "/static/adapters/study/library/app/layer/workspace.js";
import { bindBrowseControls } from "/static/adapters/study/library/app/browse-controls.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";

const finish = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: [
        ...data.hostCatalogs,
        "/static/adapters/study/library/languages",
    ],
});
const favourites = new Set();
uiCtx.capabilities.contribute("study:favourites", {
    has: (kind, id) => favourites.has(`${kind}:${id}`),
    async load({ signal } = {}) {
        signal?.throwIfAborted();
        return [...favourites];
    },
    async toggle({ kind, id, favourite, signal }) {
        signal?.throwIfAborted();
        const key = `${kind}:${id}`;
        if (favourite) favourites.add(key);
        else favourites.delete(key);
        return [...favourites];
    },
});
const root = document.querySelector("#app");
let composer;
let lifetime;

async function showLayer(id, count = data.entries.length) {
    composer?.destroy();
    lifetime?.abort();
    lifetime = new AbortController();
    const layer = structuredClone(data.layers.find((layer) => layer.id === id));
    const entries = data.entries.slice(0, count).map((entry) => ({
        ...entry,
        schemaId: "fixture",
        language: "en",
        layer: id,
    }));
    if (layer.grid) layer.grid.items = entries.map((entry) => entry.id);
    const schema = {
        id: "fixture",
        version: 1,
        namespace: "fixture",
        language: "en",
        metadata: { labels: { en: "Study" } },
        layers: [layer],
    };
    const menu = createSideMenu({
        groups: [
            {
                id: "layers",
                collapsible: false,
                items: data.layers.map((layer) => ({
                    id: layer.id,
                    label: layer.metadata.labels.en,
                })),
            },
        ],
        activeId: id,
        onSelect: showLayer,
        storageKeyPrefix: "fixture-layers",
    });
    composer = createPageComposer(root, {
        ...createLayerWorkspace({
            layer,
            title: layer.metadata.labels.en,
            schemas: [schema],
            getEntries: () => entries,
            i18n,
            selectedLayer: { schemaId: schema.id, layerId: id },
        }),
        i18n,
        signal: lifetime.signal,
        allowCustomization: false,
        requireAccountSession: false,
        enableAccountEnhancements: false,
        pageContext: {
            title: layer.metadata.labels.en,
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [{ id: "layers", render: () => menu.render() }],
        toolbarScrollable: true,
    });
    await composer.init();
    menu.mount(root, { signal: lifetime.signal });
    await bindBrowseControls(root, entries, [schema], i18n, lifetime.signal);
    window.fixture.composer = composer;
}

window.fixture = { data, showLayer };
await showLayer(data.layers[0].id);
finish();
window.fixtureReady = true;
