# Iron Horizon

3D-Panzerkampfspiel im Browser, **Version 1.3**:

- **Inhalt:** drei Karten (eine davon mit Hügeln und Flussbett), fünf Panzer, die Modi Vorherrschaft, Durchbruch, Eroberung und Letztes Gefecht, drei Gegnerstärken, Training und ein Fahrerprofil mit Rängen, Tarnungen und Auszeichnungen.
- **Online:** Räume mit Code für bis zu 6 Spieler, freie Team- und Panzerwahl, leere Plätze füllen Bots.
- **Steuerung:** Maus und Tastatur oder Touch auf Handy und Tablet.
- **Technik:** Alle Laufzeitdateien sind enthalten; keine CDNs, keine Konten, keine Paketinstallation.

Teil der privaten Swimming-Lions-Spielesammlung für Familie und Freunde: https://iron-horizon.onrender.com (passwortgeschützt).

## Starten

Mit installiertem Node.js im Repository-Ordner:

```sh
npm start
```

Danach `http://localhost:10400/` öffnen (leitet auf `/iron-horizon/` weiter). Ohne `ZUGANG_PASSWORT` läuft der Server lokal ohne Passwort.

## Steuerung

- **Desktop:** WASD fährt, die Maus zielt, die linke Maustaste schießt, die rechte zoomt. Leertaste bremst, Q legt Rauch, R halten repariert Module und Esc pausiert.
- **Touch (Querformat):** Der linke Daumen fährt mit dem Joystick, rechts wischen zielt. Dazu kommen Knöpfe für Feuer, Zoom, Rauch, Reparatur und Bremse.

## Inhalt

- **Karten:** Grenzposten, Steinbruch und Flusstal (Hügelkamm, trockenes Flussbett, Steinbrücke).
- **Panzer:**
  - Luchs: schnell.
  - Keiler: starke Front.
  - Wiesel: Spähpanzer mit Maschinenkanone, im Gefecht ab Rang Fahrer.
  - Dachs: Jagdpanzer ohne Turm, im Gefecht ab Rang Frontkämpfer.
  - Bär: schwerer Panzer mit dicker Front, im Gefecht ab Rang Veteran.
- **Modi:**
  - Vorherrschaft: Punkt A halten.
  - Durchbruch: erst A, dann B erobern oder verteidigen, die Seite ist frei wählbar.
  - Eroberung: drei Punkte; wer mehr hält, zieht dem Gegner Tickets ab.
  - Letztes Gefecht: ein Leben pro Runde, zwei Rundensiege gewinnen.
- **Bots** erobern, flanken, überwachen, ziehen sich zurück und legen Rauch. Drei Gegnerstärken: Rekrut, Veteran, Ass (+25 % Erfahrung); deine Verbündeten kämpfen immer wie Veteranen.
- **Kampf:** Abpraller, Module (Kette, Motor, Turm- bzw. Richtantrieb), Streuung, Treffermarker, Schlüsselmoment im Ergebnis.
- **Fortschritt:** Erfahrung, fünf Ränge, sechs Tarnungen, acht Auszeichnungen, JSON-Export und -Import.
- Grafikstufen Hoch/Mittel/Niedrig (bei zu niedriger Bildrate senkt das Spiel sie selbst), Y-Achse umkehren, Bildratenanzeige. Das Spiel hat keinen Ton.

Regeln, Zahlen und Tests: [Spiel-Dokumentation](iron-horizon/README.md). Gestaltung, Balance und Ausblick: [Spielkonzept](IRON-HORIZON-KONZEPT.md).

## Veröffentlichen (Render)

Das Repository enthält ein `Dockerfile` und ein Render-Blueprint (`render.yaml`, Dienstname `iron-horizon`). Auf Render entweder das Blueprint verbinden oder einen **Web Service** vom Typ Docker anlegen und die Umgebungsvariable `ZUGANG_PASSWORT` setzen. Ohne Passwort bleibt die Seite auf Render gesperrt. `/datenschutz` und `/healthz` sind ohne Passwort erreichbar.

Der Server liefert nur die Spieldateien, Schrift und Three.js aus (keine Tests, keine Serverdateien) und speichert nichts. Für Online-Gefechte verbindet er die Spieler eines Raums über WebSocket (`/ws`, Paket `ws`); Räume leben nur im Arbeitsspeicher.

## Tests

```sh
npm test
```

Die Browser-Tests (`*-test.cjs`) und das Balance-Turnier (`balance-tournament.cjs`) benötigen Playwright, installiertes Chrome und den laufenden Server von `node iron-horizon/serve.cjs`.

## Drittanbieter

- Three.js: [MIT-Lizenz](iron-horizon/vendor/LICENSE-three.txt).
- Bricolage Grotesque: [SIL Open Font License](fonts/OFL-Bricolage.txt).

Fahrerprofil und Einstellungen liegen ausschließlich im lokalen Browser-Speicher und werden nicht übertragen.
