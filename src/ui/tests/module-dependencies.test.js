import assert from "node:assert/strict";
import test from "node:test";

import {
    areModuleDependenciesSatisfied,
    isRequiredDependency,
    resolveInstallDependencies,
} from "../app/modules/dependencies.js";

const required = { id: "calendar", uuid: "calendar-uuid", name: "Calendar" };
const optional = {
    id: "whiteboard",
    uuid: "whiteboard-uuid",
    name: "Whiteboard",
};
const requesting = {
    id: "classroom",
    uuid: "classroom-uuid",
    hardDependencies: [required.uuid],
    softDependencies: [optional.id],
};
const modules = [required, optional, requesting];

test("module dependencies resolve module IDs and UUIDs", () => {
    assert.equal(isRequiredDependency(required, modules), true);
    assert.equal(isRequiredDependency(optional, modules), false);
    assert.deepEqual(
        resolveInstallDependencies(requesting, modules, [optional.id]),
        [required, optional],
    );
});

test("module dependencies are satisfied only when every dependency is enabled", () => {
    assert.equal(areModuleDependenciesSatisfied(requesting, modules), false);
    required.installed = true;
    required.status = "enabled";
    optional.installed = true;
    optional.status = "enabled";
    assert.equal(areModuleDependenciesSatisfied(requesting, modules), true);
});

test("module dependency popup renders navigable cards and action-specific labels", async () => {
    const source = await import("node:fs/promises").then(({ readFile }) =>
        readFile(
            new URL("../app/modules/dependencies.js", import.meta.url),
            "utf8",
        ),
    );
    assert.match(source, /module-dependency-card/);
    assert.match(source, /module-dependency-details/);
    assert.match(source, /ui\.app\.modules\.optional/);
    assert.match(source, /dependency\?\.recommended/);
    assert.match(source, /label: i18n\.t\(`ui\.reuse\.\$\{action\}`\)/);
});
