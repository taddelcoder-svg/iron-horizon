# Iron Horizon – Spielkonzept

Stand: 27. September 2026 · Version 0.1 · Arbeitstitel

Dieses Dokument ist der ausgearbeitete Konzeptvorschlag für ein neues Spiel in der Swimming-Lions-Spielesammlung. Zahlen sind Startwerte für spätere Spieltests. Das Spiel ist noch nicht implementiert.

## 1. Das Spiel in einem Satz

Ein direkt im Browser spielbares 3D-Panzerkampfspiel, in dem du durch geschicktes Fahren, Flankieren und gezielte Treffer kurze Gefechte gewinnst und nach und nach deine eigene Fahrzeuggarage aufbaust.

Die Inspiration durch War Thunder liegt im Fahrzeuggefühl, im getrennten Bewegen von Wanne und Turm und in nachvollziehbaren Treffern. Eigene Fahrzeuge, Karten, Oberfläche, Modelle und Sounds geben dem Spiel seine Identität.

## 2. Leitlinien

- Schnell im Gefecht: Vom Startbildschirm mit einem Klick in ein Gefecht mit Bots.
- Spürbare Fahrzeuge: Gewicht, Beschleunigung, Turmdrehung und Rückstoß vermitteln das Gefühl einer Maschine.
- Position schlägt Dauerfeuer: Deckung, Seitenpanzerung und Nachladepausen bestimmen das Duell.
- Verständliche Schäden: Der Spieler erkennt, warum ein Treffer wirkt und was am eigenen Fahrzeug ausfällt.
- Kurze Sitzungen: Ein Gefecht dauert ungefähr fünf bis acht Minuten.
- Faire Sammlung: Fahrzeuge bieten unterschiedliche Spielweisen; Freischaltungen sind keine pauschalen Stärke-Upgrades.

## 3. Plattform und Umfang

Die bestehende Spielesammlung ist eine Browser-Startseite mit Links auf einzelne Spiele. Iron Horizon wird als eigenständiges Browserspiel geplant und später über einen weiteren Eintrag angebunden.

Der erste Zielbereich sind Desktop-Browser mit Maus und Tastatur. Eine Touch-Steuerung wird erst nach einem überzeugenden Desktop-Prototyp bewertet. Ein Konto ist für den Einstieg nicht vorgesehen.

Die erste Version verwendet stilisierte, gut erkennbare 3D-Fahrzeuge in einer fiktiven, an frühe Panzertechnik angelehnten Welt. Nationale Forschungsbäume und historische Genauigkeit sind keine Voraussetzung. Dadurch können Silhouetten, Werte und Karten gezielt auf das Spielgefühl abgestimmt werden.

## 4. So verläuft die erste Runde

1. Du öffnest das Spiel aus der Sammlung und siehst deinen Panzer in einer kleinen Garage.
2. Du wählst den beweglichen „Luchs“ oder den robusteren „Keiler“. Beide sind im Prototyp sofort verfügbar.
3. „Gefecht starten“ lädt die Karte „Grenzposten“ mit dir und zwei verbündeten Bots gegen drei gegnerische Bots.
4. Eine kurze Einblendung erklärt Fahren, Zielen, Schießen und den zentralen Eroberungspunkt.
5. Du fährst entweder durch das Dorf, über die Hügelroute oder entlang des Flussbetts zum Ziel.
6. Ein gegnerischer Keiler deckt die Hauptstraße. Du kannst aus der Deckung kämpfen oder seine schwächere Seite über eine Nebenroute erreichen.
7. Ein Treffer auf deine Kette hält dich auf. Du vernebelst die Stellung und reparierst, während dein Turm weiter einsatzfähig bleibt.
8. Nach Sieg oder Niederlage zeigt das Ergebnis Zielbeiträge, wirksame Treffer und Belohnungen. Du kannst sofort erneut antreten.

Die gewünschte Erfahrung: Du verstehst nach dem Gefecht, welche Entscheidung den Kampf verändert hat.

## 5. Erster Spielmodus: Vorherrschaft

