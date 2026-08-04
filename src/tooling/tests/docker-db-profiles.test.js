import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { readFile, readlink } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);

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
        assert.ok(compose.includes(`- ./${profile.driverEnv}`));
        assert.ok(compose.includes(`- ./${profile.setupEnv}`));
        assert.ok(driverEnv.includes(`DB_TYPE=${profile.dbType}`));
        assert.match(compose, /dockerfile: \.\/docker\/Dockerfile/);
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

test("Docker entrypoint constructs URLs from engine profile values", async () => {
    const runs = [
        {
            environment: {
                DB_TYPE: "postgresql",
                POSTGRES_HOST: "db",
                POSTGRES_PORT: "5432",
                POSTGRES_DB: "cognis",
                POSTGRES_USER: "cognis",
                POSTGRES_PASSWORD: "secret",
            },
            expectedUrl: "postgresql://cognis:secret@db:5432/cognis",
        },
        {
            environment: {
                DB_TYPE: "mariadb",
                MARIADB_HOST: "db",
                MARIADB_PORT: "3306",
                MARIADB_DATABASE: "cognis",
                MARIADB_USER: "cognis",
                MARIADB_PASSWORD: "secret",
            },
            expectedUrl: "mysql://cognis:secret@db:3306/cognis",
        },
    ];
    for (const run of runs) {
        const { stdout } = await execFileAsync(
            "bash",
            [
                "docker/entrypoint.sh",
                "bash",
                "-c",
                'printf "%s" "$DATABASE_URL"',
            ],
            {
                env: {
                    ...process.env,
                    ...run.environment,
                    NODE_ENV: "development",
                    DATA_ENCRYPTION_KEY: "development-only",
                    LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                },
            },
        );
        assert.ok(stdout.startsWith(run.expectedUrl));
    }
});

test("Docker entrypoint identifies the profile for missing values", async () => {
    await assert.rejects(
        execFileAsync("bash", ["docker/entrypoint.sh", "true"], {
            env: {
                ...process.env,
                DB_TYPE: "postgresql",
                NODE_ENV: "development",
                POSTGRES_HOST: "db",
                POSTGRES_PORT: "5432",
                POSTGRES_DB: "cognis",
                POSTGRES_PASSWORD: "secret",
                LOG_FILE: "/tmp/cognis-docker-profile-test.log",
            },
        }),
        (error) => {
            assert.match(
                error.stdout,
                /POSTGRES_USER must be set in docker\/env\/postgres\.env/,
            );
            return true;
        },
    );
});

test("production entrypoint identifies the shared secret profile", async () => {
    await assert.rejects(
        execFileAsync("bash", ["docker/entrypoint.sh", "true"], {
            env: {
                ...process.env,
                DB_TYPE: "postgresql",
                NODE_ENV: "production",
                DATA_ENCRYPTION_KEY: "",
                LOG_FILE: "/tmp/cognis-docker-profile-test.log",
            },
        }),
        (error) => {
            assert.match(
                error.stdout,
                /DATA_ENCRYPTION_KEY must be set in docker\/env\/production\.env/,
            );
            return true;
        },
    );
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

test("production setup templates declare every user-managed secret", async () => {
    const [sharedTemplate, postgresTemplate, mariaDbTemplate] =
        await Promise.all([
            readFile("docker/env/production.env.example", "utf8"),
            readFile("docker/env/postgres-production.env.example", "utf8"),
            readFile("docker/env/mariadb-production.env.example", "utf8"),
        ]);
    assert.match(sharedTemplate, /^DATA_ENCRYPTION_KEY=/m);
    assert.match(postgresTemplate, /^POSTGRES_PASSWORD=/m);
    assert.match(mariaDbTemplate, /^MARIADB_PASSWORD=/m);
    assert.match(mariaDbTemplate, /^MARIADB_ROOT_PASSWORD=/m);
});
