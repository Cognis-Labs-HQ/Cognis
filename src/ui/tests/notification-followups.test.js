import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import vm from "node:vm";

const ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");

test("mobile notification backdrop stays hidden until explicitly opened", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/notifications.css"),
        "utf8",
    );
    assert.match(source, /\.notification-mobile-backdrop\[hidden\]\s*\{/);
    assert.match(
        source,
        /\.notification-mobile-backdrop:not\(\[hidden\]\)\s*\{/,
    );
});

test("clear-all notifications button is disabled for empty inboxes", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    assert.match(source, /clearAllBtn\.disabled = true;/);
    assert.match(
        source,
        /clearAllBtn\.disabled = currentNotifications\.length === 0;/,
    );
    assert.match(source, /if \(currentNotifications\.length === 0\) return;/);
});

test("notification arrivals publish a component-neutral browser event", () => {
    const notificationSource = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    assert.match(
        notificationSource,
        /new CustomEvent\("cognis:notification-arrival"/,
    );
    assert.match(notificationSource, /detail: \{ notification: notif \}/);
});

test("notification actions can be handled without leaving the dashboard", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    assert.match(source, /new CustomEvent\("cognis:notification-action"/);
    assert.match(
        source,
        /if \(!window\.dispatchEvent\(actionEvent\)\) return;/,
    );
});

test("arrival notifications are suppressed on their owning page", () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    assert.match(source, /function isNotificationOwnedByCurrentPage/);
    assert.match(source, /actionPage === currentPage/);
    assert.match(
        source,
        /!notif\.read && !isNotificationOwnedByCurrentPage\(notif\)/,
    );
});

class FakeElement {
    constructor(tagName, ownerDocument) {
        this.tagName = String(tagName).toUpperCase();
        this.ownerDocument = ownerDocument;
        this.children = [];
        this.parentNode = null;
        this.className = "";
        this.id = "";
        this.type = "";
        this.hidden = false;
        this.disabled = false;
        this.tabIndex = 0;
        this.textContent = "";
        this._innerHTML = "";
        this.dataset = {};
        this.style = {};
        this.listeners = new Map();
        this.classList = {
            add: (...classes) => {
                const current = new Set(
                    this.className.split(/\s+/).filter(Boolean),
                );
                classes.forEach((name) => current.add(name));
                this.className = Array.from(current).join(" ");
            },
            remove: (...classes) => {
                const toRemove = new Set(classes);
                this.className = this.className
                    .split(/\s+/)
                    .filter((name) => name && !toRemove.has(name))
                    .join(" ");
            },
            contains: (name) =>
                this.className.split(/\s+/).filter(Boolean).includes(name),
        };
    }

    appendChild(child) {
        if (!child) return child;
        if (child.parentNode) {
            const priorIndex = child.parentNode.children.indexOf(child);
            if (priorIndex >= 0) {
                child.parentNode.children.splice(priorIndex, 1);
            }
        }
        child.parentNode = this;
        this.children.push(child);
        return child;
    }

    insertBefore(child, referenceChild) {
        if (child === referenceChild) return child;
        if (!referenceChild) return this.appendChild(child);
        const index = this.children.indexOf(referenceChild);
        if (index === -1) return this.appendChild(child);
        if (child.parentNode) {
            const priorIndex = child.parentNode.children.indexOf(child);
            if (priorIndex >= 0) {
                child.parentNode.children.splice(priorIndex, 1);
            }
        }
        child.parentNode = this;
        this.children.splice(index, 0, child);
        return child;
    }

    remove() {
        if (!this.parentNode) return;
        const index = this.parentNode.children.indexOf(this);
        if (index >= 0) {
            this.parentNode.children.splice(index, 1);
        }
        this.parentNode = null;
    }

    contains(node) {
        if (node === this) return true;
        return this.children.some((child) => child.contains(node));
    }

    setAttribute(name, value) {
        const attributeName = String(name);
        const attributeValue = String(value);
        if (attributeName === "id") this.id = attributeValue;
        if (attributeName === "class") this.className = attributeValue;
    }

    addEventListener(type, handler) {
        const eventType = String(type);
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(handler);
    }

    async click() {
        if (this.disabled) return;
        const handlers = this.listeners.get("click") ?? [];
        const event = {
            target: this,
            stopPropagation() {},
            preventDefault() {},
        };
        for (const handler of handlers) {
            await handler(event);
        }
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }

    querySelectorAll(selector) {
        const matches = [];
        const matcher = createSelectorMatcher(selector);
        const visit = (node) => {
            if (matcher(node)) {
                matches.push(node);
            }
            node.children.forEach(visit);
        };
        this.children.forEach(visit);
        return matches;
    }

    set innerHTML(value) {
        this._innerHTML = String(value ?? "");
        this.children = [];
        this.textContent = "";

        if (this._innerHTML.includes('id="notification-count"')) {
            const badge = new FakeElement("span", this.ownerDocument);
            badge.id = "notification-count";
            badge.className = "notification-count";
            this.appendChild(badge);
        }

        if (this._innerHTML.includes('class="notification-dismiss"')) {
            const dismissButton = new FakeElement("button", this.ownerDocument);
            dismissButton.className = "notification-dismiss";
            this.appendChild(dismissButton);
        }
    }

