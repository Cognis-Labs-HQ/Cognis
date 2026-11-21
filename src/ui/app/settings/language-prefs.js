import { bindListDropzones } from "./dropzones.js";
import { isOffline } from "../../reuse/offline-state.js";
import { loadUiLanguageCatalog } from "../../reuse/ui-language-catalog.js";
import {
    sanitizeLanguagePriority,
    readBrowserLocales,
} from "../../reuse/i18n.js";

export function initLanguagePrefs(
    root,
    initialPriority,
    { onDirtyChange, signal } = {},
) {
    let languagePriority = [...initialPriority];
    let savedPriority = [...initialPriority];
    let catalog = [];
    let pendingMode = null;
    const log = console.info.bind(console);

    function getSupportedLanguageCodes() {
        return catalog.map((item) => item.iso_code);
    }

    function notifyDirty() {
        const dirty =
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority);
        onDirtyChange?.(dirty);
    }

    function makeRow(isoCode, labelText) {
        const row = document.createElement("tr");
        row.setAttribute(
            "draggable",
            String(!isOffline() || languagePriority.includes(isoCode)),
        );
        row.setAttribute("data-lang-row", isoCode);

        const tdLabel = document.createElement("td");
        tdLabel.textContent = labelText;

        const tdHandle = document.createElement("td");
        tdHandle.className = "drag-handle";
        tdHandle.textContent = "⬍";

        row.append(tdLabel, tdHandle);

        return row;
    }

    function makeEmptyDropZoneRow() {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        row.setAttribute("data-drop-placeholder", "");
        emptyCell.setAttribute("colspan", "2");
        emptyCell.className = "language-table-empty-cell";
        emptyCell.textContent = "\u00A0";
        row.append(emptyCell);
        return row;
    }

    function renderTables() {
        dropzones.cancel();
        if (signal?.aborted) return;
        const preferred = root.querySelector("#preferred-languages");
        const available = root.querySelector("#available-languages");
        if (!preferred || !available) return;
        available.setAttribute("aria-disabled", String(isOffline()));
        const preferredSet = new Set(languagePriority);

        preferred.replaceChildren(
            ...languagePriority.map((iso) => {
                const match = catalog.find((item) => item.iso_code === iso);
                const label = match ? `${match.name} (${iso})` : iso;
                return makeRow(iso, label);
            }),
        );

        const availableRows = catalog
            .filter((item) => !preferredSet.has(item.iso_code))
            .map((item) =>
                makeRow(item.iso_code, `${item.name} (${item.iso_code})`),
            );
        available.replaceChildren(
            ...(availableRows.length
                ? availableRows
                : [makeEmptyDropZoneRow()]),
        );
    }

    function applyDrop(lang, targetTable, targetRow, targetIsAfter) {
        if (
            !getSupportedLanguageCodes().includes(lang) ||
            !targetTable ||
            (isOffline() &&
                (targetTable?.id !== "preferred-languages" ||
                    !languagePriority.includes(lang)))
        )
            return;

        const previousPriority = JSON.stringify(languagePriority);
        if (targetTable?.id === "preferred-languages") {
            languagePriority = languagePriority.filter((item) => item !== lang);
            if (targetRow) {
                const targetIso = targetRow.getAttribute("data-lang-row");
                const index = languagePriority.indexOf(targetIso);
                if (index >= 0)
                    languagePriority.splice(
                        targetIsAfter ? index + 1 : index,
                        0,
                        lang,
                    );
                else languagePriority.push(lang);
            } else {
                languagePriority.push(lang);
            }
        }

        if (targetTable?.id === "available-languages") {
            if (lang !== "en")
                languagePriority = languagePriority.filter(
                    (item) => item !== lang,
                );
        }

        languagePriority = sanitizeLanguagePriority(
            languagePriority,
            getSupportedLanguageCodes(),
        );
        if (JSON.stringify(languagePriority) === previousPriority) return;
        pendingMode = "manual";
        log("language_draft_changed", {
            component: "ui.settings",
            operation: "moveLanguage",
            count: languagePriority.length,
        });
        renderTables();
        notifyDirty();
    }

    const dropzones = bindListDropzones({
        root,
        zoneSelector: "#available-languages, #preferred-languages",
        rowSelector: "tr[data-lang-row]",
        handleSelector: ".drag-handle",
        draggingClass: "language-row-dragging",
        signal,
        canDrag: (row) =>
            !isOffline() || languagePriority.includes(row.dataset.langRow),
        canDrop: (row, table) =>
            !isOffline() || table.id === "preferred-languages",
        onDrop: ({ source, zone, row, after }) =>
            applyDrop(source.dataset.langRow, zone, row, after),
    });

    function commit() {
        savedPriority = [...languagePriority];
        pendingMode = null;
    }

    function discard() {
        languagePriority = [...savedPriority];
        pendingMode = null;
        renderTables();
        notifyDirty();
    }

    async function init() {
        catalog = await loadUiLanguageCatalog().catch(() => {
            const names = new Intl.DisplayNames(
                [document.documentElement.lang || "en"],
                { type: "language", fallback: "none" },
            );
            return [...new Set([...initialPriority, "en"])].map((iso_code) => {
                const name = names.of(iso_code);
                if (!name) throw new Error("language_label_unavailable");
                return { iso_code, name };
            });
        });
        if (signal?.aborted) return;
        languagePriority = sanitizeLanguagePriority(
            languagePriority,
            getSupportedLanguageCodes(),
        );
        savedPriority = sanitizeLanguagePriority(
            savedPriority,
            getSupportedLanguageCodes(),
        );
        renderTables();
    }

    window.addEventListener("cognis:connectivity-changed", renderTables, {
        signal,
    });
    return {
        init,
        renderTables,
        syncFromBrowser() {
            if (isOffline()) return;
            languagePriority = sanitizeLanguagePriority(
                readBrowserLocales(),
                getSupportedLanguageCodes(),
            );
            renderTables();
            notifyDirty();
            pendingMode = "auto";
        },
        getPendingMode: () => pendingMode,
        getPriority: () => languagePriority,
        isDirty: () =>
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority),
        commit,
        discard,
    };
}
