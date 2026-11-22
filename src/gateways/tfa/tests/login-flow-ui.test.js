import assert from "node:assert/strict";
import test from "node:test";
import { loadTestModule } from "../../../tooling/reuse/test-module.ts";

class Element {
    attributes = new Map();
    children = [];
    listeners = new Map();
    isConnected = true;
    hidden = false;
    value = "";
    classes = new Set();
    classList = {
        add: (name) => this.classes.add(name),
        toggle: (name, enabled) =>
            enabled ? this.classes.add(name) : this.classes.delete(name),
        contains: (name) => this.classes.has(name),
    };

    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    replaceChildren() {
        this.children = [];
    }
    appendChild(child) {
        this.children.push(child);
    }
    querySelectorAll() {
        return this.children;
    }
    focus() {
        this.focused = true;
    }
    addEventListener(type, handler) {
        this.listeners.set(type, handler);
    }

    async click() {
        const event = { preventDefault() {} };
        await this.listeners.get("click")?.(event);
        await this.onclick?.(event);
    }
}

class Input extends Element {}
class Anchor extends Element {}

function deferred() {
    let resolve;
    const promise = new Promise((done) => {
        resolve = done;
    });
    return { promise, resolve };
}

function fixture() {
    const nodes = new Map();
    const notices = [];
    const requests = [];
    const warnings = [];
    const timers = new Map();
    let clock = 0;
    let timerId = 0;
    let respond = () => Response.json({ data: { challenge: {} } });
    for (const id of ["login-credential-fields", "login-tfa-fields"]) {
        nodes.set(`#${id}`, new Element());
    }
    for (const id of ["login-username", "login-password"]) {
        nodes.set(`#${id}`, new Input());
    }
    const fields = nodes.get("#login-tfa-fields");
    fields.childElementCount = 0;
    Object.defineProperty(fields, "innerHTML", {
        set(markup) {
            for (const [, tag, id] of markup.matchAll(
                /<(\w+)[^>]*\bid="([^"]+)"/g,
            )) {
                const node =
                    tag === "input"
                        ? new Input()
                        : tag === "a"
                          ? new Anchor()
                          : new Element();
                nodes.set(`#${id}`, node);
            }
            fields.childElementCount = 4;
        },
    });
    const root = { querySelector: (selector) => nodes.get(selector) ?? null };
    const i18n = { t: (key) => `translated:${key}` };
    const module = loadTestModule(
        new URL("../ui/login-flow.js", import.meta.url),
        {
            "/static/reuse/auth-setup-route.js": {
                redirectToRequiredTfaSetup() {},
            },
            "/static/reuse/i18n.js": { extendI18n: async (value) => value },
            "/static/reuse/page-styles.js": {
                ensurePageStylesheet: async () => {},
            },
            "/static/reuse/toast.js": {
                showToast: (text, options) =>
                    notices.push({ text, ...options }),
            },
        },
        {
            HTMLElement: Element,
            HTMLInputElement: Input,
            HTMLAnchorElement: Anchor,
            document: { createElement: () => new Anchor() },
            window: {
                setInterval(handler) {
                    timers.set(++timerId, handler);
                    return timerId;
                },
                clearInterval(id) {
                    timers.delete(id);
                },
            },
            Date: class extends Date {
                static now() {
                    return clock;
                }
            },
            console: {
                warn: (...args) => warnings.push(args),
                error: (...args) => warnings.push(args),
            },
            fetch: async (url, options) => {
                const request = { url, ...JSON.parse(options.body) };
                requests.push(request);
                return respond(request);
            },
        },
    );
    return {
        nodes,
        notices,
        requests,
        warnings,
        timers,
        i18n,
        root,
        module,
        async client() {
            return module.createTfaLoginClient({ root, baseI18n: i18n });
        },
        respond(handler) {
            respond = handler;
        },
        advance(seconds) {
            clock += seconds * 1000;
            for (const handler of [...timers.values()]) handler();
        },
        code: () => nodes.get("#login-tfa-code"),
        resend: () => nodes.get("#login-tfa-resend-action"),
        tabs: () => nodes.get("#login-tfa-method-nav").children,
    };
}

