import { createTfaLoginClient as createClient } from "/static/gateways/tfa/login-flow.js";
import { host } from "./contracts.js";

export let loginLifecycleVersion;

export function setVersion(version) {
    loginLifecycleVersion = version;
}

export async function createTfaLoginClient(options) {
    host.current.providerCalls.push(options);
    const client = await createClient(options);
    const change = host.current.providerContract;
    if (change?.outputVersion !== undefined)
        client.lifecycle = {
            ...client.lifecycle,
            version: change.outputVersion,
        };
    if (change?.wrongSignal)
        client.lifecycle = {
            ...client.lifecycle,
            signal: new AbortController().signal,
        };
    if (change?.missingRefresh) delete client.refreshPrompt;
    return client;
}
