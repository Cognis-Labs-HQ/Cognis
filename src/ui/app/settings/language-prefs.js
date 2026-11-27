import { isOffline } from "../../reuse/offline-state.js";
import { loadUiLanguageCatalog } from "../../reuse/ui-language-catalog.js";
import {
    sanitizeLanguagePriority,
    readBrowserLocales,
} from "../../reuse/i18n.js";

function initLanguagePreferences(
    root,
    initialPriority,
    { onDirtyChange, signal } = {},
) {
    let languagePriority = [...initialPriority];
    let savedPriority = [...initialPriority];
    let catalog = [];
    let pendingMode = null;

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

        tdHandle.addEventListener("pointerdown", (event) => {
            if (
                event.pointerType === "mouse" ||
                (isOffline() && !languagePriority.includes(isoCode))
            )
                return;
            event.preventDefault();
            tdHandle.setPointerCapture(event.pointerId);
            row.classList.add("language-row-dragging");
            dragLanguage = isoCode;

            function onMove(entry) {
                entry.preventDefault();
                clearDropMarkers();
                const { row: targetRow, rect: rectangle } = findRowAt(
                    row,
                    entry.clientY,
                );
                if (!targetRow) return;
                targetRow.classList.add(
                    entry.clientY > rectangle.top + rectangle.height / 2
                        ? "drop-target-after"
                        : "drop-target-before",
                );
            }

            function onEnd(entry) {
                tdHandle.removeEventListener("pointermove", onMove);
                tdHandle.removeEventListener("pointerup", onEnd);
                tdHandle.removeEventListener("pointercancel", onEnd);
                row.classList.remove("language-row-dragging");
                const { row: targetRow, rect: rectangle } = findRowAt(
                    row,
                    entry.clientY,
                );
                const targetTable = findTableAt(entry.clientX, entry.clientY);
                const targetIsAfter = Boolean(
                    targetRow &&
                    entry.clientY > rectangle.top + rectangle.height / 2,
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

    function clearDropMarkers() {
        root.querySelectorAll(
            ".drop-target-before, .drop-target-after",
        ).forEach((row) => {
            row.classList.remove("drop-target-before", "drop-target-after");
        });
    }

    function findRowAt(excludeRow, clientY) {
        for (const row of root.querySelectorAll("tr[data-lang-row]")) {
            if (
                row === excludeRow ||
                (isOffline() && !row.closest("#preferred-languages"))
            )
                continue;
            const rectangle = row.getBoundingClientRect();
            if (clientY >= rectangle.top && clientY <= rectangle.bottom)
                return { row, rect: rectangle };
        }
        return { row: null, rect: null };
    }

    function findTableAt(clientX, clientY) {
        for (const table of root.querySelectorAll(
            "#available-languages, #preferred-languages",
        )) {
            if (isOffline() && table.id !== "preferred-languages") continue;
            const rectangle = table.getBoundingClientRect();
            if (
                clientX >= rectangle.left &&
                clientX <= rectangle.right &&
                clientY >= rectangle.top &&
                clientY <= rectangle.bottom
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

    function applyDrop(language, targetTable, targetRow, targetIsAfter) {
        if (
            !language ||
            (isOffline() &&
                (targetTable?.id !== "preferred-languages" ||
                    !languagePriority.includes(language)))
        )
            return;

        if (targetTable?.id === "preferred-languages") {
            languagePriority = languagePriority.filter(
                (item) => item !== language,
            );
            if (targetRow) {
                const targetIso = targetRow.getAttribute("data-lang-row");
                const index = languagePriority.indexOf(targetIso);
                if (index >= 0)
                    languagePriority.splice(
                        targetIsAfter ? index + 1 : index,
                        0,
                        language,
                    );
                else languagePriority.push(language);
            } else {
                languagePriority.push(language);
            }
        }

        if (targetTable?.id === "available-languages") {
            if (language !== "en")
                languagePriority = languagePriority.filter(
                    (item) => item !== language,
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

    root.addEventListener(
        "dragstart",
        (event) => {
            const row = event.target.closest("tr[data-lang-row]");
            if (!row) return;
            if (isOffline() && !row.closest("#preferred-languages")) {
                event.preventDefault();
                return;
            }
            dragLanguage = row.getAttribute("data-lang-row");
            event.dataTransfer?.setData("text/plain", dragLanguage || "");
        },
        { signal },
    );

    root.addEventListener(
        "dragend",
        () => {
            clearDropMarkers();
            dragLanguage = null;
        },
        { signal },
    );

    root.addEventListener(
        "dragover",
        (event) => {
            const zone = event.target.closest(
                "#available-languages, #preferred-languages, tr[data-lang-row]",
            );
            if (!zone || (isOffline() && !zone.closest("#preferred-languages")))
                return;
            event.preventDefault();
            clearDropMarkers();

            const row = zone.closest("tr[data-lang-row]");
            if (row) {
                const rectangle = row.getBoundingClientRect();
                const isAfter =
                    event.clientY > rectangle.top + rectangle.height / 2;
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
        },
        { signal },
    );

    root.addEventListener(
        "drop",
        (event) => {
            event.preventDefault();
            const { targetTable, targetRow, targetIsAfter } = resolveDropTarget(
                event.target,
                event.clientX,
                event.clientY,
            );
            clearDropMarkers();
            const language =
                dragLanguage || event.dataTransfer?.getData("text/plain");
            applyDrop(language, targetTable, targetRow, targetIsAfter);
            dragLanguage = null;
        },
        { signal },
    );

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

    async function initialize() {
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
        init: initialize,
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
export { initLanguagePreferences as initLanguagePrefs };
