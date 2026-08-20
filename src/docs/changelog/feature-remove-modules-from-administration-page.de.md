# Modul-Marktplatz

## Eindeutiger Veröffentlichungskanal

Veröffentlichungskanäle verwenden nun neutrale Bedienelemente mit einer klar erkennbaren Auswahl. Die Moduldetails zeigen den installierten Kanal zusammen mit der tatsächlichen Manifestversion; aktualisierte Module tragen bis zum Neustart des Cognis-Containers und der Aktivierung aller eingebundenen Routen einen Neustarthinweis.

## Einheitliche Modulaktionsmenüs

Die Detailansicht installierter Module verwendet nun das gemeinsame verankerte Hamburger-Menü für erweiterte Aktionen und entspricht damit Aussehen und Bedienung der Aktionsmenüs in anderen Bereichen von Cognis.

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

## UI-Routen externer Module aus ihrem Installationsverzeichnis laden

Installierte Module werden jetzt anhand ihrer stabilen UUID im Verzeichnis für externe Module aufgelöst. Ihre deklarierten Seiten und Navigationseinträge werden beim Start automatisch geladen, anstatt im Pfad der mitgelieferten Module gesucht zu werden.

## Modulstart vor Anfragen abschließen

Cognis wartet jetzt, bis gespeicherte Modulzustände wiederhergestellt und Module vollständig gestartet wurden, bevor eine Anfrage verarbeitet wird. Skripte und Styles externer Module sind dadurch registriert, bevor ihre Seiten sie anfordern.

## Authentifizierungsfunktionen bereitstellen

Das Authentifizierungs-Gateway veröffentlicht jetzt seine Funktionen zur Anfrageauthentifizierung und Rollenprüfung über den Capability-Bus. Externe Module können geschützte API-Routen ohne Importe aus Gateway-Interna starten, sodass ihre UI-Ressourcen und Navigationseinträge aktiv bleiben.

## Nur deklarierte UI-Funktionen laden

Module können `requiresCapabilities` in ihrem Manifest deklarieren. Vor dem Einhängen einer Modulroute importiert Cognis ausschließlich die registrierten Anbieter-Skripte für die deklarierten `ui:*`-Funktionen. Benötigte UI-Dienste sind damit verfügbar, ohne unbeteiligte Integrationen freizugeben.

## Capabilities prüfen und dokumentieren

Owner können alle registrierten Capability-IDs über `GET /api/v1/system/capabilities` oder `cognisctl system:capabilities` auflisten. Die Dokumentation für Module, Authentifizierungs-Gateway und Profil-Adapter beschreibt nun Anforderungsdeklarationen und die bereitgestellten Capabilities.

## Richtung der Version anzeigen

Karten und Detailansichten installierter Module zeigen eine abweichende Version des ausgewählten Kanals jetzt unterhalb der aktuellen Version. Upgrades verwenden einen Aufwärtspfeil, während ein ungewöhnliches Downgrade mit Abwärtspfeil in einer hellorangenen Plakette erscheint.

## Moduldetails stabil halten

Beim Öffnen oder Aktualisieren einer Moduldetailansicht bleibt die Seitenposition jetzt erhalten. Jede angezeigte Version trägt das Präfix `v`, und die Aktualisierung eines aktiven Moduls führt Deaktivieren, Installieren und erneutes Aktivieren in einer Aktion aus.

## Steuerelemente stabil halten

Moduldetailseiten verwenden jetzt Router-gestützte UUID-Deep-Links und bleiben dabei im Page Composer. Aktualisierungen des Lebenszyklus halten die sichtbare Zusammenstellung der Schaltflächen stabil, auch während ein aktives Modul für ein Upgrade vorübergehend deaktiviert wird.

## Direkte Modulseiten einmal starten

