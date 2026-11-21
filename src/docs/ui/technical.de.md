# Technische Referenz

Öffentliche Schnittstellen und Betriebsregeln von UI.

## Schnittstellen

UIRegistry veröffentlicht Ressourcen, Navigationsplugins, Verwaltungsabschnitte und Seitenerweiterungen. Browseranbieter registrieren Fähigkeiten über uiCtx mit eigenem Abbruchsignal; Seiten nutzen Page Composer.

## Konfiguration

Kontoeinstellungen wählen Thema, Sprache und Schrift. Komponentenkataloge liefern Übersetzungen und Metadaten; Layoutoptionen bleiben in Page Composer statt fremder Hüllenregeln.

## Verhalten

Bei der Wiederherstellung der Verbindung werden Übersetzungsspeicher vor dem erneuten Seitenaufbau verworfen. Explizite Aktualisierungen laden aktuelle Serverinhalte und behalten bei Ausfällen vollständige Offlinekopien. Ungültige XML-Antworten werden nicht gespeichert; nachfolgende Ladeversuche können ohne vollständiges Neuladen erfolgreich sein.

### Überblick

`src/ui/` hostet das Cognis-Browser-Frontend. Es stellt die Studieworkflows, sozialen Interaktionsoberflächen, Administrationspanels und den eingebetteten Dokumentationsbrowser bereit. Die UI ist eine server-seitig gerenderte Multi-Page-Anwendung.

Die UI-Schicht hat keine Kenntnis davon, welche Gateways oder Adapter installiert sind. Stattdessen tragen Gateways UI-Elemente zur Laufzeit über die `UIRegistry` und die Page-Extensions-API bei.

Alle benutzersichtbaren Texte gehen durch das i18n-System in `src/ui/reuse/i18n.js`. Kein Text ist in JavaScript oder HTML-Templates fest codiert.

### Verantwortlichkeiten

- Alle Seiten-Einstiegspunkte und zugehörige HTML-Templates hosten.
- Die Layout-Shells bereitstellen, durch die alle Nicht-Login-Seiten gerendert werden.
- Die Reuse-Utilities pflegen für i18n, Page Composer, Unsaved-Changes-Guards.
- Theme-Parität durchsetzen: jedes Element löst seine Farben aus CSS-Variablen auf.
- Die i18n-String-Packs für alle vier erforderlichen Sprachen bereitstellen.

### Verzeichnisstruktur

| Pfad                | Zweck                                               |
| ------------------- | --------------------------------------------------- |
| `src/ui/layouts/`   | Gemeinsame HTML-Shells                              |
| `src/ui/app/`       | Seiten-Einstiegspunkt-JavaScript-Module             |
| `src/ui/reuse/`     | Seitenübergreifende Utility-Module                  |
| `src/ui/styles/`    | CSS: Basis-Tokens, Layout, seitenspezifische Regeln |
| `src/ui/languages/` | i18n-String-Packs (en, de, ja, id)                  |

### UIRegistry

Gateways injizieren Admin-Panels und seitenspezifische UI-Beiträge zur Laufzeit über die `UIRegistry`. Der Endpunkt `GET /api/v1/ui/page-extensions/:pageId` gibt von allen aktivierten Gateways beigetragene Elemente für die benannte Seite zurück.

### i18n-Schlüssel-Konventionen

| Präfix               | Verwendung                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| `ui.reuse.*`         | Labels, die über mehrere Seiten geteilt werden                                |
| `ui.reuse.generic.*` | Kontextfreie eigenständige Aktionswörter (speichern, verwerfen, zurücksetzen) |
| `ui.app.<page>.*`    | Seitenspezifischer Text                                                       |
| `ui.layout.*`        | Layout-Shell-Text und ARIA-Labels                                             |

### Wiederverwendbare Bildvorschau

Die globale Fähigkeit `ui:imagePreview` bietet Vorschaubilder, Ereignisbindung und die Aktion `open` über den registrierten Ablauf `ui:imagePreview:open`. Sie ist außerdem über `ui:reuse` als `image-preview.js` verfügbar; der Anbieter lädt das gemeinsame Stylesheet vor der Veröffentlichung der Steuerelemente. Bildschaltflächen öffnen das Original in natürlicher Größe, begrenzt auf den sichtbaren Bereich, wobei nur das übliche X sichtbar ist. Tastaturbedienung, Escape, Fokusrückkehr und das Schließen beim Entfernen der Ansicht oder des Anbieters nutzen den gemeinsamen Popup-Lebenszyklus. Aufrufer verwalten Bild-URLs und optionale Löschaktionen. Library verwendet dieses Steuerelement für hochgeladene und mitgelieferte Bilder im Editor und in Detailgalerien.

Ein Abbruch durch den Aufrufer oder das Entfernen des Anbieters beendet eine wartende Bildvorschau, ohne auf Übersetzungen oder das Popup-Stylesheet zu warten. Späte Ergebnisse öffnen die abgebrochene Vorschau nicht erneut und zeigen keine zugehörige Fehlermeldung. Andere Aufrufer nutzen die gemeinsame Vorbereitung weiter.

Die öffentliche Aktion open lehnt bei Abbruch mit AbortError ab; bewusstes Schließen wird weiterhin normal abgeschlossen. Der Austausch eines Vorschaubilds bei unverändert aktivem Aufrufersignal erhält die Ansicht des ursprünglichen Bilds. Ohne Aufrufersignal gehört die Ansicht zum Anbieter; unabhängige Routenwechsel schließen sie nicht. Bild-URLs bleiben in der Verantwortung des Aufrufers. Bestehende Library-Tutorialziele und Aktionen bleiben unverändert; der Abbruch fügt keinen Bedienungsschritt hinzu.

