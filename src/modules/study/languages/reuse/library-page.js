/**
 * Shared Study Library page renderer for language module child components.
 *
 * Public exports:
 *   mountStudyLibraryPage — mounts the admin library CRUD interface for a
 *   specific language module, loading layer data from the language's library
 *   API and wiring up Create, Update, Delete, and Load Layer actions.
 *
 * Usage:
 *   import { mountStudyLibraryPage } from
 *     '/static/modules/study/languages/reuse/library-page.js';
 *
 *   export async function mount(root, { signal } = {}) {
 *     await mountStudyLibraryPage(root, { signal, languageCode: 'en' });
 *   }
 *
 * @param {HTMLElement} root - The root element passed to the page mount function.
 * @param {{ signal?: AbortSignal, languageCode: string }} options
 *   languageCode: BCP 47 code of the language whose library this page manages.
 *   signal: optional AbortSignal from the SPA router for event cleanup.
 * @returns {Promise<void>}
 */

import { createI18n, applyDocumentTitle } from "/static/reuse/i18n.js";
import { apiFetch } from "/static/reuse/api-client.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import {
    loadStudySubNavigationModel,
    renderStudySubNavigation,
} from "/static/modules/study/languages/reuse/study-sub-navigation.js";

const LAYERS = [
    "characters",
    "alt_characters",
    "definitions",
    "words",
    "sentences",
];

function renderRows(tableBodyEl, rows) {
    if (!Array.isArray(rows) || rows.length === 0) {
        tableBodyEl.innerHTML = '<tr><td colspan="2">No rows</td></tr>';
        return;
    }
    tableBodyEl.innerHTML = rows
        .map((row) => {
            const rowId = escapeHtml(String(row?.id ?? ""));
            const rowJson = escapeHtml(JSON.stringify(row, null, 2));
            return `
                <tr>
                    <td>${rowId}</td>
                    <td><pre>${rowJson}</pre></td>
                </tr>
            `;
        })
        .join("");
}

