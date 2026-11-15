# Kontolöschung per CLI

Der Befehl `user:delete` meldet bestätigte Löschung, Ablehnung und unbekannte Ergebnisse getrennt. Eine gesendete Löschung wird nie automatisch wiederholt.

## Anwendungsbeispiele

Führen Sie `cognisctl user:delete <username>` aus. Die bestehende interaktive Namensabfrage bleibt verfügbar. Eine fehlgeschlagene Vorabprüfung stoppt vor dem Senden von DELETE. Normaler bestätigter Erfolg zeigt die bisherige Löschübersicht und endet mit Status 0.

Wurde das Konto gelöscht, während die Bereinigung fehlschlug, meldet der Befehl die ausgeführte Löschung und die unvollständige Bereinigung. Wiederholen Sie die Löschung nicht zur Reparatur abhängiger Ressourcen; prüfen Sie den Serverfehler und das Wiederherstellungsverfahren der Komponente. Abgelehnte oder unbekannte Löschungen enden ebenfalls mit Status 1. Fehlertext erscheint auf stderr; stdout enthält keine Erfolgsübersicht.

## Technische Spezifikation

Die Löschung benötigt neben der exakten Bestätigung HTTP 200. Andere erfolgreiche HTTP-Statuswerte, einschließlich 201, 202 und 207, bleiben unbekannt und führen zu einem Fehlerstatus. Die öffentliche Option `expectedStatus` von `apiRequest` beschränkt den akzeptierten Erfolgsstatus nur für aufrufende Komponenten, die sie angeben. Ohne diese Option bleiben bisherige 2xx- und Fortschrittsantworten unverändert; die HTTP-Fehlerbehandlung wird nicht außer Kraft gesetzt.

### Ergebnisnachweise

Nur die exakte normale API-Antwort `{data:{deleted:true}}` gilt als Erfolg. Eine konsistente HTTP-500-Antwort `user_deletion_cleanup_incomplete` mit `data.deleted: true`, `data.outcome: committed` und `data.cleanup: incomplete` gilt als ausgeführte Löschung mit unvollständiger Bereinigung, nicht als normaler Erfolg.

Eine konsistente Ablehnung des zuständigen Anbieters behält ihre bisherige Code/Status-Kombination mit 400, 403 oder 404 und ergänzt `data.deleted: false` sowie `data.outcome: rejected`. Fehlende, veraltete oder nicht verfügbare Nachweise, fehlerhafte oder widersprüchliche Antworten, fehlende Bestätigungen, unlesbares JSON und Transportfehler gelten als unbekannt. Ein Status oder einzelnes Feld `deleted` beweist das Ergebnis nicht. Fehler der Vorabprüfung behalten ihre normale Diagnose, da keine Löschung gesendet wurde.

Ein gültig abgeschlossener Ablauf mit nicht verfügbaren Belegen behält HTTP 503 `account_policy_unavailable` und ergänzt `data.deleted: null`, `data.outcome: unknown`. Geworfene Fehler mit unbekanntem Ergebnis oder ungültige Abschlusswerte verwenden HTTP 500 `user_deletion_outcome_unknown`. Beide Formen bleiben für die CLI unbekannt, enden mit einem Fehlerstatus und lösen keine automatische Wiederholung aus; eine 503-Antwort beweist nicht, dass das Konto erhalten blieb.

Bei unbekanntem Ergebnis müssen Kontostatus und Serverprotokolle geprüft werden, bevor ein erneuter Versuch erwogen wird. Der Verlust einer Anfrage vor Zustellung und einer Antwort nach der Löschung sind für die CLI nicht unterscheidbar. Eine spätere Nicht-gefunden-Antwort beweist allein nicht, welche Operation gelöscht hat. Ein erneuter Befehlsaufruf ist eine neue manuelle Operation, keine automatische Wiederherstellung.

### Lokalisierung und Diagnose

Ergebnistext nutzt die deutschen, englischen, indonesischen und japanischen XML-Kataloge der CLI mit der normalen Sprachauswahl. Fehlender bevorzugter Text fällt auf Englisch zurück; fehlender englischer Text führt ausdrücklich zum Fehler. Interne Ausnahme- und Transportdetails werden nicht als Ergebniserklärung ausgegeben. Dies gilt auch für ausführliche Ausgabe; der ausführliche Modus macht Teilergebnisse oder unbekannte Ergebnisse nicht zu Erfolgen.
