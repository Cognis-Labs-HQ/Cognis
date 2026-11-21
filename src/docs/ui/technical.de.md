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

Der gemeinsame Bildvorschau-Anbieter lädt sein Stylesheet, bevor er Steuerelemente veröffentlicht. Das reine Bild-Popup entfernt Überschriften und passt Originale im Quer-, Hoch- und Panoramaformat ohne horizontales oder vertikales Scrollen in den sichtbaren Bereich ein. Library-Detailvorschauen behalten ihre Grenzen von 20rem × 18rem; Editor-Vorschaubilder bleiben 8rem × 6rem groß.

### Reaktionsfähige Sitzungsnavigation

Die Abmeldung löscht private Sitzungsdaten, ohne auf die öffentliche Routenpflege des Service-Workers zu warten. Identische Richtlinienanfragen teilen einen Austausch; geänderte Zugriffsentscheidungen bleiben getrennt. Der Sprachschalter wartet auf seinen Kataloganbieter und blendet kontogebundene Steuerelemente nach der Abmeldung aus. Gebündelte und direkt geladene Router teilen Dokumentzustand, Listener und Abbruch laufender Ansichten, einschließlich Einstellungen zum Dashboard.

### Ruhiges Marketplace-Polling

Dieses Verhalten beschreibt der [gemeinsame Vertrag](/docs/api/technical).

## Sicherheit

Verborgene Navigation ist kein Zugriffsschutz. Anbieter nutzen Eigentümerfähigkeiten und brechen bei Seitenende oder Kontowechsel ab; private Daten bleiben kontogebunden.

## Referenz

### Geführte Tutorials

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

`showToast(message, { minRole: "admin" })` beschränkt Betriebsinformationen auf Administratoren und Eigentümer. Andere oder unbekannte Rollen erzeugen weder Toast-DOM noch Timer oder Schließ-Callbacks. Ohne `minRole` bleibt normales Feedback für alle sichtbar. Diese Anzeigeoption ersetzt keine serverseitige Berechtigung.

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

Toast-Hinweise laden ihr gemeinsames Stylesheet, ohne Erstellung oder Schließen zu verzögern. Gleichzeitige Hinweise teilen sich höchstens zwei Ladeversuche von jeweils fünf Sekunden. Nach einem gescheiterten Zyklus kann ein späterer Hinweis erneut laden. Externe Links bleiben erhalten; nur fehlgeschlagene Links des Toast-Laders werden entfernt. Schließen während des Ladens bleibt endgültig. Ziele und Ablauf der Seitentutorials bleiben unverändert.

### Tastaturnavigation in Dialogen

Jeder Dialog hat eine eigene zugängliche Überschrift, auch verschachtelte Rückfragen zu ungespeicherten Änderungen und mehrseitige Dialoge. Tab und Umschalt+Tab bleiben im aktiven Dialog. Beim Behalten eines Entwurfs kehrt der Fokus zum Editor zurück; beim Schließen des letzten Dialogs zur verfügbaren öffnenden Schaltfläche oder zur Seite, wenn diese fehlt. Leere Dialoge halten den Fokus, bis Bedienelemente verfügbar werden. Ein Abbruch beim Seitenwechsel gibt den Fokus frei, ohne ihn auf die alte Seite zurückzusetzen. Schließanimationen behalten keine Tastatursteuerung. Diese gemeinsamen Bedienelemente gelten auch für Dialoge aus geführten Tutorials.

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
