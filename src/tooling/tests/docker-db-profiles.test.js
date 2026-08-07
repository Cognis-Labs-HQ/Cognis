import assert from "node:assert/strict";
import { readFile, readlink } from "node:fs/promises";
import test from "node:test";

const profiles = [
    ["docker-compose.postgres.yaml", "postgres:17-alpine"],
    ["docker-compose.mariadb.yaml", "mariadb:11"],
];

test("Docker profiles run without generated environment files", async () => {
    for (const [composePath, databaseImage] of profiles) {
        const compose = await readFile(composePath, "utf8");
        assert.match(compose, new RegExp(`image: ${databaseImage}`));
        assert.doesNotMatch(compose, /env_file:|setup\.sh|docker\/env\//);
        assert.match(compose, /cognis-web:[\s\S]*- "80:80"[\s\S]*- "443:443"/);
    }
    assert.equal(
        await readlink("docker-compose.yaml"),
        "docker-compose.postgres.yaml",
    );
});

test("application image owns runnable defaults and a minimal entrypoint", async () => {
    const dockerfile = await readFile("docker/Dockerfile", "utf8");
    const entrypoint = await readFile("docker/entrypoint.sh", "utf8");

    for (const variableName of [
        "NODE_ENV",
        "DB_TYPE",
        "DATABASE_URL",
        "HOST",
        "EXTERNAL_HOST",
        "CONTACT_EMAIL",
        "DATA_ENCRYPTION_KEY",
        "COGNIS_UI_DIST_ROOT",
    ]) {
        assert.match(dockerfile, new RegExp(`\\b${variableName}=`));
    }
    assert.equal(entrypoint, '#!/bin/sh\nset -eu\n\nexec "$@"\n');
});

test("web image enables TLS only when certificate files are usable", async () => {
    const dockerfile = await readFile("docker/cognis-web/Dockerfile", "utf8");
    const entrypoint = await readFile(
        "docker/cognis-web/entrypoint.sh",
        "utf8",
    );

    assert.match(
        dockerfile,
        /COGNIS_WEB_TLS_CERTIFICATE=\/etc\/nginx\/tls\/fullchain\.pem/,
    );
    assert.match(
        dockerfile,
        /COGNIS_WEB_TLS_CERTIFICATE_KEY=\/etc\/nginx\/tls\/privkey\.pem/,
    );
    assert.doesNotMatch(entrypoint, /COGNIS_WEB_TLS_MODE/);
    assert.match(entrypoint, /\[ -r "\$tls_certificate_path" \]/);
    assert.match(entrypoint, /\[ -r "\$tls_certificate_key_path" \]/);
});

test("web image builds its upstream from HOST", async () => {
    const nginxSource = await readFile("docker/cognis-web/nginx.conf", "utf8");
    const entrypointSource = await readFile(
        "docker/cognis-web/entrypoint.sh",
        "utf8",
    );

    assert.match(entrypointSource, /upstream_host="\$\{HOST:-\}"/);
    assert.match(entrypointSource, /server %s:3000;/);
    assert.doesNotMatch(nginxSource, /server cognis:3000/);
});
