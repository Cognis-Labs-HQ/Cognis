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

test("nginx delegates API upload limits to application quotas", async () => {
    const configuration = await readRepositoryFile(
        "docker/cognis-web/default.conf.template",
    );
    const apiLocation = configuration.match(
        /location \^~ \/api\/ \{([\s\S]*?)\n    \}/,
    )?.[1];

    assert.ok(apiLocation);
    assert.match(apiLocation, /client_max_body_size 0;/);
});

for (const profile of ["postgres", "mariadb"]) {
    test(`${profile} Compose profile requires deployment settings`, async () => {
        const configuration = await readRepositoryFile(
            `docker-compose.${profile}.yaml`,
        );

        assert.match(
            configuration,
            /DATA_ENCRYPTION_KEY: \$\{DATA_ENCRYPTION_KEY:\?/,
        );
        assert.match(configuration, /EXTERNAL_HOST: \$\{EXTERNAL_HOST:\?/);
        assert.match(configuration, /PASSWORD: \$\{[A-Z_]+PASSWORD:\?/);
    });
}
