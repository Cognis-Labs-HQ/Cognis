# Komponentenwiederherstellung

**Feature-Zweig:** feature-component-recovery

## Fehler isolieren

Browserkataloge ermitteln Anbieterzugehörigkeit und installierte Version aus Hostregistrierungen. Bei einem Fehler verliert eine optionale Komponente ihre teilweisen Fähigkeiten, Abläufe und Listener; andere Komponenten werden weiter geladen. Eine ausdrückliche Aktualisierung oder neue Revision erlaubt einen erneuten Versuch. Erforderliche Hostkomponenten behalten ihren bestehenden Schutz. Externe Module bleiben immer optional: Modulmanifeste können Cognis weder global sperren noch eine erforderliche Hostabhängigkeit erzeugen.

Unerwartete Serverausnahmen werden dem registrierten Eigentümer zugeordnet. Erwartete Eingabefehler und ungültiges JSON zählen nicht. Drei unterschiedliche, von Administratoren beobachtete Fehler innerhalb von fünf Minuten lösen die normale authentifizierte Deaktivierung aus. Meldungen werden dedupliziert, im Speicher begrenzt und nach installierter Version getrennt. Andere Nutzer können keine globale Deaktivierung auslösen. Zähler werden beim Neustart oder nach Ablauf des Zeitfensters zurückgesetzt. Reparieren oder aktualisieren Sie eine deaktivierte Komponente vor dem erneuten Aktivieren.

## Verwaltungsoperationen

`component:info`, `component:release-channel get|set|list`, `component:upgrade`, Aktivieren und Deaktivieren unterstützen einzelne Ziele und `--all`, optional nach Typ oder Adapter-Gateway gefiltert. Benannte `component:*`-Abläufe verwenden den API-eigenen Vertrag `component:management` in Version eins und vorhandene authentifizierte Verwaltungsrouten. Bestehende erforderliche oder gesperrte Hostkomponenten und Abhängigkeitsprüfungen bleiben maßgeblich. Serialisierte Änderungen lesen den Zustand nach dem Erwerb ihrer Sperre erneut. Fehlerhafte Adapterkataloge bleiben am Gateway und als fehlgeschlagene Ermittlung in passenden Sammelergebnissen sichtbar. Andere Komponenten und das Deaktivieren dieses optionalen Gateways funktionieren weiterhin. Berechtigungsfehler brechen die Operation ab.

## Kanäle und Aktualisierungen

Verfügbare Kanäle stammen aus Marketplace-Zweigen und Veröffentlichungen. Die Auswahl wird atomar in `config/component-channels.json` gespeichert. Aktualisierungen behalten vorhandene Berechtigungs-, Integritäts-, Installations- und Abhängigkeitsprüfungen bei. Zuvor aktive Module werden vorübergehend deaktiviert. Nach fehlgeschlagener Installation versucht die Wiederherstellung eine geprüfte Aktivierung mit der vom Aufrufer gegebenen Haftungsausschlussbestätigung. Unklare Installationen bleiben nach Zeitüberschreitung deaktiviert. Erfolgreiche Aktualisierungen melden nötige Neustarts. Mitgelieferte Gateways, Adapter und Kernmodule werden mit dem Host aktualisiert, bieten keine eigenen Kanäle und werden bei Sammelaktualisierungen übersprungen. Konfigurationsänderungen und Repository-Importe bleiben einzeln.

## Laufzeitkennung

Die Adapterermittlung behält kanonische Manifestkennungen für Abhängigkeiten und erfasst gesonderte Laufzeitkennungen für Anbieter. Die Social-Anbieter profile, messages und call behalten dadurch ihre installierten Versionen und ihren optionalen Status trotz des Präfixes `social-` in ihren Manifestkennungen.

## CLI-Ausgabe und Fortschritt

Alle CLI-Befehle geben standardmäßig kurze, verständliche Ergebnisse aus. Listen zeigen höchstens zwanzig Einträge; große Felder und verschachtelte Daten werden zusammengefasst. Lebenszyklusergebnisse nennen jedes Ziel, Erfolg, Überspringen oder Fehler, installierte Version und nötigen Neustart. Leere Ergebnisse werden ausdrücklich genannt. `-v` oder `--verbose` vor oder nach dem Befehlsnamen zeigt die vollständige Antwort, auch bei registrierten Gateway-, Adapter- und Modulbefehlen. Ein wörtliches Argument, das einem globalen Schalter entspricht, folgt auf `--`.

