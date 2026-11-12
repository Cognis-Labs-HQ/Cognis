import { installPageReadiness } from "../../../page-readiness.js";
import { tutorialHost } from "./host.js";
import { createPageTutorials } from "../../page.js";

class Element extends EventTarget {
    constructor(tag) {
        super();
        this.tag = tag;
        this.children = [];
        this.dataset = {};
        this.attributes = new Map();
        this.classList = { add: () => {} };
        this.isConnected = true;
    }
    append(child) {
        this.children.push(child);
        child.parentElement = this;
        child.isConnected = true;
    }
    remove() {
        this.isConnected = false;
        if (this.parentElement)
            this.parentElement.children = this.parentElement.children.filter(
                (child) => child !== this,
            );
    }
    setAttribute(name, value) {
        this.attributes.set(name, value);
    }
    querySelector(tag) {
        for (const child of this.children) {
            if (child.tag === tag) return child;
            const nested = child.querySelector(tag);
            if (nested) return nested;
        }
        return undefined;
    }
    focus() {}
}

export function pageHost(context, values = new Map(), role = "user") {
    let page;
    let actor = "first-account";
    let popup = false;
    let completionError;
    let completionReads = 0;
    const state = tutorialHost({
        page: () => page.refresh(),
        openPage: () => page.open(),
        onComplete: (actor, id) => page.complete(actor, id),
        identity: () => actor,
        role: () => role,
    });
    state.ctx.registerFlow("page:mounted", ["publish"]);
    state.ctx.registerFlow("page:ready", [
        "prepare",
        "blocking",
        "ready",
        "afterReady",
    ]);
    const readiness = installPageReadiness(state.ctx, { window: state.window });
    void state.ctx.runFlow("page:mounted", {
        pathname: state.window.location.pathname,
    });
    const header = new Element("div");
    const heading = new Element("h1");
    const description = new Element("p");
    header.append(heading);
    header.append(description);
    state.document.createElement = (tag) => new Element(tag);
    state.document.body = new Element("body");
    state.document.querySelector = (selector) =>
        selector === ".page-context" ? header : popup ? {} : null;
    state.window.MutationObserver = class {
        observe() {}
        disconnect() {}
    };
    const errors = [];
    page = createPageTutorials({
        ctx: state.ctx,
        api: state.api,
        document: state.document,
        account: () => actor,
        completions: {
            invalidate() {},
            load: async (accountId) => {
                completionReads++;
                if (completionError) throw completionError;
                return new Set(
                    [...values.keys()]
                        .filter((key) => key.startsWith(`${accountId}:`))
                        .map((key) => key.slice(accountId.length + 1)),
                );
            },
            complete: async (accountId, id) =>
                values.set(`${accountId}:${id}`, "completed"),
        },
        localize: async () => ({ t: (key) => key }),
        prepareStyles: async () => {},
        report: (error) => errors.push(error),
    });
    context.after(() => {
        page.dispose();
        state.dispose();
    });
    return {
        ...state,
        page,
        readiness,
        header,
        heading,
        description,
        values,
        errors,
        get completionReads() {
            return completionReads;
        },
        failCompletionReads: (error) => {
            completionError = error;
        },
        account: (value) => {
            actor = value;
        },
        popup: (value) => {
            popup = value;
        },
    };
}
