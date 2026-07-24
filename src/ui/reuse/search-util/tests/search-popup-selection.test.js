import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../../..");

test("search popup checked indicator stays centered in selectable rows", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );
    assert.match(source, /transform: translate\(-50%, -58%\) rotate\(45deg\);/);
});

test("global search modules result points to Administration components", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    assert.match(source, /id: "page-modules"/);
    assert.match(source, /url: "\/administration#components"/);
    assert.match(
        source,
        /ui\.reuse\.administration[\s\S]*ui\.app\.admin\.components[\s\S]*ui\.reuse\.modules/,
    );
    assert.doesNotMatch(source, /url: "\/modules"/);
});

test("global search exposes registered categories and match controls", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/popup.js"),
        "utf8",
    );
    const capabilitySource = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/capability.js"),
        "utf8",
    );
    assert.match(capabilitySource, /export const search = ensureSearchCapability\(\)/);
    assert.match(source, /export function registerSearchAvenue/);
    assert.match(source, /export function registerSearchCategory/);
    assert.match(source, /export function registerSearchIndex/);
    assert.match(source, /registerSearchCategory\("visible-page"/);
    assert.match(source, /stageId: "visible-indexes"/);
    assert.doesNotMatch(source, /registerSearchCategory\("visible-content"/);
    assert.match(source, /import \{ uiCtx \} from "\.\.\/ui-ctx\.js"/);
    assert.match(source, /uiCtx\.runFlow\("search"/);
    assert.match(source, /providerContext/);
    assert.match(capabilitySource, /stageContext\?\.input\?\.query/);
    assert.match(capabilitySource, /avenuesByComponent/);
    assert.match(source, /search\.runStage\(stageContext\)/);
    assert.match(source, /REGISTERED_SEARCH_CATEGORY_HOOKS/);
    assert.match(source, /data-search-exclude/);
    assert.match(source, /collectBrowserPreferenceSearchGroups/);
    assert.match(source, /collectStructuredPreferenceItems/);
    assert.match(source, /shouldIndexBrowserPreferenceKey/);
    assert.match(source, /MIN_SEARCH_QUERY_LENGTH = 2/);
    assert.match(source, /mergeSearchGroups/);
    assert.match(source, /filterNavigableGroups/);
    assert.match(source, /filterVisibleSearchGroups/);
    assert.match(source, /isSearchResultVisibleToUser/);
    assert.match(source, /isInternalSearchUrlAccessible/);
    assert.match(source, /hasSelectableTarget/);
    assert.match(source, /normalizeResultClass/);
    assert.match(source, /dataset\.searchResultClass/);
    assert.match(source, /filterApiFlatMatches/);
    assert.match(source, /renderResultCategorySummary/);
    assert.match(source, /filterGroupsBySelectedCategories/);
    assert.match(source, /normalizeSearchUrlKey/);
    assert.match(source, /SEARCH_CATEGORY_RANKS/);
    assert.match(source, /\["Pages", 0\]/);
    assert.match(source, /\["Docs", 90\]/);
    assert.match(source, /\["Changelogs", 100\]/);
    assert.match(source, /category === "Pages" \? ""/);
    assert.match(source, /currentSearchPageUrl/);
    assert.match(source, /currentSearchPageLabel/);
    assert.match(source, /window\.location\.pathname === "\/whiteboard"/);
    assert.match(source, /__selectedSearchCategories/);
    assert.match(source, /search-popup-result-categories/);
    assert.match(source, /search-popup-close btn-cancel/);
    assert.match(source, /lockSearchPopupScroll/);
    assert.match(source, /unlockSearchPopupScroll/);
    assert.match(source, /search-popup-overlay--closing/);
    assert.match(source, /Close search/);
    assert.match(source, /collectVisibleNavigationSearchGroups/);
    assert.match(source, /collectGlobalDocsSearchGroups/);
    assert.match(source, /collectGlobalSettingsSearchGroups/);
    assert.match(source, /registerSearchAvenue/);
    assert.match(source, /registerSearchIndex\("global-docs"/);
    assert.match(source, /registerSearchIndex\("global-settings"/);
    assert.match(
        source,
        /registerSearchCategory\(\s*["\']visible-navigation["\']/,
    );
    assert.match(source, /const isMultiSelect = Boolean\(multiSelectState\)/);
    assert.match(source, /data-message-id/);
    assert.match(source, /data-chat-id/);
    assert.match(source, /data-search-description/);
    assert.match(source, /data-search-result-class/);
    assert.doesNotMatch(source, /article, \[role='article'\]/);
    assert.match(source, /"Whole word"/);
    assert.match(source, /"Regex"/);
    assert.match(source, /"Case-sensitive"/);
    assert.match(source, /"On this page"/);
    assert.doesNotMatch(source, /category:\s*"Navigation"/);
    assert.match(source, /searchOptions\.onThisPage/);
    assert.match(source, /renderPageFindHighlights/);
    assert.match(source, /search-popup-page-find-counter/);
    assert.match(source, /movePageFindMatch/);
    assert.match(source, /search-popup-overlay--finder/);
    assert.match(source, /wholeWord=1/);
    assert.match(source, /regex=1/);
    assert.match(source, /caseSensitive=1/);
    assert.match(
        source,
        /item\.searchText \? \[\["searchText", item\.searchText\]\]/,
    );
    assert.match(source, /matchSnippet/);
    assert.match(source, /highlightedLabel/);
    assert.match(source, /selectSearchResult/);
    assert.match(source, /item\.handle/);
});

test("search index helpers centralize HTML text and data attributes", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/indexing.js"),
        "utf8",
    );
    assert.match(source, /export function htmlToSearchText/);
    assert.match(source, /export function htmlToSearchEntries/);
    assert.match(source, /export function htmlToSearchSegments/);
    assert.match(source, /export function createUserContentSearchItem/);
    assert.match(source, /export function renderSearchDataAttributes/);
});

test("search popup displays result categories below parameters", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );
    const popupSource = readFileSync(
        resolve(ROOT, "src/ui/styles/popup.css"),
        "utf8",
    );
    assert.match(source, /\.search-popup-result-categories/);
    assert.match(source, /\.search-popup-close/);
    assert.match(source, /\.search-popup-overlay--closing/);
    assert.match(source, /transition: opacity 0\.14s ease/);
    assert.match(source, /\.search-popup-input-wrap \.search-popup-close/);
    assert.doesNotMatch(
        source,
        /\.search-popup-close\s*\{[^}]*position: absolute/,
    );
    assert.match(popupSource, /transition: opacity 0\.14s ease/);
    assert.match(source, /\.search-popup-result-category-pill/);
    assert.match(source, /\.search-popup-result-category-pill--active/);
    assert.match(
        source,
        /\.search-popup-result:hover,\n\.search-popup-result:focus-visible/,
    );
    assert.match(source, /data-theme="dark"\] \.search-popup-result:hover/);
    assert.match(source, /#bbf7d0/);
    assert.match(source, /\.search-popup-overlay--finder/);
    assert.match(source, /\.search-popup-page-find-controls/);
    assert.match(source, /\.search-page-find-highlight--current/);
    assert.match(
        source,
        /scrollbar-color: var\(--scrollbar-thumb\) var\(--scrollbar-track\)/,
    );
    assert.match(source, /::-webkit-scrollbar-thumb/);
});

test("settings search exposes archive action by name and description", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/settings/index.js"),
        "utf8",
    );
    assert.match(
        source,
        /"data-search-category": i18n\.t\("ui\.reuse\.operations"\)/,
    );
    assert.match(source, /renderAccountOperationButton/);
    assert.match(source, /ui\.app\.settings\.danger_archive/);
    assert.match(source, /ui\.app\.settings\.danger_deactivate/);
    assert.match(source, /ui\.app\.settings\.danger_delete/);
    assert.match(source, /data-search-description/);
    assert.match(source, /ui\.app\.settings\.danger_archive_warning/);
    assert.match(source, /registerSearchIndex/);
    assert.match(source, /collectSettingsSearchGroups/);
    assert.match(source, /stageId: "settings-index"/);
    assert.match(source, /formatPreferenceLabel/);
    assert.match(source, /collectPreferenceSearchItems/);
    assert.match(source, /shouldIndexSettingsPreference/);
    assert.match(source, /message_style/);
    assert.match(source, /collectSettingsElementContentSearchItems/);
    assert.match(source, /dedupeSettingsSearchItems/);
    assert.match(source, /entry\.text\.toLowerCase\(\) !== normalizedLabel/);
    assert.match(source, /htmlToSearchEntries/);
    assert.doesNotMatch(source, /searchText: JSON\.stringify\(loadedPrefs/);
});