Der gemeinsame Bildvorschau-Anbieter lädt sein Stylesheet, bevor er Steuerelemente veröffentlicht. Das reine Bild-Popup entfernt Überschriften und passt Originale im Quer-, Hoch- und Panoramaformat ohne horizontales oder vertikales Scrollen in den sichtbaren Bereich ein. Library-Detailvorschauen behalten ihre Grenzen von 20rem × 18rem; Editor-Vorschaubilder bleiben 8rem × 6rem groß.

### Reaktionsfähige Sitzungsnavigation

Die Abmeldung löscht private Sitzungsdaten, ohne auf die öffentliche Routenpflege des Service-Workers zu warten. Identische Richtlinienanfragen teilen einen Austausch; geänderte Zugriffsentscheidungen bleiben getrennt. Der Sprachschalter wartet auf seinen Kataloganbieter und blendet kontogebundene Steuerelemente nach der Abmeldung aus. Gebündelte und direkt geladene Router teilen Dokumentzustand, Listener und Abbruch laufender Ansichten, einschließlich Einstellungen zum Dashboard.

### Ruhiges Marketplace-Polling

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

#### Strukturierte Schaltflächen

Verwenden Sie `renderStructuredContent(groups)` aus `src/ui/reuse/structured-content.js` für deklarative Beiträge zu Einstellungen und Administration. Texte und zugängliche Beschriftungen stammen aus den Übersetzungen der zuständigen Komponente.

```js
renderStructuredContent([
    {
        items: [
            {
                type: "button",
                id: "inspect",
                text: inspectLabel,
                variant: "neutral",
            },
        ],
    },
]);
```

Der Schaltflächendeskriptor ordnet `variant: 'confirm'` der Klasse `btn-confirm` und `variant: 'danger'` der Klasse `btn-cancel` zu. Fehlende Varianten, `neutral` und andere Werte erhalten `btn-neutral`; unbekannte Werte werden nicht abgelehnt. Jede Schaltfläche besitzt genau eine Konsequenzklasse neben `structured-content__button` und `btn-animated`. Die zuständige Komponente wählt erzeugende oder destruktive Varianten ausdrücklich; Beschriftungen und IDs bestimmen niemals die Konsequenz.

Natives `type="button"`, maskierte Texte und Attribute (`id`, `name`, `ariaLabel`, `disabled`, `checked`), Gruppen und Trennlinien bleiben erhalten. Der Renderer liefert Markup, ohne Aktionen auszuführen oder Formulare abzusenden. Ereignisbehandlung und vorübergehende Deaktivierung bleiben beim Aufrufer; Deskriptoren bieten keine Schnittstellen für Ladezustände oder beliebige Klassen. Der Host muss die vorhandenen gemeinsamen Schaltflächen- und Strukturstile laden. Die kanonischen Klassen greifen auf gemeinsame Regeln für Umbruch, Schriftvererbung und Größen bei groben Zeigegeräten zu.

Die Anleitungen für Einstellungen und Administration behalten ihre Ziele und Abläufe: Dieser Renderer ergänzt weder eine Aktion noch einen Anleitungsschritt. Die beitragenden Komponenten bleiben für ihre eigenen Aktionen und Anleitungen verantwortlich.

## Sicherheit

Verborgene Navigation ist kein Zugriffsschutz. Anbieter nutzen Eigentümerfähigkeiten und brechen bei Seitenende oder Kontowechsel ab; private Daten bleiben kontogebunden.

## Referenz

### Geführte Tutorials

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

`showToast(message, { minRole: "admin" })` beschränkt Betriebsinformationen auf Administratoren und Eigentümer. Andere oder unbekannte Rollen erzeugen weder Toast-DOM noch Timer oder Schließ-Callbacks. Ohne `minRole` bleibt normales Feedback für alle sichtbar. Diese Anzeigeoption ersetzt keine serverseitige Berechtigung.

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

Toast-Hinweise laden ihr gemeinsames Stylesheet, ohne Erstellung oder Schließen zu verzögern. Gleichzeitige Hinweise teilen sich höchstens zwei Ladeversuche von jeweils fünf Sekunden. Nach einem gescheiterten Zyklus kann ein späterer Hinweis erneut laden. Externe Links bleiben erhalten; nur fehlgeschlagene Links des Toast-Laders werden entfernt. Schließen während des Ladens bleibt endgültig. Ziele und Ablauf der Seitentutorials bleiben unverändert.

### Lebensdauer und Menütasten

`openHamburgerMenu(button, { items, signal })` liefert `Promise<string|null>`. Das optionale `signal` bindet Vorbereitung und geöffnetes Menü an die aktuelle Seite oder Komponente. Das Signal dieses Einhängens muss vor dem Warten auf das Ergebnis erfasst werden. Ein gewählter aktiver Eintrag liefert seine bestehende Aktionskennung; Schließen, Abbruch, Entfernen der öffnenden Schaltfläche oder Ersetzen durch ein neueres Menü liefert `null`. Leere Listen und Listen ohne aktive Aktionen liefern `null`. Ein Abbruch gilt auch beim Warten auf das Stylesheet oder die Menüwarteschlange. Wechselt der Fokus von der öffnenden Schaltfläche oder dem Menü weg, wird das Öffnen abgebrochen, auch während des Wartens auf Stylesheets oder die Warteschlange. Zurückbehaltene alte Bedienelemente können weder eine Aktion wählen noch ein neueres Menü schließen.

