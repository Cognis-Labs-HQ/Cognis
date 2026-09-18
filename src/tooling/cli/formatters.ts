import { normalizeResponse } from "./payload.ts";

const FIELD_EMPTY_PLACEHOLDER = "—";

type TextColor =
    | "red"
    | "green"
    | "yellow"
    | "blue"
    | "magenta"
    | "cyan"
    | "gray"
    | "bold";

function shouldUseAnsiColors(): boolean {
    return process.stdout.isTTY && !("NO_COLOR" in process.env);
}

function colorize(value: string, color: TextColor): string {
    if (!shouldUseAnsiColors()) return value;

    const code =
        color === "red"
            ? "\u001b[31m"
            : color === "green"
              ? "\u001b[32m"
              : color === "yellow"
                ? "\u001b[33m"
                : color === "blue"
                  ? "\u001b[34m"
                  : color === "magenta"
                    ? "\u001b[35m"
                    : color === "cyan"
                      ? "\u001b[36m"
                      : color === "gray"
                        ? "\u001b[90m"
                        : "\u001b[1m";

    return `${code}${value}\u001b[0m`;
}

function statusColor(status: string): TextColor {
    const normalized = status.toLowerCase();

    if (
        normalized === "ok" ||
        normalized === "active" ||
        normalized === "enabled" ||
        normalized === "verified"
    ) {
        return "green";
    }

    if (normalized === "available") return "cyan";

    if (normalized === "disabled" || normalized === "missing") {
        return "yellow";
    }

    if (normalized === "mismatch" || normalized === "error") {
        return "red";
    }

    return "blue";
}

export function formatHeading(title: string, color: TextColor): string {
    return colorize(colorize(title, color), "bold");
}

export function formatStatus(status: unknown): string {
    return colorize(String(status), statusColor(String(status)));
}

export function formatField(label: string, value: unknown): string {
    return `${colorize(`${label}:`, "gray")} ${value === undefined || value === null ? FIELD_EMPTY_PLACEHOLDER : String(value)}`;
}

export function formatBoolean(value: boolean, yes = "Yes", no = "No"): string {
    return colorize(value ? yes : no, value ? "green" : "yellow");
}

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return value != null && typeof value === "object" && !Array.isArray(value);
}

function humanizeKey(key: string): string {
    return key
        .replace(/([a-z0-9])([A-Z])/g, "$1 $2")
        .replace(/[_-]+/g, " ")
        .replace(/^./, (firstCharacter) => firstCharacter.toUpperCase());
}

function formatValue(value: unknown): string {
    if (value === undefined || value === null || value === "") {
        return FIELD_EMPTY_PLACEHOLDER;
    }
    if (typeof value === "boolean") return formatBoolean(value);
    if (Array.isArray(value) || isPlainRecord(value)) {
        return JSON.stringify(value, null, 2);
    }
    return String(value);
}

function collectTableColumns(
    rows: Array<Record<string, unknown>>,
): Array<{ key: string; label: string }> {
    const keys: string[] = [];
    for (const row of rows) {
        for (const key of Object.keys(row)) {
            const value = row[key];
            if (
                value === undefined ||
                Array.isArray(value) ||
                isPlainRecord(value)
            ) {
                continue;
            }
            if (!keys.includes(key)) keys.push(key);
        }
    }
    return keys.slice(0, 8).map((key) => ({ key, label: humanizeKey(key) }));
}

function formatDurationMs(value: unknown): string {
    if (typeof value !== "number" || !Number.isFinite(value)) {
        return String(value);
    }

    if (value < 1000) return `${value} ms`;

    const seconds = value / 1000;
    if (seconds < 60) return `${seconds.toFixed(2)} s`;
    return `${(seconds / 60).toFixed(2)} min`;
}

export function formatStructured(value: unknown): string {
    const normalized =
        typeof value === "string" ? normalizeResponse(value) : value;
    if (typeof normalized === "string") return normalized;
    if (normalized === undefined) return "";
    return JSON.stringify(normalized, null, 2);
}

export function renderStructuredSummary(value: unknown): string {
    const normalized =
        typeof value === "string" ? normalizeResponse(value) : value;
    if (typeof normalized === "string") return normalized;
    if (!isPlainRecord(normalized)) return formatStructured(normalized);

    const sections: string[] = [];
    const data = normalized.data;
    if (Array.isArray(data)) {
        const rows = data.filter(isPlainRecord);
        const columns = collectTableColumns(rows);
        if (rows.length > 0 && columns.length > 0) {
            sections.push(formatTable(columns, rows));
        } else {
            sections.push(formatStructured(data));
        }
    } else if (isPlainRecord(data)) {
        sections.push(
            Object.entries(data)
                .map(([key, fieldValue]) =>
                    formatField(humanizeKey(key), formatValue(fieldValue)),
                )
                .join("\n"),
        );
    }

    const meta = normalized.meta;
    if (isPlainRecord(meta) && Object.keys(meta).length > 0) {
        sections.push(formatHeading("Metadata", "cyan"));
        sections.push(
            Object.entries(meta)
                .map(([key, fieldValue]) =>
                    formatField(humanizeKey(key), formatValue(fieldValue)),
                )
                .join("\n"),
        );
    }

    return sections.length > 0
        ? sections.join("\n\n")
        : formatStructured(normalized);
}

