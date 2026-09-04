/**
 * Renders declarative settings and administration content with shared markup.
 *
 * Public exports:
 *   renderStructuredContent(groups) — Renders structured groups and inserts dividers between them.
 *
 * Usage:
 *   renderStructuredContent([
 *     {
 *       id: "notifications",
 *       items: [
 *         { type: "title", text: "Notifications" },
 *         { type: "text", text: "Choose when to be notified." },
 *         { type: "button", id: "save-notifications", text: "Save" },
 *       ],
 *     },
 *   ]);
 *
 * @param {Array<{id?: string, items: Array<Record<string, unknown>>}>} groups
 *   Ordered content groups. A divider is generated between adjacent groups.
 * @returns {string} Escaped HTML using the shared structured-content classes.
 */

import { escapeHtml } from "./escape-html.js";
import { renderInfoTooltip } from "./info-tooltip.js";

function renderAttributes(item) {
    const attributes = [];
    if (item.id) attributes.push(`id="${escapeHtml(item.id)}"`);
    if (item.name) attributes.push(`name="${escapeHtml(item.name)}"`);
    if (item.disabled === true) attributes.push("disabled");
    if (item.checked === true) attributes.push("checked");
    if (item.ariaLabel) {
        attributes.push(`aria-label="${escapeHtml(item.ariaLabel)}"`);
    }
    return attributes.join(" ");
}

function renderItem(item) {
    const text = escapeHtml(item.text ?? "");
    switch (item.type) {
        case "title":
            return `<h3 class="structured-content__title">${text}${item.hint ? ` ${renderInfoTooltip(item.hint, item.hintAriaLabel, item.id ? `${item.id}-hint` : undefined)}` : ""}</h3>`;
        case "subheading":
            return `<h4 class="structured-content__subheading">${text}</h4>`;
        case "text":
            return `<p class="structured-content__text">${text}</p>`;
        case "button":
            return `<button class="structured-content__button btn-animated${item.variant === "confirm" ? " btn-confirm" : ""}${item.variant === "danger" ? " btn-cancel" : ""}" type="button" ${renderAttributes(item)}>${text}</button>`;
        case "toggle":
            return `<label class="structured-content__control switch"${item.label ? ` aria-label="${escapeHtml(item.label)}"` : ""}><input type="checkbox" ${renderAttributes(item)} /><span class="slider"></span></label>`;
        case "divider":
            return '<hr class="structured-content__divider" />';
        default:
            return "";
    }
}

export function renderStructuredContent(groups) {
    return (groups ?? [])
        .map((group, groupIndex) => {
            const divider =
                groupIndex === 0
                    ? ""
                    : '<hr class="structured-content__divider" />';
            const groupId = group.id
                ? ` data-structured-group="${escapeHtml(group.id)}"`
                : "";
            return `${divider}<section class="structured-content__group"${groupId}>${(group.items ?? []).map(renderItem).join("")}</section>`;
        })
        .join("");
}
