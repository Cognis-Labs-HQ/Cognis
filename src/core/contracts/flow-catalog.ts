import { type Ctx, type FlowRegistration } from "../ctx/index.js";
import {
    createFlowContract,
    type CanonicalFlowContract,
} from "./flow-contract.js";
import { PROFILE_MEDIA_FLOW_CATALOG } from "./profile/media-flow-catalog.js";

export const CTX_CAPABILITY = "system:ctx";
export type {
    FlowPayloadFieldContract,
    FlowPayloadContract,
    FlowStageContract,
    CanonicalFlowContract,
} from "./flow-contract.js";

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
        id: "update-user-account",
        owner: "users",
        description:
            "Applies staged profile, role, preference, or lifecycle updates to an existing account.",
        stages: [
            {
                id: "authorize-request",
                description:
                    "Validate caller authority, target-account rules, and update scope before mutation begins.",
            },
            {
                id: "persist-updates",
                description:
                    "Apply canonical account and preference updates through the owning gateway surfaces.",
            },
            {
                id: "emit-events",
                description:
                    "Propagate notifications, profile sync, and audit side effects after account updates succeed.",
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

export const UI_SURFACE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "construct-dashboard-ui",
        owner: "ui",
        description:
            "Builds the dashboard shell from staged data, widget, and navigation contributions.",
        stages: [
            {
                id: "resolve-shell",
                description:
                    "Declare dashboard shell requirements, framing, and shared capability inputs.",
            },
            {
                id: "resolve-panels",
                description:
                    "Collect dashboard panels, widgets, and summary data from owning gateways or modules.",
            },
            {
                id: "compose-page",
                description:
                    "Assemble the final dashboard layout from resolved shell and panel contributions.",
            },
        ],
    }),
    createFlowContract({
        id: "construct-administration-ui",
        owner: "ui",
        description:
            "Builds the administration experience from staged section, data, and control contributions.",
        stages: [
            {
                id: "resolve-data",
                description:
                    "Resolve shared administration metadata and capability-backed state before composition.",
            },
            {
                id: "resolve-sections",
                description:
                    "Register canonical administration sections owned by gateways, modules, or the platform.",
            },
            {
                id: "compose-page",
                description:
                    "Assemble the final administration page structure from resolved sections and datasets.",
            },
            {
                id: "bind-controls",
                description:
                    "Attach control handlers, mutations, and follow-up orchestration after page composition.",
            },
        ],
    }),
    createFlowContract({
        id: "construct-navbar-ui",
        owner: "ui",
        description:
            "Builds the dashboard navbar from staged shell, plugin, and control contributions.",
        stages: [
            {
                id: "resolve-shell",
                description:
                    "Declare canonical navbar shell requirements and shared control slots.",
            },
            {
                id: "resolve-plugins",
                description:
                    "Collect navbar plugins, indicators, and capability-backed actions.",
            },
            {
                id: "compose-navbar",
                description:
                    "Assemble the final navbar ordering, layout, and control bindings.",
            },
        ],
    }),
    createFlowContract({
        id: "construct-spa-routes",
        owner: "ui",
        description:
            "Builds the SPA route table from staged core, gateway, and module route contributions.",
        stages: [
            {
                id: "resolve-core-routes",
                description:
                    "Register canonical shell routes and shared router metadata owned by the platform.",
            },
            {
                id: "extend-routes",
                description:
                    "Allow gateways and modules to contribute additional route descriptors and assets.",
            },
            {
                id: "finalize-router",
                description:
                    "Compose the final route manifest, loader metadata, and ordering for runtime use.",
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

export const GATEWAY_LIFECYCLE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "activate-gateway-routes",
        owner: "core",
        description:
            "Activates gateway-owned HTTP routes and UI surfaces after required capabilities are available.",
        stages: [
            {
                id: "resolve-dependencies",
                description:
                    "Confirm required gateway capabilities and bootstrap prerequisites before activation.",
            },
            {
                id: "register-routes",
                description:
                    "Register gateway-owned route handlers and route-context dependencies for runtime traffic.",
            },
            {
                id: "activate-surfaces",
                description:
                    "Expose gateway-owned UI surfaces, static assets, and passive metadata after route registration.",
            },
        ],
    }),
]);

