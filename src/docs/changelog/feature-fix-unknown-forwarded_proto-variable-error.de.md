# Zuverlässiger nginx-Start

## nginx-Variablen schützen

Der Webcontainer beschränkt die Vorlagensubstitution nun auf den Cognis-Upstream-Host und verwendet eine Cognis-namensraumspezifische Weiterleitungsvariable. Anfragen über einen TLS-terminierenden Proxy behalten HTTPS bei, während direkte Anfragen ohne weitergeleitetes Protokoll sicher auf das nginx-Verbindungsschema zurückfallen.
