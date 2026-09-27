# Iron Horizon

3D-Panzerkampfspiel im Browser – Prototyp **0.6**. Zwei Karten, zwei Fahrzeuge, 3-gegen-3-Gefechte gegen Bots, Training und ein dauerhaftes Fahrerprofil. Spielbar mit Maus und Tastatur oder per Touch auf Handy und Tablet. Alle Laufzeitdateien sind enthalten; keine CDNs, keine Konten, keine Paketinstallation.

Teil der privaten Swimming-Lions-Spielesammlung für Familie und Freunde.

## Starten

Mit installiertem Node.js im Repository-Ordner:

```sh
npm start
```

Danach `http://localhost:10400/` öffnen (leitet auf `/iron-horizon/` weiter). Ohne `ZUGANG_PASSWORT` läuft der Server lokal ohne Passwort.

Für die Browser-Tests gibt es zusätzlich `node iron-horizon/serve.cjs`: derselbe Server, nur auf `127.0.0.1:4177`.

## Steuerung

- **Desktop:** WASD fährt, Maus zielt, linke Maustaste schießt, rechte Maustaste zoomt. Leertaste bremst, Q legt Rauch, R halten repariert Module und Esc pausiert.
- **Touch (Querformat):** linker Daumen = Joystick zum Fahren, rechts wischen = zielen, Knöpfe für Feuer, Zoom, Rauch, Reparatur und Bremse. Das Spiel schaltet automatisch um, sobald du den Bildschirm berührst.

## Inhalt

- Grenzposten und Steinbruch mit Kartenauswahl in der Garage.
- Luchs und Keiler mit unterschiedlichen Kampf- und Fahrwerten.
- Eroberungspunkt, Tickets, Wiedereinstieg und Ergebnisanzeige.
- Bots mit Rollen: Punkt erobern, Flanken fahren, gesicherten Punkt aus Deckung überwachen, verletzt zurückziehen und nebeln.
- Abpraller bei flachen Treffern, Kette, Motor und Turmantrieb als beschädigbare Module, Schadensschema im HUD.
- Streuung: Im Stand schießt man genauer als in voller Fahrt.
- Erfahrung, Ränge, Tarnungen sowie JSON-Import und -Export des Spielstands.
- Grafikstufen Hoch/Mittel/Niedrig für schwächere Geräte.

Ausführliche Regeln und Tests: [Spiel-Dokumentation](iron-horizon/README.md). Die Planung bis zur Version 1.0 steht im [Spielkonzept](IRON-HORIZON-KONZEPT.md).

## Veröffentlichen (Render)

Das Repository enthält ein `Dockerfile` und ein Render-Blueprint (`render.yaml`, Dienstname `iron-horizon`). Auf Render entweder das Blueprint verbinden oder einen **Web Service** vom Typ Docker aus diesem Repository anlegen und die Umgebungsvariable `ZUGANG_PASSWORT` setzen. Ohne Passwort bleibt die Seite auf Render gesperrt. `/datenschutz` und `/healthz` sind ohne Passwort erreichbar.

Der Server liefert nur die Spieldateien, Schrift und Three.js aus (keine Tests, keine Serverdateien) und speichert nichts.

## Tests

```sh
npm test
```

Die zusätzlichen Browser-Tests (`*-test.cjs`) benötigen Playwright, installiertes Chrome und den laufenden Server von `serve.cjs`.

## Drittanbieter

- Three.js: [MIT-Lizenz](iron-horizon/vendor/LICENSE-three.txt).
- Bricolage Grotesque: [SIL Open Font License](fonts/OFL-Bricolage.txt).

Fahrerprofil und Einstellungen liegen ausschließlich im lokalen Browser-Speicher und werden nicht übertragen.
