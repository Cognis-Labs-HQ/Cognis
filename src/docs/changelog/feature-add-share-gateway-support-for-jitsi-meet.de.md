# Geteilte Komponentenfenster für Gäste

## Geteilte Seiten öffnen synchronisierte Komponentenfenster jetzt automatisch

Freigabegäste können nun Komponentenfenster empfangen, die von eingebundenen geteilten Seiten ohne Aktivierungsgeste des Browsers angefordert werden. Dadurch öffnen sich Meeting-Whiteboards und ihr synchronisiertes Begleitverhalten für Gäste genauso wie für angemeldete Cognis-Teilnehmende, während der Komponentenfenster-Broker weiterhin das angeforderte Hostelement und das Lebenszyklussignal validiert.

## Integrationsgrenze klargestellt

Die Autorisierung eines Komponentenfensters gewährt keinen Zugriff auf die APIs einer untergeordneten Komponente. Jitsi Meet muss Freigabegäste an seiner Whiteboard-Zustandsroute akzeptieren und die Zuordnung zwischen Meeting und Whiteboard bereitstellen. Nextcloud Whiteboard muss delegierten Zugriff aus dieser geprüften Meeting-Freigabe akzeptieren, bevor die Synchronisierung vollständig funktioniert.

## Organisatoren können synchronisierte Meeting-Komponenten öffnen

Angemeldete Organisatoren und andere Teilnehmende mit direktem Zugriff können nun Komponentenfenster-Anfragen empfangen, während sie eine aktive geteilte Ressource ansehen. Beim Öffnen eines Meeting-Whiteboards wird dadurch dessen Komponentenfenster eingebunden und das Meeting-Fenster kann in den Bild-im-Bild-Modus wechseln, selbst wenn die Synchronisierung die Anfrage erst nach der ursprünglichen Browserinteraktion auslöst.

## Komponentenrouten für Gäste laden nach der Authentifizierung

Die Share-Seite aktualisiert nun die SPA-Routenermittlung nach der Gastauthentifizierung. Whiteboard-Komponentenrouten, die beim anonymen Seitenstart nicht verfügbar waren, werden dadurch mit der aktiven Gastsitzung aufgelöst, sodass das synchronisierte Whiteboard-Fenster innerhalb des Meetings eingebunden wird.
