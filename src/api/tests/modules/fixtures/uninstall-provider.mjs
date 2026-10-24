import assert from "node:assert/strict";
import path from "node:path";

export async function uninstallModule(ctx, { deleteContent }) {
    assert.ok(ctx.getCapability("db:executor"));
    assert.equal(ctx.getCapability("host:private"), undefined);
    if (!deleteContent) return;
    const library = ctx.getCapability("study:library:provider");
    if (typeof library?.deleteContentPack !== "function") {
        throw new Error("study_library_cleanup_unavailable");
    }
    await library.deleteContentPack(
        path.join(ctx.moduleRoot, "data", "library"),
    );
}
