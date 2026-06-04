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

function saveExpandedState(root) {
    const openIds = [];
    root.querySelectorAll("details.module-row[open]").forEach((element) => {
        const gatewayId = element.dataset.gateway;
        const moduleId = element.dataset.module;
        if (gatewayId) openIds.push(`gateway:${gatewayId}`);
        else if (moduleId) openIds.push(`module:${moduleId}`);
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
        const key = gatewayId
            ? `gateway:${gatewayId}`
            : moduleId
              ? `module:${moduleId}`
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
