# Zuverlässige Modulnavigation

**Feature-Zweig:** feature-review-pr-for-double-loading-issue

## Module werden bei SPA-Navigation nicht mehr erneut eingebunden

Die Modulseite verwendet jetzt die gemeinsame Schutzfunktion für direkte Seitenaufrufe. Beim Laden über den Dashboard-Router wird dadurch keine zweite Einbindung mehr ausgelöst, die Navigationskomponenten dupliziert und die anschließende SPA-Navigation stört.

## Seitenstile werden bei der Navigation isoliert

Der Dashboard-Router erkennt jetzt seiteneigene Stile aus direkten Seitenaufrufen und entfernt die Stile der vorherigen Seite, bevor die Zielseite eingebunden wird. Beim Wechsel von Meetings zu Nachrichten bleiben dadurch keine meeting-spezifischen Schaltflächenregeln zurück, die Seitenleisten des Seiten-Composers verzerren.

## Navigationssteuerelemente erscheinen direkt gestaltet

Nachrichten lädt jetzt jedes Unterhaltungs-Stylesheet vor dem Einbinden, anstatt eine Kette von CSS-Importen zu verwenden. Dadurch blitzen Unterhaltungsavatare nicht mehr in ihrer ungestalteten Größe auf. Das Benachrichtigungs-Plug-in wartet ebenfalls auf sein Stylesheet, bevor es die Glocke in die Navigationsleiste einfügt.

## Änderungen

- [4506d46](https://github.com/Cognis-Labs-HQ/Cognis/commit/4506d46a613a8bb643d65a4ca5e6e0821c5f43fb)
- [63976d1](https://github.com/Cognis-Labs-HQ/Cognis/commit/63976d1f112ff39eed1565d36fed8ae0500ad51b)
- [14c1e2f](https://github.com/Cognis-Labs-HQ/Cognis/commit/14c1e2fcb3904d92709a38a8cb13ca8fe7ed2a10)
- [e6fbb62](https://github.com/Cognis-Labs-HQ/Cognis/commit/e6fbb62939f204ab29eec66842a1705ff26c7800)
- [77207d0](https://github.com/Cognis-Labs-HQ/Cognis/commit/77207d05b3bf404ecfccf24ed4a9a4c8a6319ffb)
- [5ccdca8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5ccdca846f9696e63dbe7b0871c110d5fd7c5d51)
- [609c964](https://github.com/Cognis-Labs-HQ/Cognis/commit/609c9640c24cbbf5d66703fbe41832cf2c9ba962)
- [035ad2a](https://github.com/Cognis-Labs-HQ/Cognis/commit/035ad2ad52ee11911478e758e9138d78dcd581a3)
