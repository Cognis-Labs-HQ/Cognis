import assert from "node:assert/strict";
import test from "node:test";
import { CapabilityStore, createCtx, GatewayRegistry } from "@cognis/core";
import type { DbExecutor } from "../../../../gateways/db/reuse/db-executor.js";
import {
    CoreStudyGateway,
    type StudyAdapterBootstrapCtx,
    type StudyClassAccessCapability,
} from "../../../../gateways/study/gateway.js";
import { bootstrapStudyAdapter } from "../index.js";

test("registered class access uses current memberships and the class teacher without missing store methods", async () => {
    let enrolled = true;
    let enabled = true;
    const commands: string[] = [];
    const db: DbExecutor = {
        ensureTable: async () => {},
        transaction: async (operation) => operation(db),
        executeCommand: async (command) => {
            commands.push(command.table);
            if (command.option !== "SELECT") return { rows: [] };
            const rows =
                command.table === "study_classes" &&
                command.where?.some(
                    (clause) =>
                        clause.column === "id" && clause.value === "class",
                )
                    ? [
                          {
                              id: "class",
                              language_code: "ja",
                              teacher_account_id: "teacher",
                              created_at: "2026-10-19",
                          },
                      ]
                    : command.table === "class_memberships" && enrolled
                      ? [
                            {
                                class_id: "class",
                                student_account_id: "learner",
                                status: "member",
                                joined_at: "2026-10-19",
                            },
                        ]
                      : [];
            return { rows };
        },
    };
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", db);
    const ctx = createCtx();
    ctx.registerFlow({
        id: "deprovision-user",
        stages: ["cleanup-dependencies"],
    });
    const routes: unknown[] = [];
    const pages: unknown[] = [];
    const context: StudyAdapterBootstrapCtx = {
        capabilities,
        flow: ctx.flow,
        gateway: new CoreStudyGateway(),
        gatewayRegistry: new GatewayRegistry(),
        adapterId: "classes",
        adapterRoot: "",
        isAdapterEnabled: () => enabled,
        registerRoute: (route) => routes.push(route),
        registerStaticDir: (prefix, directory) =>
            pages.push({ prefix, directory }),
        registerNavbarPlugin: (url) => pages.push(url),
        registerPageExtension: (id, element) => pages.push({ id, element }),
    };
    await bootstrapStudyAdapter(context);
    const access = capabilities.require<StudyClassAccessCapability>(
        "study:classes:access",
    );
    assert.equal(await access.canRead("class", "learner", "user"), true);
    assert.equal(await access.canRead("class", "outsider", "user"), false);
    assert.equal(await access.canWrite("class", "learner", "user"), false);
    assert.equal(await access.canWrite("class", "teacher", "teacher"), true);
    for (const role of ["admin", "owner"]) {
        assert.equal(await access.canWrite("missing", "admin", role), false);
        assert.equal(await access.canRead("missing", "admin", role), false);
        assert.equal(await access.canWrite("class", "admin", role), true);
    }
    enrolled = false;
    assert.equal(await access.canRead("class", "learner", "user"), false);
    enabled = false;
    assert.equal(await access.canRead("class", "teacher", "teacher"), false);
    assert.equal(await access.canWrite("class", "admin", "admin"), false);
    assert.deepEqual(await access.listReadable?.("learner", "user"), []);
    assert.ok(commands.includes("class_memberships"));
    assert.ok(routes.length > 0);
});
