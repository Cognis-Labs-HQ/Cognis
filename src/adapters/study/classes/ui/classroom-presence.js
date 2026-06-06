function buildPresencePayload(status) {
    return {
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ status }),
        method: "POST",
    };
}

export function createClassroomPresenceController({
    apiFetch,
    signal,
    onPresence,
}) {
    let heartbeatTimer = null;
    let streamAbortController = null;

    function handleStreamChunk(chunk) {
        const lines = chunk
            .split("\n")
            .map((line) => line.trimEnd())
            .filter(Boolean);
        let eventName = "";
        let eventData = "";
        for (const line of lines) {
            if (line.startsWith("event:")) {
                eventName = line.slice("event:".length).trim();
                continue;
            }
            if (line.startsWith("data:")) {
                eventData += `${line.slice("data:".length).trim()}\n`;
            }
        }
        if (eventName !== "presence" || !eventData.trim()) return;
        try {
            const payload = JSON.parse(eventData.trim());
            const accountId = String(payload?.accountId ?? "").trim();
            const status = String(payload?.status ?? "").trim();
            if (!accountId || !status) return;
            onPresence?.(accountId, status);
        } catch {}
    }

    async function startPresenceStream() {
        streamAbortController = new AbortController();
        const response = await apiFetch("/api/v1/social/presence/stream", {
            headers: { accept: "text/event-stream" },
            signal: streamAbortController.signal,
        }).catch(() => null);
        if (!response?.ok || !response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";
        while (!streamAbortController.signal.aborted) {
            const { value, done } = await reader.read().catch(() => ({
                value: undefined,
                done: true,
            }));
            if (done) break;
            buffer += decoder.decode(value, { stream: true });
            let separatorIndex = buffer.indexOf("\n\n");
            while (separatorIndex !== -1) {
                const chunk = buffer.slice(0, separatorIndex);
                buffer = buffer.slice(separatorIndex + 2);
                handleStreamChunk(chunk);
                separatorIndex = buffer.indexOf("\n\n");
            }
        }
    }

    async function updateStatus(status) {
        await apiFetch(
            "/api/v1/social/presence",
            buildPresencePayload(status),
        ).catch(() => undefined);
    }

    async function init() {
        await updateStatus("online");
        heartbeatTimer = window.setInterval(() => {
            void updateStatus(document.hidden ? "away" : "online");
        }, 30_000);
        document.addEventListener(
            "visibilitychange",
            () => {
                void updateStatus(document.hidden ? "away" : "online");
            },
            { signal },
        );
        void startPresenceStream();

        signal?.addEventListener("abort", () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            streamAbortController?.abort();
            void updateStatus("offline");
        });
    }

    return { init };
}
