# Zuverlässige Modulnavigation

## Module werden bei SPA-Navigation nicht mehr erneut eingebunden

Die Modulseite verwendet jetzt die gemeinsame Schutzfunktion für direkte Seitenaufrufe. Beim Laden über den Dashboard-Router wird dadurch keine zweite Einbindung mehr ausgelöst, die Navigationskomponenten dupliziert und die anschließende SPA-Navigation stört.

## Seitenstile werden bei der Navigation isoliert

Der Dashboard-Router erkennt jetzt seiteneigene Stile aus direkten Seitenaufrufen und entfernt die Stile der vorherigen Seite, bevor die Zielseite eingebunden wird. Beim Wechsel von Meetings zu Nachrichten bleiben dadurch keine meeting-spezifischen Schaltflächenregeln zurück, die Seitenleisten des Seiten-Composers verzerren.
