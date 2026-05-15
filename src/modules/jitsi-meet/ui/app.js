import { apiFetch } from "/static/reuse/api-client.js";
import {
    applyDocumentTitle,
    createI18n,
    readPreferredLanguages,
} from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer.js";
import { escapeHtml } from "/static/reuse/escape-html.js";
import { showToast } from "/static/reuse/toast.js";
import { navigateTo } from "/static/reuse/app-router.js";
import { MODULE_STRING_BASE_URL } from "/static/modules/jitsi-meet/reuse/paths.js";

let i18n = null;
let root = null;
let composer = null;
let contacts = [];
let selectedContact = null;
let activeSession = null;
let activeNativeChatRoomId = null;

function getCurrentAccountId() {
    return String(localStorage.getItem("cognis_account") ?? "").trim();
}

async function loadContacts(query) {
    const requestUrl = new URL(
        "/api/v1/messages/users/lookup",
        window.location.origin,
    );
    if (query.trim()) {
        requestUrl.searchParams.set("q", query.trim());
    }
    const response = await apiFetch(
        `${requestUrl.pathname}${requestUrl.search}`,
    );
    if (!response.ok) return [];
    const payload = await response.json();
    return Array.isArray(payload?.data) ? payload.data : [];
}

async function resolveNativeChatRoom(targetAccountId) {
    const response = await apiFetch("/api/v1/messages/rooms");
    if (!response.ok) return null;
    const payload = await response.json();
    const roomRows = Array.isArray(payload?.data) ? payload.data : [];
    const currentAccountId = getCurrentAccountId();

    const matchingRoom = roomRows.find((roomRow) => {
        if (roomRow?.kind !== "dm") return false;
        const memberIds = Array.isArray(roomRow?.members)
            ? roomRow.members
                  .map((memberRow) => String(memberRow?.accountId ?? "").trim())
                  .filter(Boolean)
            : [];
        return (
            memberIds.includes(currentAccountId) &&
            memberIds.includes(String(targetAccountId ?? "").trim())
        );
    });

    return matchingRoom?.id ?? null;
}

function renderContacts() {
    if (!contacts.length) {
        return `<p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.contacts_empty"))}</p>`;
    }

    return contacts
        .map((contact) => {
            const isActive =
                selectedContact &&
                String(selectedContact.accountId) === String(contact.accountId);
            const className = isActive
                ? "jitsi-meet-contact jitsi-meet-contact--active"
                : "jitsi-meet-contact";
            return `
        <button type="button" class="${className}" data-contact-id="${escapeHtml(
            contact.accountId,
        )}">
          <strong>${escapeHtml(contact.displayName ?? contact.handle ?? contact.accountId)}</strong>
          <span class="jitsi-meet-contact-meta">@${escapeHtml(
              contact.handle ?? contact.accountId,
          )}</span>
        </button>
      `;
        })
        .join("");
}

function renderSessionPanel() {
    if (!activeSession) {
        return `<p class="jitsi-meet-empty">${escapeHtml(i18n.t("module.jitsi_meet.no_active_session"))}</p>`;
    }

    const nativeChatStatus = activeNativeChatRoomId
        ? i18n.t("module.jitsi_meet.native_chat_found")
        : i18n.t("module.jitsi_meet.native_chat_missing");

    return `
    <div class="jitsi-meet-session-meta">
      <p><strong>${escapeHtml(i18n.t("module.jitsi_meet.room_label"))}</strong> ${escapeHtml(
          activeSession.roomSlug,
      )}</p>
      <p><strong>${escapeHtml(i18n.t("module.jitsi_meet.participant_label"))}</strong> ${escapeHtml(
          activeSession.participant?.displayName ??
              activeSession.participant?.handle,
      )}</p>
      <p><strong>${escapeHtml(i18n.t("module.jitsi_meet.native_chat_label"))}</strong> ${escapeHtml(nativeChatStatus)}</p>
    </div>
    <div class="jitsi-meet-session-actions">
      <button type="button" class="btn-animated" data-open-native-chat>
        ${escapeHtml(i18n.t("module.jitsi_meet.open_native_chat"))}
      </button>
      <button type="button" class="btn-animated" data-refresh-native-chat>
        ${escapeHtml(i18n.t("module.jitsi_meet.refresh_native_chat"))}
      </button>
      <button type="button" class="btn-animated" data-open-pip>
        ${escapeHtml(i18n.t("module.jitsi_meet.open_pip"))}
      </button>
      <a class="btn-animated" href="${escapeHtml(activeSession.joinUrl)}" target="_blank" rel="noopener noreferrer">
        ${escapeHtml(i18n.t("module.jitsi_meet.open_new_tab"))}
      </a>
    </div>
    <div class="jitsi-meet-iframe-wrap">
      <iframe
        class="jitsi-meet-iframe"
        src="${escapeHtml(activeSession.joinUrl)}"
        allow="camera; microphone; display-capture; picture-in-picture; fullscreen"
        referrerpolicy="strict-origin-when-cross-origin"
      ></iframe>
    </div>
  `;
}

