import {
    renderAuthBrandline,
    renderAuthLayout,
} from "/static/reuse/auth-layout.js";
import {
    renderAuthFooter,
    mountAuthFooter,
} from "/static/reuse/auth-footer.js";
import { footerLinks } from "/static/reuse/footer-links.js";
import { createI18n, applyStaticTranslations } from "/static/reuse/i18n.js";
import { createSsoLoginButton } from "/static/gateways/auth/login-page/sso-buttons.js";

try {
    const language = new URLSearchParams(location.search).get("lang") ?? "en";
    document.documentElement.lang = language;
    const i18n = await createI18n({
        preferredLanguages: [language],
        componentStringBaseUrls: ["/static/gateways/auth/languages"],
    });
    const labels = (await (await fetch("/labels.json")).json())[language];
    const brand = renderAuthBrandline(
        "Cognis",
        i18n.t("ui.app.login.hero.tagline"),
    );
    const content = document.querySelector("#form").content.cloneNode(true);
    applyStaticTranslations(i18n, content);
    const container = document.createElement("div");
    container.append(content);
    const root = document.querySelector("#app");
    root.innerHTML = renderAuthLayout({
        introPanelAriaLabel: i18n.t("ui.app.login.intro.aria"),
        introPanelHtml: brand,
        formPanelAriaLabel: i18n.t("ui.app.login.title"),
        formPanelHtml:
            renderAuthBrandline(
                "Cognis",
                i18n.t("ui.app.login.hero.tagline"),
                "auth-brandline--panel-mobile",
            ) +
            container.innerHTML +
            renderAuthFooter(),
    });
    labels.forEach((label, index) =>
        footerLinks.add({
            id: `fixture-${index}`,
            href: `/legal/${index}`,
            label,
            side: index ? "right" : "left",
            contexts: ["authentication"],
        }),
    );
    mountAuthFooter(root, { i18n });
    root.querySelector(".sso-buttons").append(
        createSsoLoginButton(
            {
                id: "fixture",
                loginButton: {
                    label: labels[1],
                    iconUrl: "/static/assets/icons/cognis-icon-384.png",
                },
            },
            () => {},
        ),
    );
    document.body.dataset.pageReady = "true";
    window.fixture = {
        async loadFont() {
            const font = new FontFace(
                "Orbitron",
                'url("/static/styles/fonts/orbitron-variable.ttf")',
            );
            await font.load();
            document.fonts.add(font);
            await document.fonts.ready;
            await new Promise((resolve) =>
                requestAnimationFrame(() => requestAnimationFrame(resolve)),
            );
        },
    };
} catch (error) {
    window.fixture = { error: error.message };
}
