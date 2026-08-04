import assert from "node:assert/strict";
import { readFile, readlink } from "node:fs/promises";
import test from "node:test";

const profiles = [
    {
        compose: "docker-compose.postgres.yaml",
        driverEnv: "docker/env/postgres.env",
        setupEnv: "docker/env/postgres-production.env",
        image: "postgres:17-alpine",
        dbType: "postgresql",
        url: "postgresql://${POSTGRES_USER:?POSTGRES_USER must be set}:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}@${POSTGRES_HOST:?POSTGRES_HOST must be set}:${POSTGRES_PORT:?POSTGRES_PORT must be set}/${POSTGRES_DB:?POSTGRES_DB must be set}",
    },
    {
        compose: "docker-compose.postgres.dev.yaml",
        driverEnv: "docker/env/postgres.env",
        setupEnv: "docker/env/postgres-development.env",
        image: "postgres:17-alpine",
        dbType: "postgresql",
        url: "postgresql://${POSTGRES_USER:?POSTGRES_USER must be set}:${POSTGRES_PASSWORD:?POSTGRES_PASSWORD must be set}@${POSTGRES_HOST:?POSTGRES_HOST must be set}:${POSTGRES_PORT:?POSTGRES_PORT must be set}/${POSTGRES_DB:?POSTGRES_DB must be set}",
    },
    {
        compose: "docker-compose.mariadb.yaml",
        driverEnv: "docker/env/mariadb.env",
        setupEnv: "docker/env/mariadb-production.env",
        image: "mariadb:11",
        dbType: "mariadb",
        url: "mysql://${MARIADB_USER:?MARIADB_USER must be set}:${MARIADB_PASSWORD:?MARIADB_PASSWORD must be set}@${MARIADB_HOST:?MARIADB_HOST must be set}:${MARIADB_PORT:?MARIADB_PORT must be set}/${MARIADB_DATABASE:?MARIADB_DATABASE must be set}",
    },
    {
        compose: "docker-compose.mariadb.dev.yaml",
        driverEnv: "docker/env/mariadb.env",
        setupEnv: "docker/env/mariadb-development.env",
        image: "mariadb:11",
        dbType: "mariadb",
        url: "mysql://${MARIADB_USER:?MARIADB_USER must be set}:${MARIADB_PASSWORD:?MARIADB_PASSWORD must be set}@${MARIADB_HOST:?MARIADB_HOST must be set}:${MARIADB_PORT:?MARIADB_PORT must be set}/${MARIADB_DATABASE:?MARIADB_DATABASE must be set}",
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

test("Docker database profiles construct URLs from required engine settings", async () => {
    for (const profile of profiles) {
        const compose = await readFile(profile.compose, "utf8");
        assert.ok(compose.includes(`DATABASE_URL: ${profile.url}`));
    }
});

test("production database profiles reject missing secrets", async () => {
    const postgresCompose = await readFile(
        "docker-compose.postgres.yaml",
        "utf8",
    );
    const mariaDbCompose = await readFile(
        "docker-compose.mariadb.yaml",
        "utf8",
    );

    for (const requiredVariable of [
        "POSTGRES_PASSWORD",
        "DATA_ENCRYPTION_KEY",
    ]) {
        assert.ok(
            postgresCompose.includes(
                `\${${requiredVariable}:?${requiredVariable} must be set}`,
            ),
        );
    }
    for (const requiredVariable of [
        "MARIADB_PASSWORD",
        "MARIADB_ROOT_PASSWORD",
        "DATA_ENCRYPTION_KEY",
    ]) {
        assert.ok(
            mariaDbCompose.includes(
                `\${${requiredVariable}:?${requiredVariable} must be set}`,
            ),
        );
    }
});

test("default Docker links select shared defaults and PostgreSQL", async () => {
    assert.equal(await readlink(".env"), "docker/env/default.env");
    assert.equal(
        await readlink("docker-compose.yaml"),
        "docker-compose.postgres.yaml",
    );
});

test("database driver defaults stay inside their engine profiles", async () => {
    const [sharedDefaults, postgresDefaults, mariaDbDefaults] =
        await Promise.all([
            readFile("docker/env/default.env", "utf8"),
            readFile("docker/env/postgres.env", "utf8"),
            readFile("docker/env/mariadb.env", "utf8"),
        ]);
    const readKeys = (contents) =>
        new Set(
            contents
                .split("\n")
                .filter(Boolean)
                .map((line) => line.slice(0, line.indexOf("="))),
        );
    const sharedKeys = readKeys(sharedDefaults);
    const postgresKeys = readKeys(postgresDefaults);
    const mariaDbKeys = readKeys(mariaDbDefaults);

    assert.ok([...postgresKeys].every((key) => !sharedKeys.has(key)));
    assert.ok([...mariaDbKeys].every((key) => !sharedKeys.has(key)));
    assert.ok(postgresKeys.has("POSTGRES_POOL_MAX"));
    assert.ok(mariaDbKeys.has("MARIADB_POOL_MAX"));
});
