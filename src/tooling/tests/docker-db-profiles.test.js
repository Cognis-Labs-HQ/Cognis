import assert from "node:assert/strict";
import { execFile } from "node:child_process";
import { existsSync } from "node:fs";
import {
    mkdtemp,
    mkdir,
    readFile,
    readlink,
    rm,
    writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

test("Docker profiles isolate application and web environments", async () => {
    for (const [composePath, image] of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, new RegExp(`image: ${image}`));
        assert.match(compose, /- \.\/docker\/env\/runtime\.env/);
        assert.match(compose, /cognis-web:[\s\S]*env_file:[\s\S]*web\.env/);
        const webService = compose.split(/\n    cognis-web:/)[1];
        assert.doesNotMatch(webService, /runtime\.env/);
        assert.match(compose, /dockerfile: \.\/docker\/Dockerfile/);
        assert.doesNotMatch(
            compose,
            /development\.env|production\.env|\.example/,
        );
    }
});

test(
    "setup creates a private MariaDB runtime environment",
    bashTestOptions,
    async (context) => {
        const temporaryRoot = await mkdtemp(join(tmpdir(), "cognis-setup-"));
        context.after(() =>
            rm(temporaryRoot, { recursive: true, force: true }),
        );
        await mkdir(join(temporaryRoot, "docker", "env"), { recursive: true });
        await writeFile(
            join(temporaryRoot, "setup.sh"),
            await readFile("setup.sh", "utf8"),
            { mode: 0o755 },
        );
        await execFileAsync(bashPath, [
            "-c",
            `printf 'development\\nmariadb\\ndb\\n3306\\ncognis\\ncognis\\ncognis\\nhttps://cognis.example.com\\nadmin@example.com\\nno\\n\\n\\n' | "${bashPath}" "$1"`,
            "setup-test",
            join(temporaryRoot, "setup.sh"),
        ]);

        const runtime = await readFile(
            join(temporaryRoot, "docker", "env", "runtime.env"),
            "utf8",
        );
        const web = await readFile(
            join(temporaryRoot, "docker", "env", "cognis-web.env"),
            "utf8",
        );
        assert.match(runtime, /^NODE_ENV=development$/m);
        assert.match(runtime, /^DB_TYPE=mariadb$/m);
        assert.match(runtime, /^MARIADB_PASSWORD=\S+$/m);
        assert.match(runtime, /^DATA_ENCRYPTION_KEY=\S+$/m);
        assert.match(runtime, /^HOST=cognis$/m);
        assert.match(
            runtime,
            /^EXTERNAL_HOST=https:\/\/cognis\.example\.com$/m,
        );
        assert.match(runtime, /^CONTACT_EMAIL=admin@example\.com$/m);
        assert.doesNotMatch(runtime, /^COGNIS_WEB_/m);
        assert.match(web, /^COGNIS_WEB_TLS_MODE=terminate$/m);
        assert.match(
            web,
            /^COGNIS_WEB_TLS_CERTIFICATE=\/etc\/nginx\/tls\/fullchain\.pem$/m,
        );
        assert.match(
            web,
            /^COGNIS_WEB_TLS_CERTIFICATE_KEY=\/etc\/nginx\/tls\/privkey\.pem$/m,
        );
        assert.doesNotMatch(web, /DATA_ENCRYPTION_KEY|PASSWORD/);
        assert.equal(
            await readlink(join(temporaryRoot, "docker-compose.yaml")),
            "docker-compose.mariadb.yaml",
        );
    },
);

test("web entrypoint only requires certificates when terminating TLS", async () => {
    const source = await readFile("docker/cognis-web/entrypoint.sh", "utf8");

    assert.match(source, /COGNIS_WEB_TLS_MODE:-terminate/);
    assert.match(source, /COGNIS_WEB_TLS_CERTIFICATE/);
    assert.match(source, /COGNIS_WEB_TLS_CERTIFICATE_KEY/);
    assert.match(source, /if \[ "\$mode" = "terminate" \]/);
    assert.match(
        source,
        /Set COGNIS_WEB_TLS_MODE=deferred when HTTPS terminates at an upstream reverse proxy or CDN/,
    );
    assert.doesNotMatch(
        source,
        /DEFERRED[\\s\\S]*ssl_certificate/,
        "deferred mode must not render ssl_certificate directives",
    );
    assert.equal(
        source.match(
            /add_header Cache-Control "public, max-age=31536000, immutable";/g,
        )?.length,
        2,
    );
    assert.doesNotMatch(
        source,
        /add_header Cache-Control "public, max-age=31536000, immutable" always;/,
        "nginx must not mark upstream error responses as immutable",
    );
});

