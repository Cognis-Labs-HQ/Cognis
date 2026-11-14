import { createI18n } from "/static/reuse/i18n.js";

/** Prepare the same Messages catalogs for providers and pages. @returns {Promise<object>} Messages translator. */
export function createMessagesI18n() {
    return createI18n({
        componentStringBaseUrls: [
            "/static/adapters/social/messages/languages",
            "/static/gateways/social/languages",
        ],
    });
}
