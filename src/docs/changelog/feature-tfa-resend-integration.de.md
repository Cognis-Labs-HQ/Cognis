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

- [3c14073f0afcd5692c3fe79436c29c2bc070a56f](https://github.com/Cognis-Labs-HQ/Cognis/commit/3c14073f0afcd5692c3fe79436c29c2bc070a56f)
- [1a16d312a9c6f8beabb292d5514252b8ef85ca4c](https://github.com/Cognis-Labs-HQ/Cognis/commit/1a16d312a9c6f8beabb292d5514252b8ef85ca4c)
- [104bba557f1a537d2e12bc49731bc82f0c432d6a](https://github.com/Cognis-Labs-HQ/Cognis/commit/104bba557f1a537d2e12bc49731bc82f0c432d6a)
- [ec94ee0541bca4e35be17f88b834c29c8c373300](https://github.com/Cognis-Labs-HQ/Cognis/commit/ec94ee0541bca4e35be17f88b834c29c8c373300)
- [5761ff70e99a8cf914105180a9ecc9d58b95f6a8](https://github.com/Cognis-Labs-HQ/Cognis/commit/5761ff70e99a8cf914105180a9ecc9d58b95f6a8)
- [3f45fbb17e189c84904274bdda0509188db8ee6a](https://github.com/Cognis-Labs-HQ/Cognis/commit/3f45fbb17e189c84904274bdda0509188db8ee6a)
