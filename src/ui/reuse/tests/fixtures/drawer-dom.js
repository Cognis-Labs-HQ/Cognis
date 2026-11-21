import { webcrypto } from "node:crypto";

class Events {
    listeners = new Map();

    addEventListener(type, callback, options = {}) {
        if (options.signal?.aborted) return;
        const listeners = this.listeners.get(type) ?? new Set();
        listeners.add(callback);
        this.listeners.set(type, listeners);
        options.signal?.addEventListener(
            "abort",
            () => this.removeEventListener(type, callback),
            { once: true },
        );
    }

    removeEventListener(type, callback) {
        this.listeners.get(type)?.delete(callback);
    }

    dispatch(type, values = {}) {
        const event = {
            target: this,
            defaultPrevented: false,
            preventDefault() {
                this.defaultPrevented = true;
            },
            ...values,
        };
        for (const callback of [...(this.listeners.get(type) ?? [])])
            callback(event);
        return event;
    }

    listenerCount(type) {
        return this.listeners.get(type)?.size ?? 0;
    }
}

class Style {
    values = new Map();
    overflow = "";

    getPropertyValue(name) {
        return this.values.get(name)?.value ?? "";
    }

    getPropertyPriority(name) {
        return this.values.get(name)?.priority ?? "";
    }

    setProperty(name, value, priority = "") {
        this.values.set(name, { value, priority });
    }

    removeProperty(name) {
        this.values.delete(name);
    }
}

class Element extends Events {
    constructor(document, tag) {
        super();
        this.ownerDocument = document;
        this.tagName = tag.toUpperCase();
        this.attributes = new Map();
        this.children = [];
        this.parentElement = null;
        this.style = new Style();
        this.disabled = false;
        this.height = 0;
        this.classList = {
            contains: (name) => this.className.split(/\s+/).includes(name),
            toggle: (name, enabled) => {
                const classes = new Set(
                    this.className.split(/\s+/).filter(Boolean),
                );
                if (enabled) classes.add(name);
                else classes.delete(name);
                this.className = [...classes].join(" ");
            },
            add: (...names) =>
                names.forEach((name) => this.classList.toggle(name, true)),
            remove: (...names) =>
                names.forEach((name) => this.classList.toggle(name, false)),
        };
    }

    get className() {
        return this.getAttribute("class") ?? "";
    }
    set className(value) {
        this.setAttribute("class", value);
    }
    get id() {
        return this.getAttribute("id") ?? "";
    }
    set id(value) {
        this.setAttribute("id", value);
    }
    get hidden() {
        return this.hasAttribute("hidden");
    }
    set hidden(value) {
        if (value) this.setAttribute("hidden", "");
        else this.removeAttribute("hidden");
    }
    get inert() {
        return this.hasAttribute("inert");
    }
    set inert(value) {
        if (value) this.setAttribute("inert", "");
        else this.removeAttribute("inert");
    }
    get tabIndex() {
        if (this.hasAttribute("tabindex"))
            return Number(this.getAttribute("tabindex"));
        return this.matches("button, input, select, textarea, a[href]")
            ? 0
            : -1;
    }
    set tabIndex(value) {
        this.setAttribute("tabindex", value);
    }
    get isConnected() {
        return this.ownerDocument.documentElement.contains(this);
    }

    getAttribute(name) {
        return this.attributes.get(name) ?? null;
    }
    setAttribute(name, value) {
        this.attributes.set(name, String(value));
    }
    removeAttribute(name) {
        this.attributes.delete(name);
    }
    hasAttribute(name) {
        return this.attributes.has(name);
    }

    append(...elements) {
        for (const element of elements) {
            element.remove();
            element.parentElement = this;
            this.children.push(element);
        }
    }

    after(element) {
        element.remove();
        element.parentElement = this.parentElement;
        const siblings = this.parentElement.children;
        siblings.splice(siblings.indexOf(this) + 1, 0, element);
    }

    remove() {
        if (!this.parentElement) return;
        const siblings = this.parentElement.children;
        siblings.splice(siblings.indexOf(this), 1);
        this.parentElement = null;
    }

    contains(element) {
        return (
            this === element ||
            this.children.some((child) => child.contains(element))
        );
    }

    matches(selector) {
        return selector.split(",").some((part) => {
            const candidate = part.trim();
            const exclusion = candidate.match(/:not\(([^)]+)\)/)?.[1];
            if (exclusion && this.matches(exclusion)) return false;
            const positive = candidate.replace(/:not\([^)]+\)/g, "");
            const tag = positive.match(/^[a-z]+/i)?.[0];
            if (tag && this.tagName !== tag.toUpperCase()) return false;
            const className = positive.match(/\.([a-z-]+)/)?.[1];
            if (className && !this.classList.contains(className)) return false;
            const id = positive.match(/#([a-z-]+)/)?.[1];
            if (id && this.id !== id) return false;
            for (const [, name, value] of positive.matchAll(
                /\[([^\]=]+)(?:=["']?([^\]"']+)["']?)?\]/g,
            )) {
                if (!this.hasAttribute(name)) return false;
                if (value !== undefined && this.getAttribute(name) !== value)
                    return false;
            }
            return true;
        });
    }

    closest(selector) {
        return this.matches(selector)
            ? this
            : (this.parentElement?.closest(selector) ?? null);
    }

    querySelectorAll(selector) {
        return this.children.flatMap((child) => [
            ...(child.matches(selector) ? [child] : []),
            ...child.querySelectorAll(selector),
        ]);
    }

    querySelector(selector) {
        return this.querySelectorAll(selector)[0] ?? null;
    }
    getBoundingClientRect() {
        return { height: this.height };
    }
    getClientRects() {
        return this.closest("[hidden]") ? [] : [{}];
    }

    focus() {
        if (
            this.isConnected &&
            !this.disabled &&
            !this.closest("[hidden], [inert]")
        ) {
            this.ownerDocument.activeElement = this;
        }
    }

    blur() {
        this.ownerDocument.activeElement = this.ownerDocument.body;
    }

    click() {
        const event = this.dispatch("click");
        let parent = this.parentElement;
        while (parent) {
            parent.dispatch("click", event);
            parent = parent.parentElement;
        }
        return event;
    }
}

export function createDrawerDocument({ mobile = true } = {}) {
    const document = new Events();
    document.createElement = (tag) => new Element(document, tag);
    document.documentElement = document.createElement("html");
    document.body = document.createElement("body");
    document.documentElement.append(document.body);
    document.activeElement = document.body;
    document.querySelectorAll = (selector) =>
        document.documentElement.querySelectorAll(selector);
    document.querySelector = (selector) =>
        document.querySelectorAll(selector)[0] ?? null;
    const media = new Events();
    media.matches = mobile;
    media.setMobile = (value) => {
        media.matches = value;
        media.dispatch("change");
    };
    const observers = [];
    document.defaultView = {
        AbortController,
        crypto: webcrypto,
        matchMedia: () => media,
        getComputedStyle: (element) => ({
            overflowY:
                element.style.overflowY ?? element.style.overflow ?? "visible",
            position: element.style.position ?? "static",
            zIndex: element.style.zIndex ?? "auto",
        }),
        ResizeObserver: class {
            observed = new Set();
            disconnected = false;

            constructor(callback) {
                this.callback = callback;
                observers.push(this);
            }
            observe(element) {
                this.observed.add(element);
            }
            disconnect() {
                this.disconnected = true;
                this.observed.clear();
            }
        },
    };
    return { document, media, observers };
}
