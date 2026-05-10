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
import {
    getInitialsText,
    pickInitialsColor,
} from "../../reuse/avatar-utils.js";

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
    return (
        member.displayName ||
        member.username ||
        member.handle ||
        member.accountId
    );
}

function selectedRoomTitle(room, currentAccountId) {
    if (!room) return "";
    const otherMembers = (room.members ?? []).filter(
        (member) => member.accountId !== currentAccountId,
    );
    if (room.kind === "dm") {
        return (
            otherMembers.map(memberDisplayName).join(", ") ||
            room.title ||
            room.id
        );
    }
    return (
        room.title || otherMembers.map(memberDisplayName).join(", ") || room.id
    );
}

function randomSample(values, count) {
    return values
        .map((value) => ({ value, rank: Math.random() }))
        .sort((a, b) => a.rank - b.rank)
        .slice(0, count)
        .map((item) => item.value);
}

function renderMemberInitials(member) {
    const label = memberDisplayName(member);
    const color = pickInitialsColor(member.handle || member.accountId || label);
    return `<span class="messages-classroom-collage-tile" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span>`;
}

function renderRoomAvatar(room, currentAccountId) {
    if (!room) return "";
    if (room.avatarKey) {
        return `<div class="messages-thread-avatar"><img class="messages-thread-avatar-img" src="/api/v1/files/${escapeHtml(room.avatarKey)}" alt="" /></div>`;
    }
    const members = room.members ?? [];
    if (room.kind === "classroom") {
        const picked = randomSample(members, 4);
        while (picked.length < 4) picked.push({ handle: "", displayName: "" });
        return `<div class="messages-classroom-collage">${picked.map(renderMemberInitials).join("")}</div>`;
    }
    const other =
        members.find((member) => member.accountId !== currentAccountId) ??
        members[0];
    const label = other ? memberDisplayName(other) : room.title || room.id;
    const color = pickInitialsColor(other?.handle || other?.accountId || label);
    return `<div class="messages-thread-avatar"><span class="messages-thread-initials" style="--initials-bg: ${escapeHtml(color)};">${escapeHtml(getInitialsText(label))}</span></div>`;
}

function renderThreadHeader(room, currentAccountId, i18n) {
    if (!room) return "";
    const members = room.members ?? [];
    const canSetAvatar =
        room.kind === "classroom" &&
        ["teacher", "admin", "owner"].includes(
            localStorage.getItem("cognis_role") ?? "",
        );
    return `
        <header class="messages-thread-header" id="messages-thread-header">
            ${renderRoomAvatar(room, currentAccountId)}
            <div class="messages-thread-title-wrap">
                <h2 class="messages-thread-title">${escapeHtml(selectedRoomTitle(room, currentAccountId))}</h2>
                <span class="messages-thread-subtitle">${escapeHtml(String(members.length))} ${escapeHtml(i18n.t("module.social.messages.members"))}</span>
            </div>
            ${canSetAvatar ? `<label class="messages-room-avatar-btn">${escapeHtml(i18n.t("module.social.messages.set_avatar"))}<input id="messages-room-avatar-input" type="file" accept="image/*" hidden /></label>` : ""}
        </header>
    `;
}

