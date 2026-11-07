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

Enthält die verfeinerte Dashboard-Anleitung mit 18 Schritten: Bewusste Klickübungen öffnen Benachrichtigungen und Kontomenü, während Hover und andere Aktionen gesperrt bleiben. Die Anleitung erklärt Seitenaktionsleiste, Sprache, Darstellung und Layout. Die gemeinsame elementgebundene Lebensdauer schließt nur die passende Oberfläche beim Gruppenende; fehlende Bedienelemente werden auch beim ersten Besuch gemäß Skip-Regel ausgelassen. Der Katalog umfasst 55 Anleitungen mit 175 Schritten, darunter 22 Administratoranleitungen.

## Tutorial-Wiederherstellung und Ziele

Tutorial neu starten bleibt die Wiederherstellungsaktion; einen Wiederholungsbutton gibt es nicht mehr. Einführende UI-Schritte heben ihre Bereiche hervor, auch leere Jitsi-Besprechungslisten und Teilnehmer finden. Lernanbieter verwenden veröffentlichte Study-Sprachziele und das öffentliche Arbeitsbereichsziel. `highlightNext` bleibt für Erklärungen aktiv und für ereignisgesteuerte Schritte deaktiviert.

## Warteschlange für schwebende Menüs

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

## Weiter-Hinweis nur mit Animation

Der Hinweis für Weiter/Fertig verwendet nur die pulsierende Animation ohne dauerhafte Umrandung. Reduzierte Bewegung deaktiviert die Animation; der normale Tastaturfokus bleibt sichtbar.

## Genaue Tutorial-Ziele

Sprechblasen behalten sichtbare Dock-Steuerelemente unterhalb des reservierten Menübereichs als Anker und meiden das tatsächliche Aktionsmenü. Der Wiederholungsschritt hebt den ?-Button selbst hervor. Dieser behält während Tutorials die Textfarbe des Themes; die Wiederholung ersetzt keine laufende Anleitung.

## Abschluss bleibt nach Updates erhalten

Der Abschluss gehört zum stabilen Konto- und Anbieter/Tutorial-Bezeichner. Inhalts- und Paketupdates setzen ihn nie zurück. Eine abgeschlossene Anleitung wird nur über das ? im Seitenkopf erneut gestartet. Bezeichner bei Überarbeitungen beibehalten; der Abschluss bleibt im Browserspeicher des Kontos.

## Commits

