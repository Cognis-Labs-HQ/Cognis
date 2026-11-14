# Geteiltes Scrolling stabil

**Feature-Zweig:** feature-refactor-scroll-handling-for-overflow-pages

## Dokument-Scrollmodus im Page Composer

Der Page Composer unterstützt nun einen Dokument-Scrollmodus für geteilte Layouts, die verschachtelte vertikale Scrollbereiche vermeiden sollen. Seiten können ihn aktivieren, wenn ihr Inhalt natürlich mit der Browserseite wachsen soll, während vorhandene scrollbare Werkzeugleisten für lange Navigationsmenüs erhalten bleiben.

## Scrollverhalten der Lizenzseite bereinigt

Die Lizenzseite überlässt den Lizenztext jetzt dem Hauptscroll der Seite, statt Scrollleisten für Seite, Karte und Inhaltsbereich zu stapeln. Das Navigationsmenü bleibt separat scrollbar und sticky, wodurch lange Rechtstexte konsistenter lesbar und navigierbar sind.

## Änderungen

- [f3b64ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3b64ca116345d58e4240401d000eb9d83fadcb8)
