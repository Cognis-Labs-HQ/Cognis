import { escapeHtml } from "../../reuse/escape-html.js";
import { openPopup } from "../../reuse/popup.js";

function references(module, kind) {
    const values =
        kind === "hard"
            ? (module.hardDependencies ?? [])
            : (module.softDependencies ?? []);
    return [...new Set(values.filter((value) => typeof value === "string"))];
}

function findDependency(modules, reference) {
    return modules.find(
        (candidate) =>
            candidate.uuid === reference || candidate.id === reference,
    );
}

function dependencyEntries(module, modules, kind) {
    return references(module, kind).map((reference) => ({
        kind,
        reference,
        module: findDependency(modules, reference),
    }));
}

function isSatisfied({ module }) {
    return module?.installed && module.status === "enabled";
}

export function isRequiredDependency(module, modules) {
    return modules.some((candidate) =>
        references(candidate, "hard").some(
            (reference) => reference === module.uuid || reference === module.id,
        ),
    );
}

export function areModuleDependenciesSatisfied(module, modules) {
    return [
        ...dependencyEntries(module, modules, "hard"),
        ...dependencyEntries(module, modules, "soft"),
    ].every(isSatisfied);
}

function renderDependencyCard(entry, i18n) {
    const dependency = entry.module;
    const name =
        dependency?.localizedPresentation?.name ??
        dependency?.name ??
        entry.reference;
    const kindKey =
        entry.kind === "hard"
            ? "ui.app.modules.required"
            : "ui.app.modules.optional";
    const selector =
        entry.kind === "soft"
            ? `<input class="app-radio" type="checkbox" value="${escapeHtml(entry.reference)}" data-soft-dependency${dependency ? "" : " disabled"} aria-label="${escapeHtml(name)}">`
            : "";
    const details = dependency
        ? `<a class="btn-neutral module-dependency-details" href="/administration/modules/${encodeURIComponent(dependency.uuid)}" aria-label="${escapeHtml(`${i18n.t("ui.reuse.details")}: ${name}`)}">→</a>`
        : "";
    return `<article class="module-dependency-card${isSatisfied(entry) ? " is-satisfied" : ""}">
      ${selector}
      <div class="module-dependency-card-copy">
        <h3>${escapeHtml(name)}</h3>
        <div class="module-dependency-pills">
          <span class="state-pill ${entry.kind === "hard" ? "pill-required" : "pill-optional"}">${escapeHtml(i18n.t(kindKey))}</span>
          ${dependency?.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}
        </div>
      </div>
      ${details}
    </article>`;
}

export async function confirmModuleDependencies(module, modules, i18n, action) {
    const hard = dependencyEntries(module, modules, "hard");
    const soft = dependencyEntries(module, modules, "soft");
    if (
        ![...hard, ...soft].length ||
        areModuleDependenciesSatisfied(module, modules)
    ) {
        return { soft: [] };
    }

    const blocked = hard.some((dependency) => !isSatisfied(dependency));
    const moduleName = module.localizedPresentation?.name ?? module.name;
    const message = i18n
        .t("ui.app.modules.dependencies_message")
        .replace("{{module}}", String(moduleName));
    let selectedSoft = [];
    const result = await openPopup({
        title: i18n.t("ui.app.modules.dependencies_title"),
        body: `<div class="module-dependency-list">
          <p>${escapeHtml(message)}</p>
          ${[...hard, ...soft].map((entry) => renderDependencyCard(entry, i18n)).join("")}
          ${blocked ? `<p class="module-dependency-warning">${escapeHtml(i18n.t("ui.app.modules.hard_dependency_blocked"))}</p>` : ""}
        </div>`,
        actions: [
            {
                id: action,
                label: i18n.t(`ui.reuse.${action}`),
                variant: "confirm",
                disabled: blocked,
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onOpen(overlay, dismiss) {
            overlay
                .querySelectorAll(".module-dependency-details")
                .forEach((link) =>
                    link.addEventListener("click", () => void dismiss()),
                );
        },
        onAction(selectedAction, overlay) {
            if (selectedAction === action) {
                selectedSoft = [
                    ...overlay.querySelectorAll(
                        "[data-soft-dependency]:checked",
                    ),
                ].map((input) => input.value);
            }
        },
    });
    return result === action ? { soft: selectedSoft } : null;
}

export function resolveInstallDependencies(module, modules, selectedSoft) {
    return [...references(module, "hard"), ...selectedSoft]
        .map((reference) => findDependency(modules, reference))
        .filter(Boolean);
}
