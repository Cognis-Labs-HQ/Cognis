import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import { readFile, readlink } from "node:fs/promises";
import test from "node:test";
import { promisify } from "node:util";

const execFileAsync = promisify(execFile);
const bashPath = [process.env.BASH, "/bin/bash", "/usr/bin/bash"].find(
    (candidatePath) =>
        candidatePath?.startsWith("/") && existsSync(candidatePath),
);
const bashTestOptions = bashPath
    ? {}
    : { skip: "Bash is not installed in this test environment" };
const profiles = [
    {
        composePath: "docker-compose.postgres.yaml",
        databaseImage: "postgres:17-alpine",
        databaseEnvironment: {
            DB_TYPE: "postgresql",
            POSTGRES_HOST: "db",
            POSTGRES_PORT: "5432",
            POSTGRES_DB: "cognis",
            POSTGRES_USER: "cognis@example.com",
            POSTGRES_PASSWORD: "secret:/%#",
        },
        expectedDatabaseUrl:
            "postgresql://cognis%40example.com:secret%3A%2F%25%23@db:5432/cognis",
        composeVariables: [
            "POSTGRES_HOST: db",
            'POSTGRES_PORT: "5432"',
            "POSTGRES_DB: cognis",
            "POSTGRES_USER: cognis",
            "POSTGRES_PASSWORD: ${POSTGRES_PASSWORD}",
        ],
    },
    {
        composePath: "docker-compose.mariadb.yaml",
        databaseImage: "mariadb:11",
        databaseEnvironment: {
            DB_TYPE: "mariadb",
            MARIADB_HOST: "db",
            MARIADB_PORT: "3306",
            MARIADB_DATABASE: "cognis",
            MARIADB_USER: "cognis@example.com",
            MARIADB_PASSWORD: "secret:/%#",
        },
        expectedDatabaseUrl:
            "mysql://cognis%40example.com:secret%3A%2F%25%23@db:3306/cognis",
        composeVariables: [
            "MARIADB_HOST: db",
            'MARIADB_PORT: "3306"',
            "MARIADB_DATABASE: cognis",
            "MARIADB_USER: cognis",
            "MARIADB_PASSWORD: ${MARIADB_PASSWORD}",
        ],
    },
];

test("Docker profiles use native environment injection", async () => {
    for (const { composePath, databaseImage, composeVariables } of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, new RegExp(`image: ${databaseImage}`));
        assert.match(compose, /DATA_ENCRYPTION_KEY: \$\{DATA_ENCRYPTION_KEY\}/);
        for (const composeVariable of composeVariables) {
            assert.ok(compose.includes(composeVariable));
        }
    }
    assert.equal(
        await readlink("docker-compose.yaml"),
        "docker-compose.postgres.yaml",
    );
});

test("application image excludes sensitive environment defaults", async () => {
    const dockerfile = await readFile("docker/Dockerfile", "utf8");

    assert.doesNotMatch(dockerfile, /\bDATABASE_URL=/);
    assert.doesNotMatch(dockerfile, /\bDATA_ENCRYPTION_KEY=/);
    assert.match(dockerfile, /\bCOGNIS_UI_DIST_ROOT=/);
    assert.match(dockerfile, /npm ci --ignore-scripts --include=dev/);
    assert.match(dockerfile, /npm prune --ignore-scripts --omit=dev/);
});

test(
    "application entrypoint compiles split database settings",
    bashTestOptions,
    async () => {
        for (const { databaseEnvironment, expectedDatabaseUrl } of profiles) {
            const { stdout } = await execFileAsync(
                bashPath,
                [
                    "docker/entrypoint.sh",
                    bashPath,
                    "-c",
                    'printf "%s" "$DATABASE_URL"',
                ],
                {
                    env: {
                        ...databaseEnvironment,
                        LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                        PATH: process.env.PATH,
                    },
                },
            );
            assert.ok(stdout.includes(expectedDatabaseUrl));
        }
    },
);

test("web profile uses the generic nginx image and native template", async () => {
    const template = await readFile(
        "docker/cognis-web/default.conf.template",
        "utf8",
    );
    for (const { composePath } of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, /cognis-web:[\s\S]*image: nginx:stable-alpine/);
        assert.match(
            compose,
            /default\.conf\.template:\/etc\/nginx\/templates\/default\.conf\.template:ro/,
        );
        assert.doesNotMatch(compose, /dockerfile:.*cognis-web|"443:443"/);
    }
    assert.match(template, /location \^~ \/assets\/ \{/);
    assert.equal(
        template.match(/proxy_pass http:\/\/\$\{HOST\}:3000;/g)?.length,
        3,
    );
    assert.match(template, /max-age=31536000, immutable/);
});
