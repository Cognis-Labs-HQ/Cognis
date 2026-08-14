import { apiFetch } from "../../reuse/api-client.js";
import {
    sanitizeLanguagePriority,
    readBrowserLocales,
} from "../../reuse/i18n.js";
import { createLanguageFlag } from "../../reuse/language-flag.js";

async function loadLanguagesCatalog() {
    const response = await apiFetch("/api/v1/system/languages");
    const payload = await response.json();
    return payload.data || [];
}

export function initLanguagePrefs(
    root,
    initialPriority,
    { initialSwitcherShow = true, onDirtyChange } = {},
) {
    let languagePriority = [...initialPriority];
    let savedPriority = [...initialPriority];
    let catalog = [];
    let pendingMode = null;
    let switcherShow = initialSwitcherShow;
    let savedSwitcherShow = initialSwitcherShow;

    function getSupportedLanguageCodes() {
        return catalog.map((item) => item.iso_code);
    }

    function notifyDirty() {
        const dirty =
            JSON.stringify(languagePriority) !==
                JSON.stringify(savedPriority) ||
            switcherShow !== savedSwitcherShow;
        onDirtyChange?.(dirty);
    }

    function makeRow(isoCode, labelText, flagUrl) {
        const row = document.createElement("tr");
        row.setAttribute("draggable", "true");
        row.setAttribute("data-lang-row", isoCode);

        const tdLabel = document.createElement("td");
        tdLabel.className = "language-label";
        tdLabel.append(
            createLanguageFlag(isoCode, { sourceUrl: flagUrl }),
            document.createTextNode(labelText),
        );

        const tdHandle = document.createElement("td");
        tdHandle.className = "drag-handle";
        tdHandle.textContent = "⬍";

        row.append(tdLabel, tdHandle);

        tdHandle.addEventListener("pointerdown", (e) => {
            if (e.pointerType === "mouse") return;
            e.preventDefault();
            tdHandle.setPointerCapture(e.pointerId);
            row.classList.add("language-row-dragging");
            dragLanguage = isoCode;

            function onMove(ev) {
                ev.preventDefault();
                clearDropMarkers();
                const { row: targetRow, rect } = findRowAt(row, ev.clientY);
                if (!targetRow) return;
                targetRow.classList.add(
                    ev.clientY > rect.top + rect.height / 2
                        ? "drop-target-after"
                        : "drop-target-before",
                );
            }

            function onEnd(ev) {
                tdHandle.removeEventListener("pointermove", onMove);
                tdHandle.removeEventListener("pointerup", onEnd);
                tdHandle.removeEventListener("pointercancel", onEnd);
                row.classList.remove("language-row-dragging");
                const { row: targetRow, rect } = findRowAt(row, ev.clientY);
                const targetTable = findTableAt(ev.clientX, ev.clientY);
                const targetIsAfter = Boolean(
                    targetRow && ev.clientY > rect.top + rect.height / 2,
                );
                clearDropMarkers();
                applyDrop(isoCode, targetTable, targetRow, targetIsAfter);
                dragLanguage = null;
            }

            tdHandle.addEventListener("pointermove", onMove);
            tdHandle.addEventListener("pointerup", onEnd);
            tdHandle.addEventListener("pointercancel", onEnd);
        });

        return row;
    }

    function makeEmptyDropZoneRow() {
        const row = document.createElement("tr");
        const emptyCell = document.createElement("td");
        emptyCell.setAttribute("colspan", "2");
        emptyCell.className = "language-table-empty-cell";
        emptyCell.textContent = "\u00A0";
        row.append(emptyCell);
        return row;
    }

    function renderTables() {
        const preferred = root.querySelector("#preferred-languages");
        const available = root.querySelector("#available-languages");
        if (!preferred || !available) return;
        const preferredSet = new Set(languagePriority);

        preferred.replaceChildren(
            ...languagePriority.map((iso) => {
                const match = catalog.find((item) => item.iso_code === iso);
                const label = match ? `${match.name} (${iso})` : iso;
                return makeRow(iso, label, match?.flag);
            }),
        );

        const availableRows = catalog
            .filter((item) => !preferredSet.has(item.iso_code))
            .map((item) =>
                makeRow(
                    item.iso_code,
                    `${item.name} (${item.iso_code})`,
                    item.flag,
                ),
            );
        available.replaceChildren(
            ...(availableRows.length
                ? availableRows
                : [makeEmptyDropZoneRow()]),
        );
    }

    function clearDropMarkers() {
        root.querySelectorAll(
            ".drop-target-before, .drop-target-after",
        ).forEach((row) => {
            row.classList.remove("drop-target-before", "drop-target-after");
        });
    }

    function findRowAt(excludeRow, clientY) {
        for (const row of root.querySelectorAll("tr[data-lang-row]")) {
            if (row === excludeRow) continue;
            const rect = row.getBoundingClientRect();
            if (clientY >= rect.top && clientY <= rect.bottom)
                return { row, rect };
        }
        return { row: null, rect: null };
    }

    function findTableAt(clientX, clientY) {
        for (const table of root.querySelectorAll(
            "#available-languages, #preferred-languages",
        )) {
            const rect = table.getBoundingClientRect();
            if (
                clientX >= rect.left &&
                clientX <= rect.right &&
                clientY >= rect.top &&
                clientY <= rect.bottom
            )
                return table;
        }
        return null;
    }

    function resolveDropTarget(targetNode, clientX, clientY) {
        const closestElement = targetNode?.closest
            ? targetNode
            : targetNode?.parentElement;
        const targetTable =
            closestElement?.closest(
                "#available-languages, #preferred-languages",
            ) ?? findTableAt(clientX, clientY);
        const targetRow = closestElement?.closest("tr[data-lang-row]");
        const targetIsAfter = Boolean(
            targetRow &&
            clientY >
                targetRow.getBoundingClientRect().top +
                    targetRow.getBoundingClientRect().height / 2,
        );
        return { targetTable, targetRow, targetIsAfter };
    }

    function applyDrop(lang, targetTable, targetRow, targetIsAfter) {
        if (!lang) return;

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
        renderTables();
        notifyDirty();
        pendingMode = "manual";
    }

    let dragLanguage = null;

    root.addEventListener("dragstart", (event) => {
        const row = event.target.closest("tr[data-lang-row]");
        if (!row) return;
        dragLanguage = row.getAttribute("data-lang-row");
        event.dataTransfer?.setData("text/plain", dragLanguage || "");
    });

    root.addEventListener("dragend", () => {
        clearDropMarkers();
        dragLanguage = null;
    });

    root.addEventListener("dragover", (event) => {
        const zone = event.target.closest(
            "#available-languages, #preferred-languages, tr[data-lang-row]",
        );
        if (!zone) return;
        event.preventDefault();
        clearDropMarkers();

        const row = zone.closest("tr[data-lang-row]");
        if (row) {
            const rect = row.getBoundingClientRect();
            const isAfter = event.clientY > rect.top + rect.height / 2;
            row.classList.add(
                isAfter ? "drop-target-after" : "drop-target-before",
            );
        } else {
            const placeholderRow = zone.querySelector(
                "tr:not([data-lang-row])",
            );
            if (placeholderRow) {
                placeholderRow.classList.add("drop-target-before");
            }
        }
    });

    root.addEventListener("drop", (event) => {
        event.preventDefault();
        const { targetTable, targetRow, targetIsAfter } = resolveDropTarget(
            event.target,
            event.clientX,
            event.clientY,
        );
        clearDropMarkers();
        const lang = dragLanguage || event.dataTransfer?.getData("text/plain");
        applyDrop(lang, targetTable, targetRow, targetIsAfter);
        dragLanguage = null;
    });

    function commit() {
        savedPriority = [...languagePriority];
        savedSwitcherShow = switcherShow;
        pendingMode = null;
    }

    function discard() {
        languagePriority = [...savedPriority];
        switcherShow = savedSwitcherShow;
        const switcherInput = root.querySelector(
            "#pref-language-switcher-show",
        );
        if (switcherInput) switcherInput.checked = switcherShow;
        pendingMode = null;
        renderTables();
        notifyDirty();
    }

    async function init() {
        catalog = await loadLanguagesCatalog().catch(() => [
            { iso_code: "en", name: "English" },
        ]);
        languagePriority = sanitizeLanguagePriority(
            languagePriority,
            getSupportedLanguageCodes(),
        );
        savedPriority = sanitizeLanguagePriority(
            savedPriority,
            getSupportedLanguageCodes(),
        );
        renderTables();
        const switcherInput = root.querySelector(
            "#pref-language-switcher-show",
        );
        if (switcherInput) {
            switcherInput.checked = switcherShow;
            switcherInput.addEventListener("change", () => {
                switcherShow = switcherInput.checked;
                notifyDirty();
            });
        }
    }

    return {
        init,
        renderTables,
        syncFromBrowser() {
            languagePriority = sanitizeLanguagePriority(
                readBrowserLocales(),
                getSupportedLanguageCodes(),
            );
            renderTables();
            notifyDirty();
            pendingMode = "auto";
        },
        getPendingMode: () => pendingMode,
        isPriorityDirty: () =>
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority),
        getPriority: () => languagePriority,
        getSwitcherShow: () => switcherShow,
        isDirty: () =>
            JSON.stringify(languagePriority) !==
                JSON.stringify(savedPriority) ||
            switcherShow !== savedSwitcherShow,
        commit,
        discard,
    };
}
