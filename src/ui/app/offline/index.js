import { offlinePolicy } from "../../reuse/offline-policy.js";
import { offlineWorkerRequest } from "../../reuse/offline-state.js";
import { setOffline } from "../../reuse/offline-state.js";
import { initRouter, navigateTo } from "../../reuse/app-router.js";
import { loadWithSpaImportGuard } from "../../reuse/page-entry.js";

console.info("offline:restoreShell", {
    component: "ui",
    operation: "offlineBoot",
});
offlinePolicy.configure(
    await offlineWorkerRequest("COGNIS_OFFLINE_REQUIREMENTS"),
);
setOffline(true);
globalThis.__cognisPublicSpaRoute = true;
const root = document.querySelector("#app");
initRouter(root);
const mounted = await navigateTo(
    `${location.pathname}${location.search}${location.hash}`,
    { replace: true },
);
if (!mounted && !root.children.length) {
    const controller = new AbortController();
    window.addEventListener(
        "cognis:route-will-change",
        () => controller.abort(),
        { once: true },
    );
    const fallback = await loadWithSpaImportGuard(
        () => import("../error/index.js"),
    );
    await fallback.mount(root, { signal: controller.signal });
}
console.info("offline:shellReady", {
    component: "ui",
    operation: "offlineBoot",
});
