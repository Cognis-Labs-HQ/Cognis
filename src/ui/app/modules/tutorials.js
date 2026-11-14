/** Public, owner-authorized tutorial targets for module details and settings. */
export async function mountProvider(ctx) {
    const owner = ctx.capabilities
        .get("ui:tutorials")
        .owner("ui.modules", { signal: ctx.signal });
    const lifetimes = new Map();
    const validate = (id) => {
        if (!/^[a-z][a-z0-9-]{0,70}$/.test(id))
            throw new TypeError("invalid_module_id");
    };
    const surface = (id) => {
        const matches = document.querySelectorAll(
            `.popup-overlay--visible[data-module-settings="${id}"]`,
        );
        return matches.length === 1 ? matches[0] : null;
    };
    const publish = (id, name, signal, resolve, popup) => {
        validate(id);
        return owner
            .target(`${id}${name ? `.${name}` : ""}`, {
                public: true,
                signal,
                resolve,
            })
            .then((target) => ({
                ...target,
                ...(popup ? { popup: `[data-module-settings="${id}"]` } : {}),
            }));
    };
    ctx.capabilities.contribute("ui:moduleTutorialTargets", {
        card(id, { signal }) {
            return publish(id, "", signal, () => {
                const matches = document.querySelectorAll(
                    `.module-store-card[data-tutorial-module="${id}"]`,
                );
                return matches.length === 1 ? matches[0] : null;
            });
        },
        settings(id, { signal }) {
            return publish(
                id,
                "settings",
                signal,
                () =>
                    document.querySelector(
                        `[data-tutorial-module="${id}"] [data-module-preferences]:not(:disabled)`,
                    ),
                true,
            );
        },
        adapterSettings(gateway, id, { signal }) {
            validate(gateway);
            return publish(
                id,
                `adapter.${gateway}`,
                signal,
                () =>
                    document.querySelector(
                        `.adapter-inline-row[data-gateway-id="${gateway}"][data-adapter-id="${id}"]>.adapter-inline-summary>.collapsible-section-title`,
                    ),
                true,
            );
        },
        revealAdapter(gateway, id) {
            validate(gateway);
            validate(id);
            const row = document.querySelector(
                `.adapter-inline-row[data-gateway-id="${gateway}"][data-adapter-id="${id}"]`,
            );
            const section = row?.parentElement?.closest("details.module-row");
            if (section) section.open = true;
        },
        field(id, key, { signal }) {
            if (!/^[a-zA-Z][a-zA-Z0-9]{0,99}$/.test(key))
                throw new TypeError("invalid_module_preference_key");
            return publish(
                id,
                `field.${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
                signal,
                () =>
                    surface(id)
                        ?.querySelector("form")
                        ?.elements.namedItem(key) ?? null,
                true,
            );
        },
        action(id, key, { signal }) {
            if (!/^[a-zA-Z][a-zA-Z0-9]{0,99}$/.test(key))
                throw new TypeError("invalid_module_config_action");
            return publish(
                id,
                `action.${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)}`,
                signal,
                () =>
                    surface(id)?.querySelector(
                        `[data-popup-action="config:${key}"]:not(:disabled)`,
                    ) ?? null,
                true,
            );
        },
        preview(id, { signal }) {
            return publish(
                id,
                "preview",
                signal,
                () =>
                    surface(id)?.querySelector("audio[data-config-preview]") ??
                    null,
                true,
            );
        },
        bindSettings(id, { signal }) {
            validate(id);
            signal.throwIfAborted();
            const lifetime = { signal };
            lifetimes.set(id, lifetime);
            const release = () => {
                if (lifetimes.get(id) === lifetime) lifetimes.delete(id);
            };
            signal.addEventListener("abort", release, { once: true });
            return release;
        },
        settingsSignal: (id) => lifetimes.get(id)?.signal,
    });
    return () => {
        lifetimes.clear();
        owner.dispose();
    };
}
