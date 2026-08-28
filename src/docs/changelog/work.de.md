# Wiederverwendbare Passphrasen

## Passphrasen-Capability für Module

Ein kryptografisch zufälliger Wort-Passphrasen-Generator mit vom Aufrufer bestimmter Wortanzahl, Trennung und Großschreibung wurde ergänzt. Die API-Laufzeit exportiert ihn über `ctx`, damit Module wie Jitsi Meet lesbare Geheimnisse erzeugen können, ohne API-Interna zu importieren.
