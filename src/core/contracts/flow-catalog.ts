import { type Ctx, type FlowRegistration } from "../ctx/index.js";

export const CTX_CAPABILITY = "system:ctx";

export interface FlowPayloadFieldContract {
    key: string;
    type: string;
    description: string;
    required?: boolean;
}

export interface FlowPayloadContract {
    description?: string;
    fields?: readonly FlowPayloadFieldContract[];
}

export interface FlowStageContract {
    id: string;
    description: string;
    input?: FlowPayloadContract;
    output?: FlowPayloadContract;
}

export interface CanonicalFlowContract {
    id: string;
    owner: string;
    description: string;
    stages: readonly FlowStageContract[];
}

function freezePayloadContract(
    payload?: FlowPayloadContract,
): FlowPayloadContract | undefined {
    if (!payload) {
        return undefined;
    }
    return Object.freeze({
        ...payload,
        fields: payload.fields
            ? Object.freeze(
                  [...payload.fields].map((field) =>
                      Object.freeze({ ...field }),
                  ),
              )
            : undefined,
    });
}

function freezeStageContract(stage: FlowStageContract): FlowStageContract {
    return Object.freeze({
        id: stage.id,
        description: stage.description,
        input: freezePayloadContract(stage.input),
        output: freezePayloadContract(stage.output),
    });
}

function createFlowContract(
    flow: CanonicalFlowContract,
): CanonicalFlowContract {
    return Object.freeze({
        ...flow,
        stages: Object.freeze(flow.stages.map(freezeStageContract)),
    });
}

export const BOOTSTRAP_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "bootstrap-platform",
        owner: "core",
        description:
            "Coordinates component discovery, flow registration, and route activation during platform startup.",
        stages: [
            {
                id: "discover-components",
                description:
                    "Enumerate gateways, adapters, modules, and optional capabilities before orchestration begins.",
            },
            {
                id: "register-flows",
                description:
                    "Register canonical flows and stage hooks before runtime traffic reaches the system.",
            },
            {
                id: "activate-routes",
                description:
                    "Expose HTTP routes and UI surfaces after the required flow graph is in place.",
            },
        ],
    }),
]);

export const AUTH_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "construct-login-ui",
        owner: "auth",
        description:
            "Builds the login surface from staged provider and UX contributions.",
        stages: [
            {
                id: "resolve-shell",
                description:
                    "Declare the login page shell and any shared framing requirements.",
            },
            {
                id: "resolve-methods",
                description:
                    "Collect canonical login methods from the owning auth gateway.",
            },
            {
                id: "augment-methods",
                description:
                    "Allow optional adapters to annotate or extend login method metadata.",
            },
            {
                id: "compose-form",
                description:
                    "Assemble final form sections, calls-to-action, and supporting UI fragments.",
            },
        ],
    }),
    createFlowContract({
        id: "login",
        owner: "auth",
        description:
            "Authenticates an incoming login attempt and establishes post-auth state.",
        stages: [
            {
                id: "resolve-provider",
                description:
                    "Select or validate the provider that should handle the submitted credentials.",
                input: {
                    description:
                        "Login attempts provide provider selection plus provider-specific credentials.",
                    fields: [
                        {
                            key: "provider",
                            type: "string",
                            description:
                                "Requested provider ID or an empty value for default-provider resolution.",
                        },
                    ],
                },
            },
            {
                id: "authenticate",
                description:
                    "Perform provider-specific credential verification and return an auth context.",
            },
            {
                id: "establish-session",
                description:
                    "Issue session state, post-auth routing hints, and follow-up enforcement requirements.",
            },
        ],
    }),
    createFlowContract({
        id: "ldap-auth",
        owner: "auth-ldap",
        description:
            "Runs LDAP-specific authentication and account-mapping stages as an auth subflow.",
        stages: [
            {
                id: "resolve-adapter",
                description:
                    "Confirm LDAP adapter availability and expose provider metadata.",
            },
            {
                id: "authenticate",
                description:
                    "Authenticate against the LDAP provider and return raw directory identity details.",
            },
            {
                id: "map-account",
                description:
                    "Normalize LDAP identity data into Cognis account context fields.",
            },
        ],
    }),
    createFlowContract({
        id: "construct-settings-ui",
        owner: "ui",
        description:
            "Builds the settings surface from staged capability and subsection contributions.",
        stages: [
            {
                id: "resolve-sections",
                description:
                    "Register canonical settings sections owned by the platform or a gateway.",
            },
            {
                id: "augment-sections",
                description:
                    "Allow optional capabilities to extend existing settings sections with extra controls.",
            },
            {
                id: "compose-page",
                description:
                    "Assemble the final settings page structure from collected sections and widgets.",
            },
        ],
    }),
]);