function formatTable(
    columns: Array<{ key: string; label: string }>,
    rows: Array<Record<string, unknown>>,
    options?: { emptyMessage?: string },
): string {
    if (rows.length === 0) {
        return colorize(options?.emptyMessage ?? "No entries found.", "gray");
    }

    const widths = columns.map(({ key, label }) =>
        rows.reduce(
            (width, row) =>
                Math.max(
                    width,
                    String(row[key] ?? FIELD_EMPTY_PLACEHOLDER).length,
                ),
            label.length,
        ),
    );

    const header = columns
        .map(({ label }, index) =>
            colorize(label.padEnd(widths[index]), "bold"),
        )
        .join("  ");

    const body = rows.map((row) =>
        columns
            .map(({ key }, index) =>
                String(row[key] ?? FIELD_EMPTY_PLACEHOLDER).padEnd(
                    widths[index],
                ),
            )
            .join("  "),
    );

    return [header, ...body].join("\n");
}

function formatSuccessBlock(
    title: string,
    color: TextColor,
    fields: string[],
): string {
    return [formatHeading(title, color), ...fields].join("\n");
}

export function renderApiErrorPayload(input: {
    status?: number;
    statusText?: string;
    payload?: unknown;
}): string {
    const sections = [formatHeading("API Error", "red")];
    if (input.status !== undefined) {
        sections.push(
            formatField(
                "Status",
                `${input.status}${input.statusText ? ` ${input.statusText}` : ""}`,
            ),
        );
    }

    const payload = input.payload;
    const response = isPlainRecord(payload) ? payload : null;
    const error = isPlainRecord(response?.error) ? response.error : null;
    if (error) {
        sections.push(formatField("Code", formatValue(error.code)));
        sections.push(formatField("Message", formatValue(error.message)));
        if (error.details !== undefined) {
            sections.push(formatField("Details", formatValue(error.details)));
        }
        return sections.join("\n");
    }

    if (payload !== undefined && payload !== "") {
        sections.push(formatField("Response", formatValue(payload)));
    }
    return sections.join("\n");
}

export function renderApiToken(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: {
            token?: string;
            role?: string;
            ttlSeconds?: number;
            expiresAt?: string;
        };
    };
    const data = response.data ?? {};

    return [
        formatHeading("Emergency API Token", "magenta"),
        formatField("Role", data.role),
        formatField(
            "TTL",
            data.ttlSeconds ? `${data.ttlSeconds} seconds` : "—",
        ),
        formatField("Expires", data.expiresAt),
        formatField("Token", data.token),
    ].join("\n");
}

export function renderSystemHealth(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: {
            status?: string;
            timestamp?: string;
            startedAt?: string;
            uptimeMs?: number;
            contributions?: Array<{
                componentId?: string;
                componentType?: string;
                status?: string;
                message?: string;
            }>;
        };
    };
    const data = response.data ?? {};

    const contributions = Array.isArray(data.contributions)
        ? data.contributions
        : [];

    return [
        formatHeading("System Health", "cyan"),
        formatField("Status", formatStatus(data.status ?? "unknown")),
        formatField("Checked", data.timestamp),
        formatField("Started", data.startedAt),
        formatField("Uptime", formatDurationMs(data.uptimeMs)),
        ...(contributions.length
            ? [
                  "",
                  formatHeading("Components", "cyan"),
                  formatTable(
                      [
                          { key: "component", label: "Component" },
                          { key: "type", label: "Type" },
                          { key: "status", label: "Status" },
                          { key: "message", label: "Message" },
                      ],
                      contributions.map((contribution) => ({
                          component:
                              contribution.componentId ??
                              FIELD_EMPTY_PLACEHOLDER,
                          type:
                              contribution.componentType ??
                              FIELD_EMPTY_PLACEHOLDER,
                          status:
                              contribution.status ?? FIELD_EMPTY_PLACEHOLDER,
                          message:
                              contribution.message ?? FIELD_EMPTY_PLACEHOLDER,
                      })),
                  ),
              ]
            : []),
    ].join("\n");
}

