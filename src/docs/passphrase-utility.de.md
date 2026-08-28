# Passphrasen-Dienstprogramm

Die API-Laufzeit stellt `reuse:generatePassphrase` über `ctx` für Module wie Jitsi Meet bereit. Die Capability akzeptiert eine positive Wortanzahl in `words` sowie optionale Einstellungen für `separator` und `capitalization`. Für die Großschreibung stehen `lowercase`, `uppercase` und `titlecase` zur Verfügung; standardmäßig werden kleingeschriebene Wörter mit Bindestrichen getrennt.

Der Generator wählt jedes Wort mit der kryptografischen Zufallsquelle von Node.js aus. Aufrufer sollten genügend Wörter für ihre Sicherheitsanforderungen anfordern und dürfen erzeugte Passphrasen nicht protokollieren.
