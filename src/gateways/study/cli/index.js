import { registerHttpCommands } from "../../../tooling/cli/http-command-plugin.ts";

export function registerCommands({ register }) {
    registerHttpCommands(
        [
            {
                name: "study:languages",
                method: "GET",
                path: "/api/v1/study/registered-languages",
                description: "List registered study languages.",
            },
            {
                name: "study:language:modules",
                method: "GET",
                path: "/api/v1/study/languages/:languageCode/modules",
                params: ["languageCode"],
                description: "List enabled study language child modules.",
            },
        ],
        register,
    );
}
