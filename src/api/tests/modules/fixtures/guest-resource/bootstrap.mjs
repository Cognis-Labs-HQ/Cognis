export function bootstrapModule(ctx) {
    const accountGuard = ctx.getCapability("auth:requireAuth");
    ctx.router.get("/api/v1/modules/guest-resource/read", async (req, res) => {
        const guest = await ctx.getCapability("share:getGuestClaims")(req);
        const claims = guest ?? accountGuard(req, res, "user");
        if (!claims) return;
        const authorized = await ctx.getCapability("fixture:authorizeResource")(
            claims,
        );
        res.writeHead(authorized ? 200 : 403);
        res.end(authorized ? "resource" : "forbidden");
    });
    ctx.router.get(
        "/api/v1/modules/guest-resource/manage",
        (_req, res) => {
            res.writeHead(200);
            res.end("management");
        },
        { access: { minRole: "user" } },
    );
}