`-v` bedeutet jetzt ausführliche Ausgabe; `--version` zeigt die CLI-Version. Skripte lesen strukturierte Antworten aus stdout. Fortschritt erscheint auf stderr, beginnt bei der Befehlsausführung und nennt bei längeren Vorgängen die verstrichene Zeit. Modulaktualisierungen übertragen zusätzlich tatsächliche Zustände für Auswahl, vorübergehendes Deaktivieren, Installation, Warten, Wiederherstellung und Ergebnis. Es werden keine erfundenen Downloadprozente angezeigt. Ältere Server mit reiner JSON-Antwort unterstützen weiterhin die Zeitanzeige. Unterbrochene Übertragungen führen zu einem Fehler mit dem Hinweis, vor einem erneuten Versuch den Komponentenzustand zu prüfen. Sammelfehler behalten in beiden Ausgabemodi einen Fehlerstatus.

```sh
cognisctl component:upgrade module study-language-en
cognisctl component:upgrade module --all -v
cognisctl -v component:info module study-language-en
cognisctl --version
```

## Unveränderte Zustände

Statusmeldungen verwenden normale Satzschreibung und behalten Komponentenkennungen bei. Aktivieren und Deaktivieren überspringen bereits passende Zustände. Vor dem Deaktivieren oder Installieren vergleicht Aktualisieren den installierten Commit mit dem gewählten Katalogzweig oder Release. Gleiche Versionsnummern bedeuten nicht zwingend gleichen Code. Ohne ausdrückliche Auswahl bleibt der installierte Kanal erhalten. Aktualisieren Sie den Marketplace-Katalog, um neue Quellrevisionen zu entdecken. Fehlende Revisionsangaben erfordern `--force`, statt blind neu zu installieren. `--force` wiederholt Aktivieren, Deaktivieren oder Aktualisieren, auch mit `--all`; Berechtigungs-, Integritäts-, Abhängigkeits- und erforderliche Hostprüfungen bleiben bestehen.

```sh
cognisctl component:upgrade module analytics --force
cognisctl component:disable module analytics --force
```

## Anleitungssteuerung Und Texte

Enthält die überarbeitete Anleitungssammlung des übergeordneten Zweigs: 55 Anleitungen mit 167 Schritten, darunter 22 Administratoranleitungen. Erklärende Schritte sperren Hover und Aktivierung, das Dashboard nutzt die echte Suche und Schrittgruppen geben vorübergehende Oberflächen beim Fortfahren oder frühen Abschluss frei. Die bestehenden Regeln für Ansichtsfenster, Broadcasts, Navigation und Seitenbereitschaft bleiben erhalten.

## Commits

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Komponentenfehler isolieren und Lebenszyklusbefehle ergänzen.
- [29290416b](https://github.com/Cognis-Labs-HQ/Cognis/commit/29290416bcdb5709d9074fee5c43a7c653eccc6d) — Kurze CLI-Ausgaben, ausführlichen Modus und Aktualisierungsfortschritt ergänzen.
- [5f5201043](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f5201043c021b8587a959533c0b8cc10b0ee05a) — Reviewfehler beheben und externe Module optional halten.
- [833155c20](https://github.com/Cognis-Labs-HQ/Cognis/commit/833155c20f324a22737d834a8e73aa264ee4b3e5) — Unnötige Komponentenaktionen ohne Zwang überspringen und CLI-Schreibweise vereinheitlichen.
- [b4409b89c](https://github.com/Cognis-Labs-HQ/Cognis/commit/b4409b89c29fec24ba2e5246f216e3d1e6f9de9a) — Tutorial-Ansicht und Hostversion synchronisieren.
- [66080c8dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/66080c8dd041974b6a2f9cf0c9aa7d6a49cc27bb) — Bereitschaft für Start-Popups aus dem Tutorial-Zweig übernehmen.
- [acbbf4781](https://github.com/Cognis-Labs-HQ/Cognis/commit/acbbf4781c42eeca29623be59bd3d4f951e62706)
- [fe0e6366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe0e6366ee681f493f018a06c8f65cd9a0360b0a)
