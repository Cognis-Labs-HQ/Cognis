import { writeFileSync } from "node:fs";
import { registerHttpCommand } from "../../http-command-plugin.ts";
import { register } from "../../registry.ts";

registerHttpCommand(
    {
        name: "fixture:token",
        method: "POST",
        path: "/fixture/token",
        bodyFields: [{ name: "token", required: true, sensitive: true }],
        description: "Fixture",
    },
    register,
);

// Supplemental public-registration fixtures exercise generic schema contracts.
for (const type of ["number", "boolean"]) {
    registerHttpCommand(
        {
            name: `fixture:${type}`,
            method: "POST",
            path: `/fixture/${type}`,
            bodyFields: [
                { name: "value", type, required: true, sensitive: false },
            ],
            description: "Fixture",
        },
        register,
    );
}
registerHttpCommand(
    {
        name: "fixture:query",
        method: "GET",
        path: "/fixture/query?existing=preserved",
        queryFields: [{ name: "term", required: true, sensitive: false }],
        description: "Fixture",
    },
    register,
);

const requests = [];
globalThis.fetch = async (url, options) => {
    const target = new URL(String(url));
    if (target.origin !== "https://cli-audit.invalid")
        throw new Error("Audit fixture forbids network access");
    const request = {
        method: options?.method ?? "GET",
        path: target.pathname + target.search,
        body: options?.body ? JSON.parse(String(options.body)) : null,
    };
    requests.push(request);
    writeFileSync(
        process.env.COGNIS_AUDIT_REQUEST_LOG,
        JSON.stringify(requests, null, 2),
    );
    if (target.pathname === "/api/v1/modules")
        return Response.json({ data: [] });
    if (target.pathname === "/api/v1/gateways")
        return Response.json({
            data: [
                { id: "tfa", enabled: true },
                { id: "registration", enabled: true },
            ],
        });
    if (target.pathname === "/api/v1/gateways/tfa/adapters")
        return Response.json({ data: [] });
    if (target.pathname === "/api/v1/gateways/registration/adapters")
        return Response.json({ data: [{ id: "token", enabled: true }] });
    if (target.pathname === "/api/v1/tfa/methods/preferences")
        return Response.json({ data: { fixtureInput: request } });
    if (
        target.pathname === "/api/v1/tfa/enforcement" ||
        [
            "/fixture/token",
            "/fixture/number",
            "/fixture/boolean",
            "/fixture/query",
        ].includes(target.pathname)
    )
        return Response.json({ data: { updated: true } });
    if (target.pathname === "/api/v1/users/fixture-target")
        return Response.json({
            data: { username: "fixture-target", enabled: true, role: "user" },
        });
    if (target.pathname === "/api/v1/users/fixture-target/info")
        return Response.json({ data: { username: "fixture-target" } });
    if (target.pathname === "/api/v1/users/fixture-target/password")
        return Response.json({ data: { updated: true } });
    if (target.pathname === "/api/v1/users/fixture-target/disable") {
        if (process.env.COGNIS_FIXTURE_DELAY)
            await new Promise((resolve) =>
                setTimeout(resolve, Number(process.env.COGNIS_FIXTURE_DELAY)),
            );
        if (process.env.COGNIS_FIXTURE_FAILURE)
            return Response.json(
                { error: { message: "Fixture refused" } },
                { status: 400 },
            );
        return Response.json({ data: { updated: true } });
    }
    throw new Error(
        `Unexpected audit fixture request: ${request.method} ${request.path}`,
    );
};
