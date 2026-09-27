/* Iron Horizon — local 3v3 conquest and training. Three.js is vendored. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const start = $('startButton');
  function fail(message) { $('error').hidden = false; $('error').textContent = message; start.disabled = true; start.firstChild.textContent = 'START NICHT MÖGLICH '; }
  if (!window.THREE || !window.IronBattle || !window.IronSystems || !window.IronCareer || !window.IronMaps || !window.IronTerrain) { fail('Spieldateien konnten nicht geladen werden. Bitte lade die Seite neu und prüfe den Spielordner.'); return; }
  const T = window.THREE;
  const Systems = window.IronSystems;
  const Career = window.IronCareer;
  const careerStore = new Career.Store({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
  let roundId = '', pendingImport = null;
  const withCareerLock = action => navigator.locks?.request ? navigator.locks.request('iron-horizon-career', action) : Promise.resolve().then(action);
  let selectedVehicle = 'luchs', selectedMap = 'border', level = IronMaps.levels.border, terrain = null;
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
  catch (_) { fail('Dein Browser konnte WebGL nicht starten. Bitte öffne das Spiel in einem Browser mit aktivierter Hardwarebeschleunigung.'); return; }
  renderer.setPixelRatio(Math.min(devicePixelRatio, 1.7));
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = T.PCFSoftShadowMap;
  renderer.outputEncoding = T.sRGBEncoding;
  renderer.toneMapping = T.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1;
  const scene = new T.Scene();
  scene.background = new T.Color('#abb6a6');
  scene.fog = new T.FogExp2('#abb6a6', .0033);
  const camera = new T.PerspectiveCamera(58, 1, .15, 900);
  const hemi = new T.HemisphereLight('#e1e8df', '#645b3c', .75);
  scene.add(hemi);
  const sun = new T.DirectionalLight('#ffe3b1', 1.35);
  sun.position.set(-65, 100, 45); sun.castShadow = true;
  Object.assign(sun.shadow.camera, { left: -110, right: 110, top: 110, bottom: -110, near: 1, far: 280 });
  sun.shadow.mapSize.set(2048, 2048); sun.shadow.bias = -.0005; scene.add(sun);
  const materials = {};
  function mat(color, roughness = .9) {
    const key = color + roughness;
    return materials[key] || (materials[key] = new T.MeshStandardMaterial({ color: new T.Color(color).convertSRGBToLinear(), roughness, metalness: .08 }));
  }
  function box(w, h, d, color, parent, x = 0, y = 0, z = 0) {
    const mesh = new T.Mesh(new T.BoxGeometry(w, h, d), mat(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  function cyl(top, bottom, h, color, parent, x = 0, y = 0, z = 0, sides = 12) {
    const mesh = new T.Mesh(new T.CylinderGeometry(top, bottom, h, sides), mat(color));
    mesh.position.set(x, y, z); mesh.castShadow = true; mesh.receiveShadow = true; parent.add(mesh); return mesh;
  }
  let seed = 713;
  function random() { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; }
  const obstacles = [], solids = [], targets = [], particles = [], shells = [];
  function loadMap(id) {
    const next = IronMaps.levels[id] || IronMaps.levels.border;
    if (terrain && level === next) return;
    if (terrain) { scene.remove(terrain.group); terrain.dispose(); }
    level = next; terrain = IronTerrain.build(T, level, { mat, box, cyl }); scene.add(terrain.group);
    obstacles.splice(0, obstacles.length, ...terrain.obstacles); solids.splice(0, solids.length, ...terrain.solids);
    scene.background.set(level.sky); scene.fog.color.set(level.sky); scene.fog.density = level.fog;
  }
  function refreshMapUi() {
    $('mapSelect').value = level.id; $('mapDescription').textContent = level.description;
    $('missionTitle').textContent = `${level.name} erobern.`; $('missionNumber').textContent = level.number;
    $('locationName').textContent = level.name.toUpperCase();
    $('mapCaption').textContent = `${level.name.toUpperCase()} / ${level.number}`;
    $('pause').querySelector('.eyebrow').textContent = `${level.name.toUpperCase()} ${level.number}`;
  }
  function makeTank(color) {
    const root = new T.Group(); const wheels = [];
    box(3.1, .9, 5.1, color, root, 0, 1.15, 0);
    const glacis = box(3, .42, 1.6, color, root, 0, 1.57, -1.8); glacis.rotation.x = -.2;
    box(3.1, .12, 2, '#737957', root, 0, 1.65, 1.5);
    for (const side of [-1, 1]) {
      box(.78, 1.18, 5.45, '#343a31', root, side * 1.78, .73, 0);
      box(.93, .16, 5.6, color, root, side * 1.78, 1.45, 0);
      for (let j = 0; j < 6; j++) {
        const wheel = cyl(.43, .43, .14, '#6b7153', root, side * 2.19, .72, -2.08 + j * .83);
        wheel.rotation.z = Math.PI / 2; wheels.push(wheel);
        const hub = cyl(.17, .17, .16, '#969573', wheel); hub.position.y = .01;
      }
      for (let j = 0; j < 14; j++) box(.81, .075, .17, '#77745c', root, side * 1.78, 1.33, -2.5 + j * .385);
    }
    const turret = new T.Group(); turret.position.y = 1.75; root.add(turret);
    cyl(1.2, 1.4, .85, color, turret, 0, .25, -.2, 7);
    box(1.6, .65, .6, color, turret, 0, .3, -1.1);
    cyl(.51, .54, .18, '#85896b', turret, .3, .8, .1, 10);
    box(.1, 2.5, .1, '#313c31', turret, -.8, 1.65, .55);
    const gun = new T.Group(); gun.position.set(0, .3, -1.25); turret.add(gun);
    const barrel = cyl(.105, .14, 3, '#4c5944', gun, 0, 0, -1.45); barrel.rotation.x = Math.PI / 2;
    const muzzle = cyl(.16, .16, .3, '#333f32', gun, 0, 0, -3); muzzle.rotation.x = Math.PI / 2;
    box(.8, .15, 1.05, '#545e46', root, -1, 1.75, 1.6);
    box(.7, .4, .85, '#897b55', root, 1, 1.8, 1.7);
    for (const x of [-1.2, 1.2]) box(.26, .2, .12, '#e3d9b0', root, x, 1.35, -2.58);
    // Painted recognition stripes on the hull.
    box(.08, .35, .8, '#dbc990', root, 1.565, 1.2, -.6);
    box(.08, .35, .8, '#dbc990', root, -1.565, 1.2, -.6);
    scene.add(root); return { root, turret, gun, wheels };
  }
  const tank = makeTank('#737c50');
  const player = { ...tank, id: 'player', team: 'blue', hp: 100, alive: true, respawn: 0, shield: 3, hitMeshes: [], yaw: 0, profile: Systems.profiles.luchs, systems: Systems.fresh() };
  tank.root.traverse(object => { if (object.isMesh) { object.userData.vehicle = player; player.hitMeshes.push(object); } });
  const paintMeshes = [];
  tank.root.traverse(object => { if (object.isMesh && object.material === mat('#737c50')) { object.material = object.material.clone(); paintMeshes.push(object); } });
  const paintTextures = new Map();
  function applyPaint() {
    const paint = Career.paints.find(p => p.id === careerStore.state.paints[player.profile.id]) || Career.paints[0];
    let texture = null;
    if (paint.id !== 'olive') {
      if (!paintTextures.has(paint.id)) {
        const canvas = document.createElement('canvas'); canvas.width = canvas.height = 256; const context = canvas.getContext('2d');
        context.fillStyle = paint.colors[0]; context.fillRect(0, 0, 256, 256);
        let patternSeed = 731;
        const patternRandom = () => { patternSeed = (patternSeed * 1664525 + 1013904223) >>> 0; return patternSeed / 4294967296; };
        for (let i = 0; i < 38; i++) {
          const x = patternRandom() * 256, y = patternRandom() * 256; context.fillStyle = paint.colors[1 + i % (paint.colors.length - 1)];
          context.beginPath(); context.moveTo(x, y);
          for (let n = 0; n < 6; n++) { const angle = n * Math.PI / 3; context.lineTo(x + Math.cos(angle) * (12 + patternRandom() * 45), y + Math.sin(angle) * (10 + patternRandom() * 35)); }
          context.closePath(); context.fill();
        }
        const created = new T.CanvasTexture(canvas); created.encoding = T.sRGBEncoding; created.wrapS = created.wrapT = T.RepeatWrapping; paintTextures.set(paint.id, created);
      }
      texture = paintTextures.get(paint.id);
    }
    for (const mesh of paintMeshes) { mesh.material.map = texture; mesh.material.color.set(texture ? '#ffffff' : '#737c50').convertSRGBToLinear(); mesh.material.needsUpdate = true; }
  }
  const targetPlaces = level.training;
  targetPlaces.forEach(([x, z], i) => {
    const enemy = makeTank(i < 2 ? '#637d76' : '#8e6850'); enemy.root.position.set(x, 0, z); enemy.root.rotation.y = .3 + i * 1.1;
    const hitMeshes = []; enemy.root.traverse(object => { if (object.isMesh) { object.userData.target = i; hitMeshes.push(object); } });
    const ring = new T.Mesh(new T.RingGeometry(3.5, 3.65, 48), new T.MeshBasicMaterial({ color: '#eab577', side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(x, .09, z); scene.add(ring);
    const flagGroup = new T.Group(); flagGroup.position.set(x, 0, z); scene.add(flagGroup);
    box(.1, 5, .1, '#d6c6a0', flagGroup, 3.5, 2.5, 0);
    box(1.6, .9, .08, '#c5814b', flagGroup, 4.25, 4.45, 0);
    const bot = { ...enemy, id: i, team: i < 2 ? 'blue' : 'red', hitMeshes, ring, flagGroup, x, z, hits: 0, hp: 100, alive: true, respawn: 0, shield: 0, yaw: 0, turretYaw: 0, reload: 0, path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, visibleToPlayer: false };
    hitMeshes.forEach(mesh => { mesh.userData.vehicle = bot; });
    const label = document.createElement('div'); label.className = 'vehicle-label' + (bot.team === 'blue' ? ' friendly' : ''); label.hidden = true; $('labels').appendChild(label); bot.label = label;
    targets.push(bot);
    bot.systems = Systems.fresh(); applyProfile(bot, i === 1 || i === 4 ? 'keiler' : 'luchs');
  });
  function applyProfile(vehicle, id) {
    vehicle.profile = Systems.profiles[id]; const heavy = id === 'keiler';
    vehicle.root.scale.set(heavy ? 1.12 : 1, heavy ? 1.08 : 1, heavy ? 1.1 : 1);
    vehicle.turret.scale.set(heavy ? 1.16 : 1, heavy ? 1.1 : 1, heavy ? 1.06 : 1);
    vehicle.gun.scale.set(heavy ? 1.65 : 1, heavy ? 1.65 : 1, heavy ? 1.18 : 1);
  }
  function selectVehicle(id) {
    if (mode !== 'menu' || !Systems.profiles[id]) return;
    selectedVehicle = id; applyProfile(player, id); saveSettings(); refreshVehicleUi();
  }
  function refreshVehicleUi() {
    const p = player.profile;
    $('selectLuchs').setAttribute('aria-pressed', String(p.id === 'luchs')); $('selectKeiler').setAttribute('aria-pressed', String(p.id === 'keiler'));
    $('vehicleIndex').textContent = p.id === 'luchs' ? '01 / 02' : '02 / 02';
    $('vehicleName').innerHTML = `${p.name} <span>${p.version}</span>`; $('vehicleRole').textContent = p.role;
    $('vehicleSpeed').innerHTML = `${Math.round(p.speed * 3.6)}<small>KM/H</small>`;
    $('vehicleCalibre').innerHTML = `${p.calibre}<small>MM</small>`; $('vehicleReload').innerHTML = `${p.reload}<small>SEK.</small>`;
    $('vehicleNote').textContent = p.note; $('hudVehicle').textContent = `${p.name} ${p.version}`;
    $('hudCalibre').textContent = `${p.calibre} MM · PANZERBRECHEND`;
    applyPaint(); refreshCareer();
  }
  const captureZone = new T.Group(); captureZone.position.set(0, 0, -10); scene.add(captureZone);
  const captureRing = new T.Mesh(new T.RingGeometry(16.7, 17, 80), new T.MeshBasicMaterial({ color: '#dfc18c', side: T.DoubleSide }));
  captureRing.rotation.x = -Math.PI / 2; captureRing.position.y = .11; captureZone.add(captureRing);
  cyl(.1, .14, 8, '#c4c8af', captureZone, 0, 4, 0, 8);
  const captureFlag = box(3, 1.5, .06, '#b8ae83', captureZone, 1.5, 7, 0); captureFlag.material = captureFlag.material.clone();
  let gameType = 'battle', match = new IronBattle.Match(), stats = { hits: 0, kills: 0, deaths: 0, captureSeconds: 0 }, damageTime = 0;
  const combatRay = new T.Raycaster();
  function shotObjects(exclude) { return [...solids, ...(gameType === 'battle' && player.alive && exclude !== player ? player.hitMeshes : []), ...targets.filter(t => t.alive && t !== exclude).flatMap(t => t.hitMeshes)]; }
  const ray = new T.Raycaster(), aimRay = new T.Raycaster(), cameraRay = new T.Raycaster();
  const cameraAnchor = new T.Vector3(), cameraDirection = new T.Vector3();
  const aimPoint = new T.Vector3(), direction = new T.Vector3(), temp = new T.Vector3();
  const keys = new Set();
  let mode = 'menu', velocity = 0, hullYaw = 0, turretYaw = 0, viewYaw = 0, pitch = -.16;
  let reload = 0, recoil = 0, zoom = false, elapsed = 0, noticeTime = 0, dustTime = 0, hitCount = 0;
  let sensitivity = 1, soundEnabled = true, shakeEnabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let audio, engine, engineGain;
  const particleGeometry = new T.SphereGeometry(1, 5, 4);
  const puffMaterials = ['#d8c4a0', '#edb36b', '#a29a7d', '#f4d28a'].map(color => new T.MeshBasicMaterial({ color }));
  try { const saved = JSON.parse(localStorage.getItem('iron-horizon-settings') || '{}'); sensitivity = Math.max(.4, Math.min(2, Number(saved.sensitivity) || 1)); soundEnabled = saved.sound !== false; if (typeof saved.shake === 'boolean') shakeEnabled = saved.shake; if (Systems.profiles[saved.vehicle]) selectedVehicle = saved.vehicle; if (Object.hasOwn(IronMaps.levels, saved.map)) selectedMap = saved.map; } catch (_) { /* Storage may be disabled. */ }
  $('sensitivity').value = sensitivity; $('sound').checked = soundEnabled; $('shake').checked = shakeEnabled;
  function saveSettings() { try { localStorage.setItem('iron-horizon-settings', JSON.stringify({ sensitivity, sound: soundEnabled, shake: shakeEnabled, vehicle: selectedVehicle, map: selectedMap })); } catch (_) {} }
  $('mapSelect').onchange = event => {
    if (mode !== 'menu' || !Object.hasOwn(IronMaps.levels, event.target.value)) return;
    selectedMap = event.target.value; saveSettings(); reset();
  };
  $('selectLuchs').onclick = () => selectVehicle('luchs'); $('selectKeiler').onclick = () => selectVehicle('keiler');
  $('sensitivity').oninput = event => { sensitivity = Number(event.target.value); saveSettings(); };
  $('sound').onchange = event => { soundEnabled = event.target.checked; saveSettings(); };
  $('shake').onchange = event => { shakeEnabled = event.target.checked; saveSettings(); };
  function paintBackground(paint) { return `linear-gradient(135deg, ${paint.colors.map((color, i) => `${color} ${i * 100 / paint.colors.length}%, ${color} ${(i + 1) * 100 / paint.colors.length}%`).join(', ')})`; }
  function refreshCareer() {
    const state = careerStore.state, rank = Career.rank(state.xp), currentPaint = state.paints[player.profile.id];
    $('garageRank').textContent = `${rank.current.name.toUpperCase()} · ${state.xp.toLocaleString('de-DE')} EP`;
    $('careerTitle').textContent = rank.current.name;
    $('careerProgress').textContent = rank.next ? `${state.xp.toLocaleString('de-DE')} EP gesamt · Noch ${(rank.next.xp - state.xp).toLocaleString('de-DE')} EP bis ${rank.next.name}` : `${state.xp.toLocaleString('de-DE')} EP gesamt · Höchster Rang erreicht`;
    $('careerProgressBar').style.width = `${rank.next ? (state.xp - rank.current.xp) / (rank.next.xp - rank.current.xp) * 100 : 100}%`;
    const fields = [['GEFECHTE', state.matches], ['SIEGE', state.wins], ['ABSCHÜSSE', state.kills], ['TREFFER', state.hits], ['VERLUSTE', state.deaths], ['ZIELZEIT', `${Math.floor(state.captureSeconds / 60)} MIN`], ['BESTES GEFECHT', `${state.bestXp} EP`], ['SIEGQUOTE', `${state.matches ? Math.round(state.wins / state.matches * 100) : 0}%`]];
    $('careerStats').innerHTML = fields.map(([label, value]) => `<span>${label}<b>${value}</b></span>`).join('');
    $('paintVehicle').textContent = player.profile.name;
    for (const [container, detailed] of [[$('garagePaints'), false], [$('careerPaints'), true]]) {
      container.replaceChildren();
      for (const paint of Career.paints) {
        const unlocked = state.xp >= paint.xp, button = document.createElement('button');
        button.type = 'button'; button.disabled = !unlocked; button.dataset.paint = paint.id; button.setAttribute('aria-pressed', String(currentPaint === paint.id));
        button.title = `${paint.name}${unlocked ? '' : ` · ab ${paint.xp} EP`}`; button.setAttribute('aria-label', button.title);
        if (detailed) { const swatch = document.createElement('i'); swatch.style.background = paintBackground(paint); const label = document.createElement('span'); label.textContent = paint.name; const hint = document.createElement('small'); hint.textContent = unlocked ? currentPaint === paint.id ? 'AUSGERÜSTET' : 'VERFÜGBAR' : `${paint.xp} EP`; button.append(swatch, label, hint); }
        else button.style.background = paintBackground(paint);
        button.onclick = () => withCareerLock(() => { if (careerStore.choose(player.profile.id, paint.id)) { applyPaint(); refreshCareer(); $('careerStatus').textContent = careerStore.warning || `${paint.name} für ${player.profile.name} ausgerüstet.`; } });
        container.appendChild(button);
      }
    }
  }
  function closeCareer() { $('careerPanel').hidden = true; pendingImport = null; $('importPreview').hidden = true; $('careerButton').focus(); }
  $('careerButton').onclick = () => { if (mode !== 'menu') return; if (!careerStore.protected) careerStore.read(); refreshCareer(); $('careerStatus').textContent = careerStore.warning; $('careerPanel').hidden = false; $('closeCareer').focus(); };
  $('closeCareer').onclick = closeCareer;
  $('exportSave').onclick = () => {
    const blob = new Blob([JSON.stringify(careerStore.state, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob), link = document.createElement('a'); link.href = url; link.download = 'iron-horizon-spielstand.json'; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
    $('careerStatus').textContent = 'Spielstand-Export wurde gestartet.';
  };
  $('importSave').onclick = () => { $('saveFile').value = ''; $('saveFile').click(); };
  $('saveFile').onchange = async event => {
    const file = event.target.files[0]; if (!file) return;
    pendingImport = null; $('importPreview').hidden = true;
    try {
      if (file.size > 128 * 1024) throw new Error('Die Datei ist zu groß. Bitte wähle einen Iron-Horizon-Export.');
      pendingImport = Career.validate(JSON.parse(await file.text()));
      $('importDetails').textContent = `${pendingImport.xp} EP · ${pendingImport.matches} Gefechte · ${Career.rank(pendingImport.xp).current.name}. Dieser Import ersetzt deinen bisherigen Fortschritt (${careerStore.state.xp} EP). Exportiere ihn vorher, wenn du ihn behalten möchtest.`;
      $('importPreview').hidden = false; $('careerStatus').textContent = 'Datei geprüft. Der aktuelle Spielstand wurde noch nicht geändert.';
    } catch (error) { $('careerStatus').textContent = error instanceof SyntaxError ? 'Die Datei enthält keinen gültigen JSON-Spielstand.' : error.message; }
  };
  $('cancelImport').onclick = () => { pendingImport = null; $('importPreview').hidden = true; $('careerStatus').textContent = 'Import abgebrochen. Dein Spielstand bleibt erhalten.'; };
  $('confirmImport').onclick = () => withCareerLock(() => {
    if (!pendingImport) return;
    const saved = careerStore.commit(pendingImport, true); pendingImport = null; $('importPreview').hidden = true; refreshCareer(); applyPaint();
    $('careerStatus').textContent = saved ? 'Spielstand importiert und lokal gespeichert.' : careerStore.warning;
  });
  window.addEventListener('storage', event => { if (event.key === Career.KEY && !careerStore.protected) { careerStore.read(); refreshCareer(); if (mode === 'menu') applyPaint(); } });
  async function recordRound() {
    const id = roundId, result = match.result, finalStats = { ...stats };
    $('earnedXp').textContent = 'Erfahrung wird gezählt …'; $('xpBreakdown').textContent = $('unlockNotice').textContent = $('saveStatus').textContent = '';
    try {
      const previousRank = Career.rank(careerStore.state.xp).current.name;
      const reward = await withCareerLock(() => careerStore.award(id, result, finalStats)); refreshCareer();
      if (roundId !== id || mode !== 'result') return;
      $('earnedXp').textContent = `+${reward.xp} EP`;
      const b = reward.breakdown;
      $('xpBreakdown').textContent = reward.duplicate ? 'Dieses Gefecht wurde bereits verbucht.' : `Gefecht ${b.participation} · Ergebnis ${b.outcome} · Abschüsse ${b.kills} · Treffer ${b.hits} · Zielbeitrag ${b.objective}`;
      const currentRank = Career.rank(careerStore.state.xp).current.name;
      $('unlockNotice').textContent = [currentRank !== previousRank ? `Neuer Rang: ${currentRank}` : '', ...reward.unlocks.map(p => `Freigeschaltet: ${p.name}`)].filter(Boolean).join(' · ');
      $('saveStatus').textContent = reward.saved ? 'Fortschritt lokal gespeichert.' : careerStore.warning;
    } catch (_) { if (roundId === id) { $('earnedXp').textContent = 'Fortschritt nicht verbucht'; $('saveStatus').textContent = 'Der Spielstand konnte nicht aktualisiert werden. Ein Export des bestehenden Profils bleibt möglich.'; } }
  }
  function initAudio() {
    try {
      if (!audio) {
        audio = new (window.AudioContext || window.webkitAudioContext)(); engine = audio.createOscillator(); engineGain = audio.createGain();
        engine.type = 'sawtooth'; engine.frequency.value = 38; engineGain.gain.value = 0;
        const filter = audio.createBiquadFilter(); filter.frequency.value = 160; engine.connect(filter); filter.connect(engineGain); engineGain.connect(audio.destination); engine.start();
      }
      audio.resume().catch(() => {});
    } catch (_) { /* Sound is optional. */ }
  }
  function tone(frequency, duration, volume, endFrequency = 25) {
    if (!audio || !soundEnabled) return;
    const oscillator = audio.createOscillator(), gain = audio.createGain(), t = audio.currentTime;
    oscillator.type = 'triangle'; oscillator.frequency.setValueAtTime(frequency, t); oscillator.frequency.exponentialRampToValueAtTime(endFrequency, t + duration);
    gain.gain.setValueAtTime(volume, t); gain.gain.exponentialRampToValueAtTime(.001, t + duration);
    oscillator.connect(gain); gain.connect(audio.destination); oscillator.start(); oscillator.stop(t + duration);
    oscillator.onended = () => { oscillator.disconnect(); gain.disconnect(); };
  }
  function notify(message, seconds = 3) { $('notice').textContent = message; noticeTime = seconds; }
  function puff(position, count, kind = 0) {
    for (let i = 0; i < count && particles.length < 130; i++) {
      const mesh = new T.Mesh(particleGeometry, puffMaterials[kind]); mesh.position.copy(position); mesh.scale.setScalar(.08 + random() * .2); scene.add(mesh);
      particles.push({ mesh, life: .5 + random() * .8, max: 1.3, velocity: new T.Vector3((random() - .5) * 6, random() * 4, (random() - .5) * 6), kind });
    }
  }
  const smokeClouds = [];
  const smokeCanvas = document.createElement('canvas'); smokeCanvas.width = smokeCanvas.height = 64;
  const smokeContext = smokeCanvas.getContext('2d');
  const smokeGradient = smokeContext.createRadialGradient(32, 32, 0, 32, 32, 32);
  smokeGradient.addColorStop(0, 'rgba(225,226,214,1)'); smokeGradient.addColorStop(.5, 'rgba(210,213,198,.85)'); smokeGradient.addColorStop(1, 'rgba(200,207,191,0)');
  smokeContext.fillStyle = smokeGradient; smokeContext.fillRect(0, 0, 64, 64);
  const smokeTexture = new T.CanvasTexture(smokeCanvas);
  function clearSmoke() {
    for (const cloud of smokeClouds) { scene.remove(cloud.group); cloud.group.children.forEach(sprite => sprite.material.dispose()); }
    smokeClouds.length = 0;
  }
  function deploySmoke() {
    if (!Systems.useSmoke(player.systems)) { notify(player.systems.smokeCharges === 0 ? 'KEINE RAUCHLADUNG MEHR' : 'RAUCH WIRD BEREITGEMACHT', 2); return; }
    const group = new T.Group(); group.position.copy(tank.root.position); scene.add(group);
    const cloud = { x: group.position.x, y: 2.5, z: group.position.z, radius: 7, life: 10, group };
    for (let i = 0; i < 26; i++) {
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: smokeTexture, color: '#bbc1ad', transparent: true, opacity: .78, depthWrite: false }));
      const angle = random() * Math.PI * 2, radius = random() * 5;
      sprite.position.set(Math.cos(angle) * radius, 1 + random() * 4, Math.sin(angle) * radius);
      sprite.scale.setScalar(5 + random() * 3); sprite.material.rotation = random() * Math.PI; group.add(sprite);
    }
    smokeClouds.push(cloud); tone(220, .7, .09, 60);
    targets.forEach(bot => { bot.visibleToPlayer = false; bot.thinkTimer = 0; });
    notify('RAUCH AKTIV · SICHT FÜR 10 SEKUNDEN VERDECKT\nGeschosse können den Rauch weiterhin durchdringen.', 3);
  }
  function updateSmoke(dt) {
    for (let i = smokeClouds.length - 1; i >= 0; i--) {
      const cloud = smokeClouds[i]; cloud.life -= dt; cloud.radius = 7 * Math.min(1, Math.max(0, cloud.life / 2));
      for (const sprite of cloud.group.children) { sprite.material.opacity = .78 * Math.min(1, Math.max(0, cloud.life / 2)); sprite.material.rotation += dt * .02; }
      if (cloud.life <= 0) { scene.remove(cloud.group); cloud.group.children.forEach(sprite => sprite.material.dispose()); smokeClouds.splice(i, 1); }
    }
  }
  function reset() {
    loadMap(selectedMap); refreshMapUi(); captureZone.position.set(level.capture.x, 0, level.capture.z);
    roundId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    tank.root.position.set(level.playerStart[0], 0, level.playerStart[1]); hullYaw = turretYaw = viewYaw = 0; pitch = -.16; velocity = reload = recoil = hitCount = 0; zoom = false; keys.clear();
    match = new IronBattle.Match(); stats = { hits: 0, kills: 0, deaths: 0, captureSeconds: 0 }; damageTime = 0;
    Object.assign(player, { hp: 100, alive: true, respawn: 0, shield: 3, yaw: 0, systems: Systems.fresh() }); tank.root.visible = true;
    applyProfile(player, selectedVehicle); refreshVehicleUi(); clearSmoke();
    for (const target of targets) {
      [target.x, target.z] = level.training[target.id]; target.ring.position.set(target.x, .09, target.z); target.flagGroup.position.set(target.x, 0, target.z);
      target.hits = 0; target.systems = Systems.fresh(); target.ring.material.color.set('#eab577'); target.flagGroup.visible = gameType === 'training'; target.label.hidden = true;
      Object.assign(target, { hp: 100, alive: true, respawn: 0, shield: 3, reload: 1 + random(), path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, visibleToPlayer: false });
      target.root.visible = true; target.ring.visible = gameType === 'training';
      if (gameType === 'training') { target.root.position.set(target.x, 0, target.z); target.yaw = .3 + target.id * 1.1; }
      else { target.root.position.set(...spawnCoordinates(target)); target.yaw = target.team === 'blue' ? 0 : Math.PI; }
      target.turretYaw = target.yaw; target.root.rotation.y = target.yaw; target.turret.rotation.y = 0; target.gun.rotation.x = 0;
    }
    captureZone.visible = gameType === 'battle'; $('matchHud').hidden = gameType !== 'battle'; $('captureTrack').hidden = gameType !== 'battle'; $('healthTrack').hidden = gameType !== 'battle';
    $('modeLabel').textContent = gameType === 'battle' ? 'VORHERRSCHAFT · 3 GEGEN 3' : 'SCHIESSÜBUNG';
    $('objectiveTitle').textContent = gameType === 'battle' ? 'Erobere Punkt A' : 'Erfasse die Übungsziele';
    $('result').hidden = $('respawn').hidden = $('damageFlash').hidden = true;
    for (const shell of shells) scene.remove(shell.mesh); shells.length = 0;
    for (const particle of particles) scene.remove(particle.mesh); particles.length = 0;
    updateTank(); scene.updateMatrixWorld(true); updateCamera(1, true);
    $('score').textContent = '0 / 5 ZIELE GETROFFEN';
    updateHud();
  }
  function updateTank() {
    tank.root.rotation.y = hullYaw; tank.turret.rotation.y = turretYaw - hullYaw;
    tank.gun.position.z = -1.25 + recoil * .24;
  }
  let lockTimer, lockAttempt = 0, fallbackInput = false, lockUnavailable = false;
  let edgeX = 0, edgeY = 0;
  function beginPlaying(fallback = false) {
    clearTimeout(lockTimer); fallbackInput = fallback; edgeX = edgeY = 0;
    mode = 'playing'; keys.clear(); $('pause').hidden = true;
    document.body.classList.toggle('pointer-locked', !fallback);
    document.body.classList.add('aim-active'); updateCamera(1, true);
    $('retryMouseButton').hidden = !lockUnavailable;
    if (fallback) notify('VORSCHAUSTEUERUNG AKTIV\nMaus zielt · Am Bildrand dreht die Sicht weiter · Esc pausiert', 7);
  }
  function lockFailed(attempt = lockAttempt) {
    if (attempt !== lockAttempt || mode !== 'locking') return;
    if (document.pointerLockElement === $('world')) return;
    lockUnavailable = true;
    $('pauseHint').textContent = 'Vorschausteuerung: Die Maus zielt, am Bildrand dreht die Sicht weiter. Weiterfahren setzt das Spiel sofort fort. Echte Mausbindung kannst du unten erneut versuchen.';
    $('externalBrowser').hidden = false;
    beginPlaying(true);
  }
  function play(retryLock = false) {
    // A denied or unanswered lock request must never trap the player in a pause loop.
    const attempt = ++lockAttempt;
    mode = 'locking'; keys.clear(); $('menu').hidden = true; $('pause').hidden = true; $('result').hidden = true; $('hud').hidden = false; $('pauseButton').hidden = false; document.body.classList.add('playing');
    initAudio();
    if (document.pointerLockElement === $('world')) { beginPlaying(); return; }
    if (lockUnavailable && !retryLock) { beginPlaying(true); return; }
    $('pauseHint').textContent = 'Weiterfahren setzt das Spiel fort. Esc gibt die Maus frei und pausiert.';
    try {
      if (typeof $('world').requestPointerLock !== 'function') { lockFailed(attempt); return; }
      const request = $('world').requestPointerLock();
      if (request?.catch) request.catch(() => lockFailed(attempt));
      lockTimer = setTimeout(() => lockFailed(attempt), 1200);
    } catch (_) { lockFailed(attempt); }
    updateCamera(1, true);
  }
  function pause() {
    if (mode !== 'playing' && mode !== 'locking') return;
    clearTimeout(lockTimer); lockAttempt++; edgeX = edgeY = 0;
    mode = 'paused'; keys.clear(); zoom = false; $('pause').hidden = false;
    document.body.classList.remove('pointer-locked', 'aim-active');
    if (engineGain && audio) engineGain.gain.setTargetAtTime(0, audio.currentTime, .02);
    if (document.pointerLockElement) document.exitPointerLock();
  }
  start.onclick = () => { gameType = 'battle'; reset(); play(); notify('Erobere Punkt A · Blau ist dein Team', 6); };
  $('trainingButton').onclick = () => { gameType = 'training'; reset(); play(); notify('WASD fahren · Maus zielen · Linksklick feuern', 6); };
  $('resumeButton').onclick = () => play();
  $('retryMouseButton').onclick = () => play(true);
  $('resetButton').onclick = () => { reset(); play(); notify(gameType === 'battle' ? 'Neues Gefecht · Erobere Punkt A' : 'Neue Übung · 5 Ziele warten auf dich'); };
  $('rematchButton').onclick = () => { reset(); play(); };
  function garage() {
    mode = 'menu'; clearTimeout(lockTimer); lockAttempt++; keys.clear(); edgeX = edgeY = 0;
    if (document.pointerLockElement) document.exitPointerLock();
    if (engineGain && audio) engineGain.gain.setTargetAtTime(0, audio.currentTime, .02);
    reset(); $('result').hidden = $('hud').hidden = $('pause').hidden = $('pauseButton').hidden = true; $('menu').hidden = false;
    document.body.classList.remove('playing', 'pointer-locked', 'aim-active'); targets.forEach(t => { t.label.hidden = true; });
  }
  $('menuButton').onclick = $('garageButton').onclick = garage;
  $('pauseButton').onclick = pause;
  document.addEventListener('pointerlockchange', () => {
    clearTimeout(lockTimer);
    if (document.pointerLockElement === $('world')) {
      if (mode !== 'locking' && mode !== 'playing') { document.exitPointerLock(); return; }
      lockUnavailable = false; $('externalBrowser').hidden = true; beginPlaying();
    } else { document.body.classList.remove('pointer-locked'); if (mode === 'playing' && !fallbackInput) pause(); }
  });
  document.addEventListener('pointerlockerror', () => { if (mode === 'locking') lockFailed(); });
  document.addEventListener('keydown', event => {
    if (!$('careerPanel').hidden) {
      if (event.code === 'Escape') { closeCareer(); event.preventDefault(); }
      else if (event.code === 'Tab') {
        const controls = [...$('careerPanel').querySelectorAll('button:not(:disabled),a,input:not([hidden])')].filter(el => el.getClientRects().length);
        const first = controls[0], last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) { last.focus(); event.preventDefault(); }
        else if (!event.shiftKey && document.activeElement === last) { first.focus(); event.preventDefault(); }
      }
      return;
    }
    if (event.code === 'Escape') { pause(); return; }
    if (mode !== 'playing') return;
    if (event.code === 'KeyQ') { event.preventDefault(); if (!event.repeat && player.alive) deploySmoke(); return; }
    if (['KeyW','KeyA','KeyS','KeyD','KeyR','Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(event.code)) { keys.add(event.code); event.preventDefault(); }
  });
  document.addEventListener('keyup', event => keys.delete(event.code));
  document.addEventListener('mousemove', event => {
    if (mode !== 'playing' || (document.pointerLockElement !== $('world') && (!fallbackInput || event.target !== $('world')))) return;
    const rate = .0022 * sensitivity * (zoom ? .45 : 1);
    viewYaw -= event.movementX * rate; pitch = Math.max(-.48, Math.min(.16, pitch - event.movementY * rate));
    if (fallbackInput) {
      const edge = (value, size) => value < 55 ? -(55 - value) / 55 : value > size - 55 ? (value - size + 55) / 55 : 0;
      edgeX = edge(event.clientX, innerWidth); edgeY = edge(event.clientY, innerHeight);
    }
  });
  document.addEventListener('mousedown', event => { if (mode !== 'playing' || (document.pointerLockElement !== $('world') && (!fallbackInput || event.target !== $('world')))) return; if (event.button === 0) fire(); if (event.button === 2) zoom = true; });
  $('world').addEventListener('mouseleave', () => { edgeX = edgeY = 0; });
  document.addEventListener('mouseup', event => { if (event.button === 2) zoom = false; });
  $('world').addEventListener('contextmenu', event => event.preventDefault());
  window.addEventListener('blur', pause); document.addEventListener('visibilitychange', () => { if (document.hidden) pause(); });
  function staticBlocked(x, z, radius = 2.8) {
    if (Math.abs(x) > 146 || Math.abs(z) > 146) return true;
    return obstacles.some(o => { const dx = Math.max(Math.abs(x - o.x) - o.w, 0), dz = Math.max(Math.abs(z - o.z) - o.d, 0); return dx * dx + dz * dz < radius * radius; });
  }
  function blocked(x, z, exclude = player) {
    if (staticBlocked(x, z, 2.55)) return true;
    return [player, ...targets].some(v => v !== exclude && v.alive && Math.hypot(x - v.root.position.x, z - v.root.position.z) < 5.6);
  }
  function shortest(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  function aim(dt) {
    aimRay.setFromCamera(new T.Vector2(0, 0), camera);
    const hits = aimRay.intersectObjects(shotObjects(player), false);
    if (hits.length) aimPoint.copy(hits[0].point); else aimPoint.copy(aimRay.ray.origin).addScaledVector(aimRay.ray.direction, 350);
    temp.copy(aimPoint).sub(tank.root.position); temp.y -= 2.05;
    const wanted = Math.atan2(-temp.x, -temp.z), difference = shortest(wanted - turretYaw);
    turretYaw += Math.max(-player.profile.turret * dt, Math.min(player.profile.turret * dt, difference));
    tank.gun.rotation.x = Math.max(-.19, Math.min(.35, Math.atan2(temp.y, Math.hypot(temp.x, temp.z))));
  }
  function fire() {
    if (reload > 0 || mode !== 'playing' || !player.alive) return;
    reload = player.profile.reload; recoil = 1; scene.updateMatrixWorld(true);
    launchShell(player); tone(115, .36, .55, 23);
  }
  function launchShell(vehicle) {
    vehicle.shield = 0; vehicle.systems.repair = 0;
    const origin = vehicle.gun.localToWorld(new T.Vector3(0, 0, -3.3));
    direction.set(0, 0, -1).transformDirection(vehicle.gun.matrixWorld);
    const mesh = new T.Mesh(particleGeometry, puffMaterials[3]); mesh.scale.set(.07, .07, .2); mesh.position.copy(origin); scene.add(mesh);
    shells.push({ mesh, velocity: direction.clone().multiplyScalar(95), life: 5, owner: vehicle });
    puff(origin, vehicle === player ? 13 : 6, 1);
  }
  function impact(hit, shell) {
    puff(hit.point, 17, hit.object.userData.target === undefined ? 0 : 1); tone(180, .15, .17, 45);
    const targetId = hit.object.userData.target;
    if (gameType === 'training' && targetId !== undefined) {
      const target = targets[targetId];
      if (!target.hits) { hitCount++; target.ring.material.color.set('#a5c596'); }
      target.hits++;
      $('score').textContent = `${hitCount} / 5 ZIELE GETROFFEN`;
      notify(hitCount === 5 ? 'ÜBUNG ABGESCHLOSSEN · 5 / 5\nErkunde weiter oder starte im Pausenmenü neu.' : `TREFFER · ZIEL ${targetId + 1}\n${hitCount} von 5 Zielen erfasst`, hitCount === 5 ? 8 : 2.5);
    } else if (gameType === 'battle' && hit.object.userData.vehicle) {
      const victim = hit.object.userData.vehicle;
      if (!victim.alive || victim.team === shell.owner.team) return;
      if (victim.shield > 0) { if (shell.owner === player) notify('ZIEL HAT STARTSCHUTZ', 1); return; }
      const forward = new T.Vector3(-Math.sin(victim.yaw), 0, -Math.cos(victim.yaw));
      const incidence = forward.dot(shell.velocity.clone().setY(0).normalize().negate());
      const localHit = victim.root.worldToLocal(hit.point.clone());
      const moduleHit = Systems.hitModule(victim.systems, localHit);
      const damage = Math.round((incidence > .55 ? 24 * victim.profile.front : incidence < -.55 ? 50 : 38) * shell.owner.profile.power * (moduleHit === 'tracks' ? .45 : 1));
      victim.hp = Math.max(0, victim.hp - damage);
      if (shell.owner === player) { stats.hits++; notify(`${moduleHit === 'tracks' ? 'KETTE AUSGESCHALTET' : moduleHit === 'engine' ? 'MOTOR BESCHÄDIGT' : incidence > .55 ? 'FRONTTREFFER' : incidence < -.55 ? 'HECKTREFFER' : 'SEITENTREFFER'} · −${damage}`, 2); }
      if (victim === player) {
        damageTime = .45; tone(60, .3, .35, 22);
        if (moduleHit) notify(moduleHit === 'tracks' ? 'KETTE AUSGEFALLEN · R ZUM REPARIEREN HALTEN\nQ legt Rauch zur Deckung.' : 'MOTOR BESCHÄDIGT · LEISTUNG REDUZIERT\nStillstehen und R zum Reparieren halten.', 4);
      }
      if (victim.hp === 0) {
        victim.alive = false; victim.respawn = 6; victim.root.visible = false;
        puff(victim.root.position.clone().setY(1.8), 30, 1); match.lose(victim.team);
        if (victim === player) { stats.deaths++; velocity = 0; zoom = false; }
        else { victim.label.hidden = true; victim.ring.visible = false; }
        if (shell.owner === player) { stats.kills++; notify('GEGNER AUSGESCHALTET · −5 TICKETS', 3); }
      }
    }
  }
  function spawnCoordinates(vehicle) {
    const [x, z] = vehicle === player ? level.playerRespawn : level.spawns[vehicle.id];
    return [x, 0, z];
  }
  function respawnVehicle(vehicle) {
    const base = spawnCoordinates(vehicle);
    const candidates = [[base[0], base[2]], [base[0] + 7, base[2]], [base[0] - 7, base[2]], [base[0], base[2] + 9]];
    const place = candidates.find(([x, z]) => !blocked(x, z, vehicle));
    if (!place) { vehicle.respawn = .5; return; }
    vehicle.root.position.set(place[0], 0, place[1]); vehicle.root.visible = true;
    Object.assign(vehicle, { alive: true, hp: 100, shield: 3, respawn: 0, enemy: null, reload: 1, navigationTimer: 0, thinkTimer: 0, path: [], reaction: 1, systems: Systems.fresh() });
    if (vehicle === player) { velocity = reload = 0; hullYaw = turretYaw = viewYaw = 0; pitch = -.16; notify('WIEDER IM GEFECHT · 3 SEKUNDEN SCHUTZ', 3); }
    else { vehicle.yaw = vehicle.turretYaw = vehicle.team === 'blue' ? 0 : Math.PI; vehicle.root.rotation.y = vehicle.yaw; vehicle.turret.rotation.y = 0; }
  }
  function canSee(from, to) {
    if (!from.alive || !to.alive || from.root.position.distanceTo(to.root.position) > 115) return false;
    const origin = from.root.position.clone().setY(2.35), destination = to.root.position.clone().setY(1.45);
    if (Systems.smokeBlocks(origin, destination, smokeClouds)) return false;
    const delta = destination.sub(origin); combatRay.set(origin, delta.clone().normalize()); combatRay.far = delta.length() + 1;
    const hits = combatRay.intersectObjects(shotObjects(from), false);
    return hits.length > 0 && hits[0].object.userData.vehicle === to;
  }
  function updateBot(bot, dt) {
    bot.reload = Math.max(0, bot.reload - dt); bot.navigationTimer -= dt; bot.thinkTimer -= dt;
    const repairing = Systems.damaged(bot.systems);
    Systems.repair(bot.systems, dt, repairing, false);
    const [gx, gz] = level.goals[bot.id], goal = { x: gx, z: gz };
    if (bot.navigationTimer <= 0) {
      bot.path = IronBattle.findPath(bot.root.position, goal, staticBlocked); bot.navigationTimer = 2.5 + bot.id * .2;
    }
    const nearGoal = Math.hypot(bot.root.position.x - goal.x, bot.root.position.z - goal.z) < 3;
    while (bot.path.length && Math.hypot(bot.path[0].x - bot.root.position.x, bot.path[0].z - bot.root.position.z) < 1.8) bot.path.shift();
    if (!nearGoal && bot.path.length && !repairing) {
      const waypoint = bot.path[0], desired = Math.atan2(bot.root.position.x - waypoint.x, bot.root.position.z - waypoint.z);
      const delta = shortest(desired - bot.yaw); bot.yaw += Math.max(-dt * bot.profile.turn, Math.min(dt * bot.profile.turn, delta));
      const pace = (Math.abs(delta) < .4 ? Math.min(7.5, bot.profile.speed * .7) : 2.5) * Systems.mobility(bot.systems);
      const nx = bot.root.position.x - Math.sin(bot.yaw) * pace * dt, nz = bot.root.position.z - Math.cos(bot.yaw) * pace * dt;
      if (!blocked(nx, nz, bot)) { bot.root.position.set(nx, 0, nz); bot.stuck = 0; for (const wheel of bot.wheels) wheel.rotation.x += pace * dt; }
      else {
        bot.stuck += dt;
        // Back off and re-route around a stopped vehicle instead of pushing forever.
        if (bot.stuck > .8) {
          const reverseX = bot.root.position.x + Math.sin(bot.yaw + .6) * 3 * dt, reverseZ = bot.root.position.z + Math.cos(bot.yaw + .6) * 3 * dt;
          if (!blocked(reverseX, reverseZ, bot)) bot.root.position.set(reverseX, 0, reverseZ);
          if (bot.stuck > 2.4) {
            bot.path = IronBattle.findPath(bot.root.position, goal, (x, z) => staticBlocked(x, z) || [player, ...targets].some(v => v !== bot && v.alive && Math.hypot(x - v.root.position.x, z - v.root.position.z) < 7));
            bot.navigationTimer = 4; bot.stuck = 0;
          }
        }
      }
    }
    bot.root.rotation.y = bot.yaw;
    if (bot.thinkTimer <= 0) {
      const previousEnemy = bot.enemy;
      bot.enemy = [player, ...targets].filter(v => v.team !== bot.team && v.alive).sort((a, b) => bot.root.position.distanceToSquared(a.root.position) - bot.root.position.distanceToSquared(b.root.position)).find(v => canSee(bot, v)) || null;
      if (bot.enemy !== previousEnemy) bot.reaction = .8 + random() * .5;
      bot.visibleToPlayer = canSee(player, bot); bot.thinkTimer = .3 + random() * .15;
    }
    bot.reaction -= dt;
    let desiredYaw = bot.yaw;
    if (bot.enemy?.alive) {
      const delta = bot.enemy.root.position.clone().sub(bot.root.position), distance = Math.hypot(delta.x, delta.z);
      desiredYaw = Math.atan2(-delta.x, -delta.z);
      bot.gun.rotation.x = Math.atan2(-.6 + 1.5 * (distance / 95) ** 2, distance);
    }
    bot.turretYaw += Math.max(-dt * bot.profile.turret, Math.min(dt * bot.profile.turret, shortest(desiredYaw - bot.turretYaw)));
    bot.turret.rotation.y = bot.turretYaw - bot.yaw;
    if (!repairing && bot.enemy?.alive && bot.reload <= 0 && bot.reaction <= 0 && Math.abs(shortest(desiredYaw - bot.turretYaw)) < .05 && canSee(bot, bot.enemy)) {
      bot.turret.rotation.y += (random() - .5) * .035; bot.root.updateMatrixWorld(true); launchShell(bot); bot.turret.rotation.y = bot.turretYaw - bot.yaw;
      bot.reload = bot.profile.reload + 1 + random();
      if (bot.root.position.distanceTo(tank.root.position) < 65) tone(90, .2, .07, 30);
    }
  }
  function updateBattle(dt) {
    for (const vehicle of [player, ...targets]) {
      vehicle.shield = Math.max(0, vehicle.shield - dt);
      if (!vehicle.alive) { vehicle.respawn -= dt; if (vehicle.respawn <= 0) respawnVehicle(vehicle); }
      else if (vehicle !== player) updateBot(vehicle, dt);
    }
    const inside = [player, ...targets].filter(v => v.alive && Math.hypot(v.root.position.x - level.capture.x, v.root.position.z - level.capture.z) < level.capture.radius);
    if (inside.includes(player)) stats.captureSeconds += dt;
    match.update(dt, inside.filter(v => v.team === 'blue').length, inside.filter(v => v.team === 'red').length);
    const color = match.contested ? '#efb36c' : match.owner === 'blue' ? '#79b9d7' : match.owner === 'red' ? '#da8365' : '#dfc18c';
    captureRing.material.color.set(color); captureFlag.material.color.set(color).convertSRGBToLinear();
    if (match.result) finishMatch();
  }
  function finishMatch() {
    if (mode === 'result') return;
    mode = 'result'; keys.clear(); zoom = false; velocity = 0; document.body.classList.remove('pointer-locked', 'aim-active');
    if (document.pointerLockElement) document.exitPointerLock();
    if (engineGain && audio) engineGain.gain.setTargetAtTime(0, audio.currentTime, .02);
    $('resultTitle').textContent = match.result === 'blue' ? `${level.name} gesichert.` : match.result === 'red' ? 'Gefecht verloren.' : 'Unentschieden.';
    $('resultReason').textContent = `${match.time <= 0 ? 'Zeit abgelaufen.' : 'Ein Team hat keine Tickets mehr.'} Blau ${match.tickets.blue} : ${match.tickets.red} Rot.`;
    $('resultStats').innerHTML = `<span>ABSCHÜSSE<b>${stats.kills}</b></span><span>WIRKSAME TREFFER<b>${stats.hits}</b></span><span>EIGENE VERLUSTE<b>${stats.deaths}</b></span><span>SEKUNDEN AM ZIEL<b>${Math.floor(stats.captureSeconds)}</b></span>`;
    $('result').hidden = false; $('respawn').hidden = true; targets.forEach(t => { t.label.hidden = true; });
    recordRound();
  }
  function step(dt) {
    if (fallbackInput) {
      const rate = sensitivity * (zoom ? .45 : 1);
      viewYaw -= edgeX * 1.4 * rate * dt;
      pitch = Math.max(-.48, Math.min(.16, pitch - edgeY * .65 * rate * dt));
    }
    const throttle = player.alive ? (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0) : 0;
    const steer = player.alive ? (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0) : 0;
    const mobility = Systems.mobility(player.systems), profile = player.profile;
    if (mobility === 0) velocity = 0;
    else if (keys.has('Space') || (keys.has('KeyR') && !throttle && !steer && Systems.damaged(player.systems))) velocity *= Math.exp(-7 * dt);
    else if (throttle) velocity = Math.max(-profile.reverse * mobility, Math.min(profile.speed * mobility, velocity + throttle * profile.acceleration * mobility * dt));
    else velocity *= Math.exp(-1.15 * dt);
    velocity = Math.max(-profile.reverse * mobility, Math.min(profile.speed * mobility, velocity));
    if (Math.abs(velocity) < .025) velocity = 0;
    hullYaw += steer * profile.turn * mobility * dt * (velocity < -.3 ? -1 : 1) * (1 - Math.abs(velocity) / 30);
    if (Systems.repair(player.systems, dt, keys.has('KeyR'), !!throttle || !!steer || Math.abs(velocity) > .2, player.alive)) notify('REPARATUR ABGESCHLOSSEN · FAHRBEREIT', 3);
    const nx = tank.root.position.x - Math.sin(hullYaw) * velocity * dt, nz = tank.root.position.z - Math.cos(hullYaw) * velocity * dt;
    if (!blocked(nx, nz)) { tank.root.position.x = nx; tank.root.position.z = nz; $('driveStatus').textContent = 'FAHRZEUG EINSATZBEREIT'; }
    else { velocity = 0; $('driveStatus').textContent = 'HINDERNIS · ZURÜCKSETZEN'; }
    aim(dt); reload = Math.max(0, reload - dt); recoil *= Math.exp(-7 * dt); updateTank();
    player.yaw = hullYaw;
    for (const wheel of tank.wheels) wheel.rotation.x += velocity * dt * 1.5;
    dustTime += dt;
    if (dustTime > .11 && Math.abs(velocity) > 2) { dustTime = 0; temp.copy(tank.root.position); temp.y = .3; temp.x += Math.sin(hullYaw) * 2; temp.z += Math.cos(hullYaw) * 2; puff(temp, 2, 2); }
    scene.updateMatrixWorld(true);
    for (let i = shells.length - 1; i >= 0; i--) {
      const shell = shells[i]; shell.life -= dt; shell.velocity.y -= 3 * dt;
      const distance = shell.velocity.length() * dt; ray.set(shell.mesh.position, direction.copy(shell.velocity).normalize()); ray.far = distance;
      const hits = ray.intersectObjects(shotObjects(shell.owner), false);
      if (hits.length) { impact(hits[0], shell); shell.life = 0; } else shell.mesh.position.addScaledVector(shell.velocity, dt);
      if (shell.life <= 0 || shell.mesh.position.y < -.1) { scene.remove(shell.mesh); shells.splice(i, 1); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.multiplyScalar(Math.exp(-2 * dt));
      p.mesh.scale.multiplyScalar(1 + dt * (p.kind === 2 ? 1.3 : .4));
      if (p.life < .2) p.mesh.scale.multiplyScalar(.9);
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    noticeTime -= dt; if (noticeTime <= 0) $('notice').textContent = '';
    damageTime = Math.max(0, damageTime - dt);
    updateSmoke(dt);
    if (gameType === 'battle') updateBattle(dt);
  }
  function updateCamera(dt, immediate = false) {
    if (mode === 'menu') {
      const a = .7 + Math.sin(elapsed * .065) * .12;
      camera.position.set(tank.root.position.x + Math.sin(a) * 17, 6.7, tank.root.position.z - Math.cos(a) * 17);
      camera.lookAt(tank.root.position.x + 4, 1.4, tank.root.position.z + 3); camera.fov = 51; camera.updateProjectionMatrix(); return;
    }
    const back = zoom ? 6.4 : 14;
    temp.set(tank.root.position.x + Math.sin(viewYaw) * back, zoom ? 4.1 : 6.7, tank.root.position.z + Math.cos(viewYaw) * back);
    cameraAnchor.copy(tank.root.position); cameraAnchor.y = 2.9;
    cameraDirection.copy(temp).sub(cameraAnchor);
    cameraRay.set(cameraAnchor, cameraDirection.clone().normalize()); cameraRay.far = cameraDirection.length();
    const cameraHits = cameraRay.intersectObjects(shotObjects(player), false);
    if (cameraHits.length) temp.copy(cameraAnchor).addScaledVector(cameraRay.ray.direction, Math.max(.7, cameraHits[0].distance - .6));
    camera.position.lerp(temp, immediate ? 1 : 1 - Math.exp(-12 * dt));
    if (shakeEnabled) camera.position.y += recoil * .1;
    direction.set(-Math.sin(viewYaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(viewYaw) * Math.cos(pitch));
    camera.lookAt(temp.copy(camera.position).addScaledVector(direction, 100));
    camera.fov += ((zoom ? 32 : 58) - camera.fov) * (immediate ? 1 : 1 - Math.exp(-10 * dt)); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  const map = $('minimap').getContext('2d');
  function drawMap() {
    map.fillStyle = '#1d2b23'; map.fillRect(0, 0, 180, 180);
    map.strokeStyle = '#ffffff10'; map.lineWidth = 1;
    for (let i = 0; i < 180; i += 30) { map.beginPath(); map.moveTo(i, 0); map.lineTo(i, 180); map.moveTo(0, i); map.lineTo(180, i); map.stroke(); }
    const scale = .54, center = 90;
    map.fillStyle = level.theme === 'quarry' ? '#8a8066' : '#737557';
    for (const [x, z, w, d] of level.roads) map.fillRect(center + (x - w / 2) * scale, center + (z - d / 2) * scale, w * scale, d * scale);
    map.fillStyle = '#889078';
    for (const o of obstacles) if (o.w > 1) map.fillRect(center + (o.x - o.w) * scale, center + (o.z - o.d) * scale, o.w * scale * 2, o.d * scale * 2);
    if (gameType === 'battle') { const cx = center + level.capture.x * scale, cz = center + level.capture.z * scale; map.strokeStyle = match.owner === 'blue' ? '#94c6db' : match.owner === 'red' ? '#f2a084' : '#dfc18c'; map.beginPath(); map.arc(cx, cz, level.capture.radius * scale, 0, Math.PI * 2); map.stroke(); map.fillStyle = '#eee4c3'; map.fillText('A', cx - 3, cz + 3); }
    targets.forEach(target => {
      if (!target.alive || (gameType === 'battle' && target.team === 'red' && !target.visibleToPlayer)) return;
      map.strokeStyle = gameType === 'battle' ? target.team === 'blue' ? '#94c6db' : '#f2a084' : target.hits ? '#b1d29b' : '#efa665'; map.lineWidth = 1.5;
      map.strokeRect(center + target.root.position.x * scale - 3, center + target.root.position.z * scale - 3, 6, 6);
    });
    map.save(); map.translate(center + tank.root.position.x * scale, center + tank.root.position.z * scale); map.rotate(-hullYaw); map.fillStyle = '#f2eacb'; map.beginPath(); map.moveTo(0, -6); map.lineTo(4, 5); map.lineTo(0, 3); map.lineTo(-4, 5); map.closePath(); map.fill(); map.restore();
    map.fillStyle = '#b3bea6'; map.font = '9px monospace'; map.fillText('N', 87, 9);
  }
  function updateHud() {
    $('speed').textContent = Math.round(Math.abs(velocity) * 3.6); $('gear').textContent = velocity > .2 ? 'D' : velocity < -.2 ? 'R' : 'N';
    $('reloadLabel').innerHTML = reload > 0 ? `LÄDT · ${reload.toFixed(1)} S <span>↻</span>` : 'FEUERBEREIT <span>∞</span>';
    $('reloadBar').style.width = `${(1 - reload / player.profile.reload) * 100}%`;
    $('trackStatus').textContent = player.systems.tracks === 0 ? 'KETTE · AUSFALL' : 'KETTE · OK';
    $('engineStatus').textContent = player.systems.engine === 0 ? 'MOTOR · AUSFALL' : 'MOTOR · OK';
    $('trackStatus').classList.toggle('broken', player.systems.tracks === 0); $('engineStatus').classList.toggle('broken', player.systems.engine === 0);
    $('smokeCount').textContent = player.systems.smokeCooldown > 0 ? `${Math.ceil(player.systems.smokeCooldown)} S · ${player.systems.smokeCharges}/2` : `${player.systems.smokeCharges} / 2`;
    $('repairLabel').textContent = !player.alive ? 'FAHRZEUG VERLOREN' : player.systems.repair > 0 ? `REPARATUR · ${(6 - player.systems.repair).toFixed(1)} S` : Systems.damaged(player.systems) ? 'STILLSTEHEN & HALTEN' : 'MODULE INTAKT';
    $('repairBar').style.width = `${player.systems.repair / 6 * 100}%`;
    const heading = ((-viewYaw * 180 / Math.PI) % 360 + 360) % 360;
    $('bearing').textContent = `${Math.round(heading).toString().padStart(3, '0')}° ${['N','NO','O','SO','S','SW','W','NW'][Math.round(heading / 45) % 8]}`;
    $('range').textContent = `${Math.round(tank.root.position.distanceTo(aimPoint))} M`;
    temp.set(0, 0, -75).applyMatrix4(tank.gun.matrixWorld).project(camera);
    $('gunMarker').style.left = `${(temp.x * .5 + .5) * innerWidth}px`; $('gunMarker').style.top = `${(-temp.y * .5 + .5) * innerHeight}px`;
    $('gunMarker').hidden = temp.z > 1 || Math.abs(temp.x) > 1 || Math.abs(temp.y) > 1; drawMap();
    if (gameType === 'battle') {
      $('blueTickets').textContent = match.tickets.blue; $('redTickets').textContent = match.tickets.red;
      const seconds = Math.ceil(match.time); $('matchTime').textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      $('score').textContent = match.contested ? 'PUNKT A · UMKÄMPFT' : match.owner === 'blue' ? 'PUNKT A · DEIN TEAM' : match.owner === 'red' ? 'PUNKT A · GEGNER' : `PUNKT A · ${Math.abs(match.progress) > .01 ? 'EROBERUNG ' + Math.round(Math.abs(match.progress) * 100) + '%' : 'NEUTRAL'}`;
      $('captureBar').style.width = `${Math.abs(match.progress) * 100}%`; $('captureBar').style.background = match.progress >= 0 ? '#94c6db' : '#f2a084';
      $('healthBar').style.width = `${player.hp}%`; $('healthBar').style.background = player.hp < 35 ? '#f2a084' : '#a1c390';
      $('driveStatus').textContent = !player.alive ? 'FAHRZEUG AUSGESCHALTET' : player.shield > 0 ? `STARTSCHUTZ · ${Math.ceil(player.shield)} S` : `STRUKTUR ${player.hp}% · ${stats.kills} ABSCHÜSSE`;
      $('respawn').hidden = player.alive || mode !== 'playing'; $('respawnTime').textContent = Math.max(1, Math.ceil(player.respawn));
      $('damageFlash').hidden = damageTime <= 0;
      for (const bot of targets) {
        temp.copy(bot.root.position); temp.y = 4.2; temp.project(camera);
        const visible = mode === 'playing' && bot.alive && (bot.team === 'blue' || bot.visibleToPlayer) && temp.z < 1 && Math.abs(temp.x) < 1 && Math.abs(temp.y) < 1;
        bot.label.hidden = !visible;
        if (visible) { bot.label.style.left = `${(temp.x * .5 + .5) * innerWidth}px`; bot.label.style.top = `${(-temp.y * .5 + .5) * innerHeight}px`; bot.label.innerHTML = `${bot.team === 'blue' ? '◆ VERBÜNDETER' : '◇ GEGNER'} ${bot.id + 1}<i style="width:${bot.hp * .55}px"></i>`; }
      }
    }
    if (engineGain && audio) { engine.frequency.setTargetAtTime(35 + Math.abs(velocity) * 5, audio.currentTime, .15); engineGain.gain.setTargetAtTime(soundEnabled && mode === 'playing' ? .035 + Math.abs(velocity) * .002 : 0, audio.currentTime, .1); }
  }
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  $('world').addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); $('pause').hidden = true; $('menu').hidden = false; $('hud').hidden = true; fail('Die Grafikverbindung wurde unterbrochen. Bitte lade die Seite neu.'); });
  let previous = performance.now(), accumulator = 0, hudTime = 0;
  function frame(now) {
    requestAnimationFrame(frame); const dt = Math.min((now - previous) / 1000, .08); previous = now; elapsed += dt;
    if (mode === 'playing') { accumulator += dt; while (accumulator >= 1 / 60 && mode === 'playing') { step(1 / 60); accumulator -= 1 / 60; } updateCamera(dt); hudTime += dt; if (hudTime > .06) { updateHud(); hudTime = 0; } }
    else { accumulator = 0; if (mode === 'menu') updateCamera(dt); }
    renderer.render(scene, camera);
  }
  reset(); resize(); updateCamera(1, true); updateHud();
  start.disabled = $('trainingButton').disabled = false; start.firstChild.textContent = 'GEFECHT STARTEN ';
  window.ironHorizon = Object.freeze({ getState: () => ({
    mode, gameType, map: level.id, capture: { ...level.capture }, renderedGeometries: renderer.info.memory.geometries, pointerLocked: document.pointerLockElement === $('world'), vehicle: player.profile.id,
    position: { x: tank.root.position.x, z: tank.root.position.z }, speed: velocity, hullYaw, turretYaw, viewYaw, reload, hitCount,
    hp: player.hp, alive: player.alive, respawn: player.respawn, systems: { ...player.systems }, smokeClouds: smokeClouds.length, shells: shells.length,
    career: { xp: careerStore.state.xp, matches: careerStore.state.matches, rank: Career.rank(careerStore.state.xp).current.name, paint: careerStore.state.paints[player.profile.id], warning: careerStore.warning },
    match: { time: match.time, tickets: { ...match.tickets }, owner: match.owner, contested: match.contested, progress: match.progress, result: match.result }, stats: { ...stats },
    targets: targets.map(t => ({ x: t.root.position.x, z: t.root.position.z, hits: t.hits, hp: t.hp, alive: t.alive, team: t.team, vehicle: t.profile.id, systems: { ...t.systems }, visible: t.visibleToPlayer, pathLength: t.path.length })), renderedFrames: renderer.info.render.frame
  }) });
  requestAnimationFrame(frame);
})();
