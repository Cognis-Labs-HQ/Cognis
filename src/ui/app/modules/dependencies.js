import { escapeHtml } from "../../reuse/escape-html.js";
import { beginButtonLoading } from "../../reuse/button-loading.js";
import { openPopup } from "../../reuse/popup.js";
import { showToast } from "../../reuse/toast.js";

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

export function dependencyLifecycleAction(module) {
    return module.installed ? "enable" : "install";
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

function actionState(hard, soft) {
    const requiredMissing = hard.some((entry) => !isSatisfied(entry));
    const optionalMissing = soft.some((entry) => !isSatisfied(entry));
    return {
        disabled: requiredMissing,
        variant: requiredMissing || optionalMissing ? "neutral" : "confirm",
    };
}

export function moduleDependencyActionState(module, modules) {
    return actionState(
        dependencyEntries(module, modules, "hard"),
        dependencyEntries(module, modules, "soft"),
    );
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
    const details = dependency
        ? `<a class="btn-neutral module-dependency-details" href="/administration/modules/${encodeURIComponent(dependency.uuid)}" aria-label="${escapeHtml(`${i18n.t("ui.reuse.details")}: ${name}`)}"><span class="module-icon module-icon-forward" aria-hidden="true"></span></a>`
        : "";
    const download =
        dependency && !isSatisfied(entry)
            ? `<button class="btn-confirm module-dependency-download" type="button" data-install-dependency="${escapeHtml(entry.reference)}" aria-label="${escapeHtml(`${i18n.t(`ui.reuse.${dependencyLifecycleAction(dependency)}`)}: ${name}`)}"><span class="module-dependency-action-icon ${dependency.installed ? "module-dependency-action-icon--play" : "module-dependency-action-icon--download"}" aria-hidden="true"></span></button>`
            : "";
    return `<article class="module-dependency-card${isSatisfied(entry) ? " is-satisfied" : ""}">
      <div class="module-dependency-card-copy">
        <h3>${escapeHtml(name)}</h3>
        <div class="module-dependency-pills">
          <span class="state-pill ${entry.kind === "hard" ? "pill-disabled" : "pill-available"}">${escapeHtml(i18n.t(kindKey))}</span>
          ${dependency?.recommended ? `<span class="state-pill pill-active">${escapeHtml(i18n.t("ui.app.modules.recommended"))}</span>` : ""}
        </div>
      </div>
      ${download}
      ${details}
    </article>`;
}

export async function confirmModuleDependencies(
    module,
    modules,
    i18n,
    installDependency,
) {
    const action = dependencyLifecycleAction(module);
    const hard = dependencyEntries(module, modules, "hard");
    const soft = dependencyEntries(module, modules, "soft");
    if (
        ![...hard, ...soft].length ||
        areModuleDependenciesSatisfied(module, modules)
    ) {
        return { soft: [] };
    }

    const initialActionState = actionState(hard, soft);
    const moduleName = module.localizedPresentation?.name ?? module.name;
    const message = i18n
        .t("ui.app.modules.dependencies_message")
        .replace("{{module}}", String(moduleName));
    const result = await openPopup({
        title: i18n.t("ui.app.modules.dependencies_title"),
        body: `<div class="module-dependency-list">
          <p>${escapeHtml(message)}</p>
          ${[...hard, ...soft].map((entry) => renderDependencyCard(entry, i18n)).join("")}
          <p class="module-dependency-warning" data-dependency-warning${initialActionState.disabled ? "" : " hidden"}>${escapeHtml(i18n.t("ui.app.modules.hard_dependency_blocked"))}</p>
        </div>`,
        actions: [
            {
                id: action,
                label: i18n.t(`ui.reuse.${action}`),
                variant: initialActionState.variant,
                disabled: initialActionState.disabled,
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
            overlay
                .querySelectorAll("[data-install-dependency]")
                .forEach((button) =>
                    button.addEventListener("click", async () => {
                        const entry = [...hard, ...soft].find(
                            (candidate) =>
                                candidate.reference ===
                                button.dataset.installDependency,
                        );
                        if (!entry?.module) return;
                        const finishLoading = beginButtonLoading(button);
                        try {
                            const completed = await installDependency(
                                entry.module,
                            );
                            if (!completed) return;
                            entry.module.installed = true;
                            entry.module.status = "enabled";
                            const card = button.closest(
                                ".module-dependency-card",
                            );
                            button.remove();
                            card?.classList.add("is-satisfied");
                            updateDependencyAction(overlay, action, hard, soft);
                        } catch (error) {
                            showToast(
                                error instanceof Error
                                    ? error.message
                                    : String(error),
                                { type: "error" },
                            );
                        } finally {
                            finishLoading();
                        }
                    }),
                );
        },
    });
    return result === action ? { soft: [] } : null;
}

function updateDependencyAction(overlay, action, hard, soft) {
    const actionButton = overlay.querySelector(
        `[data-popup-action="${action}"]`,
    );
    if (!(actionButton instanceof HTMLButtonElement)) return;
    const state = actionState(hard, soft);
    actionButton.disabled = state.disabled;
    actionButton.classList.toggle("btn-confirm", state.variant === "confirm");
    actionButton.classList.toggle(
        "popup-action-btn--neutral",
        state.variant === "neutral",
    );
    const warning = overlay.querySelector("[data-dependency-warning]");
    if (warning) warning.hidden = !state.disabled;
}

export function resolveInstallDependencies(module, modules, selectedSoft) {
    return [...references(module, "hard"), ...selectedSoft]
        .map((reference) => findDependency(modules, reference))
        .filter(Boolean);
}
