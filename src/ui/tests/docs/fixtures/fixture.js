import { loadWithSpaImportGuard } from "/static/reuse/page-entry.js";

try {
    const language = new URLSearchParams(location.search).get("lang") ?? "en";
    localStorage.setItem(
        "cognis_language_priority",
        JSON.stringify([language]),
    );
    localStorage.setItem("cognis_language_priority_mode", "manual");
    localStorage.setItem("cognis_account", "fixture");
    localStorage.setItem("cognis_access_token", "fixture-noncredential");
    const page = await loadWithSpaImportGuard(
        () => import("/static/app/docs/index.js"),
    );
    const lifetime = new AbortController();
    await page.mount(document.querySelector("#app"), {
        signal: lifetime.signal,
    });
    document.body.dataset.pageReady = "true";
    window.fixture = { dispose: () => lifetime.abort() };
} catch (error) {
    window.fixture = { error: error.message };
}