export async function mountStudyLibraryPage(root, { signal, languageCode }) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/study/languages"],
    });
    applyDocumentTitle(i18n, "ui.shared.brand.name");

    const currentPath = window.location.pathname;
    const subNavigationModel = await loadStudySubNavigationModel({
        fallbackLanguageCode: languageCode,
    });
    const selectedLanguageCode =
        subNavigationModel.selectedLanguageCode || languageCode;

    function renderSubNavigation() {
        return renderStudySubNavigation({
            model: subNavigationModel,
            currentPath,
            i18n,
        });
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements: [
            {
                id: `study-${languageCode}-library`,
                label: "Study Library",
                pinned: true,
                gridSize: { default: [12, 8], min: [4, 4], max: "full" },
                render: () => `
                    <section class="study-library-page">
                        <p class="study-library-status" id="study-library-status"></p>
                        <div class="study-library-controls">
                            <label>
                                Layer
                                <select id="study-library-layer">
                                    ${LAYERS.map((layerName) => `<option value="${escapeHtml(layerName)}">${escapeHtml(layerName)}</option>`).join("")}
                                </select>
                            </label>
                            <label>
                                Record id (for update/delete)
                                <input id="study-library-record-id" type="text" />
                            </label>
                        </div>

                        <div class="study-library-editor">
                            <label>
                                Record JSON
                                <textarea id="study-library-json" rows="8" placeholder='{"id":"..."}'></textarea>
                            </label>
                            <div class="study-library-actions">
                                <button type="button" class="btn-confirm btn-animated" id="study-library-load">Load Layer</button>
                                <button type="button" class="btn-confirm btn-animated" id="study-library-create">Create</button>
                                <button type="button" class="btn-confirm btn-animated" id="study-library-update">Update</button>
                                <button type="button" class="btn-cancel btn-animated" id="study-library-delete">Delete</button>
                            </div>
                        </div>

                        <div class="study-library-table-wrap">
                            <table class="study-library-table">
                                <thead>
                                    <tr>
                                        <th>id</th>
                                        <th>record</th>
                                    </tr>
                                </thead>
                                <tbody id="study-library-rows"></tbody>
                            </table>
                        </div>
                    </section>
                `,
                onRender: () => {
                    const statusEl = root.querySelector(
                        "#study-library-status",
                    );
                    const layerSelectEl = root.querySelector(
                        "#study-library-layer",
                    );
                    const recordIdInputEl = root.querySelector(
                        "#study-library-record-id",
                    );
                    const recordJsonTextareaEl = root.querySelector(
                        "#study-library-json",
                    );
                    const tableBodyEl = root.querySelector(
                        "#study-library-rows",
                    );

                    if (
                        !statusEl ||
                        !layerSelectEl ||
                        !recordIdInputEl ||
                        !recordJsonTextareaEl ||
                        !tableBodyEl
                    ) {
                        return;
                    }

                    function setStatus(message, isError = false) {
                        statusEl.textContent = message;
                        statusEl.style.color = isError
                            ? "var(--danger, #c62828)"
                            : "var(--text-muted)";
                    }

                    function selectedLayer() {
                        return layerSelectEl.value;
                    }

                    function parseRecordJsonInput() {
                        try {
                            const rawValue = recordJsonTextareaEl.value.trim();
                            if (!rawValue) return null;
                            return JSON.parse(rawValue);
                        } catch {
                            throw new Error("Invalid JSON payload");
                        }
                    }

                    async function fetchLayerRows() {
                        const layerName = selectedLayer();
                        // Apply a language filter only for the definitions layer,
                        // where records carry an explicit `language` field
                        // describing the language they are written in. Other
                        // layers (characters, words, etc.) do not need this
                        // filter. `selectedLanguageCode` comes from the
                        // sub-navigation model loaded at page init — not from
                        // any URL parameter.
                        const languageQuery =
                            layerName === "definitions" && selectedLanguageCode
                                ? `?language=${encodeURIComponent(selectedLanguageCode)}`
                                : "";
                        const response = await apiFetch(
                            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/library/${encodeURIComponent(layerName)}${languageQuery}`,
                        );
                        if (!response.ok) {
                            throw new Error(`Load failed (${response.status})`);
                        }
                        const payload = await response.json();
                        const rows = Array.isArray(payload?.data)
                            ? payload.data
                            : [];
                        renderRows(tableBodyEl, rows);
                        setStatus(
                            `Loaded ${rows.length} record(s) from ${layerName}.`,
                        );
                    }

                    async function createRecord() {
                        const layerName = selectedLayer();
                        const record = parseRecordJsonInput();
                        if (!record || typeof record !== "object") {
                            throw new Error(
                                "Record JSON is required for create.",
                            );
                        }
                        if (!record.language) {
                            record.language = selectedLanguageCode;
                        }
                        const response = await apiFetch(
                            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/library/${encodeURIComponent(layerName)}`,
                            {
                                method: "POST",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ record }),
                            },
                        );
                        if (!response.ok) {
                            const payload = await response
                                .json()
                                .catch(() => null);
                            throw new Error(
                                payload?.error?.message ??
                                    `Create failed (${response.status})`,
                            );
                        }
                        await fetchLayerRows();
                    }

                    async function updateRecord() {
                        const layerName = selectedLayer();
                        const recordId = recordIdInputEl.value.trim();
                        if (!recordId) {
                            throw new Error(
                                "Record id is required for update.",
                            );
                        }
                        const patch = parseRecordJsonInput();
                        if (!patch || typeof patch !== "object") {
                            throw new Error(
                                "Patch JSON is required for update.",
                            );
                        }
                        if (!patch.language) {
                            patch.language = selectedLanguageCode;
                        }
                        const response = await apiFetch(
                            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/library/${encodeURIComponent(layerName)}/${encodeURIComponent(recordId)}`,
                            {
                                method: "PUT",
                                headers: { "content-type": "application/json" },
                                body: JSON.stringify({ patch }),
                            },
                        );
                        if (!response.ok) {
                            const payload = await response
                                .json()
                                .catch(() => null);
                            throw new Error(
                                payload?.error?.message ??
                                    `Update failed (${response.status})`,
                            );
                        }
                        await fetchLayerRows();
                    }

                    async function deleteRecord() {
                        const layerName = selectedLayer();
                        const recordId = recordIdInputEl.value.trim();
                        if (!recordId) {
                            throw new Error(
                                "Record id is required for deletion.",
                            );
                        }
                        const response = await apiFetch(
                            `/api/v1/study/languages/${encodeURIComponent(languageCode)}/library/${encodeURIComponent(layerName)}/${encodeURIComponent(recordId)}`,
                            { method: "DELETE" },
                        );
                        if (!response.ok) {
                            const payload = await response
                                .json()
                                .catch(() => null);
                            throw new Error(
                                payload?.error?.message ??
                                    `Delete failed (${response.status})`,
                            );
                        }
                        await fetchLayerRows();
                    }

                    root.querySelector("#study-library-load")?.addEventListener(
                        "click",
                        () => {
                            fetchLayerRows().catch((error) =>
                                setStatus(error.message, true),
                            );
                        },
                        { signal },
                    );

                    root.querySelector(
                        "#study-library-create",
                    )?.addEventListener(
                        "click",
                        () => {
                            createRecord().catch((error) =>
                                setStatus(error.message, true),
                            );
                        },
                        { signal },
                    );

                    root.querySelector(
                        "#study-library-update",
                    )?.addEventListener(
                        "click",
                        () => {
                            updateRecord().catch((error) =>
                                setStatus(error.message, true),
                            );
                        },
                        { signal },
                    );

                    root.querySelector(
                        "#study-library-delete",
                    )?.addEventListener(
                        "click",
                        () => {
                            deleteRecord().catch((error) =>
                                setStatus(error.message, true),
                            );
                        },
                        { signal },
                    );

                    layerSelectEl.addEventListener(
                        "change",
                        () => {
                            fetchLayerRows().catch((error) =>
                                setStatus(error.message, true),
                            );
                        },
                        { signal },
                    );

                    fetchLayerRows().catch((error) =>
                        setStatus(error.message, true),
                    );
                },
            },
        ],
        preferenceKey: `study-${languageCode}-library-layout`,
        i18n,
        pageContext: {
            title: i18n.t("gateway.study.library_label"),
            subtitle: i18n.t("gateway.study.library_subtitle"),
        },
        toolbar: [],
        subNavigation: [
            {
                id: `study-${languageCode}-library-subnav`,
                label: "Study",
                render: renderSubNavigation,
            },
        ],
    });

    await composer.init();
}
