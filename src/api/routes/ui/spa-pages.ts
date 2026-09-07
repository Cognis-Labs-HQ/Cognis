import type { IncomingMessage, ServerResponse } from "node:http";
import path from "node:path";
import { isRoleAllowed, type BootstrapLog } from "@cognis/core";
import type { UIRegistry, SpaRoute } from "../../reuse/ui-registry.js";
import type { RouteContext } from "../../reuse/route-context.js";
import { serveHtmlPageWithReplacements } from "../../reuse/html-response.js";

interface RegisteredSpaPageInput {
    req: IncomingMessage;
    res: ServerResponse;
    route: SpaRoute | undefined;
    uiRegistry: UIRegistry;
    publicRoot: string;
    routeContext: RouteContext;
    log?: BootstrapLog;
    resolveLoginRedirect: () => Promise<string | null>;
    redirect: (location: string) => boolean;
    getSessionRole: () => string | undefined;
}

export async function handleRegisteredSpaPage(
    input: RegisteredSpaPageInput,
): Promise<boolean> {
    if (!input.route || input.req.method !== "GET") return false;
    const loginRedirect = await input.resolveLoginRedirect();
    if (loginRedirect) return input.redirect(loginRedirect);
    const sessionRole = input.getSessionRole();
    if (
        input.route.access &&
        (!sessionRole || !isRoleAllowed(sessionRole, input.route.access))
    ) {
        return input.redirect("/dashboard");
    }
    const routeStylesheets = (input.route.stylesheets ?? [])
        .map(
            (stylesheetUrl) =>
                `<link rel="stylesheet" href="${stylesheetUrl}" data-page-stylesheet="true" />`,
        )
        .join("\n        ");
    const routeBootstrapConfig = JSON.stringify({
        capabilityScripts: input.route.capabilityScripts ?? [],
        scriptUrl: input.route.scriptUrl,
    }).replaceAll("<", "\\u003c");
    await serveHtmlPageWithReplacements(
        input.res,
        path.join(input.publicRoot, "pages", "index.html"),
        [
            {
                from: input.uiRegistry.resolveAssetUrl(
                    "/static/app/dashboard/index.js",
                ),
                to: "/static/reuse/spa-page-entry.js",
            },
            {
                from: "</body>",
                to: `    <script id="spa-page-entry-config" type="application/json">${routeBootstrapConfig}</script>\n</body>`,
            },
            ...(routeStylesheets
                ? [
                      {
                          from: "</head>",
                          to: `        ${routeStylesheets}\n    </head>`,
                      },
                  ]
                : []),
        ],
        input.log,
        { path: input.route.base, method: input.req.method },
        input.routeContext,
    );
    return true;
}