Direkte Aufrufe externer Modul-SPA-Routen verwenden jetzt einen Core-Einstiegspunkt, der deklarierte Capability-Anbieter vor der Modulroute importiert. Anbieter- und Routen-URLs verwenden dieselbe Asset-Version wie die Router-Navigation, wodurch zeitweise fehlende Capabilities und doppelte Navbar-Beiträge verhindert werden.

## Mitgelieferte Module auslagern

Analytics und Nextcloud Whiteboard sind jetzt eigenständige externe Modul-Repositories mit eigener Repository-Metadaten, Lizenzen, READMEs, vollständigen Integritätslisten, übersetzten Bereitstellungshinweisen, UUID-Abhängigkeiten und expliziten Capability-Anforderungen.

## Durchsuchen von Modul-Screenshots verbessern

Screenshots in der Moduldetailansicht bleiben nun in einem begrenzten Karussell mit Zurück- und Weiter-Steuerung, verblassten benachbarten Vorschauen, animierten Übergängen und automatischer Rotation. Manifeste mit dem optionalen Feld `template: true` werden aus Marktplatzergebnissen und direkten Detailansichten ausgeschlossen.

## Eindeutige Marktplatzmodule erzwingen

Analytics und Nextcloud Whiteboard befinden sich nun in eigenen Repositorys und werden nicht mehr mitgeliefert. Die Marktplatzsuche akzeptiert jetzt das erste Repository für jede Modul-UUID, protokolliert und verwirft spätere Duplikate und aktualisiert Darstellungsmetadaten aus dem akzeptierten Repository, während der installierte Lebenszyklusstatus erhalten bleibt.

## Infrastrukturverzeichnisse der Gateways ignorieren

Die automatische Gateway-Erkennung startet jetzt nur Verzeichnisse mit einem Gateway-Manifest. Dadurch wird das Infrastrukturverzeichnis `gateways/reuse` in Produktions-Builds nicht mehr als Gateway importiert.

## Rückmeldungen zum Modul-Lebenszyklus verdeutlichen

Das Deaktivieren von Modulen wird nun als Warnung protokolliert und das Löschen externer Module ausdrücklich erfasst. Marktplatz-Aktualisierungen zeigen pro Klick genau eine Abschlussmeldung, während Module sichtbar bleiben, sofern ihr Manifest `template` nicht ausdrücklich auf `true` setzt.

## Cognis-HQ-Module empfehlen

Die integrierte Empfehlungsliste enthält jetzt die veröffentlichten Modul-UUIDs für Jitsi Meet, Nextcloud Whiteboard und Analytics aus der Organisation Cognis Labs HQ.

## Protokollierung des Modul-Lebenszyklus erweitern

Hinzufügen, Aktualisieren, Löschen und Scannen von Modulquellen sowie die Anzahl der Scanergebnisse werden jetzt mit passender Priorität protokolliert; Validierungs- und Aktivierungsfehler erscheinen als Fehler. Die Marktplatz-Bildsuche verwendet außerdem ein passendes PNG oder ein anderes unterstütztes Bild, wenn das Manifest eine fehlende Dateiendung nennt. Dadurch werden die Jitsi-Meet-Grafiken wieder angezeigt, solange dessen Manifest noch auf nicht vorhandene SVG-Dateien verweist.

## Aufblitzen von Modulbildern verhindern

Modulkarten und Detailmedien bleiben nun verborgen, bis jedes aktualisierte Bild gültige Abmessungen meldet. Feste Symbolabmessungen reservieren außerdem den Platz in der Karte vor dem Laden, sodass rohe oder übergroße Modulgrafiken bei Marktplatz-Aktualisierungen nicht mehr kurz aufblitzen.

## Module bei uneindeutigen Scans behalten

Marktplatz-Scans werten eine leere Repository-Antwort, ein vorübergehend fehlendes Manifest, eine vorübergehend ungültige Antwort oder einen fehlgeschlagenen Quellenabruf nicht mehr als Beweis für die Löschung eines zuvor gefundenen Moduls. Zwischengespeicherte Einträge bleiben bis zum ausdrücklichen Entfernen ihrer Quelle sichtbar; Warnprotokolle nennen fehlgeschlagene Scans und die Anzahl beibehaltener Module.

