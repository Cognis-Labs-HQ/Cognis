/** Route styles are staged without affecting the visible page, then exchanged at commit. */
const state = (globalThis[Symbol.for("cognis.pageStyles")] ??= {
    entries: new Map(),
    route: new Set(),
});
const persistentOwner = "persistent";

function keyFor(href) {
    const url = new URL(href, window.location.origin);
    if (!url.pathname.startsWith("/static/modules/"))
        url.searchParams.delete("v");
    return url.href;
}

function reconcile(entry) {
    if (!entry.owners.size && !entry.pending.size) {
        entry.link.remove();
        if (state.entries.get(entry.key) === entry)
            state.entries.delete(entry.key);
    } else {
        entry.link.media = entry.owners.size ? entry.media : "not all";
    }
}

function acquire(href) {
    const key = keyFor(href);
    if (state.entries.has(key)) return state.entries.get(key);
    const existing = [
        ...document.head.querySelectorAll('link[rel="stylesheet"][href]'),
    ].find(
        (link) =>
            keyFor(link.dataset.pageStylesheetSource || link.href) === key,
    );
    const link = existing || document.createElement("link");
    const entry = {
        key,
        link,
        media: link.media || "",
        owners: new Set(),
        pending: new Set(),
        ready: null,
    };
    entry.ready = existing?.sheet
        ? Promise.resolve()
        : new Promise((resolve, reject) => {
              link.addEventListener("load", resolve, { once: true });
              link.addEventListener(
                  "error",
                  (error) => {
                      console.error("[page-styles] failed to load stylesheet", {
                          href,
                          error,
                      });
                      reject(new Error("page_stylesheet_unavailable"));
                  },
                  { once: true },
              );
          });
    state.entries.set(key, entry);
    if (!existing) {
        link.rel = "stylesheet";
        link.href = href;
        link.dataset.pageStylesheet = "true";
        link.media = "not all";
        document.head.appendChild(link);
    }
    return entry;
}

/** Adopt declared document styles without taking ownership of provider-injected links. */
export function adoptPageStylesheets(hrefs = []) {
    const declared = new Set(hrefs.map(keyFor));
    for (const link of document.head.querySelectorAll(
        'link[rel="stylesheet"][href]',
    )) {
        const source = link.dataset.pageStylesheetSource;
        if (!source && !declared.has(keyFor(link.href))) continue;
        const entry = acquire(source || link.href);
        if (!entry.owners.size) {
            entry.owners.add(state.route);
            state.route.add(entry);
        }
    }
}

/** Shared controls may retain a stylesheet; signal-scoped consumers release it on disposal. */
export async function ensurePageStylesheet(href, { signal } = {}) {
    if (signal?.aborted) return;
    const entry = acquire(href);
    const owner = signal || persistentOwner;
    entry.owners.add(owner);
    reconcile(entry);
    let finishAbort;
    const aborted = new Promise((resolve) => {
        finishAbort = resolve;
    });
    const release = () => {
        entry.owners.delete(owner);
        reconcile(entry);
        finishAbort();
    };
    signal?.addEventListener("abort", release, { once: true });
    try {
        await (signal ? Promise.race([entry.ready, aborted]) : entry.ready);
    } catch {
        signal?.removeEventListener("abort", release);
        release();
    }
}

export function ensurePersistentStylesheet(href) {
    return ensurePageStylesheet(href);
}

/** Prepare an inactive route lease. Commit swaps route ownership; abort releases only this lease. */
export async function preparePageStylesheets(hrefs, { signal } = {}) {
    const lease = new Set();
    let committed = false;
    const cancel = () => {
        if (committed) return;
        signal?.removeEventListener("abort", onAbort);
        for (const entry of lease) {
            entry.pending.delete(lease);
            reconcile(entry);
        }
    };
    let abortReady;
    const aborted = new Promise((resolve) => {
        abortReady = resolve;
    });
    const onAbort = () => {
        cancel();
        abortReady(false);
    };
    signal?.addEventListener("abort", onAbort, { once: true });
    try {
        if (signal?.aborted) {
            cancel();
            return null;
        }
        for (const href of hrefs) {
            const entry = acquire(href);
            lease.add(entry);
            entry.pending.add(lease);
        }
        const loaded = await Promise.race([
            Promise.all([...lease].map((entry) => entry.ready)).then(
                () => true,
            ),
            aborted,
        ]);
        if (!loaded || signal?.aborted) return null;
        const commit = () => {
            if (committed || signal?.aborted) return false;
            committed = true;
            const previous = state.route;
            state.route = lease;
            for (const entry of lease) {
                entry.pending.delete(lease);
                entry.owners.add(lease);
                reconcile(entry);
            }
            for (const entry of previous) {
                entry.owners.delete(previous);
                reconcile(entry);
            }
            signal?.removeEventListener("abort", onAbort);
            return true;
        };
        commit.cancel = cancel;
        return commit;
    } catch (error) {
        cancel();
        signal?.removeEventListener("abort", onAbort);
        throw error;
    }
}
