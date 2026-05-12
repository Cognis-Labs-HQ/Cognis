# Student Class Membership & Teacher Class Management

## Summary

Adds a student-facing My Classes page at `/my-classes` for viewing enrolled classes, requesting to join available classes, and leaving classes. Enhances the teacher's Classes page with language filtering, per-class student management, student search, and the ability to invite students and approve or reject join requests.

## Changed Files / Components

- `src/adapters/study/classes/store.ts` — Added `class_memberships` table schema and store methods for student enrollment flows
- `src/adapters/study/classes/routes.ts` — Added student and teacher class management API endpoints
- `src/adapters/study/classes/index.ts` — Added `/my-classes` page route; wired `accountExists` capability
- `src/adapters/study/classes/ui/my-classes.html` — New student page HTML
- `src/adapters/study/classes/ui/my-classes.js` — New student page JavaScript
- `src/adapters/study/classes/ui/app.js` — Enhanced teacher view with language filter and student management
- `src/adapters/study/classes/ui/classes.css` — Added styles for new UI elements
- `src/gateways/study/ui/classes-dashboard-element.js` — Added student dashboard element
- `src/ui/languages/*/strings.xml` — Added new i18n strings (all 4 languages)
- `src/adapters/study/classes/package.json` — Bumped to 1.2.0
- `src/docs/versions.en.md` — Updated component version

## Commits

See branch `copilot/create-student-page-view` for commit history.
