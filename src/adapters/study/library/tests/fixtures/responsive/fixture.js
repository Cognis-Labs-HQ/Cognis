import { beginPageLoading } from "/static/reuse/page-entry.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { createI18n } from "/static/reuse/i18n.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { openPopup } from "/static/reuse/popup.js";
import { composeDetail } from "/static/adapters/study/library/app/detail.js";
import { bindDetailLayout } from "/static/adapters/study/library/app/detail-layout.js";

const finish = beginPageLoading();
const data = await (await fetch("/data.json")).json();
const i18n = await createI18n({
    componentStringBaseUrls: ["/static/adapters/study/library/languages"],
});
const lifetime = new AbortController();
uiCtx.registerFlow("study:library:composeEntryDetail", [
    "beforeCore",
    "core",
    "afterCore",
    "actions",
]);
const detail = await composeDetail(
    { entry: data.entries[0], references: [], usedBy: [] },
    [data.schema],
    data.entries,
    i18n,
    "ja",
    { readOnly: true },
);
const root = document.querySelector("#app");
const composer = createPageComposer(root, {
    elements: [
        {
            id: "entry",
            gridSize: { default: [4, 4], min: [1, 1], max: "full" },
            render: () => detail.body,
        },
    ],
    i18n,
    signal: lifetime.signal,
    allowCustomization: false,
    requireAccountSession: false,
    enableAccountEnhancements: false,
});
await composer.init();
finish();
window.fixture = {
    async open() {
        const bodyLifetime = new AbortController();
        void openPopup({
            surface: "reader",
            title: data.title,
            titleDetailItems: data.titleDetailItems,
            headingLayout: "annotated",
            stackTitleDetailOnOverflow: true,
            body: detail.body,
            actions: [
                { id: "previous", label: i18n.t("ui.reuse.previous") },
                { id: "next", label: i18n.t("ui.reuse.next") },
            ],
            signal: lifetime.signal,
            onOpen: (overlay) => {
                overlay.classList.add("library-entry-popup");
                bindDetailLayout(overlay, bodyLifetime.signal);
            },
            onAction: ({ actionId }) => actionId,
        }).finally(() => bodyLifetime.abort());
        return bodyLifetime;
    },
};
