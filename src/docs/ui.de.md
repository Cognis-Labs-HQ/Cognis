# UI

## Überblick

`src/ui/` hostet das Cognis-Browser-Frontend. Es stellt die Studieworkflows, sozialen Interaktionsoberflächen, Administrationspanels und den eingebetteten Dokumentationsbrowser bereit. Die UI ist eine server-seitig gerenderte Multi-Page-Anwendung.

Die UI-Schicht hat keine Kenntnis davon, welche Gateways oder Adapter installiert sind. Stattdessen tragen Gateways UI-Elemente zur Laufzeit über die `UIRegistry` und die Page-Extensions-API bei.

Alle benutzersichtbaren Texte gehen durch das i18n-System in `src/ui/reuse/i18n.js`. Kein Text ist in JavaScript oder HTML-Templates fest codiert.

## Verantwortlichkeiten

- Alle Seiten-Einstiegspunkte und zugehörige HTML-Templates hosten.
- Die Layout-Shells bereitstellen, durch die alle Nicht-Login-Seiten gerendert werden.
- Die Reuse-Utilities pflegen für i18n, Page Composer, Unsaved-Changes-Guards.
- Theme-Parität durchsetzen: jedes Element löst seine Farben aus CSS-Variablen auf.
- Die i18n-String-Packs für alle vier erforderlichen Sprachen bereitstellen.

## Architektur

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

## i18n-Schlüssel-Konventionen

| Präfix               | Verwendung                                                                    |
| -------------------- | ----------------------------------------------------------------------------- |
| `ui.reuse.*`         | Labels, die über mehrere Seiten geteilt werden                                |
| `ui.reuse.generic.*` | Kontextfreie eigenständige Aktionswörter (speichern, verwerfen, zurücksetzen) |
| `ui.app.<page>.*`    | Seitenspezifischer Text                                                       |
| `ui.layout.*`        | Layout-Shell-Text und ARIA-Labels                                             |

## Wiederverwendbare Bildvorschau

Die globale Fähigkeit `ui:imagePreview` bietet Vorschaubilder, Ereignisbindung und die Aktion `open` über den registrierten Ablauf `ui:imagePreview:open`. Sie ist außerdem über `ui:reuse` als `image-preview.js` verfügbar; der Anbieter lädt das gemeinsame Stylesheet vor der Veröffentlichung der Steuerelemente. Bildschaltflächen öffnen das Original in natürlicher Größe, begrenzt auf den sichtbaren Bereich, wobei nur das übliche X sichtbar ist. Tastaturbedienung, Escape, Fokusrückkehr und das Schließen beim Entfernen der Ansicht oder des Anbieters nutzen den gemeinsamen Popup-Lebenszyklus. Aufrufer verwalten Bild-URLs und optionale Löschaktionen. Library verwendet dieses Steuerelement für hochgeladene und mitgelieferte Bilder im Editor und in Detailgalerien.

Der gemeinsame Bildvorschau-Anbieter lädt sein Stylesheet, bevor er Steuerelemente veröffentlicht. Das reine Bild-Popup entfernt Überschriften und passt Originale im Quer-, Hoch- und Panoramaformat ohne horizontales oder vertikales Scrollen in den sichtbaren Bereich ein. Library-Detailvorschauen behalten ihre Grenzen von 20rem × 18rem; Editor-Vorschaubilder bleiben 8rem × 6rem groß.

## Reaktionsfähige Sitzungsnavigation

Die Abmeldung löscht private Sitzungsdaten, ohne auf die öffentliche Routenpflege des Service-Workers zu warten. Identische Richtlinienanfragen teilen einen Austausch; geänderte Zugriffsentscheidungen bleiben getrennt. Der Sprachschalter wartet auf seinen Kataloganbieter und blendet kontogebundene Steuerelemente nach der Abmeldung aus. Gebündelte und direkt geladene Router teilen Dokumentzustand, Listener und Abbruch laufender Ansichten, einschließlich Einstellungen zum Dashboard.

## Ruhiges Marketplace-Polling

