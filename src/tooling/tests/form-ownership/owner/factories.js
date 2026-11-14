import { createFormBuilder as sharedBuilder } from "/static/reuse/form-builder.js";
import { fakeBuilder } from "./fake-builder.js";

function inner() {
    return sharedBuilder({}, {});
}

export function good() {
    return inner();
}

export function custom() {
    return { attach() {} };
}

export function discarded() {
    sharedBuilder({}, {});
    return custom();
}

export function shadowedParameter(sharedBuilder) {
    return sharedBuilder({}, {});
}

export function shadowedLocal() {
    const sharedBuilder = custom;
    return sharedBuilder({}, {});
}

export function shadowedVar() {
    if (true) {
        var sharedBuilder = custom;
    }
    return sharedBuilder({}, {});
}

export function fake() {
    return fakeBuilder();
}

export function cycle() {
    return secondCycle();
}

function secondCycle() {
    return cycle();
}

export function reassigned() {
    return changed();
}

function changed() {
    return sharedBuilder({}, {});
}

changed = custom;

export function branch() {
    if (globalThis.custom) return custom();
    return sharedBuilder({}, {});
}
