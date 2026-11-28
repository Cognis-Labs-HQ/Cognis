import path from "node:path";
import { EventEmitter } from "node:events";
import { GatewayRegistry, CapabilityStore } from "@cognis/core";
import { RouteRegistry } from "../../../../api/reuse/route-registry.js";
import { UIRegistry } from "../../../../api/reuse/ui-registry.js";
import type { DatabaseExecutor } from "../../../db/reuse/db-executor.js";
import type { StructuredDatabaseCommand } from "../../../db/reuse/db-command.js";

class PreferenceDatabase implements DatabaseExecutor {
    readonly preferences = new Map<string, string>();

    async ensureTable() {}

    async executeCommand(command: StructuredDatabaseCommand) {
        if (command.option === "SELECT") {
            return {
                rows: [...this.preferences].map(
                    ([adapter_id, config_json]) => ({
                        adapter_id,
                        config_json,
                    }),
                ),
            };
        }
        if (command.option === "INSERT") {
            this.preferences.set(
                String(command.values.adapter_id),
                String(command.values.config_json),
            );
        }
        if (command.option === "DELETE") {
            this.preferences.delete(String(command.where?.[0]?.value));
        }
        return { rowCount: 1 };
    }

    async transaction<Result>(
        callback: (executor: DatabaseExecutor) => Promise<Result>,
    ): Promise<Result> {
        return callback(this);
    }
}
export { PreferenceDatabase };

export class ResponseRecorder extends EventEmitter {
    statusCode = 0;
    headers: Record<string, string> = {};
    payload = "";

    writeHead(code: number, headers?: Record<string, string>) {
        this.statusCode = code;
        this.headers = { ...this.headers, ...(headers ?? {}) };
    }

    setHeader(name: string, value: string) {
        this.headers[name.toLowerCase()] = value;
    }

    write(chunk: string | Buffer) {
        this.payload += String(chunk);
        return true;
    }

    end(chunk?: string | Buffer) {
        if (chunk) this.payload += String(chunk);
        this.emit("close");
    }
}

export class RequestRecorder extends EventEmitter {
    method: string;
    headers: Record<string, string>;
    body: string;

    constructor(method: string, token?: string, body = "") {
        super();
        this.method = method;
        this.headers = token ? { authorization: `Bearer ${token}` } : {};
        this.body = body;
    }

    async *[Symbol.asyncIterator]() {
        if (this.body) yield Buffer.from(this.body);
    }
}

export async function makeContext(
    databaseExecutor: DatabaseExecutor = new PreferenceDatabase(),
) {
    const capabilities = new CapabilityStore();
    capabilities.contribute("db:executor", databaseExecutor);
    capabilities.contribute("file:append", async () => undefined);
    return {
        gatewayRegistry: new GatewayRegistry(),
        routeRegistry: new RouteRegistry(),
        capabilities,
        uiRegistry: new UIRegistry(),
        adaptersRoot: path.resolve(process.cwd(), "src", "adapters"),
    };
}