test("web proxy refreshes the application container address", async () => {
    const nginxSource = await readFile("docker/cognis-web/nginx.conf", "utf8");
    const entrypointSource = await readFile(
        "docker/cognis-web/entrypoint.sh",
        "utf8",
    );

    assert.match(entrypointSource, /nameserver.*\/etc\/resolv\.conf/);
    assert.match(entrypointSource, /00-resolver\.conf/);
    assert.doesNotMatch(entrypointSource, /127\.0\.0\.11/);
    assert.match(nginxSource, /upstream cognis_app \{\s*zone cognis_app 64k;/);
    assert.match(nginxSource, /server cognis:3000 resolve;/);
});

test(
    "Docker entrypoint constructs URLs from generated values",
    bashTestOptions,
    async () => {
        const runs = [
            {
                DB_TYPE: "postgresql",
                POSTGRES_HOST: "db",
                POSTGRES_PORT: "5432",
                POSTGRES_DB: "cognis",
                POSTGRES_USER: "cognis@example.com",
                POSTGRES_PASSWORD: "secret:/%#",
                expected:
                    "postgresql://cognis%40example.com:secret%3A%2F%25%23@db:5432/cognis",
            },
            {
                DB_TYPE: "mariadb",
                MARIADB_HOST: "db",
                MARIADB_PORT: "3306",
                MARIADB_DATABASE: "cognis",
                MARIADB_USER: "cognis@example.com",
                MARIADB_PASSWORD: "secret:/%#",
                expected:
                    "mysql://cognis%40example.com:secret%3A%2F%25%23@db:3306/cognis",
            },
        ];
        for (const { expected, ...environment } of runs) {
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
                        ...process.env,
                        ...environment,
                        HOST: "cognis",
                        EXTERNAL_HOST: "https://cognis.example.com",
                        CONTACT_EMAIL: "admin@example.com",
                        DATA_ENCRYPTION_KEY: "test-key",
                        LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                    },
                },
            );
            assert.ok(stdout.startsWith(expected));
        }
    },
);

test(
    "Docker entrypoint identifies missing container environment values",
    bashTestOptions,
    async () => {
        await assert.rejects(
            execFileAsync(
                bashPath,
                ["docker/entrypoint.sh", process.execPath],
                {
                    env: {
                        ...process.env,
                        DB_TYPE: "postgresql",
                        HOST: "cognis",
                        EXTERNAL_HOST: "https://cognis.example.com",
                        CONTACT_EMAIL: "admin@example.com",
                        DATA_ENCRYPTION_KEY: "test-key",
                        LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                    },
                },
            ),
            (error) => {
                assert.match(
                    error.stdout,
                    /POSTGRES_HOST must be set in the container environment/,
                );
                return true;
            },
        );
    },
);

test(
    "Docker entrypoint accepts an injected DATABASE_URL without env files",
    bashTestOptions,
    async () => {
        const databaseUrl = "mysql://cognis:secret@database:3306/cognis";
        const { stdout } = await execFileAsync(
            bashPath,
            [
                "docker/entrypoint.sh",
                bashPath,
                "-c",
                'printf "%s|%s" "$DATABASE_URL" "$DB_TYPE"',
            ],
            {
                env: {
                    HOST: "cognis",
                    EXTERNAL_HOST: "https://cognis.example.com",
                    CONTACT_EMAIL: "admin@example.com",
                    DATA_ENCRYPTION_KEY: "test-key",
                    DATABASE_URL: databaseUrl,
                    LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                    PATH: process.env.PATH,
                },
            },
        );

        assert.ok(stdout.startsWith(`${databaseUrl}|mariadb`));
    },
);

test(
    "Docker entrypoint owns image paths and requires public settings",
    bashTestOptions,
    async () => {
        await assert.rejects(
            execFileAsync(
                bashPath,
                ["docker/entrypoint.sh", process.execPath],
                {
                    env: {
                        ...process.env,
                        DB_TYPE: "postgresql",
                        DATA_ENCRYPTION_KEY: "test-key",
                        LOG_FILE: "/tmp/cognis-docker-profile-test.log",
                    },
                },
            ),
            (error) => {
                assert.match(
                    error.stdout,
                    /HOST must be set in the container environment/,
                );
                return true;
            },
        );

        const environment = {
            ...process.env,
            HOST: "cognis",
            EXTERNAL_HOST: "https://cognis.example.com",
            CONTACT_EMAIL: "admin@example.com",
            DATA_ENCRYPTION_KEY: "test-key",
            DB_TYPE: "postgresql",
            POSTGRES_HOST: "db",
            POSTGRES_PORT: "5432",
            POSTGRES_DB: "cognis",
            POSTGRES_USER: "cognis",
            POSTGRES_PASSWORD: "secret",
            COGNIS_MODULES_ROOT: "/overridden",
            LOG_FILE: "/tmp/cognis-docker-profile-test.log",
        };
        const { stdout } = await execFileAsync(
            bashPath,
            [
                "docker/entrypoint.sh",
                bashPath,
                "-c",
                'printf "%s" "$COGNIS_MODULES_ROOT"',
            ],
            { env: environment },
        );
        assert.ok(stdout.startsWith("/app/dist/server/src/modules"));
    },
);

test("default Docker links select shared defaults and PostgreSQL", async () => {
    const dockerfile = await readFile("docker/Dockerfile", "utf8");
    const defaultEnvironment = await readFile("docker/env/default.env", "utf8");
    assert.match(
        dockerfile,
        /ENV COGNIS_ASSET_VERSION=\$\{COGNIS_ASSET_VERSION\}/,
    );
    assert.doesNotMatch(defaultEnvironment, /^COGNIS_ASSET_VERSION=/m);
    assert.equal(await readlink(".env"), "docker/env/default.env");
    assert.equal(
        await readlink("docker-compose.yaml"),
        "docker-compose.postgres.yaml",
    );
});
