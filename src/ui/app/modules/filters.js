export function createModuleFilters() {
    return { view: "all", categories: new Set() };
}

export function applyModuleFilterSelection(filters, dataset) {
    if (dataset.storeView) {
        filters.view = dataset.storeView;
        return true;
    }
    const category = dataset.storeCategory;
    if (!category) return false;
    if (category === "all") {
        filters.categories.clear();
    } else if (filters.categories.has(category)) {
        filters.categories.delete(category);
    } else {
        filters.categories.add(category);
    }
    return true;
}

export function filterModules(modules, filters) {
    return modules.filter((module) => {
        if (module.template === true) return false;
        if (
            filters.view === "installed" &&
            !(
                module.installed ||
                ["enabled", "disabled"].includes(module.status)
            )
        ) {
            return false;
        }
        if (filters.view === "recommended" && !module.recommended) return false;
        if (
            filters.view === "available" &&
            (module.installed || module.status)
        ) {
            return false;
        }
        const tags = new Set(module.tags ?? []);
        return [...filters.categories].every((category) => tags.has(category));
    });
}

export function renderModuleFilters(
    categories,
    filters,
    { i18n, escapeHtml, formatTag },
) {
    const viewButtons = ["all", "recommended", "installed", "available"]
        .map((item) => {
            const active = filters.view === item;
            const label = i18n.t(
                item === "all" ? "ui.reuse.all" : `ui.app.modules.${item}`,
            );
            return `<button type="button" class="btn-neutral${active ? " is-active" : ""}" data-store-view="${item}" aria-pressed="${active}">${escapeHtml(label)}</button>`;
        })
        .join("");
    const categoryButtons = categories
        .map((item) => {
            const active = filters.categories.has(item);
            return `<button type="button" class="btn-neutral${active ? " is-active" : ""}" data-store-category="${escapeHtml(item)}" aria-pressed="${active}">${escapeHtml(formatTag(item))}</button>`;
        })
        .join("");
    const allCategoriesActive = filters.categories.size === 0;
    return `<aside data-module-sidebar>
      ${viewButtons}
      <h3>${escapeHtml(i18n.t("ui.app.modules.categories"))}</h3>
      <button type="button" class="btn-neutral${allCategoriesActive ? " is-active" : ""}" data-store-category="all" aria-pressed="${allCategoriesActive}">${escapeHtml(i18n.t("ui.reuse.all"))}</button>
      ${categoryButtons}
    </aside>`;
}