| Regel | Geplanter Startwert |
| --- | --- |
| Teams | 3 gegen 3, ein menschlicher Spieler und fünf Bots |
| Ziel | Ein zentraler Eroberungspunkt |
| Rundenlimit | 7 Minuten |
| Teamtickets | Je 100 zu Beginn |
| Eroberung | 10 Sekunden alleinige Präsenz im Zielbereich |
| Umkämpftes Ziel | Eroberung und Ticketabzug pausieren |
| Gehaltenes Ziel | Gegner verliert alle 2 Sekunden ein Ticket |
| Fahrzeugverlust | Eigenes Team verliert 5 Tickets |
| Wiedereinstieg | Nach 6 Sekunden an der eigenen Basis |
| Sieg | Gegner erreicht 0 Tickets oder hat bei Zeitablauf weniger Tickets |
| Gleichstand | Unentschieden bei gleichen Tickets nach Zeitablauf |

Ein eingenommener Punkt bleibt im Besitz des Teams, wenn es ihn verlässt. Gegner neutralisieren ihn zunächst in 5 Sekunden und erobern ihn anschließend in 10 Sekunden. Mehrere Fahrzeuge beschleunigen die Eroberung zunächst nicht.

Die Basen liegen außerhalb der direkten Sichtlinie des Ziels. Ein neu eingesetztes Fahrzeug erhält drei Sekunden Schutz, der beim eigenen Schuss endet. Fahrzeuge sollen aus der Basis über zwei Ausgänge ausfahren können.

## 6. Fahrzeuge

| Eigenschaft | Luchs – leichter Panzer | Keiler – mittlerer Panzer |
| --- | --- | --- |
| Rolle | Flankieren, schnell zum Ziel gelangen | Stellung halten, Verbündete unterstützen |
| Höchstgeschwindigkeit | 52 km/h | 36 km/h |
| Hauptwaffe | 40-mm-Kanone | 75-mm-Kanone |
| Nachladezeit | 3 Sekunden | 5 Sekunden |
| Panzerung | Dünn, besonders anfällig im offenen Gelände | Gute Front, verwundbare Seiten und Rückseite |
| Turm | Schnelle Drehung | Langsamere Drehung |
| Typischer Vorteil | Kommt um einen langsamen Gegner herum | Übersteht eher einen ungünstigen Frontalkontakt |
| Typischer Nachteil | Direkter Schlagabtausch ist riskant | Flankierende Gegner sind schwer abzufangen |

Kaliber und Geschwindigkeiten dienen der Gestaltung; eine historische Simulation ist nicht vorgesehen. Beide Panzer können einander mit guten Treffern besiegen. Für den Prototyp reichen eine panzerbrechende Munitionsart und zwei Rauchladungen pro Fahrzeugleben.

Ein späterer dritter Fahrzeugtyp wäre ein turmloser Jagdpanzer mit starker Frontbewaffnung und deutlich eingeschränktem Schusswinkel.

## 7. Steuerung und Kamera

| Eingabe | Aktion |
| --- | --- |
| W / S | Vorwärts / bremsen und rückwärts |
| A / D | Wanne drehen |
| Maus | Blickrichtung und Zielvorgabe für den Turm |
| Linke Maustaste | Hauptwaffe abfeuern |
| Rechte Maustaste halten | Näher heranzoomen |
| Leertaste | Schnell abbremsen |
| Q | Rauch ausstoßen |
| R halten | Im Stillstand beschädigte Module reparieren |
| Esc | Pause und Menü im Einzelspieler |

Die Kamera folgt leicht erhöht hinter dem Panzer. Das Fadenkreuz zeigt zusätzlich die tatsächliche Rohrrichtung: Ein langsamer Turm schießt erst nach seiner Drehung an die gewünschte Stelle. Beim ersten Start werden Maussteuerung und Freigabe über Esc erklärt.

Geschosse haben Flugzeit und einen vereinfachten Fall. Das Fahrzeug kann während der Fahrt feuern, trifft im Stillstand aber leichter. Bildschirmwackeln ist abschaltbar, die Mausgeschwindigkeit einstellbar.

## 8. Treffer und Schäden

Jeder Treffer beantwortet drei Fragen: Welche Fläche wurde getroffen? Dringt das Geschoss unter diesem Winkel durch? Welches Bauteil liegt auf seinem weiteren Weg?

Für den Prototyp genügt eine vereinfachte Berechnung mit Panzerungszonen an Front, Seite, Heck und Turm sowie internen Trefferkörpern. Sehr flache Winkel können Abpraller erzeugen. Ein Durchschlag reduziert die interne Struktur und kann ein Modul beschädigen. Bei aufgebrauchter Struktur ist das Fahrzeug ausgeschaltet. Diese vereinfachte Struktur ist ein Hilfsmittel, bis das Komponentenmodell ausreichend gut funktioniert.

