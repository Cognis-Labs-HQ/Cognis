import { createDiagnosticFixture } from "../../../../tooling/reuse/diagnostic-fixture.ts";
import { readFile } from "node:fs/promises";
import virtualMachine from "node:vm";

export async function loadPopupManager() {
    const context = virtualMachine.createContext({
        Date,
        Map,
        Set,
        AbortController,
    });
    const modules = new Map();
    const diagnostics = createDiagnosticFixture();
    const contracts = {
        "/static/reuse/capabilities.js": ["bindCapability"],
        "/static/reuse/ui-ctx.js": ["uiCtx"],
        "/static/reuse/info-tooltip.js": ["renderInfoTooltip"],
        "/static/reuse/timestamp.js": ["formatDate", "formatDateTime"],
    };

    async function load(url) {
        if (modules.has(url)) return modules.get(url);
        const module = new virtualMachine.SourceTextModule(
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
            return new virtualMachine.SyntheticModule(
                contracts[specifier],
                function () {
                    for (const name of contracts[specifier]) {
                        this.setExport(
                            name,
                            specifier === "/static/reuse/capabilities.js"
                                ? diagnostics.bindCapability.bind(diagnostics)
                                : () => {
                                      throw new Error(
                                          `Unexpected call: ${specifier}:${name}`,
                                      );
                                  },
                        );
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
