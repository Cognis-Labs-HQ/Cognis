import { formatDateTime } from "/static/reuse/timestamp.js";

const MAX_RENDERED_LOGS = 400;

function buildQuery(severity, keyword) {
    const params = new URLSearchParams();
    if (severity && severity !== "all") {
        params.set("severity", severity);
    }
    if (keyword) {
        params.set("keyword", keyword);
    }
    const query = params.toString();
    return query ? `?${query}` : "";
}

function parseSseBlock(block) {
    const lines = block.split("\n");
    let eventName = "message";
    const dataLines = [];
    for (const line of lines) {
        if (line.startsWith("event:")) {
            eventName = line.slice("event:".length).trim();
            continue;
        }
        if (line.startsWith("data:")) {
            dataLines.push(line.slice("data:".length).trim());
        }
    }
    if (!dataLines.length) return null;
    return { eventName, data: dataLines.join("\n") };
}

/**
 * Logging gateway admin section.
 *
 * Contributes a live logs stream to the Administration page with severity and
 * keyword filtering.
 *
 * @param {{ i18n: object, apiFetch: Function, escapeHtml: Function, showToast: Function }} deps
 * @returns {{ id: string, label: string, dataReady: Promise<void>, subComposerOptions: object }}
 */
export function createAdminSection({ i18n, apiFetch, escapeHtml, showToast }) {
    let logs = [];
    let streamController = null;
    let reconnectTimer = null;
    let activeRoot = null;
    let activeFilters = {
        severity: "all",
        keyword: "",
    };

    function stopStream() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (streamController) {
            streamController.abort();
            streamController = null;
        }
    }

    function renderLogRows() {
        if (!logs.length) {
            return `<p class="logs-stream-empty">${i18n.t("ui.app.admin.logs.empty")}</p>`;
        }
        return logs
            .map((entry) => {
                const level = String(entry.level ?? "info").toLowerCase();
                const ts = entry.ts
                    ? formatDateTime(entry.ts)
                    : i18n.t("ui.app.admin.logs.time_unknown");
                const message = escapeHtml(
                    String(
                        entry.message ??
                            i18n.t("ui.app.admin.logs.message_missing"),
                    ),
                );
                const copy = { ...entry };
                delete copy.id;
                delete copy.ts;
                delete copy.level;
                delete copy.message;
                const metaKeys = Object.keys(copy);
                const metaHtml = metaKeys.length
                    ? `<pre class="logs-stream-meta">${escapeHtml(JSON.stringify(copy, null, 2))}</pre>`
                    : "";
                return `
          <article class="logs-stream-row logs-stream-row--${escapeHtml(level)}">
            <header class="logs-stream-row-header">
              <time class="logs-stream-time">${escapeHtml(ts)}</time>
              <span class="logs-stream-level">${escapeHtml(level.toUpperCase())}</span>
            </header>
            <p class="logs-stream-message">${message}</p>
            ${metaHtml}
          </article>
        `;
            })
            .join("");
    }

    function renderContent() {
        return `
      <section class="logs-stream-panel">
        <div class="logs-stream-filters">
          <label class="logs-stream-filter">
            ${i18n.t("ui.app.admin.logs.filter_severity")}
            <select name="logsSeverity" class="theme-select">
              <option value="all">${i18n.t("ui.app.admin.logs.severity.all")}</option>
              <option value="debug">${i18n.t("ui.app.admin.logs.severity.debug")}</option>
              <option value="info">${i18n.t("ui.app.admin.logs.severity.info")}</option>
              <option value="warn">${i18n.t("ui.app.admin.logs.severity.warn")}</option>
              <option value="error">${i18n.t("ui.app.admin.logs.severity.error")}</option>
            </select>
          </label>
          <label class="logs-stream-filter logs-stream-filter--keyword">
            ${i18n.t("ui.app.admin.logs.filter_keyword")}
            <input
              type="search"
              name="logsKeyword"
              placeholder="${escapeHtml(i18n.t("ui.app.admin.logs.filter_keyword_placeholder"))}"
            />
          </label>
          <button type="button" class="btn-confirm btn-animated logs-stream-apply">
            ${i18n.t("ui.reuse.generic.refresh")}
          </button>
        </div>
        <div class="logs-stream-results">${renderLogRows()}</div>
      </section>
    `;
    }

    function refreshPanel() {
        if (!activeRoot) return;
        const results = activeRoot.querySelector(".logs-stream-results");
        if (!(results instanceof HTMLElement)) return;
        results.innerHTML = renderLogRows();
    }

    function pushLog(entry) {
        logs.push(entry);
        if (logs.length > MAX_RENDERED_LOGS) {
            logs = logs.slice(-MAX_RENDERED_LOGS);
        }
        refreshPanel();
    }

    function scheduleReconnect() {
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        reconnectTimer = setTimeout(() => {
            void startStream();
        }, 2000);
    }

    async function consumeStream(stream) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let marker = buffer.indexOf("\n\n");
            while (marker !== -1) {
                const block = buffer.slice(0, marker);
                buffer = buffer.slice(marker + 2);
                const parsed = parseSseBlock(block);
                if (!parsed) {
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "reset") {
                    logs = [];
                    refreshPanel();
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "snapshot_error") {
                    showToast(i18n.t("ui.app.admin.logs.snapshot_failed"), {
                        variant: "warning",
                    });
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "log") {
                    try {
                        const entry = JSON.parse(parsed.data);
                        pushLog(entry);
                    } catch {
                        // Ignore malformed events and continue.
                    }
                }
                marker = buffer.indexOf("\n\n");
            }
        }
    }

    async function startStream() {
        stopStream();
        streamController = new AbortController();
        try {
            const query = buildQuery(
                activeFilters.severity,
                activeFilters.keyword,
            );
            const response = await apiFetch(`/api/v1/logging/stream${query}`, {
                signal: streamController.signal,
                headers: {
                    accept: "text/event-stream",
                },
            });
            if (!response.ok || !response.body) {
                throw new Error(`stream_http_${response.status}`);
            }
            await consumeStream(response.body);
        } catch (error) {
            if (streamController?.signal.aborted) {
                return;
            }
            showToast(i18n.t("ui.app.admin.logs.stream_failed"), {
                variant: "error",
            });
            scheduleReconnect();
            return;
        }
        if (!streamController?.signal.aborted) {
            scheduleReconnect();
        }
    }

    function bindSection(root) {
        activeRoot = root;
        const severitySelect = root.querySelector('[name="logsSeverity"]');
        const keywordInput = root.querySelector('[name="logsKeyword"]');
        const applyButton = root.querySelector(".logs-stream-apply");

        if (
            !(severitySelect instanceof HTMLSelectElement) ||
            !(keywordInput instanceof HTMLInputElement) ||
            !(applyButton instanceof HTMLButtonElement)
        ) {
            return;
        }

        severitySelect.value = activeFilters.severity;
        keywordInput.value = activeFilters.keyword;

        const applyFilters = () => {
            activeFilters = {
                severity: severitySelect.value || "all",
                keyword: keywordInput.value.trim(),
            };
            logs = [];
            refreshPanel();
            void startStream();
        };

        applyButton.addEventListener("click", applyFilters);
        keywordInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                applyFilters();
            }
        });

        void startStream();
    }

    return {
        id: "logs",
        label: i18n.t("ui.app.admin.logs"),
        dataReady: Promise.resolve(),
        subComposerOptions: {
            allowCustomization: false,
            preferenceKey: "administration-logs-layout",
            heading: i18n.t("ui.app.admin.logs"),
            elements: [
                {
                    id: "logs-stream",
                    label: i18n.t("ui.app.admin.logs.stream"),
                    pinned: true,
                    render: () => renderContent(),
                },
            ],
            onRender: (root) => {
                bindSection(root);
            },
        },
    };
}
