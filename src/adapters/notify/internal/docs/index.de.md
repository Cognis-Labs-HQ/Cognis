# Interner Notify-Adapter

Der Bootstrap registriert den ständig aktiven Sender über `notify:registerAlwaysOnSender` in ctx statt einer konkreten Gateway-Instanz. Sender-Verträge stammen aus `@cognis/core`.

## Übersicht

Der interne Adapter leitet Benachrichtigungen direkt an die In-App-Benachrichtigungsglocke auf jeder Dashboard-Seite weiter. Er ist standardmäßig immer aktiv – jede über das Gateway gesendete Benachrichtigung erreicht den Posteingang des Empfängers, ohne dass Benachrichtigungseinstellungen konfiguriert werden müssen. Der Adapter speichert bis zu 50 Benachrichtigungen pro Benutzer im Arbeitsspeicher; Einträge gehen beim Neustart des Servers verloren.

## Zuständigkeiten

- Jede vom Benachrichtigungs-Gateway gesendete Benachrichtigung entgegennehmen und in den In-App-Posteingang des Empfängers ablegen.
- Die Benachrichtigungsglocke über ein Navbar-Plugin in die Dashboard-Oberfläche einfügen – beim Deaktivieren des Adapters verschwindet die Glocke vollständig.
- Ein Badge mit der Anzahl ungelesener Benachrichtigungen anzeigen, das bei sichtbarer Seite alle 10 Sekunden und bei ausgeblendeter Seite alle 30 Sekunden aktualisiert wird.
- Ein Dropdown-Panel zum Lesen, Verwerfen und Markieren von Benachrichtigungen als gelesen bereitstellen.

## API-Routen

| Methode  | Pfad                            | Beschreibung                                | Auth     |
| -------- | ------------------------------- | ------------------------------------------- | -------- |
| `GET`    | `/api/v1/notify/inbox`          | Benachrichtigungen des Nutzers abrufen      | Benutzer |
| `GET`    | `/api/v1/notify/inbox/count`    | Anzahl ungelesener Benachrichtigungen       | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/read`     | Alle als gelesen markieren                  | Benutzer |
| `PUT`    | `/api/v1/notify/inbox/:id/read` | Eine Benachrichtigung als gelesen markieren | Benutzer |
| `DELETE` | `/api/v1/notify/inbox/:id`      | Eine Benachrichtigung löschen               | Benutzer |
| `DELETE` | `/api/v1/notify/inbox`          | Alle Benachrichtigungen des Nutzers löschen | Benutzer |

## Konfiguration

Der Adapter verfügt über keine Konfigurationsoptionen. Er ist aktiv, solange das Notify-Gateway ihn lädt (also immer, da Adapter automatisch erkannt werden). Das Deaktivieren des Adapters erfordert das Entfernen oder Umbenennen des Adapter-Verzeichnisses – woraufhin die Benachrichtigungsglocke aus der Oberfläche verschwindet.

Benachrichtigungsproduzenten können einen Eintrag als dauerhaft markieren und Aktionsbeschreibungen mit Kennung, barrierefreier Beschriftung, optionalem SVG-Symbol und Konsequenz bereitstellen. Der Adapter validiert und rendert diesen allgemeinen Vertrag und meldet die ausgewählte Kennung mit der Benachrichtigung zurück; er interpretiert weder die Domäne des Produzenten noch ruft er dessen Capabilities auf.

Produzenten können eine dauerhafte Benachrichtigung mit einem anderen UI-Hinweis korrelieren. Ein allgemeines `cognis:notification-resolved`-Ereignis entfernt und löscht jede Benachrichtigung mit derselben Korrelationskennung, ohne dass der Adapter den Produzenten kennen muss.

Erzeuger können eine nach Gebietsschema sortierte `metadata.localizedText`-Map mit `subject`- und `body`-Texten anhängen. Der interne Browseradapter wählt das erste unterstützte Browsergebietsschema und verwendet andernfalls den ursprünglichen Umschlagtext; die Domäne des Erzeugers wird nicht interpretiert.

## Typisierte Zustellverträge

Die interne Zustellung bezieht den strukturierten Datenbankzugriff über ctx. Der Protokollierungsvertrag verwendet die unterstützten Bootstrap-Schweregrade. Verschlüsselung, Postfachberechtigungen und stets aktive Zustellung bleiben unverändert.

## Bestätigte Kontolöschung

In `deprovision-user` → `cleanup-dependencies` löst die Komponente `auth:deprovisionOutcome` Version 1 über `system:contracts` auf und ruft `deletedAccount(input, stageResults)` mit den Originalobjekten desselben Aufrufs auf. Nur eine Auth-eigene Bestätigung der dauerhaft ausgeführten Löschung berechtigt dazu, die gespeicherten Benachrichtigungen des Kontos zu entfernen. Kopierte Ergebnisse, Deaktivierungs- oder Archivierungsergebnisse sowie fehlende oder nicht verfügbare Bestätigungen berechtigen nicht zu dieser Bereinigung.

Für die Bereitstellung ist der mitgelieferte Auth-Anbieter 2.2.12 oder eine Alternative erforderlich, die diesen versionierten Vertrag implementiert; veränderbare öffentliche Flow-Ergebnisse dienen nicht als Ersatz. Die Bereinigung verwendet die bestätigte Löschung, statt nach der Löschung erneut zu autorisieren. Eine bereits gestartete externe Änderung kann vor einem späteren Fehler teilweise abgeschlossen sein; ein komponentenübergreifendes Zurückrollen ist nicht garantiert. Bestehende Oberflächenbedienelemente und Tutorials bleiben unverändert.

Diese Umstellung schützt die Bereinigung durch die mitgelieferten Komponenten. Bevor die Kontolöschung in einer Bereitstellung aktiviert wird, müssen externe Bereinigungs-Hooks aktualisiert oder deaktiviert werden, die weiterhin veränderbaren öffentlichen Flow-Ergebnissen vertrauen.

## Posteingang und Wiederherstellung

Öffnen Sie die Glocke, um Benachrichtigungen zu lesen. „Erneut versuchen“ lädt den Posteingang neu, ohne eine Lese- oder Löschanfrage zu wiederholen. Ein fehlgeschlagenes erstes Laden bedeutet nicht, dass der Posteingang leer ist. Bei einer fehlgeschlagenen Aktualisierung bleiben die zuletzt bestätigten Einträge, Suchergebnisse und ungelesenen Zähler erhalten. Abgelehnte und unbestätigte Änderungen haben unterschiedliche Meldungen; eine unbestätigte Änderung kann bereits ausgeführt worden sein. Aktualisieren Sie vor einem weiteren Änderungsversuch. Eine bestätigte Änderung bleibt sichtbar, auch wenn die anschließende Aktualisierung fehlschlägt.

Die Navigationsleiste exportiert `mountProvider(scopedUiCtx)` für den öffentlichen Provider-Lader. Der Adapter registriert `notify:internal:readInbox` und `notify:internal:mutateInbox` mit den Stufen `request` und `reconcile`. Nur gültige Antworten und Bestätigungen des aktuellen Routenvertrags aktualisieren den Arbeitsspeicher. Die neueste gültige Leseanfrage hat Vorrang; laufende Änderungen verhindern überlappende Aktionen und verdrängen ältere Leseanfragen. Jede erfolgreiche Aktualisierung gleicht Inhalt, Reihenfolge und Lesestatus auch bei unveränderten Benachrichtigungs-IDs ab. Schreibanfragen werden nicht automatisch wiederholt.

Der gespeicherte Zustand und ausstehende UI-Ergebnisse gehören zur aktuellen Konto-, Token-, Seiten- und Provider-Lebensdauer. Abmeldung, Kontowechsel, Seitenmontage und Provider-Entfernung entziehen älteren Vorgängen ihre Gültigkeit. Entfernte Zeilen und geschlossene Bestätigungen können keine späteren Aktionen auslösen. Suchregistrierung, Ereignislistener, Zeitgeber und temporäres Panel werden mit ihrem Besitzer freigegeben. Es entsteht kein dauerhafter Posteingangs-Cache im Browser.

Das Arbeitsbereich-Tutorial öffnet weiterhin `#notification-toggle` und erklärt `.notification-panel`. Seine gemeinsame temporäre Lebensdauer schließt das Panel auch während einer ausstehenden Leseanfrage. Bei bestätigtem leerem Posteingang bleibt Löschen deaktiviert; bei Nichtverfügbarkeit erscheint „Erneut versuchen“ statt einer leeren Liste. Kontinuierliche Benachrichtigungen behalten ihr separates Popup sowie Aktionen, Korrelation und Ablaufverhalten. Kategorien und Zustellungseinstellungen werden hier nicht definiert.

