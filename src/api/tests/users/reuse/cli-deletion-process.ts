import { writeFile } from "node:fs/promises";
import {
    createCliDeletionFixture,
    type DeletionFault,
} from "./cli-deletion.js";

const fixture = await createCliDeletionFixture(
    process.env.COGNIS_DELETION_FAULT as DeletionFault,
    process.env.COGNIS_DELETION_RESPONSE_STATUS
        ? Number(process.env.COGNIS_DELETION_RESPONSE_STATUS)
        : undefined,
);
globalThis.fetch = async (url, options) => {
    try {
        return await fixture.fetch(url, options);
    } finally {
        await writeFile(
            process.env.COGNIS_DELETION_REPORT!,
            JSON.stringify(await fixture.snapshot()),
        );
    }
};
process.on("beforeExit", async () => {
    await fixture.dispose();
});
