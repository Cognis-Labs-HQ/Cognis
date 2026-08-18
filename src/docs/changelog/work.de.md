# Zuverlässige Modulsuche

## Ungültige Repositorys überspringen

Der Modul-Marktplatz ignoriert jetzt Repositorys, die kein vollständiges und gültiges Modulmanifest bereitstellen. Ein unabhängiges Repository oder eine nicht erreichbare Quelle kann das Laden der Modulseite nicht mehr verhindern.

## Ersatz für fehlende Symbole

Modulkarten ersetzen jetzt nicht verfügbare externe Grafiken durch ein theme-kompatibles Fragezeichensymbol, ohne das Laufzeitfehlerfenster zu öffnen.

## Modulquellen aktualisieren

Die Modulseite bietet jetzt neben den Modulquellen eine Schaltfläche zum Aktualisieren, die alle konfigurierten Anbieter erneut abfragt und den sichtbaren Katalog neu aufbaut.

## Quellen verwalten und schrittweise entdecken

Modulquellen werden jetzt in einer eigenen Listen- und Bearbeitungsansicht geöffnet. Die vertrauenswürdige Standardorganisation bleibt sichtbar und schreibgeschützt, während benutzerdefinierte Quellen hinzugefügt, bearbeitet oder entfernt werden können. Die Modulseite erscheint sofort mit bekannten Modulen und ergänzt Funde unabhängig voneinander, sobald die jeweilige konfigurierte Quelle antwortet.

## Zweige auswählen und Updates erkennen

Marktplatzdetails zeigen jetzt alle Repository-Zweige und wählen automatisch den Standardzweig. Installationen speichern den gewählten Zweig und Commit, sodass Modulkarten und Details eine Aktualisierung anbieten, sobald sich dieser Zweig weiterentwickelt.

## Marketplace-Grafiken sicher bereitstellen

Marketplace-Grafiken werden nun vom Server abgerufen und über nicht erratbare URLs derselben Herkunft bereitgestellt. Fehlende Grafiken verwenden das mitgelieferte Fragezeichen-Symbol, ohne die Content Security Policy zu lockern.

## Empfohlene Module kuratieren

Der Empfehlungsstatus stammt nun aus einer von Administratoren konfigurierbaren, veröffentlichten UUID-Liste statt aus Modulmanifesten. Die Marketplace-Einstellungen enthalten Empfehlungs- und Quellenkonfiguration.

## Modulinstallation abschließen

Installierte Module werden sofort in die Laufzeit importiert und bleiben deaktiviert, bis ein Administrator sie aktiviert. Marketplace-Bilder laden über öffentliche, nicht erratbare URLs derselben Herkunft.

## Marketplace-Details verfeinern

Lizenzen werden getrennt von Tags angezeigt, Details nutzen die gesamte Ergebnisbreite und kompakte SVG-Steuerelemente ersetzen textlastige Zurück- und Aktualisierungsaktionen.

## Installation und Aktivierung trennen

Ein installiertes Modul bleibt nun deaktiviert, bis ein Administrator es ausdrücklich aktiviert. Beim Aktivieren oder Deaktivieren werden die Navbar-Plugins im Browser sofort aktualisiert, sodass neue Navigationseinträge ohne Neuladen erscheinen.

## Marketplace-Steuerelemente gestalten

Zurück- und Aktualisierungssteuerung verwenden nun eigene helle und dunkle SVG-Dateien, die zum aktiven Dashboard-Design passen.

## Entdeckte Module verfügbar halten

Marketplace-Manifeste werden je konfigurierter Quelle zwischengespeichert. Nach der Deinstallation kehrt ein Modul sofort zu Verfügbar zurück, vorübergehende Quellfehler behalten den Eintrag und ein Modul verschwindet erst, wenn alle konfigurierten Quellen seine Abwesenheit erfolgreich bestätigen.

## Core aus Modulen heraushalten

Cognis Core wird nicht mehr in der Modulverwaltung zurückgegeben, da der Plattformkern kein installierbares Modul ist.

## Angegebene Lizenzen prüfen

Lizenzmetadaten werden nur angezeigt, wenn eine erkannte Lizenzdatei im Repository-Stamm vorhanden ist. Die Installationsprüfung lehnt Lizenzangaben ohne diesen Repository-Nachweis ab.

## Zeit für Modulinstallationen

Marketplace-Installationen verwenden nun ein zehnminütiges Anfragefenster, damit das Klonen und Prüfen größerer Repositorys wie Jitsi Meet nicht am allgemeinen API-Zeitlimit von dreißig Sekunden scheitert.

## Zuerst alle Module anzeigen

Der Modulstatusfilter enthält nun Alle und wählt diese Ansicht standardmäßig aus, sodass installierte, verfügbare und empfohlene Module beim Öffnen gemeinsam erscheinen.

## Veröffentlichungen mit direkter Rückmeldung installieren

Die Modulsuche erfasst nun Repository-Tags zusätzlich zu Branches; die Detailauswahl verwendet weiterhin standardmäßig den Standard-Branch des Repositorys. Schaltflächen für Lebenszyklusaktionen zeigen einen integrierten Fortschrittsindikator, und Installationen verwenden ein begrenztes Zeitfenster von zwei Minuten.

## Marketplace-Einstellungen zusammenführen

Modulquellen befinden sich jetzt ausschließlich als eigener Abschnitt im Einstellungsdialog des Marketplace. Anbieter und Version werden getrennt von Kategorie-Tags angezeigt, und das Einstellungssymbol unterstützt helle und dunkle Designs.
