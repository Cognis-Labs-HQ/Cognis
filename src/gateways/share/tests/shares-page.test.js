import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const pageSource = await readFile(
    new URL("../ui/app/shares/index.js", import.meta.url),
    "utf8",
);
const navbarSource = await readFile(
    new URL("../ui/navbar.js", import.meta.url),
    "utf8",
);
const templateSource = await readFile(
    new URL("../ui/app/shares/templates.html", import.meta.url),
    "utf8",
);
const styleSource = await readFile(
    new URL("../ui/app/shares/index.css", import.meta.url),
    "utf8",
);
const bootstrapSource = await readFile(
    new URL("../bootstrap/index.ts", import.meta.url),
    "utf8",
);
const graphSource = await readFile(
    new URL("../../../ui/reuse/dot-graph.js", import.meta.url),
    "utf8",
);
const graphStyleSource = await readFile(
    new URL("../../../ui/styles/reuse/dot-graph.css", import.meta.url),
    "utf8",
);

test("Shares page composes sent and received share management", () => {
    assert.match(pageSource, /createPageComposer/);
    assert.match(pageSource, /allowCustomization:\s*false/);
    assert.match(pageSource, /fetchShareOverview/);
    assert.match(pageSource, /revokeShare/);
    assert.match(pageSource, /rejectShare/);
    assert.match(pageSource, /share\.shares\.deleted/);
    assert.match(pageSource, /share\.shares\.rejected/);
    assert.match(pageSource, /pageContext:[\s\S]*title:[\s\S]*subtitle:/);
    assert.match(pageSource, /export async function mount\(root, \{ signal \}/);
    assert.match(pageSource, /buildSharesElement/);
    assert.match(pageSource, /shares-title-link/);
    assert.match(pageSource, /data-share-manage/);
    assert.match(pageSource, /data-account-share-url/);
    assert.match(pageSource, /await navigateAccountShare/);
    assert.match(pageSource, /share\?\.actionUrl \|\| share\?\.shareUrl/);
    assert.match(pageSource, /searchParams\.get\(\s*"open"/);
    assert.match(pageSource, /destructive \? "btn-cancel"/);
    assert.doesNotMatch(pageSource, /shares-icon-button--danger/);
    assert.match(pageSource, /activeFilter = filter\.dataset\.shareFilter/);
    assert.match(pageSource, /visibleShares\.length \+ 2/);
    assert.match(pageSource, /\[collection\]: overview\[collection\]\.filter/);
    assert.match(pageSource, /composer\.refreshElements\(\[element\.id\]\)/);
    assert.match(pageSource, /deleteConfirmationPending/);
    assert.match(pageSource, /publishShareRevoked\(shareId\)/);
    assert.doesNotMatch(pageSource, /button\.closest\("\[data-share-id\]"\)/);
    assert.match(templateSource, /data-share-filter="all"/);
    assert.match(templateSource, /data-share-filter="sent"/);
    assert.match(templateSource, /data-share-filter="received"/);
    assert.match(templateSource, /data-column-created/);
    assert.match(templateSource, /data-column-accessed/);
    assert.match(pageSource, /share\.lastAccessedAt/);
    assert.match(pageSource, /share\.shares\.not_accessed/);
    assert.match(pageSource, /share:openLinksPopup/);
    assert.match(pageSource, /data-share-copy/);
    assert.match(pageSource, /navigator\.clipboard\.writeText/);
    assert.match(pageSource, /renderShareDetails/);
    assert.match(pageSource, /mountDotGraph/);
    assert.match(pageSource, /shares-activity-graph/);
    assert.match(pageSource, /data-share-expandable/);
    assert.match(pageSource, /initialEditingShareId/);
    assert.match(pageSource, /initialEditingShare: share/);
    assert.match(pageSource, /editOnly: true/);
    assert.match(pageSource, /buildShareTokenCallbacks/);
    assert.match(pageSource, /await mountWhenDirect\(mount\)/);
    assert.doesNotMatch(pageSource, /await mount\(document\.querySelector/);
    assert.doesNotMatch(pageSource, /share\.shares\.open/);
});

test("Share activity uses the reusable scalable dot graph", () => {
    assert.match(pageSource, /share\.activityEvents/);
    assert.match(pageSource, /event\.occurredAt/);
    assert.match(graphSource, /maximumCount/);
    assert.match(graphSource, /timeSpan/);
    assert.match(graphSource, /timeSpan <= 2 \* 24 \* 60 \* 60 \* 1000/);
    assert.match(graphSource, /dot-graph-point/);
    assert.match(graphSource, /pointerenter/);
    assert.match(graphSource, /pointerdown/);
    assert.match(graphSource, /pointermove/);
    assert.match(graphSource, /pointerup/);
    assert.match(graphSource, /selectedPoints/);
    assert.match(graphSource, /domainStart/);
    assert.match(graphSource, /domainEnd/);
    assert.match(graphSource, /createSVGPoint/);
    assert.match(graphSource, /getScreenCTM/);
    assert.match(graphSource, /onEmptySelection/);
    assert.match(graphSource, /visibility/);
    assert.match(graphSource, /dot-graph-date-shared/);
    assert.match(pageSource, /includeSeconds:\s*true/);
    assert.match(pageSource, /share\.shares\.graph_empty_selection/);
    assert.match(pageSource, /variant:\s*"warning"/);
    assert.match(graphSource, /formatTimeTimestamp/);
    assert.match(graphSource, /formatDateTimestamp/);
    assert.match(graphStyleSource, /\.dot-graph-tooltip/);
    assert.match(styleSource, /flex-direction:\s*column/);
    assert.match(bootstrapSource, /styles\/reuse\/dot-graph\.css/);
});

test("Shares table filters rerender rows and keeps compact columns and actions", () => {
    assert.match(pageSource, /activeFilter = filter\.dataset\.shareFilter/);
    assert.match(pageSource, /refreshOverview\(\)/);
    assert.match(styleSource, /table-layout:\s*auto/);
    assert.match(
        styleSource,
        /th:first-child,[\s\S]*white-space:\s*nowrap;[\s\S]*width:\s*1%/,
    );
    assert.match(
        styleSource,
        /\.shares-actions button[\s\S]*height:\s*2\.25rem/,
    );
    assert.match(
        styleSource,
        /\.shares-actions button[\s\S]*width:\s*2\.25rem/,
    );
});

test("Share gateway owns its pages and adapter static directories", () => {
    assert.match(
        bootstrapSource,
        /uiHooks\.registerSpaRoute\(\{[\s\S]*id: "shares-page"/,
    );
    assert.match(bootstrapSource, /uiHooks\.registerAdapterStaticDir/);
});

test("Share navbar plugin adds Shares to the user menu", () => {
    assert.match(navbarSource, /#profile-dropdown/);
    assert.match(navbarSource, /link\.href = "\/share"/);
    assert.match(navbarSource, /#profile-logout/);
});
