# Schnellerer Einstellungsstart

**Feature-Zweig:** perf-settings-read-startup

## Unabhängige Abfragen überlappen

Die Einstellungen laden Kontopräferenzen, Editorbestätigung und Einrichtungsstatus gleichzeitig. Nach der Weiterleitungsprüfung werden Bereichsdeskriptoren und Sprachdaten parallel geladen. Jeder Seitenaufbau fragt aktuelle Daten ab; es gibt keinen neuen Cache für Präferenzen oder private Antworten.

## Sprach- und Einrichtungsregeln

Gespeicherte Sprachpräferenzen gelten vor dem Laden der Sprachdaten. Erforderliche Einrichtungsweiterleitungen erfolgen vor Bereichsabfragen und Darstellung. Verhaltenstests führen die tatsächliche Initialisierung mit expliziten Abhängigkeitsverträgen aus und prüfen wiederholte Kontowechsel.

## Commits

- [e3009a41720815529c21c9e7c041e4653c8f5df9](https://github.com/Cognis-Labs-HQ/Cognis/commit/e3009a41720815529c21c9e7c041e4653c8f5df9)