Aktionsmenüs verwenden `ui:floatingMenus` mit Priorität 50 und warten, bis höher priorisierte Tutorial-Reservierungen freigeben. Übernimmt eine höher priorisierte Reservierung bei bereits geöffnetem Menü, schließt dieses ohne Fokusrückgabe. Ausstehende und geöffnete Oberflächen teilen ihre Lebensdauer über `ui:transientSurfaces`; gebündelte und direkt ausgelieferte Aufrufer verwenden dieselbe Verwaltung. Benutzer und Module behalten ihre bestehenden Tutorial-Ziele und Aktionsabläufe. Dieser gemeinsame UI-Vertrag hat keine eigenständige Paketversion.

Beim Öffnen erhält der erste aktive Eintrag den Fokus. Pfeil abwärts und Pfeil aufwärts wechseln zwischen aktiven Einträgen; Pos1 und Ende erreichen den ersten und letzten. Escape schließt und gibt den Fokus nur an die weiterhin aktuelle, verbundene öffnende Schaltfläche zurück. Tab schließt und erhält den normalen Fokuswechsel. Schließen durch einen Zeigerklick außerhalb setzt den Fokus nicht auf die öffnende Schaltfläche zurück. Deaktivierte Aktionen sind nicht wählbar. Bestehende übersetzte Beschriftungen, maskierte HTML-Werte, Gefahrendarstellung und responsive Positionierung bleiben unterstützt.

Menüs, deren öffnendes Bedienelement in einem Dialog liegt, nutzen die bestehende delegierte Fokusverwaltung von `ui:popupFocus`. Menünavigation und Escape wirken auf das Menü, ohne den übergeordneten Dialog zu schließen. Ein Fokuswechsel zu einem anderen Bedienelement in diesem Dialog schließt das Menü und erhält den neuen Fokus. Ein neuer verschachtelter Dialog oder das Schließen des übergeordneten Dialogs entzieht dem Menü seine Zuständigkeit. Die Dialogverträge bleiben unverändert.

### Tastaturnavigation in Dialogen

Jeder Dialog hat eine eigene zugängliche Überschrift, auch verschachtelte Rückfragen zu ungespeicherten Änderungen und mehrseitige Dialoge. Tab und Umschalt+Tab bleiben im aktiven Dialog. Beim Behalten eines Entwurfs kehrt der Fokus zum Editor zurück; beim Schließen des letzten Dialogs zur verfügbaren öffnenden Schaltfläche oder zur Seite, wenn diese fehlt. Leere Dialoge halten den Fokus, bis Bedienelemente verfügbar werden. Ein Abbruch beim Seitenwechsel gibt den Fokus frei, ohne ihn auf die alte Seite zurückzusetzen. Schließanimationen behalten keine Tastatursteuerung. Diese gemeinsamen Bedienelemente gelten auch für Dialoge aus geführten Tutorials.

### Lebensdauer beim Öffnen

`onOpen` läuft synchron, nachdem der Dialog eingefügt wurde und bevor seine Öffnungsanimation beginnt. Wirft die anfängliche Einrichtung einen Fehler, lehnt `openPopup` mit demselben Fehler ab, nachdem der fehlgeschlagene Dialog entfernt und sein Fokus, seine Ereignislistener, Timer, Änderungserfassung und Bildlaufsperre freigegeben wurden. Eine fehlgeschlagene Einrichtung fordert keine Abbruchfreigabe und zeigt keine Verwerfungsbestätigung. Ein bereits abgeschlossenes Schließen oder ein Abbruch durch den Besitzer bleibt endgültig. Auf Promises aus Initialisierungsfunktionen wird nicht gewartet.

Ein aktiver übergeordneter Dialog oder eine neuere Öffnung behält seinen eigenen Fokus und seine Bildlaufsperre. Die Bildvorschau nutzt dieselbe Bereinigung bei fehlgeschlagener synchroner Einrichtung; Übersetzungsfehler werden weiterhin weitergegeben. Normale Öffnungs- und Schließanimationen, verpflichtende Dialoge, Aktions-Callbacks, Änderungsbestätigungen und wiederholte Seiten-Callbacks behalten ihre Verträge. Fehler späterer Seiten-Callbacks sind keine Fehler der anfänglichen Öffnung.

Bestehende Tutorial-Ziele, Besitzer- und Abschlusskennungen, Weiter, Zurück, Neustart und Wiederholung bleiben unverändert. Ein fehlgeschlagener untergeordneter Dialog gibt die Kontrolle an das akzeptierte aktive übergeordnete Tutorial zurück; die Bereinigung macht den fehlgeschlagenen Dialog nicht zu einem neuen Tutorial-Ziel. Die gemeinsame UI besitzt kein eigenständig versioniertes Paket oder Manifest.

### Aktionsvertrag für Dialoge

Eingabe und Leertaste aktivieren das fokussierte native Bedienelement. Abbrechen wählt daher keine andere Fußzeilenaktion aus. Bei ungespeicherten Änderungen erhält das sichere Abbrechen zunächst den Fokus; Verwerfen verwendet die Gefahrendarstellung. Gedrückthalten der Eingabetaste wiederholt keine Dialogaktion. Eine laufende Aktion kann nicht erneut gesendet werden; ausdrückliches Schließen und Abbrechen bleiben möglich. Veraltete oder bereits schließende Bedienelemente rufen keine Aktionen mehr auf.

