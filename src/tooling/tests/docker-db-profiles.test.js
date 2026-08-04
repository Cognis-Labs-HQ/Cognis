import assert from "node:assert/strict";
import { execFile } from "node:child_process";
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
const profiles = [
    ["docker-compose.postgres.yaml", "postgres:17-alpine"],
    ["docker-compose.mariadb.yaml", "mariadb:11"],
];

test("Docker database profiles share one generated runtime env", async () => {
    for (const [composePath, image] of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, new RegExp(`image: ${image}`));
        assert.match(compose, /- \.\/docker\/env\/runtime\.env/);
        assert.match(compose, /dockerfile: \.\/docker\/Dockerfile/);
        assert.doesNotMatch(
            compose,
            /development\.env|production\.env|\.example/,
        );
    }
});

test("setup creates a private MariaDB runtime environment", async (context) => {
    const temporaryRoot = await mkdtemp(join(tmpdir(), "cognis-setup-"));
    context.after(() => rm(temporaryRoot, { recursive: true, force: true }));
    await mkdir(join(temporaryRoot, "docker", "env"), { recursive: true });
    await writeFile(
        join(temporaryRoot, "setup.sh"),
        await readFile("setup.sh", "utf8"),
        { mode: 0o755 },
    );
    await execFileAsync("bash", [
        "-c",
        "printf 'development\\nmariadb\\ndb\\n3306\\ncognis\\ncognis\\ncognis\\nhttps://cognis.example.com\\nadmin@example.com\\n\\n\\n' | bash \"$1\"",
        "setup-test",
        join(temporaryRoot, "setup.sh"),
    ]);

    const runtime = await readFile(
        join(temporaryRoot, "docker", "env", "runtime.env"),
        "utf8",
    );
    assert.match(runtime, /^NODE_ENV=development$/m);
    assert.match(runtime, /^DB_TYPE=mariadb$/m);
    assert.match(runtime, /^MARIADB_PASSWORD=\S+$/m);
    assert.match(runtime, /^DATA_ENCRYPTION_KEY=\S+$/m);
    assert.match(runtime, /^HOST=cognis$/m);
    assert.match(runtime, /^EXTERNAL_HOST=https:\/\/cognis\.example\.com$/m);
    assert.match(runtime, /^CONTACT_EMAIL=admin@example\.com$/m);
    assert.equal(
        await readlink(join(temporaryRoot, "docker-compose.yaml")),
        "docker-compose.mariadb.yaml",
    );
});

test("Docker entrypoint constructs URLs from generated values", async () => {
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
});

test("Docker entrypoint directs missing values to setup", async () => {
    await assert.rejects(
        execFileAsync("bash", ["docker/entrypoint.sh", "true"], {
            env: {
                ...process.env,
                DB_TYPE: "postgresql",
                HOST: "cognis",
                EXTERNAL_HOST: "https://cognis.example.com",
                CONTACT_EMAIL: "admin@example.com",
                DATA_ENCRYPTION_KEY: "test-key",
                LOG_FILE: "/tmp/cognis-docker-profile-test.log",
            },
        }),
        (error) => {
            assert.match(
                error.stdout,
                /POSTGRES_HOST must be set in docker\/env\/runtime\.env/,
            );
            return true;
        },
    );
});

test("Docker entrypoint owns image paths and requires public settings", async () => {
    await assert.rejects(
        execFileAsync("bash", ["docker/entrypoint.sh", "true"], {
            env: {
                ...process.env,
                DB_TYPE: "postgresql",
                DATA_ENCRYPTION_KEY: "test-key",
                LOG_FILE: "/tmp/cognis-docker-profile-test.log",
            },
        }),
        (error) => {
            assert.match(
                error.stdout,
                /HOST must be set in docker\/env\/runtime\.env/,
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
        "bash",
        [
            "docker/entrypoint.sh",
            "bash",
            "-c",
            'printf "%s" "$COGNIS_MODULES_ROOT"',
        ],
        { env: environment },
    );
    assert.ok(stdout.startsWith("/app/dist/server/src/modules"));
});

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
