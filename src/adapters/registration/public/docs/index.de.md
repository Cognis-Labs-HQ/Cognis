# Öffentliche Registrierung

Die öffentliche Registrierung erstellt ein Konto über den aktivierten Registrierungsprovider und kann dessen Profil über eine injizierte Fähigkeit anlegen.

## Verwendungsbeispiele

Beziehen Sie die Registrierung über die Gateway-Fähigkeit, statt einen Adapter aus einer anderen Komponente aufzurufen:

```js
const register = ctx.capabilities.require("registration:public:register");
const account = await register({ username, password, email, displayName });
```

## Technische Spezifikation

Der Adapter akzeptiert username, password sowie optional email und displayName. Er entfernt äußere Leerzeichen aus username und displayName, weist einen leeren Benutzernamen oder ein leeres Passwort mit username_and_password_required zurück und ruft den Kontospeicher mit der Rolle user auf. Das Ergebnis enthält username, enabled und role. Der Kontospeicher übernimmt die Persistenz und reicht Fehler weiter. Wenn createProfile vorhanden ist, wird nach der Kontoerstellung auf die Profilerstellung gewartet. Der Adapter ist standardmäßig deaktiviert; das Gateway prüft seine Richtlinie zur öffentlichen Registrierung und weist deaktivierte Registrierung zurück. Die optionale E-Mail-Adresse gehört zum Eingabevertrag, wird aber nicht an die Kontoregistrierungsoperation übergeben.
