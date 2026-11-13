export function bootstrapModule(ctx) {
    ctx.router.get("/api/v1/auth/delegated", (_request, response) =>
        response.end(),
    );
}
