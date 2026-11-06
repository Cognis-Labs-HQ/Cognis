# Geführte Tutorials

**Feature Branch:** feature-guided-tutorials-stacked

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

Der Host verwaltet Darstellung, Barrierefreiheit, Ereignissperren, Zielauflösung und Lebenszyklusbereinigung. Beispiele für Arbeitsbereich und Lernen liegen in ihren zuständigen Komponenten. Externe Module registrieren Abläufe und Ziele über ctx, ohne interne Host-Implementierungen zu importieren. Tests prüfen registrierte Flows, fehlende und ersetzte Ziele, asynchronen Abbruch, Berechtigungen, Anbieter-Rollback und veraltete Handles. Native Chromium-Prüfungen decken Fokus, Scrollen, Zoom, Tastatur- und Berührungssperren, Barrierefreiheitsrollen, reduzierte Bewegung und beide Farbschemata ab.

## Seitenbindung und erster Besuch

Alle Aktionsbuttons stehen in einer eigenen Instanz des gemeinsamen schwebenden Menüs. Erstdurchläufe haben weder Abbrechen noch Überspringen; Escape beendet sie nicht. Weiter bleibt während Zielsuche, asynchroner Arbeit und ereignisgesteuerter Schritte verfügbar, sodass wiederholtes Weiter immer zum Ende führt. Wiederholungen bieten Abbrechen mit `btn-cancel`. Andere Navigation, Verlauf, Konto- oder Berechtigungsverlust, entfernte Anbieter und Pflichtdialoge räumen weiterhin jede Sitzung auf. Anleitungen bestätigen keine Dialoge, senden keine privilegierten Formulare und starten keine Anrufe.

## Komponenteneigene Anleitungen

Seiten übergeben verfasste Beiträge im Composer-Feld `tutorials`. Jeder Beitrag erklärt Besitzer, Definitionen und optional `minRole`; jede Definition liefert Seite, übersetzte Texte und komponenteneigene Selektoren. `scope` beschränkt die Erkennung auf einen sichtbaren Bereich. Der Host veröffentlicht begrenzte Ziele und registriert über `ui:tutorial:mountPage`. Beim Entfernen der Seite werden ihre Anleitungen bereinigt. Optionale Anbieter können `mountTutorialProvider` aus `ui:reuse` verwenden und Übersetzungen sowie Lebenszyklus selbst besitzen.

## Übersetzungsschlüssel

Anleitungsschlüssel behalten die Modul-ID des Manifests als ein Namensraumsegment bei. Allgemeine Bezeichnungen für Navigation und Suche stammen aus dem gemeinsamen Katalog. Fehlgeschlagene Seiteneinrichtung entfernt alle Anleitungen, damit die Seite erneut geladen werden kann.

## Anleitungskataloge

Die Sprachkataloge der Anleitungen werden mit einer Revision ihrer deklarierten Übersetzungsschlüssel geladen, getrennt von früher geladenen Seitenkatalogen. So verhindert ein älterer Katalog im Arbeitsspeicher nicht die Registrierung neuer Anleitungstexte. Unveränderte Anleitungen verwenden den Katalog erneut, auch offline. Fehlende Texte der bevorzugten Sprache werden aus Englisch ergänzt. Fehlen auch englische Schlüssel, schlägt die Registrierung weiterhin fehl und nimmt den Anbieter zurück. Schrittschlüssel benennen ihr Thema statt ihrer Position.

## Sichtbare Hervorhebung

Hervorhebungen verwenden den sichtbaren Schnittbereich des Ziels, seiner abschneidenden oder scrollenden Vorfahren und des sichtbaren Ansichtsfensters. Seitenziele meiden Kopf- und Fußzeile; Anleitungen für diese Bedienelemente nutzen weiterhin deren eigenen Bereich. Bereits sichtbare übergroße Ziele behalten ihre Scrollposition. Hinweisfelder versuchen freie Seiten, bevor sie im sichtbaren Ziel erscheinen; irreführende Pfeile außerhalb des Bildes werden dann ausgeblendet. Die Tutorialsteuerung reserviert eigenen Platz, sodass lange Übersetzungen scrollbar bleiben und keine Navigationsschaltflächen verdecken.

Das unabhängige gemeinsame schwebende Menü behält sein normales Thema, Rahmen, Schaltflächen, Abstände und Hintergrundunschärfe. Es liegt oberhalb der Tutorialabdunklung, ebenso die Auswahl zur Wiederholung am Seitenkopf. Die Abdunklung spart Ziel, schwebende Steuerung und Broadcast-Banner aus; Hinweisfelder halten Abstand zu sichtbaren Bannern. Die Steuerung bleibt in hellen und dunklen Themen im Ansichtsfenster.

## Seitenbereitschaft

