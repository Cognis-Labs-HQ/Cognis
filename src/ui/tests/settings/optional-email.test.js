import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";
import { escapeHtml } from "../../reuse/escape-html.js";

for (const notifyState of ["absent", "failed", "available"]) {
    test(`Settings account actions remain bound with Notify ${notifyState}`, async () => {
        const listeners = new Map(),
            requests = [],
            popups = [],
            toasts = [];
        class Element {
            constructor(dataset = {}) {
                this.dataset = dataset;
            }
        }
        class Input extends Element {
            constructor() {
                super();
                this.value = "confirmation-password";
            }
        }
        const section = { hidden: false };
        const root = {
            addEventListener: (type, handler) => listeners.set(type, handler),
            querySelector: (selector) =>
                selector === "#email-list"
                    ? {
                          closest: () => section,
                          innerHTML: "",
                      }
                    : null,
        };
        const emailClient =
            notifyState === "absent"
                ? null
                : {
                      request: async () => {
                          if (notifyState === "failed")
                              throw new Error("email_transport_unavailable");
                          return Response.json({ data: [] });
                      },
                  };
        const { initGeneralPrefs } = loadTestModule(
            new URL("../../app/settings/general-prefs.js", import.meta.url),
            {
                "../../reuse/escape-html.js": { escapeHtml },
                "../../reuse/ui-ctx.js": {
                    uiCtx: { capabilities: { get: () => emailClient } },
                },
                "../../reuse/offline-state.js": { isOffline: () => false },
                "../../reuse/api-client.js": {
                    apiFetch: async (path, options) => {
                        requests.push({ path, body: JSON.parse(options.body) });
                        return Response.json({ data: {} });
                    },
                },
                "../../reuse/popup.js": {
                    openPopup: async (options) => {
                        popups.push(options);
                    },
                },
                "../../reuse/validation-url.js": {
                    watchToken: () => assert.fail("no verification requested"),
                },
                "../../reuse/toast.js": {
                    showToast: (...args) => toasts.push(args),
                },
                "../../reuse/trusted-domains.js": {
                    matchesTrustedDomain: () => true,
                },
            },
            {
                HTMLElement: Element,
                HTMLInputElement: Input,
                window: { location: { replace() {} } },
            },
        );
        const prefs = initGeneralPrefs(root, {
            i18n: { t: (key) => key },
            username: "learner",
        });
        if (notifyState === "failed")
            await assert.rejects(prefs.init(), /email_transport_unavailable/);
        else await prefs.init();
        assert.equal(section.hidden, notifyState === "absent");
        for (const action of ["archive", "deactivate", "delete"]) {
            await listeners.get("click")({
                target: new Element({ accountAction: action }),
            });
            const popup = popups.at(-1);
            assert.ok(popup, `confirmation for ${action}`);
            await popup.onAction("confirm", {
                querySelector: () => new Input(),
            });
            assert.equal(
                requests.at(-1).path,
                "/api/v1/auth/account-lifecycle",
            );
            assert.equal(requests.at(-1).body.action, action);
            assert.equal(toasts.at(-1)[0], "ui.app.settings.danger_completed");
        }
        assert.equal(requests.length, 3);
    });
}