export const USER_LIFECYCLE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "provision-user",
        owner: "users",
        description:
            "Creates or activates a user account through staged validation and persistence steps.",
        stages: [
            {
                id: "validate-request",
                description:
                    "Validate account input, policies, and capability prerequisites.",
            },
            {
                id: "persist-account",
                description:
                    "Create or update canonical account records in the owning gateway or adapter.",
            },
            {
                id: "emit-events",
                description:
                    "Emit notifications, profile provisioning, and audit side effects after persistence succeeds.",
            },
        ],
    }),
    createFlowContract({
        id: "deprovision-user",
        owner: "users",
        description:
            "Disables or removes a user account through staged policy, persistence, and cleanup steps.",
        stages: [
            {
                id: "authorize-request",
                description:
                    "Enforce policy checks before account disablement or deletion begins.",
            },
            {
                id: "persist-state",
                description:
                    "Apply the requested lifecycle state change within the owning account system.",
            },
            {
                id: "cleanup-dependencies",
                description:
                    "Remove or reconcile dependent state such as sessions, memberships, or background resources.",
            },
        ],
    }),
]);

export const MESSAGING_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "construct-messaging-ui",
        owner: "social",
        description:
            "Builds the messaging surface from staged room, sidebar, and composer contributions.",
        stages: [
            {
                id: "resolve-navigation",
                description:
                    "Collect room and conversation navigation structures before the page renders.",
            },
            {
                id: "resolve-panels",
                description:
                    "Resolve primary message panels, request states, and related contextual data.",
            },
            {
                id: "compose-surface",
                description:
                    "Assemble the final messaging layout and supporting actions.",
            },
        ],
    }),
    createFlowContract({
        id: "send-message",
        owner: "social",
        description:
            "Dispatches a message through staged validation, delivery, and post-send fan-out.",
        stages: [
            {
                id: "validate-message",
                description:
                    "Validate target room access, content constraints, and attachment readiness.",
            },
            {
                id: "persist-message",
                description:
                    "Persist the canonical message record and related attachment metadata.",
            },
            {
                id: "fan-out",
                description:
                    "Deliver message updates to listeners, notifications, and downstream bridges.",
            },
        ],
    }),
]);

export const MEETINGS_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "construct-meetings-ui",
        owner: "meetings",
        description:
            "Builds the meetings experience from staged provider, room, and participation contributions.",
        stages: [
            {
                id: "resolve-providers",
                description:
                    "Collect meeting providers and availability metadata before rendering the UI.",
            },
            {
                id: "resolve-panels",
                description:
                    "Resolve meeting panels, chat surfaces, and participant state widgets.",
            },
            {
                id: "compose-surface",
                description:
                    "Assemble the final meetings page layout and supporting actions.",
            },
        ],
    }),
    createFlowContract({
        id: "create-meeting",
        owner: "meetings",
        description:
            "Creates or joins a meeting through staged validation, provider setup, and post-join wiring.",
        stages: [
            {
                id: "validate-request",
                description:
                    "Validate room access, target provider availability, and meeting options.",
            },
            {
                id: "provision-session",
                description:
                    "Create or attach to the provider session and return meeting connection details.",
            },
            {
                id: "finalize-join",
                description:
                    "Wire post-join state such as chat bridges, telemetry, and UX affordances.",
            },
        ],
    }),
]);

export const CORE_FLOW_CATALOG = Object.freeze([
    ...BOOTSTRAP_FLOW_CATALOG,
    ...AUTH_FLOW_CATALOG,
    ...USER_LIFECYCLE_FLOW_CATALOG,
    ...MESSAGING_FLOW_CATALOG,
    ...MEETINGS_FLOW_CATALOG,
]);

export function listCanonicalFlowContracts(): readonly CanonicalFlowContract[] {
    return CORE_FLOW_CATALOG;
}

export function getCanonicalFlowContract(
    flowId: string,
): CanonicalFlowContract | undefined {
    return CORE_FLOW_CATALOG.find((flow) => flow.id === flowId);
}

export function createFlowRegistration(
    flow: CanonicalFlowContract,
): FlowRegistration {
    return {
        id: flow.id,
        description: flow.description,
        stages: flow.stages.map((stage) => stage.id),
    };
}

export function registerCanonicalFlow(
    ctx: Ctx,
    flow: CanonicalFlowContract,
): boolean {
    if (ctx.hasFlow(flow.id)) {
        return false;
    }
    ctx.registerFlow(createFlowRegistration(flow));
    return true;
}
