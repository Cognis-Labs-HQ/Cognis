# DevOps Component

## Purpose

CI/CD and containerization setup for regression testing and release image delivery.

## Container

- `Dockerfile` builds a runnable Node 22 image.
- Container runs `npm run start` and serves API on port `3000`.

## GitHub Actions

- `.github/workflows/ci.yml`: runs install, typecheck, and tests on push/PR.
- `.github/workflows/docker.yml`: on release publish or manual dispatch, builds and pushes image to GHCR (`ghcr.io/<owner>/cognis`).

## GitLab CI

- `.gitlab-ci.yml` includes:
    - `test` stage on branch/tag commits.
    - `docker-build` stage for tag releases and manual web-triggered pipelines.
- Docker image target: `registry.gitlab.firehawk-systems.com/firehawk/cognis`.
