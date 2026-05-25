/**
 * Shared HTTP test helpers for notify gateway route tests.
 *
 * Public exports:
 * - requestWithBody(method, body, token): creates a mock request object with a JSON body stream and bearer token.
 * - makeResponse(): creates a capture response object exposing status and payload getters.
 *
 * Usage:
 *   const req = requestWithBody('POST', { to: 'admin@example.com' }, adminToken);
 *   const res = makeResponse();
 *   await route(req, res, new URL('http://localhost/api/v1/...'));
 *
 * @param {string} method
 * @param {Record<string, unknown>} body
 * @param {string} token
 * @returns {MockRequest}
 */
interface MockRequest {
    method: string;
    headers: { authorization: string };
    [Symbol.asyncIterator]: () => AsyncGenerator<Buffer, void, unknown>;
}

interface MockResponse {
    writeHead(code: number): void;
    end(responseBody: string): void;
    readonly status: number;
    readonly payload: string;
}

export function requestWithBody(
    method: string,
    body: Record<string, unknown>,
    token: string,
): MockRequest {
    const chunks = [Buffer.from(JSON.stringify(body))];
    return {
        method,
        headers: { authorization: `Bearer ${token}` },
        [Symbol.asyncIterator]: async function* () {
            for (const chunk of chunks) yield chunk;
        },
    };
}

/**
 * @returns {MockResponse}
 */
export function makeResponse(): MockResponse {
    let status = 0;
    let payload = "";
    return {
        writeHead(code: number) {
            status = code;
        },
        end(responseBody: string) {
            payload = responseBody;
        },
        get status() {
            return status;
        },
        get payload() {
            return payload;
        },
    };
}
