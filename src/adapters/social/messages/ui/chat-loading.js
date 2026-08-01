import { apiFetch } from "/static/reuse/api-client.js";
import { importRoomKey } from "/static/reuse/crypto-utils.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import { createRoomKeyStore } from "./room-keys.mjs";

const FLOW_ID = "load-social-chat";
let messagesKeyring = null;
let messagesI18nPromise = null;
const pendingRoomKeyLoads = new Map();

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
});

if (!uiCtx.flowExists(FLOW_ID)) {
    uiCtx.registerFlow(FLOW_ID, [
        "load-key-contribution",
        "resolve-keyring",
        "persist-key-contribution",
    ]);
}

uiCtx.extendFlow(
    FLOW_ID,
    "load-key-contribution",
    { id: "social-messages:load-key-contribution" },
    async (stageContext) => {
        if (!uiCtx.capabilities.get("keyring:isUnlocked")?.()) return;
        if (stageContext.input.keyContribution) {
            stageContext.data.keyContribution =
                stageContext.input.keyContribution;
            return;
        }
        const response = await apiFetch(
            `/api/v1/social/messages/rooms/${encodeURIComponent(stageContext.input.roomId)}`,
        );
        if (!response.ok) return;
        const payload = await response.json().catch(() => null);
        stageContext.data.keyContribution = payload?.data?.keyContribution;
    },
);

uiCtx.extendFlow(
    FLOW_ID,
    "resolve-keyring",
    { id: "social-messages:resolve-keyring" },
    async (stageContext) => {
        stageContext.data.roomKey = await roomKeys.getRoomKey(
            stageContext.input.roomId,
            stageContext.data.keyContribution,
        );
    },
);

uiCtx.extendFlow(
    FLOW_ID,
    "persist-key-contribution",
    { id: "social-messages:persist-key-contribution" },
    async (stageContext) => {
        if (stageContext.data.roomKey || !stageContext.data.keyContribution) {
            return;
        }
        const requestUnlock = getMessagesKeyring()?.requestUnlock;
        const request = await buildChatUnlockRequest(
            stageContext.input.roomId,
            "adapter.social.messages.keyring_request_action_save",
        );
        if (
            typeof requestUnlock !== "function" ||
            !(await requestUnlock({
                request,
            }))
        ) {
            return;
        }
        const contributed = await roomKeys.contributeRoomKey(
            stageContext.input.roomId,
            stageContext.data.keyContribution,
        );
        if (contributed) {
            stageContext.data.roomKey = await roomKeys.getRoomKey(
                stageContext.input.roomId,
            );
        }
    },
);

export async function loadChatRoomKey(roomId, options = {}) {
    if (!roomId) return null;
    const loadId = String(roomId);
    const existingLoad = pendingRoomKeyLoads.get(loadId);
    if (existingLoad) {
        const existingKey = await existingLoad;
        if (existingKey || !options.keyContribution) return existingKey;
    }

    const pendingLoad = uiCtx
        .runFlow(FLOW_ID, {
            roomId,
            keyContribution: options.keyContribution,
        })
        .then((result) => result.data.roomKey ?? null)
        .finally(() => {
            if (pendingRoomKeyLoads.get(loadId) === pendingLoad) {
                pendingRoomKeyLoads.delete(loadId);
            }
        });
    pendingRoomKeyLoads.set(loadId, pendingLoad);
    return pendingLoad;
}

export async function requireChatRoomKey(roomId, options = {}) {
    const roomKey = await loadChatRoomKey(roomId, options);
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