- [27dbfaaac](https://github.com/Cognis-Labs-HQ/Cognis/commit/27dbfaaac48ada61ec79bcfb61bc7b630103a2f1) — Komponentenfehler isolieren und Lebenszyklusbefehle ergänzen.
- [29290416b](https://github.com/Cognis-Labs-HQ/Cognis/commit/29290416bcdb5709d9074fee5c43a7c653eccc6d) — Kurze CLI-Ausgaben, ausführlichen Modus und Aktualisierungsfortschritt ergänzen.
- [5f5201043](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f5201043c021b8587a959533c0b8cc10b0ee05a) — Reviewfehler beheben und externe Module optional halten.
- [833155c20](https://github.com/Cognis-Labs-HQ/Cognis/commit/833155c20f324a22737d834a8e73aa264ee4b3e5) — Unnötige Komponentenaktionen ohne Zwang überspringen und CLI-Schreibweise vereinheitlichen.
- [b4409b89c](https://github.com/Cognis-Labs-HQ/Cognis/commit/b4409b89c29fec24ba2e5246f216e3d1e6f9de9a) — Tutorial-Ansicht und Hostversion synchronisieren.
- [66080c8dd](https://github.com/Cognis-Labs-HQ/Cognis/commit/66080c8dd041974b6a2f9cf0c9aa7d6a49cc27bb) — Bereitschaft für Start-Popups aus dem Tutorial-Zweig übernehmen.
- [acbbf4781](https://github.com/Cognis-Labs-HQ/Cognis/commit/acbbf4781c42eeca29623be59bd3d4f951e62706)
- [fe0e6366e](https://github.com/Cognis-Labs-HQ/Cognis/commit/fe0e6366ee681f493f018a06c8f65cd9a0360b0a)
- [41ad3cfb8](https://github.com/Cognis-Labs-HQ/Cognis/commit/41ad3cfb81333d5ba6970b696d679689a07e987e)
- [7e36ab051](https://github.com/Cognis-Labs-HQ/Cognis/commit/7e36ab0513a43eb2cd62483ca7d2b461fd9989a7)
- [cd556b79d](https://github.com/Cognis-Labs-HQ/Cognis/commit/cd556b79daded5f84a1df77b32cfdb7a98e4f60a)

Wiederherstellungs-Toasts verwenden den maßgeblichen Anzeigenamen des Manifests und gegebenenfalls dessen Übersetzungskatalog. Der Name wird als unveränderter Text eingesetzt. Metadaten zum Anbieterbesitz enthalten optional `name` und `stringsBaseUrl`. Betriebsfehler und automatische Deaktivierungen verwenden `minRole: "admin"` und erscheinen nur für Administratoren und Eigentümer; normale Benachrichtigungen behalten ihre Zielgruppe. Der Stack enthält außerdem bedingte Tutorialpfade, rollenabhängigen Fortschritt, Neustart, aktuelle Dock-Geometrie und Vorrang für Banneraktionen.

- [72f2c6d69](https://github.com/Cognis-Labs-HQ/Cognis/commit/72f2c6d69731a5b4ae4ebe911917af2becc52ac1)

Der Tutorial-Stack korrigiert die Hervorhebung des Sucheingabefelds über Kopfzeilen, setzt nach jedem Filter-Klick fort und zeigt für manuelle Schritte einen pulsierenden Weiter/Fertig-Hinweis mit Unterstützung reduzierter Bewegung.

- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c7547)

Der Tutorial-Stack verwendet jetzt das optionale boolesche Feld `highlightNext` pro Schritt mit Standardwert false. Bestehende Erklärungen aktivieren es; automatische Übungen deaktivieren es. Die Beitragsrichtlinien für Host und Module verlangen nutzerorientierte Tutorial-Abdeckung und deren Prüfung bei UI-Änderungen.

- [2b00ca977](https://github.com/Cognis-Labs-HQ/Cognis/commit/2b00ca9777b0c50e528698221a25341a740390f7)

Der Tutorial-Stack führt Zurück jetzt zum Einstieg abgeschlossener Gruppen oder Abhängigkeitszweige. Aktionsbezogene Hervorhebungen verwenden auf ausdrücklichen Wunsch den ersten sichtbaren, nutzbaren Treffer im deklarierten Abschnitt; standardmäßig bleibt die Zuordnung eindeutig. Komponenten hebt einen bearbeitbaren Schalter hervor und überspringt den Schritt, wenn keiner verfügbar ist. Die Inhaltsprüfung präzisierte 34 Ziele im Host und den Begleitmodulen.

- [b55cabbc0](https://github.com/Cognis-Labs-HQ/Cognis/commit/b55cabbc0af004f4a0fe80310684a0ebb90bf4ee)
- [7ca378e73](https://github.com/Cognis-Labs-HQ/Cognis/commit/7ca378e7344f489fd43fd081eb6ffbf69160c471)
- [69982a176](https://github.com/Cognis-Labs-HQ/Cognis/commit/69982a1763e33a63ed0418046e82ba43846ad33a)

## Wiederholungen beenden

Wiederholungen verwenden Überspringen als einzigen Beenden-Button. Der redundante Abbrechen-Button entfällt.

- [94ba80e35](https://github.com/Cognis-Labs-HQ/Cognis/commit/94ba80e357759320f4389e0fe20ec05afa1d0cfc)

## Isolierte Einstellungsanleitung

Der Schrift-Schritt verwendet eigene Texte aus dem Host-Katalog. Optionale Klassenübersetzungen sind für die Registrierung der Einstellungsanleitungen nicht mehr nötig. Komponenten dokumentieren ihre Abdeckung selbst.

## Einheitliche Katalogeinrückung

Die im Tutorial-PR geänderten XML-Kataloge verwenden zwei Leerzeichen für String-Einträge. Übersetzungswerte bleiben erhalten; die Schrift-Texte wechseln in allen vier Sprachen von Klassen zu Einstellungen.

## Bereitschaft beim Dokumentverlauf

Zurück und Vorwärts innerhalb von Dokumentation oder Änderungsverlauf erhalten die Bereitschaft der eingebundenen Seite. Ein tatsächlicher Seitenwechsel oder das Ende der Seitenlebensdauer macht sie weiterhin ungültig; interner Dokumentverlauf startet keine Prüfungen erneut.

- [fafd56ed4](https://github.com/Cognis-Labs-HQ/Cognis/commit/fafd56ed47d5594683481f6a1e13a2aa3c151d2f)

## Tutorial-Menüaktionen

Tutorial neu starten ist im ersten sichtbaren Schritt verborgen. Wiederholungen verbergen Überspringen im letzten sichtbaren Schritt und bieten Fertig an. Ein einteiliger Guide hat weder Tutorial neu starten noch Überspringen. Die redundante Gesamtübersicht entfällt; die Abdeckung bleibt bei der jeweiligen Komponente.

- [155ea17b1](https://github.com/Cognis-Labs-HQ/Cognis/commit/155ea17b1e84273dbbd1008e56bfbfa399ec39b7)