Eine einfache Eingabetaste in einem einzeiligen Text-, Such-, E-Mail-, URL-, Telefon- oder Passwortfeld außerhalb eines nativen Formulars verwendet die erste verfügbare Fußzeilenaktion mit `variant: "confirm"`. Der aktuelle Aktionsdeskriptor legt diese aufbauende Wirkung fest; CSS-Klassen und Aktionskennungen berechtigen nicht zur Standardaktion. Aufrufer müssen destruktive Folgen als `cancel` und sicheres Schließen als `neutral` kennzeichnen. Native Formulare, Schaltflächen, Links, mehrzeilige und bearbeitbare Inhalte, Auswahllisten, zusammengesetzte Bedienelemente, Tastenkombinationen und IME-Eingaben behalten ihr eigenes Verhalten. Deaktivierte, verborgene, inerte und entfernte Bedienelemente sind ausgeschlossen.

Erste und gewechselte Dialogseiten verwenden native `button type="button"`-Elemente mit genau einer gemeinsamen Wirkungsklasse. Neutrale Aktionen einschließlich Fertig behalten ihre dialogspezifische Darstellung und nutzen gemeinsame Umbruch- und Berührungsflächenregeln. Seiten können Fußzeilen hinzufügen oder entfernen; ersetzte Inhaltsaktionen verwenden denselben Callback-Lebenszyklus. Tutorial-Ziele, Beschriftungen, Abschlusskennungen und Wiederholungen bleiben unverändert; Weiter und Zurück behalten ihre eigenen Tastaturaktionen. Der gemeinsame Host-Dialog besitzt keine eigenständige Komponentenversion und kein eigenes Manifest.

Registrierte Abschlussaktionen im Inhalt dürfen absichtlich verborgen sein und programmatisch ausgelöst werden, etwa bei der E-Mail-Verifizierung. Sie werden nie zu Tastatur-Standardaktionen und beachten weiterhin Aktivierung, Inert-Zustand, laufende Aktionen und Dialoglebensdauer.

Form-Builder-Dialoge mit `includeSubmitButton: false` deklarieren `data-form-submit="external"`. Ihre Felder dürfen die aufbauende Fußzeilenaktion nutzen; deren Callback bleibt für die Prüfung zuständig. Eine diesem Formular zugeordnete native Sende-Schaltfläche oder Bildeingabe hat Vorrang, auch außerhalb des Formularelements.

### Fokus für Tutorial-Schritte

Die ergänzende Fähigkeit `ui:popupFocus` koordiniert Dialoge über `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })` und `restore(overlay, preferred)`. Die Registrierung gehört zum Dialogrenderer. Ein Tutorial delegiert nur den aktiven Dialog, den sein aktueller Schritt ausdrücklich akzeptiert. Es liefert zulässige Ziele und Bedienelemente, verbundene Oberflächen desselben Dokuments sowie eine Fokusfunktion. Das erforderliche Abbruchsignal, das Entfernen einer Oberfläche oder das Schließen des Dialogs beendet die Delegation. Ein neuerer Dialog behält den exklusiven Fokus, auch vor seiner Einblendanimation. Beim Beenden oder Wiederholen eines Tutorials gilt wieder die normale Tastatursteuerung, ohne eine verworfene Seite erneut zu öffnen. Die Optionen von `openPopup` bleiben unverändert.

Die erforderliche Funktion `onRevoke` entfernt delegierte Ereignisbehandler synchron, bevor der Fokus zurückgegeben wird.

Delegierte Funktionen arbeiten synchron; `contains` muss einen booleschen Wert zurückgeben. Ausnahmen, ungültige Rückgabewerte, asynchrone Ergebnisse oder rekursive Fokusversuche beenden die Delegation, protokollieren sichere Diagnosemetadaten und stellen die normale Fokussteuerung wieder her. Fehler in Funktionen oder Protokollierung dürfen das Schließen eines Dialogs nicht unterbrechen oder dessen Ergebnis offenlassen.

### Sprachlisten bedienen

Ziehen Sie eine Sprachzeile oder auf einem Touchscreen ihren Griff an die gewünschte Position in der bevorzugten Liste. Die Mitte der Zielzeile entscheidet über das Einfügen davor oder danach; der übrige Tabellenbereich fügt am Ende ein. Englisch bleibt als bevorzugte Ausweichsprache erhalten. Änderungen bleiben bis zum Speichern ein Entwurf; Verwerfen stellt die gespeicherte Reihenfolge wieder her. Offline lassen sich bevorzugte Sprachen umordnen, aber keine Sprachen hinzufügen oder entfernen.

Natives Ziehen und Touch-/Stiftgriffe in den Einstellungen nutzen gemeinsam `bindListDropzones` in `src/ui/app/settings/dropzones.js`. Die Einstellungssteuerung bestimmt Selektoren, Zulässigkeit und die Ablagefunktion; die Hilfsfunktion verwaltet Zielerkennung, Markierungen, Zeigerbindung und Abbruch. `cancel()` beendet die Geste vor einer Neudarstellung; `dispose()` oder das übergebene Signal entfernt die Listener. Abbruch, Verlust der Zeigerbindung, Escape, Seitenwechsel und ungültige Ablagen übernehmen keine Änderungen. Fehler bei der Zulässigkeitsprüfung lösen die Geste vor der Weitergabe auf; nach Abbruch, Freigabe der Steuerung oder Zeilenaustausch wird keine Ablage übernommen. Die Spracheinführung in den Einstellungen behält ihre Ziele für verfügbare und bevorzugte Sprachen und erläutert denselben Ablauf aus Ziehen und Speichern.

