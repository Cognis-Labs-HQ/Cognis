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

- [1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f](https://github.com/Cognis-Labs-HQ/Cognis/commit/1b9d020c3d8820e1b5838fbd4c54e51e626fbd1f)
- [f3f810aa71ab0bbd7bdcb841be01ee5979834239](https://github.com/Cognis-Labs-HQ/Cognis/commit/f3f810aa71ab0bbd7bdcb841be01ee5979834239)
- [d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6](https://github.com/Cognis-Labs-HQ/Cognis/commit/d43180248e4feb9d580f1fe7ce532c9dd7a6fbf6)
- [6fcc59f6db105cc068acb34e57837f7d14e66519](https://github.com/Cognis-Labs-HQ/Cognis/commit/6fcc59f6db105cc068acb34e57837f7d14e66519)
- [485f7e727dc7fffc158bad34a0f7ccec4dd4174e](https://github.com/Cognis-Labs-HQ/Cognis/commit/485f7e727dc7fffc158bad34a0f7ccec4dd4174e)
