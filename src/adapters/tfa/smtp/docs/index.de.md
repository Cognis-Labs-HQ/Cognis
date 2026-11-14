# SMTP-TFA-Adapter

Die Methode E-Mail-Code sendet einmalige Einrichtungs- und Anmeldecodes über den SMTP-Sender des Benachrichtigungs-Gateways. Die Codelänge gehört zur Zustellrichtlinie dieses Senders; TFA liest sie über ctx.

## Anwendungsbeispiele

1. Konfigurieren und aktivieren Sie SMTP in der Administration unter dem Benachrichtigungs-Gateway.
2. Stellen Sie dort **Codelänge** beispielsweise auf 8 Ziffern und speichern Sie. Neue E-Mail-Verifizierungscodes sowie Einrichtungs- und Anmeldecodes für E-Mail-Code-TFA verwenden diesen Wert.
3. Aktivieren Sie E-Mail-Code-TFA in den Einstellungen und geben Sie den Code ein, der an die verifizierte primäre E-Mail-Adresse des Kontos gesendet wurde. Verwenden Sie bei der Anmeldung den Code der neuesten Anforderung. Erneutes Senden erzeugt einen Ersatzcode nach der aktuellen Richtlinie.

## Technische Spezifikation

### Voraussetzungen

- Der SMTP-Sender des Benachrichtigungs-Gateways muss konfiguriert und aktiviert sein.
- Der SMTP-Anbieter muss `notify:emailDeliveryPolicy` in Version 1 sowie E-Mail-Verfügbarkeit und Zustellung über ctx bereitstellen. Fehlt der Anbieter oder ist er deaktiviert oder nicht konfiguriert, schlagen neue Codeanforderungen ausdrücklich fehl.
- Das Benutzerkonto benötigt eine verifizierte primäre E-Mail-Adresse.

### Konfiguration und Speicherung

Das Feld **Codelänge** des Benachrichtigungs-SMTP-Adapters ist die einzige bearbeitbare und gespeicherte Vorgabe für E-Mail-Verifizierung und E-Mail-Code-TFA. Der Standardwert beträgt 6 Ziffern; der Wert wird in eine ganze Zahl umgewandelt und auf 4–10 Ziffern begrenzt. TFA besitzt keine separate bearbeitbare oder gespeicherte Codelänge und stellt bei nicht verfügbarem Anbieter keine Ersatzrichtlinie bereit.

### Zustellrichtlinie und Codes

Codelänge und Versandintervall stammen bei der Ausgabe aus der aktuellen `notify:emailDeliveryPolicy`. Gemeinsame Prüfhelfer erzeugen kryptografisch zufällige Ziffern. Eine geänderte Länge gilt für nachfolgende Codes, einschließlich Ersatzcodes beim erneuten Senden. Bereits ausgegebene Einrichtungs- und Anmeldecodes behalten ihre ursprüngliche Länge, bis sie verwendet, ersetzt oder abgelaufen sind; eine Einstellungsänderung deutet sie nicht neu aus. Die Metadaten zur Eingabelänge beschreiben den ausgegebenen Code, nicht einen späteren Richtlinienwert.

Codes werden im Prozessspeicher gespeichert. Ein Neustart der App oder das Deaktivieren der Methode macht ausstehende Einrichtungs- und Anmeldecodes ungültig. Bei mehreren Instanzen müssen Anfragen während des gesamten Gültigkeitszeitraums an dieselbe Instanz gebunden bleiben.

### Registrierung und Lebenszyklus

Der Adapter registriert seine Code-Nachrichtenaktion beim Bootstrap über `notify:registerEmailPurpose` und sendet über `notify:sendEmail`. Er verwaltet Registrierung, Nachrichteninhalt und Codezustand; das TFA-Gateway stellt neutrale Adapter-Lebenszyklus-Hooks bereit. Das Deaktivieren des Gateways beendet seine SMTP-Warteschlange und ausstehende Codes. Die erneute Aktivierung erstellt eine neue Registrierung, ohne alte Codes wiederherzustellen. Darstellung und Sprachressourcen der Anmeldung gehören dieser Methode.
