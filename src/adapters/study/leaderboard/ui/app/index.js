import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    fetchLeaderboardDefinitions,
    fetchLeaderboardStandings,
} from "../client.js";
import {
    bindStudySubNavigation,
    loadStudySubNavigationModel,
    readSelectedStudyLanguageCode,
    renderStudySubNavigation,
} from "/static/gateways/study/ui/sub-navigation.js";

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: [
            "/static/gateways/study/languages",
            "/static/adapters/study/leaderboard/languages",
        ],
    });
    applyDocumentTitle(i18n, "gateway.study.leaderboard_label");
    const model = await loadStudySubNavigationModel({
        fallbackLanguageCode: readSelectedStudyLanguageCode(),
    });
    const definitions = await fetchLeaderboardDefinitions().catch(() => []);
    const selectedDefinition = definitions[0];
    const table = selectedDefinition
        ? await fetchLeaderboardStandings(selectedDefinition.id).catch(
              () => null,
          )
        : null;
    const renderLeaderboard = () => {
        if (!table?.rows?.length) {
            return `<section class="study-leaderboard-empty"><h2>${escapeHtml(i18n.t("gateway.study.leaderboard_heading"))}</h2><p>${escapeHtml(i18n.t("gateway.study.leaderboard_empty"))}</p></section>`;
        }
        const headings = table.columns
            .map((column) => `<th scope="col">${escapeHtml(column.label)}</th>`)
            .join("");
        const rows = table.rows
            .map((row) => {
                const movement = row.movement ?? 0;
                const movementClass =
                    movement > 0
                        ? " leaderboard-movement--up"
                        : movement < 0
                          ? " leaderboard-movement--down"
                          : "";
                const values = table.columns
                    .map((column) => {
                        const value =
                            column.id === "rank"
                                ? row.rankLabel
                                : column.id === "participant"
                                  ? row.participant.alias
                                  : (row.criteria[column.id] ?? row.score);
                        return `<td>${escapeHtml(String(value))}</td>`;
                    })
                    .join("");
                return `<tr class="leaderboard-row${row.participant.isViewer ? " leaderboard-row--viewer" : ""}${movementClass}" aria-label="${escapeHtml(row.screenReaderLabel)}" data-rank="${row.rank}">${values}</tr>`;
            })
            .join("");
        return `<section class="study-leaderboard"><h2>${escapeHtml(selectedDefinition.id)}</h2><div class="leaderboard-table-scroll"><table><caption>${escapeHtml(table.caption)}</caption><thead><tr>${headings}</tr></thead><tbody>${rows}</tbody></table></div></section>`;
    };
    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: "study-leaderboard",
                label: i18n.t("gateway.study.leaderboard_label"),
                pinned: true,
                width: "fill",
                render: renderLeaderboard,
            },
        ],
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.leaderboard_label"),
            subtitle: i18n.t("gateway.study.leaderboard_subtitle"),
        },
        preferenceKey: "study-leaderboard-layout",
        subNavigation: [
            {
                id: "study-subnav",
                label: i18n.t("gateway.study.page_title"),
                render: () =>
                    renderStudySubNavigation({
                        model,
                        currentPath: window.location.pathname,
                        i18n,
                    }),
            },
        ],
        toolbar: [],
    });
    await composer.init();
    signal?.throwIfAborted();
    bindStudySubNavigation(root, { signal });
}

await mountWhenDirect(mount);
