# Anrufsignalisierung

Der Call-Adapter verwaltet raumbezogene Einladungen, Klingeln, Annehmen, Auflegen, Zeitüberschreitungen und die Übergabe an Browser-Anbieter. Messages verwendet ausschließlich seine Capability `social:callUi`.

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
