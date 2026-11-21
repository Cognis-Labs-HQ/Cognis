import { compactThreadCoverage } from "./thread-data.js";

const renderedNodes = new WeakMap();
const threadViews = new WeakMap();
let nextViewOrder = 0;

function nodeKey(node) {
    if (node.nodeType !== 1) return String(node.nodeType);
    return [
        node.tagName,
        node.getAttribute("data-thread-key") || node.classList[0] || "",
        node.getAttribute("data-emoji") || "",
    ].join(":");
}

function remember(node) {
    if (node.nodeType === 1)
        renderedNodes.set(node, {
            markup: node.outerHTML,
            attributes: Array.from(node.attributes, ({ name }) => name),
        });
    for (const child of node.childNodes) remember(child);
}

function updateNode(node, next) {
    if (node.nodeType !== 1) {
        if (node.nodeValue !== next.nodeValue) node.nodeValue = next.nodeValue;
        return;
    }
    const previous = renderedNodes.get(node);
    const markup = next.outerHTML;
    if (previous?.markup === markup) return;
    for (const name of previous?.attributes ?? []) {
        if (!next.hasAttribute(name)) node.removeAttribute(name);
    }
    for (const { name, value } of next.attributes) {
        if (node.getAttribute(name) !== value) node.setAttribute(name, value);
    }
    updateChildren(node, next);
    renderedNodes.set(node, {
        markup,
        attributes: Array.from(next.attributes, ({ name }) => name),
    });
}

function updateChildren(parent, next) {
    const available = new Map();
    for (const node of parent.childNodes) {
        const key = nodeKey(node);
        const matches = available.get(key) ?? [];
        matches.push(node);
        available.set(key, matches);
    }
    const desired = Array.from(next.childNodes, (incoming) => ({
        incoming,
        retained: available.get(nodeKey(incoming))?.shift(),
    }));
    // Remove obsolete siblings first so retained rows need not be detached.
    for (const matches of available.values())
        for (const node of matches) node.remove();
    let cursor = parent.firstChild;
    for (const { incoming, retained } of desired) {
        const node = retained ?? incoming;
        if (retained) updateNode(retained, incoming);
        else remember(incoming);
        if (node !== cursor) parent.insertBefore(node, cursor);
        cursor = node.nextSibling;
    }
}

export function patchThreadContent(container, markup) {
    const template = container.ownerDocument.createElement("template");
    template.innerHTML = markup;
    updateChildren(container, template.content);
    // A targeted patch must invalidate generated snapshots of its ancestors.
    // Otherwise a later full render could skip a row whose children changed.
    for (let node = container; node; node = node.parentNode) {
        const previous = renderedNodes.get(node);
        if (previous) previous.markup = null;
    }
}

function publishThread(container, markup, { prepend = false } = {}) {
    const previousTop = container.scrollTop;
    const previousHeight = container.scrollHeight;
    const wasNearBottom =
        previousHeight - previousTop - container.clientHeight < 40;
    const anchor = Array.from(container.children).find(
        (node) =>
            node.hasAttribute("data-message-id") &&
            node.offsetTop >= previousTop,
    );
    const anchorTop = anchor?.offsetTop;
    patchThreadContent(container, markup);
    if (prepend)
        container.scrollTop =
            previousTop + container.scrollHeight - previousHeight;
    else if (wasNearBottom) container.scrollTop = container.scrollHeight;
    else
        container.scrollTop =
            previousTop +
            (anchor?.parentNode === container
                ? anchor.offsetTop - anchorTop
                : 0);
}

function readView(container, owner) {
    const cached = threadViews.get(container);
    return cached &&
        Object.entries(owner).every(
            ([name, value]) => cached[name] === value,
        ) &&
        cached.firstChild === container.firstChild
        ? cached
        : null;
}

export function updateThreadView(container, owner, update) {
    const entry = readView(container, owner);
    if (!entry?.state) return false;
    const order = ++nextViewOrder;
    if (update(entry.state, order) === false) return false;
    entry.state.publicationOrder = order;
    entry.state.signature = null;
    return true;
}

export function createThreadView(container, owner) {
    let entry = readView(container, owner);
    if (!entry) {
        entry = {
            ...owner,
            firstChild: container.firstChild,
            state: null,
            requests: new Set(),
            clearedAt: 0,
        };
        threadViews.set(container, entry);
    }
    const order = ++nextViewOrder;
    entry.requests.add(order);
    const isCurrent = () =>
        readView(container, owner) === entry && order >= entry.clearedAt;
    return {
        order,
        isCurrent,
        read: () => (isCurrent() ? entry.state : null),
        finish() {
            entry.requests.delete(order);
            // Coverage is needed only to arbitrate older reads still in flight,
            // never as a growing history of completed requests or tombstones.
            if (entry.state)
                entry.state.remoteCoverage = compactThreadCoverage(
                    entry.state.remoteCoverage,
                    entry.requests,
                );
        },
        clear() {
            if (!isCurrent()) return;
            container.replaceChildren();
            entry.firstChild = container.firstChild;
            entry.state = null;
            entry.clearedAt = order;
        },
        publish(markup, { prepend, ...state }) {
            if (!isCurrent()) return;
            if (!entry.state) container.replaceChildren();
            publishThread(container, markup, { prepend });
            entry.firstChild = container.firstChild;
            entry.state = {
                ...owner,
                ...state,
                remoteCoverage: compactThreadCoverage(
                    state.remoteCoverage,
                    entry.requests,
                ),
            };
        },
    };
}
