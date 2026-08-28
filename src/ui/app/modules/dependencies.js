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

export function isRequiredDependency(module, modules) {
    return modules.some((candidate) =>
        references(candidate, "hard").some(
            (reference) => reference === module.uuid || reference === module.id,
        ),
    );
}

export async function confirmDependencyInstall(module, modules, i18n) {
    const hard = references(module, "hard").map((reference) => ({
        reference,
        module: findDependency(modules, reference),
    }));
    const soft = references(module, "soft").map((reference) => ({
        reference,
        module: findDependency(modules, reference),
    }));
    if (!hard.length && !soft.length) return { soft: [] };

    const blocked = hard.some(
        (dependency) =>
            !dependency.module?.installed ||
            dependency.module.status !== "enabled",
    );
    const dependencyName = ({ reference, module: dependency }) =>
        escapeHtml(
            dependency?.localizedPresentation?.name ??
                dependency?.name ??
                reference,
        );
    const body = `<div class="module-dependency-list">
      ${hard.map((dependency) => `<div class="module-dependency-row"><span>${dependencyName(dependency)}</span><span class="state-pill pill-required">${escapeHtml(i18n.t("ui.app.modules.required"))}</span></div>`).join("")}
      ${soft.map((dependency) => `<label class="module-dependency-row"><input class="app-radio" type="checkbox" value="${escapeHtml(dependency.reference)}" data-soft-dependency${dependency.module ? "" : " disabled"}> <span>${dependencyName(dependency)}</span></label>`).join("")}
      ${blocked ? `<p class="module-dependency-warning">${escapeHtml(i18n.t("ui.app.modules.hard_dependency_blocked"))}</p>` : ""}
    </div>`;
    let selectedSoft = [];
    const result = await openPopup({
        title: i18n.t("ui.app.modules.dependencies_title"),
        body,
        actions: [
            {
                id: "install",
                label: i18n.t("ui.reuse.install"),
                variant: "confirm",
                disabled: blocked,
            },
            {
                id: "cancel",
                label: i18n.t("ui.reuse.cancel"),
                variant: "neutral",
            },
        ],
        onAction(action, overlay) {
            if (action === "install") {
                selectedSoft = [
                    ...overlay.querySelectorAll(
                        "[data-soft-dependency]:checked",
                    ),
                ].map((input) => input.value);
            }
        },
    });
    return result === "install" ? { soft: selectedSoft } : null;
}

export function resolveInstallDependencies(module, modules, selectedSoft) {
    return [...references(module, "hard"), ...selectedSoft]
        .map((reference) => findDependency(modules, reference))
        .filter(Boolean);
}
