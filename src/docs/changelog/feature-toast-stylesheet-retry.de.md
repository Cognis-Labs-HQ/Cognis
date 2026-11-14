# Toast-Stile wiederherstellen

**Feature-Zweig:** feature-toast-stylesheet-retry

## Benachrichtigungsstile laden

Toast-Stile teilen sich je Ladezyklus höchstens zwei Versuche von jeweils fünf Sekunden. Fehlgeschlagene Versuche geben Listener und eigene Links frei; spätere Hinweise können es erneut versuchen. Vorhandene Stylesheets bleiben beim ursprünglichen Eigentümer. Geschlossene Toasts öffnen sich nach dem Laden nicht erneut.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/23d83093e8aceac9cd7caff0559fe0f26bd503d6
