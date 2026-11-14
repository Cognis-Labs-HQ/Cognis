# SMTP-Code-Zustellung

**Feature-Zweig:** feature-smtp-challenge-recovery

## Zustellung an die zugehörige Challenge binden

Bei Email Code bedeutet „wartend“, dass die Zustellung noch nicht erfolgt ist. Warten Sie auf den neuesten Code. Erst ein angenommener Neuversand ersetzt den alten Code; bei Ablehnung bleibt er erhalten. Nach einem Zustellfehler innerhalb der Frist erneut senden oder einen neuen Login beginnen. Login-Versuche gelten fünf, Einrichtungen zehn Minuten. Ein Einrichtungsabbruch betrifft nur diese Einrichtung. Fortsetzen versendet keine neue E-Mail und verlängert keine Frist.

Methodenadapter erhalten verpflichtend `lifetime: { id, expiresAt, signal }` für Einrichtung, Login-Challenge und Login-Prüfung. Aufrufer von `tfa:getLoginMethods(accountId, lifetime)` und `tfa:verifyLogin(accountId, methodId, payload, lifetime)` müssen migriert werden. Eine Einrichtung erhält vor dem ersten asynchronen Lesen ihre eigene Zehn-Minuten-Frist. Auth liefert die Login-Lebensdauer über `auth:getPendingLoginLifetime` Version 1. Abbruch, Ablauf, Speicherfehler, Deaktivierung, Zurücksetzen und Gateway-Bereinigung entwerten den genauen Vorgang. Alte Lesevorgänge bleiben auch nach erneuter Aktivierung ungültig. Vor Beginn des Schreibens lässt sich die Prüfung abbrechen; danach warten Abbruch und Zurücksetzen auf die weiterhin sichtbare Schreib- und Bereinigungsbarriere. Wiederherstellungscodes prüfen die Lebensdauer auch nach asynchronem Verbrauch. Neustart verliert ausstehende In-Memory-Challenges. Fortgesetzte Login-Beschreibungen sind Momentaufnahmen der Annahme, keine aktuellen Zustellbestätigungen.

## Erforderliche Anbietermigration

SMTP-TFA benötigt `notify:deliverEmail` Version 1 über die öffentliche Vertragsregistrierung. Es gibt keinen Ersatz durch `notify:sendEmail` oder eine ignorierte Option. Erst die Annahme eines neuen Codes ersetzt und beendet dessen vorherige Zustellung. Eine abgelehnte Annahme erhält den bisherigen Code. Ein späterer Zustellfehler macht den neuen Code ungültig; ein ausdrücklicher Neuversand innerhalb des gültigen Versuchs ermöglicht die Wiederherstellung. Parallele Neuversandaufrufe werden nur innerhalb desselben Vorgangs zusammengefasst. Unabhängige Einrichtungen und Logins haben getrennte IDs und Abbrüche. Codes gelten einmalig bis zur früheren Grenze aus Besitzerfrist und 15 Minuten. Verspätete Rückmeldungen reaktivieren sie nicht. Wartende und gesendete Nachrichten werden unterschiedlich angezeigt. Notification SMTP 0.5.5, SMTP TFA 1.1.3, TFA 1.3.12 und Auth 2.2.11 gemeinsam ausrollen; alternative Anbieter müssen den benannten Vertrag implementieren.

`auth:getPendingLoginLifetime` Version 1 liest ausschließlich `{ id, accountId, expiresAt, signal }` eines vorhandenen, primär authentifizierten Versuchs. Der Aufruf erstellt oder verlängert keine Berechtigung. Auth legt den Versuch vor der automatischen Faktorvorbereitung an, ohne Sitzung oder Profilaktivierung. Die unveränderliche Fünf-Minuten-Frist begrenzt die Zustellung. Verbrauch, Abbruch, Ablauf, Ersetzung der Fortsetzung, Logout und Bereinigung beenden Challenge-Ressourcen. Cookie-gebundene Fortsetzung, Schutz vor veralteten Versuchen und Fortsetzen ohne Neuversand bleiben erhalten. Erfolgreiche Faktorprüfung beendet die Challenge, nicht den getrennten abschließenden Sitzungsabschluss. Ohne diesen Vertrag verweigert TFA den Vorgang.

`notify:deliverEmail` Version 1 erwartet einen registrierten Zweck, Empfänger, Variablen sowie verpflichtend `signal: AbortSignal` und den absoluten Millisekundenwert `expiresAt`. Die vorhandenen Schritte validate/render/enqueue und die Zweck-Warteschlange werden wiederverwendet. Die Annahme liefert `{ receipt, completion }`; `completion` liefert den Endstatus `sent` oder `failed`. Wartende oder laufende Zustellung ist kein Versandnachweis. Abbruch, Ablauf oder Entfernung des Zwecks beendet Warteschlange und Transport; verspäteter Erfolg überschreibt keinen Fehler. Das bisherige Verhalten von `notify:sendEmail` bleibt erhalten. Die standardmäßigen zwei Greylist-Wartezeiten von je fünf Minuten enden bei begrenzten Zustellungen spätestens an der Frist des Besitzers. Bereits vom entfernten SMTP-Server angenommene Nachrichten lassen sich nicht zurückrufen.

## Abschließende Zustandsänderungen koordinieren

Abschlussvorgänge für Konto, Methode und Gateway sperren neue Vorgänge während Bereinigung und Speicherung. Überlappende Vorgänge besitzen jeweils eine eigene Sperre; der Abschluss eines Vorgangs öffnet keinen anderen. Eine fehlgeschlagene Registrierung bleibt ein Prüfungsfehler. Die Bereinigung wartet auf ihr Ende, ohne ein späteres Zurücksetzen oder Deaktivieren an dessen eigener Zustandsänderung zu hindern.

## Commits

- [c19e37a82295b037b6e5d5ed5661e43fcd61b95c](https://github.com/Cognis-Labs-HQ/Cognis/commit/c19e37a82295b037b6e5d5ed5661e43fcd61b95c)
- [97ee12b302ac96abde12abd21defe5b0301fd1a0](https://github.com/Cognis-Labs-HQ/Cognis/commit/97ee12b302ac96abde12abd21defe5b0301fd1a0)
- [9e50528ce82886865688fc082b8af3203be1a3aa](https://github.com/Cognis-Labs-HQ/Cognis/commit/9e50528ce82886865688fc082b8af3203be1a3aa)
