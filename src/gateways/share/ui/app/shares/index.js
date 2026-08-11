import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { openPopup } from "/static/reuse/popup.js";
import { mountWhenDirect } from "/static/reuse/page-entry.js";
import { showToast } from "/static/reuse/toast.js";
import { uiCtx } from "/static/reuse/ui-ctx.js";
import {
    buildShareTokenCallbacks,
    fetchShareOverview,
    rejectShare,
    revokeShare,
} from "../../reuse/share-api.js";
import { navigateAccountShare } from "../../received-share-action.js";
import { publishShareRevoked } from "../../session-events.js";

let markupTemplates = null;
let deleteConfirmationPending = false;

async function loadMarkupTemplates() {
    if (markupTemplates) return markupTemplates;
    const response = await fetch(
        "/static/gateways/share/ui/app/shares/templates.html",
    );
    if (!response.ok) throw new Error("share_templates_failed");
    const templateDocument = new DOMParser().parseFromString(
        await response.text(),
        "text/html",
    );
    markupTemplates = {
        row: templateDocument.querySelector("#shares-row-template"),
        table: templateDocument.querySelector("#shares-table-template"),
    };
    return markupTemplates;
}

function shareStatus(share, i18n) {
    const expiresAt = String(share?.expiresAt ?? "");
    return expiresAt && Date.parse(expiresAt) <= Date.now()
        ? { id: "expired", label: i18n.t("share.shares.expired") }
        : { id: "active", label: i18n.t("share.shares.active") };
}

function shareRecipients(share) {
    return Array.isArray(share?.accessControls?.recipients)
        ? share.accessControls.recipients.filter(
              (recipient) => recipient?.type === "user",
          )
        : [];
}

function relationshipCell(share, direction, i18n) {
    const wrapper = document.createElement("div");
    wrapper.className = "shares-relationship";
    const badge = document.createElement("span");
    badge.className = `shares-type shares-type--${direction}`;
    const detail = document.createElement("span");
    if (direction === "received") {
        badge.textContent = i18n.t("share.shares.received_badge");
        detail.textContent = String(
            share?.ownerDisplayName || share?.ownerAccountId || "",
        );
    } else {
        const recipients = shareRecipients(share);
        const isUserShare = recipients.length > 0;
        badge.textContent = i18n.t(
            isUserShare ? "share.shares.user_badge" : "share.shares.link_badge",
        );
        detail.textContent = isUserShare
            ? recipients
                  .map((recipient) => recipient.label || recipient.id)
                  .filter(Boolean)
                  .join(", ")
            : i18n.t("share.shares.anyone_with_link");
    }
    wrapper.append(badge, detail);
    return wrapper;
}

function createIconButton({ shareId, action, label, destructive = false }) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = destructive ? "btn-cancel" : "shares-icon-button";
    button.setAttribute(`data-share-${action}`, shareId);
    button.title = label;
    button.setAttribute("aria-label", label);
    const icon = document.createElement("span");
    icon.className = `shares-action-icon shares-action-icon--${action}`;
    icon.setAttribute("aria-hidden", "true");
    button.appendChild(icon);
    return button;
}

