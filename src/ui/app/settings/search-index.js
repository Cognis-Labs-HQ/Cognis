import { escapeHtml } from "../../reuse/escape-html.js";
import {
    htmlToSearchEntries,
    renderSearchDataAttributes,
} from "../../reuse/search-util/indexing.js";

function accountOperationSearchAttrs(i18n, action, labelKey, descriptionKey) {
    const label = i18n.t(labelKey);
    const description = i18n.t(descriptionKey);
    return renderSearchDataAttributes({
        "data-search-category": i18n.t("ui.reuse.operations"),
        "data-search-id": `settings-operation-${action}`,
        "data-search-label": label,
        "data-search-description": description,
        "data-search-result-class": "operation",
        "data-search-text": [
            i18n.t("ui.reuse.settings"),
            i18n.t("ui.app.settings.danger_zone"),
            label,
            description,
        ].join(" "),
    });
}

export function renderAccountOperationButton(
    i18n,
    action,
    labelKey,
    descriptionKey,
) {
    const label = i18n.t(labelKey);
    return `
      <button
        class="btn-cancel btn-animated"
        type="button"
        data-account-action="${escapeHtml(action)}"
        ${accountOperationSearchAttrs(i18n, action, labelKey, descriptionKey)}
      >${escapeHtml(label)}</button>
    `;
}

function formatPreferenceLabel(key) {
    return String(key ?? "")
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[-_]+/g, " ")
        .replace(/\s+/g, " ")
        .trim()
        .replace(/\b\w/g, (letter) => letter.toUpperCase());
}

function shouldIndexSettingsPreference(key) {
    const normalizedKey = String(key ?? "").toLowerCase();
    return !(
        normalizedKey.includes("changelogseenslug") ||
        normalizedKey.includes("changelog_seen_slug") ||
        normalizedKey.includes("seen-slug") ||
        normalizedKey.includes("messagestyle") ||
        normalizedKey.includes("message_style")
    );
}

function collectPreferenceSearchItems(value, labelPrefix = "") {
    if (!value || typeof value !== "object" || Array.isArray(value)) return [];
    return Object.entries(value).flatMap(([key, entry]) => {
        if (!shouldIndexSettingsPreference(key)) return [];
        const label = [labelPrefix, formatPreferenceLabel(key)]
            .filter(Boolean)
            .join(" — ");
        if (entry && typeof entry === "object" && !Array.isArray(entry)) {
            return collectPreferenceSearchItems(entry, label);
        }
        return [
            {
                id: `settings-preference:${label}`,
                label,
                url: "/settings",
                resultClass: "preference",
                searchText: [label, entry].filter(Boolean).join(" "),
            },
        ];
    });
}

function renderSettingsElementEntries(element) {
    if (typeof element?.render !== "function") return [];
    try {
        return htmlToSearchEntries(element.render()).filter((entry) =>
            ["heading", "field", "operation"].includes(entry.resultClass),
        );
    } catch {
        return [];
    }
}

function createSettingsElementSearchItem(
    section,
    element,
    sectionLabel,
    label,
) {
    return {
        id: `settings-element:${section?.id ?? sectionLabel}:${element?.id ?? label}`,
        label,
        description: sectionLabel,
        url: `/settings#${encodeURIComponent(section?.id ?? label)}`,
        resultClass: "setting",
        searchText: [sectionLabel, section?.heading, label]
            .filter(Boolean)
            .join(" "),
    };
}

function collectSettingsElementContentSearchItems(
    section,
    element,
    sectionLabel,
    label,
) {
    const normalizedLabel = label.toLowerCase();
    return renderSettingsElementEntries(element)
        .filter((entry) => entry.text.toLowerCase() !== normalizedLabel)
        .map((entry, index) => ({
            id: `settings-element-content:${section?.id ?? sectionLabel}:${element?.id ?? label}:${index}`,
            label: entry.text.slice(0, 96),
            description: [sectionLabel, label].filter(Boolean).join(" — "),
            resultClass: entry.resultClass,
            url: `/settings#${encodeURIComponent(entry.searchId || section?.id || label)}`,
            searchText: [sectionLabel, section?.heading, label, entry.text]
                .filter(Boolean)
                .join(" "),
        }));
}

function dedupeSettingsSearchItems(items) {
    const seenItems = new Set();
    return (items ?? []).filter((item) => {
        const key = [item.label, item.description, item.url]
            .map((value) =>
                String(value ?? "")
                    .trim()
                    .toLowerCase(),
            )
            .join(":");
        if (seenItems.has(key)) return false;
        seenItems.add(key);
        return true;
    });
}

function collectSettingsElementSearchItems(section) {
    const sectionLabel = String(section?.label ?? section?.id ?? "").trim();
    return (section?.subComposerOptions?.elements ?? []).flatMap((element) => {
        const label = String(element?.label ?? element?.id ?? "").trim();
        if (!label) return [];
        return [
            createSettingsElementSearchItem(
                section,
                element,
                sectionLabel,
                label,
            ),
            ...collectSettingsElementContentSearchItems(
                section,
                element,
                sectionLabel,
                label,
            ),
        ];
    });
}

export function collectSettingsSearchGroups(sections, loadedPrefs) {
    const items = [];
    for (const section of sections ?? []) {
        const label = String(
            section?.label ?? section?.heading ?? section?.id ?? "",
        ).trim();
        if (!label) continue;
        items.push({
            id: `settings-section:${section.id ?? label}`,
            label,
            description: String(section?.heading ?? ""),
            showDescription: false,
            resultClass: "heading",
            url: `/settings#${encodeURIComponent(section.id ?? label)}`,
            searchText: [label, section?.heading, section?.preferenceKey]
                .filter(Boolean)
                .join(" "),
        });
        items.push(...collectSettingsElementSearchItems(section));
    }

    if (loadedPrefs && typeof loadedPrefs === "object") {
        items.push(...collectPreferenceSearchItems(loadedPrefs));
    }

    return [{ category: "Settings", items: dedupeSettingsSearchItems(items) }];
}
