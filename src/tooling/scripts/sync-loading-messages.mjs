// Refresh the small eager bundle after editing loading_joke_* in English strings.xml.
import { readFile, writeFile } from "node:fs/promises";
import { loadingMessagesFromXml } from "../reuse/loading-messages.mjs";
const directory = new URL("../../ui/languages/en/", import.meta.url);
const messages = loadingMessagesFromXml(
    await readFile(new URL("strings.xml", directory), "utf8"),
);
await writeFile(
    new URL("loading.json", directory),
    JSON.stringify(messages, null, 4) + "\n",
);
