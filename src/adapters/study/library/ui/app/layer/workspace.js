import { renderBrowser } from "../layer-cards.js";

/** Builds the owned Explore surface while retaining provider-authored chart layouts. */
export function createLayerWorkspace({
    layer,
    title,
    schemas,
    getEntries,
    i18n,
    selectedLayer,
}) {
    const fillViewport = Boolean(layer) && !layer.grid;
    return {
        fillViewport,
        contentScrolling: fillViewport,
        elements: [
            {
                id: "study-library-layer",
                label: title,
                pinned: true,
                width: "fill",
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () =>
                    `<section class="library-browser${fillViewport ? " library-browser--viewport" : ""}">${renderBrowser(schemas, getEntries(), i18n, selectedLayer)}</section>`,
            },
        ],
    };
}
