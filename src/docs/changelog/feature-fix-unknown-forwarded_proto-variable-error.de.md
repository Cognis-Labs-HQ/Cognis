# Zuverlässiger nginx-Start

## nginx-Variablen schützen

Der Webcontainer beschränkt die Vorlagensubstitution nun auf den Cognis-Upstream-Host. Native nginx-Variablen, einschließlich der Zuordnung des weitergeleiteten Protokolls, bleiben selbst bei ähnlich benannten Umgebungsvariablen der Bereitstellung erhalten.
