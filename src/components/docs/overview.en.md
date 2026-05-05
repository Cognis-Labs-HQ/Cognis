# Cognis Overview

Cognis is a modular language-study platform for independent learners, teachers, and communities. It combines open-source real-time collaboration technologies (including Jitsi-based session workflows) with structured learning content, so teams can deliver scalable language learning experiences across different formats.

## What it includes today

- **Language-learning foundation** with modular content architecture that supports self-study and instructor-guided learning.
- **Real-time collaboration support** designed to integrate open-source communication tooling such as Jitsi for live study sessions.
- **Social learning capabilities** including public profiles, microblog-style posting, achievements, and direct messaging.
- **API layer** for auth, preferences, docs, user operations, system routes, and module extension points.
- **Core domain services** that define provider-agnostic contracts and policy boundaries.
- **Adapters** for storage/auth integrations (memory, sqlite, postgres, mariadb, ldap, saml, oidc, etc).
- **UI app** for study workflows, administration, modules, and embedded documentation.

## Key concepts

- **Modular content system** allows curriculum or activity units to be composed and scaled for different language goals.
- **Gateway-first architecture** keeps domain behavior portable across infrastructure backends. Gateways are the sole owners of their API routes, adapters, UI contributions, tests, and docs. The core never imports gateway code directly.
- **UIRegistry** lets gateways inject admin panels, static assets, and per-page UI elements at runtime without core knowing which gateways are present.
- **Auto-discovered adapters** — each gateway scans `src/adapters/<gateway-id>/` at startup and loads all adapters found there without core involvement.
- **Cross-gateway dependency declarations** — gateways declare `requires` in their `manifest.json`; startup validates that all declared dependencies are registered.
- **Role-aware workflows** support solo learning, teacher-led instruction, and community participation.
- **Lightweight social layer** increases retention through identity, progress signals, and learner-to-learner communication.

## Typical local workflow

1. Start services locally.
2. Open the Cognis web app.
3. Sign in and explore learning, module, and account surfaces.
4. Use docs to review architecture, component responsibilities, and extension patterns.
