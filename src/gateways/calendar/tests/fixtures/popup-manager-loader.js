import { readFile } from "node:fs/promises";
import vm from "node:vm";

export async function loadPopupManager({ globals = {}, imports = {} } = {}) {
    const context = vm.createContext({
        Date,
        Map,
        Set,
        AbortController,
        ...globals,
    });
    const modules = new Map();
    const contracts = {
        "/static/reuse/ui-ctx.js": ["uiCtx"],
        "/static/reuse/info-tooltip.js": ["renderInfoTooltip"],
        "/static/reuse/timestamp.js": ["formatDate", "formatDateTime"],
    };

    async function load(url) {
        if (modules.has(url)) return modules.get(url);
        const module = new vm.SourceTextModule(
            await readFile(new URL(url), "utf8"),
            {
                context,
                identifier: url,
            },
        );
        modules.set(url, module);
        await module.link(async (specifier, parent) => {
            if (!specifier.startsWith("/static/"))
                return load(new URL(specifier, parent.identifier).href);
            if (!contracts[specifier])
                throw new Error(`Unexpected public contract: ${specifier}`);
            return new vm.SyntheticModule(
                contracts[specifier],
                function () {
                    for (const name of contracts[specifier]) {
                        const value =
                            imports[specifier]?.[name] ??
                            (() => {
                                throw new Error(
                                    `Unexpected call: ${specifier}:${name}`,
                                );
                            });
                        this.setExport(name, value);
                    }
                },
                { context },
            );
        });
        return module;
    }

    const module = await load(
        new URL("../../ui/app/popup-manager.js", import.meta.url).href,
    );
    await module.evaluate();
    return module.namespace.createCalendarPopupManager;
}
