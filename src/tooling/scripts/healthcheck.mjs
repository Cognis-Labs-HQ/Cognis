#!/usr/bin/env node
import { request } from "node:http";

const port = Number.parseInt(process.env.PORT ?? "3000", 10);

const currentRequest = request(
    {
        host: "127.0.0.1",
        port,
        path: "/api/v1/system/health",
        method: "GET",
        timeout: 4000,
    },
    (response) => {
        process.exit(response.statusCode === 200 ? 0 : 1);
    },
);

currentRequest.on("timeout", () => {
    currentRequest.destroy(new Error("request timed out"));
});

currentRequest.on("error", () => {
    process.exit(1);
});

currentRequest.end();