function renderShareRow(share, direction, i18n, rowTemplate) {
    const row = rowTemplate.content.firstElementChild.cloneNode(true);
    const shareId = String(share?.id ?? "");
    const shareUrl = String(share?.actionUrl || share?.shareUrl || "");
    const label = String(
        share?.label || share?.resourceType || share?.id || "",
    );
    row.dataset.shareId = shareId;
    const titleLink = document.createElement("a");
    titleLink.className = "shares-title-link";
    titleLink.href = shareUrl;
    titleLink.textContent = label;
    if (shareRecipients(share).length > 0) {
        titleLink.dataset.accountShareUrl = shareUrl;
    }
    row.querySelector("[data-share-title]").appendChild(titleLink);
    row.querySelector("[data-share-relationship]").appendChild(
        relationshipCell(share, direction, i18n),
    );
    const status = shareStatus(share, i18n);
    const statusBadge = document.createElement("span");
    statusBadge.className = `shares-status shares-status--${status.id}`;
    statusBadge.textContent = status.label;
    row.querySelector("[data-share-status]").appendChild(statusBadge);
    row.querySelector("[data-share-created]").textContent = share.createdAt
        ? formatDateTime(share.createdAt)
        : i18n.t("share.shares.never");
    row.querySelector("[data-share-accessed]").textContent =
        share.lastAccessedAt
            ? formatDateTime(share.lastAccessedAt)
            : i18n.t("share.shares.not_accessed");
    row.querySelector("[data-share-expires]").textContent = share.expiresAt
        ? formatDateTime(share.expiresAt)
        : i18n.t("share.shares.never");
    const actions = row.querySelector("[data-share-actions]");
    if (direction === "sent") {
        actions.appendChild(
            createIconButton({
                shareId,
                action: "manage",
                label: i18n.t("share.shares.manage"),
            }),
        );
    }
    actions.appendChild(
        createIconButton({
            shareId,
            action: direction === "sent" ? "revoke" : "reject",
            label: i18n.t(
                direction === "sent"
                    ? "share.shares.delete"
                    : "share.shares.reject",
            ),
            destructive: true,
        }),
    );
    return row;
}

function buildSharesElement(overview, i18n, templates, activeFilter = "all") {
    const shares = [
        ...overview.sent.map((share) => ({ share, direction: "sent" })),
        ...overview.received.map((share) => ({
            share,
            direction: "received",
        })),
    ].sort(
        (left, right) =>
            Date.parse(right.share.updatedAt || right.share.createdAt || 0) -
            Date.parse(left.share.updatedAt || left.share.createdAt || 0),
    );
    const visibleShares =
        activeFilter === "all"
            ? shares
            : shares.filter(({ direction }) => direction === activeFilter);
    return {
        id: "shares-overview",
        label: i18n.t("share.shares.title"),
        pinned: true,
        gridSize: {
            default: [12, Math.max(2, Math.min(8, visibleShares.length + 2))],
            min: [6, 2],
            max: "full",
        },
        render: () => {
            const section =
                templates.table.content.firstElementChild.cloneNode(true);
            section.querySelector("[data-share-total]").textContent = i18n
                .t("share.shares.total_count")
                .replace("{{count}}", String(shares.length));
            section.querySelector("[data-share-sent]").textContent = i18n
                .t("share.shares.sent_count")
                .replace("{{count}}", String(overview.sent.length));
            section.querySelector("[data-share-received]").textContent = i18n
                .t("share.shares.received_count")
                .replace("{{count}}", String(overview.received.length));
            section.querySelectorAll("[data-share-filter]").forEach((pill) => {
                const active = pill.dataset.shareFilter === activeFilter;
                pill.classList.toggle("active", active);
                pill.setAttribute("aria-pressed", String(active));
            });
            for (const [selector, key] of [
                ["[data-column-title]", "share.shares.column_title"],
                [
                    "[data-column-relationship]",
                    "share.shares.column_relationship",
                ],
                ["[data-column-status]", "share.shares.column_status"],
                ["[data-column-created]", "share.shares.column_created"],
                ["[data-column-accessed]", "share.shares.column_accessed"],
                ["[data-column-expires]", "share.shares.column_expires"],
                ["[data-column-actions]", "share.shares.column_actions"],
            ]) {
                section.querySelector(selector).textContent = i18n.t(key);
            }
            const tableBody = section.querySelector("tbody");
            tableBody.append(
                ...visibleShares.map(({ share, direction }) =>
                    renderShareRow(share, direction, i18n, templates.row),
                ),
            );
            if (visibleShares.length === 0) {
                section.querySelector("table").hidden = true;
                const empty = section.querySelector(".shares-empty");
                empty.hidden = false;
                empty.textContent = i18n.t("share.shares.empty");
            }
            return section.outerHTML;
        },
    };
}

