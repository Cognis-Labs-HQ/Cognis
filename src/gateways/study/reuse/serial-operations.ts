/** Serialize operations sharing a key while allowing independent keys to proceed. */
export class SerialOperations {
    private readonly pending = new Map<string, Promise<unknown>>();

    async run<Result>(
        key: string,
        operation: () => Promise<Result>,
    ): Promise<Result> {
        const previous = this.pending.get(key) ?? Promise.resolve();
        const current = previous.then(operation, operation);
        this.pending.set(key, current);
        try {
            return await current;
        } finally {
            if (this.pending.get(key) === current) this.pending.delete(key);
        }
    }
}
