import assert from "node:assert/strict";
import test from "node:test";

import {
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
