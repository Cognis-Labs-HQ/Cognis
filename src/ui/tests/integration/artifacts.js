/** Save optional real-browser screenshots under the configured test artifact directory. */
import { mkdir, writeFile } from "node:fs/promises";
import { resolve } from "node:path";

/** @param {object} browser CDP browser. @param {string} name Artifact basename. @returns {Promise<void>} */
export async function captureScreenshot(browser, name) {
    const directory = process.env.COGNIS_BROWSER_ARTIFACTS;
    if (!directory) return;
    await mkdir(directory, { recursive: true });
    const screenshot = await browser.command("Page.captureScreenshot", {
        format: "png",
    });
    await writeFile(
        resolve(directory, `${name}.png`),
        Buffer.from(screenshot.data, "base64"),
    );
}
