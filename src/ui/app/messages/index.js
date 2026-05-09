/**
 * Messages page.
 *
 * Layout:
 *   left  — list of rooms with last message preview and unread badge.
 *   right — selected room's message thread + composer.
 *
 * Messages are encrypted client-side with a per-room AES-GCM key fetched
 * from `GET /api/v1/messages/rooms/:id/key` and cached in memory for the
 * page's lifetime. The server holds the at-rest-wrapped form of the same
 * key. See `src/adapters/social/messages/docs/standard.en.md` for the full
 * threat model.
 */

import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { showToast } from "../../reuse/toast.js";

const TEXT_ENCODER = new TextEncoder();
const TEXT_DECODER = new TextDecoder();

function hexToBytes(hex) {
    const out = new Uint8Array(hex.length / 2);
    for (let index = 0; index < out.length; index += 1) {
        out[index] = parseInt(hex.slice(index * 2, index * 2 + 2), 16);
    }
    return out;
}

function bytesToHex(bytes) {
    return Array.from(bytes)
        .map((byte) => byte.toString(16).padStart(2, "0"))
        .join("");
}

async function importRoomKey(hex) {
    return crypto.subtle.importKey(
        "raw",
        hexToBytes(hex),
        { name: "AES-GCM" },
        false,
        ["encrypt", "decrypt"],
    );
}

async function encryptMessage(key, plaintext) {
    const iv = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv },
        key,
        TEXT_ENCODER.encode(plaintext),
    );
    return {
        iv: bytesToHex(iv),
        ciphertext: bytesToHex(new Uint8Array(ciphertext)),
    };
}

async function decryptMessage(key, ivHex, ciphertextHex) {
    try {
        const decrypted = await crypto.subtle.decrypt(
            { name: "AES-GCM", iv: hexToBytes(ivHex) },
            key,
            hexToBytes(ciphertextHex),
        );
        return TEXT_DECODER.decode(decrypted);
    } catch {
        return null;
    }
}

const roomKeyCache = new Map();

async function getRoomKey(roomId) {
    if (roomKeyCache.has(roomId)) return roomKeyCache.get(roomId);
    const res = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/key`,
    );
    if (!res.ok) return null;
    const payload = await res.json();
    const hex = payload?.data?.key;
    if (!hex) return null;
    const key = await importRoomKey(hex);
    roomKeyCache.set(roomId, key);
    return key;
}

function escapeHtml(value) {
    return String(value).replace(
        /[&<>"']/g,
        (ch) =>
            ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[ch],
    );
}

function renderRoomList(rooms, currentAccountId, selectedRoomId, i18n) {
    if (!rooms.length) {
        return `<div class="messages-empty">${escapeHtml(i18n.t("module.social.messages.empty"))}</div>`;
    }
    return rooms
        .map((room) => {
            const otherMembers = (room.members ?? []).filter(
                (member) => member.accountId !== currentAccountId,
            );
            const titleSource =
                room.title ||
                otherMembers.map((member) => member.accountId).join(", ");
            const unreadBadge =
                room.unread > 0
                    ? `<span class="messages-unread-badge">${escapeHtml(String(room.unread))}</span>`
                    : "";
            const isActive = room.id === selectedRoomId;
            return `
      <li class="messages-room ${isActive ? "messages-room--active" : ""}"
          data-room-id="${escapeHtml(room.id)}">
        <span class="messages-room-title">${escapeHtml(titleSource)}</span>
        ${unreadBadge}
      </li>
    `;
        })
        .join("");
}

async function renderThread(roomId, key, container) {
    const res = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?limit=50`,
    );
    if (!res.ok) {
        container.innerHTML = "";
        return;
    }
    const payload = await res.json();
    const messages = (payload?.data ?? []).slice().reverse();
    const decoded = await Promise.all(
        messages.map(async (msg) => {
            const text = key
                ? await decryptMessage(key, msg.iv, msg.ciphertext)
                : null;
            return { ...msg, text };
        }),
    );
    container.innerHTML = decoded
        .map((msg) => {
            return `
      <div class="messages-message" data-message-id="${escapeHtml(msg.id)}">
        <span class="messages-message-sender">${escapeHtml(msg.senderId)}</span>
        <span class="messages-message-body">${escapeHtml(msg.text ?? "…")}</span>
      </div>
    `;
        })
        .join("");
    container.scrollTop = container.scrollHeight;
}

