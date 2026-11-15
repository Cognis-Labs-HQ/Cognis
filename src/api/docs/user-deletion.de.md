# Ergebnisse der Kontolöschung

Das Löschen eines Kontos und der Abschluss der abhängigen Bereinigung sind getrennte Ergebnisse. Eine fehlgeschlagene Antwort beweist allein nicht, dass das Konto noch vorhanden ist.

## Anwendungsbeispiele

Senden Sie `DELETE /api/v1/users/:username` mit den üblichen Zugangsdaten für eine berechtigte Anfrage. Die normale Antwort bleibt HTTP 200 mit `{"data":{"deleted":true}}`.

Wenn die Löschung bestätigt wurde, aber ein nachfolgender Flow-Hook fehlschlägt, lautet die Antwort HTTP 500 mit `{"error":{"code":"user_deletion_cleanup_incomplete"},"data":{"deleted":true,"outcome":"committed","cleanup":"incomplete"}}`. Wiederholen Sie die Löschung nicht, um die Bereinigung zu reparieren. Prüfen Sie den protokollierten Serverfehler und das Wiederherstellungsverfahren der betroffenen Komponente.

## Technische Spezifikation

Ein normal zurückgegebener Ablaufwert muss die erwartete Flow-ID, ein Datenobjekt und die exakt erfasste Ergebnis-Map-Identität enthalten. Fehlende oder fehlerhafte Abschlusswerte bleiben unbekannt, auch wenn ein Anbieternachweis existiert. Die Abschlussprüfung ist von abgelehnten Flow-Promises getrennt; lokale Fehler bei der Ergebnisverarbeitung beweisen keinen Bereinigungsfehler.

### Bestätigt, abgelehnt, unbekannt

Eine vom zuständigen Anbieter bestätigte Ablehnung liefert ihren Status 400, 403 oder 404 mit dem bisherigen sicheren `error.code` und `error.message`, `data.outcome: rejected` und `data.deleted: false`. So bleibt eine Ablehnung von einer teilweise ausgeführten Operation unterscheidbar. Prüfungen vor Beginn des Löschablaufs behalten ihre bisherigen Antwortverträge.

Ein strukturell gültig abgeschlossener Ablauf, dessen gebundener Nachweisleser nicht verfügbare Belege meldet, behält HTTP 503 mit den bisherigen sicheren Feldern `error.code` und `error.message`, beide `account_policy_unavailable`. Hinzu kommen `data.deleted: null` und `data.outcome: unknown`. Dies umfasst nicht verfügbare Richtlinien oder Berechtigungsnachweise sowie fehlende, ungültige oder veraltete Belege. Diese nicht unterscheidbaren Fälle können vor oder nach der Kontolöschung auftreten; 503 beweist daher niemals eine Ablehnung oder `deleted: false`.

Ein geworfener Ablauffehler ohne bestätigte Belege, ein fehlender oder fehlerhafter Abschlusswert oder ein nicht passendes Konto beziehungsweise eine nicht passende Aktion im Persistenznachweis liefert dagegen HTTP 500 mit `error.code: user_deletion_outcome_unknown` und denselben null/unknown-Daten. Auch ein abgeschlossener Ablauf beweist ohne passenden maßgeblichen Nachweis keinen Erfolg.

Eine verlorene oder unlesbare Antwort lässt das Ergebnis für den Aufrufer unbekannt, selbst wenn der Server bereits gelöscht hat. Prüfen Sie Konto und Betriebsprotokolle, bevor Sie das weitere Vorgehen festlegen. Das spätere Fehlen des Kontos beweist allein nicht, welche Anfrage es entfernt hat. Es gibt weder automatische Wiederholung noch erneute Bereinigung.

### Nachweis und Wiederherstellung

Die API erfasst die Identität der Ergebnis-Map des echten Aufrufs durch einen aufrufsbezogenen Handler vor den registrierten Autorisierungshooks. Die bestehenden Hooks behalten ihre Reihenfolge und werden normal ausgeführt. Nur der vorab gebundene, aktuelle Leser `auth:deprovisionOutcome` kann ein Ergebnis für die ursprüngliche Eingabe und die exakte Aufrufidentität bestätigen. Öffentliche Stufenwerte, kopierte Ergebnisse und Nachweise anderer Anfragen beweisen keine Löschung.

Die normale 200-Antwort bestätigt die Löschung nach Rückkehr des Ablaufs; sie gibt keine zusätzliche Zusicherung über sämtliche abhängigen Arbeiten. Ein fehlgeschlagener Ablauf mit passendem Persistenznachweis bestätigt die Löschung und meldet unvollständige Bereinigung. Die API protokolliert eine sichere Fehlerkategorie, schreibt genau eine strukturierte Antwort und wirft die ursprüngliche Ausnahme erneut, damit die bestehende Komponentenwiederherstellung Zuordnung und Erfassung beibehält. Interne Ausnahmedetails werden nie zurückgegeben.

### Kompatibilität

Normale Erfolgsantworten und Ablehnungen vor dem Ablauf bleiben unverändert. Bestätigte Ablehnungen mit 400/403/404 behalten ihre sicheren Fehlerfelder und ergänzen `data.outcome: rejected`. Gültig abgeschlossene Abläufe mit nicht verfügbaren Belegen behalten die bisherigen 503-Fehlerfelder und ergänzen ein unbekanntes Ergebnis. Geworfene Fehler mit teilweisem oder unbekanntem Ergebnis sowie ungültige Abschlusswerte verwenden HTTP 500. Verbraucher müssen das ausdrückliche Ergebnis prüfen, statt allein aus dem Status auf eine Löschung zu schließen.
