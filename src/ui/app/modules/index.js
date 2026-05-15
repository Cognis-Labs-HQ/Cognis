import { apiFetch } from "../../reuse/api-client.js";
import { applyDocumentTitle, createI18n } from "../../reuse/i18n.js";
import { createPageComposer } from "../../reuse/page-composer.js";
import { escapeHtml } from "../../reuse/escape-html.js";

let root = null;
let i18n = null;
let modules = [];
let composer = null;

async function loadModules() {
    const response = await apiFetch("/api/v1/modules");
    const payload = await response.json();
    return payload.data || [];
}

async function toggleModule(moduleId, action) {
    await apiFetch(
        `/api/v1/modules/${encodeURIComponent(moduleId)}/${action}`,
        { method: "POST" },
    );
    modules = await loadModules();
    composer.refresh();
}

function renderModulesTable(rows) {
    const rowsHtml = rows
        .map((mod) => {
            const escapedModuleId = escapeHtml(String(mod.id ?? ""));
            return `<tr>
          <td>${escapedModuleId}</td>
          <td>${escapeHtml(String(mod.version ?? ""))}</td>
          <td>${escapeHtml(String(mod.class ?? ""))}</td>
          <td>
            <button class="btn-confirm btn-animated" data-module="${escapedModuleId}" data-action="enable">${i18n.t("ui.reuse.enable")}</button>
            <button class="btn-cancel btn-animated" data-module="${escapedModuleId}" data-action="disable">${i18n.t("ui.reuse.disable")}</button>
          </td>
        </tr>`;
        })
        .join("");
    return `
    <div class="users-table-wrap">
    <table class="users-table">
      <thead>
        <tr>
          <th>${i18n.t("ui.reuse.id")}</th>
          <th>${i18n.t("ui.reuse.version")}</th>
          <th>${i18n.t("ui.reuse.class")}</th>
          <th>${i18n.t("ui.reuse.actions")}</th>
        </tr>
      </thead>
      <tbody>${rowsHtml}</tbody>
    </table>
    </div>
  `;
}

export async function mount(rootEl) {
    root = rootEl;
    i18n = await createI18n();
    applyDocumentTitle(i18n, "ui.page.title.modules");

    modules = await loadModules();

    const elements = [
        {
            id: "modules-list",
            label: i18n.t("ui.reuse.modules"),
            gridSize: { default: [12, 5], min: [6, 4], max: "full" },
            render: () =>
                `<h2>${i18n.t("ui.app.modules.page_title")}</h2>${renderModulesTable(modules)}`,
        },
    ];

    composer = createPageComposer(root, {
        allowCustomization: false,
        elements,
        preferenceKey: "modules-layout",
        i18n,
        pageContext: {
            title: i18n.t("ui.app.modules.page_title"),
            subtitle: i18n.t("ui.app.modules.page_subtitle"),
        },
        toolbar: [
            {
                id: "modules-nav",
                label: i18n.t("ui.reuse.modules"),
                render: () =>
                    `<h3>${i18n.t("ui.reuse.modules")}</h3><p>${i18n.t("ui.app.modules.toolbar_subtitle")}</p>`,
            },
        ],
        onRender: () => {
            root.querySelectorAll("button[data-module]").forEach((button) => {
                button.addEventListener("click", async () => {
                    await toggleModule(
                        button.dataset.module,
                        button.dataset.action,
                    );
                });
            });
        },
    });
    await composer.init();
}

if (!globalThis.__spaRouter) await mount(document.querySelector("#app"));