export function renderComponentsList(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            id?: string;
            type?: string;
            version?: string;
            status?: string;
            gatewayId?: string;
        }>;
    };
    const data = response.data ?? [];

    return [
        formatHeading("Components", "cyan"),
        formatTable(
            [
                { key: "id", label: "ID" },
                { key: "type", label: "Type" },
                { key: "version", label: "Version" },
                { key: "status", label: "Status" },
                { key: "gatewayId", label: "Gateway" },
            ],
            data.map((component) => ({
                id: component.id ?? FIELD_EMPTY_PLACEHOLDER,
                type: component.type ?? FIELD_EMPTY_PLACEHOLDER,
                version: component.version ?? FIELD_EMPTY_PLACEHOLDER,
                status: component.status ?? FIELD_EMPTY_PLACEHOLDER,
                gatewayId: component.gatewayId ?? FIELD_EMPTY_PLACEHOLDER,
            })),
            { emptyMessage: "No components found." },
        ),
    ].join("\n\n");
}

export function renderGatewaysList(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            id?: string;
            name?: string;
            version?: string;
            status?: string;
            required?: boolean;
        }>;
    };
    const data = response.data ?? [];

    return [
        formatHeading("Gateways", "cyan"),
        formatTable(
            [
                { key: "id", label: "ID" },
                { key: "name", label: "Name" },
                { key: "version", label: "Version" },
                { key: "status", label: "Status" },
                { key: "required", label: "Required" },
            ],
            data.map((gateway) => ({
                id: gateway.id ?? FIELD_EMPTY_PLACEHOLDER,
                name: gateway.name ?? FIELD_EMPTY_PLACEHOLDER,
                version: gateway.version ?? FIELD_EMPTY_PLACEHOLDER,
                status: gateway.status ?? FIELD_EMPTY_PLACEHOLDER,
                required:
                    typeof gateway.required === "boolean"
                        ? gateway.required
                            ? "yes"
                            : "no"
                        : "no",
            })),
            { emptyMessage: "No gateways found." },
        ),
    ].join("\n\n");
}

export function renderUsersList(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: Array<{
            username?: string;
            role?: string;
            enabled?: boolean;
            isFounder?: boolean;
        }>;
    };
    const data = response.data ?? [];

    return [
        formatHeading("Users", "cyan"),
        formatTable(
            [
                { key: "username", label: "Username" },
                { key: "role", label: "Role" },
                { key: "status", label: "Status" },
                { key: "founder", label: "Founder" },
            ],
            data.map((user) => ({
                username: user.username ?? FIELD_EMPTY_PLACEHOLDER,
                role: user.role ?? "user",
                status: user.enabled ? "enabled" : "disabled",
                founder: user.isFounder ? "yes" : "no",
            })),
            { emptyMessage: "No users found." },
        ),
    ].join("\n\n");
}

export function renderUserCreate(payload: unknown): string {
    const response = normalizeResponse(payload) as {
        data?: {
            username?: string;
            role?: string;
            enabled?: boolean;
        };
    };
    const data = response.data ?? {};

    return formatSuccessBlock("User Created", "green", [
        formatField("Username", data.username),
        formatField("Role", data.role ?? "user"),
        formatField("Status", data.enabled ? "enabled" : "disabled"),
    ]);
}

export function renderUserMutation(
    title: string,
    payload: unknown,
    extraFields?: (normalizedPayload: Record<string, unknown>) => string[],
): string {
    const normalizedPayload = normalizeResponse(payload) as Record<
        string,
        unknown
    >;

    return formatSuccessBlock(title, "green", [
        formatField("Username", normalizedPayload.username),
        ...(extraFields ? extraFields(normalizedPayload) : []),
    ]);
}

export function renderGatewayMutation(title: string, payload: unknown): string {
    const response = normalizeResponse(payload) as {
        gatewayId?: string;
        data?: { status?: string };
    };

    return formatSuccessBlock(title, "green", [
        formatField("Gateway", response.gatewayId),
        formatField("Status", formatStatus(response.data?.status ?? "unknown")),
    ]);
}

export function renderComponentMutation(
    title: string,
    payload: unknown,
): string {
    const response = normalizeResponse(payload) as {
        componentId?: string;
        componentType?: string;
        gatewayId?: string;
        data?: {
            moduleId?: string;
            enabled?: boolean;
            status?: string;
            saved?: boolean;
        };
    };
    const status =
        response.data?.status ??
        (typeof response.data?.enabled === "boolean"
            ? response.data.enabled
                ? "enabled"
                : "disabled"
            : undefined);

    return formatSuccessBlock(title, "green", [
        formatField(
            "Component",
            response.componentId ?? response.data?.moduleId,
        ),
        formatField("Type", response.componentType),
        ...(response.gatewayId
            ? [formatField("Gateway", response.gatewayId)]
            : []),
        formatField("Status", formatStatus(status ?? "updated")),
    ]);
}