function popupLabels(i18n) {
    const translate = (suffix) => i18n.t(`share.shares.popup_${suffix}`);
    return {
        empty: translate("empty"),
        userEmpty: translate("user_empty"),
        untitled: i18n.t("share.shares.untitled"),
        copyLink: translate("copy_link"),
        revoke: i18n.t("share.shares.delete"),
        confirm: i18n.t("ui.reuse.confirm"),
        cancel: i18n.t("share.shares.cancel"),
        close: i18n.t("ui.reuse.close"),
        shareOptions: translate("options"),
        methods: translate("options"),
        methodUnavailable: i18n.t("share.shares.update_failed"),
        mail: i18n.t("ui.reuse.mail"),
        send: translate("send"),
        emailRecipients: translate("email_recipients"),
        emailRecipientsPlaceholder: translate("email_recipients_placeholder"),
        emailRecipientsRequired: translate("email_recipients_required"),
        emailSent: translate("email_sent"),
        emailFailed: translate("email_failed"),
        label: translate("label"),
        labelPlaceholder: translate("label_placeholder"),
        expiryLabel: translate("expiry"),
        password: translate("password"),
        passwordPlaceholder: translate("password_placeholder"),
        generatePassword: translate("generate_password"),
        passwordPopupTitle: translate("password_title"),
        passwordPopupLabel: translate("password_share_instruction"),
        passwordReveal: translate("password_reveal"),
        passwordCopy: translate("password_copy"),
        passwordCopied: translate("password_copied"),
        permission: translate("permission"),
        readPermission: translate("read"),
        writePermission: translate("write"),
        accessMode: translate("permission"),
        updateLinkShare: translate("update"),
        updateUserShare: translate("update"),
        createFailed: i18n.t("share.shares.update_failed"),
        copySuccess: translate("copied"),
        copyFailed: translate("copy_failed"),
        deleteFailed: i18n.t("share.shares.update_failed"),
        deleteConfirmTitle: i18n.t("share.shares.delete_title"),
        deleteConfirmMessage: i18n.t("share.shares.delete_prompt"),
        statusActive: i18n.t("share.shares.active"),
        statusExpired: i18n.t("share.shares.expired"),
        expiresAtLabel: translate("expiry"),
        expiredAtLabel: i18n.t("share.shares.expired"),
        createdAtLabel: translate("created"),
        linkMethod: i18n.t("share.shares.link_badge"),
        userMethod: i18n.t("share.shares.user_badge"),
        users: translate("users"),
        userSearchPlaceholder: translate("user_search"),
        duplicateUserShare: translate("duplicate_user"),
        shareWithPrefix: translate("share_with"),
        usersCountLabel: translate("users_count"),
    };
}

