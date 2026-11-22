export async function loadKeyringI18n() {
    const { createI18n } = await import("/static/reuse/i18n.js");
    return createI18n({
        componentStringBaseUrls: ["/static/adapters/auth/keyring/languages"],
    });
}

export async function ensureKeyringFormStyles() {
    const { ensurePageStylesheet } =
        await import("/static/reuse/page-styles.js");
    await ensurePageStylesheet("/static/styles/reuse/page-sections.css");
}