## Sicherere, effiziente Modulsuche

Marketplace-Aktualisierungen wurden in einem authentifizierten Scan gebündelt, Benutzer-Token für GitHub an der vertrauenswürdigen Quelle ergänzt, Abhängigkeits- und Bestätigungsprüfungen vor der Ausführung externen Codes wiederhergestellt und Manifestanfragen für GitHub Enterprise auf die konfigurierte API umgestellt.

## Direktes Modulladen abschließen

Beim direkten Laden der Modulseite wird die erfasste Ladeaufgabe nach Abschluss oder Fehlschlagen des Seitenaufbaus immer beendet. Dadurch bleibt das Ladesymbol nach einer Browser-Aktualisierung nicht mehr sichtbar.

## Scans speichern und begrenzen

Nach Serverneustarts werden Module zuerst aus dem gespeicherten Marketplace-Katalog geladen. Automatische Scans beim Seitenladen und Serverstart verbrauchen keine Anbieter-Kontingente mehr. Scanversuche werden mit einem einstündigen Intervall gespeichert, sodass wiederholte Aktualisierungen den Katalog auf dem Datenträger verwenden.

## Autorität des Quellcaches

Die integrierte Quelle Cognis Labs HQ akzeptiert nun PAT-Aktualisierungen, während ihre Identitätsfelder gesperrt bleiben. Doppelte Modul-UUIDs werden zugunsten der Cognis-Quelle aufgelöst. Kataloge, Scan-Metadaten und Assets liegen im konfigurierten Modulverzeichnis unter .cache.

## GitHub-Zugang sofort nutzen

Konfigurierte PAT-Felder zeigen einen maskierten Wert, ohne das Geheimnis offenzulegen. Beim Speichern neuer Zugangsdaten wird die Scan-Sperrzeit dieser Quelle gelöscht, sodass die nächste Marketplace-Anfrage sofort die neue GitHub-Autorisierung verwendet.

## Anbieter-Token prüfen

Neue Marketplace-PATs werden vor dem Speichern gegen den konfigurierten Anbieter-Namensraum geprüft. Ungültige, nicht autorisierte, nicht prüfbare oder unzureichend berechtigte Zugangsdaten zeigen eine lokalisierte Warnung und lassen den Quelleneditor zur Korrektur geöffnet.

## PAT-Konfiguration behalten

Marketplace-Zugangsdatenkennungen werden nun zusätzlich im Cache des Modulverzeichnisses gespeichert. Die integrierte Cognis-Quelle stellt ihre konfigurierte PAT-Markierung nach einem Server- oder Containerneustart wieder her, ohne das PAT außerhalb des Benutzer-Schlüsselbunds zu speichern.

## PAT-Berechtigungen angeben

Hinweise zu Zugangsdaten sind in der Oberfläche nun kurz. Serverprotokolle nennen das genaue Problem sowie die erforderlichen fein abgestuften GitHub-Berechtigungen (Repository-Zugriff, Metadaten lesen, Inhalte lesen), den klassischen Bereich repo für private Repositorys, die Organisations-SSO-Freigabe und offizielle Dokumentationsverweise.

## Release-Wechsel stabilisieren

Installationen durch Release-Kanalwechsel, Upgrades und Downgrades speichern nun den gewählten Branch, Commit und die Version vor dem Neustart. Neustarthinweise erscheinen nur für zuvor aktivierte Module, betroffene Module lehnen bis zum Neustart weitere Lebenszyklusaktionen ab und unveränderte oder abgebrochene Kanalwechsel kollidieren nicht mit späteren Aktionen.

## Moduldetails stabil halten

