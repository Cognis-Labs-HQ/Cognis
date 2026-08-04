import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";

const profiles = [
    {
        compose: "docker-compose.postgres.yaml",
        driverEnv: "docker/env/postgres.env",
        setupEnv: "docker/env/postgres-production.env",
        image: "postgres:17-alpine",
        dbType: "postgresql",
    },
    {
        compose: "docker-compose.postgres.dev.yaml",
        driverEnv: "docker/env/postgres.env",
        setupEnv: "docker/env/postgres-development.env",
        image: "postgres:17-alpine",
        dbType: "postgresql",
    },
    {
        compose: "docker-compose.mariadb.yaml",
        driverEnv: "docker/env/mariadb.env",
        setupEnv: "docker/env/mariadb-production.env",
        image: "mariadb:11",
        dbType: "mariadb",
    },
    {
        compose: "docker-compose.mariadb.dev.yaml",
        driverEnv: "docker/env/mariadb.env",
        setupEnv: "docker/env/mariadb-development.env",
        image: "mariadb:11",
        dbType: "mariadb",
    },
];

test("Docker database profiles select one driver and its setup env", async () => {
    for (const profile of profiles) {
        const [compose, driverEnv] = await Promise.all([
            readFile(profile.compose, "utf8"),
            readFile(profile.driverEnv, "utf8"),
        ]);
        assert.match(compose, new RegExp(`image: ${profile.image}`));
        assert.ok(compose.includes(`- ${profile.driverEnv}`));
        assert.ok(compose.includes(`- ${profile.setupEnv}`));
        assert.ok(driverEnv.includes(`DB_TYPE=${profile.dbType}`));
    }
});

test("Docker Compose files do not interpolate database pool settings", async () => {
    const composeFiles = await Promise.all(
        profiles.map(({ compose }) => readFile(compose, "utf8")),
    );
    for (const compose of composeFiles) {
        assert.doesNotMatch(compose, /\$\{(?:POSTGRES|MARIADB)_POOL_/);
    }
});
