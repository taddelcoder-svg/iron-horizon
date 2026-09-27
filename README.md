# Iron Horizon

Lokales 3D-Panzerkampfspiel im Browser – Prototyp **0.5**. Zwei Karten, zwei Fahrzeuge, 3-gegen-3-Bot-Gefechte, Training und dauerhaftes Fahrerprofil. Alle Laufzeitdateien sind enthalten; keine Konten, CDNs oder Paketinstallation nötig.

## Starten

Mit installiertem Node.js im Repository-Ordner:

```sh
node iron-horizon/serve.cjs
```

Danach [Iron Horizon öffnen](http://127.0.0.1:4177/iron-horizon/). Port 4177 muss frei sein. Der Server ist nur lokal erreichbar.

WASD fährt, Maus zielt, linke Maustaste schießt, rechte Maustaste zoomt. Leertaste bremst, Q legt Rauch, R halten repariert Module und Esc pausiert.

## Inhalt

- Grenzposten und Steinbruch mit Kartenauswahl in der Garage.
- Luchs und Keiler mit unterschiedlichen Kampf- und Fahrwerten.
- Eroberungspunkt, Tickets, Bot-Gegner, Wiedereinstieg und Ergebnisanzeige.
- Modulschäden, Reparatur, Rauch und fünf Trainingsziele je Karte.
- Erfahrung, Ränge, Tarnungen sowie JSON-Import und -Export des Spielstands.

Ausführliche Regeln und Browser-Tests: [Spiel-Dokumentation](iron-horizon/README.md). Die [ursprüngliche Konzeptskizze](IRON-HORIZON-KONZEPT.md) beschreibt auch noch nicht umgesetzte Ideen; maßgeblich für den aktuellen Umfang ist die Spiel-Dokumentation.

## Tests

```sh
node --test iron-horizon/battle.test.cjs iron-horizon/systems.test.cjs iron-horizon/career.test.cjs iron-horizon/maps.test.cjs
```

Die zusätzlichen Browser-Tests benötigen Playwright, installiertes Chrome und den laufenden lokalen Server.

## Herkunft und Drittanbieter

Eigenständiger Export aus der Swimming-Lions-Spielesammlung. Die Verzeichnisstruktur bleibt für vorhandene Pfade und Tests erhalten; die Startseite enthält nur Iron Horizon.

- Three.js: [MIT-Lizenz](iron-horizon/vendor/LICENSE-three.txt).
- Bricolage Grotesque: [SIL Open Font License](fonts/OFL-Bricolage.txt).

Fahrerprofil und Einstellungen liegen ausschließlich im lokalen Browser-Speicher und werden nicht mit Git übertragen.
