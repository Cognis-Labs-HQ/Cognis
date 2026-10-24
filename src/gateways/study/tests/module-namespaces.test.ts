import assert from "node:assert/strict";
import test from "node:test";
import { GatewayRegistry } from "@cognis/core";
import { authorizeLanguageModuleNamespace } from "../module-namespaces.js";

test("Study delegates only matching language module namespaces while active", () => {
    const registry = new GatewayRegistry();
    registry.register({ id: "study", name: "Study", version: "1.0.0" });
    registry.registerModuleNamespacePolicy(
        "study",
        authorizeLanguageModuleNamespace,
    );
    for (const language of ["ja", "en", "pt-br"]) {
        const moduleId = `study-language-${language}`;
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "apiRoute",
                id: `/api/v1/study/languages/${language}/library`,
            }),
            true,
        );
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "ctxRegistration",
                id: `study:language:${language}`,
            }),
            true,
        );
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "ctxRegistration",
                id: `study:language:${language}:library`,
            }),
            true,
        );
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "ctxRegistration",
                id: "auth:login",
            }),
            false,
        );
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "apiRoute",
                id: "/api/v1/study/languages/other/library",
            }),
            false,
        );
    }
    for (const moduleId of ["notes", "study-language-", "study-language-../ja"])
        assert.equal(
            registry.allowsModuleNamespace({
                moduleId,
                kind: "ctxRegistration",
                id: "study:language:ja",
            }),
            false,
        );
    registry.disable("study");
    assert.equal(
        registry.allowsModuleNamespace({
            moduleId: "study-language-ja",
            kind: "ctxRegistration",
            id: "study:language:ja",
        }),
        false,
    );
});