Aktionen in Moduldetails verwenden nun das schwebende Composer-Menü, während Status- und Kategorienavigation die ausgewogene, scrollbare Seitenleiste nutzt. Die Detailauswahl bleibt bei Aktualisierungen, Lebenszyklusereignissen und Hinweisen erhalten; nur eine ausdrückliche Navigation verlässt die Detailansicht.

## Modulaktionen ausrichten

Schwebende Modulaktionen haben nun eine einheitliche Höhe und vertikale Ausrichtung, einschließlich der Zurück-Steuerung. Das erweiterte Hamburger-Menü bleibt im Detailkopf, damit sein Popup zuverlässig verankert ist. Leichte Aktionsaktualisierungen vermeiden das Neuzeichnen der gesamten Modulkarte bei nicht zugehörigen Klicks.

## Modulaktionen eindeutig zuordnen

Aktionen auf Modulkarten werden jetzt in lesbare Rasterspalten umgebrochen, damit Installiert, Upgrade oder Downgrade, Aktivieren und Deinstallieren eindeutig getrennten Steuerelementen zugeordnet bleiben. Beim Aktivieren eines Moduls werden deaktivierte Gateway-Abhängigkeiten aktiviert und gespeichert; tatsächlich fehlende Abhängigkeiten liefern statt eines allgemeinen 400-Fehlers eine konkrete, umsetzbare Antwort.

## Versionen der Veröffentlichungskanäle aktualisieren

Eine ausdrückliche Katalogaktualisierung umgeht jetzt die normale Wartezeit für Anbieter-Scans und liest jedes Branch-Manifest erneut. Wenn ein ausgewählter Branch die installierte Version erreicht, entfernt Cognis die veraltete Herabstufungsaktion sofort. Tatsächliche Herabstufungen installieren nun den ausgewählten Branch und werden mit Wird herabgestuft und Modul herabgestuft klar von Upgrades unterschieden.

## Ausgewählte Downgrade-Revision installieren

Herabstufungen installieren jetzt genau den vom aktualisierten Katalog angegebenen Commit, selbst wenn der Branch vor Installationsbeginn fortschreitet. Die Herabstufungsanzeige besitzt ein eigenes dunkles Design, und Moduldetail-Kopfzeilen erhalten einen undurchsichtigen Hintergrund, damit Bannerbilder nicht durch die fixierte Anwendungskopfzeile scheinen.

## Branch-Versionen über Commits auflösen

Die Marketplace-Erkennung liest jetzt jedes Branch- und Release-Manifest über die unveränderliche Commit-SHA des Anbieters statt über den veränderlichen Branch-Namen. Dadurch werden veraltete Antworten der GitHub Contents API oder zwischengeschalteter Caches vermieden, und Katalogversion, angezeigte Aktualisierungsrichtung und installierte Revision stimmen mit dem vom Anbieter gelieferten Branch-Commit überein.

## Modulabhängigkeiten vor der Installation prüfen

Modulmanifeste können erforderliche Kernkomponenten jetzt über eine stabile UUID oder eine ältere ID angeben. Cognis prüft das verbindliche Manifest aus dem ausgecheckten Repository, bevor ein installiertes Modul ersetzt wird. Die Installation schlägt mit einem konkreten Fehler fehl, wenn eine referenzierte Komponente fehlt oder deaktiviert ist; aktive UUID-Abhängigkeiten werden normal installiert.

## Adapter-UUID-Abhängigkeiten auflösen

Jitsi Meet und Nextcloud Whiteboard benötigen korrekt die UUID des Social-Profile-Adapters; Jitsi benötigt zusätzlich die UUID des Social-Messages-Adapters. Die Installation erkennt Adaptermanifeste jetzt automatisch und löst diese UUIDs über ihr zuständiges Gateway auf. Bei aktivem Gateway werden sie akzeptiert, bei deaktiviertem oder fehlendem Gateway abgelehnt.

## Adapterabhängigkeiten bei der Aktivierung auflösen