| Modul | Auswirkung bei Ausfall |
| --- | --- |
| Kette | Fahrzeug steht, Turm und Waffe bleiben bedienbar |
| Motor | Fahrzeug fährt deutlich langsamer |
| Turmantrieb | Turm dreht erheblich langsamer |

Eine Reparatur dauert sechs Sekunden ohne Bewegung oder eigenen Schuss und stellt ausgefallene Module wieder her, aber keine verlorene Struktur. Bewegung, eigener Schuss oder ein neuer durchschlagender Treffer brechen sie ab. Rauch nimmt Bots die direkte Sicht, verhindert aber keinen Treffer.

Treffermeldungen unterscheiden „Abpraller“, „Durchschlag“, „Kette beschädigt“ und „Fahrzeug ausgeschaltet“. Am eigenen Fahrzeug zeigt ein kleines Schema ausgefallene Module zusätzlich zu Textmeldungen. Besatzung, Munitionsdetonation und Brandbekämpfung sind spätere Erweiterungen.

## 9. Karte „Grenzposten“

Eine kompakte Karte mit ungefähr 600 × 600 Metern nutzbarer Fläche. Das zentrale Dorf enthält den Eroberungspunkt. Die Hauptstraße ermöglicht schnelle, riskante Vorstöße. Eine Hügelroute bietet erhöhte Feuerstellungen, ein trockenes Flussbett seitliche Annäherung mit kurzen Sichtlinien.

Häuser, Felsen und Geländekanten bieten feste Deckung. Bäume und Büsche dienen zunächst nur der Gestaltung; Rauch verdeckt tatsächlich die Sicht. Große Landmarken machen die Wege ohne ständigen Blick auf die Minikarte erkennbar.

Die Karte ist funktional ausgeglichen: Beide Teams brauchen ähnlich lange zum Ziel und haben vergleichbare Deckung. Gebäude bleiben im Prototyp unzerstörbar. Kartenränder werden durch Gelände und Hindernisse klar sichtbar begrenzt.

## 10. Bots

Bots fahren über ein einfaches Wegenetz, nehmen den Punkt ein, suchen Deckung und bekämpfen sichtbare Ziele. Sie berücksichtigen Hindernisse, eigene Nachladepausen und freie Schusslinien. Festgefahrene Bots setzen zurück und suchen einen anderen Weg.

Sie kennen keine Gegnerpositionen durch feste Deckung oder Rauch. Nach Sichtverlust können sie kurz auf die zuletzt bekannte Position reagieren. Begrenzte Reaktionsgeschwindigkeit und Zielfehler lassen dem Spieler Zeit zum Handeln. Eigene Fahrzeuge blockieren Schüsse, erhalten im ersten Modus aber keinen verbündeten Schaden.

Für erste Tests genügt eine feste Schwierigkeit. Die Bots müssen zuerst die Runde zuverlässig abschließen; weitere taktische Verhaltensweisen folgen danach.

## 11. Garage und Fortschritt

Die Garage zeigt das gewählte Fahrzeug, seine Rolle, wenige verständliche Werte und den Startknopf. Das Ergebnis belohnt Eroberung, Verteidigung, wirksame Treffer und den Teamsieg. Reine Abschüsse sollen nicht die einzige sinnvolle Spielweise sein.

Im Kernprototyp werden keine Fahrzeuge hinter Fortschritt gesperrt. Sobald die Gefechte funktionieren, kommen lokal gespeicherte Statistiken, Lackierungen und die Freischaltung weiterer Fahrzeugrollen hinzu. Eine spätere Export-/Import-Funktion kann Spielstände zwischen Browsern übertragen; rein lokale Speicherung ist keine geräteübergreifende Sicherung.

Keine Reparaturkosten nach Gefechten, kein täglicher Teilnahmezwang und keine bezahlten Stärkevorteile sind vorgesehen. Dauerhafte Fahrzeugschäden und erfahrene Besatzungen gehören ausschließlich zur späteren Kampagnenidee, weil sie dort strategische Bedeutung haben.

## 12. Darstellung und Sound