### Vorschau des Nachrichtenstils

Unter Darstellung erscheint eine gekennzeichnete, erfundene Unterhaltung unter Nachrichtenstil. Eingehende und ausgehende Beispiele verwenden die Nachrichtendarstellung mit Namen sowie lokalisierten Datums- und Zeitangaben. Ein Stilwechsel zeigt die ungespeicherte Auswahl; Speichern übernimmt sie und Verwerfen stellt das gespeicherte Layout wieder her. Die Anleitung zur Darstellung enthält die Vorschau nur, wenn sie verfügbar ist. Das Beispiel hat keine Links, Profilaktionen, Lesebestätigungen oder echten Gesprächsdaten. Ist Messages nicht verfügbar, bleiben Auswahl und Speichern nutzbar. Erneutes Anzeigen des Abschnitts erhält ausstehende Änderungen; beim Verlassen der Einstellungen wird unfertiges Rendern abgebrochen.

Vorschauen für den Nachrichtenstil benötigen einen bereiten Darstellungsanbieter in Version 2. Ist Profile oder Messages nicht verfügbar, wird nur das Beispiel verborgen; Auswahl und ungespeicherte Einstellung bleiben nutzbar. Nach der Wiederherstellung erscheint die aktuelle Auswahl automatisch. Der optionale Vorschau-Schritt der Einführung folgt demselben sichtbaren Bereich. Passende Settings-Dateien, Messages 2.8.1 und Profile 3.0.19 sind gemeinsam auszuliefern.

### Ergebnisse von Modulaktionen

Aktivieren und Deaktivieren bleiben während der Änderungsanfrage und einer anschließenden Zustandsprüfung beschäftigt. Eine Abfrage zeigt den aktuell beobachteten Zustand, nicht ob genau diese Anfrage übernommen wurde. Das Verlassen der Modulseite bricht eine bereits gesendete Änderung nicht ab. Die alte Seite darf weder verspätete Meldungen anzeigen noch eine neue Ansicht verändern. Ein Kontowechsel entwertet wartende Aktionen und späte Ergebnisse. Geht eine Antwort verloren, erfolgt genau eine neue Zustandsabfrage mit fünf Sekunden Zeitlimit, keine automatische Wiederholung der Änderung. Bei unklarem Ergebnis ersetzt Zustand prüfen die Modulaktionen. Weitere Abfragen und SPA-Besuche lassen die Aktionen gesperrt, solange der entgegengesetzte Zustand vorliegt. Die Aktionen kehren erst zurück, wenn der angeforderte Zustand beobachtet wird. Optionale Einrichtungshinweise und abgebrochene Katalogabfragen machen eine bestätigte Aktivierung nicht zum Fehler. Abgebrochene Pflichtkonfiguration wird einmal zurückgenommen. Geht die Antwort darauf verloren, wird die Rücknahme nur dann als deaktiviert abgeglichen, wenn eine verbindliche Abfrage diesen Zustand zeigt. Andernfalls bleibt das Ergebnis unbekannt.

Die Marktplatz-Tutorials zeigen Zustand prüfen nur bei verfügbarem Bedienelement und überspringen normale Modulaktionen bei unklarem Ergebnis. Bestehende Eigentümer- und Abschlusskennungen sowie die Popup- und Tutorial-Lebensdauer der Konfiguration bleiben erhalten. Die Modulseite gehört zur Host-Oberfläche.

Abgeglichene Lebenszyklusereignisse sind als observed-state gekennzeichnet, bestätigte Antworten als acknowledged-response. Ein beobachteter Zustand beweist nicht, dass genau diese Anfrage übernommen wurde. Die API bietet keinen dauerhaften Vorgangsbeleg. Ungeklärte Zustände bleiben bei SPA-Wechseln erhalten, nicht bei einem vollständigen Neuladen des Browsers. Danach ist nur der aktuelle Serverzustand bekannt; das endgültige Ergebnis der früheren Anfrage bleibt unbestätigt.

Ein Modul kann keine Abhängigkeit erfüllen, solange eine Modulaktion läuft oder ihr Ergebnis ungeklärt ist. Das gilt auch für Deaktivierung und die Rücknahme einer Einrichtung. Wiederholte Aktionen und SPA-Wechsel behalten diese Sperre bei; eingereihte Aktivierungen prüfen die Bereitschaft beim tatsächlichen Start erneut, ohne die Auswahl optionaler Abhängigkeiten zu wiederholen. Beobachtete Aktivierung ist kein Nachweis einer abgeschlossenen Einrichtung. Auch eine abgelehnte Rücknahme lässt die Einrichtung unvollständig. Das Speichern der Einstellungen kann die Einrichtung bestätigen, aber keine ungewisse Änderung klären. Ein verbindlich beobachteter, erwarteter deaktivierter Zustand erlaubt die gewöhnliche ausdrückliche Aktivierung.

