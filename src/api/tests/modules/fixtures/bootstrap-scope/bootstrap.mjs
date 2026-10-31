export async function bootstrapModule(ctx) {
    await ctx.getCapability("fixture:bootstrap")(ctx);
}
