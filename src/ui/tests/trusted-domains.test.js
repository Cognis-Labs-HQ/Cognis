import test from "node:test";
import assert from "node:assert/strict";
import {
    clearTrustedDomainsCache,
    isTrustedHttpUrl,
    loadTrustedDomains,
    matchesTrustedDomain,
} from "../reuse/trusted-domains.js";

test("UI trusted-domain matching accepts subdomains", () => {
    assert.equal(
        matchesTrustedDomain("docs.example.com", ["example.com"]),
        true,
    );
    assert.equal(
        matchesTrustedDomain("docs.example.net", ["example.com"]),
        false,
    );
});

test("UI trusted URL validation allows same-origin and trusted external URLs", () => {
    assert.equal(
        isTrustedHttpUrl("/docs", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: [],
        }),
        true,
    );
    assert.equal(
        isTrustedHttpUrl("https://status.example.com/landing", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: ["example.com"],
        }),
        true,
    );
    assert.equal(
        isTrustedHttpUrl("https://attacker.example.net/landing", {
            baseUrl: "https://cognis.example.com",
            trustedDomains: ["example.com"],
        }),
        false,
    );
});

test("loadTrustedDomains caches normalized results and supports reloads", async () => {
    clearTrustedDomainsCache();
    let callCount = 0;
    const apiFetch = async () => {
        callCount += 1;
        return {
            ok: true,
            json: async () => ({
                data: {
                    trustedDomains: [" Example.com ", ".docs.example.com."],
                },
            }),
        };
    };

    const firstLoad = await loadTrustedDomains(apiFetch);
    const secondLoad = await loadTrustedDomains(async () => {
        throw new Error("should use cache");
    });

    assert.deepEqual(firstLoad, ["example.com", "docs.example.com"]);
    assert.deepEqual(secondLoad, ["example.com", "docs.example.com"]);
    assert.equal(callCount, 1);

    await loadTrustedDomains(apiFetch, { forceReload: true });
    assert.equal(callCount, 2);
});