function methods() {
    return [
        {
            id: "first",
            name: "First",
            challenge: { maxLength: 6 },
            loginUi: {
                supportsResend: true,
                placeholderKey: "example.first.code",
            },
        },
        {
            id: "second",
            name: "Second",
            challenge: { maxLength: 10 },
            loginUi: {
                supportsResend: true,
                placeholderKey: "example.second.code",
            },
        },
        {
            id: "recovery",
            name: "Recovery",
            loginUi: { placeholderKey: "example.recovery.code" },
        },
    ];
}

async function open(host, providers = methods(), loginAttemptId = "attempt") {
    const client = await host.client();
    assert.equal(
        await client.switchToTfaPrompt({ loginAttemptId, methods: providers }),
        loginAttemptId,
    );
    return client;
}

test("TFA prompt applies challenge length and removes it when switching to an unconstrained method", async () => {
    const host = fixture();
    await open(host);
    assert.equal(host.nodes.get("#login-credential-fields").hidden, true);
    assert.equal(host.code().required, true);
    assert.equal(host.code().focused, true);
    assert.equal(host.code().getAttribute("maxlength"), "6");
    await host.tabs()[1].click();
    assert.equal(host.code().getAttribute("maxlength"), "10");
    assert.equal(host.code().placeholder, "translated:example.second.code");
    await host.tabs()[2].click();
    assert.equal(host.code().getAttribute("maxlength"), null);
    assert.equal(host.resend().hidden, true);
    assert.equal(
        host.code().getAttribute("aria-label"),
        "translated:example.recovery.code",
    );
    await host.tabs()[0].click();
    assert.equal(host.code().getAttribute("maxlength"), "6");
});

for (const maxLength of [undefined, null, 0, -1, 2.5, "8"]) {
    test(`TFA method tabs ignore invalid optional challenge length ${maxLength}`, async () => {
        const host = fixture();
        await open(host);
        host.module.renderTfaMethodTabs(
            host.i18n,
            [
                {
                    id: "generic",
                    name: "Generic",
                    challenge: { maxLength },
                },
            ],
            undefined,
            host.root,
        );
        assert.equal(host.code().getAttribute("maxlength"), null);
    });
}

test("resend refreshes the selected challenge length and retains it across provider changes", async () => {
    const host = fixture();
    await open(host);
    host.respond(() =>
        Response.json({ data: { challenge: { maxLength: 12 } } }),
    );
    await host.resend().click();
    assert.deepEqual(host.requests[0], {
        url: "/api/v1/tfa/login/resend",
        loginAttemptId: "attempt",
        methodId: "first",
    });
    assert.equal(host.code().getAttribute("maxlength"), "12");
    assert.equal(
        host.notices.at(-1).text,
        "translated:ui.app.login.tfa.resend_sent",
    );
    await host.tabs()[1].click();
    await host.tabs()[0].click();
    assert.equal(host.code().getAttribute("maxlength"), "12");
    host.respond(() => Response.json({ data: { challenge: {} } }));
    await host.resend().click();
    assert.equal(host.code().getAttribute("maxlength"), null);
});

test("cooldown prevents duplicate resends and preserves pending challenge length on rate limiting", async () => {
    const host = fixture();
    const providers = methods();
    providers[0].challenge.retryAfterSeconds = 30;
    await open(host, providers);
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
    assert.equal(
        host.resend().classList.contains("auth-text-action--disabled"),
        true,
    );
    await host.resend().click();
    assert.equal(host.requests.length, 0);
    assert.equal(host.notices.length, 1);
    host.advance(31);
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    host.respond(() =>
        Response.json(
            { error: { code: "rate_limited", retryAfterSeconds: 20 } },
            { status: 429 },
        ),
    );
    await host.resend().click();
    assert.equal(host.code().getAttribute("maxlength"), "6");
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
    assert.equal(host.notices.length, 1);
});

test("an in-flight challenge cannot overwrite another method and duplicate selection stays locked", async () => {
    const host = fixture();
    await open(host);
    const delivery = deferred();
    host.respond(() => delivery.promise);
    const request = host.resend().click();
    await Promise.resolve();
    await host.tabs()[1].click();
    assert.equal(host.code().getAttribute("maxlength"), "10");
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    await host.tabs()[0].click();
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
    await host.resend().click();
    assert.equal(host.requests.length, 1);
    await host.tabs()[1].click();
    delivery.resolve(
        Response.json({
            data: { challenge: { maxLength: 14, retryAfterSeconds: 30 } },
        }),
    );
    await request;
    assert.equal(host.code().getAttribute("maxlength"), "10");
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    assert.equal(host.notices.length, 0);
    await host.tabs()[0].click();
    assert.equal(host.code().getAttribute("maxlength"), "14");
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
});

