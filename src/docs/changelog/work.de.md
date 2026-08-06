# Zuverlässige HTTP-Erkennung für Reverse-Proxys

## Auswahl des TLS-Upstreams durch TLS-beendende Proxys verhindert

Das `cognis-web`-Image veröffentlicht für die automatische Diensterkennung nur
noch seinen HTTP-Port. Traefik und ähnliche TLS-beendende Proxys wählen dadurch
Port 80, statt versehentlich unverschlüsseltes HTTP an Port 443 zu senden und
eine 421-Misdirected-Request-Antwort zu erhalten.
