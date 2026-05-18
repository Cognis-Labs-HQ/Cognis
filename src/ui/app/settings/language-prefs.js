import { apiFetch } from "../../reuse/api-client.js";
import {
    sanitizeLanguagePriority,
    readBrowserLocales,
} from "../../reuse/i18n.js";

async function loadLanguagesCatalog() {
    const response = await apiFetch("/api/v1/system/languages");
    const payload = await response.json();
    return payload.data || [];
}

export function initLanguagePrefs(
    root,
    initialPriority,
    { onDirtyChange } = {},
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
        row.setAttribute("draggable", "true");
        row.setAttribute("data-lang-row", isoCode);

        const tdLabel = document.createElement("td");
        tdLabel.textContent = labelText;

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

    function renderTables() {
        const preferred = root.querySelector("#preferred-languages");
        const available = root.querySelector("#available-languages");
        if (!preferred || !available) return;
        const preferredSet = new Set(languagePriority);

        preferred.replaceChildren(
            ...languagePriority.map((iso) => {
                const match = catalog.find((item) => item.iso_code === iso);
                const label = match ? `${match.name} (${iso})` : iso;
                return makeRow(iso, label);
            }),
        );

        available.replaceChildren(
            ...catalog
                .filter((item) => !preferredSet.has(item.iso_code))
                .map((item) =>
                    makeRow(item.iso_code, `${item.name} (${item.iso_code})`),
                ),
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

    function resolveDropTarget(targetNode, clientY) {
        const targetTable = targetNode?.closest(
            "#available-languages, #preferred-languages",
        );
        const targetRow = targetNode?.closest("tr[data-lang-row]");
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
        if (!row) return;
        const rect = row.getBoundingClientRect();
        const isAfter = event.clientY > rect.top + rect.height / 2;
        row.classList.add(isAfter ? "drop-target-after" : "drop-target-before");
    });

    root.addEventListener("drop", (event) => {
        const { targetTable, targetRow, targetIsAfter } = resolveDropTarget(
            event.target,
            event.clientY,
        );
        clearDropMarkers();
        const lang = dragLanguage || event.dataTransfer?.getData("text/plain");
        applyDrop(lang, targetTable, targetRow, targetIsAfter);
        dragLanguage = null;
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
        getPriority: () => languagePriority,
        isDirty: () =>
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority),
        commit,
        discard,
    };
}
