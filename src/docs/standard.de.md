# Beitragsstandard

Cognis-Komponenten verwenden vorhersehbare Verzeichnisse, öffentliche ctx-Verträge und lokalisierte Dokumentation, damit Beiträge keine Kopplung an fremde Implementierungen erzeugen.

## Anwendungsbeispiele

Erstellen Sie externe Module aus [cognis-module-template](https://github.com/Cognis-Labs-HQ/cognis-module-template). Vergeben Sie eine eigene Produkt-UUID, ersetzen Sie Vorlagenmetadaten und behalten Sie Beitragsregeln und Prüfwerkzeuge. Jitsi Meet ist die Referenzintegration für die folgenden Struktur- und Lebenszyklusverträge.

```sh
npm --prefix <module-checkout> test
cognisctl modules:jitsi-meet:ping
```

## Technische Spezifikation

### Komponenteneigentum

Kernverträge liegen in `src/core/`, Gateways in `src/gateways/<id>/`, Adapter in `src/adapters/<gateway>/<id>/` und externe Module in eigenen Repositorys. Jede Komponente besitzt Servercode, Browserressourcen, CLI, Dokumentation und Bereinigung. Importe bleiben innerhalb der Komponente; fremdes Verhalten wird über ctx-Fähigkeiten und benannte, gestufte Flows bezogen. Optionale Anbieter müssen entfernbar sein, ohne Verbraucher zu beschädigen.

### Verbindliche Modulstruktur

Die folgenden Pfade sind für angebotene Funktionen verbindlich. Legen Sie keine leeren Verzeichnisse für nicht unterstützte Funktionen an. `manifest.json`, `package.json`, `routes.json` und `bootstrap.js` sind im Stamm erforderlich. Bootstrap verbindet Abhängigkeiten und registriert Verhalten; Domänenhandler validieren und koordinieren, Stores und Fähigkeiten führen Arbeit aus. Ein deklariertes `ui/index.html` darf als Seitengerüst dienen. Bestehende Routen-URLs bleiben beim Umordnen stabil.

| Pfad                                              | Verantwortung                |
| ------------------------------------------------- | ---------------------------- |
| `api/routes/<domain>/index.js`                    | HTTP                         |
| `api/<feature>/`, `api/reuse/`                    | Server                       |
| `ui/app/<page>/index.js`, `ui/<feature>/`         | Browser                      |
| `ui/styles/`, `ui/styles/reuse/`                  | CSS                          |
| `ui/templates/`                                   | HTML                         |
| `ui/languages/<locale>/strings.xml`               | i18n                         |
| `api/tests/`, `ui/tests/`, `cli/tests/`, `tests/` | Tests                        |
| `cli/index.js`                                    | CLI                          |
| `docs/`, `docs/changelog/`                        | Markdown                     |
| `data/`, `assets/`, `scripts/`, `tooling/`        | Daten, Ressourcen, Werkzeuge |

### Wiederverwendung und Prüfungen

`reuse/` enthält nur Abstraktionen, die mehrere Funktionen derselben Schicht verwenden. Funktionscode bleibt bei seiner Funktion; Dateinamen innerhalb von Domänenverzeichnissen sind allgemein. Keine Verzeichnisse `shared/`, `utils/`, `helpers/` oder `common/` erstellen. Lesbare Abstände und höchstens 1000 Quellzeilen beibehalten. Strukturprüfungen weisen falsch platzierte Styles und flache Routendateien zurück; Vertragstests prüfen Berechtigungen, Rücknahme bei Fehlern, wiederholtes Mounten und Aktivierungszyklen. Npm-Skripte gelten für den Checkout: `npm --prefix <module-checkout> test`. Installierte Betriebsbefehle verwenden `cognisctl modules:<module-id>:<action>`.

### Dokumentationsvertrag

Jedes Integrationsdokument beginnt mit einer H1 von höchstens 30 Zeichen und einem erklärenden Absatz. Die erste H2 enthält konkrete Anwendungsbeispiele öffentlicher Verträge; die nächste H2 beginnt die technische Spezifikation. `.github/DOCUMENTATION_TEMPLATE.<locale>.md` beachten. H3-Abschnitte beschreiben Eingaben, Ausgaben, Prüfung, Rechte, Fehler, Zustandsänderungen, Speicherung, Sicherheit, Erweiterungsstufen und Bereinigung. Erforderliche Fähigkeiten, optionale Abhängigkeiten, unterstützte Versionen und Fehlerverhalten dokumentieren. Standarddokumente beschreiben den aktuellen Vertrag, keine Release-Chronik.

### Lokalisierung und Integrität

Deutsche, englische, indonesische und japanische Varianten müssen Struktur und Bedeutung teilen und echte Übersetzungen enthalten. Integrationsübersichten liegen in `docs/index.<locale>.md`, Detailverträge daneben. Release-Notizen liegen in `docs/changelog/` beziehungsweise `src/docs/changelog/` im Kern: ein viersprachiger Satz je PR mit direkt aufeinanderfolgenden Commit-Links. Release-Notizen, Symlinks, Aliasse und das Manifest selbst werden nicht gehasht. Paket, Lockfile, Manifest und getestete Abhängigkeitsgrenzen synchronisieren; Hashes nach der letzten ausgelieferten Änderung erneuern und prüfen.
