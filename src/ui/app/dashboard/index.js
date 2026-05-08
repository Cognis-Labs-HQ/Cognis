import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import {
    formatDate,
    formatDateTime,
    getEffectiveTimezone,
} from "../../reuse/timestamp.js";

const root = document.querySelector("#app");
const i18n = await createI18n();
applyDocumentTitle(i18n, "ui.page.title.dashboard");

const account = localStorage.getItem("cognis_account") ?? "";
const displayName = localStorage.getItem("cognis_display_name") ?? account;
const role = localStorage.getItem("cognis_role") ?? "user";

async function loadAccountInfo() {
    if (!account) return null;
    try {
        const response = await apiFetch(
            `/api/v1/users/${encodeURIComponent(account)}/info`,
        );
        if (!response.ok) return null;
        const payload = await response.json();
        return payload?.data ?? null;
    } catch {
        return null;
    }
}

function localFormatDate(iso) {
    return formatDate(iso, i18n.t("ui.app.dashboard.never"));
}

function localFormatDateTime(iso) {
    return formatDateTime(iso, i18n.t("ui.app.dashboard.never"));
}

const info = await loadAccountInfo();

const elements = [
    {
        id: "app-icon",
        label: i18n.t("ui.app.dashboard.element.app_icon.label"),
        pinned: true,
        gridSize: { default: [2, 2], min: [2, 2], max: [4, 4] },
        render: () => `
      <div class="dashboard-app-icon">
        <img src="/static/assets/icons/cognis-icon.png" alt="${i18n.t("ui.shared.brand.name")}" class="dashboard-app-icon-img" />
        <span class="dashboard-app-icon-name">${i18n.t("ui.shared.brand.name")}</span>
      </div>
    `,
    },
    {
        id: "welcome",
        label: i18n.t("ui.app.dashboard.element.welcome.label"),
        gridSize: { default: [4, 2], min: [2, 2] },
        render: () => `
      <h2 class="dashboard-welcome-heading">${i18n.t("ui.layout.greeting")} ${displayName}</h2>
      <p class="dashboard-welcome-account">${account}</p>
    `,
    },
    {
        id: "account-info",
        label: i18n.t("ui.app.dashboard.element.account.label"),
        gridSize: { default: [4, 3], min: [3, 2] },
        render: () => `
      <h3>${i18n.t("ui.app.dashboard.element.account.label")}</h3>
      <dl class="dashboard-info-list">
        <dt>${i18n.t("ui.app.dashboard.role")}</dt>
        <dd>${role}</dd>
        <dt>${i18n.t("ui.app.dashboard.member_since")}</dt>
        <dd>${localFormatDate(info?.createdAt ?? null)}</dd>
      </dl>
    `,
    },
    {
        id: "last-login",
        label: i18n.t("ui.app.dashboard.element.last_login.label"),
        gridSize: { default: [3, 2], min: [2, 2] },
        render: () => `
      <h3>${i18n.t("ui.app.dashboard.element.last_login.label")}</h3>
      <p class="dashboard-last-seen">
        ${i18n.t("ui.app.dashboard.last_seen")}: <strong>${localFormatDateTime(info?.lastLogin ?? null)}</strong>
      </p>
    `,
    },
    {
        id: "clock",
        label: i18n.t("ui.app.dashboard.element.clock.label"),
        gridSize: { default: [3, 3], min: [2, 2], max: [4, 4] },
        render: () => `
      <div class="dashboard-clock" id="dashboard-clock-root">
        <div class="dashboard-clock-toggle">
          <button class="btn-cancel btn-animated" id="dashboard-clock-mode-btn" type="button"
            data-mode="digital">${i18n.t("ui.app.dashboard.element.clock.analogue")}</button>
        </div>
        <div id="dashboard-clock-display"></div>
        <span class="dashboard-clock-tz" id="dashboard-clock-tz"></span>
      </div>
    `,
        onRender: () => {
            const displayEl = document.querySelector(
                "#dashboard-clock-display",
            );
            const tzEl = document.querySelector("#dashboard-clock-tz");
            const modeBtn = document.querySelector("#dashboard-clock-mode-btn");
            if (!displayEl) return;

            let mode = "digital";

            function buildAnalogue(now, tz) {
                const parts = new Intl.DateTimeFormat(undefined, {
                    hour: "numeric",
                    minute: "numeric",
                    second: "numeric",
                    hour12: false,
                    timeZone: tz,
                }).formatToParts(now);
                const h =
                    parseInt(
                        parts.find((p) => p.type === "hour")?.value ?? "0",
                        10,
                    ) % 12;
                const min = parseInt(
                    parts.find((p) => p.type === "minute")?.value ?? "0",
                    10,
                );
                const sec = parseInt(
                    parts.find((p) => p.type === "second")?.value ?? "0",
                    10,
                );

                const cx = 60;
                const cy = 60;
                const faceRadius = 54;

                function handCoords(angleDeg, len) {
                    const rad = ((angleDeg - 90) * Math.PI) / 180;
                    return {
                        x: cx + len * Math.cos(rad),
                        y: cy + len * Math.sin(rad),
                    };
                }

                const hourAngle = (h + min / 60 + sec / 3600) * 30;
                const minAngle = (min + sec / 60) * 6;
                const secAngle = sec * 6;
                const hourEnd = handCoords(hourAngle, 32);
                const minEnd = handCoords(minAngle, 44);
                const secEnd = handCoords(secAngle, 50);

                const ticks = Array.from({ length: 60 }, (_, i) => {
                    const major = i % 5 === 0;
                    const ta = (i * 6 * Math.PI) / 180;
                    const inner = major ? faceRadius - 8 : faceRadius - 4;
                    const x1 = cx + faceRadius * Math.cos(ta - Math.PI / 2);
                    const y1 = cy + faceRadius * Math.sin(ta - Math.PI / 2);
                    const x2 = cx + inner * Math.cos(ta - Math.PI / 2);
                    const y2 = cy + inner * Math.sin(ta - Math.PI / 2);
                    const cls = major
                        ? "dashboard-clock-analogue-tick-major"
                        : "dashboard-clock-analogue-tick";
                    return `<line class="${cls}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
                }).join("");

                return `<svg class="dashboard-clock-analogue" width="120" height="120" viewBox="0 0 120 120" aria-hidden="true">
                  <circle class="dashboard-clock-analogue-face" cx="${cx}" cy="${cy}" r="${r}"/>
                  ${ticks}
                  <line class="dashboard-clock-hand-hour"
                    x1="${cx}" y1="${cy}" x2="${hourEnd.x.toFixed(2)}" y2="${hourEnd.y.toFixed(2)}"/>
                  <line class="dashboard-clock-hand-minute"
                    x1="${cx}" y1="${cy}" x2="${minEnd.x.toFixed(2)}" y2="${minEnd.y.toFixed(2)}"/>
                  <line class="dashboard-clock-hand-second"
                    x1="${cx}" y1="${cy}" x2="${secEnd.x.toFixed(2)}" y2="${secEnd.y.toFixed(2)}"/>
                  <circle class="dashboard-clock-analogue-centre" cx="${cx}" cy="${cy}" r="4"/>
                </svg>`;
            }

            function buildDigital(now, tz) {
                const timeStr = now.toLocaleTimeString(undefined, {
                    hour: "2-digit",
                    minute: "2-digit",
                    second: "2-digit",
                    timeZone: tz,
                });
                const dateStr = now.toLocaleDateString(undefined, {
                    weekday: "long",
                    year: "numeric",
                    month: "long",
                    day: "numeric",
                    timeZone: tz,
                });
                return `<span class="dashboard-clock-digital">${timeStr}</span>
                  <span class="dashboard-clock-date">${dateStr}</span>`;
            }

            function tick() {
                const tz = getEffectiveTimezone();
                const now = new Date();
                if (tzEl) tzEl.textContent = tz;
                if (mode === "analogue") {
                    displayEl.innerHTML = buildAnalogue(now, tz);
                } else {
                    displayEl.innerHTML = buildDigital(now, tz);
                }
            }

            tick();
            const intervalId = setInterval(tick, 1000);

            modeBtn?.addEventListener("click", () => {
                mode = mode === "digital" ? "analogue" : "digital";
                modeBtn.textContent =
                    mode === "digital"
                        ? i18n.t("ui.app.dashboard.element.clock.analogue")
                        : i18n.t("ui.app.dashboard.element.clock.digital");
                tick();
            });

            window.addEventListener(
                "pagehide",
                () => clearInterval(intervalId),
                { once: true },
            );
        },
    },
];

const composer = createPageComposer(root, {
    allowCustomization: true,
    elements,
    preferenceKey: "dashboard-layout",
    i18n,
    pageContext: {
        title: i18n.t("ui.app.dashboard.page_title"),
        subtitle: i18n.t("ui.app.dashboard.page_subtitle"),
    },
});

await composer.init();