Nach `page:mounted` führt der Host `page:ready` mit den Phasen `prepare`, `blocking`, `ready` und `afterReady` aus. Die Darstellung wird abgeschlossen, während die blockierende Phase auf Startaufgaben wartet. Nachgelagerte Anmeldeeinrichtung steht dabei vor den Versionshinweisen. Deren Eigentümer wartet auf Einstellungen, Metadaten und das Schließen des Popups, bevor die Seite bereit gemeldet wird. Ein Abbruch schließt ein veraltetes Popup ohne Lesebestätigung. Automatische Tutorials und Wiederholungen über die Seitenüberschrift bleiben bis zur Bereitschaft zurückgestellt. Navigation verwirft die alte Seite; verspätete Arbeit kann die neue Seite nicht freigeben.

Weitere Popup-Eigentümer können vor dem Seitenaufbau mit `registerPageReadinessBlocker` aus dem gemeinsamen Modul `page-readiness.js` einen Ablaufbeitrag anhängen. Übergeben Sie eine eindeutige Eigentümerkennung `id`, optional `order` und das Eigentümersignal `signal`. Geben Sie ein Promise zurück, das nach Prüfung oder Popup-Abschluss aufgelöst wird. Der Rückruf erhält `input.signal` mit Seiten- und Eigentümerabbruch. Ersetzungen und Bereinigung bleiben lebenszyklussicher. Verbraucher verwenden `ui:pageReadiness.isReady()` oder `afterReady`, um Benachrichtigungen und andere Seitenaktionen zurückzustellen.

## Klare Steuerung Und Texte

Anleitungstexte beschreiben verfügbare Aufgaben und Bedienelemente ohne sachfremde Zusicherungen über Berechtigungen oder nicht ausgeführte Aktionen.

## Geschützte Navigation

Schritte können mit `preventNavigation` auf der aktuellen Seite bleiben, während sie Navigationsbedienelemente erklären. Die Dashboard-Anleitung nutzt dies durchgehend. Linkaktivierung per Zeiger und Tastatur, programmgesteuerte Router-Navigation und vom Router verwaltete Verlaufsschritte beachten die Sperre. Weiter, Zurück und Abschließen bleiben verfügbar; von der Anleitung vorgesehene Routenwechsel sind erlaubt. Die Sperre endet mit dem Schritt oder der Sitzung.

## Aufgabenanleitungen

Die Abdeckung umfasst 55 Anleitungen mit 175 Schritten, darunter 22 Administratoranleitungen. Das Dashboard bietet eine praktische Suchübung: echte Suche öffnen, Suchtext eingeben, Optionen und Treffer prüfen und die Suche vor dem Fortfahren schließen. Erklärende Schritte verhindern versehentliches Hover-Verhalten und Aktivierungen; interaktive Schritte erlauben ihr Ziel ausdrücklich. Kontextanleitungen erscheinen bei sichtbaren Stapeldetails, Übungen oder Moduldetails.

Die Anleitungen behandeln Nachrichtenstart und Vorschau, Raummitglieder, Beitragsvorschau, Kalendernavigation und Terminplanung, Serienänderungen, Freigabefilter und Ablauf, Einladungen, Bibliotheksfilter und Wörterbuchvergleich, Hör- und Schreibübung, Favoriten und Inhaltsanfragen, Stapelerstellung, Übungsrückmeldung, Stapelbearbeitung/Freigabe/Export, Klassenbeitritt, Ranglisten, Schriftwahl, ungespeicherte Änderungen, Versionshinweise, Kontosuche sowie Modulkonfiguration und Lebenszyklus. Formulare und Löschbestätigungen bleiben bewusste komponenteneigene Interaktionen; Anleitungen erklären ihre Einstiegspunkte und weichen erforderlichen Dialogen.

## Dashboard-Menüs Und Aktionen

Die Dashboard-Anleitung hat 18 Schritte und öffnet Benachrichtigungen und Kontomenü bewusst über deren echte Klick-Handler. Klickübungen unterdrücken Hover; Erklärungen zu den Menüs lassen löschende oder navigierende Aktionen inaktiv. Das Kontomenü erklärt Einstellungen, Dokumentation, rollenabhängige Verwaltungslinks und Abmeldung. Die Anleitung behandelt außerdem die Seitenaktionsleiste, Sprachwechsel, Darstellung und Layoutbearbeitung.

Vorübergehende Oberflächen registrieren Element, Schließaktion und Eigentümersignal über `ui:transientSurfaces.register(element, close, signal)`. Eine Anleitung bindet mit `attachLifetime(element, groupSignal)` nur die passende Suche, Benachrichtigungsansicht oder das Kontomenü an die Schrittgruppe. Klicks auf Tutorialaktionen erreichen keine Hintergrund-Handler zum Schließen bei Außenklicks; Menüs bleiben während ihrer Erklärungen offen.

