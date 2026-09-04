# Suche für neue Räume auf Benutzer beschränken

**Feature-Zweig:** work

## Ausschließlich Benutzer bei der Raumsuche

Die Auswahl „Neuer Raum“ in Messages übergibt nun die Benutzerkategorie und den Typfilter der gemeinsamen Suche. Dies entspricht den von Jitsi Meet verwendeten Parametern und schließt andere Ergebnistypen aus.

## Reaktionsfähiger Suchstatus

Die Suche ersetzt den Hinweis zur Mindestlänge jetzt durch einen Ladestatus, sobald eine gültige Anfrage läuft. Fehlgeschlagene oder abgelaufene Anfragen zeigen einen ausdrücklichen Fehler, statt veraltete Ergebnisse oder einen nicht reagierenden Hinweis stehen zu lassen.

## Synchronisierte Hinweise für eingehende Anrufe

Eingehende Anrufe erscheinen jetzt in einer Leiste direkt über dem Messages-Thread-Kopf. Annehmen und Ablehnen lösen die korrelierte Benachrichtigung und den Hinweis im Chat gemeinsam auf; eine benutzerbezogene Klingel-Lease verhindert doppelte Klingeltöne aus mehreren Tabs oder Oberflächen.

## Sichtbare Anrufleiste und fokussiertes PiP

Der Status eingehender Anrufe aktualisiert jetzt den ausgewählten Raum, sodass dessen Aktionsleiste direkt unter dem Thread-Kopf erscheint, während die Benachrichtigung sichtbar bleiben kann. Gestartete VoIP-Komponenten werden ausdrücklich mit dem Jitsi-Meet-Kontext `voipCall` markiert, damit der Meeting-Chat nicht in der PiP-Oberfläche erscheint.

## Sicherer PiP-Abbau

Beim Schließen eines VoIP-Anrufs im PiP-Modus wird jetzt die ursprüngliche Portalhierarchie geprüft und sicher ausgewichen, wenn der Browser eine zustandserhaltende atomare Verschiebung ablehnt. Der Komponentenabbau endet ohne unbehandelten `HierarchyRequestError`.

## Angedockte Anrufbühne in voller Höhe

Angedockte Anbieteranrufe nutzen jetzt die gesamte verbleibende Höhe der Messages-Widget-Karte. Der aktive Thread reduziert sich auf Kopf- und Anrufbühnenzeile; Bühne, Komponenten-Host und Komponentenfenster füllen die verfügbare Inhaltszeile vollständig.

## Zuverlässige Klingelbereinigung und Bild-im-Bild-Rückkehr

Verspätete Klingel-Lease-Anfragen liefern nach dem Ende eines Anrufs nun erfolgreich ein Ergebnis ohne Klingeln. Beim Schließen eines Anrufs aus Bild-im-Bild nach einer SPA-Navigation stehen die folgerichtig gestalteten Aktionen „Zu Messages zurückkehren“, „Auflegen“ und „Abbrechen“ zur Auswahl. Die Rückkehr navigiert zum Anrufraum und stellt die vorhandene Anbieterkomponente ohne erneutes Einbinden wieder her.

## Stabiles Bild-im-Bild-Schließsteuerelement

Die Bild-im-Bild-Schließaktion behält den aktiven Anruf nun in ihrem Stage-Lebenszyklus und beseitigt dadurch den `ReferenceError` nach einer Navigation. Das Schließsteuerelement verwendet wieder die Standardgröße des schwebenden Fensters und trägt nun die destruktive Klasse `btn-cancel`.

## Idempotentes Verlassen und wiederholte Bild-im-Bild-Beständigkeit

Ein verspäteter Abbau durch den Anbieter meldet keinen Fehler mehr, wenn der Server den Anruf bereits beendet hat. Das Verlassen ist nun idempotent und die Bereinigung unterdrückt den bekannten Wettlauf mit einem nicht mehr verfügbaren Anruf. Nach der Rückkehr zu Messages bleibt der Anruf auch beim zweiten Wechsel in Bild-im-Bild über die nächste SPA-Navigation hinweg erhalten.

## Commits

- https://github.com/Cognis-Labs-HQ/Cognis/commit/6c387ba7c86b8218a9dc9b43211e5f0a95845a1d
- https://github.com/Cognis-Labs-HQ/Cognis/commit/aa9c83fcc501bfede1e9d392a2dbdd9e7a6e943e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/87e5e5e0d7ee3403d421fbe099e94425932a3a4e
- https://github.com/Cognis-Labs-HQ/Cognis/commit/d3d242f8921775d346b655c2699d3e174c6e4373
- https://github.com/Cognis-Labs-HQ/Cognis/commit/fa2b5983f609ce6932d5ded0aa5f3c24afead9ca
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e2b9683158388267faea8ede560a681c45518ba9
- https://github.com/Cognis-Labs-HQ/Cognis/commit/738a98d449247b89ce94cfda908042dbe8c28043
- https://github.com/Cognis-Labs-HQ/Cognis/commit/ea5a087cdcc7d7cce9ece27fff4d90353c7e8fe7
- https://github.com/Cognis-Labs-HQ/Cognis/commit/5e8996297422cc379e6747e980fcd613a482716f
- https://github.com/Cognis-Labs-HQ/Cognis/commit/e7560cabcb987acf49dbbfdc74a1135755ce3713
