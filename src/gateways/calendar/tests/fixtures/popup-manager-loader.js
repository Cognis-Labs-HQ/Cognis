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

    function load(url) {
        if (!modules.has(url)) {
            modules.set(
                url,
                readFile(new URL(url), "utf8").then(
                    (source) =>
                        new vm.SourceTextModule(source, {
                            context,
                            identifier: url,
                        }),
                ),
            );
        }
        return modules.get(url);
    }

    const module = await load(
        new URL("../../ui/app/popup-manager.js", import.meta.url).href,
    );
    await module.link((specifier, parent) => {
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
    await module.evaluate();
    return module.namespace.createCalendarPopupManager;
}