## Commits

- [5f3bad1422cd47085170ba2c5e4d06ca118c05fe](https://github.com/Cognis-Labs-HQ/Cognis/commit/5f3bad1422cd47085170ba2c5e4d06ca118c05fe)
- [a2d973028](https://github.com/Cognis-Labs-HQ/Cognis/commit/a2d973028ba72dcdeb296c1346b9a893ccf7a84b)
- [73d206f](https://github.com/Cognis-Labs-HQ/Cognis/commit/73d206f37913e3cf6d8a7fcf8eed31c383f811f4)
- [9bd2026](https://github.com/Cognis-Labs-HQ/Cognis/commit/9bd2026bf195a4e815b5822f968b94796b99244a)
- [1df4bc6](https://github.com/Cognis-Labs-HQ/Cognis/commit/1df4bc68d8ad108c236caaeb67e09337f9f3d169)
- [0583f247d](https://github.com/Cognis-Labs-HQ/Cognis/commit/0583f247d44676b179a70fe408804b730e73878b) — Übergroße Hervorhebungen sichtbar halten und Tutorialsteuerung hervorheben.
- [ae593b178](https://github.com/Cognis-Labs-HQ/Cognis/commit/ae593b1781496a4985d787b32b647d95fa595547) — Start-Popups vor Tutorials über die Seitenbereitschaft koordinieren.
- [8a845efb1](https://github.com/Cognis-Labs-HQ/Cognis/commit/8a845efb1cb16a1538a80cc456c82482af4a4c0e) — Bereitschaft beim erneuten Aufbau derselben URL nach Abbruch erneuern.
- [e65144a29](https://github.com/Cognis-Labs-HQ/Cognis/commit/e65144a29220e5ecc0b10272bf3739716ca52094)
- [6fd10e6f5](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fd10e6f5b2287cfbe47848a49b749929e0e17c6)
- [7a337d228](https://github.com/Cognis-Labs-HQ/Cognis/commit/7a337d2283f729ae121ef34d4a1becc29c394ec5)
- [a37ebad6c](https://github.com/Cognis-Labs-HQ/Cognis/commit/a37ebad6cbfe54e2e1da28144e3dc7a9ffb4e39c)
- [ce721403b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ce721403ba29d74c71a8056ba58f0a25ea315cf0)

Schrittpfade unterstützen `minRole`, das synchrone boolesche Prädikat `when({ firstTime, completed, skipped })` und `dependsOn: ["earlier-step-id"]`. Nicht berechtigte oder bedingt ausgeschlossene Schritte zählen nicht zum Fortschritt. Abhängigkeiten müssen auf frühere Schritte zeigen; unbekannte, doppelte, eigene und spätere Verweise werden abgewiesen. Interaktive Schritte erfüllen Abhängigkeiten erst nach erfolgreichem Ereignis oder Wartezustand. Weiter überspringt sonst den abhängigen Zweig; statische Schritte werden durch Weiter erfüllt. Bedingungen erhalten unveränderliche Ergebnislisten. Die Gesamtzahl zeigt den aktuell verfügbaren Pfad und kann nach Interaktionen wachsen. Zurück setzt Ergebnisse ab dem Ziel zurück. `restart()` und Tutorial neu starten setzen alle Ergebnisse zurück und schließen temporäre Oberflächen innerhalb derselben Sitzung. Suche, Benachrichtigungen und Kontomenü erfordern das Öffnen des jeweiligen Steuerelements. Verwaltung verlangt `minRole: "admin"`; optionale Dock-Steuerelemente werden nach Sichtbarkeit gefiltert. Die Hervorhebung folgt den tatsächlichen Dock-Grenzen auch unterhalb der Fußzeilengrenze; Erklärungskarten behalten ihren reservierten Ansichtsbereich.

Banneraktionen bleiben per Schaltfläche, Link und Tastatur nutzbar. Sie beenden die Anleitung über `ui:tutorial:priority`, bevor eigene Dialoge oder Navigation beginnen. Banneraktionen sind per Tab erreichbar.

`showToast(message, { minRole: "admin" })` beschränkt Betriebsinformationen auf Administratoren und Eigentümer. Andere oder unbekannte Rollen erzeugen weder Toast-DOM noch Timer oder Schließ-Callbacks. Ohne `minRole` bleibt normales Feedback für alle sichtbar. Diese Anzeigeoption ersetzt keine serverseitige Berechtigung.

- [f681187ca](https://github.com/Cognis-Labs-HQ/Cognis/commit/f681187ca572fa4270f9b398d429a3d1177c62d3)

Suchschritte in Overlays verwenden deren Ansichtsbereich, damit Kopf- und Fußzeilen die Hervorhebung des Eingabefelds nicht abschneiden. Jede Filter-Schaltfläche beendet die Filterübung. Schritte, die Weiter oder Fertig benötigen, heben die Aktion mit einer pulsierenden Umrandung hervor; bei reduzierter Bewegung bleibt sie statisch. Wartende und automatisch fortschreitende Schritte zeigen diesen Hinweis nicht.

- [09b9c7547](https://github.com/Cognis-Labs-HQ/Cognis/commit/09b9c754784d85d080a675615e35f01281ee6c4b)

Jeder Tutorial-Schritt legt `highlightNext` ausdrücklich fest: Erklärungen, die Weiter oder Fertig benötigen, aktivieren den Hinweis; interaktive und wartebasierte Übungen deaktivieren ihn. Bei reduzierter Bewegung bleibt eine statische Umrandung. Alle bestehenden Anleitungen wurden darauf geprüft, einschließlich Suchergebnissen und Benachrichtigungen.

Alle UI-Komponenten benötigen eine Anleitung. Die Beitragsrichtlinien verlangen nutzerorientierte Aufgabenabläufe und eine Prüfung bestehender Anleitungen bei neuen Funktionen oder geänderter Bedienung.

- [f578b8115](https://github.com/Cognis-Labs-HQ/Cognis/commit/f578b8115e452d8afae8ef21dbbd86dd5756eceb)

Zurück von außerhalb einer abgeschlossenen Schrittgruppe oder eines Abhängigkeitszweigs führt zu dessen Einstieg und setzt die Ergebnisse zurück. Innerhalb eines Zweigs bleibt Zurück schrittweise. So wird ein geschlossener Suchdialog nicht erneut aufgerufen und automatisch übersprungen.

Seitenschritte können mit `targetMatch: "first"` den ersten sichtbaren, nutzbaren Treffer im deklarierten Abschnitt wählen. Standardmäßig ist weiterhin ein eindeutiger Treffer erforderlich. Fehlende oder deaktivierte Ziele folgen der festgelegten Überspringregel. Aktionsbezogene Hervorhebungen zeigen jetzt auf bearbeitbare Schalter, Rollenfelder, Speicherquoten, Benachrichtigungstests, Freigaben, Datensätze und Modulaktionen. Komponenten verwendet einen bearbeitbaren sichtbaren Schalter; notwendige und versteckte Steuerelemente sind ausgeschlossen.

- [c7eefff5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/c7eefff5ad35c79574c1067ee97032cc6a76045a)

## Sichtbare Tutorial-Ziele und Wiederherstellung

Tutorial neu starten bleibt die Wiederherstellungsaktion; einen Wiederholungsbutton gibt es nicht mehr. Einführende UI-Schritte heben ihre Bereiche hervor, auch leere Jitsi-Besprechungslisten und Teilnehmer finden. Lernanbieter verwenden veröffentlichte Study-Sprachziele und das öffentliche Arbeitsbereichsziel. `highlightNext` bleibt für Erklärungen aktiv und für ereignisgesteuerte Schritte deaktiviert.

## Gemeinsame Warteschlange für schwebende Menüs

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

- [ddf8e825b](https://github.com/Cognis-Labs-HQ/Cognis/commit/ddf8e825b565329c8b676de10ff4d411c133b6e1)
- [90fffbcb7](https://github.com/Cognis-Labs-HQ/Cognis/commit/90fffbcb7ff0a12417bf470febee6bfc05c30990)

## Weiter-Hinweis nur mit Animation

Der Hinweis für Weiter/Fertig verwendet nur die pulsierende Animation ohne dauerhafte Umrandung. Reduzierte Bewegung deaktiviert die Animation; der normale Tastaturfokus bleibt sichtbar.

## Genaue Tutorial-Ziele

Sprechblasen behalten sichtbare Dock-Steuerelemente unterhalb des reservierten Menübereichs als Anker und meiden das tatsächliche Aktionsmenü. Der Wiederholungsschritt hebt den ?-Button selbst hervor. Dieser behält während Tutorials die Textfarbe des Themes; die Wiederholung ersetzt keine laufende Anleitung.

## Abschluss bleibt nach Updates erhalten

Der Abschluss gehört zum stabilen Konto- und Anbieter/Tutorial-Bezeichner. Inhalts- und Paketupdates setzen ihn nie zurück. Eine abgeschlossene Anleitung wird nur über das ? im Seitenkopf erneut gestartet. Bezeichner bei Überarbeitungen beibehalten; der Abschluss bleibt im Browserspeicher des Kontos. Jede erfolgreich abgeschlossene Sitzung speichert den Abschluss vor der erneuten Seitenerkennung, auch beim direkten Start über das öffentliche Anbieter-Handle.

- [7f62e2fa8](https://github.com/Cognis-Labs-HQ/Cognis/commit/7f62e2fa80bc97b99acd51a6f5334c04bd350cb5)
