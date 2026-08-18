# Modul-Marktplatz

## Ein eigener App-Store

Module besitzen nun eine separate Verwaltungsseite mit Ansichten für installierte, verfügbare, empfohlene und kategorisierte Angebote sowie konfigurierbaren GitHub- und GitLab-Quellen.

## Externe Repositorys

Administratoren können öffentliche oder private Repositorys mit optionalen, im Schlüsselbund geschützten PATs finden; Cognis prüft bei der Installation Manifest und unveränderliche UUID.

## UUID-Abhängigkeiten

Alle Komponentenmanifeste behalten lesbare Namen und IDs, verwenden für Abhängigkeiten aber stabile UUIDs.

## Zuverlässige Marktplatz-Steuerung

Modulkarten, Filter, Quelleneinstellungen und Lebenszyklusaktionen aktualisieren nun sofort den Marktplatzinhalt, ohne das umgebende Seitenlayout zurückzusetzen. Moduldetails behalten die Store-Navigation bei, während einheitlich große Karten Beschreibungen und Lebenszyklusaktionen ausrichten.

Externe Checkouts durchlaufen nun vor dem Ersetzen einer aktiven Installation eine Repository-Prüfung für Paket- und Routenverträge, Einstiegspunkte, Grafiken, sichere Pfade und optionale Datei-Prüfsummen.

Installierte Repositorys werden nun als vollständige Laufzeitkomponenten erkannt. Ihr Bootstrap-Einstiegspunkt kann Routen, UI, Dokumentation, Änderungsnotizen, Fähigkeiten und Flow-Stufen über einen verfolgten `ctx`-Bereich beitragen; Deaktivieren oder Deinstallieren baut alle Beiträge vollständig ab.

Jitsi Meet wurde aus dem gebündelten Quellbaum entfernt und wird nun über den Marktplatz bereitgestellt. Cognis Labs HQ auf GitHub ist immer als unveränderliche vertrauenswürdige Modulquelle vorhanden.

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

## Module vor der Aktivierung testen

Beim Aktivieren eines Moduls werden nun alle standardmäßigen JavaScript- und TypeScript-Tests aus seinem Checkout ausgeführt, bevor sich der Laufzeitstatus ändert. Ein fehlgeschlagener oder abgelaufener Test verhindert die Aktivierung und meldet den Modultestfehler.

## Externe Module im Core-Testbefehl berücksichtigen

Der zentrale Befehl `npm test` findet Tests jetzt sowohl im Cognis-Quellbaum als auch im konfigurierten Checkout-Verzeichnis für externe Module. Über `COGNIS_EXTERNAL_MODULES_ROOT` werden auch Verzeichnisse außerhalb des Repositorys berücksichtigt.

## Marketplace-Katalog sofort wiederherstellen

Die Modulseite lädt nun zuerst den gespeicherten Katalog jeder Quelle, bevor die Erkennung im Hintergrund beginnt. Bekannte Module bleiben dadurch bei Navigation und Serverneustarts sichtbar. Repository-Abfragen aktualisieren erfolgreiche Kandidaten unabhängig und behalten zwischengespeicherte Einträge bei nicht eindeutigen Einzelabfragen.

## Installation von Jitsi Meet wiederherstellen

Die Installation akzeptiert nun Kataloge, die vor Einführung der Release-Tag-Metadaten gespeichert wurden. Dadurch entfällt der Fehler wegen fehlender `releases`, der die Installation von Jitsi Meet verhindert hat. Unabhängige Repository-Abfragen verhindern außerdem, dass andere Repositories der Organisation Jitsi Meet ausblenden.

## Installationsfehler lokal behandeln

Erwartete Fehler bei der Modulinstallation lösen nicht mehr den globalen Zustand „Verbindung unterbrochen“ oder eine dauerhafte Benachrichtigung aus; die Marketplace-Aktion meldet den Fehler weiterhin selbst.

## Änderungen am Modul-Lebenszyklus sofort veröffentlichen

Abgeschlossene Installations-, Aktivierungs-, Deaktivierungs-, Aktualisierungs- und Deinstallationsvorgänge aktualisieren den Marketplace jetzt sofort, veröffentlichen ein strukturiertes Lebenszyklusereignis, erneuern die Navigationsregistrierungen und gleichen den Zustand ohne Neuladen der Seite mit dem Server ab. Die Versionsauswahl der Detailansicht folgt außerdem dem aktiven Design.

## Modulaktionen synchron halten

