import { apiFetch } from "../../reuse/api-client.js";

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
    const savedPriority = [...initialPriority];
    let catalog = [];

    function notifyDirty() {
        const dirty =
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority);
        onDirtyChange?.(dirty);
    }

    function makeRow(isoCode, labelText) {
        const tr = document.createElement("tr");
        tr.setAttribute("draggable", "true");
        tr.setAttribute("data-lang-row", isoCode);

        const tdLabel = document.createElement("td");
        tdLabel.textContent = labelText;

        const tdHandle = document.createElement("td");
        tdHandle.className = "drag-handle";
        tdHandle.textContent = "⬍";

        tr.append(tdLabel, tdHandle);
        return tr;
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

        languagePriority = [...new Set(languagePriority)];
        if (!languagePriority.includes("en")) languagePriority.push("en");
        renderTables();
        notifyDirty();
    }

    let dragLanguage = null;
    let pointerDrag = null;

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

    root.addEventListener("pointerdown", (event) => {
        if (event.pointerType === "mouse") return;
        const row = event.target.closest("tr[data-lang-row]");
        if (!row) return;
        const lang = row.getAttribute("data-lang-row");
        if (!lang) return;
        event.preventDefault();
        row.setPointerCapture(event.pointerId);
        row.classList.add("language-row-dragging");
        dragLanguage = lang;
        pointerDrag = { pointerId: event.pointerId, row };
    });

    root.addEventListener("pointermove", (event) => {
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        event.preventDefault();
        clearDropMarkers();
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const { targetRow } = resolveDropTarget(hit, event.clientY);
        if (!targetRow || targetRow === pointerDrag.row) return;
        const rect = targetRow.getBoundingClientRect();
        const isAfter = event.clientY > rect.top + rect.height / 2;
        targetRow.classList.add(
            isAfter ? "drop-target-after" : "drop-target-before",
        );
    });

    function endPointerDrag(event) {
        if (!pointerDrag || pointerDrag.pointerId !== event.pointerId) return;
        const dragRow = pointerDrag.row;
        dragRow.classList.remove("language-row-dragging");
        if (dragRow.hasPointerCapture(event.pointerId)) {
            dragRow.releasePointerCapture(event.pointerId);
        }
        const hit = document.elementFromPoint(event.clientX, event.clientY);
        const { targetTable, targetRow, targetIsAfter } = resolveDropTarget(
            hit,
            event.clientY,
        );
        clearDropMarkers();
        applyDrop(dragLanguage, targetTable, targetRow, targetIsAfter);
        dragLanguage = null;
        pointerDrag = null;
    }

    root.addEventListener("pointerup", endPointerDrag);
    root.addEventListener("pointercancel", endPointerDrag);

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

    function discard() {
        languagePriority = [...savedPriority];
        renderTables();
        notifyDirty();
    }

    async function init() {
        catalog = await loadLanguagesCatalog().catch(() => [
            { iso_code: "en", name: "English" },
        ]);
        renderTables();
    }

    return {
        init,
        renderTables,
        getPriority: () => languagePriority,
        isDirty: () =>
            JSON.stringify(languagePriority) !== JSON.stringify(savedPriority),
        discard,
    };
}
