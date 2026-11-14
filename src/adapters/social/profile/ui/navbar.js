import { createNavbarAvatarProvider } from "./navbar-avatar-provider.js";
import { applyStaticTranslations, createI18n } from "/static/reuse/i18n.js";
import { ensureProfileAvatarStyles } from "./profile-avatar.js";
import { bindProfilePreviews } from "./profile-preview.js";
import { registerSearchIndexing } from "./search/index.js";
import {
    availabilityIndicatorMarkup,
    fetchAvailability,
    refreshAvailabilityIndicators,
    setManualAvailability,
    subscribeAvailabilityUpdates,
    STATUS_OPTIONS,
} from "./availability.js";

const availabilityMounts = new WeakMap();
const availabilityMenus = new WeakMap();

async function performAvailabilityControlMount(scope, i18n) {
    scope.signal.throwIfAborted();
    const button = document.querySelector(".avatar-button");
    const dropdown = document.querySelector("#profile-dropdown");
    if (!button || !dropdown) return;
    const existingItems = [
        ...dropdown.querySelectorAll(".availability-menu-item"),
    ];
    if (existingItems.length) {
        existingItems.slice(1).forEach((item) => item.remove());
        await refreshAvailabilityIndicators();
        return;
    }

    availabilityMenus.get(scope)?.();
    const statusItem = document.createElement("li");
    statusItem.className = "availability-menu-item";
    dropdown.prepend(statusItem);
    let unsubscribe = () => {};
    let ownedIndicator;
    const menuController = new AbortController();
    const dispose = () => {
        menuController.abort();
        scope.signal.removeEventListener("abort", dispose);
        unsubscribe();
        statusItem.remove();
        ownedIndicator?.remove();
        if (availabilityMenus.get(scope) === dispose)
            availabilityMenus.delete(scope);
    };
    availabilityMenus.set(scope, dispose);
    scope.signal.addEventListener("abort", dispose, { once: true });
    const isCurrent = () =>
        !menuController.signal.aborted &&
        statusItem.isConnected &&
        button.isConnected;
    const options = { signal: menuController.signal };

    try {
        await ensureProfileAvatarStyles();
        if (!isCurrent()) return;
        button.classList.add("availability-avatar");

        if (!button.querySelector(".availability-indicator")) {
            button.insertAdjacentHTML(
                "beforeend",
                availabilityIndicatorMarkup(""),
            );
            ownedIndicator = button.querySelector(".availability-indicator");
        }
        const indicator = button.querySelector(".availability-indicator");
        const menuTemplateResponse = await fetch(
            "/static/adapters/social/profile/availability-menu.html",
            options,
        );
        const markup = await menuTemplateResponse.text();
        if (!isCurrent()) return;
        statusItem.innerHTML = markup;
        applyStaticTranslations(i18n, statusItem);

        const statusToggle = statusItem.querySelector(
            ".availability-menu-toggle",
        );
        const statusOptions = statusItem.querySelector(
            ".availability-menu-options",
        );
        const optionTemplate = statusOptions.querySelector(
            "[data-availability-option-template]",
        );
        for (const status of STATUS_OPTIONS) {
            const fragment = optionTemplate.content.cloneNode(true);
            const option = fragment.querySelector(".availability-menu-option");
            option.dataset.availabilityOption = status;
            option.querySelector(
                ".availability-menu-dot",
            ).dataset.availabilityStatus = status;
            option.querySelector("[data-availability-label]").textContent =
                i18n.t(`ui.app.profile.availability.${status}`);
            statusOptions.append(fragment);
        }
        optionTemplate.remove();
        const availability = await fetchAvailability();
        if (!isCurrent()) return;
        updateAvailabilitySelection(
            statusItem,
            indicator,
            availability?.status ?? "free",
            i18n,
        );
        unsubscribe = subscribeAvailabilityUpdates((updatedAvailability) => {
            if (!isCurrent() || !updatedAvailability?.status) return;
            updateAvailabilitySelection(
                statusItem,
                indicator,
                updatedAvailability.status,
                i18n,
            );
        });

        statusToggle.addEventListener(
            "click",
            () => {
                const shouldOpen = statusOptions.hidden;
                statusOptions.hidden = !shouldOpen;
                statusToggle.setAttribute("aria-expanded", String(shouldOpen));
            },
            options,
        );

        statusItem
            .querySelectorAll("[data-availability-option]")
            .forEach((option) => {
                option.addEventListener(
                    "click",
                    async () => {
                        const selectedStatus =
                            option.dataset.availabilityOption;
                        if (await setManualAvailability(selectedStatus)) {
                            if (!isCurrent()) return;
                            await refreshAvailabilityIndicators();
                            if (!isCurrent()) return;
                            statusOptions.hidden = true;
                            statusToggle.setAttribute("aria-expanded", "false");
                        }
                    },
                    options,
                );
            });
    } catch (error) {
        dispose();
        throw error;
    }
}

function mountAvailabilityControl(scope, i18n) {
    if (availabilityMounts.has(scope)) return availabilityMounts.get(scope);
    const pending = performAvailabilityControlMount(scope, i18n).finally(() => {
        if (availabilityMounts.get(scope) === pending)
            availabilityMounts.delete(scope);
    });
    availabilityMounts.set(scope, pending);
    return pending;
}

function updateAvailabilitySelection(container, indicator, status, i18n) {
    const label = i18n.t(`ui.app.profile.availability.${status}`);
    const value = container.querySelector(".availability-menu-value");
    const currentDot = container.querySelector(
        ".availability-menu-toggle .availability-menu-dot",
    );
    value.textContent = label;
    currentDot.dataset.availabilityStatus = status;
    container
        .querySelectorAll("[data-availability-option]")
        .forEach((option) => {
            option.setAttribute(
                "aria-selected",
                String(option.dataset.availabilityOption === status),
            );
        });
    indicator.dataset.availabilityStatus = status;
    if (STATUS_OPTIONS.includes(status)) {
        indicator.dataset.availableStatus = status;
    }
    indicator.title = label;
    indicator.setAttribute("aria-label", label);
}

export async function mountProvider(scope) {
    scope.capabilities.contribute(
        "ui:navbarAvatarProvider",
        createNavbarAvatarProvider(scope),
    );
    const removeSearch = registerSearchIndexing();
    scope.signal.addEventListener("abort", removeSearch, { once: true });
    const i18n = await createI18n({
        componentStringBaseUrls: ["/static/adapters/social/profile/languages"],
    });
    scope.signal.throwIfAborted();
    bindProfilePreviews(i18n);
    await mountAvailabilityControl(scope, i18n);
    scope.signal.throwIfAborted();
    window.addEventListener(
        "cognis:navbar-refresh",
        () => {
            mountAvailabilityControl(scope, i18n).catch((error) => {
                if (scope.signal.aborted) return;
                const log = scope.capabilities.get("ui:log");
                log?.("error", "Profile availability menu refresh failed.", {
                    component: "social-profile",
                    operation: "refreshAvailabilityMenu",
                    errorName: error?.name,
                });
            });
        },
        { signal: scope.signal },
    );
}