Der Marketplace prüft alle fünfzehn Sekunden einen nur für Administratoren zugänglichen Snapshot unter `/api/v1/modules/marketplace-state`. Sein ETag umfasst Quellen, Installationszustand, zwischengespeicherte Entdeckungen, Empfehlungen und Neustartanforderungen. Unveränderte Antworten liefern `304` ohne Inhalt; der vorbereitete Katalog bleibt ohne erneutes Laden von Übersetzungen oder Neuzeichnen erhalten. Die Quellensuche läuft einmal nach dem Einhängen, stündlich und nach Quellenänderungen; manuelles Aktualisieren erzwingt weiterhin einen Scan. Ausgeblendete, offline befindliche und beschäftigte Seiten pausieren Abfragen; beim Aushängen werden Anfragen abgebrochen und der Timer entfernt.

Katalogeinträge enthalten eine aus dem Inhalt abgeleitete `ui.stringsRevision`. `extendI18n(base, stringsBaseUrl, { revision })` kann versionierte authentifizierte Sprachpakete innerhalb desselben Kontos und derselben Sitzung wiederverwenden. Neue Revisionen laden neue Texte; ein Identitätswechsel leert private Pakete, verspätete Antworten können keine andere Sitzung befüllen, und fehlgeschlagene Ladevorgänge bleiben wiederholbar. Öffentliche Pakete behalten ihren bisherigen Cache und die Lebenszyklusinvalidierung.

Empfehlungsfeeds werden vom Marketplace-Dienst gemeinsam genutzt, bündeln gleichzeitige Lesezugriffe und bleiben fünf Minuten aktuell. Fehlgeschlagene Aktualisierungen behalten die letzte erfolgreiche Liste und warten vor dem nächsten Versuch eine Minute. Eine geänderte konfigurierte URL wählt ein eigenes Ergebnis; manuelles Aktualisieren umgeht die Gültigkeitsdauer.

## Geführte Tutorials

Anleitungen gehören zu einer Seite oder URL. Beim ersten zulässigen Besuch starten die noch nicht abgeschlossenen Anleitungen automatisch. Ein Fragezeichen-SVG neben dem Titel in `page-context` wiederholt die verfügbaren Anleitungen dieser Seite. Der Host besitzt Darstellung und Lebenszyklus; die Funktion besitzt Texte, Ziele und Skript. Berechtigungen werden nie geändert.

`showToast(message, { minRole: "admin" })` beschränkt Betriebsinformationen auf Administratoren und Eigentümer. Andere oder unbekannte Rollen erzeugen weder Toast-DOM noch Timer oder Schließ-Callbacks. Ohne `minRole` bleibt normales Feedback für alle sichtbar. Diese Anzeigeoption ersetzt keine serverseitige Berechtigung.

Schwebende Menüs verwenden die Capability `ui:floatingMenus` Version 1 und die gestuften Flows `ui:floatingMenu:request`, `present`, `dismiss` und `release`. Gleiche Prioritäten folgen der Anforderungsreihenfolge; höhere Prioritäten unterbrechen niedrigere. Eine Reservierung bietet `ready` für die erste Freigabe oder Abmeldung, `present(element, { visible })`, `dismiss(element)` und `dispose()`. Tutorials behalten Priorität 100 bis Abschluss, Abbruch oder Anbieterentfernung, auch zwischen Schritten. Composer-Slots und die Wiederholungsauswahl verwenden dieselbe Warteschlange. Abgebrochene Anforderungen und veraltete Darstellungen ersetzen keine neueren Menüs; leere Slots geben frei, und beim Seitenabbau werden Beobachter und Reservierungen entfernt.

Toast-Hinweise laden ihr gemeinsames Stylesheet, ohne Erstellung oder Schließen zu verzögern. Gleichzeitige Hinweise teilen sich höchstens zwei Ladeversuche von jeweils fünf Sekunden. Nach einem gescheiterten Zyklus kann ein späterer Hinweis erneut laden. Externe Links bleiben erhalten; nur fehlgeschlagene Links des Toast-Laders werden entfernt. Schließen während des Ladens bleibt endgültig. Ziele und Ablauf der Seitentutorials bleiben unverändert.

## Tastaturnavigation in Dialogen

