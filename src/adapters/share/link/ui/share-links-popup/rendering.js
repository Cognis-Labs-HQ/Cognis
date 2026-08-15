import { escapeHtml } from "/static/reuse/escape-html.js";
import {
    buildProfileAvatarMarkup,
    hydrateProfileAvatars,
} from "/static/reuse/avatar-utils.js";
import { openPopup } from "/static/reuse/popup.js";
import { formatDateTime } from "/static/reuse/timestamp.js";
import { copyTextToClipboard } from "/static/reuse/clipboard.js";
import { createFormBuilder } from "/static/reuse/form-builder.js";
import { renderInfoTooltip } from "/static/reuse/info-tooltip.js";
import {
    bindSecretVisibilityToggles,
    renderSecretVisibilityField,
} from "/static/reuse/secret-visibility-toggle.js";

const STYLESHEET_HREF =
    "/static/adapters/share/link/ui/share-links-popup/index.css";
let stylesheetReady = null;

export function buildRecipientAvatarMarkup(options) {
    return buildProfileAvatarMarkup(options);
}

export function hydrateRecipientAvatars(container) {
    return hydrateProfileAvatars(container);
}
export function ensureStylesheet() {
    if (stylesheetReady) return stylesheetReady;
    const existing = document.querySelector(`link[href="${STYLESHEET_HREF}"]`);
    if (existing) {
        stylesheetReady = existing.sheet
            ? Promise.resolve()
            : new Promise((resolve) => {
                  existing.addEventListener("load", resolve, { once: true });
              });
        return stylesheetReady;
    }
    const link = document.createElement("link");
    link.rel = "stylesheet";
    link.href = STYLESHEET_HREF;
    stylesheetReady = new Promise((resolve) => {
        link.addEventListener("load", resolve, { once: true });
    });
    document.head.appendChild(link);
    return stylesheetReady;
}
export function renderQuickShareActions(link, labels) {
    const quickShareActions = Array.isArray(link?.quickShareActions)
        ? link.quickShareActions
        : [];
    return quickShareActions
        .map((action) => {
            const href = String(action?.href ?? "").trim();
            const label = String(action?.label ?? "").trim();
            const id = String(action?.id ?? "").trim();
            if (!href || !label) {
                return "";
            }
            if (id === "smtp") {
                return `
          <a
            class="btn-neutral btn-animated"
            href="${escapeHtml(href)}"
            target="_blank"
            rel="noopener noreferrer"
            data-share-quick-action="${escapeHtml(id)}"
            aria-label="${escapeHtml(labels.mail)}"
            title="${escapeHtml(labels.mail)}"
          ><span class="share-links-row-mail-icon" aria-hidden="true"></span></a>
        `;
            }
            return `
        <a
          class="btn-neutral btn-animated share-links-row-quick-action"
          href="${escapeHtml(href)}"
          data-share-quick-action="${escapeHtml(id)}"
        >${escapeHtml(label)}</a>
      `;
        })
        .join("");
}
export function renderShareStatus(link, labels) {
    const expiresAt = String(link?.expiresAt ?? "").trim();
    const isExpired = link?.status === "expired";
    const statusLabel = isExpired ? labels.statusExpired : labels.statusActive;
    const statusClass = isExpired
        ? "share-links-row-status-expired"
        : "share-links-row-status-active";
    const timeLabel = expiresAt
        ? `${isExpired ? labels.expiredAtLabel : labels.expiresAtLabel}: ${formatDateTime(expiresAt)}`
        : "";
    return `
    <div class="share-links-row-status-line">
      <span class="share-links-row-status ${statusClass}">${escapeHtml(statusLabel)}</span>
      ${timeLabel ? `<span class="share-links-row-expiry">${escapeHtml(timeLabel)}</span>` : ""}
    </div>
  `;
}
export function renderRows(labels, links) {
    if (!Array.isArray(links) || links.length === 0) {
        return `<p class="share-links-empty">${escapeHtml(labels.empty)}</p>`;
    }
    return `
    <div class="share-links-list">
      ${links
          .map((link) => {
              const shareUrl = String(link?.shareUrl ?? "");
              const shareId = String(link?.id ?? "");
              const shareLabel =
                  String(link?.label ?? "").trim() || labels.untitled;
              const recipients = Array.isArray(link?.accessControls?.recipients)
                  ? link.accessControls.recipients.filter(
                        (entry) => entry?.type === "user",
                    )
                  : [];
              const isUserShare = recipients.length > 0;
              const variants = Array.isArray(link?.variants)
                  ? link.variants
                  : [];
              const createdAt = String(link?.createdAt ?? "").trim();
              return `
            <article class="share-links-row" data-share-edit="${escapeHtml(shareId)}">
              <button
                type="button"
                class="popup-close-btn btn-cancel btn-animated share-links-row-close"
                data-share-delete="${escapeHtml(shareId)}"
                aria-label="${escapeHtml(labels.revoke)}"
                title="${escapeHtml(labels.revoke)}"
              >&#x2715;</button>
              <div class="share-links-row-main">
                <div class="share-links-row-header">
                  <p class="share-links-row-label">${escapeHtml(shareLabel)}</p>
                  ${
                      isUserShare
                          ? ""
                          : `<button
                    type="button"
                    class="share-links-row-copy"
                    data-share-copy="${escapeHtml(shareUrl)}"
                    title="${escapeHtml(shareUrl)}"
                    aria-label="${escapeHtml(labels.copyLink)}: ${escapeHtml(shareUrl)}"
                  >🔗</button>`
                  }
                </div>
                ${renderShareStatus(link, labels)}
                ${createdAt ? `<p class="share-links-row-created">${escapeHtml(labels.createdAtLabel || "Created")}: ${escapeHtml(formatDateTime(createdAt))}</p>` : ""}
                ${recipients.length ? `<div class="share-links-recipients">${recipients.map((recipient) => `<span class="share-links-recipient-chip">${buildRecipientAvatarMarkup({ avatarKey: recipient.avatarKey || null, label: recipient.label || recipient.handle || recipient.id, colorSeed: recipient.handle || recipient.id, profileHandle: recipient.handle || null, avatarClass: "share-links-user-avatar", imageClass: "share-links-user-avatar-image", fallbackClass: "share-links-user-avatar-fallback" })}<span>${escapeHtml(recipient.label || recipient.id)}</span>${labels.hidePermissionLabels ? "" : `<small>${escapeHtml(recipient.permissions?.includes("write") ? labels.writePermission || "Write" : labels.readPermission || "Read")}</small>`}</span>`).join("")}</div>` : ""}
                ${!isUserShare && variants.length ? `<div class="share-links-variants">${variants.map((variant) => `<button type="button" class="share-links-variant" data-share-copy="${escapeHtml(variant.url)}" title="${escapeHtml(variant.url)}">${escapeHtml(variant.label)}</button>`).join("")}</div>` : ""}
              </div>
              ${
                  isUserShare
                      ? ""
                      : `<div class="share-links-row-share">
                <span class="share-links-row-share-label">${escapeHtml(labels.shareOptions)}</span>
                <div class="share-links-row-actions">
                  ${link.emailSupported ? `<button type="button" class="btn-neutral share-links-email-action" data-share-email="${escapeHtml(shareId)}" aria-label="${escapeHtml(labels.mail)}" title="${escapeHtml(labels.mail)}"><span class="share-links-row-mail-icon" aria-hidden="true"></span></button>` : ""}
                  ${renderQuickShareActions(link, labels)}
                </div>
              </div>`
              }
            </article>
          `;
          })
          .join("")}
    </div>
  `;
}

