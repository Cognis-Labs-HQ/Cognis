# Anrufsignalisierung

Der Call-Adapter verwaltet raumbezogene Einladungen, Klingeln, Annehmen, Auflegen, Zeitüberschreitungen und die Übergabe an Browser-Anbieter. Messages verwendet ausschließlich seine Capability `social:callUi`.

Ein Anruf beginnt in einer Klingelansicht, die Chatverlauf und Eingabebereich ersetzt, während der Thread-Kopf erhalten bleibt. Empfangende erhalten eine dauerhafte Calls-Benachrichtigung, deren Aktion „Annehmen“ den Raum mit dem Anruftoken öffnet. Nicht angenommene Anrufe laufen nach 45 Sekunden ab. Nach der Annahme ruft der Adapter `voip:startCall` mit `phase: connect` auf; der Anbieter gibt eine Komponenten- oder Navigationsaktion zurück. Eingebettete Meeting-Steuerelemente bleiben von der Call-Werkzeugleiste getrennt, deren Pfeil das Meeting in den Bild-im-Bild-Modus verschiebt und Messages wiederherstellt.

## Verwendungsbeispiele

Der Call-Adapter wird automatisch aktiviert, wenn Messages und ein Browser-Anbieter für `voip:startCall` verfügbar sind.

## Technische Spezifikation

Die Fähigkeit `social:callUi` verwaltet Einladungsstatus, 45-Sekunden-Zeitlimit, Antwortlinks in Benachrichtigungen, Komponentenmontage, Auflegen und Anbieterübergabe.
