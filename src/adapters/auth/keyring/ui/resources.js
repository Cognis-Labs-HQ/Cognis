let keyringI18nPromise = null;

export function loadKeyringI18n() {
    keyringI18nPromise ??= import("/static/reuse/i18n.js").then(
        ({ createI18n }) =>
            createI18n({
                componentStringBaseUrls: [
                    "/static/adapters/auth/keyring/languages",
                ],
            }),
    );
    return keyringI18nPromise;
}

export async function ensureKeyringFormStyles() {
    const { ensurePageStylesheet } =
        await import("/static/reuse/page-styles.js");
    await ensurePageStylesheet("/static/styles/reuse/page-sections.css");
}
