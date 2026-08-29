# Geteilte Komponentenfenster für Gäste

## Geteilte Seiten öffnen synchronisierte Komponentenfenster jetzt automatisch

Freigabegäste können nun Komponentenfenster empfangen, die von eingebundenen geteilten Seiten ohne Aktivierungsgeste des Browsers angefordert werden. Dadurch öffnen sich Meeting-Whiteboards und ihr synchronisiertes Begleitverhalten für Gäste genauso wie für angemeldete Cognis-Teilnehmende, während der Komponentenfenster-Broker weiterhin das angeforderte Hostelement und das Lebenszyklussignal validiert.

## Integrationsgrenze klargestellt

Die Autorisierung eines Komponentenfensters gewährt keinen Zugriff auf die APIs einer untergeordneten Komponente. Cognis löst delegierten Gastzugriff nun über einen ressourcenneutralen Share-Flow auf. Die Komponente der ursprünglich freigegebenen Ressource weist ihre Beziehung zum angeforderten Ziel nach und deklariert die erlaubten Zielfähigkeiten; die Zielkomponente verwendet nur die allgemeine Share-Fähigkeit.

## Organisatoren können synchronisierte Meeting-Komponenten öffnen

Angemeldete Organisatoren und andere Teilnehmende mit direktem Zugriff können nun Komponentenfenster-Anfragen empfangen, während sie eine aktive geteilte Ressource ansehen. Beim Öffnen eines Meeting-Whiteboards wird dadurch dessen Komponentenfenster eingebunden und das Meeting-Fenster kann in den Bild-im-Bild-Modus wechseln, selbst wenn die Synchronisierung die Anfrage erst nach der ursprünglichen Browserinteraktion auslöst.

## Komponentenrouten für Gäste laden nach der Authentifizierung

Die Share-Seite aktualisiert nun die SPA-Routenermittlung nach der Gastauthentifizierung. Whiteboard-Komponentenrouten, die beim anonymen Seitenstart nicht verfügbar waren, werden dadurch mit der aktiven Gastsitzung aufgelöst, sodass das synchronisierte Whiteboard-Fenster innerhalb des Meetings eingebunden wird.

## Gastkontext erreicht eingebettete Whiteboards

Cognis überträgt den aktiven Share-Kontext nun über den Komponenten-Seiten-Flow in Komponenten-Einbindungen für Gäste. Das eingebettete Whiteboard kann die delegierte Meeting-Freigabe erkennen, die Gastauthentifizierung beibehalten und das synchronisierte Board laden, statt den Pfad nur für Konten zu verwenden.

## Delegierter Zugriff ist ressourcenneutral

Das Share-Gateway stellt nun `share:resolveDelegatedAccess` bereit und übernimmt die Prüfung des Quellbereichs eines Gasttokens. Ressourcenbesitzer erweitern den allgemeinen Delegierungs-Flow, um Beziehungen nachzuweisen, ohne Zielkomponenten an einen Meeting-Anbieter oder eine andere benannte Integration zu koppeln.

## Anonyme Seiten vermeiden die Kontoprüfung

Die Initialisierung anonymer Seiten und Share-Gastseiten sendet beim Vorbereiten des Schlüsselbundzustands nicht mehr die nur für Konten bestimmte Anfrage zur Ungültigmachung der Passwortbestätigung. Dadurch entfällt die nicht zugehörige `401`-Antwort beim Laden eines Meeting-Freigabelinks, ohne den Ablauf der Kontobestätigung abzuschwächen.

## Gast-Routen ignorieren veraltete Anfragen

Die Routenerkennung verwirft jetzt anonyme Antworten, die erst nach der Aktivierung einer Gastfreigabesitzung eintreffen. Dadurch werden synchronisierte Komponentenfenster über die autorisierten Routen des Gastes aufgelöst.