async function openManagePopup(share, i18n) {
    const openShareLinksPopup = uiCtx.capabilities.get("share:openLinksPopup");
    if (typeof openShareLinksPopup !== "function") {
        showToast(i18n.t("share.shares.update_failed"), { variant: "error" });
        return;
    }
    const permissions = Array.isArray(share?.accessControls?.permissions)
        ? share.accessControls.permissions
        : [];
    const grantedCapabilities = Array.isArray(share?.grantedCapabilities)
        ? share.grantedCapabilities
        : [];
    const supportsReadOnly =
        share?.metadata?.supportsReadOnly === "true" ||
        !permissions.includes("write");
    const readCapabilities = grantedCapabilities.filter(
        (capability) => !String(capability).endsWith(":write"),
    );
    const linkAccessOptions = supportsReadOnly
        ? [
              {
                  id: "read",
                  label: i18n.t("share.shares.popup_read"),
                  permissions: ["read"],
                  grantedCapabilities: readCapabilities,
              },
              {
                  id: "write",
                  label: i18n.t("share.shares.popup_write"),
                  permissions: ["read", "write"],
                  grantedCapabilities,
              },
          ]
        : [];
    await openShareLinksPopup({
        title: i18n.t("share.shares.manage_title"),
        labels: popupLabels(i18n),
        initialEditingShareId: String(share.id),
        initialEditingShare: share,
        editOnly: true,
        supportsReadOnly,
        defaultGrantedCapabilities: grantedCapabilities,
        linkAccessOptions,
        ...buildShareTokenCallbacks({
            resourceType: share.resourceType,
            resourceId: share.resourceId,
            contentUrl: share.metadata?.contentUrl,
            grantedCapabilities,
            supportsReadOnly,
        }),
    });
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    applyDocumentTitle(i18n, "share.shares.title");
    const templates = await loadMarkupTemplates();
    let overview = { sent: [], received: [] };
    let activeFilter = "all";
    const loadOverview = async () => {
        try {
            overview = await fetchShareOverview();
        } catch (error) {
            console.error("[share] failed to load share overview", error);
            showToast(i18n.t("share.shares.load_failed"), {
                variant: "error",
            });
        }
    };
    await loadOverview();
    const composer = createPageComposer(root, {
        allowCustomization: false,
        preferenceKey: "shares-layout",
        i18n,
        pageContext: {
            title: i18n.t("share.shares.title"),
            subtitle: i18n.t("share.shares.subtitle"),
        },
        elements: [buildSharesElement(overview, i18n, templates, activeFilter)],
    });
    const refreshOverview = () => {
        const element = buildSharesElement(
            overview,
            i18n,
            templates,
            activeFilter,
        );
        composer.refresh([element]);
        composer.refreshElements([element.id]);
    };
    root.addEventListener(
        "click",
        async (event) => {
            if (!(event.target instanceof Element)) return;
            const accountShareLink = event.target.closest(
                "[data-account-share-url]",
            );
            if (accountShareLink instanceof HTMLAnchorElement) {
                event.preventDefault();
                const share = [...overview.sent, ...overview.received].find(
                    (entry) =>
                        String(entry.id) ===
                        accountShareLink.closest("tr")?.dataset.shareId,
                );
                await navigateAccountShare(share);
                return;
            }
            const filter = event.target.closest("[data-share-filter]");
            if (filter instanceof HTMLButtonElement) {
                activeFilter = filter.dataset.shareFilter ?? "all";
                refreshOverview();
                return;
            }
            const manageButton = event.target.closest("[data-share-manage]");
            if (manageButton instanceof HTMLButtonElement) {
                const share = overview.sent.find(
                    (entry) =>
                        String(entry.id) === manageButton.dataset.shareManage,
                );
                if (!share) return;
                await openManagePopup(share, i18n);
                await loadOverview();
                refreshOverview();
                return;
            }
            const button = event.target.closest(
                "[data-share-revoke], [data-share-reject]",
            );
            if (!(button instanceof HTMLButtonElement)) return;
            const shareId =
                button.dataset.shareRevoke ?? button.dataset.shareReject ?? "";
            const rejecting = Boolean(button.dataset.shareReject);
            if (deleteConfirmationPending) return;
            deleteConfirmationPending = true;
            let confirmed;
            try {
                confirmed = await openPopup({
                    title: i18n.t(
                        rejecting
                            ? "share.shares.reject_title"
                            : "share.shares.delete_title",
                    ),
                    body: i18n.t(
                        rejecting
                            ? "share.shares.reject_prompt"
                            : "share.shares.delete_prompt",
                    ),
                    actions: [
                        {
                            id: "confirm",
                            label: i18n.t(
                                rejecting
                                    ? "share.shares.reject"
                                    : "share.shares.delete",
                            ),
                            variant: "cancel",
                        },
                        {
                            id: "cancel",
                            label: i18n.t("ui.reuse.cancel"),
                            variant: "neutral",
                        },
                    ],
                });
            } finally {
                deleteConfirmationPending = false;
            }
            if (confirmed !== "confirm") return;
            const collection = rejecting ? "received" : "sent";
            const previousOverview = overview;
            overview = {
                ...overview,
                [collection]: overview[collection].filter(
                    (share) => String(share.id) !== shareId,
                ),
            };
            refreshOverview();
            const response = rejecting
                ? await rejectShare(shareId)
                : await revokeShare(shareId);
            showToast(
                i18n.t(
                    response.ok
                        ? "share.shares.updated"
                        : "share.shares.update_failed",
                ),
                { variant: response.ok ? "success" : "error" },
            );
            if (response.ok) {
                publishShareRevoked(shareId);
                return;
            }
            overview = previousOverview;
            refreshOverview();
        },
        { signal },
    );
    await composer.init();
    const requestedShareId = new URL(window.location.href).searchParams.get(
        "open",
    );
    if (requestedShareId) {
        const requestedShare = overview.received.find(
            (share) => String(share.id) === requestedShareId,
        );
        if (requestedShare) await navigateAccountShare(requestedShare);
    }
}

await mountWhenDirect(mount);