Einstellungen, Aktualisierungen und Kanalwechsel nutzen dieselben kontogebundenen Prüfungen für laufende Aktionen und ihre Ergebnisse, einschließlich vorübergehender Aktivierung, Deaktivierung und Rücknahme. Jede Aktivierung und Wiederherstellung prüft die ausgewählten Abhängigkeiten erneut. Eine Wiederherstellung nach Installation ist nur bei eindeutig abgelehnter Einreichung oder bestätigtem abschließendem Auftragsergebnis zulässig. Verlorene Anfrage- oder Statusantworten und fehlende Auftragsbelege bleiben ungeklärt; es erfolgt weder Wiederherstellung noch Wiederholung. Eine Installation mit verlorenem Ergebnis bleibt für die Seitensitzung gesperrt. Zustand prüfen aktualisiert den Katalog, beweist aber keinen Auftragsabschluss. Vollständiges Neuladen verwirft diese lokale Unsicherheit, ohne einen Abschluss zu belegen. Dauerhafte Auftragsbelege und Wiederherstellung nach vollständigem Neuladen werden nicht hinzugefügt.

### Vor dem Senden abbrechen

Der gemeinsame UI-Offline-Client führt das AbortSignal des Aufrufers durch registrierte Anfragestufen, Abfragen der Warteschlange und Wartezeiten bei der Übertragung. Ein Abbruch vor dem Start einer Netzwerkanfrage oder eines dauerhaften Warteschlangeneintrags verhindert diese neue Aktion. Die Ausgangswarteschlange prüft den Abbruch nochmals innerhalb ihrer Speichersperre.

Die ergänzenden Verträge lauten `deliverOrQueue(ctx, owner, id, payload, send, { signal } = {})` und `outbox.submit(owner, id, payload, { signal } = {})`. Bestehende Aufrufer ohne Signal und die dauerhafte Wiederholung behalten ihr Verhalten. Ein späterer Abbruch entfernt niemals einen angenommenen Eintrag und macht keine bereits gesendete Anfrage rückgängig. Eine verlorene Bestätigung kann ein ungewisses Ergebnis hinterlassen und darf nicht zu blindem erneuten Senden führen.

Diese Verträge gehören zu den gemeinsamen UI-Dateien, nicht zu einem Gateway- oder Adapterpaket. Liefern Sie die aktualisierten gemeinsamen Dateien mit Profile 4.0.1 aus. Profil, Nachrichten, Kalender und Notify-E-Mail verwenden den gemeinsamen HTTP-Client; Study-Zeichnungen, Bibliothek, Favoriten und Flashcards nutzen auch die optionale Übertragungshilfe. Aufrufe ohne Signal behalten den bestehenden Vertrag. Das Kalender-Laufzeitverhalten wird nicht gesondert angepasst.

### Vertrag für die Suchauswahl

Wählen Sie einen Treffer mit dem Zeiger oder der Eingabetaste und warten Sie auf den Abschluss. Jeder Dialog erlaubt währenddessen nur einen Auswahl-Callback. Solange die zuständige Suchinstanz aktiv bleibt, bleiben bei einer Ausnahme oder einem abgelehnten Promise Suchtext, Kategorie und Mehrfachauswahl erhalten; ein übersetzter Toast zeigt den Fehler. Prüfen Sie vor einem erneuten Versuch das Ziel: Eine Fehlermeldung beweist nicht, dass die Operation noch nicht ausgelöst wurde. Bei einem nicht mehr verfügbaren Treffer werden Sie zur erneuten Suche aufgefordert.

`openSearchPopup` und `createSearchBar` akzeptieren ein optionales `signal` und übergeben dem Callback als zweites Argument einen Auswahlkontext mit `context.signal`. Synchrone Callbacks und erfolgreiche Rückgaben von `undefined` behalten ihr Verhalten; bei Promises wartet der Dialog vor dem erfolgreichen Schließen auf den Abschluss. Ausschließlich `false` bedeutet ergänzend einen Abbruch, der die Suche ohne Fehlermeldung offen hält, solange ihre zuständige Instanz aktiv bleibt. Fußzeilenaktionen verwenden native `click`-Aktivierung einschließlich Tastatur- und Browserbedienung; `mousedown` ruft den Auswahl-Callback nicht auf.

Schließen, Escape, Routenwechsel oder Seitenabbau, das Ende der Anbieterlebensdauer und Kontowechsel entwerten ausstehende UI-Ergebnisse. Das Abmelden eines Ergebnisanbieters entwertet dessen Auswahlvorgänge. Ein veralteter Abschluss darf weder einen neuen Dialog schließen noch verspätete Hinweise anzeigen. Ein Abbruch macht jedoch eine bereits ausgelöste Operation nicht rückgängig. Aufrufer müssen ihr Lebensdauersignal übergeben und das Callback-Signal vor dem Auslösen beachten.

Die Auswahl in der Navigationsleiste gibt ein von `navigateTo` vor dem Routenabbau zurückgegebenes `false` weiter. Bei verweigerter Navigation bleibt die Suche ohne Fehler offen. Sobald `route-will-change` oder `pagehide` ausgelöst wird, schließt die Suche aufgrund ihres Lebenszyklus, auch wenn die Zielseite anschließend nicht eingebunden werden kann. Rückmeldungen zum Ergebnis gehören dann zur Zielseite oder zum Router, nicht zum geschlossenen Suchdialog.

