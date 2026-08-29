# Geteilte Komponentenfenster für Gäste

## Geteilte Seiten öffnen synchronisierte Komponentenfenster jetzt automatisch

Freigabegäste können nun Komponentenfenster empfangen, die von eingebundenen geteilten Seiten ohne Aktivierungsgeste des Browsers angefordert werden. Dadurch öffnen sich Meeting-Whiteboards und ihr synchronisiertes Begleitverhalten für Gäste genauso wie für angemeldete Cognis-Teilnehmende, während der Komponentenfenster-Broker weiterhin das angeforderte Hostelement und das Lebenszyklussignal validiert.

## Integrationsgrenze klargestellt

Die Autorisierung eines Komponentenfensters gewährt keinen Zugriff auf die APIs einer untergeordneten Komponente. Jitsi Meet muss Freigabegäste an seiner Whiteboard-Zustandsroute akzeptieren und die Zuordnung zwischen Meeting und Whiteboard bereitstellen. Nextcloud Whiteboard muss delegierten Zugriff aus dieser geprüften Meeting-Freigabe akzeptieren, bevor die Synchronisierung vollständig funktioniert.
