import { IncomingMessage, ServerResponse } from "node:http";
import { Socket } from "node:net";
import type { TestContext } from "node:test";
import type { KeyringRouteContext } from "../api/routes/index.js";

export function createRouteFixture(context: TestContext) {
    const routeContext: KeyringRouteContext = {
        requireAuth(req, res) {
            const authorization = req.headers.authorization;
            if (!authorization?.startsWith("Bearer ")) {
                res.writeHead(401);
                res.end();
                return null;
            }
            return { sub: authorization.slice(7), role: "user" };
        },
    };

    function makeJsonRequest(
        method: string,
        body: Record<string, unknown>,
        headers: Record<string, string> = {},
    ) {
        const req = new IncomingMessage(new Socket());
        req.method = method;
        req.headers = headers;
        req.push(Buffer.from(JSON.stringify(body)));
        req.push(null);
        return req;
    }

    function makeResponse() {
        const res = new ServerResponse(new IncomingMessage(new Socket()));
        let payload = "";
        context.mock.method(res, "end", (chunk?: string | Buffer) => {
            payload = chunk === undefined ? "" : String(chunk);
            return res;
        });
        return {
            res,
            get status() {
                return res.statusCode;
            },
            get payload() {
                return payload;
            },
        };
    }
    return { routeContext, makeJsonRequest, makeResponse };
}
