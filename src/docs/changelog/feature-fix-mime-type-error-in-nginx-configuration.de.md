# Zuverlässige UI-Ressourcen

## Ressourcenfehler werden nicht mehr zwischengespeichert

Web-Proxy und API verhindern nun, dass Antworten für fehlende versionierte JavaScript- und CSS-Dateien als unveränderliche Ressourcen zwischengespeichert werden. Clients können sich nach einer Überschneidung bei der Bereitstellung wieder ordnungsgemäß verbinden, statt eine JSON-404-Antwort für eine Ressourcen-URL beizubehalten.

## Darstellung der Anmeldeseite wiederhergestellt

Der Seiten-Composer stellt seinen Element-Renderer nun für jeden Layout-Pfad bereit. Dadurch schlägt die Anmeldeseite nicht mehr mit dem Fehler `renderElementContent is not defined` fehl, bevor ihre Stile und Inhalte vollständig geladen sind.

## Web-Proxy löst Laufzeit-Dienstnamen auf

Nginx löst den Cognis-Anwendungsdienst nun über die standardmäßige Hostnamenauflösung der Container-Umgebung auf. Dadurch werden dieselben Suchdomänen und Hostzuordnungen wie bei anderen Werkzeugen in Docker, Kubernetes, Podman und weiteren Container-Plattformen verwendet. Fehler mit `no live upstreams` werden vermieden, wenn der Hostname an anderer Stelle im Web-Container funktioniert.

Der Web-Proxy übernimmt den Hostnamen des Anwendungsdienstes aus `HOST`, statt den Dienstnamen `cognis` vorauszusetzen. Namespace-qualifizierte Namen mit Punkten wie `cognis.cognis` werden unterstützt, damit der Upstream-Pool in Kubernetes und anderen Bereitstellungen mit abgegrenzten Dienstnamen verfügbar bleibt.

## Ressourcenpfade erreichen Cognis unverändert

Die nginx-Vorlage weist `/assets/` nun einen eigenen Präfix-Standort zu und leitet ihn ohne Umschreiben des URI weiter. Anfragen für JavaScript- und CSS-Dateien mit Fingerabdruck erreichen dadurch den Cognis-Ressourcenhandler genau unter dem angeforderten Pfad, ohne von einem Dateinamensmuster abhängig zu sein.

## Neutraler Containerstart

Der Anwendungseinstieg stellt die strukturierte Protokollierung und die optionale Erzeugung von `DATABASE_URL` aus providerspezifischen Feldern wieder her, bevor Cognis ausgeführt wird. Sensible Werte wie `DATABASE_URL` und `DATA_ENCRYPTION_KEY` besitzen keine Image-Standardwerte mehr und müssen aus der Bereitstellungsumgebung stammen. Das Web-Profil verwendet nun das generische nginx-Image und dessen native Vorlage mit Umgebungsersetzung, statt ein Cognis-spezifisches nginx-Image zu bauen.

## Produktions-Images enthalten Build-Werkzeuge nur beim Erstellen

Das Anwendungs-Image installiert Entwicklungsabhängigkeiten ausdrücklich für seine Build-Phase. Dadurch sind Werkzeuge wie esbuild auch mit `NODE_ENV=production` verfügbar. Nach der Prüfung der kompilierten UI und des Servers werden ausschließlich für die Entwicklung benötigte Pakete entfernt und gelangen nicht in das Laufzeit-Image.

## Compose-Datenbankwerte entsprechen dem Einstieg

Die Compose-Profile für PostgreSQL und MariaDB reichen nun genau die providerspezifischen Felder für Host, Port, Datenbank, Konto und Kennwort weiter, die der Anwendungseinstieg verwendet. Cognis erzeugt `DATABASE_URL` einheitlich, ohne eine zusätzlich vormontierte URL zu verlangen.

## cognisctl läuft ohne Entwicklungsabhängigkeiten

Das Container-Skript startet nun direkt die kompilierte Cognis-CLI, statt ihren TypeScript-Quellcode über tsx zu laden. Die CLI bleibt dadurch verfügbar, nachdem reine Entwicklungsabhängigkeiten aus dem Produktions-Image entfernt wurden.

## Laufzeit und Abhängigkeiten sind aktuell

Anwendungs-Image und CI verwenden nun die aktuelle Node.js-24-LTS-Versionslinie. Build-Werkzeuge, TypeScript, Datenbankclients und LDAP-Client wurden auf ihre neuesten stabilen Versionen aktualisiert; Docker-Buildbefehle unterdrücken außerdem die veraltete npm-Konfigurationswarnung zu `http-proxy`. Alle Komponentenversionen und internen Abhängigkeiten mit geprüfter Obergrenze wurden erhöht und zwischen Manifesten, Sperrdatei und übersetzten Versionsverzeichnissen synchronisiert.

## Anmeldeaufgaben sind auf fokussierte Module verteilt

Die Ermittlung von Anmeldeintegrationen und die Speicherung authentifizierter Sitzungen liegen nun in eigenen, der Anmeldeseite zugeordneten Modulen. Der Einstieg der Anmeldeseite bleibt unter der Größenbegrenzung für Quelldateien und behält dasselbe Sitzungsverhalten bei; das Speichern und Löschen des Authentifizierungszustands wird direkt durch Regressionstests abgedeckt.

## SMTP-Prüfungen beim ersten Versand sind deterministisch

Der SMTP-Ratenbegrenzer prüft nun vor dem Lesen der Uhr, ob für einen Empfänger bereits ein Versand gespeichert ist. Ein neuer Empfänger wird nicht mehr fälschlich begrenzt, wenn sich die Systemzeit zwischen zwei Lesevorgängen rückwärts bewegt. Dadurch entfällt der sporadische CI-Fehler unter Node.js 24, während konfigurierte Begrenzungszeiträume für gespeicherte Versandvorgänge erhalten bleiben.

## Container-Prüfungen bleiben ergebnisorientiert

Redundante Werkzeugtests, die lediglich Texte der Containerkonfiguration wiederholten, wurden entfernt. Container-Build und Anwendungstests bleiben die maßgeblichen Prüfungen, sodass die Wartung auf die Funktionsfähigkeit der gebauten Anwendung statt auf nebensächliche Formatierungsdetails ausgerichtet bleibt.

## HTTPS-Weiterleitung bewahren

Der Web-Proxy bewahrt nun ein eingehendes HTTPS-Schema, damit Authentifizierungs-Cookies hinter einer TLS-Terminierung sicher bleiben.

## Geheimnisse erzeugen

Der Einrichtungsbefehl stellt nun vor dem Compose-Start private Datenbankkennwörter und einen Datenverschlüsselungsschlüssel bereit.