export const MODULE_LIFECYCLE_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "enable-module",
        owner: "modules",
        description:
            "Enables a runtime module through staged policy, state persistence, and refresh work.",
        stages: [
            {
                id: "authorize-request",
                description:
                    "Validate runtime policy, dependency readiness, and acknowledgement requirements.",
            },
            {
                id: "persist-state",
                description:
                    "Persist the module enabled state through the owning runtime authority.",
            },
            {
                id: "refresh-runtime",
                description:
                    "Refresh routes, flows, CLI surfaces, and related runtime state after enablement succeeds.",
            },
        ],
    }),
    createFlowContract({
        id: "disable-module",
        owner: "modules",
        description:
            "Disables a runtime module through staged policy, state persistence, and refresh work.",
        stages: [
            {
                id: "authorize-request",
                description:
                    "Validate runtime policy and safeguard rules before disablement begins.",
            },
            {
                id: "persist-state",
                description:
                    "Persist the module disabled state through the owning runtime authority.",
            },
            {
                id: "refresh-runtime",
                description:
                    "Refresh routes, flows, CLI surfaces, and related runtime state after disablement succeeds.",
            },
        ],
    }),
    createFlowContract({
        id: "refresh-module-runtime",
        owner: "modules",
        description:
            "Refreshes module-owned routes, flows, UI surfaces, and capability contributions.",
        stages: [
            {
                id: "resolve-state",
                description:
                    "Resolve current module manifests, enablement state, and runtime prerequisites.",
            },
            {
                id: "reload-contributions",
                description:
                    "Reload active module route, flow, UI, and capability contributions from the runtime catalog.",
            },
            {
                id: "publish-state",
                description:
                    "Publish refreshed runtime metadata for downstream consumers such as UI and CLI surfaces.",
            },
        ],
    }),
]);

export const CLI_FLOW_CATALOG = Object.freeze([
    createFlowContract({
        id: "discover-cli-commands",
        owner: "tooling",
        description:
            "Builds the CLI command catalog from staged core, gateway, and module command contributors.",
        stages: [
            {
                id: "resolve-core-commands",
                description:
                    "Register canonical CLI commands and shared metadata owned by the tooling layer.",
            },
            {
                id: "extend-commands",
                description:
                    "Allow gateways and modules to contribute additional command descriptors and handlers.",
            },
            {
                id: "finalize-catalog",
                description:
                    "Compose the final executable command catalog and help metadata for runtime use.",
            },
        ],
    }),
    createFlowContract({
        id: "execute-cli-command",
        owner: "tooling",
        description:
            "Executes a CLI command through staged resolution, authorization, and handler dispatch.",
        stages: [
            {
                id: "resolve-command",
                description:
                    "Resolve the target command, command metadata, and capability prerequisites from the active catalog.",
            },
            {
                id: "authorize-command",
                description:
                    "Validate execution policy, token availability, and runtime preconditions before dispatch.",
            },
            {
                id: "dispatch-command",
                description:
                    "Execute the owning command handler and return its canonical payload.",
            },
        ],
    }),
]);

export const CORE_FLOW_CATALOG = Object.freeze([
    ...BOOTSTRAP_FLOW_CATALOG,
    ...AUTH_FLOW_CATALOG,
    ...USER_LIFECYCLE_FLOW_CATALOG,
    ...UI_SURFACE_FLOW_CATALOG,
    ...MESSAGING_FLOW_CATALOG,
    ...PROFILE_MEDIA_FLOW_CATALOG,
    ...MEETINGS_FLOW_CATALOG,
    ...GATEWAY_LIFECYCLE_FLOW_CATALOG,
    ...MODULE_LIFECYCLE_FLOW_CATALOG,
    ...CLI_FLOW_CATALOG,
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
