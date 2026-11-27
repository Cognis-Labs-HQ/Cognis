import { uiCtx } from "/static/reuse/ui-ctx.js";

try {
    const options = new URLSearchParams(location.search);
    globalThis.__spaRouter = true;
    localStorage.setItem("cognis_account", "fixture");
    localStorage.setItem("cognis_access_token", "fixture-noncredential");
    localStorage.setItem("cognis_display_name", "Alexandra");
    localStorage.setItem("cognis_role", "user");
    localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify([options.get("lang") ?? "en"]),
    );
    localStorage.setItem("cognis_language_priority_mode", "manual");
    const lifetime = new AbortController();
    uiCtx.capabilities.contribute("session:getAccountInfo", () => ({
        createdAt: "2026-11-01T00:00:00Z",
        lastLogin: "2026-11-13T14:13:00Z",
    }));
    const { mount } = await import("/static/app/dashboard/index.js");
    await mount(document.querySelector("#app"), { signal: lifetime.signal });
    // The fixture calls mount directly, so it also completes the page-entry readiness contract.
    document.body.dataset.pageReady = "true";
    await document.fonts.ready;
    window.fixture = { lifetime };
} catch (error) {
    window.fixture = { error: error.stack };
}
