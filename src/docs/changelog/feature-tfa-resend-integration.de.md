# TFA-Neuanforderung

**Feature-Zweig:** feature-tfa-resend-integration

## Jede Neuanforderung erklären

Bei einer abgelaufenen Anmeldung wird erklärt, wie sie neu gestartet wird. Andere abgelehnte oder ungewisse Ergebnisse zeigen einen lokalisierten Fehler, statt lautlos zum Link zurückzukehren. Gültige Antworten ohne Zustellungsbestätigung zeigen eine neutrale Rückmeldung und behaupten keinen E-Mail-Versand.

## Wartezeiten beibehalten

Verbindliche Fristen, Sperren laufender Anfragen und ausdrückliche Wiederholungen bleiben erhalten. Fehlerhafte Erfolgsantworten behalten die Vorgaben des ausgegebenen Codes. Es gibt weder automatische Neuanforderungen noch Änderungen der Serverregeln oder Zustellungsgarantien.

## Ergebnisse an die Sitzung binden

Konto- und Sitzungswechsel stoppen alte Neuanforderungen und Rückmeldungen. Fehlende erforderliche Übersetzungen bleiben ausdrückliche Fehler, statt durch eine andere Meldung ersetzt zu werden.

## Ressourcen verlassener Abfragen freigeben

Beim Verlassen, Ersetzen oder erfolgreichen Abbrechen der Anmeldung werden Listener und Timer zum erneuten Senden sofort entfernt, ohne auf eine offene Anfrage zu warten. Nach fehlgeschlagenem Abbruch bleibt die Abfrage nutzbar. Die UI-Bereinigung verspricht nicht, abgeschickte Anfragen rückgängig zu machen.

## Unterbrochene Neuanforderungen fortsetzen

Laufende Neuanforderungen zeigen eine übersetzte Beschäftigt-Beschriftung. Ein fehlgeschlagener Abbruch stellt Ergebnis und verbleibende Serverfrist ohne automatische Wiederholung wieder her. Auth 2.2.14 und TFA 1.3.14 verlangen denselben versionierten Browser-Lebenszyklusvertrag; JavaScript-Dateien und Assets gemeinsam bereitstellen und ältere Anmelde-Tabs neu laden.

## Jede Versandbestätigung einmal anzeigen

Bei der Rückkehr zu einer Methode wird jede abgeschlossene Neuanforderung genau einmal bestätigt; erneutes Wechseln wiederholt diese Bestätigung nicht.

## Commits

- [781658c2c3040c882e8ccbb4c1a7f2f5a1dfcb5a](https://github.com/Cognis-Labs-HQ/Cognis/commit/781658c2c3040c882e8ccbb4c1a7f2f5a1dfcb5a)
