import { applyDocumentTitle, createI18n } from "/static/reuse/i18n.js";
import { createPageComposer } from "/static/reuse/page-composer/index.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { openPopup } from "/static/reuse/popup.js";
import { showToast } from "/static/reuse/toast.js";
import {
    fetchShareOverview,
    rejectShare,
    revokeShare,
} from "../../reuse/share-api.js";

let markupTemplates = null;

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
        card: templateDocument.querySelector("#shares-card-template"),
        section: templateDocument.querySelector("#shares-section-template"),
    };
    return markupTemplates;
}

function createAction({
    label,
    href = "",
    attribute = "",
    value = "",
    className,
}) {
    const action = document.createElement(href ? "a" : "button");
    action.className = className;
    action.textContent = label;
    if (action instanceof HTMLAnchorElement) action.href = href;
    if (action instanceof HTMLButtonElement) action.type = "button";
    if (attribute) action.setAttribute(attribute, value);
    return action;
}

function shareStatus(share, i18n) {
    const expiresAt = String(share?.expiresAt ?? "");
    return expiresAt && Date.parse(expiresAt) <= Date.now()
        ? i18n.t("share.shares.expired")
        : i18n.t("share.shares.active");
}

function renderShareCard(share, mode, i18n, cardTemplate) {
    const shareId = String(share?.id ?? "");
    const label = String(
        share?.label || share?.resourceType || share?.id || "",
    );
    const shareUrl = String(share?.shareUrl ?? "");
    const contentUrl = String(share?.metadata?.contentUrl ?? "");
    const expiresAt = String(share?.expiresAt ?? "");
    const dateLabel = expiresAt
        ? formatDateTime(expiresAt)
        : i18n.t("share.shares.never");
    const card = cardTemplate.content.firstElementChild.cloneNode(true);
    card.dataset.shareId = shareId;
    card.querySelector("h3").textContent = label;
    card.querySelector("p").textContent =
        `${shareStatus(share, i18n)} · ${dateLabel}`;
    const actions = card.querySelector(".shares-card-actions");
    if (shareUrl) {
        actions.appendChild(
            createAction({
                label: i18n.t("share.shares.open"),
                href: shareUrl,
                className: "btn-confirm btn-animated",
            }),
        );
    }
    if (mode === "sent" && contentUrl) {
        actions.appendChild(
            createAction({
                label: i18n.t("share.shares.manage"),
                href: contentUrl,
                className: "btn-neutral btn-animated",
            }),
        );
    }
    actions.appendChild(
        createAction({
            label: i18n.t(
                mode === "sent" ? "share.shares.delete" : "share.shares.reject",
            ),
            attribute:
                mode === "sent" ? "data-share-revoke" : "data-share-reject",
            value: shareId,
            className: "btn-cancel btn-animated",
        }),
    );
    return card.outerHTML;
}

function buildSection(id, title, shares, mode, i18n, templates) {
    return {
        id,
        label: title,
        pinned: true,
        gridSize: { default: [12, 5], min: [6, 3], max: "full" },
        render: () => {
            const section =
                templates.section.content.firstElementChild.cloneNode(true);
            section.querySelector("h2").textContent = title;
            const list = section.querySelector(".shares-list");
            if (shares.length) {
                list.innerHTML = shares
                    .map((share) =>
                        renderShareCard(share, mode, i18n, templates.card),
                    )
                    .join("");
            } else {
                const empty = document.createElement("p");
                empty.className = "shares-empty";
                empty.textContent = i18n.t("share.shares.empty");
                list.appendChild(empty);
            }
            return section.outerHTML;
        },
    };
}

export async function mount(root, { signal } = {}) {
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/gateways/share/languages"],
    });
    applyDocumentTitle(i18n, "share.shares.title");
    const templates = await loadMarkupTemplates();
    let overview = { sent: [], received: [] };
    try {
        overview = await fetchShareOverview();
    } catch {
        showToast(i18n.t("share.shares.load_failed"), { variant: "error" });
    }
    const composer = createPageComposer(root, {
        allowCustomization: false,
        preferenceKey: "shares-layout",
        i18n,
        pageContext: {
            title: i18n.t("share.shares.title"),
            subtitle: i18n.t("share.shares.subtitle"),
        },
        elements: [
            buildSection(
                "sent-shares",
                i18n.t("share.shares.sent"),
                overview.sent,
                "sent",
                i18n,
                templates,
            ),
            buildSection(
                "received-shares",
                i18n.t("share.shares.received"),
                overview.received,
                "received",
                i18n,
                templates,
            ),
        ],
    });
    root.addEventListener(
        "click",
        async (event) => {
            if (!(event.target instanceof Element)) return;
            const button = event.target.closest(
                "[data-share-revoke], [data-share-reject]",
            );
            if (!(button instanceof HTMLButtonElement)) return;
            const shareId =
                button.dataset.shareRevoke ?? button.dataset.shareReject ?? "";
            const rejecting = Boolean(button.dataset.shareReject);
            const confirmed = await openPopup({
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
            if (confirmed !== "confirm") return;
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
                button.closest("[data-share-id]")?.remove();
            }
        },
        { signal },
    );
    await composer.init();
}

await mount(document.querySelector("#app"));
