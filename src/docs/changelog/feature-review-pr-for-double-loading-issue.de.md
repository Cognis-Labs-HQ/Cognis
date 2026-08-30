# Zuverlässige Modulnavigation

## Module werden bei SPA-Navigation nicht mehr erneut eingebunden

Die Modulseite verwendet jetzt die gemeinsame Schutzfunktion für direkte Seitenaufrufe. Beim Laden über den Dashboard-Router wird dadurch keine zweite Einbindung mehr ausgelöst, die Navigationskomponenten dupliziert und die anschließende SPA-Navigation stört.

## Seitenstile werden bei der Navigation isoliert

Der Dashboard-Router erkennt jetzt seiteneigene Stile aus direkten Seitenaufrufen und entfernt die Stile der vorherigen Seite, bevor die Zielseite eingebunden wird. Beim Wechsel von Meetings zu Nachrichten bleiben dadurch keine meeting-spezifischen Schaltflächenregeln zurück, die Seitenleisten des Seiten-Composers verzerren.

## Navigationssteuerelemente erscheinen direkt gestaltet

Nachrichten lädt jetzt jedes Unterhaltungs-Stylesheet vor dem Einbinden, anstatt eine Kette von CSS-Importen zu verwenden. Dadurch blitzen Unterhaltungsavatare nicht mehr in ihrer ungestalteten Größe auf. Das Benachrichtigungs-Plug-in wartet ebenfalls auf sein Stylesheet, bevor es die Glocke in die Navigationsleiste einfügt.
