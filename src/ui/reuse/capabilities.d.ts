/** Generic browser capability ownership and deferred invocation contract. */
export interface BrowserCapabilities {
    contribute(id: string, value: unknown): boolean;
    remove(id: string, value: unknown): boolean;
    get<T = unknown>(id: string): T | undefined;
    bind<Args extends unknown[], Result>(
        id: string,
    ): (...argumentsList: Args) => Result | Promise<boolean>;
}
export declare function createCapabilityRegistry(): BrowserCapabilities;
export declare const uiCapabilities: BrowserCapabilities;
export declare const bindCapability: BrowserCapabilities["bind"];