    get innerHTML() {
        return this._innerHTML;
    }
}

class FakeDocument {
    constructor() {
        this.head = new FakeElement("head", this);
        this.body = new FakeElement("body", this);
        this.visibilityState = "visible";
        this.listeners = new Map();
    }

    createElement(tagName) {
        return new FakeElement(tagName, this);
    }

    addEventListener(type, handler) {
        const eventType = String(type);
        if (!this.listeners.has(eventType)) {
            this.listeners.set(eventType, []);
        }
        this.listeners.get(eventType).push(handler);
    }

    querySelector(selector) {
        return (
            this.body.querySelector(selector) ??
            this.head.querySelector(selector)
        );
    }
}

function createSelectorMatcher(selector) {
    if (selector.startsWith("#")) {
        const id = selector.slice(1);
        return (node) => node.id === id;
    }
    if (selector.startsWith(".")) {
        const className = selector.slice(1);
        return (node) =>
            node.className.split(/\s+/).filter(Boolean).includes(className);
    }
    return (node) => node.tagName.toLowerCase() === selector.toLowerCase();
}

test("clear-all click does not open popup when empty inbox is rendered", async () => {
    const source = readFileSync(
        resolve(ROOT, "src/adapters/notify/internal/ui/navbar-plugin.js"),
        "utf8",
    );
    const testableSource =
        source
            .replace(/^import .*;\n/gm, "")
            .replace(
                /\n\(async function init\(\) \{[\s\S]*?\}\)\(\);\s*$/,
                "\n",
            ) +
        "\n" +
        "globalThis.__testExports = {\n" +
        "  buildButton,\n" +
        "  renderPanelContents,\n" +
        "  setCurrentNotifications(items) { currentNotifications = items; },\n" +
        "  getClearAllButton() { return clearAllBtn; },\n" +
        "};\n";

    const document = new FakeDocument();
    const accountCluster = document.createElement("div");
    accountCluster.className = "account-cluster";
    const profileMenu = document.createElement("div");
    profileMenu.className = "profile-menu";
    accountCluster.appendChild(profileMenu);
    document.body.appendChild(accountCluster);

    let openPopupCalls = 0;
    const context = {
        console,
        document,
        window: {
            location: { origin: "https://example.com" },
            open() {},
            addEventListener() {},
        },
        localStorage: {
            getItem() {
                return "token";
            },
        },
        createI18n: async () => ({
            t(key) {
                return key;
            },
        }),
        apiFetch: async (url) => {
            if (url === "/api/v1/notify/inbox/count") {
                return { ok: true, json: async () => ({ data: { count: 0 } }) };
            }
            if (url === "/api/v1/notify/inbox") {
                return { ok: true, json: async () => ({ data: [] }) };
            }
            return { ok: true, status: 200, json: async () => ({ data: [] }) };
        },
        escapeHtml(value) {
            return String(value);
        },
        formatRelativeTime() {
            return "";
        },
        navigateTo() {},
        showToast() {},
        openPopup: async () => {
            openPopupCalls += 1;
            return "cancel";
        },
        hexToBytes() {
            return new Uint8Array();
        },
        importRoomKey: async () => null,
        setTimeout() {
            return 1;
        },
        clearTimeout() {},
        setInterval() {
            return 1;
        },
        clearInterval() {},
        TextDecoder,
        URL,
        registerSearchIndex() {},
        MutationObserver: class {
            observe() {}
        },
        CSS: {
            escape(value) {
                return value;
            },
        },
    };
    context.globalThis = context;

    vm.runInNewContext(testableSource, context, {
        filename: "navbar-plugin.js",
    });

    const i18n = {
        t(key) {
            return key;
        },
    };
    context.__testExports.buildButton(i18n);
    context.__testExports.setCurrentNotifications([]);
    context.__testExports.renderPanelContents(i18n);

    const clearAllButton = context.__testExports.getClearAllButton();
    assert.ok(clearAllButton, "clear-all button should exist");
    assert.equal(
        clearAllButton.disabled,
        true,
        "clear-all button should be disabled for an empty inbox",
    );

    await clearAllButton.click();
    assert.equal(
        openPopupCalls,
        0,
        "disabled clear-all button should not open confirmation popup",
    );

    clearAllButton.disabled = false;
    await clearAllButton.click();
    assert.equal(
        openPopupCalls,
        0,
        "empty inbox guard should still block confirmation popup",
    );

    context.__testExports.setCurrentNotifications([{ id: "n1" }]);
    context.__testExports.renderPanelContents(i18n);
    assert.equal(
        clearAllButton.disabled,
        false,
        "clear-all button should be enabled after rendering non-empty inbox",
    );

    clearAllButton.disabled = false;
    await clearAllButton.click();
    assert.equal(
        openPopupCalls,
        1,
        "clear-all click should open confirmation popup when inbox has items",
    );
});
