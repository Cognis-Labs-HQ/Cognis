/**
 * Guards asynchronous buffered actions against changes to the active account/session.
 * Exports: captureAccountGuard — capture an identity and return its validator.
 * @example const assertAccount = captureAccountGuard(); await prepare(); assertAccount();
 * @returns {() => void} Throws if the account or session changed since capture.
 */
export function captureAccountGuard() {
    const identity = () =>
        JSON.stringify([
            globalThis.localStorage?.getItem("cognis_account"),
            globalThis.localStorage?.getItem("cognis_access_token"),
        ]);
    const expected = identity();
    return () => {
        if (identity() !== expected) throw new Error("offline_account_changed");
    };
}
