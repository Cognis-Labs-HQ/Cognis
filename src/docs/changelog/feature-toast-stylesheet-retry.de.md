# Toast-Stile wiederherstellen

**Feature-Zweig:** feature-toast-stylesheet-retry

## Benachrichtigungsstile laden

Toast-Stile teilen sich je Ladezyklus höchstens zwei Versuche von jeweils fünf Sekunden. Fehlgeschlagene Versuche geben Listener und eigene Links frei; spätere Hinweise können es erneut versuchen. Vorhandene Stylesheets bleiben beim ursprünglichen Eigentümer. Geschlossene Toasts öffnen sich nach dem Laden nicht erneut.

## Commits

- [1399f21112283fa17986070cd7e4962711634797](https://github.com/Cognis-Labs-HQ/Cognis/commit/1399f21112283fa17986070cd7e4962711634797)
