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

function getClockTimeParts(now, tz) {
    const parts = new Intl.DateTimeFormat(undefined, {
        hour: "numeric",
        minute: "numeric",
        second: "numeric",
        hour12: false,
        timeZone: tz,
    }).formatToParts(now);

    return {
        hour:
            parseInt(
                parts.find((part) => part.type === "hour")?.value ?? "0",
                10,
            ) % 12,
        minute: parseInt(
            parts.find((part) => part.type === "minute")?.value ?? "0",
            10,
        ),
        second: parseInt(
            parts.find((part) => part.type === "second")?.value ?? "0",
            10,
        ),
    };
}

function buildAnalogueClockMarkup(now, tz) {
    const { hour, minute, second } = getClockTimeParts(now, tz);
    const cx = 54;
    const cy = 54;
    const faceRadius = 48;

    function handCoords(angleDeg, len) {
        const rad = ((angleDeg - 90) * Math.PI) / 180;
        return {
            x: cx + len * Math.cos(rad),
            y: cy + len * Math.sin(rad),
        };
    }

    // Clock-hand math: 30° per hour (360/12), 6° per minute/second (360/60), and 3600 seconds per hour.
    const hourAngle = (hour + minute / 60 + second / 3600) * 30;
    const minuteAngle = (minute + second / 60) * 6;
    const secondAngle = second * 6;
    const hourEnd = handCoords(hourAngle, 28);
    const minuteEnd = handCoords(minuteAngle, 38);
    const secondEnd = handCoords(secondAngle, 44);

    const ticks = Array.from({ length: 60 }, (_, tickIndex) => {
        const major = tickIndex % 5 === 0;
        const tickAngle = (tickIndex * 6 * Math.PI) / 180;
        const inner = major ? faceRadius - 8 : faceRadius - 4;
        const x1 = cx + faceRadius * Math.cos(tickAngle - Math.PI / 2);
        const y1 = cy + faceRadius * Math.sin(tickAngle - Math.PI / 2);
        const x2 = cx + inner * Math.cos(tickAngle - Math.PI / 2);
        const y2 = cy + inner * Math.sin(tickAngle - Math.PI / 2);
        const tickClass = major
            ? "dashboard-clock-analogue-tick-major"
            : "dashboard-clock-analogue-tick";
        return `<line class="${tickClass}" x1="${x1.toFixed(2)}" y1="${y1.toFixed(2)}" x2="${x2.toFixed(2)}" y2="${y2.toFixed(2)}"/>`;
    }).join("");

    return `<svg class="dashboard-clock-analogue" width="108" height="108" viewBox="0 0 108 108" aria-hidden="true">
      <circle class="dashboard-clock-analogue-face" cx="${cx}" cy="${cy}" r="${faceRadius}"/>
      ${ticks}
      <line class="dashboard-clock-hand-hour"
        x1="${cx}" y1="${cy}" x2="${hourEnd.x.toFixed(2)}" y2="${hourEnd.y.toFixed(2)}"/>
      <line class="dashboard-clock-hand-minute"
        x1="${cx}" y1="${cy}" x2="${minuteEnd.x.toFixed(2)}" y2="${minuteEnd.y.toFixed(2)}"/>
      <line class="dashboard-clock-hand-second"
        x1="${cx}" y1="${cy}" x2="${secondEnd.x.toFixed(2)}" y2="${secondEnd.y.toFixed(2)}"/>
      <circle class="dashboard-clock-analogue-centre" cx="${cx}" cy="${cy}" r="4"/>
    </svg>`;
}

function buildDigitalClockMarkup(now, tz) {
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

    return `
      <div class="dashboard-clock-digital-stack">
        <span class="dashboard-clock-digital-time">${timeStr}</span>
        <span class="dashboard-clock-digital-date">${dateStr}</span>
      </div>
    `;
}

function mountClock({ displayId, tzId, renderClock }) {
    const displayEl = document.querySelector(`#${displayId}`);
    const tzEl = document.querySelector(`#${tzId}`);
    if (!displayEl) return;

    function tick() {
        const tz = getEffectiveTimezone();
        const now = new Date();
        if (tzEl) tzEl.textContent = tz;
        displayEl.innerHTML = renderClock(now, tz);
    }

    tick();
    const intervalId = setInterval(tick, 1000);
    window.addEventListener("pagehide", () => clearInterval(intervalId), {
        once: true,
    });
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
        id: "digital-clock",
        label: i18n.t("ui.app.dashboard.element.digital_clock.label"),
        gridSize: { default: [5, 2], min: [4, 2], max: [6, 2] },
        render: () => `
      <div class="dashboard-clock dashboard-clock--digital">
        <div class="dashboard-clock-display" id="dashboard-digital-clock-display"></div>
        <span class="dashboard-clock-tz" id="dashboard-digital-clock-tz"></span>
      </div>
    `,
        onRender: () => {
            mountClock({
                displayId: "dashboard-digital-clock-display",
                tzId: "dashboard-digital-clock-tz",
                renderClock: buildDigitalClockMarkup,
            });
        },
    },
    {
        id: "analogue-clock",
        label: i18n.t("ui.app.dashboard.element.analogue_clock.label"),
        gridSize: { default: [4, 2], min: [3, 2], max: [5, 2] },
        render: () => `
      <div class="dashboard-clock dashboard-clock--analogue">
        <div class="dashboard-clock-display" id="dashboard-analogue-clock-display"></div>
        <span class="dashboard-clock-tz" id="dashboard-analogue-clock-tz"></span>
      </div>
    `,
        onRender: () => {
            mountClock({
                displayId: "dashboard-analogue-clock-display",
                tzId: "dashboard-analogue-clock-tz",
                renderClock: buildAnalogueClockMarkup,
            });
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
