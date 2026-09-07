export function createResponseRecorder() {
    let status = 0;
    let headers: Record<string, string> = {};
    let writeHeadCalls = 0;
    const chunks: string[] = [];
    return {
        res: {
            setHeader() {},
            writeHead(code: number, nextHeaders: Record<string, string>) {
                writeHeadCalls += 1;
                status = code;
                headers = nextHeaders ?? {};
            },
            end(body?: string | Buffer) {
                if (body) chunks.push(body.toString());
            },
        },
        get status() {
            return status;
        },
        get headers() {
            return headers;
        },
        get body() {
            return chunks.join("");
        },
        get writeHeadCalls() {
            return writeHeadCalls;
        },
    };
}