Die Arbeitsplatzanleitung erklärt Auswahl, Warten und sichere Wiederholung. Ziele, Abschlusskennungen, Weiter, Zurück und erneute Wiedergabe bleiben erhalten. Die Suche gehört zur gemeinsamen UI und besitzt kein eigenständig versioniertes Paket oder Manifest.

### Formularvalidierung

Als ungültig ausgewertete Felder erhalten `aria-invalid="true"`. Ihr `aria-describedby` verweist auf die vorhandenen übersetzten Kriterien, die aktuell nicht erfüllt sind, sowie auf Beschreibungen des Aufrufers. Nach einer Korrektur entfernt der Formularersteller nur seinen eigenen Ungültigkeitszustand und seine Beschreibungsverweise. Unberührte Steuerelemente und unbestimmte Kriterien (`null`) erhalten vor der Auswertung keinen ungültigen ARIA-Zustand. Bestehende Regeln für Pflichtfelder, optionale Felder und Rückgabewerte gelten weiterhin; native Gültigkeitsprüfungen und die Registerauswahl bleiben von benutzerdefinierten Kriterien getrennt.

Jedes dargestellte Kriterium hat eine eindeutige ID, auch bei mehreren Formularen mit denselben Feldnamen. `detach()` des Controllers und das Abbruchsignal der Anbindung entfernen die eigenen Ereignislistener und ARIA-Zustände; ausdrückliche Validierungsaufrufe bleiben möglich. Seiten und Dialoge müssen die Anbindung mit der Lebensdauer ihres Formulars beenden. Diese Darstellung zeichnet keine Feldwerte auf.

Änderungen des Aufrufers an `aria-invalid`, einschließlich des Entfernens, bleiben über spätere ungültige Prüfungen sowie Korrektur oder Bereinigung hinweg erhalten. Schreibt der Aufrufer denselben Wert `true`, ist dies vom vorhandenen Wert des Formularerstellers nicht unterscheidbar. Beendet ein benutzerdefiniertes Kriterium die Anbindung, liefert die unterbrochene Feld- oder Gesamtformularprüfung weiterhin ihr Ergebnis, aktualisiert nach der Bereinigung aber nicht mehr die Darstellung. Ein ausdrücklicher Validierungsaufruf nach der Bereinigung beginnt eine neue Prüfung, die erneut bereinigt werden kann.

### Tutorial-Abdeckung

Beachten Sie die Anforderungen am Feld, korrigieren Sie unerfüllte Kriterien und wiederholen Sie die Aktion. Die Tutorials zur Registrierungsverwaltung und Sicherheit behalten ihre bisherigen Steuerelemente, Ziele, Abschlusskennungen und Navigation. Die Sicherheitsanleitung erläutert bereits Passwortanforderungen, Bestätigung und Abbruch. Die gemeinsame Validierung fügt keine Tutorial-Aktion und keinen Schritt hinzu. Die gemeinsame UI hat kein separat versioniertes Paket oder Manifest.

### E-Mail-Aktionen

Als primär festlegen erhält eine aufbauende, Entfernen eine destruktive Darstellung. Beide Aktionen teilen eine Sperre für laufende Vorgänge in der gesamten Adressliste, auch nach einer erneuten Darstellung derselben Seite. Ablehnung, bestätigte Änderung, vorgemerkte Änderung und unbestätigtes Ergebnis erhalten unterschiedliche lokalisierte Hinweise. Eine gespeicherte Änderung wird bei fehlgeschlagener Listenaktualisierung nicht als fehlgeschlagen gemeldet. Seitenwechsel, Kontowechsel oder Entfernung des Anbieters unterdrücken veraltete Abschlussmeldungen.

Aktualisieren prüft die Liste, ohne eine Änderung zu wiederholen. Bestätigte und unbekannte Ergebnisse verwenden den öffentlichen Notify-Client mit einem nicht gepufferten Online-Lesezugriff und `cache: "no-store"`. Dadurch werden zwischengespeicherte Antworten, gemeinsam genutzte laufende Lesezugriffe und Projektionen aus dem Postausgang ausgeschlossen. Erst eine gültige Liste, die die gewünschte Entfernung oder primäre Auswahl zeigt, hebt die Sperre auf. Vorgemerkte Änderungen verwenden weiterhin die normale projizierte Notify-Liste und gelten nie als vom Server bestätigt. Fehlgeschlagene, fehlerhafte, offline ausgeführte oder unveränderte Wiederherstellungsabfragen behalten Sperre und Anleitung bei. Bleibt ein unbekanntes Ergebnis ungeklärt, öffnen Sie die Einstellungen erneut und prüfen Sie die Liste vor einer neuen Änderung. Die Sperre gilt nur für die aktuelle Seite; erneutes Öffnen beweist das frühere Ergebnis nicht. Es wird kein dauerhafter Änderungsbeleg ergänzt.

Die vorhandene allgemeine Einführung behält Ziel, Eigentümer und Abschlusskennung der E-Mail-Liste für gefüllte und leere Listen. Hinweise zu laufenden und vorgemerkten Aktionen sowie Aktualisieren sind in allen vier Sprachen angepasst. Bestätigung, erneuter Versand, Hinzufügen, Passwort- und Kontoverwaltungsaktionen behalten ihre bisherigen Abläufe. Gemeinsame UI-Dateien haben keine eigene Paketversion.

### Lebensdauer der Karussellwahl