Die Modulaktivierung verwendet jetzt denselben erkannten Kernkomponentenkatalog wie die Installation. Adapter-UUID-Anforderungen wie Social Profile und Social Messages werden ihrem zuständigen Social-Gateway zugeordnet, statt fälschlich als nicht verfügbare Gateways gemeldet zu werden.

## Absichtlich deaktivierte Abhängigkeiten respektieren

Beim Aktivieren eines Moduls werden deaktivierte Gateways nicht mehr automatisch aktiviert, um dessen Manifest zu erfüllen. Cognis lässt die Abhängigkeit deaktiviert, lehnt die Aktivierung ab und gibt den lesbaren Komponentennamen wie Profile Adapter oder File Gateway zurück, damit die Modulseite eine klare Korrekturmeldung anzeigen kann.

## Modulaktionen füllen die Karte

Die Aktionsschaltflächen einer Modulkarte teilen nun die gesamte verfügbare Zeile gleichmäßig auf. Karten mit einer, zwei oder drei Aktionen lassen keine ungenutzten Schaltflächenlücken mehr und verschieben keine einzelne Aktion in eine neue Zeile.

## SPA-Navigation für Module stabilisieren

Von Modulen bereitgestellte SPA-Seiten behalten authentifizierte Sitzungen nun bei, wenn nur ein Modulendpunkt einen Autorisierungsfehler zurückgibt; Cognis prüft die Kontositzung, bevor sie als abgelaufen gilt. Das Profil-Verfügbarkeitsmenü wird nach Aktualisierungen der Dashboard-Hülle außerdem idempotent neu eingebunden und wartet auf sein Stylesheet, wodurch fehlende oder doppelte Anwesenheitssteuerelemente vermieden werden. Die Modulnavigation wächst nun ohne eigene vertikale Bildlaufleiste auf ihre natürliche Höhe, während überlaufender Hauptinhalt im dazu passenden Inhaltsbereich scrollt.

## Modulüberschrift und Zeigerinitialisierung korrigieren

Die Inhaltskarte der Module behält nun die feste Überschrift „Module“, während Statusfilter in der Navigation verbleiben. Die gemeinsame Zeigerverfolgung importiert ihren CTX-Fähigkeitsbus nun ausdrücklich, sodass von Modulen bereitgestellte Seiten bei direktem Aufruf nicht mehr fehlschlagen.

## Gebündelte Sprachmodule entfernen

Cognis Englisch und Cognis Japanisch werden nun ausschließlich aus ihren eigenständigen Marketplace-Repositorys installiert. Der gebündelte Modul-Workspace wurde entfernt; Laufzeiterkennung, UI-Routing, Integritätsprüfungen, CLI-Erweiterungen und die Registrierung von Study-Sprachen verwenden nur noch UUID-adressierte Installationen unter `COGNIS_EXTERNAL_MODULES_ROOT`. Gemeinsam genutzte Study-Navigationsressourcen gehören nun dem Study-Gateway.

## Standardgestaltung für die Modulnavigation verwenden

Die seitliche Modulnavigation verwendet nun vollständig das etablierte Toolbar-Layout des Seiten-Composers einschließlich Abständen, aktivem Zustand, responsivem Verhalten und Bildlaufvorgaben, statt seitenspezifische Überschreibungen anzuwenden.

## Moduleinstellungen

Module können unter `ui.preferences` bearbeitbare boolesche, Text- und Zahlenwerte für Administratoren deklarieren. Die Detailansicht zeigt Einstellungen nur, wenn solche Felder vorhanden sind. Werte werden auf deklarierte Schlüssel beschränkt und pro Administrator im Cognis-Einstellungsspeicher gesichert.

## Sicherere Lebenszyklusaktionen

Die Aktivierung externer Module erfordert nun die Bestätigung, bevor Modultests ausgeführt werden, und die Deinstallation akzeptiert nur kanonische UUID-Installationspfade. Erfolgreiche Marktplatzprüfungen entfernen zurückgezogene Repositorys; bei nicht eindeutigen Aktualisierungen bleibt der letzte bekannte Eintrag erhalten.

