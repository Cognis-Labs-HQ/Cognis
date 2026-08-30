# Zuverlässige Modulnavigation

## Module werden bei SPA-Navigation nicht mehr erneut eingebunden

Die Modulseite verwendet jetzt die gemeinsame Schutzfunktion für direkte Seitenaufrufe. Beim Laden über den Dashboard-Router wird dadurch keine zweite Einbindung mehr ausgelöst, die Navigationskomponenten dupliziert und die anschließende SPA-Navigation stört.