Horizontale Karussells halten Auswahlreihenfolge, gedrückten Zustand und Auswahlzähler gemeinsam aktuell. Karussells mit derselben Kennung führen ihre ausgewählten Werte zusammen; Hinzufügen kann ein Element ergänzen, ohne es auszuwählen. Vorschauen bei Fokus oder Zeigerkontakt gehören zur eingebundenen Karussellinstanz.

Übergeben Sie das `AbortSignal` des Besitzers an `mountHorizontalCarousels`. `onActivate` darf Wert und Beschriftung sofort oder über ein Promise liefern; `false` verhindert die Auswahl. Synchrone Ergebnisse bleiben synchron. Nach dem Abbruch dürfen ausstehende Aktivierungsergebnisse weder Elementkennung, Beschriftung, Auswahl, ARIA-Zustand noch Zähler verändern und den früheren Besitzer nicht über `onChange` benachrichtigen. Ein Abbruch innerhalb von Aktivierungs-, Sortierungs- oder Änderungs-Callbacks beendet auch nachfolgende Widget-Arbeit und schützt eine neue Einbindung im selben erhaltenen Wurzelelement. Ein bereits abgebrochenes Signal lässt dieses Element beim Einbinden unverändert. Arbeit innerhalb der Besitzer-Callbacks wird dadurch weder abgebrochen noch rückgängig gemacht.

Bestehende Erstellungstutorials behalten ihre Ziele für Editorinhalt, Abschnitte und Fußzeile sowie Abschlusskennungen und den Ablauf für Weiter, Zurück und Wiederholung. Die Karussellauswahl fügt weder eine eigene Anleitung noch eine Aktion hinzu. Gemeinsame Karussellressourcen haben keine eigenständige Komponentenpaketversion.

### Dialogvorbereitung

Ein bereits abgebrochenes `openPopup` liefert `null`, ohne Ressourcen anzufordern. Ein Abbruch während der Stylesheet- oder Sprachvorbereitung liefert ebenfalls sofort `null`, ohne andere Öffnungen oder die gemeinsame Sprachinitialisierung abzubrechen. Fehlgeschlagene oder abgebrochene Öffnungen übernehmen weder Dialog, Fokus noch Scrollsperre. Sprachfehler bleiben ausdrücklich sichtbar und erlauben einen späteren Initialisierungsversuch.

Dialogstile teilen `ui:popupPreparation` zwischen gebündelten und direkt geladenen Aufrufern. Jede ausdrückliche Öffnung teilt einen auf fünf Sekunden begrenzten Versuch, davon höchstens eine Sekunde für ein vollständig zwischengespeichertes Stylesheet oder eine laufende Cache-Aktualisierung. Fehlende, ungültige, leere, abgelehnte oder hängende Cache-Lesevorgänge führen innerhalb dieses Versuchs zum Netzwerkzugriff. Geladene Links werden wiederverwendet, laufende beobachtet. Bei Fehlern werden nur eigene Links entfernt; übernommene Links bleiben erhalten und fehlgeschlagene werden bei späteren Versuchen ausgeschlossen. Zeitüberschreitungen und Ladefehler lehnen `openPopup` ab, statt eine Schließaktion zu melden oder einen ungestalteten blockierenden Dialog zu öffnen. Aktive Aufrufer erhalten pro fehlgeschlagenem Versuch eine lokalisierte Fehlermeldung als Toast. Abgebrochene Aufrufer zeigen keine verspäteten Meldungen. Erst eine spätere ausdrückliche Öffnung versucht es erneut; es gibt keine automatische Wiederholungsschleife.

`primePopupStylesheet()` aktualisiert weiterhin das vollständige Stylesheet für die Offline-Wiederherstellung, bündelt gleichzeitige Aktualisierungen und protokolliert Fehler ohne Ablehnung. Aktualisierungen sind auf fünf Sekunden begrenzt. Verspätete Vorgänge verändern danach keine DOM-Stile; bereits an den Browser übergebene Cache-Storage-Schreibvorgänge können nicht zurückgenommen werden. Fehler deaktivieren spätere Dialogwiederherstellung nicht. Verankerte Vorschauen behalten ihren synchronen Controller, behandeln Vorbereitungsfehler, verbergen fehlgeschlagene Vorschauen und versuchen es bei einem späteren `show` erneut. `hide` und `destroy` verhindern verspätete Meldungen. Die vorhandene Laufzeitfehlerbehandlung erkennt eigene Stylesheet-Fehler ohne rekursive Meldung.

Tutorial-Ziele, Abschlusskennungen, Aktionen, Weiter, Zurück, Neustart und Wiederholung bleiben unverändert. Fokus, verschachtelte Dialoge, Verwerfungsbestätigung, Aktionen, Zeitlimits und Rückabwicklung sichtbarer Dialoge behalten ihre Verträge. Die gemeinsame UI besitzt keine eigene Paketversion.

Die Fünf-Sekunden-Grenze gilt nur für den Stylesheet-Versuch, nicht für die gesamte Vorbereitung von `openPopup`. Die strikte Sprachinitialisierung behält ihre bisherige Lebensdauer ohne neues Zeitlimit. Sie kann die lokalisierte Fehlermeldung und Ablehnung verzögern; das Öffnungssignal bricht dennoch sofort ab. Erfolgreiche verankerte Vorschauen initialisieren keine Sprachressourcen des Dialogs.

### Gesten schwebender Fenster

`ui:makeFloatingWindow`

Gemeinsames Verhalten: [Schwebende Steuerelemente](/docs/focus-control/technical).
