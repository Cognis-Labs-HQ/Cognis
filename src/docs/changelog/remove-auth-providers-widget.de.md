# Passwortrichtlinie und Auth

## Doppeltes Auth-Anbieter-Widget aus Administration entfernt

Das Auth-Anbieter-Widget wurde aus dem Authentifizierungsbereich der Administration entfernt, da es bereits auf der Seite „Komponenten" erscheint. Der gesamte Authentifizierungsbereich der Administration wurde entfernt.

## Passwortrichtlinie in Administration → Sicherheit verschoben

Die Konfiguration der Passwortrichtlinie wurde aus dem alten Authentifizierungsbereich in den Sicherheitsbereich der Administration verschoben. Sie ist nun in den gemeinsamen Dirty-State-Tracker integriert, sodass Änderungen über die einheitliche Änderungsleiste gespeichert oder verworfen werden, anstatt einen eigenen Speichern-Button zu verwenden.

## Passwortrichtlinie verwendet numerische Mindestwerte für Zeichenklassen

Die Anforderungen für Großbuchstaben, Ziffern und Sonderzeichen verwenden jetzt numerische Eingaben statt Schalter. Ein Wert von 0 (Standard) deaktiviert die Anforderung; jeder positive ganzzahlige Wert legt die Mindestanzahl an Zeichen der jeweiligen Klasse fest, die im Passwort enthalten sein müssen.

## Registrierungsseite: Inline-Validierung des Benutzernamens

Das Registrierungsformular zeigt nun sofort eine Warnung unter dem Benutzernamenfeld an, sobald der Benutzer ein Zeichen eingibt, das kein druckbares ASCII-Zeichen ist oder das ein Großbuchstabe ist. Die Warnung erscheint sofort bei der Eingabe und nicht erst beim Absenden.

## Registrierungsseite: Immer sichtbare Passwortrichtlinie als Aufzählungspunkte

Das Passwortfeld auf der Registrierungsseite zeigt nun alle zutreffenden Richtlinienanforderungen als ständige Aufzählungsliste unterhalb des Felds an. Jeder Aufzählungspunkt aktualisiert sich live, wenn der Benutzer tippt: erfüllte Anforderungen werden grün mit einem Häkchen dargestellt, nicht erfüllte in Rot.

## Form-Builder-Utility für strukturierte Kriterien

Ein neues wiederverwendbares Form-Builder-Utility steuert jetzt das Rendern und die Validierung des Registrierungsformulars über strukturierte Feld- und Kriterien-Definitionen, die über einen gemeinsamen Kontext (`ctx`) übergeben werden. Dadurch können zukünftige Formulare Kriterien deklarativ als Daten statt als verstreute DOM-Sonderlogik definieren.

## Benutzername-Limit warnt statt Eingabe zu blockieren

Das Benutzername-Feld stoppt die Eingabe nicht mehr hart bei 25 Zeichen. Benutzer können weiter tippen; sobald der Wert über 25 Zeichen liegt, wird eine Inline-Warnung angezeigt.

## Pflichtfelder zeigen roten Stern neben dem Feldtitel

Pflichtfelder zeigen jetzt einen roten Stern direkt neben dem Feldtitel, nicht mehr unterhalb des Eingabefelds. Der Stern nutzt die themesichere Fehlerfarbe und ist sowohl in Hell- als auch Dunkelmodus gut lesbar.

## Benutzernamenkriterien in fokusaktiviertem schwebendem Panel

Die Anforderungen an den Benutzernamen werden nun im selben schwebenden Panel wie die Passwortkriterien angezeigt. Das Panel erscheint direkt unterhalb des Benutzernamensfelds, wenn dieses fokussiert wird, und verschwindet wieder, wenn der Fokus das Feld verlässt.

## Kriterien-Panels verfolgen die Feldbreite

Die schwebenden Kriterien-Panels passen sich jetzt der vollen Breite des jeweiligen Eingabefelds an, statt an der rechten Kante auszurichten. Auf kleinen Bildschirmen fließt das Panel beim Fokussieren inline unter das Feld.

## Kriterien-Panels nutzen korrekte Theme-Farben

Die schwebenden Kriterien-Panels verwenden jetzt die richtigen CSS-Theme-Variablen (`--surface`, `--border`, `--text-muted`, `--color-success-outline-text`, `--color-danger-outline-text`), damit die Farben im Hell- und Dunkelmodus korrekt dargestellt werden.
