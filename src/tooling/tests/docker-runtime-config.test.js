import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const readRepositoryFile = (path) =>
    readFile(new URL(`../../../${path}`, import.meta.url), "utf8");

test("nginx preserves an incoming HTTPS forwarding scheme", async () => {
    const configuration = await readRepositoryFile(
        "docker/cognis-web/default.conf.template",
    );

    assert.match(configuration, /~\*\^https\$ https;/);
    assert.equal(
        configuration.match(
            /proxy_set_header X-Forwarded-Proto \$forwarded_proto;/g,
        )?.length,
        3,
    );
});

for (const profile of ["postgres", "mariadb"]) {
    test(`${profile} Compose profile loads generated secrets`, async () => {
        const configuration = await readRepositoryFile(
            `docker-compose.${profile}.yaml`,
        );

        assert.match(configuration, /\.\/docker\/env\/runtime\.env/);
        assert.match(configuration, /\.\/docker\/env\/default\.env/);
    });
}
