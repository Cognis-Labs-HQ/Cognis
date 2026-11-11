/** Library owns the controls and interactions used by generic and language-specific guides. */
const entryPopup = ".library-entry-popup";
const createPopup =
    ":is([data-library-create-layer-popup],[data-library-create-entry-popup])";
const example =
    ".library-entry-card-shell:has(>.library-entry-card[data-library-entry]):has(>[data-study-favourite-kind=library])";
const optional = ({ targetAvailable }) => targetAvailable;

function ownSurface({ target, groupSignal, ctx }) {
    ctx.capabilities
        .get("ui:transientSurfaces")
        .attachLifetime(
            target.closest(`${entryPopup},${createPopup}`),
            groupSignal,
        );
}

/** Return real, dependency-aware UI branches without submitting or manufacturing content. */
export function exploreWalkthrough({ text = {}, drawing = {} } = {}) {
    const copy = (id, key = id.replaceAll("-", ".")) => ({
        titleKey:
            text[id]?.titleKey ??
            `adapter.study.library.tutorial.explore.${key}.title`,
        bodyKey:
            text[id]?.bodyKey ??
            `adapter.study.library.tutorial.explore.${key}.body`,
    });
    const details = {
        portal: entryPopup,
        popup: entryPopup,
        layer: "overlay",
        group: "entry-details",
        dependsOn: ["details-and-relationships"],
    };
    const creation = {
        portal: createPopup,
        popup: createPopup,
        layer: "overlay",
        group: "create-entry",
        dependsOn: ["create-card"],
    };
    return [
        {
            id: "browse-a-layer",
            selector: ".library-layer-navigation",
            highlightNext: true,
            ...copy("browse-a-layer"),
        },
        {
            id: "filter-and-select",
            selector: ".library-filters",
            targetMatch: "first",
            highlightNext: true,
            ...copy("filter-and-select"),
        },
        {
            id: "favourites-and-contributions",
            selector:
                ":scope>[data-study-favourite][data-study-favourite-kind=library]",
            targetScope: example,
            targetMatch: "first",
            when: optional,
            highlightNext: true,
            ...copy("favourites-and-contributions"),
        },
        {
            id: "details-and-relationships",
            selector: ":scope>.library-entry-card[data-library-entry]",
            targetScope: example,
            targetMatch: "first",
            when: optional,
            interaction: "target",
            suppressHover: true,
            group: "entry-details",
            enter: ({ target, groupSignal, ctx }) =>
                ctx.capabilities
                    .get("study:libraryTutorials")
                    .bindOpening({ target, signal: groupSignal }),
            popup: entryPopup,
            advance: { event: "click" },
            highlightNext: false,
            ...copy("details-and-relationships"),
        },
        {
            id: "read-details",
            selector: ".library-detail",
            ...details,
            enter: ownSurface,
            missing: { timeoutMs: 15000, action: "skip" },
            highlightNext: true,
            ...copy("read-details"),
        },
        {
            id: "listen",
            selector:
                ":is(.library-audio-sequence,.library-audio-speaker):not(:disabled)",
            targetMatch: "first",
            ...details,
            when: optional,
            interaction: "target",
            highlightNext: true,
            ...copy("listen"),
        },
        {
            id: "practise-writing",
            selector: "[data-popup-action=draw]",
            ...details,
            when: optional,
            interaction: "target",
            advance: { event: "click" },
            highlightNext: false,
            ...copy("practise-writing"),
        },
        ...(drawing.drawingCanvas
            ? [
                  {
                      id: "draw-strokes",
                      target: drawing.drawingCanvas,
                      popup: entryPopup,
                      layer: "overlay",
                      group: "entry-details",
                      dependsOn: ["practise-writing"],
                      backTo: "details-and-relationships",
                      interaction: "target",
                      highlightNext: true,
                      missing: { timeoutMs: 15000, action: "skip" },
                      effects: { callout: true, arrow: true, spotlight: true },
                      enter: ({ groupSignal, ctx }) =>
                          ctx.capabilities
                              .get("study:tutorialTargets")
                              .attachDrawing({ signal: groupSignal })
                              .then(() => undefined),
                      ...copy("draw-strokes"),
                  },
                  {
                      id: "drawing-tools",
                      target: drawing.drawingTools,
                      popup: entryPopup,
                      layer: "overlay",
                      group: "entry-details",
                      dependsOn: ["practise-writing"],
                      interaction: "target",
                      highlightNext: true,
                      effects: { callout: true, arrow: true, spotlight: true },
                      ...copy("drawing-tools"),
                  },
              ]
            : []),
        {
            id: "create-card",
            selector: "[data-library-create-entry]",
            when: optional,
            popup: createPopup,
            group: "create-entry",
            interaction: "target",
            highlightNext: false,
            advance: { event: "click" },
            ...copy("create-card"),
        },
        {
            id: "choose-card-type",
            selector: "[data-library-create-layer]",
            ...creation,
            enter: ownSurface,
            missing: { timeoutMs: 15000, action: "skip" },
            interaction: "target",
            highlightNext: true,
            ...copy("choose-card-type"),
        },
        {
            id: "open-card-editor",
            selector: "[data-popup-action=continue]",
            ...creation,
            interaction: "target",
            highlightNext: false,
            advance: { event: "click" },
            ...copy("open-card-editor"),
        },
        {
            id: "write-card",
            selector: "[data-library-editor-panel=content]",
            ...creation,
            portal: "[data-library-create-entry-popup]",
            dependsOn: ["open-card-editor"],
            enter: ownSurface,
            missing: { timeoutMs: 15000, action: "skip" },
            interaction: "target",
            highlightNext: true,
            ...copy("write-card"),
        },
        {
            id: "card-sections",
            selector: "[data-library-editor-tabs]",
            ...creation,
            portal: "[data-library-create-entry-popup]",
            dependsOn: ["open-card-editor"],
            when: optional,
            interaction: "target",
            highlightNext: true,
            ...copy("card-sections"),
        },
        {
            id: "save-card",
            selector: ".popup-footer",
            ...creation,
            portal: "[data-library-create-entry-popup]",
            dependsOn: ["open-card-editor"],
            highlightNext: true,
            ...copy("save-card"),
        },
    ];
}
