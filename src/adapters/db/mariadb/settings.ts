export function readBoundedEnvironmentInteger(
    name: string,
    defaultValue: number,
    minimum: number,
    maximum: number,
): number {
    const rawValue = process.env[name];
    if (rawValue === undefined || rawValue === "") {
        return defaultValue;
    }
    const value = Number(rawValue);
    if (!Number.isInteger(value) || value < minimum || value > maximum) {
        throw new Error(
            `${name} must be an integer between ${minimum} and ${maximum}`,
        );
    }
    return value;
}
