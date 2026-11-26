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
    // Rendering checks can isolate layout from service-worker cache lifecycle tests.
    if (process.env.COGNIS_BROWSER_BYPASS_SERVICE_WORKER === "1") {
        await browser.command("Network.enable");
        await browser.command("Network.setBypassServiceWorker", {
            bypass: true,
        });
    }
    const credentials = JSON.parse(await readFile(credentialsFile, "utf8"));
    await browser.command("Page.navigate", {
        url: new URL("/login", origin).href,
    });
    await browser.waitFor('Boolean(document.querySelector("#login-username"))');
    await browser.callFunction(
        `async function(credentials) {
        const username = document.querySelector('#login-username');
        const password = document.querySelector('#login-password');
        const provider = document.querySelector('#login-provider');
        username.value = credentials.username;
        password.value = credentials.password;
        if (provider) provider.value = credentials.provider ?? 'local';
        for (const input of [username, password, provider].filter(Boolean))
            input.dispatchEvent(new Event('input', { bubbles: true }));
        username.form.requestSubmit();
    }`,
        [credentials],
    );
    await browser.waitFor(
        'Boolean(localStorage.getItem("cognis_access_token"))',
        {
            timeoutMs: 20000,
        },
    );
    return { browser, origin };
}
