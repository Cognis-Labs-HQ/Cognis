# Anrufsignalisierung

Der Call-Adapter verwaltet raumbezogene Einladungen, Klingeln, Annehmen, Auflegen, Zeitüberschreitungen und die Übergabe an Browser-Anbieter. Messages stellt neutrale Raumaktions-Flows bereit; der Call-Adapter injiziert seine Steuerelemente und sein Verhalten in deren Stufen.

Ein Anruf beginnt in einer Klingelansicht, die Chatverlauf und Eingabebereich ersetzt, während der Thread-Kopf erhalten bleibt. Empfangende erhalten eine dauerhafte Calls-Benachrichtigung, deren Aktion „Annehmen“ den Raum mit dem Anruftoken öffnet. Nicht angenommene Anrufe laufen nach 45 Sekunden ab. Nach der Annahme ruft der Adapter `voip:startCall` mit `phase: connect` auf; der Anbieter gibt eine Komponenten- oder Navigationsaktion zurück. Eingebettete Meeting-Steuerelemente bleiben von der Call-Werkzeugleiste getrennt, deren Pfeil das Meeting in den Bild-im-Bild-Modus verschiebt und Messages wiederherstellt.

## Verwendungsbeispiele

Der Call-Adapter wird automatisch aktiviert, wenn Messages und ein Browser-Anbieter für `voip:startCall` verfügbar sind.

## Technische Spezifikation

Die Fähigkeit `social:callUi` verwaltet Einladungsstatus, 45-Sekunden-Zeitlimit, Antwortlinks in Benachrichtigungen, Komponentenmontage, Auflegen und Anbieterübergabe.

Eingehende Anrufe erscheinen nicht in der Liste der Benachrichtigungsglocke. Sie bleiben bis zur Annahme, Ablehnung oder zum Ablauf im Bereich für kurzlebige Benachrichtigungen und bieten eine grüne Annehmen- sowie eine rote Ablehnen-Schaltfläche. Während Messages geöffnet ist, wird der zugehörige Raum vorübergehend an den Anfang der Raumliste verschoben. Anrufende erhalten unterschiedliche Rückmeldungen bei Abbruch, Ablehnung, ausbleibender Antwort oder verweigerter Übergabe durch den Meeting-Anbieter.

Jeder Anrufübergang wird als Raumereignis im Messages-Verlauf gespeichert, sodass alle Teilnehmenden sehen, wer den Anruf gestartet, angenommen, abgebrochen oder abgelehnt hat und wann ein Anruf unbeantwortet blieb. Der Browser spielt unterschiedliche, wiederholte synthetisierte Klingeltöne für eingehende und ausgehende Anrufe, bis die Einladung angenommen, abgelehnt, abgebrochen oder abgelaufen ist.

Während die neueste Einladung klingelt, ist ihr Raumereignis eine interaktive Anrufkarte: Empfangende können im Gespräch annehmen oder ablehnen, während Anrufende den Klingelstatus sehen. Sobald sich der Anrufstatus ändert oder ein neuerer Anruf beginnt, wird der Verlaufseintrag zu einem einfachen Ereignis ohne Aktionen. Eingehende Anrufhinweise werden beim Start der Oberfläche aus der gespeicherten Benachrichtigung wiederhergestellt, und der Klingelton verwendet einen stärkeren wiederholten Impuls.

Das Verschieben einer angenommenen Komponente in Bild-in-Bild ist idempotent: Eine weitere Pfeilaktivierung erstellt das schwebende Fenster nicht erneut und ändert seine Größe nicht. Die erste Aktivierung blendet Pfeil und Inline-Bereich aus, stellt die Unterhaltung wieder her, aktualisiert sie und deaktiviert die Kameraaktion bis zum Schließen der Komponente. Aktive Anrufkarten verwenden eine schattierte Fläche und einen animierten Rand; abgeschlossene Ereignisse behalten keine Annehmen- oder Ablehnen-Steuerung.

Nach dem Verschieben einer Anrufkomponente in Bild-in-Bild wird sie in die dauerhafte Dokumentoberfläche versetzt und über Abbrüche der aufrufenden Seite sowie SPA-Routenbereinigungen hinweg beibehalten. Das ausdrückliche Schließen der Komponente führt weiterhin die vollständige Bereinigung aus und stellt den ursprünglichen Host wieder her, sofern dieser noch verbunden ist.

Beim Verschieben einer aktiven Komponente in Bild-im-Bild bleibt der Anbieter in seinem stabilen Komponenten-Host eingebunden. Der begrenzte Host wird zur schwebenden Oberfläche, beschneidet Anbieterinhalte auf seine Abmessungen und bietet optional eine halbtransparente Schließen-Schaltfläche, die dieselbe aktive Komponente zur Messages-Anrufoberfläche zurückführt.

Ein aktiver Anruf speichert die aktuell beigetretenen Konten. Der Anrufer und die erste antwortende Person reichen aus, um einen Gruppenanruf zu aktivieren; weitere eingeladene Personen können danach beitreten. Beim Abbau durch den Anbieter verlässt das lokale Konto den Anruf. Nachdem das letzte beigetretene Konto den Anruf verlassen hat, wird er freigegeben, sodass die Kameraaktion eine neue Einladung erstellen und alle anderen Raumteilnehmer benachrichtigen kann.

Komponentenanbieter können die Auflösung erst abschließen, nachdem der ursprüngliche Klick beendet ist. Daher erfasst die Anrufoberfläche beim Starten oder Antworten synchron die einmal verwendbare Komponentenstartberechtigung des Kerns und übergibt sie an die spätere Komponenteneinbindung. Die Berechtigung läuft nach 60 Sekunden ab und kann kein zweites Fenster autorisieren.