Der Fortschritt von Modulaktionen wird nun anhand der Modul-UUID statt nur am angeklickten DOM-Element gespeichert. Deaktivierte Steuerelemente und der Ladeindikator bleiben dadurch beim Wechsel zwischen Karten- und Detailansicht erhalten. Erfolgreiche Vorgänge zeigen sofort die nächsten gültigen Steuerelemente. Die Release-Auswahl verwendet die kollidierende Hellmodus-Klasse nicht mehr. Fehlgeschlagene Installationen zeigen den genauen Serverfehler an und erzeugen strukturierte Server- und Browserprotokolle.

## Marketplace-Installationen robust und releasebewusst machen

Modulinstallationen laufen nun als abgefragte Hintergrundaufträge, damit Reverse-Proxys einen erfolgreichen Klon nicht mehr in einen 504-Fehler verwandeln. Cognis aktualisiert konfigurierte Quellen beim Serverstart, vergleicht Manifestversionen statt reiner Commitänderungen, unterstützt den Wechsel des Veröffentlichungskanals, bestätigt Herabstufungen und bietet eine erweiterte erzwungene Aktualisierung.

## Mediengalerien und designsichere Steuerelemente hinzufügen

Ein Modul-Repository kann im Stammverzeichnis `media/` unterstützte Bilder und Videos bereitstellen. Die Detailansicht zeigt sie in einer horizontalen Galerie; der native Veröffentlichungskanal-Selektor verwendet explizite Designfarben ohne widersprüchliche Select-Klassen.

## Unterbrochene Modul-Downloads erneut versuchen

Die Modulinstallation erzwingt nun den breiter kompatiblen HTTP/1.1-Transport von Git und wiederholt vorübergehende Klonfehler wie Verbindungsabbrüche, Zeitüberschreitungen, DNS-Fehler und unterbrochene TLS-Übertragungen. Jeder Versuch beginnt mit einem sauberen Staging-Verzeichnis; dauerhafte Repository- oder Validierungsfehler werden weiterhin sofort mit ihrer genauen Diagnose beendet.

## GitHub-Zeitüberschreitungen erkennen

Moduldownloads beenden nun einen festgefahrenen GitHub-Klonversuch nach dreißig Sekunden, wiederholen vorübergehende Fehler und erfassen die bekannte Ursache einer Container-Netzwerk-MTU in strukturierten Serverprotokollen. Administratoren erhalten eine gezielte Benachrichtigung zur Prüfung der Host- oder Docker-Netzwerk-MTU, anstatt dass Cognis die Bereitstellungsnetzwerke überschreibt.

## Externe Module vollständig laden

Der Bootstrap-Kontext externer Module nimmt nun alle unterstützten HTTP-Methoden sowie Navbar-, SPA-Routen-, Einstellungs-, Administrations-, Seiten-, Authentifizierungstext-, statische Ressourcen-, Flow-, Protokollierungs- und bereichsgebundenen Capability-Beiträge auf. Externe Meeting-Anbieter können Navigation und Routen damit über dieselben entfernbaren Verträge wie integrierte Komponenten registrieren.

## Moduldetail-Steuerung ausrichten

Das erweiterte Hamburger-Menü befindet sich nun zusammen mit der Zurück-Steuerung in der oberen Navigationszeile der Moduldetails. Installations- und Lebenszyklusaktionen bleiben in einer eigenen Aktionszeile.

## Installierte Module und Grafiken bewahren

Docker-Bereitstellungen speichern externe Module nun in einem eigenen benannten Volume, das am konfigurierten Stammverzeichnis für externe Module eingehängt ist. Dadurch bleiben installierte Module beim Neubau des Anwendungscontainers erhalten. Der Marketplace behält außerdem die über den Katalog bereitgestellten Symbol- und Banner-URLs beim Zusammenführen des installierten Manifestzustands bei, sodass Grafiken nicht mehr bis zur nächsten Seitenaktualisierung verschwinden.

## Aktivierung bei erzwungenen Updates bewahren

„Update erzwingen“ deaktiviert ein aktives Modul nun vorübergehend, bevor sein Checkout ersetzt wird, und aktiviert es anschließend erneut. Schlägt der Download oder die Prüfung fehl, aktiviert Cognis den bestehenden Checkout trotzdem wieder, damit ein fehlgeschlagenes erzwungenes Update das Modul nicht unerwartet deaktiviert lässt.

## Veröffentlichungskanäle gezielt wechseln

Bei installierten Modulen befindet sich die Auswahl des Veröffentlichungskanals nun im erweiterten Menü. Administratoren wählen aus einer scrollbaren Schaltflächenliste und bestätigen, bevor Cognis den Kanal automatisch installiert. Lebenszyklus-Schaltflächen zeigen während der Verarbeitung mit Ladeanzeige „Wird installiert“, „Wird aktualisiert“, „Wird herabgestuft“ oder „Veröffentlichungskanal wird gewechselt“ und wechseln nach erfolgreichem Abschluss zu „Installiert“.
