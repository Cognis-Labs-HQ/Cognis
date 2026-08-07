import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

test("GitLab publish waits for the test job", async () => {
    const configuration = await readFile(".gitlab-ci.yml", "utf8");
    assert.match(
        configuration,
        /publish:\s+needs:\s+- job: test\s+artifacts: false/,
    );
});