Anbieter können in ihrer Komponentenaktion `context.allowNavigation: true` setzen und mit `minSize` die Mindestgröße der PiP-Oberfläche angeben. Die Anrufoberfläche übergibt diese Berechtigung beim Start der Komponente und verschiebt den PiP-Host in die beständige Shell, aktiviert die Navigationserhaltung jedoch erst nach dem Wechsel des Anrufs in Bild-im-Bild. Beim Zurückholen zu Messages wird der vorhandene Anbieter-Host wieder angefügt und die routengebundene Bereinigung für die nächste Navigation wiederhergestellt.

Eingehende Anrufe verwenden eine authentifizierte benutzerbezogene `/ringing`-Lease. Browseroberflächen erneuern die Lease während des Klingelns und geben sie nach der Auflösung frei, sodass nur ein Tab oder Hinweis den Klingelton besitzt. Annehmen oder Ablehnen löst Benachrichtigung und Messages-Hinweis gemeinsam über dieselbe Korrelation auf.

Der Call-Host bewahrt den Anbieter-Kontext und kennzeichnet gestartete Anrufkomponenten ausdrücklich als `voipCall`. Damit entspricht er dem Jitsi-Meet-Komponentenvertrag, sodass bei kurzlebigen PiP-Anrufen kein Meeting-Chat angezeigt wird.

Die Bereinigung schwebender Fenster prüft die gespeicherte Zielhierarchie und wechselt bei einer abgelehnten zustandserhaltenden `moveBefore`-Operation zu einer normalen DOM-Verschiebung. Sind beide Verschiebungen strukturell ungültig, bleibt das Portal zur Entfernung durch seinen Besitzer bestehen, statt eine unbehandelte Ablehnung auszulösen.

Solange eine Anbieterkomponente in Messages angedockt bleibt, wechselt der aktive Anruf-Thread zu einem zweizeiligen Raster; Call-Bühne, Komponenten-Host und Komponentenfenster füllen die verbleibende Höhe der Widget-Karte. PiP verwendet weiterhin seine unabhängig begrenzten schwebenden Abmessungen.

Der `/ringing`-Lease-Endpunkt ist nach dem Ende eines Anrufs idempotent: Verspätete Verlängerungen und Freigaben liefern ein erfolgreiches Ergebnis ohne Klingeln statt eines Fehlers wegen eines fehlenden Anrufs. Wenn ein Benutzer nach der Navigation zu einer anderen Seite versucht, einen Bild-im-Bild-Anruf zu schließen, fragt Calls, ob er zu Messages zurückkehren, auflegen oder abbrechen möchte. Bei der Rückkehr wird per SPA navigiert, der vorhandene Anbieter-Host ohne erneutes Einbinden des Meetings angefügt und anschließend Bild-im-Bild geschlossen.

Der Bild-im-Bild-Schließhandler ermittelt den aktiven Anruf vor dem Anzeigen oder Ausführen der Schließauswahl aus seinem Stage-Lebenszyklus und vermeidet so nach der Navigation einen Fehler durch einen ungültigen Gültigkeitsbereich. Das Schließsteuerelement verwendet wieder die Standardabmessungen des schwebenden Fensters und den destruktiven Konsequenzstil `btn-cancel`.

Das Verlassen eines Anrufs ist ein idempotenter Abbauvorgang: Wenn der Meeting-Anbieter schließt, nachdem der Server den Anruf bereits beendet hat, gibt der Endpunkt den beendeten Anruf zurück und die Oberfläche schließt die Bereinigung ohne Fehlermeldung ab. Nachdem ein Bild-im-Bild-Anruf zu Messages zurückgekehrt ist, prüft die Routenbereinigung vor dem Verwerfen, ob der Anruf erneut in Bild-im-Bild gewechselt ist, sodass auch der zweite Wechsel über eine SPA-Navigation hinweg bestehen bleibt.

Anrufrouten prüfen bei jeder lesenden oder zustandsändernden Operation die aktuelle, nicht archivierte Messages-Mitgliedschaft erneut. Teilnehmerbezeichnungen werden als Text eingefügt, aktive Gruppenteilnehmer treten dem Signalisierungszustand ausdrücklich bei, abgelehnte Klingelverlängerungen stoppen den lokalen Ton und abgebrochene ausgehende Abfragen beenden die Einladung. Die Anbieterübergabe behält die Raumart bei. Eingehende Benachrichtigungstexte werden als anbieterseitig gelieferte lokalisierte Metadaten übertragen, die der neutrale interne Benachrichtigungsrenderer anhand der Sprachpriorität des Browsers auswählt.

Der Anrufverlauf nutzt die allgemeine Capability `social:messages:appendRoomEvent` und erweitert den Flow `messages:formatRoomEvent` um seine lokalisierte Ereignisformatierung. Namen, Details, Übersetzungen und Darstellung von Anrufereignissen bleiben dadurch Eigentum des Call-Adapters und gelangen nicht in den Messages-Speicher oder -Renderer.

Nur beigetretene Teilnehmende dürfen einen aktiven Anruf beenden. Eingeladene Personen, einschließlich des ursprünglichen Anrufers nach dem Verlassen, treten vor dem erneuten Verbinden dem Signalisierungsstatus bei. Fehlgeschlagene Verlassen-Anfragen behalten den Beitrittsstatus und werden erneut versucht, bevor die lokale Stufe verworfen wird. Calls – nicht Notifications – übersetzt allgemeine Benachrichtigungseingänge in den Raum-Anrufstatus. Die eingebettete Symbolleiste enthält nur die PiP-Steuerung und wiederholt den Fenstertitel des Anbieters nicht.
