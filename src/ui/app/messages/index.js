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
    for (let i = 0; i < out.length; i += 1) {
        out[i] = parseInt(hex.slice(i * 2, i * 2 + 2), 16);
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
    const initVector = crypto.getRandomValues(new Uint8Array(12));
    const ciphertext = await crypto.subtle.encrypt(
        { name: "AES-GCM", iv: initVector },
        key,
        TEXT_ENCODER.encode(plaintext),
    );
    return {
        iv: bytesToHex(initVector),
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

function memberDisplayName(member) {
    return member.displayName || member.handle || member.accountId;
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
                otherMembers.map(memberDisplayName).join(", ") ||
                room.id;
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

async function renderThread(roomId, key, container, i18n, before) {
    const params = new URLSearchParams({ limit: "50" });
    if (before) params.set("before", before);
    const res = await apiFetch(
        `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/messages?${params}`,
    );
    if (!res.ok) {
        if (!before) container.innerHTML = "";
        return null;
    }
    const payload = await res.json();
    const messageList = payload?.data ?? [];
    const ordered = messageList.slice().reverse();
    const decoded = await Promise.all(
        ordered.map(async (msg) => {
            const text = key
                ? await decryptMessage(key, msg.iv, msg.ciphertext)
                : null;
            return { ...msg, text };
        }),
    );
    const html = decoded
        .map(
            (msg) =>
                `<div class="messages-message" data-message-id="${escapeHtml(msg.id)}">
            <span class="messages-message-sender">${escapeHtml(msg.senderHandle || msg.senderDisplayName || msg.senderId)}</span>
            <span class="messages-message-body">${escapeHtml(msg.text ?? "…")}</span>
        </div>`,
        )
        .join("");

    const hasMore = messageList.length === 50;
    const oldestId = ordered[0]?.id ?? null;

    if (before) {
        const savedHeight = container.scrollHeight;
        container.querySelector(".messages-load-earlier-btn")?.remove();
        container.insertAdjacentHTML("afterbegin", html);
        container.scrollTop += container.scrollHeight - savedHeight;
    } else {
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    if (hasMore && oldestId) {
        container.insertAdjacentHTML(
            "afterbegin",
            `<button type="button" class="messages-load-earlier-btn" data-oldest-id="${escapeHtml(oldestId)}">
                ${escapeHtml(i18n.t("module.social.messages.load_earlier"))}
            </button>`,
        );
    }

    return oldestId;
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

    let rooms = await loadRooms();
    if (signal?.aborted) return;

    async function openRoom(roomId) {
        const threadList = document.getElementById("messages-thread-list");
        if (!threadList) return;
        const key = await getRoomKey(roomId);
        await renderThread(roomId, key, threadList, i18n);
        await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/read`,
            { method: "POST" },
        ).catch(() => undefined);
    }

    async function reloadRoomsList() {
        rooms = await loadRooms();
        const roomsList = document.getElementById("messages-rooms-list");
        if (roomsList) {
            roomsList.innerHTML = renderRoomList(
                rooms,
                currentAccountId,
                selectedRoomId,
                i18n,
            );
        }
    }

    const elements = [
        {
            id: "messages-rooms",
            label: i18n.t("module.social.messages.page_title"),
            gridSize: { default: [3, 8], min: [2, 4], max: "full" },
            render: () =>
                `<aside class="messages-rooms">
                    <header class="messages-rooms-header">
                        <button type="button" class="messages-new-btn" id="messages-new-btn">
                            ${escapeHtml(i18n.t("module.social.messages.new"))}
                        </button>
                    </header>
                    <div class="messages-lookup-wrap" id="messages-lookup-wrap" hidden>
                        <input
                            type="search"
                            id="messages-lookup-input"
                            class="messages-lookup-input"
                            placeholder="${escapeHtml(i18n.t("module.social.messages.lookup_placeholder"))}"
                            autocomplete="off"
                        />
                        <ul class="messages-lookup-results" id="messages-lookup-results"></ul>
                    </div>
                    <ul class="messages-rooms-list" id="messages-rooms-list">
                        ${renderRoomList(rooms, currentAccountId, selectedRoomId, i18n)}
                    </ul>
                </aside>`,
            onRender: () => {
                const roomsList = document.getElementById(
                    "messages-rooms-list",
                );
                roomsList?.addEventListener("click", async (clickEvent) => {
                    const item = clickEvent.target.closest("[data-room-id]");
                    if (!item) return;
                    const id = item.getAttribute("data-room-id");
                    selectedRoomId = id;
                    roomsList
                        .querySelectorAll(".messages-room--active")
                        .forEach((activeItem) =>
                            activeItem.classList.remove(
                                "messages-room--active",
                            ),
                        );
                    item.classList.add("messages-room--active");
                    history.pushState(
                        {},
                        "",
                        `/messages/${encodeURIComponent(id)}`,
                    );
                    await openRoom(id);
                });

                const newBtn = document.getElementById("messages-new-btn");
                const lookupWrap = document.getElementById(
                    "messages-lookup-wrap",
                );
                const lookupInput = document.getElementById(
                    "messages-lookup-input",
                );
                const lookupResults = document.getElementById(
                    "messages-lookup-results",
                );

                newBtn?.addEventListener("click", () => {
                    if (lookupWrap.hasAttribute("hidden")) {
                        lookupWrap.removeAttribute("hidden");
                        lookupInput?.focus();
                    } else {
                        lookupWrap.setAttribute("hidden", "");
                    }
                });

                let lookupDebounce = null;
                lookupInput?.addEventListener("input", () => {
                    clearTimeout(lookupDebounce);
                    lookupDebounce = setTimeout(async () => {
                        const query = (lookupInput.value ?? "").trim();
                        if (!query) {
                            lookupResults.innerHTML = "";
                            return;
                        }
                        const lookupRes = await apiFetch(
                            `/api/v1/messages/users/lookup?q=${encodeURIComponent(query)}`,
                        );
                        if (lookupRes.status === 403) {
                            lookupWrap.setAttribute("hidden", "");
                            showToast(
                                i18n.t("ui.app.profile.message_hidden_toast"),
                                { variant: "error" },
                            );
                            return;
                        }
                        if (!lookupRes.ok) return;
                        const lookupPayload = await lookupRes.json();
                        const candidates = lookupPayload?.data ?? [];
                        lookupResults.innerHTML = candidates
                            .map(
                                (candidate) =>
                                    `<li class="messages-lookup-result"
                                        data-account-id="${escapeHtml(candidate.accountId)}"
                                        data-handle="${escapeHtml(candidate.handle)}">
                                        ${escapeHtml(candidate.displayName || candidate.handle)}
                                    </li>`,
                            )
                            .join("");
                    }, 300);
                });

                lookupResults?.addEventListener("click", async (clickEvent) => {
                    const item = clickEvent.target.closest("[data-handle]");
                    if (!item) return;
                    const handle = item.getAttribute("data-handle");
                    const createRes = await apiFetch("/api/v1/messages/rooms", {
                        method: "POST",
                        body: JSON.stringify({ handles: [handle] }),
                    });
                    if (!createRes.ok) {
                        showToast(
                            i18n.t("module.social.messages.start_failed"),
                            { variant: "error" },
                        );
                        return;
                    }
                    const createPayload = await createRes.json();
                    const newRoomId = createPayload?.data?.id;
                    if (!newRoomId) return;
                    lookupWrap.setAttribute("hidden", "");
                    lookupInput.value = "";
                    lookupResults.innerHTML = "";
                    selectedRoomId = newRoomId;
                    history.pushState(
                        {},
                        "",
                        `/messages/${encodeURIComponent(newRoomId)}`,
                    );
                    await openRoom(newRoomId);
                    await reloadRoomsList();
                });
            },
        },
        {
            id: "messages-thread",
            label: i18n.t("module.social.messages.page_title"),
            gridSize: { default: [9, 8], min: [4, 4], max: "full" },
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
                const threadList = document.getElementById(
                    "messages-thread-list",
                );
                const form = document.getElementById("messages-composer");

                threadList?.addEventListener("click", async (clickEvent) => {
                    const button = clickEvent.target.closest(
                        ".messages-load-earlier-btn",
                    );
                    if (!button || !selectedRoomId) return;
                    const oldestId = button.getAttribute("data-oldest-id");
                    if (!oldestId) return;
                    const key = await getRoomKey(selectedRoomId);
                    await renderThread(
                        selectedRoomId,
                        key,
                        threadList,
                        i18n,
                        oldestId,
                    );
                });

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
                        showToast(
                            i18n.t("module.social.messages.key_unavailable"),
                            {
                                variant: "error",
                            },
                        );
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
                    if (threadList) {
                        await renderThread(
                            selectedRoomId,
                            key,
                            threadList,
                            i18n,
                        );
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
