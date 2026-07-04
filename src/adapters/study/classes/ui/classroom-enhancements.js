function extractRoomId(chatUrl) {
    const raw = String(chatUrl ?? "").trim();
    if (!raw) return "";
    const match = raw.match(/^\/messages\/([^/?#]+)/);
    return match ? decodeURIComponent(match[1]) : "";
}

function extensionFromType(type) {
    const normalized = String(type ?? "")
        .split(";")[0]
        .toLowerCase();
    if (normalized === "image/png") return "png";
    if (normalized === "image/webp") return "webp";
    if (normalized === "image/gif") return "gif";
    return "jpg";
}

async function uploadClassroomAvatar({ apiFetch, file, snapshot }) {
    const roomId = extractRoomId(snapshot?.chatUrl);
    if (!roomId || !file) return false;
    const extension = extensionFromType(file.type);
    const key = `chatrooms/${roomId}-${Date.now()}.${extension}`;
    const upload = await apiFetch(`/api/v1/files/${key}`, {
        method: "PUT",
        headers: { "content-type": file.type || "image/jpeg" },
        body: await file.arrayBuffer(),
    });
    if (!upload.ok) {
        return false;
    }
    const update = await apiFetch(
        `/api/v1/social/messages/rooms/${encodeURIComponent(roomId)}`,
        {
            method: "PATCH",
            headers: { "content-type": "application/json" },
            body: JSON.stringify({ avatarKey: key }),
        },
    );
    return update.ok;
}

export async function handleRenameClassAction({
    root,
    snapshot,
    apiFetch,
    i18n,
    showToast,
    refreshContent,
}) {
    const classNameInput = root.querySelector("#classes-rename-input");
    if (!(classNameInput instanceof HTMLInputElement)) {
        return;
    }
    const response = await apiFetch(
        `/api/v1/study/classes/${encodeURIComponent(snapshot.id)}`,
        {
            method: "PATCH",
            headers: {
                "content-type": "application/json",
            },
            body: JSON.stringify({
                name: classNameInput.value ?? "",
            }),
        },
    );
    showToast(
        i18n.t(
            response.ok
                ? "module.study.classes.materials_saved"
                : "module.study.classes.materials_save_failed",
        ),
        {
            variant: response.ok ? "success" : "error",
        },
    );
    if (response.ok) {
        await refreshContent();
    }
}

export function bindClassroomEnhancements({
    root,
    signal,
    apiFetch,
    i18n,
    showToast,
    selectedSnapshot,
    setBoardEntity,
    refreshDom,
    refreshContent,
}) {
    root.addEventListener(
        "change",
        async (event) => {
            const snapshot = selectedSnapshot();
            if (!snapshot) return;
            if (
                !(
                    event.target instanceof HTMLInputElement &&
                    event.target.id === "classes-room-avatar-input"
                )
            ) {
                return;
            }
            const file = event.target.files?.[0];
            if (!file) return;
            const success = await uploadClassroomAvatar({
                apiFetch,
                file,
                snapshot,
            });
            showToast(
                i18n.t(
                    success
                        ? "module.study.classes.materials_saved"
                        : "module.study.classes.materials_save_failed",
                ),
                { variant: success ? "success" : "error" },
            );
            if (success) {
                await refreshContent();
            }
        },
        { signal },
    );

    root.addEventListener(
        "dragstart",
        (event) => {
            if (!selectedSnapshot()) return;
            if (!(event.target instanceof HTMLElement)) return;
            const token = event.target.closest(
                ".classes-board-entity-token, .classes-board-entity",
            );
            if (!(token instanceof HTMLElement)) return;
            const kind =
                token.dataset.entityKind === "meeting" ? "meeting" : "chat";
            event.dataTransfer?.setData(
                "application/json",
                JSON.stringify({ kind }),
            );
            event.dataTransfer?.setData("text/plain", kind);
            if (event.dataTransfer) {
                event.dataTransfer.effectAllowed = "move";
            }
        },
        { signal },
    );

    root.addEventListener(
        "dragover",
        (event) => {
            const surface =
                event.target instanceof Element
                    ? event.target.closest(".classes-blackboard-surface")
                    : null;
            if (!(surface instanceof HTMLElement)) return;
            event.preventDefault();
        },
        { signal },
    );

    root.addEventListener(
        "drop",
        (event) => {
            const surface =
                event.target instanceof Element
                    ? event.target.closest(".classes-blackboard-surface")
                    : null;
            const snapshot = selectedSnapshot();
            const classId = String(snapshot?.id ?? "").trim();
            if (!(surface instanceof HTMLElement) || !classId) return;
            const payloadRaw =
                event.dataTransfer?.getData("application/json") ||
                JSON.stringify({
                    kind: event.dataTransfer?.getData("text/plain"),
                });
            let kind = "chat";
            try {
                const payload = JSON.parse(payloadRaw);
                kind = payload?.kind === "meeting" ? "meeting" : "chat";
            } catch {
                kind = "chat";
            }
            const bounds = surface.getBoundingClientRect();
            const x =
                bounds.width > 0
                    ? (event.clientX - bounds.left) / bounds.width
                    : 0;
            const y =
                bounds.height > 0
                    ? (event.clientY - bounds.top) / bounds.height
                    : 0;
            setBoardEntity(classId, kind, x, y);
            refreshDom();
            event.preventDefault();
        },
        { signal },
    );
}