Korrelationsauflösungen von Produzenten werden innerhalb der aktuellen Besitzerlebensdauer nacheinander und ohne Duplikate ausgeführt. Sie warten auf laufende Benutzeränderungen und die neueste Leseanfrage, bevor passende Benachrichtigungen entfernt werden. Eine unbestätigte Löschung wird niemals automatisch wiederholt.

## Ziele per Tastatur

Erreichen Sie einen Benachrichtigungslink mit Tab und öffnen Sie sein Ziel mit Enter. Eine ungelesene Benachrichtigung ohne Ziel hat die Schaltfläche „Benachrichtigung als gelesen markieren“; eine neue Meldung ohne Ziel bietet „Benachrichtigungen öffnen“. Schaltflächen verwenden das native Verhalten von Enter und Leertaste. Befehle, Entfernen und Schließen bleiben separate Bedienelemente mit sichtbarem Tastaturfokus. Beim Öffnen einer Meldung ohne Link bleibt der Posteingang offen.

Links behalten das Browserverhalten für Klicks mit Zusatztasten und der mittleren Maustaste bei. Diese Aktionen lassen den aktuellen Posteingang und Lesestatus unverändert. Gewöhnliche Aktivierung behält die bestehende Bestätigung und Navigation bei; ein geöffnetes Ziel beweist nicht, dass die Gelesen-Markierung erfolgreich war. Nur HTTP- und HTTPS-Ziele werden zu Links. Externe Ziele öffnen einen getrennten Browserkontext mit Schutz vor Zugriff durch das öffnende Fenster und ohne Referrer.

Das abbrechbare Ereignis `cognis:notification-action` gilt für gewöhnliche und modifizierte Linkaktivierungen. Der Eigentümer übernimmt gewöhnliche Klicks synchron, bevor er auf Posteingangsänderungen wartet, damit der öffentliche Router nicht doppelt navigiert. Bei ausstehenden oder nicht verfügbaren Zeilenaktionen werden Linkziele bis zur erfolgreichen Aktualisierung entfernt; veraltete Bedienelemente lehnen Aktivierungen ab. Das Arbeitsbereich-Tutorial behält seine Glocken- und Panelziele und erklärt Links, Gelesen-Schaltflächen, Tastaturbedienung und die rein lesende Wiederholung. Befehle, Ablauf und Korrelationslebensdauer kontinuierlicher Meldungen bleiben unverändert.
