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
    ["docker-compose.postgres.yaml", "postgres:17-alpine"],
    ["docker-compose.mariadb.yaml", "mariadb:11"],
];

test("Docker profiles use native environment injection", async () => {
    for (const [composePath, databaseImage] of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, new RegExp(`image: ${databaseImage}`));
        assert.match(compose, /DATABASE_URL: \$\{DATABASE_URL\}/);
        assert.match(compose, /DATA_ENCRYPTION_KEY: \$\{DATA_ENCRYPTION_KEY\}/);
        assert.doesNotMatch(compose, /env_file:|setup\.sh|docker\/env\//);
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
});

test(
    "application entrypoint compiles split database settings",
    bashTestOptions,
    async () => {
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
                    DB_TYPE: "postgresql",
                    POSTGRES_HOST: "db",
                    POSTGRES_PORT: "5432",
                    POSTGRES_DB: "cognis",
                    POSTGRES_USER: "cognis@example.com",
                    POSTGRES_PASSWORD: "secret:/%#",
                    LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                    PATH: process.env.PATH,
                },
            },
        );

        assert.ok(
            stdout.includes(
                "postgresql://cognis%40example.com:secret%3A%2F%25%23@db:5432/cognis",
            ),
        );
    },
);

test("web profile uses the generic nginx image and native template", async () => {
    const template = await readFile(
        "docker/cognis-web/default.conf.template",
        "utf8",
    );
    for (const [composePath] of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, /cognis-web:[\s\S]*image: nginx:stable-alpine/);
        assert.match(
            compose,
            /default\.conf\.template:\/etc\/nginx\/templates\/default\.conf\.template:ro/,
        );
        assert.doesNotMatch(compose, /dockerfile:.*cognis-web|"443:443"/);
    }
    assert.match(template, /proxy_pass http:\/\/\$\{HOST\}:3000;/);
    assert.match(template, /max-age=31536000, immutable/);
});
