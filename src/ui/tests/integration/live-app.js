/** Shared authenticated browser lifecycle and real page readiness for live UI checks. */
import { readFile } from "node:fs/promises";
import { findChromium, launchChromium } from "./chromium.js";
const origin = process.env.COGNIS_CORE_BROWSER_URL;
const credentialsFile = process.env.COGNIS_BROWSER_CREDENTIALS;
const executable =
    process.env.COGNIS_BROWSER_TESTS === "1" ? findChromium() : null;
export const liveBrowserSkip =
    !executable || !origin || !credentialsFile
        ? "Requires COGNIS_BROWSER_TESTS=1, Chromium, COGNIS_CORE_BROWSER_URL and COGNIS_BROWSER_CREDENTIALS for an isolated Cognis instance."
        : false;

export async function settleLivePage(browser) {
    await browser.waitFor(
        'document.readyState === "complete" && Boolean(document.body)',
        { timeoutMs: 20000 },
    );
    await browser.waitFor(
        'document.body?.dataset.pageReady === "true" || Boolean(document.querySelector(".tutorial-actions,.popup-close-btn"))',
        { timeoutMs: 20000 },
    );
    await browser.evaluate(`(async () => {
        const {ensureNavbarPluginsLoaded} = await import("/static/reuse/ui-provider-loader.js");
        await ensureNavbarPluginsLoaded();
    })()`);
    const deadline = Date.now() + 30000;
    while (Date.now() < deadline) {
        const active = await browser.evaluate(
            `(async () => {
      const {uiCtx} = await import('/static/reuse/ui-ctx.js');
      await uiCtx.capabilities.get('ui:tutorials')?.refreshPage();
      const close = document.querySelector('.popup-overlay--visible .popup-close-btn');
      if(close) { close.click(); return true; }
      const next = [...document.querySelectorAll('.tutorial-actions [data-action="next"]')].find(button => !button.disabled && button.checkVisibility({checkVisibilityCSS:true}) && !button.closest('[inert]'));
      if(next) { next.click(); return true; }
      return Boolean(uiCtx.capabilities.get("ui:tutorials")?.current()) || !uiCtx.capabilities.get("ui:pageReadiness")?.isReady();
    })()`,
        );
        if (!active) break;
        await browser.evaluate(
            "new Promise(resolve => setTimeout(resolve, 100))",
        );
    }
    await browser.waitFor(
        `(async()=>{const{uiCtx}=await import("/static/reuse/ui-ctx.js");return uiCtx.capabilities.get("ui:pageReadiness")?.isReady() && !document.querySelector(".tutorial-actions,.popup-overlay") && Boolean(document.querySelector("[data-composer-element]"));})()`,
        { timeoutMs: 20000 },
    );
    await browser.evaluate("document.fonts.ready");
    await browser.evaluate(
        "new Promise(resolve => requestAnimationFrame(() => requestAnimationFrame(resolve)))",
    );
}

/** Start a real browser against an explicitly configured isolated Cognis instance. */
export async function startLiveApp(context) {
    const browser = await launchChromium(executable);
    context.after(() => browser.close());
    const credentials = JSON.parse(await readFile(credentialsFile, "utf8"));
    await browser.command("Page.navigate", {
        url: new URL("/login", origin).href,
    });
    await browser.waitFor('Boolean(document.querySelector("#login-username"))');
    await browser.callFunction(
        `async function(credentials) {
        const response = await fetch('/api/v1/auth/login', { method: 'POST', headers: {'content-type': 'application/json'}, body: JSON.stringify(credentials) });
        if (!response.ok) throw new Error('Core browser QA authentication failed');
        const {persistLoginSession} = await import('/static/gateways/auth/login-client.js');
        persistLoginSession((await response.json()).data);
    }`,
        [credentials],
    );
    return { browser, origin };
}
