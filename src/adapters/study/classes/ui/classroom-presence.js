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
    let stream = null;

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
        try {
            const accessToken = String(
                localStorage.getItem("cognis_access_token") ?? "",
            ).trim();
            const streamUrl = accessToken
                ? `/api/v1/social/presence/stream?token=${encodeURIComponent(accessToken)}`
                : "/api/v1/social/presence/stream";
            stream = new EventSource(streamUrl);
            stream.addEventListener("presence", (event) => {
                try {
                    const payload = JSON.parse(event.data ?? "{}");
                    const accountId = String(payload?.accountId ?? "").trim();
                    const status = String(payload?.status ?? "").trim();
                    if (!accountId || !status) return;
                    onPresence?.(accountId, status);
                } catch {}
            });
        } catch {}

        signal?.addEventListener("abort", () => {
            if (heartbeatTimer) {
                clearInterval(heartbeatTimer);
            }
            stream?.close();
            void updateStatus("offline");
        });
    }

    return { init };
}