Stilisierte 3D-Grafik mit klaren Silhouetten, gedeckten Gelände-Farben, warmem Tageslicht und gut lesbaren Effekten. Die Grafik soll vor allem Entfernung, Deckung und Treffer verständlich machen.

Motorgeräusche reagieren auf die Fahrt, Ketten klappern, das Geschütz hat einen kräftigen Schuss und Rückstoß. Abpraller klingen anders als Durchschläge. Rauch, Staub und Einschläge verstärken das Gefühl, dürfen das Zielen aber nicht dauerhaft verdecken.

Die Oberfläche zeigt am oberen Rand Tickets und Restzeit, unten Fahrzeugzustand und Nachladen sowie eine kleine Karte. Gegner bekommen erst bei Sichtkontakt eine Markierung. Freund und Feind sind zusätzlich zur Farbe an Symbolen unterscheidbar.

## 13. Technische Richtung

Vorgesehen ist eine eigenständige Webanwendung mit 3D-Darstellung, vereinfachter Fahrzeugphysik und lokal laufenden Bots. Die konkrete Bibliothekswahl folgt bei der Umsetzung nach Prüfung der vorhandenen Spiele und Entwicklungsumgebung.

Fahrzeugwerte und Missionsregeln werden getrennt von der Darstellung gehalten. Fahrbewegung, Geschosse und Treffer sollen mit einem festen Simulationsschritt laufen. Für das erste Offline-Gefecht ist kein eigener Spielserver nötig. Multiplayer erfordert später eine gesonderte Entscheidung über Server, Synchronisation und Hosting.

Leistungsziel sind flüssige Gefechte mit sechs Fahrzeugen auf einem beim Prototyp festzulegenden Referenzrechner. Schatten, Effekte und Renderauflösung sollen reduzierbar sein. Ladegröße und Bildrate werden erst am laufenden Prototyp gemessen; aktuell gibt es dazu keine bestätigten Werte.

## 14. Reihenfolge der Umsetzung

| Schritt | Ergebnis | Prüfkriterium |
| --- | --- | --- |
| 1. Fahrbarer Panzer | Kleine Testfläche, Kamera, Wanne, Turm und Schuss | Fahren und Zielen funktionieren unabhängig; Hindernisse blockieren die Fahrt |
| 2. Verständliches Duell | Zweiter Panzer, Panzerungszonen, Treffer und Module | Front und Seite reagieren unterschiedlich; Kettenschaden und Reparatur sind nachvollziehbar |
| 3. Vollständiges Gefecht | Grenzposten, fünf Bots, Ziel, Tickets und Wiedereinstieg | Eine Runde endet zuverlässig mit korrektem Ergebnis und lässt sich neu starten |
| 4. Spielbare Erstversion | Garage, Anleitung, Sound, Einstellungen und lokale Statistiken | Einstieg aus dem Browser funktioniert; Einstellungen bleiben nach Neuladen erhalten |
| 5. Einbindung | Spielekarte und verifizierter Link in der Sammlung | Der veröffentlichte Spielelink funktioniert auf der tatsächlichen Zieladresse |

Der erste Bauauftrag umfasst Schritt 1. Er wird auf eigenem Testgelände umgesetzt, damit Fahrgefühl und Zielen beurteilt werden können, bevor Karte und Fortschritt Aufwand verursachen.

## 15. Spätere Erweiterungen

Nach erfolgreicher Erstversion: dritter Panzer, zusätzliche Karte, weitere Missionen und kosmetische Sammlung. Darauf kann eine kleine Kampagne mit verbundenen Einsätzen, Fahrzeugzustand und Besatzungsentwicklung aufbauen.

Multiplayer, Flugzeuge und Schiffe sind eigenständige größere Ausbaustufen. Sie werden erst konkret geplant, wenn das Panzergefecht überzeugt. Drei parallele Realismusmodi, große Forschungsbäume und vollständig zerstörbare Karten gehören nicht zum ersten Entwicklungsumfang.

## 16. Entwurf für die Spielekarte

**Name:** Iron Horizon

**Beschreibung:** Steuere deinen Panzer, nutze Deckung und erobere den Grenzposten. Kurze 3D-Gefechte gegen Bots mit gezielten Treffern und unterschiedlichen Fahrzeugen.

**Tags:** Einzelspieler · 3D · Panzerkampf

**Status:** Konzept. Die bestehende Startseite wird erst bei der späteren Einbindung geändert.