function renderRoomList(rooms, currentAccountId, selectedRoomId, i18n) {
    if (!rooms.length) {
        return `<div class="messages-empty">${escapeHtml(i18n.t("module.social.messages.empty"))}</div>`;
    }
    return rooms
        .map((room) => {
            const titleSource = selectedRoomTitle(room, currentAccountId);
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

async function renderThread(
    roomId,
    key,
    container,
    i18n,
    currentAccountId,
    before,
) {
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
        .map((msg) => {
            const isOwn = msg.senderId === currentAccountId;
            const ownClass = isOwn ? " messages-message--own" : "";
            const senderLabel = isOwn
                ? ""
                : `<span class="messages-message-sender">${escapeHtml(msg.senderDisplayName || msg.senderHandle || msg.senderId)}</span>`;
            const timeLabel = msg.createdAt
                ? `<time class="messages-message-time" datetime="${escapeHtml(msg.createdAt)}">${escapeHtml(new Date(msg.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }))}</time>`
                : "";
            return `<div class="messages-message${ownClass}" data-message-id="${escapeHtml(msg.id)}">
            ${senderLabel}
            <span class="messages-message-body">${escapeHtml(msg.text ?? "…")}</span>
            ${timeLabel}
        </div>`;
        })
        .join("");

    const hasMore = messageList.length === 50;
    const oldestCreatedAt = ordered[0]?.createdAt ?? null;

    if (before) {
        const savedHeight = container.scrollHeight;
        container.querySelector(".messages-load-earlier-btn")?.remove();
        container.insertAdjacentHTML("afterbegin", html);
        container.scrollTop += container.scrollHeight - savedHeight;
    } else {
        container.innerHTML = html;
        container.scrollTop = container.scrollHeight;
    }

    if (hasMore && oldestCreatedAt) {
        container.insertAdjacentHTML(
            "afterbegin",
            `<button type="button" class="messages-load-earlier-btn" data-before-time="${escapeHtml(oldestCreatedAt)}">
                ${escapeHtml(i18n.t("module.social.messages.load_earlier"))}
            </button>`,
        );
    }

    return oldestCreatedAt;
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

    root.classList.add("messages-page");
    signal?.addEventListener(
        "abort",
        () => root.classList.remove("messages-page"),
        { once: true },
    );

    const currentAccountId = localStorage.getItem("cognis_account") ?? "";

    const initialPath = window.location.pathname;
    const initialRoomMatch = initialPath.match(/^\/messages\/([^/]+)$/);
    let selectedRoomId = initialRoomMatch
        ? decodeURIComponent(initialRoomMatch[1])
        : null;

    let rooms = await loadRooms();
    if (signal?.aborted) return;

    async function loadRoom(roomId) {
        const res = await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}`,
        );
        if (!res.ok) return null;
        return (await res.json()).data ?? null;
    }

    async function openRoom(roomId) {
        const threadList = document.getElementById("messages-thread-list");
        const headerSlot = document.getElementById(
            "messages-thread-header-slot",
        );
        if (!threadList) return;
        const room = await loadRoom(roomId);
        if (headerSlot && room) {
            headerSlot.innerHTML = renderThreadHeader(
                room,
                currentAccountId,
                i18n,
            );
            bindRoomHeaderEvents();
        }
        const key = await getRoomKey(roomId);
        await renderThread(roomId, key, threadList, i18n, currentAccountId);
        await apiFetch(
            `/api/v1/messages/rooms/${encodeURIComponent(roomId)}/read`,
            { method: "POST" },
        ).catch(() => undefined);
    }

    function extensionFromType(type) {
        const normalized = (type || "").split(";")[0].toLowerCase();
        if (normalized === "image/png") return "png";
        if (normalized === "image/webp") return "webp";
        if (normalized === "image/gif") return "gif";
        return "jpg";
    }

    function bindRoomHeaderEvents() {
        const input = document.getElementById("messages-room-avatar-input");
        input?.addEventListener("change", async () => {
            const file = input.files?.[0];
            if (!file || !selectedRoomId) return;
            const ext = extensionFromType(file.type);
            const key = `chatrooms/${selectedRoomId}-${Date.now()}.${ext}`;
            const buffer = await file.arrayBuffer();
            const upload = await apiFetch(`/api/v1/files/${key}`, {
                method: "PUT",
                headers: { "content-type": file.type || "image/jpeg" },
                body: buffer,
            });
            if (!upload.ok) return;
            const update = await apiFetch(
                `/api/v1/messages/rooms/${encodeURIComponent(selectedRoomId)}`,
                {
                    method: "PATCH",
                    headers: { "content-type": "application/json" },
                    body: JSON.stringify({ avatarKey: key }),
                },
            );
            if (update.ok) await openRoom(selectedRoomId);
        });
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

    const sidebarHtml = `<div class="messages-sidebar-content">
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
    </div>`;

    const elements = [
        {
            id: "messages-thread",
            label: i18n.t("module.social.messages.page_title"),
            gridSize: { default: [12, 8], min: [4, 4], max: "full" },
            render: () =>
                `<section class="messages-thread">
                    <div id="messages-thread-header-slot"></div>
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
                    const beforeTime = button.getAttribute("data-before-time");
                    if (!beforeTime) return;
                    const key = await getRoomKey(selectedRoomId);
                    await renderThread(
                        selectedRoomId,
                        key,
                        threadList,
                        i18n,
                        currentAccountId,
                        beforeTime,
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
                            currentAccountId,
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

    function bindSidebarEvents() {
        const roomsList = document.getElementById("messages-rooms-list");
        roomsList?.addEventListener("click", async (clickEvent) => {
            const item = clickEvent.target.closest("[data-room-id]");
            if (!item) return;
            const id = item.getAttribute("data-room-id");
            selectedRoomId = id;
            roomsList
                .querySelectorAll(".messages-room--active")
                .forEach((activeItem) =>
                    activeItem.classList.remove("messages-room--active"),
                );
            item.classList.add("messages-room--active");
            history.pushState({}, "", `/messages/${encodeURIComponent(id)}`);
            await openRoom(id);
        });

        const newBtn = document.getElementById("messages-new-btn");
        const lookupWrap = document.getElementById("messages-lookup-wrap");
        const lookupInput = document.getElementById("messages-lookup-input");
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
                    showToast(i18n.t("ui.app.profile.message_hidden_toast"), {
                        variant: "error",
                    });
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
                showToast(i18n.t("module.social.messages.start_failed"), {
                    variant: "error",
                });
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
    }

    const composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "messages-layout",
        i18n,
        toolbar: sidebarHtml,
        pageContext: {
            title: i18n.t("module.social.messages.page_title"),
        },
        onRender: bindSidebarEvents,
    });

    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
