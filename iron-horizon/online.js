/* Online lobby: WebSocket connection to the room server, lobby panel, invite link (?raum=CODE).
   The battle itself is handled in game.js through IronOnline.on(type, handler). */
(function () {
  'use strict';
  const $ = id => document.getElementById(id);
  const NAMES = { luchs: 'Luchs', keiler: 'Keiler', dachs: 'Dachs', wiesel: 'Wiesel', baer: 'Bär' };
  const handlers = {};
  let socket = null, room = null, queue = [], closedByUs = false, retry = 0;
  let canUse = () => true, pendingCode = null, olympTicket = null, countdown = null;
  const status = (text, bad = false) => { $('lobbyStatus').textContent = text; $('lobbyStatus').classList.toggle('bad', bad); };
  const storedName = () => { try { return localStorage.getItem('iron-horizon-online-name') || ''; } catch (_) { return ''; } };
  const playerName = () => $('lobbyName').value.trim().slice(0, 14) || 'Spieler';

  function connect() {
    if (socket && socket.readyState <= 1) return;
    closedByUs = false;
    socket = new WebSocket(`${location.protocol === 'https:' ? 'wss' : 'ws'}://${location.host}/ws`);
    socket.onopen = () => { retry = 0; const waiting = queue; queue = []; waiting.forEach(send); };
    socket.onmessage = event => { let data; try { data = JSON.parse(event.data); } catch (_) { return; } receive(data); };
    socket.onclose = () => {
      socket = null;
      if (closedByUs) return;
      const hadRoom = !!room; room = null; render();
      handlers.closed?.({ text: 'Die Verbindung zum Server ist abgebrochen.' });
      status(hadRoom ? 'Verbindung verloren. Tritt dem Raum mit dem Code neu bei.' : 'Keine Verbindung zum Server. Neuer Versuch …', true);
      if (!hadRoom && retry++ < 3 && !$('lobby').hidden) setTimeout(connect, 1500 * retry);
    };
  }
  function send(data) {
    if (socket?.readyState === 1) socket.send(JSON.stringify(data));
    else { queue.push(data); connect(); }
  }
  function receive(data) {
    if (data.t === 'room') {
      room = data.code ? data : null; render();
      if (room) { try { history.replaceState(null, '', `${location.pathname}?raum=${room.code}`); } catch (_) {} }
      handlers.room?.(room);
    } else if (data.t === 'error') status(data.text, true);
    else handlers[data.t]?.(data);
  }

  function render() {
    const inRoom = !!room, me = room?.members.find(m => m.id === room.you), host = inRoom && room.host === room.you, olymp = room?.olymp;
    $('lobbyJoin').hidden = inRoom || !!olympTicket; $('lobbyRoom').hidden = !inRoom;
    $('lobbyName').disabled = !!olympTicket; $('lobbyOlymp').hidden = !olymp;
    clearInterval(countdown); countdown = null;
    if (!inRoom) return;
    let tick = null;
    if (olymp) {
      $('olympExpected').replaceChildren(...olymp.expected.map(e => { const item = document.createElement('li'); item.className = e.here ? 'here' : ''; item.textContent = `${e.here ? '✓' : '…'} ${e.name}`; return item; }));
      if (olymp.startIn != null && room.phase === 'lobby') {
        const until = Date.now() + olymp.startIn, fehlt = olymp.expected.filter(e => !e.here).length;
        tick = () => {
          const sek = Math.max(0, Math.ceil((until - Date.now()) / 1000));
          $('lobbyHint').textContent = fehlt ? `Warte auf ${fehlt} Mitspieler – spätestens in ${sek} Sekunden geht es los.` : `Alle da – das Gefecht startet in ${sek} Sekunden.`;
        };
        countdown = setInterval(tick, 250);
      }
    }
    $('copyInvite').hidden = $('leaveRoom').hidden = !!olymp;
    $('roomCodeLabel').textContent = room.code;
    for (const team of ['blue', 'red']) {
      const list = $(team === 'blue' ? 'teamBlue' : 'teamRed'), members = room.members.filter(m => m.team === team);
      list.replaceChildren(...members.map(m => {
        const item = document.createElement('li'); item.className = m.id === room.you ? 'me' : '';
        item.textContent = `${m.id === room.host ? '★ ' : ''}${m.name} · ${NAMES[m.vehicle]}`; return item;
      }), ...Array.from({ length: 3 - members.length }, () => { const item = document.createElement('li'); item.className = 'bot'; item.textContent = 'Bot'; return item; }));
    }
    $('joinBlue').disabled = me.team === 'blue'; $('joinRed').disabled = me.team === 'red';
    document.querySelectorAll('#lobbyVehicles button').forEach(button => {
      button.setAttribute('aria-pressed', String(button.dataset.vehicle === me.vehicle));
      button.disabled = !canUse(button.dataset.vehicle);
    });
    for (const [id, key] of [['roomMap', 'map'], ['roomMission', 'mission'], ['roomDifficulty', 'difficulty']]) { $(id).value = room.settings[key]; $(id).disabled = !host || !!olymp; }
    $('startOnline').hidden = !host || !!olymp?.started; $('startOnline').disabled = room.phase !== 'lobby';
    $('startOnline').firstChild.textContent = olymp ? 'OHNE DIE ANDEREN STARTEN ' : 'GEFECHT STARTEN ';
    $('lobbyHint').textContent = room.phase === 'battle' ? 'Das Gefecht läuft.'
      : olymp ? 'Sobald alle aus deiner Gruppe da sind, startet das Gefecht von selbst. Wähl solange deinen Panzer.'
      : host ? 'Du bist Gastgeber: Dein Browser rechnet das Gefecht. Lass den Tab im Vordergrund, bis es vorbei ist.' : 'Warte, bis der Gastgeber startet.';
    if (tick) tick();
  }

  function open(code = null) {
    $('lobby').hidden = false; status('');
    if (!$('lobbyName').value) $('lobbyName').value = storedName();
    if (code) $('roomCode').value = code;
    render(); connect();
    ($('lobbyName').value ? room ? $('startOnline') : $('createRoom') : $('lobbyName')).focus?.();
  }
  function rememberName() { try { localStorage.setItem('iron-horizon-online-name', playerName()); } catch (_) {} }
  function init({ vehicle, allowed }) {
    canUse = allowed;
    $('onlineButton').onclick = () => open();
    $('closeLobby').onclick = () => { $('lobby').hidden = true; };
    $('lobbyVehicles').dataset.initial = vehicle();
    $('createRoom').onclick = () => { rememberName(); status('Raum wird erstellt …'); send({ t: 'create', name: playerName(), vehicle: vehicle() }); };
    $('joinRoom').onclick = () => {
      const code = $('roomCode').value.trim().toUpperCase();
      if (!/^[A-Z]{4}$/.test(code)) return status('Der Raumcode hat vier Buchstaben.', true);
      rememberName(); status('Trete bei …'); send({ t: 'join', code, name: playerName(), vehicle: vehicle() });
    };
    $('roomCode').addEventListener('keydown', event => { if (event.key === 'Enter') $('joinRoom').click(); });
    $('lobbyName').addEventListener('change', () => { rememberName(); if (room) send({ t: 'name', name: playerName() }); });
    $('joinBlue').onclick = () => send({ t: 'team', team: 'blue' }); $('joinRed').onclick = () => send({ t: 'team', team: 'red' });
    document.querySelectorAll('#lobbyVehicles button').forEach(button => { button.onclick = () => send({ t: 'vehicle', vehicle: button.dataset.vehicle }); });
    for (const id of ['roomMap', 'roomMission', 'roomDifficulty']) $(id).onchange = () => send({ t: 'settings', map: $('roomMap').value, mission: $('roomMission').value, difficulty: $('roomDifficulty').value });
    $('startOnline').onclick = () => send({ t: 'start' });
    $('leaveRoom').onclick = () => { send({ t: 'leave' }); room = null; render(); try { history.replaceState(null, '', location.pathname); } catch (_) {} status('Raum verlassen.'); };
    $('copyInvite').onclick = async () => {
      const link = `${location.origin}${location.pathname}?raum=${room.code}`;
      try { await navigator.clipboard.writeText(link); status('Einladungslink kopiert.'); } catch (_) { status(link); }
    };
    pendingCode = new URLSearchParams(location.search).get('raum');
    if (pendingCode && /^[A-Za-z]{4}$/.test(pendingCode)) {
      open(pendingCode.toUpperCase());
      if (storedName()) { $('lobbyName').value = storedName(); $('joinRoom').click(); }
      else status('Gib deinen Namen ein und tritt dem Raum bei.');
    }
  }

  // Olympiade: straight into the group's room with the signed ticket.
  function olympJoin(ticket) {
    olympTicket = ticket; $('lobby').hidden = false; $('lobbyTitle').textContent = 'Olympia-Schlacht.';
    try { $('lobbyName').value = JSON.parse(decodeURIComponent(escape(atob(ticket.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))))).n || ''; } catch (_) {}
    status('Verbinde mit deiner Gruppe …'); render(); send({ t: 'olymp', ticket, vehicle: $('lobbyVehicles').dataset.initial || undefined });
  }
  window.IronOnline = {
    init, open, send, olymp: olympJoin, on: (type, handler) => { handlers[type] = handler; },
    show: () => { $('lobby').hidden = false; render(); }, hide: () => { $('lobby').hidden = true; },
    get room() { return room; }, render
  };
})();
