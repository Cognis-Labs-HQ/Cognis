import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const PROFILE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "..");

test("availability menu presents every status with a matching dot", () => {
    const template = readFileSync(
        resolve(PROFILE_ROOT, "ui/availability-menu.html"),
        "utf8",
    );
    const navbar = readFileSync(resolve(PROFILE_ROOT, "ui/navbar.js"), "utf8");

    assert.match(template, /data-availability-option-template/);
    assert.match(navbar, /for \(const status of STATUS_OPTIONS\)/);
    assert.doesNotMatch(template, /data-availability-option="/);
});

test("availability menu uses borderless controls and hover outlines", () => {
    const styles = readFileSync(
        resolve(PROFILE_ROOT, "ui/availability.css"),
        "utf8",
    );

    assert.match(styles, /\.availability-menu-toggle,[\s\S]+border: 0;/);
    assert.match(
        styles,
        /\.availability-menu-option:hover,[\s\S]+outline: 1px solid var\(--accent\);/,
    );
});

test("availability options open beside the profile menu", () => {
    const styles = readFileSync(
        resolve(PROFILE_ROOT, "ui/availability.css"),
        "utf8",
    );

    assert.match(
        styles,
        /\.availability-menu-options \{[\s\S]+position: absolute;[\s\S]+right: calc\(100% \+ 8px\);/,
    );
    assert.match(
        styles,
        /\.dropdown:has\(\.availability-menu-item\) \{[\s\S]+overflow: visible;/,
    );
});

test("idle status is detector-controlled and not manually selectable", () => {
    const availability = readFileSync(
        resolve(PROFILE_ROOT, "ui/availability.js"),
        "utf8",
    );
    const styles = readFileSync(
        resolve(PROFILE_ROOT, "ui/availability.css"),
        "utf8",
    );

    assert.match(availability, /subscribePresenceActivity/);
    assert.match(availability, /availability\/presence/);
    assert.match(availability, /locallyIdle[\s\S]+"idle"/);
    assert.match(
        availability,
        /STATUS_OPTIONS = Object\.freeze\(\["free", "busy", "tentative"\]\)/,
    );
    assert.match(
        styles,
        /data-availability-status="idle"[\s\S]+filter: grayscale\(1\);/,
    );
});

test("profile heroes render and hydrate visibility-aware status lights", () => {
    const renderer = readFileSync(
        resolve(PROFILE_ROOT, "ui/profile-render.js"),
        "utf8",
    );
    const app = readFileSync(resolve(PROFILE_ROOT, "ui/app.js"), "utf8");

    assert.match(renderer, /availabilityIndicatorMarkup\(""\)/);
    assert.match(
        renderer,
        /availabilityIndicatorMarkup\(profile\?\.handle \?\? ""\)/,
    );
    assert.match(app, /hydrateAvailabilityIndicators\(root\)/);
});