function buildMainContent() {
    return `
    <div class="jitsi-meet-layout">
      <section class="jitsi-meet-panel">
        <label class="jitsi-meet-field">
          <span>${escapeHtml(i18n.t("module.jitsi_meet.search_label"))}</span>
          <input type="search" name="contactSearch" placeholder="${escapeHtml(
              i18n.t("module.jitsi_meet.search_placeholder"),
          )}" />
        </label>
        <div class="jitsi-meet-actions">
          <button type="button" class="btn-animated" data-search-contacts>
            ${escapeHtml(i18n.t("module.jitsi_meet.search_button"))}
          </button>
          <button type="button" class="btn-animated" data-start-session>
            ${escapeHtml(i18n.t("module.jitsi_meet.start_button"))}
          </button>
        </div>
        <div class="jitsi-meet-contact-list" data-contact-list>
          ${renderContacts()}
        </div>
      </section>
      <section class="jitsi-meet-session" data-session-panel>
        ${renderSessionPanel()}
      </section>
    </div>
  `;
}

async function refreshNativeChatRoom() {
    if (!activeSession?.participant?.accountId) {
        activeNativeChatRoomId = null;
        return;
    }
    activeNativeChatRoomId = await resolveNativeChatRoom(
        activeSession.participant.accountId,
    );
}

async function startSession() {
    if (!selectedContact?.handle) {
        showToast(i18n.t("module.jitsi_meet.select_contact_warning"), {
            variant: "warning",
        });
        return;
    }

    const response = await apiFetch("/api/v1/modules/jitsi-meet/session", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ participantHandle: selectedContact.handle }),
    });

    if (!response.ok) {
        showToast(i18n.t("module.jitsi_meet.session_failed"), {
            variant: "error",
        });
        return;
    }

    const payload = await response.json();
    activeSession = payload?.data ?? null;
    await refreshNativeChatRoom();
    composer.refresh(elements);
}

async function openPictureInPicture() {
    if (!activeSession?.joinUrl) return;
    if (
        !("documentPictureInPicture" in window) ||
        typeof window.documentPictureInPicture?.requestWindow !== "function"
    ) {
        showToast(i18n.t("module.jitsi_meet.pip_not_supported"), {
            variant: "warning",
        });
        return;
    }

    const pipWindow = await window.documentPictureInPicture.requestWindow({
        width: 520,
        height: 360,
    });
    pipWindow.document.body.style.margin = "0";
    pipWindow.document.body.innerHTML = `
    <iframe
      src="${escapeHtml(activeSession.joinUrl)}"
      style="width:100vw;height:100vh;border:0;background:#000"
      allow="camera; microphone; display-capture; picture-in-picture; fullscreen"
      referrerpolicy="strict-origin-when-cross-origin"
    ></iframe>
  `;
}

async function bindEvents(containerRoot) {
    const searchButton = containerRoot.querySelector("[data-search-contacts]");
    const startButton = containerRoot.querySelector("[data-start-session]");
    const searchInput = containerRoot.querySelector(
        'input[name="contactSearch"]',
    );

    if (searchButton instanceof HTMLButtonElement) {
        searchButton.addEventListener("click", async () => {
            const query =
                searchInput instanceof HTMLInputElement
                    ? searchInput.value
                    : "";
            contacts = await loadContacts(query);
            selectedContact = null;
            composer.refresh(elements);
        });
    }

    if (startButton instanceof HTMLButtonElement) {
        startButton.addEventListener("click", () => {
            void startSession();
        });
    }

    containerRoot
        .querySelectorAll("[data-contact-id]")
        .forEach((buttonElement) => {
            if (!(buttonElement instanceof HTMLButtonElement)) return;
            buttonElement.addEventListener("click", () => {
                const contactId = buttonElement.dataset.contactId;
                selectedContact =
                    contacts.find(
                        (contact) =>
                            String(contact.accountId) === String(contactId),
                    ) ?? null;
                composer.refresh(elements);
            });
        });

    const openNativeChatButton = containerRoot.querySelector(
        "[data-open-native-chat]",
    );
    if (openNativeChatButton instanceof HTMLButtonElement) {
        openNativeChatButton.addEventListener("click", () => {
            if (!activeNativeChatRoomId) {
                showToast(i18n.t("module.jitsi_meet.native_chat_missing"), {
                    variant: "warning",
                });
                return;
            }
            navigateTo(
                `/messages/${encodeURIComponent(activeNativeChatRoomId)}`,
            );
        });
    }

    const refreshNativeChatButton = containerRoot.querySelector(
        "[data-refresh-native-chat]",
    );
    if (refreshNativeChatButton instanceof HTMLButtonElement) {
        refreshNativeChatButton.addEventListener("click", async () => {
            await refreshNativeChatRoom();
            composer.refresh(elements);
        });
    }

    const pipButton = containerRoot.querySelector("[data-open-pip]");
    if (pipButton instanceof HTMLButtonElement) {
        pipButton.addEventListener("click", () => {
            void openPictureInPicture();
        });
    }
}

const elements = [
    {
        id: "jitsi-meet-main",
        label: "module.jitsi_meet.page_title",
        pinned: true,
        render: buildMainContent,
        onRender(rootElement) {
            void bindEvents(rootElement);
        },
    },
];

export async function mount(targetRoot) {
    root = targetRoot;
    i18n = await createI18n({
        preferredLanguages: readPreferredLanguages(),
        componentStringBaseUrls: [MODULE_STRING_BASE_URL],
    });

    applyDocumentTitle(i18n, "module.jitsi_meet.page_title");
    elements[0].label = i18n.t("module.jitsi_meet.page_title");

    contacts = await loadContacts("");

    composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "jitsi-meet-layout",
        i18n,
        pageContext: {
            title: i18n.t("module.jitsi_meet.page_title"),
            subtitle: i18n.t("module.jitsi_meet.page_subtitle"),
        },
    });

    await composer.init();
}

if (!globalThis.__spaRouter) {
    await mount(document.querySelector("#app"));
}
