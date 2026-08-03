import { apiFetch } from "/static/reuse/api-client.js";
import { importRoomKey } from "/static/reuse/crypto-utils.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createRoomKeyStore } from "./room-keys.mjs";

const FLOW_ID = "load-social-chat";
let messagesKeyring = null;
let messagesI18nPromise = null;
const pendingRoomKeyLoads = new Map();
let keyringGeneration = 0;

function getMessagesKeyring() {
    if (messagesKeyring) return messagesKeyring;
    const keyringScopeFactory = uiCtx.capabilities.get("keyring:forComponent");
    messagesKeyring = keyringScopeFactory?.("Social Messages") ?? null;
    return messagesKeyring;
}

async function buildChatUnlockRequest(roomId, actionKey) {
    messagesI18nPromise ??= import("/static/reuse/i18n.js").then(
        ({ createI18n }) =>
            createI18n({
                componentStringBaseUrls: [
                    "/static/adapters/social/messages/languages",
                ],
            }),
    );
    const i18n = await messagesI18nPromise;
    return {
        component: "Social Messages",
        action: i18n.t(actionKey),
        process: i18n
            .t("adapter.social.messages.keyring_request_process")
            .replace("{{roomId}}", roomId),
    };
}

async function promptForRoomKey(roomId) {
    await buildChatUnlockRequest(
        roomId,
        "adapter.social.messages.keyring_request_action_open",
    );
    const [{ openPopup }, { escapeHtml }, i18n] = await Promise.all([
        import("/static/reuse/popup.js"),
        import("/static/reuse/escape-html.js"),
        messagesI18nPromise,
    ]);
    let keyInput = null;
    const result = await openPopup({
        title: i18n.t("adapter.social.messages.room_key_prompt_title"),
        body: `<label class="stack"><span>${escapeHtml(i18n.t("adapter.social.messages.room_key_prompt"))}</span><input id="messages-room-key" type="password" autocomplete="off" required></label>`,
        actions: [
            {
                id: "save",
                label: i18n.t("adapter.social.messages.room_key_save"),
                variant: "confirm",
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen(overlay) {
            keyInput = overlay.querySelector("#messages-room-key");
            keyInput?.focus();
        },
        onAction: (actionId) => actionId !== "save" || Boolean(keyInput?.value),
    });
    return result === "save" ? String(keyInput?.value ?? "") : null;
}

const roomKeys = createRoomKeyStore({
    importKey: importRoomKey,
    resolveSecret: async (id, options) =>
        getMessagesKeyring()?.resolve(id, options) ?? null,
    contributeSecret: async (id, value, metadata) => {
        const keyring = getMessagesKeyring();
        if (!keyring) throw new Error("keyring_unavailable");
        await keyring.set(id, value, metadata);
    },
    buildRequest: (roomId) =>
        buildChatUnlockRequest(
            roomId,
            "adapter.social.messages.keyring_request_action_open",
        ),
    promptSecret: promptForRoomKey,
});

if (!uiCtx.flowExists(FLOW_ID)) {
    uiCtx.registerFlow(FLOW_ID, [
        "resolve-keyring",
        "request-key-contribution",
        "persist-key-contribution",
        "prompt-missing-key",
    ]);
}

uiCtx.extendFlow(
    FLOW_ID,
    "resolve-keyring",
    { id: "social-messages:resolve-keyring" },
    async (stageContext) => {
        const roomKey = await roomKeys.getRoomKey(stageContext.input.roomId);
        if (stageContext.input.keyringGeneration !== keyringGeneration) {
            roomKeys.clearRoomKeys();
            return;
        }
        stageContext.data.roomKey = roomKey;
    },
);

uiCtx.extendFlow(
    FLOW_ID,
    "prompt-missing-key",
    { id: "social-messages:prompt-missing-key" },
    async (stageContext) => {
        if (
            stageContext.data.roomKey ||
            stageContext.input.keyringGeneration !== keyringGeneration ||
            stageContext.input.recoverMissing !== true ||
            !uiCtx.capabilities.get("keyring:isUnlocked")?.()
        ) {
            return;
        }
        stageContext.data.roomKey = await roomKeys.getRoomKey(
            stageContext.input.roomId,
            null,
            true,
        );
    },
);

uiCtx.extendFlow(
    FLOW_ID,
    "request-key-contribution",
    { id: "social-messages:request-key-contribution" },
    async (stageContext) => {
        if (
            stageContext.data.roomKey ||
            stageContext.input.keyringGeneration !== keyringGeneration ||
            stageContext.input.recoverMissing !== true ||
            !uiCtx.capabilities.get("keyring:isUnlocked")?.()
        ) {
            return;
        }
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(stageContext.input.roomId)}/key-contribution`,
            { method: "POST" },
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        stageContext.data.keyContribution = payload?.data?.keyContribution;
    },
);

uiCtx.extendFlow(
    FLOW_ID,
    "persist-key-contribution",
    { id: "social-messages:persist-key-contribution" },
    async (stageContext) => {
        if (
            stageContext.input.keyringGeneration !== keyringGeneration ||
            stageContext.data.roomKey ||
            !stageContext.data.keyContribution
        ) {
            return;
        }
        const contributed = await roomKeys.contributeRoomKey(
            stageContext.input.roomId,
            stageContext.data.keyContribution,
        );
        if (contributed) {
            const response = await apiFetch(
                `/api/v1/social/messages/rooms/${encodeURIComponent(stageContext.input.roomId)}/key-contribution/acknowledge`,
                { method: "POST" },
            );
            if (!response.ok) return;
            stageContext.data.roomKey = await roomKeys.getRoomKey(
                stageContext.input.roomId,
            );
        }
    },
);

export async function loadChatRoomKey(roomId, { recoverMissing = false } = {}) {
    if (!roomId) return null;
    const loadId = `${String(roomId)}:${recoverMissing ? "recover" : "local"}`;
    const existingLoad = pendingRoomKeyLoads.get(loadId);
    if (existingLoad) {
        return existingLoad;
    }

    const loadGeneration = keyringGeneration;
    const pendingLoad = uiCtx
        .runFlow(FLOW_ID, {
            roomId,
            recoverMissing,
            keyringGeneration: loadGeneration,
        })
        .then((result) =>
            loadGeneration === keyringGeneration
                ? (result.data.roomKey ?? null)
                : null,
        )
        .finally(() => {
            if (pendingRoomKeyLoads.get(loadId) === pendingLoad) {
                pendingRoomKeyLoads.delete(loadId);
            }
        });
    pendingRoomKeyLoads.set(loadId, pendingLoad);
    return pendingLoad;
}

if (typeof window !== "undefined") {
    window.addEventListener("cognis:keyring-event", (event) => {
        if (event.detail?.type !== "destroy") return;
        keyringGeneration += 1;
        pendingRoomKeyLoads.clear();
        roomKeys.clearRoomKeys();
    });
}

export async function requireChatRoomKey(roomId, options = {}) {
    const roomKey = await loadChatRoomKey(roomId, {
        ...options,
        recoverMissing: true,
    });
    if (roomKey) return roomKey;
    const error = new Error("Room key is unavailable in the keyring.");
    error.code = "missing_keyring_secret";
    error.roomId = roomId;
    throw error;
}

uiCtx.capabilities.contribute(
    "social:messages:loadChatRoomKey",
    loadChatRoomKey,
);