test("a newer prompt replaces resend ownership and ignores an older response", async () => {
    const host = fixture();
    const client = await open(host);
    const delivery = deferred();
    host.respond(() => delivery.promise);
    const request = host.resend().click();
    await Promise.resolve();
    await client.switchToTfaPrompt({
        loginAttemptId: "new-attempt",
        methods: methods().slice(1),
    });
    delivery.resolve(Response.json({ data: { challenge: { maxLength: 18 } } }));
    await request;
    assert.equal(host.code().getAttribute("maxlength"), "10");
    assert.equal(host.notices.length, 0);
    host.respond(() =>
        Response.json({ data: { challenge: { maxLength: 8 } } }),
    );
    await host.resend().click();
    assert.equal(host.requests.at(-1).loginAttemptId, "new-attempt");
    assert.equal(host.requests.at(-1).methodId, "second");
    assert.equal(host.code().getAttribute("maxlength"), "8");
});

test("new prompts dispose cooldowns and transport errors preserve challenge input limits", async () => {
    const host = fixture();
    const providers = methods();
    providers[0].challenge.retryAfterSeconds = 30;
    const client = await open(host, providers);
    assert.equal(host.timers.size, 1);
    await client.switchToTfaPrompt({
        loginAttemptId: "retry",
        methods: methods(),
    });
    assert.equal(host.timers.size, 0);
    host.respond(() => {
        throw new Error("offline");
    });
    await host.resend().click();
    assert.equal(host.code().getAttribute("maxlength"), "6");
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    assert.equal(host.notices.at(-1).variant, "error");
    assert.equal(host.warnings.length, 1);
});

test("missing or invalid resend controls still receive selected challenge input constraints", async () => {
    for (const resend of [null, new Element()]) {
        const host = fixture();
        const client = await open(host);
        host.nodes.set("#login-tfa-resend-action", resend);
        await client.switchToTfaPrompt({
            loginAttemptId: "retry",
            methods: methods(),
        });
        assert.equal(host.code().getAttribute("maxlength"), "6");
        await host.tabs()[1].click();
        assert.equal(host.code().getAttribute("maxlength"), "10");
        assert.equal(host.warnings.length, resend ? 1 : 0);
    }
});

test("selecting a provider acquires its challenge constraints through the resend contract", async () => {
    const host = fixture();
    const providers = methods();
    providers[1].challenge = undefined;
    providers[1].loginUi.challengeOnSelect = true;
    await open(host, providers);
    const delivery = deferred();
    host.respond(() => delivery.promise);
    await host.tabs()[1].click();
    assert.equal(host.requests.length, 1);
    assert.equal(host.requests[0].methodId, "second");
    assert.equal(host.code().getAttribute("maxlength"), null);
    delivery.resolve(Response.json({ data: { challenge: { maxLength: 11 } } }));
    await new Promise((resolve) => setImmediate(resolve));
    assert.equal(host.code().getAttribute("maxlength"), "11");
    await host.tabs()[0].click();
    await host.tabs()[1].click();
    assert.equal(host.code().getAttribute("maxlength"), "11");
    assert.equal(host.requests.length, 1);
});

test("a failed resend for a previous method does not alter the selected input or lock", async () => {
    const host = fixture();
    await open(host);
    const delivery = deferred();
    host.respond(() => delivery.promise);
    const request = host.resend().click();
    await Promise.resolve();
    await host.tabs()[1].click();
    delivery.resolve(
        Response.json({ error: { retryAfterSeconds: 30 } }, { status: 429 }),
    );
    await request;
    assert.equal(host.code().getAttribute("maxlength"), "10");
    assert.equal(host.resend().getAttribute("aria-disabled"), "false");
    await host.tabs()[0].click();
    assert.equal(host.code().getAttribute("maxlength"), "6");
    assert.equal(host.resend().getAttribute("aria-disabled"), "true");
});

test("rendering an empty method list clears the previous selection and challenge constraints", async () => {
    const host = fixture();
    const client = await open(host);
    await client.switchToTfaPrompt({ loginAttemptId: "empty", methods: [] });
    assert.equal(host.nodes.get("#login-tfa-method").value, "");
    assert.equal(host.code().getAttribute("maxlength"), null);
    assert.equal(host.tabs().length, 0);
});
