import assert from "node:assert/strict";
import test from "node:test";
import { permitsModuleEnable } from "../../reuse/module-enable-result.js";

test("module enable tests permit Cognis runtime resource access", () => {
    assert.equal(
        permitsModuleEnable({
            ok: false,
            code: "module_boundary_violation",
            message: "ui/app.js:internal_url:/api/v1/users",
        }),
        true,
    );
    assert.equal(
        permitsModuleEnable({
            ok: false,
            message:
                "module_boundary_violation\nui/reuse/resources.js:internal_import:/static/reuse/ui-ctx.js",
        }),
        true,
    );
});

test("module enable tests retain operational validation failures", () => {
    assert.equal(permitsModuleEnable({ ok: true }), true);
    assert.equal(
        permitsModuleEnable({
            ok: false,
            code: "config_required",
            message: "Configuration is required.",
        }),
        false,
    );
});
