import { registerLibraryClient } from "/static/gateways/study/library-client.js";

export function mountProvider(ctx) {
    registerLibraryClient(ctx);
}
