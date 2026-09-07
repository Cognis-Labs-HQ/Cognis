const EXPANDED_STATE_KEY = "admin-expanded-rows";

export function bindSummarySliderClicks(root) {
    root.querySelectorAll(".module-row summary .switch--inline").forEach(
        (label) => {
            label.addEventListener("click", (event) => {
                event.stopPropagation();
            });
        },
    );
}

export function bindDetailsToggleClicks(root) {
    root.querySelectorAll("[data-details-toggle]").forEach((toggle) => {
        const details = toggle.closest("details.module-row");
        if (!(details instanceof HTMLDetailsElement)) return;
        const activate = (event) => {
            event.preventDefault();
            event.stopPropagation();
            details.open = !details.open;
        };
        toggle.addEventListener("click", activate);
        toggle.addEventListener("keydown", (event) => {
            if (event.key === "Enter" || event.key === " ") activate(event);
        });
    });
}

function saveExpandedState(root) {
    const openIds = [];
    root.querySelectorAll("details.module-row[open]").forEach((element) => {
        const gatewayId = element.dataset.gateway;
        const moduleId = element.dataset.module;
        const adapterId = element.dataset.adapterId;
        const adapterGatewayId = element.dataset.gatewayId;
        if (gatewayId) openIds.push(`gateway:${gatewayId}`);
        else if (moduleId) openIds.push(`module:${moduleId}`);
        else if (adapterId && adapterGatewayId)
            openIds.push(`adapter:${adapterGatewayId}:${adapterId}`);
    });
    try {
        sessionStorage.setItem(EXPANDED_STATE_KEY, JSON.stringify(openIds));
    } catch {}
}

export function restoreExpandedState(root) {
    let openIds;
    try {
        openIds = JSON.parse(
            sessionStorage.getItem(EXPANDED_STATE_KEY) ?? "[]",
        );
    } catch {
        openIds = [];
    }
    const openSet = new Set(openIds);
    root.querySelectorAll("details.module-row").forEach((element) => {
        const gatewayId = element.dataset.gateway;
        const moduleId = element.dataset.module;
        const adapterId = element.dataset.adapterId;
        const adapterGatewayId = element.dataset.gatewayId;
        const key = gatewayId
            ? `gateway:${gatewayId}`
            : moduleId
              ? `module:${moduleId}`
              : adapterId && adapterGatewayId
                ? `adapter:${adapterGatewayId}:${adapterId}`
                : null;
        if (key && openSet.has(key)) {
            element.setAttribute("open", "");
        }
    });
}

export function bindExpandedStateListeners(root) {
    root.querySelectorAll("details.module-row").forEach((element) => {
        element.addEventListener("toggle", () => {
            saveExpandedState(root);
        });
    });
}
