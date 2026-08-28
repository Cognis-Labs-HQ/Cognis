# Toast-Symbole im Hellen Modus

**Feature Branch:** copilot/add-toast-markings-support

## Zusammenfassung

Fehler behoben, bei dem Toast-Symbole (Fehler ✕, Erfolg ✓, Warnung ⚠, Info ℹ) im hellen Modus unsichtbar waren. Im hellen Modus lösen die Variablen `--color-danger-text` und `--color-success-text` zu `#fff` (Weiß auf weißem Hintergrund) auf, wodurch die Markierungen verschwinden. Neue Überschreibungsregeln für den hellen Modus verwenden die Outline-Text-Tokens, damit Symbole deutlich sichtbar bleiben.

## Geänderte Dateien / Komponenten

- `src/ui/styles/reuse/toast.css` — `body[data-theme="light"]`-Regeln hinzugefügt, die Symbolfarben für Fehler-, Erfolgs- und Warnungs-Toast-Varianten überschreiben.
- `src/ui/styles/reuse/theme.css` — `--color-danger-outline-text` und `--color-success-outline-text` zu `:root` hinzugefügt (Dunkel-Modus-Werte), damit die Tokens immer definiert sind.

## Commit-Links

- [1305bfc](https://github.com/Cognis-Labs-HQ/Cognis/commit/1305bfc163422709964268baafe8b0036c7b5c10)
