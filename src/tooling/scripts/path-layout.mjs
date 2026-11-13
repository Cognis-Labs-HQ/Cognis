import path from "node:path";

export function pathLayoutIssues(files) {
    const normalizedFiles = files.map((file) => file.replaceAll("\\", "/"));
    const directories = new Set(
        normalizedFiles.flatMap((file) => {
            const segments = file.split("/");
            return segments
                .slice(0, -1)
                .map((_, index) => segments.slice(0, index + 1).join("/"));
        }),
    );
    const issues = [];
    for (const file of normalizedFiles) {
        const segments = file.split("/");
        const fixtureIndex = segments.indexOf("fixtures");
        if (
            fixtureIndex >= 0 &&
            segments.slice(fixtureIndex + 1).includes("src")
        ) {
            issues.push(
                `${file}: keep fixture assets outside replicated source trees`,
            );
        }
        if (!/\.test\.[cm]?[jt]s$/.test(file)) continue;
        const directory = path.posix.dirname(file);
        const name = path.posix.basename(file);
        const subject = path.posix.basename(directory);
        if (subject !== "tests" && name.startsWith(`${subject}-`)) {
            issues.push(
                `${file}: omit the subject already supplied by its directory`,
            );
        }
        const parts = name.split("-");
        for (let index = 1; index < parts.length; index += 1) {
            const prefix = parts.slice(0, index).join("-");
            if (directories.has(`${directory}/${prefix}`)) {
                issues.push(
                    `${file}: place related tests in the existing ${prefix} directory`,
                );
                break;
            }
        }
    }
    return issues;
}
