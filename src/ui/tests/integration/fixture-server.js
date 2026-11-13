import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { extname, resolve, sep } from "node:path";
import { fileURLToPath } from "node:url";

const uiDirectory = fileURLToPath(new URL("../../", import.meta.url));
const contentTypes = {
    ".html": "text/html",
    ".js": "text/javascript",
    ".css": "text/css",
    ".json": "application/json",
    ".xml": "application/xml",
    ".svg": "image/svg+xml",
    ".png": "image/png",
    ".webp": "image/webp",
    ".woff2": "font/woff2",
};

export async function serveBrowserFixture(fixtureDirectory) {
    const layouts = new Map();
    const requests = [];
    const server = createServer(async (request, response) => {
        const pathname = new URL(request.url, "http://localhost").pathname;
        requests.push({ method: request.method, pathname });
        try {
            if (pathname.startsWith("/api/")) {
                response.setHeader("content-type", "application/json");
                if (
                    /^\/api\/v1\/social\/users\/fixture\/preferences\/[^/]+$/.test(
                        pathname,
                    )
                ) {
                    if (request.method === "PUT") {
                        let body = "";
                        for await (const chunk of request) body += chunk;
                        layouts.set(
                            pathname.split("/").at(-1),
                            JSON.parse(body).layout,
                        );
                    }
                    response.end(
                        JSON.stringify({
                            data: {
                                layoutJson: JSON.stringify(
                                    layouts.get(pathname.split("/").at(-1)) ??
                                        null,
                                ),
                            },
                        }),
                    );
                    return;
                }
                if (
                    [
                        "/api/v1/ui/capability-providers",
                        "/api/v1/ui/navbar-plugins",
                        "/api/v1/fixture-search",
                    ].includes(pathname)
                ) {
                    response.end(JSON.stringify({ data: [] }));
                    return;
                }
                response.writeHead(404);
                response.end(
                    JSON.stringify({
                        error: "Unexpected fixture API request",
                        pathname,
                    }),
                );
                return;
            }
            let directory = fixtureDirectory;
            let relativePath =
                pathname === "/" ? "index.html" : pathname.slice(1);
            if (pathname.startsWith("/static/")) {
                relativePath = pathname.slice("/static/".length);
                directory = /^(templates|assets)\//.test(relativePath)
                    ? resolve(uiDirectory, "public")
                    : uiDirectory;
            }
            const filename = resolve(directory, relativePath);
            if (!filename.startsWith(resolve(directory) + sep)) {
                response.writeHead(403).end();
                return;
            }
            response.setHeader(
                "content-type",
                contentTypes[extname(filename)] ?? "application/octet-stream",
            );
            response.end(await readFile(filename));
        } catch (error) {
            response
                .writeHead(error.code === "ENOENT" ? 404 : 500)
                .end(error.message);
        }
    });
    await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
    return {
        url: `http://127.0.0.1:${server.address().port}`,
        layouts,
        requests,
        close: () =>
            new Promise((resolve, reject) =>
                server.close((error) => (error ? reject(error) : resolve())),
            ),
    };
}
