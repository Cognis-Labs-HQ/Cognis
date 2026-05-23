export function registerApiRoutes(router) {
    router.get(
        "/api/v1/modules/sample-analytics/metrics",
        async (_req, res) => {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { visitors: 42, conversionRate: 0.12 },
                }),
            );
        },
        { access: { minRole: "admin" } },
    );
}

export function registerUi(ctx) {
    ctx.registerPageExtension("dashboard", {
        id: "sample-analytics-dashboard",
        label: "Sample Analytics",
        scriptUrl: "/static/modules/sample-analytics/dashboard-element.js",
        access: { minRole: "admin" },
    });
}
