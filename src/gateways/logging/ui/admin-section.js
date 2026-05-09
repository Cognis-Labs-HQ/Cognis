import { formatDateTime } from "/static/reuse/timestamp.js";

const MAX_DISPLAYED_LOGS = 400;
const RECONNECT_DELAY_MS = 2000;
const MAX_SILENT_RECONNECT_ATTEMPTS = 2;
const AUTO_REFRESH_INTERVAL_MS = 5000;
const TIME_RANGE_MS_BY_KEY = {
    "5m": 5 * 60 * 1000,
    "15m": 15 * 60 * 1000,
    "1h": 60 * 60 * 1000,
    "6h": 6 * 60 * 60 * 1000,
    "24h": 24 * 60 * 60 * 1000,
};

function buildQuery(severity, keyword, timeRange) {
    const params = new URLSearchParams();
    if (severity && severity !== "all") {
        params.set("severity", severity);
    }
    if (keyword) {
        params.set("keyword", keyword);
    }
    if (timeRange && timeRange !== "all") {
        params.set("timeRange", timeRange);
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

function buildMetaHtml(entry, escapeHtml) {
    const copy = { ...entry };
    delete copy.id;
    delete copy.ts;
    delete copy.level;
    delete copy.message;
    if (!Object.keys(copy).length) return "";
    return `<pre class="logs-stream-meta">${escapeHtml(JSON.stringify(copy, null, 2))}</pre>`;
}

function renderLogRow(entry, i18n, escapeHtml) {
    const level = String(entry.level ?? "info").toLowerCase();
    const timestamp = formatDateTime(
        entry.ts,
        i18n.t("ui.app.admin.logs.time_unknown"),
        { includeSeconds: true },
    );
    const message = escapeHtml(
        String(entry.message ?? i18n.t("ui.app.admin.logs.message_missing")),
    );
    return `
      <article class="logs-stream-row logs-stream-row--${escapeHtml(level)}">
        <header class="logs-stream-row-header">
          <time class="logs-stream-time">${escapeHtml(timestamp)}</time>
          <span class="logs-stream-level">${escapeHtml(level.toUpperCase())}</span>
        </header>
        <p class="logs-stream-message">${message}</p>
        ${buildMetaHtml(entry, escapeHtml)}
      </article>
    `;
}

function parseEntryTimestampMs(entry) {
    const parsed = Date.parse(String(entry?.ts ?? ""));
    if (Number.isNaN(parsed)) return null;
    return parsed;
}

function isWithinTimeRange(entry, timeRange) {
    const rangeMs = TIME_RANGE_MS_BY_KEY[timeRange];
    if (!rangeMs) return true;
    const timestampMs = parseEntryTimestampMs(entry);
    if (timestampMs === null) return false;
    return Date.now() - timestampMs <= rangeMs;
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
    let pendingEntries = [];
    let flushFrame = null;
    let streamController = null;
    let reconnectTimer = null;
    let autoRefreshTimer = null;
    let panelEl = null;
    let resultsEl = null;
    let statusEl = null;
    let visibilityListenerAttached = false;
    let reconnectAttempts = 0;
    let activeSession = 0;
    let activeFilters = {
        severity: "all",
        keyword: "",
        timeRange: "all",
    };

    function isPanelActive() {
        return !!panelEl?.isConnected;
    }

    function clearFlushFrame() {
        if (flushFrame !== null) {
            cancelAnimationFrame(flushFrame);
            flushFrame = null;
        }
    }

    function setStatus(message = "") {
        if (!(statusEl instanceof HTMLElement)) return;
        statusEl.textContent = message;
        statusEl.hidden = message === "";
    }

    function removeEmptyState() {
        resultsEl?.querySelector(".logs-stream-empty")?.remove();
    }

    function trimRenderedRows() {
        if (!(resultsEl instanceof HTMLElement)) return;
        while (resultsEl.childElementCount > MAX_DISPLAYED_LOGS) {
            resultsEl.lastElementChild?.remove();
        }
    }

    function ensureEmptyState() {
        if (!(resultsEl instanceof HTMLElement) || logs.length > 0) return;
        resultsEl.innerHTML = `<p class="logs-stream-empty">${i18n.t("ui.app.admin.logs.empty")}</p>`;
    }

    function flushPendingEntries() {
        flushFrame = null;
        if (!(resultsEl instanceof HTMLElement)) return;
        if (!pendingEntries.length) {
            ensureEmptyState();
            return;
        }
        removeEmptyState();
        const fragment = document.createDocumentFragment();
        for (const entry of pendingEntries) {
            const wrapper = document.createElement("div");
            wrapper.innerHTML = renderLogRow(entry, i18n, escapeHtml).trim();
            if (wrapper.firstElementChild) {
                fragment.appendChild(wrapper.firstElementChild);
            }
        }
        pendingEntries = [];
        resultsEl.prepend(fragment);
        trimRenderedRows();
    }

    function scheduleFlush() {
        if (flushFrame !== null) return;
        flushFrame = requestAnimationFrame(() => {
            flushPendingEntries();
        });
    }

    function renderSnapshot() {
        clearFlushFrame();
        pendingEntries = [];
        if (!(resultsEl instanceof HTMLElement)) return;
        if (!logs.length) {
            ensureEmptyState();
            return;
        }
        resultsEl.innerHTML = logs
            .map((entry) => renderLogRow(entry, i18n, escapeHtml))
            .join("");
    }

    function queueLog(entry) {
        if (!isWithinTimeRange(entry, activeFilters.timeRange)) {
            return;
        }
        logs.unshift(entry);
        if (logs.length > MAX_DISPLAYED_LOGS) {
            logs.pop();
        }
        pendingEntries.unshift(entry);
        scheduleFlush();
    }

    function resetLogs() {
        logs = [];
        pendingEntries = [];
        renderSnapshot();
    }

    function detachVisibilityListener() {
        if (!visibilityListenerAttached) return;
        document.removeEventListener(
            "visibilitychange",
            handleVisibilityChange,
        );
        visibilityListenerAttached = false;
    }

    function stopStream() {
        activeSession++;
        clearFlushFrame();
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
            reconnectTimer = null;
        }
        if (streamController) {
            streamController.abort();
            streamController = null;
        }
        reconnectAttempts = 0;
        setStatus("");
    }

    function stopAutoRefresh() {
        if (autoRefreshTimer) {
            clearInterval(autoRefreshTimer);
            autoRefreshTimer = null;
        }
    }

    function refreshByTimeRangeWindow() {
        if (!(resultsEl instanceof HTMLElement)) return;
        const nextLogs = logs.filter((entry) =>
            isWithinTimeRange(entry, activeFilters.timeRange),
        );
        if (nextLogs.length === logs.length) {
            return;
        }
        logs = nextLogs;
        renderSnapshot();
    }

    function startAutoRefresh() {
        stopAutoRefresh();
        autoRefreshTimer = setInterval(() => {
            refreshByTimeRangeWindow();
        }, AUTO_REFRESH_INTERVAL_MS);
    }

    function scheduleReconnect(sessionId) {
        if (!isPanelActive() || sessionId !== activeSession) return;
        if (reconnectTimer) {
            clearTimeout(reconnectTimer);
        }
        reconnectTimer = setTimeout(() => {
            if (!isPanelActive() || sessionId !== activeSession) return;
            void startStream();
        }, RECONNECT_DELAY_MS);
    }

    async function consumeStream(stream, sessionId) {
        const reader = stream.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (sessionId === activeSession) {
            const { done, value } = await reader.read();
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let marker = buffer.indexOf("\n\n");
            while (marker !== -1) {
                const block = buffer.slice(0, marker);
                buffer = buffer.slice(marker + 2);
                if (block.startsWith(":")) {
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                const parsed = parseSseBlock(block);
                if (!parsed) {
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "reset") {
                    resetLogs();
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "snapshot_error") {
                    setStatus(i18n.t("ui.app.admin.logs.snapshot_failed"));
                    marker = buffer.indexOf("\n\n");
                    continue;
                }
                if (parsed.eventName === "log") {
                    try {
                        queueLog(JSON.parse(parsed.data));
                        setStatus("");
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
        if (!isPanelActive()) return;
        streamController = new AbortController();
        const sessionId = activeSession;
        try {
            const query = buildQuery(
                activeFilters.severity,
                activeFilters.keyword,
                activeFilters.timeRange,
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
            reconnectAttempts = 0;
            setStatus("");
            await consumeStream(response.body, sessionId);
        } catch {
            if (
                sessionId !== activeSession ||
                streamController?.signal.aborted ||
                !isPanelActive()
            ) {
                return;
            }
            reconnectAttempts += 1;
            setStatus(i18n.t("ui.app.admin.logs.stream_failed"));
            if (reconnectAttempts > MAX_SILENT_RECONNECT_ATTEMPTS) {
                showToast(i18n.t("ui.app.admin.logs.stream_failed"), {
                    variant: "warning",
                });
                reconnectAttempts = 0;
            }
            scheduleReconnect(sessionId);
            return;
        }
        if (sessionId === activeSession && isPanelActive()) {
            scheduleReconnect(sessionId);
        }
    }

    function handleVisibilityChange() {
        if (document.hidden) {
            stopStream();
            return;
        }
        if (isPanelActive()) {
            void startStream();
        }
    }

    function bindSection(root) {
        panelEl = root.querySelector(".logs-stream-panel");
        resultsEl = root.querySelector(".logs-stream-results");
        statusEl = root.querySelector(".logs-stream-status");
        const severitySelect = root.querySelector('[name="logsSeverity"]');
        const keywordInput = root.querySelector('[name="logsKeyword"]');
        const timeRangeSelect = root.querySelector('[name="logsTimeRange"]');
        const applyButton = root.querySelector(".logs-stream-apply");

        if (
            !(panelEl instanceof HTMLElement) ||
            !(resultsEl instanceof HTMLElement) ||
            !(statusEl instanceof HTMLElement) ||
            !(severitySelect instanceof HTMLSelectElement) ||
            !(keywordInput instanceof HTMLInputElement) ||
            !(timeRangeSelect instanceof HTMLSelectElement) ||
            !(applyButton instanceof HTMLButtonElement)
        ) {
            return;
        }

        severitySelect.value = activeFilters.severity;
        keywordInput.value = activeFilters.keyword;
        timeRangeSelect.value = activeFilters.timeRange;
        renderSnapshot();

        const applyFilters = () => {
            activeFilters = {
                severity: severitySelect.value || "all",
                keyword: keywordInput.value.trim(),
                timeRange: timeRangeSelect.value || "all",
            };
            reconnectAttempts = 0;
            resetLogs();
            void startStream();
        };

        applyButton.addEventListener("click", applyFilters);
        keywordInput.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                event.preventDefault();
                applyFilters();
            }
        });

        if (!visibilityListenerAttached) {
            document.addEventListener(
                "visibilitychange",
                handleVisibilityChange,
            );
            visibilityListenerAttached = true;
        }

        startAutoRefresh();
        void startStream();
    }

    function unbindSection() {
        stopAutoRefresh();
        detachVisibilityListener();
        stopStream();
        panelEl = null;
        resultsEl = null;
        statusEl = null;
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
                    render: () => `
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
                          <label class="logs-stream-filter">
                            ${i18n.t("ui.app.admin.logs.filter_time_range")}
                            <select name="logsTimeRange" class="theme-select">
                              <option value="all">${i18n.t("ui.app.admin.logs.time_range.all")}</option>
                              <option value="5m">${i18n.t("ui.app.admin.logs.time_range.5m")}</option>
                              <option value="15m">${i18n.t("ui.app.admin.logs.time_range.15m")}</option>
                              <option value="1h">${i18n.t("ui.app.admin.logs.time_range.1h")}</option>
                              <option value="6h">${i18n.t("ui.app.admin.logs.time_range.6h")}</option>
                              <option value="24h">${i18n.t("ui.app.admin.logs.time_range.24h")}</option>
                            </select>
                          </label>
                          <button type="button" class="btn-confirm btn-animated logs-stream-apply">
                            ${i18n.t("ui.reuse.generic.refresh")}
                          </button>
                        </div>
                        <p class="logs-stream-status" hidden aria-live="polite"></p>
                        <div class="logs-stream-results"></div>
                      </section>
                    `,
                },
            ],
            onRender: (root) => {
                bindSection(root);
            },
            onUnmount: () => {
                unbindSection();
            },
        },
    };
}