Jeder Dialog hat eine eigene zugängliche Überschrift, auch verschachtelte Rückfragen zu ungespeicherten Änderungen und mehrseitige Dialoge. Tab und Umschalt+Tab bleiben im aktiven Dialog. Beim Behalten eines Entwurfs kehrt der Fokus zum Editor zurück; beim Schließen des letzten Dialogs zur verfügbaren öffnenden Schaltfläche oder zur Seite, wenn diese fehlt. Leere Dialoge halten den Fokus, bis Bedienelemente verfügbar werden. Ein Abbruch beim Seitenwechsel gibt den Fokus frei, ohne ihn auf die alte Seite zurückzusetzen. Schließanimationen behalten keine Tastatursteuerung. Diese gemeinsamen Bedienelemente gelten auch für Dialoge aus geführten Tutorials.

### Fokus für Tutorial-Schritte

Die ergänzende Fähigkeit `ui:popupFocus` koordiniert Dialoge über `register(overlay, handlers)`, `delegate(overlay, { signal, surfaces, contains, focus, onRevoke })` und `restore(overlay, preferred)`. Die Registrierung gehört zum Dialogrenderer. Ein Tutorial delegiert nur den aktiven Dialog, den sein aktueller Schritt ausdrücklich akzeptiert. Es liefert zulässige Ziele und Bedienelemente, verbundene Oberflächen desselben Dokuments sowie eine Fokusfunktion. Das erforderliche Abbruchsignal, das Entfernen einer Oberfläche oder das Schließen des Dialogs beendet die Delegation. Ein neuerer Dialog behält den exklusiven Fokus, auch vor seiner Einblendanimation. Beim Beenden oder Wiederholen eines Tutorials gilt wieder die normale Tastatursteuerung, ohne eine verworfene Seite erneut zu öffnen. Die Optionen von `openPopup` bleiben unverändert.

Die erforderliche Funktion `onRevoke` entfernt delegierte Ereignisbehandler synchron, bevor der Fokus zurückgegeben wird.

Delegierte Funktionen arbeiten synchron; `contains` muss einen booleschen Wert zurückgeben. Ausnahmen, ungültige Rückgabewerte, asynchrone Ergebnisse oder rekursive Fokusversuche beenden die Delegation, protokollieren sichere Diagnosemetadaten und stellen die normale Fokussteuerung wieder her. Fehler in Funktionen oder Protokollierung dürfen das Schließen eines Dialogs nicht unterbrechen oder dessen Ergebnis offenlassen.

## Sprachlisten bedienen

Ziehen Sie eine Sprachzeile oder auf einem Touchscreen ihren Griff an die gewünschte Position in der bevorzugten Liste. Die Mitte der Zielzeile entscheidet über das Einfügen davor oder danach; der übrige Tabellenbereich fügt am Ende ein. Englisch bleibt als bevorzugte Ausweichsprache erhalten. Änderungen bleiben bis zum Speichern ein Entwurf; Verwerfen stellt die gespeicherte Reihenfolge wieder her. Offline lassen sich bevorzugte Sprachen umordnen, aber keine Sprachen hinzufügen oder entfernen.

Natives Ziehen und Touch-/Stiftgriffe in den Einstellungen nutzen gemeinsam `bindListDropzones` in `src/ui/app/settings/dropzones.js`. Die Einstellungssteuerung bestimmt Selektoren, Zulässigkeit und die Ablagefunktion; die Hilfsfunktion verwaltet Zielerkennung, Markierungen, Zeigerbindung und Abbruch. `cancel()` beendet die Geste vor einer Neudarstellung; `dispose()` oder das übergebene Signal entfernt die Listener. Abbruch, Verlust der Zeigerbindung, Escape, Seitenwechsel und ungültige Ablagen übernehmen keine Änderungen. Fehler bei der Zulässigkeitsprüfung lösen die Geste vor der Weitergabe auf; nach Abbruch, Freigabe der Steuerung oder Zeilenaustausch wird keine Ablage übernommen. Die Spracheinführung in den Einstellungen behält ihre Ziele für verfügbare und bevorzugte Sprachen und erläutert denselben Ablauf aus Ziehen und Speichern.
