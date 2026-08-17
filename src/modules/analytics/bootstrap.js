import { registerApiRoutes, registerUi } from "./api/index.js";

export function bootstrapModule(ctx) {
    registerUi(ctx);
    registerApiRoutes(ctx.router, ctx);
}
