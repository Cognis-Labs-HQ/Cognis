# Toast-Stile wiederherstellen

**Feature-Zweig:** feature-toast-stylesheet-retry

## Benachrichtigungsstile laden

Toast-Stile teilen sich je Ladezyklus höchstens zwei Versuche von jeweils fünf Sekunden. Fehlgeschlagene Versuche geben Listener und eigene Links frei; spätere Hinweise können es erneut versuchen. Vorhandene Stylesheets bleiben beim ursprünglichen Eigentümer. Geschlossene Toasts öffnen sich nach dem Laden nicht erneut.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/e068a20145073fe89a45ca127d0ecd5de8605023
