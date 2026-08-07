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

    for (const status of ["free", "busy", "tentative"]) {
        assert.match(
            template,
            new RegExp(
                `data-availability-option="${status}"[\\s\\S]+data-availability-status="${status}"`,
            ),
        );
    }
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
