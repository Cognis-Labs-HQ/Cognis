# Verfügbarkeitsstatus

## Verfügbarkeit auf einen Blick

Avatare zeigen jetzt in der Navigationsleiste, in Profilvorschauen, Nachrichten und Besprechungen den Status frei, beschäftigt oder vorläufig an.

## Status manuell festlegen

Kalendertermine setzen deinen Status, wenn sie beginnen oder im aktuellen Zeitraum erstellt werden. Danach kannst du den aktiven Termin im Profilmenü übersteuern.

## Verfügbarkeit im Profilmenü steuern

Das Profilmenü öffnet sich jetzt beim Darüberfahren oder Anklicken und bleibt sichtbar, bis Benutzer an eine andere Stelle klicken. Die erste Zeile ist eine rahmenlose Statusauswahl mit passenden Farbpunkten für Frei, Beschäftigt und Vorläufig; Umrisse beim Darüberfahren erleichtern das Verfolgen jedes Menüeintrags.

## Statusdetails überall verfügbar

Beim Darüberfahren über die Statusleuchte eines Avatars wird der Status angezeigt. Komponenten können die kalenderabhängige Verfügbarkeit eines Benutzers außerdem über eine ctx-Fähigkeit abfragen.

## Statusoptionen verschieben das Menü nicht mehr

Beim Öffnen der Statusauswahl erscheinen die Optionen jetzt links neben dem Profilmenü, sodass die darunterliegenden Profilaktionen an ihrer Position bleiben.

## Kalenderstatus steuern

In den Benutzereinstellungen gibt es unter „Allgemein“ jetzt eine Option, die verhindert, dass Kalendertermine die Verfügbarkeit ändern.

## Inaktivität und erweiterbare Kalenderstatus

Der Profiladapter stellt die Statusanzeige des aktuellen Benutzers grau dar, wenn die Anwesenheitserkennung Inaktivität meldet, und stellt sie bei neuer Aktivität sofort wieder her. „Inaktiv“ wird automatisch vergeben und kann nicht manuell ausgewählt werden. Kalenderstatus stammen aus der ctx-Fähigkeit des Profiladapters; freie Termine haben einen transparenten Hintergrund.

## Sichtbarkeitsabhängig geteilter Status

Profilseiten und Vorschauen zeigen den Status anderer Benutzer nun gemäß deren Profilsichtbarkeit: In der Community ist er für alle sichtbar, bei „Freunde“ für Follower und bei „Privat“ für Personen, denen der Benutzer folgt. Beim Verlust des Browserfokus wird sofort „Inaktiv“ gemeldet, aktive Sitzungen senden regelmäßige Signale und Vorschauavatare bleiben unter der Statusleuchte abgerundet.

## Einheitliche Hintergründe für Kalenderstatus

Die Hintergründe für „Beschäftigt“, „Frei“ und „Vorläufig“ gelten nun einheitlich für Terminkarten in allen Kalenderansichten, bevorstehende Kalendertermine, ausstehende Zusammenfassungen und bevorstehende Termine im Dashboard. Freie Karten bleiben transparent, während vorläufige Karten einen gestreiften Hintergrund erhalten, ohne ihren Rahmen zu verändern.

## Zuverlässige Aktualisierung des Terminstatus

Beim Aktualisieren des Status eines bestehenden Kalendertermins wird der Rückfallwert nun aus diesem Termin ermittelt, statt auf einen nicht verfügbaren Routenzustand zuzugreifen. Dadurch führt eine reine Status-PATCH-Anfrage nicht mehr zu einem internen Serverfehler.

## Kalenderstile werden nur bei Bedarf geladen

Kalenderstatus-Stile werden nun über das Stylesheet der Kalenderseite oder durch eine ausdrückliche Dashboard-Anfrage geladen. Nicht verwandte Seiten wie die Administration fordern über den globalen Kalender-Navigationsclient keine Kalenderstatus-CSS mehr an.

## Statushintergründe bleiben beim Darüberfahren erhalten

Beim Darüberfahren über Kalenderterminkarten wird der Hintergrund für „Beschäftigt“, „Frei“ oder „Vorläufig“ nicht mehr ersetzt. Bei bevorstehenden Terminen bleibt der Statuseffekt innerhalb der abgerundeten Terminkarte, während die Rückmeldung beim Darüberfahren auf deren Rahmen beschränkt ist.

## Kompakte bevorstehende Termine und Kalenderüberschrift

Bei bevorstehenden Terminen wird der Statushintergrund nun auf die umrandete Terminschaltfläche statt auf den übergroßen Listencontainer angewendet; statusspezifische Hover-Hintergründe überschreiben den allgemeinen Toolbar-Hover. Die Überschrift „Meine Kalender“ reserviert nun eine eigene Spalte für die Schaltfläche „Neu“, sodass sich die Steuerelemente nicht mehr überlagern.

## Hover hebt nur den Terminakzent hervor

Kalenderstatus-Hintergründe setzen sich nun ausdrücklich gegen allgemeine Schaltflächen-Hover-Hintergründe durch. Beim Darüberfahren bleiben Kartenhintergrund und äußerer Rahmen unverändert; nur der senkrechte Balken in der Kalenderfarbe wird hervorgehoben.