async function loadRooms() {
    const res = await apiFetch("/api/v1/messages/rooms");
    if (!res.ok) return [];
    const payload = await res.json();
    return payload?.data ?? [];
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n();
    applyDocumentTitle(i18n, "module.social.messages.page_title");

    const currentAccountId = localStorage.getItem("cognis_account") ?? "";

    const initialPath = window.location.pathname;
    const initialRoomMatch = initialPath.match(/^\/messages\/([^/]+)$/);
    let selectedRoomId = initialRoomMatch
        ? decodeURIComponent(initialRoomMatch[1])
        : null;

    const rooms = await loadRooms();
    if (signal?.aborted) return;

    async function openRoom(roomId) {
        const list = document.getElementById("messages-thread-list");
        if (!list) return;
        const key = await getRoomKey(roomId);
        await renderThread(roomId, key, list);
        await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/read`,
            { method: "POST" },
        ).catch(() => undefined);
    }

    const elements = [
        {
            id: "messages-rooms",
            label: i18n.t("module.social.messages.page_title"),
            gridSize: { default: [3, 6], min: [2, 4] },
            render: () =>
                `<aside class="messages-rooms">
                    <ul class="messages-rooms-list" id="messages-rooms-list">
                        ${renderRoomList(rooms, currentAccountId, selectedRoomId, i18n)}
                    </ul>
                </aside>`,
            onRender: () => {
                const list = document.getElementById("messages-rooms-list");
                list?.addEventListener("click", async (event) => {
                    const item = event.target.closest("[data-room-id]");
                    if (!item) return;
                    const id = item.getAttribute("data-room-id");
                    selectedRoomId = id;
                    history.pushState(
                        {},
                        "",
                        `/messages/${encodeURIComponent(id)}`,
                    );
                    await openRoom(id);
                });
            },
        },
        {
            id: "messages-thread",
            label: i18n.t("module.social.messages.page_title"),
            gridSize: { default: [9, 6], min: [4, 4] },
            render: () =>
                `<section class="messages-thread">
                    <div class="messages-thread-list" id="messages-thread-list"></div>
                    <form class="messages-composer" id="messages-composer">
                        <textarea
                            id="messages-composer-input"
                            class="messages-composer-input"
                            placeholder="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"
                            aria-label="${escapeHtml(i18n.t("module.social.messages.placeholder"))}"
                            rows="2"
                        ></textarea>
                        <button type="submit" class="messages-composer-send">
                            ${escapeHtml(i18n.t("module.social.messages.send"))}
                        </button>
                    </form>
                </section>`,
            onRender: () => {
                const form = document.getElementById("messages-composer");
                form?.addEventListener("submit", async (event) => {
                    event.preventDefault();
                    if (!selectedRoomId) return;
                    const input = document.getElementById(
                        "messages-composer-input",
                    );
                    const text = (input?.value ?? "").trim();
                    if (!text) return;
                    const key = await getRoomKey(selectedRoomId);
                    if (!key) {
                        showToast(i18n.t("module.social.messages.empty"), {
                            variant: "error",
                        });
                        return;
                    }
                    const { iv, ciphertext } = await encryptMessage(key, text);
                    const res = await apiFetch(
                        `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}/messages`,
                        {
                            method: "POST",
                            body: JSON.stringify({ ciphertext, iv }),
                        },
                    );
                    if (!res.ok) return;
                    if (input) input.value = "";
                    const list = document.getElementById(
                        "messages-thread-list",
                    );
                    if (list) {
                        await renderThread(selectedRoomId, key, list);
                    }
                });
                if (selectedRoomId) {
                    void openRoom(selectedRoomId);
                }
            },
        },
    ];

    window.addEventListener(
        "popstate",
        () => {
            const match = window.location.pathname.match(
                /^\/messages\/([^/]+)$/,
            );
            const id = match ? decodeURIComponent(match[1]) : null;
            if (id) {
                selectedRoomId = id;
                void openRoom(id);
            }
        },
        { signal },
    );

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "messages-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.social.messages.page_title"),
        },
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