test("docs search indexes navigation titles and document contents", () => {
    const source = readFileSync(
        resolve(ROOT, "src/ui/app/docs/index.js"),
        "utf8",
    );
    assert.match(source, /registerSearchIndex\(\s*["\']docs["\']/);
    assert.match(source, /createDocsSearchProvider/);
    assert.match(source, /htmlToSearchText/);
    assert.match(source, /resultClass: "page"/);
    assert.match(source, /search-index\.js/);
    assert.match(source, /loadMarkdownDocumentHtml/);
    assert.match(source, /changelogSlugToRoutePath/);
    assert.match(source, /ui\.layout\.footer\.changelogs/);
    assert.match(source, /changelogItems/);
});

test("whiteboard search indexes board filenames and stored canvas contents", () => {
    const source = readFileSync(
        resolve(ROOT, "src/modules/nextcloud-whiteboard/ui/app/index.js"),
        "utf8",
    );
    const navbarSource = readFileSync(
        resolve(ROOT, "src/modules/nextcloud-whiteboard/ui/navbar.js"),
        "utf8",
    );
    assert.match(source, /registerSearchIndex\("nextcloud-whiteboard"/);
    assert.match(source, /collectWhiteboardSearchGroups/);
    assert.match(source, /externalPath/);
    assert.match(source, /resultClass: "page"/);
    assert.match(source, /resultClass: "text"/);
    assert.match(source, /showDescription: false/);
    assert.match(source, /showMatchSnippet: false/);
    assert.match(source, /JSON\.stringify\(savedElements/);
    assert.match(
        navbarSource,
        /registerSearchIndex\(\s*"nextcloud-whiteboard-navbar"/,
    );
    assert.match(navbarSource, /collectWhiteboardNavbarSearchGroups/);
    assert.match(navbarSource, /category: "Pages"/);
    assert.match(navbarSource, /category: "Whiteboards"/);
    assert.match(navbarSource, /showDescription: false/);
    assert.match(navbarSource, /showMatchSnippet: false/);
    assert.match(navbarSource, /fetchVisibleWhiteboards/);
});

test("visible search indexes messages without quick reactions and chat names", () => {
    const messageSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/message-render.js"),
        "utf8",
    );
    const roomSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/room-render.js"),
        "utf8",
    );
    assert.match(messageSource, /data-search-text/);
    assert.match(
        messageSource,
        /data-search-exclude="true">\$\{reactionRows\.pickerRow\}/,
    );
    assert.match(
        messageSource,
        /data-search-exclude="true">\$\{reactionRows\.activeRow\}/,
    );
    assert.match(roomSource, /data-chat-id/);
    assert.match(
        roomSource,
        /data-search-label="\$\{escapeHtml\(titleSource\)\}"/,
    );
});

test("visible search indexes meetings calendar notifications and posts", () => {
    const meetingSource = readFileSync(
        resolve(ROOT, "src/modules/jitsi-meet/ui/jitsi-meetings.js"),
        "utf8",
    );
    const calendarSource = readFileSync(
        resolve(ROOT, "src/gateways/calendar/ui/calendar-ui-helpers.js"),
        "utf8",
    );
    const notificationSource = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    const profileSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/profile-render.js"),
        "utf8",
    );
    const profileNavbarSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/navbar.js"),
        "utf8",
    );
    const profileSearchSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/search/index.js"),
        "utf8",
    );
    assert.match(meetingSource, /dataset\.searchCategory = "Meetings"/);
    assert.match(
        readFileSync(resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"), "utf8"),
        /registerSearchIndex\("jitsi-meetings"/,
    );
    assert.match(
        readFileSync(resolve(ROOT, "src/modules/jitsi-meet/ui/app.js"), "utf8"),
        /resultClass: "page"/,
    );
    const calendarNavbarSource = readFileSync(
        resolve(ROOT, "src/gateways/calendar/ui/navbar.js"),
        "utf8",
    );
    assert.match(calendarSource, /data-search-category="Calendar Events"/);
    assert.match(calendarSource, /data-search-description/);
    assert.match(
        calendarNavbarSource,
        /registerSearchIndex\("calendar-events"/,
    );
    assert.match(calendarNavbarSource, /fetchCalendarState/);
    assert.match(calendarNavbarSource, /fetchEvents/);
    assert.match(
        readFileSync(
            resolve(ROOT, "src/gateways/calendar/ui/app/index.js"),
            "utf8",
        ),
        /resultClass: "event"/,
    );
    assert.match(
        readFileSync(
            resolve(ROOT, "src/gateways/calendar/ui/app/index.js"),
            "utf8",
        ),
        /formatDateTime[\s\S]*registerSearchIndex\(\s*["\']calendar-events["\']/,
    );
    assert.match(
        notificationSource,
        /dataset\.searchCategory = "Notifications"/,
    );
    assert.match(notificationSource, /registerSearchIndex\("notifications"/);
    assert.match(
        notificationSource,
        /function collectNotificationSearchGroups/,
    );
    assert.match(profileSource, /data-search-category="Posts"/);
    assert.match(profileNavbarSource, /registerSearchIndexing\(\)/);
    assert.match(profileSearchSource, /registerSearchIndex\("global-posts"/);
    assert.match(profileSearchSource, /\/api\/v1\/social\/posts\?scope=visible/);
    assert.match(profileSearchSource, /createUserContentSearchItem/);
});

test("study content and sub-navigation participate in global search", () => {
    const studySource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    const subNavigationSource = readFileSync(
        resolve(
            ROOT,
            "src/modules/study/languages/reuse/study-sub-navigation.js",
        ),
        "utf8",
    );
    const studyNavbarSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/navbar.js"),
        "utf8",
    );
    const studySearchSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/search/index.js"),
        "utf8",
    );
    assert.match(studySource, /registerSearchIndex\("study-contents"/);
    assert.match(studySource, /collectStudySearchGroups/);
    assert.match(studySource, /resultClass: "page"/);
    assert.match(studySource, /resultClass: "setting"/);
    assert.match(studySource, /data-search-category/);
    assert.match(subNavigationSource, /data-search-category/);
    assert.match(subNavigationSource, /data-search-description/);
    assert.match(studyNavbarSource, /registerSearchIndexing\(\)/);
    assert.match(studySearchSource, /export const componentSearchId = "study"/);
    assert.match(studySearchSource, /registeredLanguages/);
    assert.match(studySearchSource, /registerSearchIndex\("study"/);
    assert.match(studySearchSource, /componentId: componentSearchId/);
});

test("settings search skips paragraph text entries and search results highlight targets", () => {
    const settingsSource = readFileSync(
        resolve(ROOT, "src/ui/app/settings/index.js"),
        "utf8",
    );
    const searchIndexSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/indexing.js"),
        "utf8",
    );
    const dashboardSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const styleSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );

    assert.match(
        settingsSource,
        /\["heading", "field", "operation"\]\.includes/,
    );
    assert.doesNotMatch(
        settingsSource,
        /\["heading", "field", "operation", "text"\]/,
    );
    assert.match(searchIndexSource, /export function highlightSearchTarget/);
    assert.match(
        searchIndexSource,
        /scrollIntoView\(\{ block: "center", behavior: "smooth" \}\)/,
    );
    assert.match(dashboardSource, /highlightSearchTarget\(result\)/);
    assert.match(styleSource, /\.search-target-highlight/);
});

test("global search intercepts browser find shortcut", () => {
    const searchSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/popup.js"),
        "utf8",
    );
    assert.match(searchSource, /function bindSearchShortcut/);
    assert.match(searchSource, /event\.preventDefault\(\)/);
    assert.match(
        searchSource,
        /String\(event\.key \?\? ""\)\.toLowerCase\(\) !== "f"/,
    );
    assert.match(searchSource, /focusOpenSearchInput\(\)/);
    assert.match(searchSource, /activeSearchToggleButton\?\.click\(\)/);
});

test("profile messages notifications and study indexes are privacy scoped", () => {
    const profileSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/app.js"),
        "utf8",
    );
    const profileRenderSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/ui/profile-render.js"),
        "utf8",
    );
    const messagesSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/message-render.js"),
        "utf8",
    );
    const notificationsSource = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    const searchSource = readFileSync(
        resolve(ROOT, "src/ui/reuse/search-util/popup.js"),
        "utf8",
    );
    const studySearchSource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/search/index.js"),
        "utf8",
    );
    const postRoutesSource = readFileSync(
        resolve(ROOT, "src/adapters/social/profile/routes/posts.ts"),
        "utf8",
    );

    assert.match(postRoutesSource, /url\.searchParams\.get\("scope"\)/);
    assert.match(postRoutesSource, /profileStore\.getAllPosts\(\)/);
    assert.match(postRoutesSource, /canViewPost/);
    assert.match(profileSource, /registerSearchIndex\("profile-posts"/);
    assert.match(profileSource, /collectProfilePostSearchGroups/);
    assert.match(
        profileRenderSource,
        /id="post-\$\{escapeHtml\(encodeURIComponent\(post\.id\)\)\}"/,
    );
    assert.match(messagesSource, /registerSearchIndex\("messages"/);
    assert.match(messagesSource, /collectMessageSearchGroups/);
    assert.match(messagesSource, /collectRoomMessageSearchItems/);
    assert.match(
        messagesSource,
        /id="message-\$\{escapeHtml\(encodeURIComponent\(messageRecord\.id\)\)\}"/,
    );
    assert.match(
        notificationsSource,
        /formatRelativeTime\(notification\.createdAt\)/,
    );
    assert.match(notificationsSource, /resultClass: "notification"/);
    assert.match(searchSource, /\.study-subnav a\[href\]/);
    assert.match(searchSource, /category: "Pages"/);
    assert.match(studySearchSource, /registeredLanguages/);
    assert.match(studySearchSource, /id: "study-page"/);
});

test("docs changelogs and study subpages are indexed as pages", () => {
    const docsSource = readFileSync(
        resolve(ROOT, "src/ui/app/docs/index.js"),
        "utf8",
    );
    const studySource = readFileSync(
        resolve(ROOT, "src/gateways/study/ui/study.js"),
        "utf8",
    );
    const styleSource = readFileSync(
        resolve(ROOT, "src/ui/styles/reuse/search-bar.css"),
        "utf8",
    );

    assert.match(docsSource, /category: i18n\.t\("ui\.reuse\.docs"\)/);
    assert.match(docsSource, /ui\.layout\.footer\.changelogs/);
    assert.match(studySource, /category: "Pages"/);
    assert.match(
        studySource,
        /languageName,[\s\S]*label,[\s\S]*\]\.join\(" \/ "\)/,
    );
    assert.match(styleSource, /#86efac/);
    assert.match(
        styleSource,
        /data-theme="dark"\] \.search-page-find-highlight/,
    );
});

test("global pages and messages indexes register from shared surfaces", () => {
    const layoutSource = readFileSync(
        resolve(ROOT, "src/ui/layouts/dashboard-layout.js"),
        "utf8",
    );
    const messagesNavbarSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/navbar.js"),
        "utf8",
    );

    assert.match(layoutSource, /category: "Pages"/);
    assert.match(layoutSource, /id: "page-profile"/);
    assert.doesNotMatch(
        layoutSource,
        /category: i18n\.t\("ui\.reuse\.navigation"\)/,
    );
    const messagesIndexSource = readFileSync(
        resolve(ROOT, "src/adapters/social/messages/ui/search/index.js"),
        "utf8",
    );

    assert.match(messagesNavbarSource, /registerSearchIndexing\(\)/);
    assert.match(messagesIndexSource, /export const componentSearchId/);
    assert.match(
        messagesIndexSource,
        /export async function buildSearchResults/,
    );
    assert.match(messagesIndexSource, /export function registerSearchIndexing/);
    assert.match(messagesIndexSource, /registerSearchIndex\("global-messages"/);
    assert.match(messagesIndexSource, /componentId: componentSearchId/);
    assert.doesNotMatch(messagesIndexSource, /createUserContentSearchItem/);
    assert.match(messagesIndexSource, /\/api\/v1\/social\/messages\/rooms/);
    assert.match(messagesIndexSource, /decryptSearchMessage/);
    assert.match(messagesIndexSource, /messageSearchContext/);
    assert.match(messagesIndexSource, /isOpaqueRoomLabel/);
    assert.match(messagesIndexSource, /MESSAGE_SEARCH_PAGE_SIZE/);
    assert.match(messagesIndexSource, /params\.set\("before", before\)/);
    assert.match(
        messagesIndexSource,
        /searchText: \[sender, context, messageRecord\.text\]/,
    );
    assert.doesNotMatch(messagesIndexSource, /createUserContentSearchItem/);
    assert.doesNotMatch(
        messagesIndexSource,
        /content: \[messageRecord\.text, query\]/,
    );
    assert.match(messagesIndexSource, /error\?\.name !== "OperationError"/);
});
