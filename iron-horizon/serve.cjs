// Lokaler Vorschau-Server für Tests: startet den normalen Spielserver nur auf 127.0.0.1:4177.
process.env.PORT = process.env.PORT || '4177';
process.env.HOST = process.env.HOST || '127.0.0.1';
require('../server.js');
