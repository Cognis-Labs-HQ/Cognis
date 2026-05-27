/**
 * Release changelog popup helper for dashboard-shell pages.
 *
 * Public exports:
 * - maybeShowReleaseChangelogPopup(i18n): loads release changelog metadata from
 *   the API and conditionally shows a popup when there are unseen release notes
 *   or the installed release version changed.
 *
 * Usage example:
 *   await maybeShowReleaseChangelogPopup(i18n);
 *
 * @param {{ t: (key: string) => string }} i18n Localization instance with string
 * translation function returning plain text for each i18n key.
 * @returns {Promise<void>}
 */
import { apiFetch } from "../../reuse/api-client.js";
import { escapeHtml } from "../../reuse/escape-html.js";
import { readPreferredLanguages } from "../../reuse/i18n.js";
import { openPopup } from "../../reuse/popup.js";
import { navigateTo } from "../../reuse/app-router.js";
import {
    loadUiPreferences,
    saveUiPreferences,
} from "../../reuse/ui-preferences.js";

const MAX_VISIBLE_RELEASE_NOTES = 5;
const MAX_VISIBLE_RELEASE_NOTE_BULLETS = 5;

function normalizeSeenSlugs(rawSlugs) {
    if (!Array.isArray(rawSlugs)) return [];
    return rawSlugs
        .filter((slug) => typeof slug === "string" && slug.trim().length > 0)
        .map((slug) => slug.trim());
}

function buildReleaseNotesBody(i18n, releaseVersion, releaseEntries) {
    const notesItems = releaseEntries
        .slice(0, MAX_VISIBLE_RELEASE_NOTES)
        .map((entry) => {
            const safeTitle = escapeHtml(entry.title ?? "");
            const dotPoints = Array.isArray(entry.changes)
                ? entry.changes
                      .slice(0, MAX_VISIBLE_RELEASE_NOTE_BULLETS)
                      .map(
                          (changeHeading) =>
                              `<li>${escapeHtml(changeHeading)}</li>`,
                      )
                      .join("")
                : "";
            return `
        <li class="popup-summary-item">
          <strong>${safeTitle}</strong>
          <ul class="popup-summary-sublist">${dotPoints}</ul>
        </li>
      `;
        })
        .join("");
    const introText = i18n
        .t("ui.reuse.release_notes_intro")
        .replace("{version}", releaseVersion || i18n.t("ui.reuse.unknown"));
    return `
      <p>${escapeHtml(introText)}</p>
      <ul class="popup-summary-list">${notesItems}</ul>
      <label class="popup-summary-checkbox-row">
        <input id="release-notes-never-show-checkbox" type="checkbox" />
        <span>${escapeHtml(i18n.t("ui.reuse.release_notes_never_show_again"))}</span>
      </label>
    `;
}

export async function maybeShowReleaseChangelogPopup(i18n) {
    const accountId = localStorage.getItem("cognis_account");
    if (!accountId) return;

    const prefs = (await loadUiPreferences()) ?? {};
    if (prefs.releaseChangelogShow === false) return;

    let changelogPayload;
    try {
        const langs = readPreferredLanguages().join(",");
        const response = await apiFetch(
            `/api/v1/system/release-changelog?langs=${encodeURIComponent(langs)}`,
        );
        if (!response.ok) return;
        changelogPayload = await response.json();
    } catch {
        return;
    }
    const releaseVersion = String(
        changelogPayload?.data?.releaseVersion ?? "",
    ).trim();
    const releaseEntries = Array.isArray(changelogPayload?.data?.entries)
        ? changelogPayload.data.entries
        : [];
    if (releaseEntries.length === 0) return;

    const releaseSlugs = releaseEntries
        .map((entry) => String(entry?.slug ?? "").trim())
        .filter((slug) => slug.length > 0);
    const seenSlugs = normalizeSeenSlugs(prefs.releaseChangelogSeenSlugs);
    const unseenEntries = releaseEntries.filter(
        (entry) => !seenSlugs.includes(String(entry?.slug ?? "").trim()),
    );
    const versionChanged =
        releaseVersion.length > 0 &&
        releaseVersion !== String(prefs.releaseChangelogLastVersion ?? "");
    if (!versionChanged && unseenEntries.length === 0) return;
    const entriesToRender =
        unseenEntries.length > 0 ? unseenEntries : releaseEntries;

    let neverShowAgainChecked = false;
    const action = await openPopup({
        title: i18n
            .t("ui.reuse.release_notes_title")
            .replace("{version}", releaseVersion || i18n.t("ui.reuse.unknown")),
        body: buildReleaseNotesBody(i18n, releaseVersion, entriesToRender),
        maxWidth: "680px",
        actions: [
            {
                id: "view_changelogs",
                label: i18n.t("ui.reuse.release_notes_view_all"),
                variant: "confirm",
            },
            {
                id: "dismiss",
                label: i18n.t("ui.reuse.dismiss"),
                variant: "cancel",
            },
        ],
        onOpen: (overlay) => {
            const checkbox = overlay.querySelector(
                "#release-notes-never-show-checkbox",
            );
            if (!(checkbox instanceof HTMLInputElement)) return;
            checkbox.addEventListener("change", () => {
                neverShowAgainChecked = checkbox.checked;
            });
        },
    });

    await saveUiPreferences({
        releaseChangelogShow: !neverShowAgainChecked,
        releaseChangelogSeenSlugs: releaseSlugs,
        releaseChangelogLastVersion: releaseVersion || null,
    });

    if (action === "view_changelogs") {
        await navigateTo("/changelogs");
    }
}