export function renderPasswordProtectionField(labels, state) {
    const formMarkup = createFormBuilder(
        {
            i18n: {
                t: () => labels.password,
            },
            escapeHtml,
            renderInfoTooltip,
        },
        {
            formId: "share-links-password-form",
            includeSubmitButton: false,
            submitLabelKey: "ui.reuse.save",
            fields: [
                {
                    name: "password",
                    labelKey: "password",
                    type: "password",
                    required: state.passwordRequired,
                    infoTooltip:
                        state.passwordRequired &&
                        state.activeMethodId === "link"
                            ? {
                                  text: labels.passwordRequiredInfo,
                                  ariaLabel: labels.moreInformation,
                                  id: "share-password-required",
                              }
                            : undefined,
                    value: state.password,
                    attributes: {
                        autocomplete: "new-password",
                        placeholder: labels.passwordPlaceholder,
                    },
                },
            ],
        },
    ).render();
    return `<div class="share-links-password-row">${formMarkup}<button type="button" class="btn-neutral btn-animated share-links-password-generate" data-share-generate-password aria-label="${escapeHtml(labels.generatePassword)}" title="${escapeHtml(labels.generatePassword)}"><span aria-hidden="true">&#8635;</span></button></div>`;
}

export async function showSharePasswordPopup(password, labels) {
    const normalizedPassword = String(password ?? "");
    if (!normalizedPassword) return;
    await openPopup({
        title: labels.passwordPopupTitle || labels.password,
        body: () =>
            `<div class="share-password-result">${renderSecretVisibilityField({ id: "created-share-password", value: normalizedPassword, label: labels.passwordPopupLabel || labels.password, toggleLabel: labels.passwordReveal, escapeHtml })}</div>`,
        actions: [
            {
                id: "done",
                label: labels.close || labels.done || "Close",
                variant: "neutral",
            },
        ],
        onOpen(overlay) {
            bindSecretVisibilityToggles({ root: overlay });
        },
    });
}

export function generateSharePassword() {
    const alphabet = "abcdefghijklmnopqrstuvwxyz0123456789_-";
    const characters = [];
    const randomValues = new Uint8Array(32);
    while (characters.length < 20) {
        crypto.getRandomValues(randomValues);
        for (const value of randomValues) {
            if (value >= 228) continue;
            characters.push(alphabet[value % alphabet.length]);
            if (characters.length === 20) break;
        }
    }
    return Array.from({ length: 5 }, (_, index) =>
        characters.slice(index * 4, index * 4 + 4).join(""),
    ).join("-");
}