## Interna des Modul-Laders organisieren

Alle verbleibenden Core-Dienste für den Modul-Lebenszyklus und die Testausführung liegen nun gemeinsam unter `services/module-loader/`; ihre Tests spiegeln diese Struktur wider. Die Dokumentation für externe Module und das Study-Sprachframework ist nun in jeder unterstützten Sprache umfassend und strukturell synchronisiert.

## Modulnavigation kompakt halten

Die Seite „Module“ verwendet jetzt das Unternavigationslayout des Seiten-Composers. Dadurch bleibt das Seitenmenü nur so breit, wie es sein Navigationsinhalt erfordert, und die verbleibende Breite steht den Modulergebnissen zur Verfügung.

## Sicheres Laden des Marktplatzes

Die Modulseite unterdrückt nun ihr direktes Einbinden während Router-Importen und löst Repository-Zugangsdaten über den Schlüsselbund auf, sodass gesperrte Tresore vor privater Erkennung oder Installation entsperrt werden können. GitHub-Repository-Dateien und Präsentationsmedien verwenden jetzt den konfigurierten API-Host jeder Quelle, einschließlich GitHub Enterprise.

## Kompakte Navigation und Abhängigkeiten

Das Seitenmenü der Modulseite passt seine Breite jetzt dynamisch an den längsten Eintrag an und entspricht damit der Dokumentationsnavigation, statt eine feste Breite zu verwenden. Die Administration löst ausschließlich als UUID gespeicherte Komponentenabhängigkeiten in die Namen installierter Gateways, Adapter sowie gebündelter oder externer Module auf und behält Links zur aufgelösten Komponente bei. Status- und Kategoriefilter kennzeichnen jede aktive Auswahl sichtbar, und Administratoren können mehrere Kategorien kombinieren, um Module einzubeziehen, die einem der ausgewählten Tags entsprechen.

## Aktivierung von Laufzeitmodulen absichern

Das Starten externer Module wird nun sicher zeitlich begrenzt, fehlgeschlagene Module werden deaktiviert, deklarierte Server-Fähigkeiten werden vor der Aktivierung geprüft und SPA-Routen können keine Fähigkeiten inaktiver Anbieter laden. Study-Sprachbeschreibungen werden nach Modulaktualisierungen erneuert. Zeitlich abgelaufene Startvorgänge können nach ihrer Frist außerdem keine Routen oder Fähigkeiten registrieren.

## Moduleinstellungen schnell öffnen

Installierte Module mit bearbeitbaren Administratoreinstellungen zeigen nun direkt rechts neben dem Menü für erweiterte Optionen ein themenfähiges SVG-Einstellungssymbol. Es öffnet das vorhandene Konfigurationsfenster, in dem Werte geändert und gespeichert werden können.

## Alle Komponentenabhängigkeiten auflösen

Der Gateway-Start bewahrt nun UUID-Metadaten aus Manifesten auch für Komponenten ohne Abhängigkeiten, sodass die Administration jede UUID als Komponentenname und Link darstellt. Adapterlinks klappen das zugehörige Gateway auf und scrollen zum Adapter, Modullinks öffnen die Moduldetails und Repository-Prüfungen erzwingen ausschließlich UUID-basierte Manifestabhängigkeiten.

## Browser-Capability-Prüfung trennen

Bei der Modulaktivierung werden Server- und Browser-Capabilities nun über ihre jeweils zuständigen Laufzeitkontexte geprüft. Reine Browseranforderungen im Namensraum `ui:` werden bei der Aktivierung gegen aktive Anbieter der UI-Registry und erneut vor dem Einhängen der SPA-Route aufgelöst, statt umgangen oder im Serverkontext gesucht zu werden.

## Modulkonfigurationsfelder stabilisieren

