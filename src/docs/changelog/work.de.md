# Suche für neue Räume auf Benutzer beschränken

**Feature-Zweig:** work

## Ausschließlich Benutzer bei der Raumsuche

Die Auswahl „Neuer Raum“ in Messages übergibt nun die Benutzerkategorie und den Typfilter der gemeinsamen Suche. Dies entspricht den von Jitsi Meet verwendeten Parametern und schließt andere Ergebnistypen aus.

## Reaktionsfähiger Suchstatus

Die Suche ersetzt den Hinweis zur Mindestlänge jetzt durch einen Ladestatus, sobald eine gültige Anfrage läuft. Fehlgeschlagene oder abgelaufene Anfragen zeigen einen ausdrücklichen Fehler, statt veraltete Ergebnisse oder einen nicht reagierenden Hinweis stehen zu lassen.

## Synchronisierte Hinweise für eingehende Anrufe

Eingehende Anrufe erscheinen jetzt in einer Leiste direkt über dem Messages-Thread-Kopf. Annehmen und Ablehnen lösen die korrelierte Benachrichtigung und den Hinweis im Chat gemeinsam auf; eine benutzerbezogene Klingel-Lease verhindert doppelte Klingeltöne aus mehreren Tabs oder Oberflächen.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
