export function registerApiRoutes(router) {
    router.get(
        "/api/v1/modules/analytics-invalid/metrics",
        async (_req, res) => {
            res.writeHead(200, { "content-type": "application/json" });
            res.end(
                JSON.stringify({
                    data: { visitors: 7, conversionRate: 0.05 },
                }),
            );
        },
        { access: { minRole: "admn" } },
    );
}