Modulkonfigurationsfenster verwenden nun eine einheitliche Feldbreite und ausgerichtete boolesche Steuerelemente. Jede deklarierte Feldbeschreibung erscheint über das wiederverwendbare Informationsfenster neben ihrer Beschriftung, statt Höhe oder Ausrichtung des Formulars zu verändern.

## Verfügbarkeitssteuerung einmalig halten

Der Profiladapter reserviert den Platz für das Verfügbarkeitsmenü nun synchron, bevor Stile, Übersetzungen oder Vorlagen geladen werden. Gleichzeitige Navbar-Plugin-Instanzen verwenden diesen Platz gemeinsam, entfernen veraltete Duplikate und geben eine fehlgeschlagene Reservierung für einen erneuten Versuch frei. Dadurch entstehen nach Modul- oder SPA-Aktualisierungen keine doppelten Verfügbarkeitsmenüs mehr.

## Moduleinstellungen gezielt anwenden

Moduleinstellungen fokussieren nun das erste Formularfeld, statt dessen Beschreibung zu öffnen, und zeigen eine Erfolgsmeldung nur nach abgeschlossenem Speichern. Cognis rendert die im Manifest deklarierten Felder, lädt ihre Werte vom moduleigenen Endpunkt `GET /api/v1/modules/<id>/config` und schreibt Änderungen mit `PUT` an diesen Endpunkt, sodass allein das Modul für Validierung, Anwendung und Speicherung zuständig bleibt.

## Moduleigene Konfigurationsendpunkte verwenden

Cognis rendert nun die in Modulmanifesten deklarierten Felder und lädt sowie speichert Werte über den moduleigenen `GET`- und `PUT`-Konfigurationsendpunkt. Module bleiben für Validierung, Anwendung und Speicherung ihrer Betriebseinstellungen zuständig; Cognis führt keine parallele, einstellungsbasierte Konfiguration mehr.

## Module erhalten Protokollierungs- und Feedbackprozesse des Hosts

Modulserverkontexte schreiben nun zugeordnete Einträge in das Anwendungsprotokoll. Browsermodule können Host-Funktionen für authentifizierte Serverprotokollierung, thematisierte Hinweise und Laufzeitfehlerdialoge nutzen, statt Betriebsfehler nur in der Browserkonsole zu hinterlassen.

## Installierten Veröffentlichungskanal aktualisieren

Die Marketplace-Aktualisierung liest nun zuerst den aktiven Branch oder das aktive Release eines installierten Moduls und erst danach den Repository-Standard, einschließlich Manifest, Version, README und Präsentationsmedien. Die Aktualisierung bewahrt die Startansicht, hält eine geöffnete Detailansicht ausgewählt und zeichnet deren schwebende Aktionen aus dem aktualisierten Lebenszyklusstatus neu.

## Modul-UI-Clients und lokalisierte Konfiguration bereitstellen

Profil, Nachrichten, Dateien und Freigaben veröffentlichen ihre Browserclients nun als aktive UI-Capabilities. Externe Routen können dadurch Gateway-eigene Daten verwenden, ohne mit dem Navbar-Start zu konkurrieren oder Gateway-Endpunkte direkt aufzurufen. Sprachpakete installierter Module bleiben vor dem Bootstrap verfügbar; Moduleinstellungen lösen diese Texte auf und lesen sowie schreiben über den moduleigenen `/config`-Endpunkt.

## Alle Modul-Browserclients abwarten

Direkte und geroutete Modulaufrufe warten nun vor dem Import der Moduloberfläche auf alle aktiven Navbar-Capability-Anbieter. Dadurch sind Files, Profile, Messages, Share, Feedback und weitere deklarierte Hostclients rechtzeitig verfügbar. Die Dokumentation besitzt nun eine verborgene kanonische Struktur und eine automatisierte Überschriftenprüfung für jedes echte Nicht-Changelog-Dokument.
