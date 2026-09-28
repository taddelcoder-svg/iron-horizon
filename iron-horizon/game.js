/* Iron Horizon — local 3v3 conquest and training. Three.js is vendored. */
(() => {
  'use strict';
  const $ = id => document.getElementById(id);
  const start = $('startButton');
  function fail(message) { loadFailed = true; $('error').hidden = false; $('error').textContent = message; start.disabled = true; start.firstChild.textContent = 'START NICHT MÖGLICH '; }
  var loadFailed = false;
  if (!window.THREE || !window.IronBattle || !window.IronSystems || !window.IronCareer || !window.IronMaps || !window.IronTerrain) { fail('Spieldateien konnten nicht geladen werden. Bitte lade die Seite neu und prüfe den Spielordner.'); return; }
  const T = window.THREE;
  const Systems = window.IronSystems;
  const Career = window.IronCareer;
  const careerStore = new Career.Store({ getItem: key => localStorage.getItem(key), setItem: (key, value) => localStorage.setItem(key, value) });
  let roundId = '', pendingImport = null;
  const withCareerLock = action => navigator.locks?.request ? navigator.locks.request('iron-horizon-career', action) : Promise.resolve().then(action);
  let selectedVehicle = 'luchs', selectedMap = 'border', level = IronMaps.levels.border, terrain = null;
  let olympia = null;   // Olympia-Challenge, siehe unten
  let net = null;       // Online-Gefecht, siehe online.js und unten
  let renderer;
  try { renderer = new T.WebGLRenderer({ canvas: $('world'), antialias: true, powerPreference: 'high-performance' }); }
  catch (_) { fail('Dein Browser konnte WebGL nicht starten. Bitte öffne das Spiel in einem Browser mit aktivierter Hardwarebeschleunigung.'); return; }
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
    $('missionTitle').textContent = mission === 'attack' ? `Durchbruch: ${level.name} angreifen.` : mission === 'defense' ? `Durchbruch: ${level.name} verteidigen.` : `${level.name} erobern.`; $('missionNumber').textContent = level.number;
    $('missionText').innerHTML = mission === 'domination' ? 'Du und zwei Verbündete gegen drei Gegner.<br>Haltet Punkt A und entscheidet das Gefecht.' : mission === 'attack' ? `Nimm erst Punkt A, dann Punkt B.<br>${IronBattle.Breakthrough.TICKETS} Tickets, jede Eroberung bringt 3 Minuten.` : 'Halte Punkt A und B, bis die Zeit abläuft<br>oder dem Angreifer die Tickets ausgehen.';
    $('locationName').textContent = level.name.toUpperCase();
    $('mapCaption').textContent = `${level.name.toUpperCase()} / ${level.number}`;
    $('pause').querySelector('.eyebrow').textContent = `${level.name.toUpperCase()} ${level.number}`;
    $('difficultyNote').textContent = { recruit: 'Gegner reagieren langsam, streuen stark und laden langsamer nach. Ideal zum Einstieg.', veteran: 'Ausgewogene Gegner mit Flanken und Rauch.', ace: 'Schnelle, genaue Gegner, die schneller nachladen und auf Seiten und Ketten zielen. +25 % Erfahrung.' }[difficulty] + ' Deine Verbündeten kämpfen immer wie Veteranen.';
  }
  function makeTank(color) {
    const root = new T.Group(); const wheels = []; root.rotation.order = 'YXZ';
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
    const turretBody = [cyl(1.2, 1.4, .85, color, turret, 0, .25, -.2, 7), box(1.6, .65, .6, color, turret, 0, .3, -1.1), cyl(.51, .54, .18, '#85896b', turret, .3, .8, .1, 10), box(.1, 2.5, .1, '#313c31', turret, -.8, 1.65, .55)];
    // Casemate superstructure of the turretless Dachs; hidden for the other tanks.
    const slope = box(3, .9, 1.4, color, root, 0, 1.98, -2.05); slope.rotation.x = .62;
    const casemate = [box(3, 1.05, 3.4, color, root, 0, 2.08, -.25), slope, cyl(.46, .5, .3, '#85896b', root, .75, 2.75, .45, 10)];
    casemate.forEach(mesh => { mesh.visible = false; });
    const gun = new T.Group(); gun.position.set(0, .3, -1.25); turret.add(gun);
    const barrel = cyl(.105, .14, 3, '#4c5944', gun, 0, 0, -1.45); barrel.rotation.x = Math.PI / 2;
    const muzzle = cyl(.16, .16, .3, '#333f32', gun, 0, 0, -3); muzzle.rotation.x = Math.PI / 2;
    box(.8, .15, 1.05, '#545e46', root, -1, 1.75, 1.6);
    box(.7, .4, .85, '#897b55', root, 1, 1.8, 1.7);
    for (const x of [-1.2, 1.2]) box(.26, .2, .12, '#e3d9b0', root, x, 1.35, -2.58);
    // Painted recognition stripes on the hull.
    box(.08, .35, .8, '#dbc990', root, 1.565, 1.2, -.6);
    box(.08, .35, .8, '#dbc990', root, -1.565, 1.2, -.6);
    const hullMeshes = []; root.traverse(object => { if (object.isMesh && object.material === mat(color)) { object.material = object.material.clone(); hullMeshes.push(object); } });
    scene.add(root); return { root, turret, gun, wheels, turretBody, casemate, gunBase: -1.25, hullMeshes };
  }
  const tank = makeTank('#737c50');
  const player = { ...tank, id: 'player', slot: 0, team: 'blue', callsign: 'DU', hp: 100, alive: true, respawn: 0, shield: 3, hitMeshes: [], yaw: 0, profile: Systems.profiles.luchs, systems: Systems.fresh(), lastHit: null };
  tank.root.traverse(object => { if (object.isMesh) { object.userData.vehicle = player; player.hitMeshes.push(object); } });
  const paintMeshes = [];
  paintMeshes.push(...tank.hullMeshes);
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
    const team = i < 2 ? 'blue' : 'red', number = team === 'blue' ? i + 1 : i - 1;
    const bot = { ...enemy, id: i, slot: i + 1, team, number, callsign: `${team === 'blue' ? 'VERBÜNDETER' : 'GEGNER'} ${number}`, holdIndex: number - 1, hitMeshes, ring, flagGroup, x, z, hits: 0, hp: 100, alive: true, respawn: 0, shield: 0, yaw: 0, turretYaw: 0, reload: 0, path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, visibleToPlayer: false };
    hitMeshes.forEach(mesh => { mesh.userData.vehicle = bot; });
    const label = document.createElement('div'); label.className = 'vehicle-label' + (bot.team === 'blue' ? ' friendly' : ''); label.hidden = true; $('labels').appendChild(label); bot.label = label;
    targets.push(bot);
    bot.systems = Systems.fresh(); applyProfile(bot, i === 1 || i === 3 ? 'keiler' : 'luchs');
  });
  function applyProfile(vehicle, id) {
    vehicle.profile = Systems.profiles[id]; const heavy = id === 'keiler', casemate = id === 'dachs';
    vehicle.root.scale.set(heavy ? 1.12 : casemate ? 1.06 : 1, heavy ? 1.08 : casemate ? .96 : 1, heavy ? 1.1 : casemate ? 1.08 : 1);
    vehicle.turretBody.forEach(mesh => { mesh.visible = !casemate; }); vehicle.casemate.forEach(mesh => { mesh.visible = casemate; });
    vehicle.turret.position.y = casemate ? 1.62 : 1.75; vehicle.gunBase = casemate ? -2.5 : -1.25; vehicle.gun.position.set(0, casemate ? .45 : .3, vehicle.gunBase);
    vehicle.turret.scale.set(heavy ? 1.16 : 1, heavy ? 1.1 : 1, heavy ? 1.06 : 1);
    vehicle.gun.scale.set(heavy ? 1.65 : casemate ? 1.9 : 1, heavy ? 1.65 : casemate ? 1.9 : 1, heavy ? 1.18 : casemate ? 1.35 : 1);
    refreshHitMeshes(vehicle);
  }
  // Only visible parts can be hit (the hidden turret or casemate must not stop shells).
  function refreshHitMeshes(vehicle) {
    if (!vehicle.hitMeshes) return;
    vehicle.hitMeshes.length = 0;
    vehicle.root.traverse(object => {
      if (!object.isMesh) return;
      for (let node = object; node && node !== vehicle.root; node = node.parent) if (!node.visible) return;
      vehicle.hitMeshes.push(object);
    });
  }
  function selectVehicle(id) {
    if (mode !== 'menu' || !Systems.profiles[id]) return;
    selectedVehicle = id; applyProfile(player, id); saveSettings(); refreshVehicleUi();
  }
  function dachsLocked() { return !Career.vehicleUnlocked('dachs', careerStore.state.xp); }
  function refreshStart() {
    if (loadFailed) return;
    const locked = selectedVehicle === 'dachs' && dachsLocked();
    start.disabled = locked; start.firstChild.textContent = locked ? 'DACHS AB RANG FRONTKÄMPFER ' : 'GEFECHT STARTEN ';
    $('dachsHint').textContent = dachsLocked() ? 'Jagdpanzer · Gefecht ab Frontkämpfer' : 'Jagdpanzer · Fernkampf';
    if (olympia) olympiaMenue();
  }
  function refreshVehicleUi() {
    const p = player.profile;
    for (const [button, id] of [['selectLuchs', 'luchs'], ['selectKeiler', 'keiler'], ['selectDachs', 'dachs']]) $(button).setAttribute('aria-pressed', String(p.id === id));
    $('vehicleIndex').textContent = `0${Systems.VEHICLES.indexOf(p.id) + 1} / 03`;
    $('vehicleName').innerHTML = `${p.name} <span>${p.version}</span>`; $('vehicleRole').textContent = p.role;
    $('vehicleSpeed').innerHTML = `${Math.round(p.speed * 3.6)}<small>KM/H</small>`;
    $('vehicleCalibre').innerHTML = `${p.calibre}<small>MM</small>`; $('vehicleReload').innerHTML = `${p.reload}<small>SEK.</small>`;
    $('vehicleNote').textContent = p.note; $('hudVehicle').textContent = `${p.name} ${p.version}`;
    $('hudCalibre').textContent = `${p.calibre} MM · PANZERBRECHEND`;
    applyPaint(); refreshCareer(); refreshStart();
  }
  // Objective markers: A always, B only in Durchbruch. Ring radius is scaled per point.
  function makeZone() {
    const group = new T.Group(); scene.add(group);
    const ring = new T.Mesh(new T.RingGeometry(16.7, 17, 80), new T.MeshBasicMaterial({ color: '#dfc18c', side: T.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.y = .11; group.add(ring);
    cyl(.1, .14, 8, '#c4c8af', group, 0, 4, 0, 8);
    const flag = box(3, 1.5, .06, '#b8ae83', group, 1.5, 7, 0); flag.material = flag.material.clone();
    return { group, ring, flag };
  }
  const zones = [makeZone(), makeZone()];
  function placeZone(zone, point) { zone.group.position.set(point.x, ground(point.x, point.z), point.z); zone.ring.scale.setScalar(point.radius / 17); zone.group.visible = true; }
  function colorZone(zone, color) { zone.ring.material.color.set(color); zone.flag.material.color.set(color).convertSRGBToLinear(); }
  let gameType = 'battle', match = new IronBattle.Match(), stats = { hits: 0, kills: 0, deaths: 0, captureSeconds: 0 }, damageTime = 0, matchMission = 'domination';
  const freshStats = () => ({ hits: 0, kills: 0, deaths: 0, captureSeconds: 0, ricochets: 0, bounced: 0, soloCaptures: 0, fieldRepairs: 0 });
  const combatRay = new T.Raycaster();
  function shotObjects(exclude) { return [...solids, ...(gameType === 'battle' && player.alive && exclude !== player ? player.hitMeshes : []), ...targets.filter(t => t.alive && t !== exclude).flatMap(t => t.hitMeshes)]; }
  const ray = new T.Raycaster(), aimRay = new T.Raycaster(), cameraRay = new T.Raycaster();
  const cameraAnchor = new T.Vector3(), cameraDirection = new T.Vector3();
  const aimPoint = new T.Vector3(), direction = new T.Vector3(), temp = new T.Vector3();
  const keys = new Set();
  let mode = 'menu', velocity = 0, hullYaw = 0, turretYaw = 0, viewYaw = 0, pitch = -.16, steerInput = 0, throttleInput = 0, obstacleContact = false;
  const touch = { throttle: 0, steer: 0, brake: false, repair: false };
  let reload = 0, recoil = 0, zoom = false, elapsed = 0, noticeTime = 0, dustTime = 0, hitCount = 0;
  let sensitivity = 1, shakeEnabled = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  // Touch devices start in touch mode; a real mouse click switches back (hybrid laptops).
  let touchMode = matchMedia('(pointer: coarse)').matches && !matchMedia('(any-pointer: fine)').matches;
  let quality = touchMode ? 'medium' : 'high', introSeen = false, difficulty = 'veteran', invertY = false, showFps = false, mission = 'domination';
  let matchDifficulty = IronBattle.difficulties.veteran;
  // "Gegnerstärke" sets the enemies only; allies always fight like veterans. The balance tournament can
  // override both teams and the autopilot player (skillOverride = { blue, red, player }).
  let teamSkill = { blue: matchDifficulty, red: matchDifficulty }, playerSkill = null, skillOverride = null;
  const skillOf = vehicle => vehicle === player && playerSkill ? playerSkill : teamSkill[vehicle.team];
  const particleGeometry = new T.SphereGeometry(1, 5, 4);
  const puffMaterials = ['#d8c4a0', '#edb36b', '#a29a7d', '#f4d28a', '#fff0b3'].map(color => new T.MeshBasicMaterial({ color }));
  const events = [], killLog = []; let previousOwner = null, autopilot = false;
  try { const saved = JSON.parse(localStorage.getItem('iron-horizon-settings') || '{}'); sensitivity = Math.max(.4, Math.min(2, Number(saved.sensitivity) || 1)); if (typeof saved.shake === 'boolean') shakeEnabled = saved.shake; if (Systems.profiles[saved.vehicle]) selectedVehicle = saved.vehicle; if (Object.hasOwn(IronMaps.levels, saved.map)) selectedMap = saved.map; if (['high', 'medium', 'low'].includes(saved.quality)) quality = saved.quality; introSeen = saved.intro === true; if (Object.hasOwn(IronBattle.difficulties, saved.difficulty)) difficulty = saved.difficulty; invertY = saved.invertY === true; showFps = saved.fps === true; if (['domination', 'attack', 'defense'].includes(saved.mission)) mission = saved.mission; } catch (_) { /* Storage may be disabled. */ }
  // Olympiade: Mit ?olymp=… im Link kämpft die ganze Olympia-Gruppe in einem gemeinsamen Online-Gefecht
  // (Raum je Gruppe, siehe raeume.js); jeder wählt seinen Panzer frei. Ein Versuch; die Punkte rechnet der Server.
  // Frühere Fassung: für alle dieselbe Karte, derselbe Panzer,
  // dieselben Gegner (fester Startwert aus dem Lauf). Ein Versuch; die Punkte rechnet der Server.
  olympia = (() => {
    let ticket = new URLSearchParams(location.search).get('olymp');
    try { if (ticket) sessionStorage.setItem('iron-horizon-olymp', ticket); else ticket = sessionStorage.getItem('iron-horizon-olymp'); } catch (_) {}
    if (!ticket) return null;
    history.replaceState(null, '', location.pathname);
    let info;
    try { info = JSON.parse(decodeURIComponent(escape(atob(ticket.split('.')[0].replace(/-/g, '+').replace(/_/g, '/'))))); } catch (_) { return null; }
    const alt = { vehicle: selectedVehicle, map: selectedMap, difficulty, mission };
    let startwert = 7;
    for (const zeichen of String(info.l)) startwert = (startwert * 31 + zeichen.charCodeAt(0)) >>> 0;
    return { ticket, info, alt, startwert: startwert || 1, versuchKey: 'iron-horizon-olymp-' + info.l, gemeldet: false };
  })();
  if (olympia) {
    const c = olympia.info.c || {};
    if (Object.hasOwn(IronMaps.levels, c.karte)) selectedMap = c.karte;
    if (['luchs', 'keiler'].includes(c.panzer)) selectedVehicle = c.panzer;
    difficulty = 'veteran'; mission = 'domination';
  }
  $('sensitivity').value = sensitivity; $('shake').checked = shakeEnabled; $('quality').value = quality; $('difficultySelect').value = difficulty; $('invertY').checked = invertY; $('showFps').checked = showFps; $('fps').hidden = !showFps; $('missionSelect').value = mission;
  function saveSettings() {
    // In der Olympiade bleiben die eigenen Einstellungen für Karte, Panzer, Gegner und Modus unangetastet
    const eigen = olympia ? olympia.alt : { vehicle: selectedVehicle, map: selectedMap, difficulty, mission };
    try { localStorage.setItem('iron-horizon-settings', JSON.stringify({ sensitivity, shake: shakeEnabled, vehicle: eigen.vehicle, map: eigen.map, quality, intro: introSeen, difficulty: eigen.difficulty, invertY, fps: showFps, mission: eigen.mission })); } catch (_) {}
  }
  $('difficultySelect').onchange = event => { if (mode !== 'menu' || !Object.hasOwn(IronBattle.difficulties, event.target.value)) return; difficulty = event.target.value; saveSettings(); refreshMapUi(); };
  $('invertY').onchange = event => { invertY = event.target.checked; saveSettings(); };
  $('showFps').onchange = event => { showFps = event.target.checked; $('fps').hidden = !showFps; saveSettings(); };
  // Shadows and render resolution are the expensive parts; lower levels keep phones and older laptops fluid.
  function applyQuality() {
    const shadows = quality !== 'low', size = quality === 'high' ? 2048 : 1024;
    renderer.setPixelRatio(Math.min(devicePixelRatio, quality === 'high' ? 1.7 : quality === 'medium' ? 1.25 : 1));
    if (renderer.shadowMap.enabled !== shadows || sun.shadow.mapSize.x !== size) {
      renderer.shadowMap.enabled = shadows; renderer.shadowMap.type = quality === 'high' ? T.PCFSoftShadowMap : T.PCFShadowMap;
      sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; }
      scene.traverse(object => { if (object.material) object.material.needsUpdate = true; });
    }
    resize();
  }
  $('quality').onchange = event => { if (!['high', 'medium', 'low'].includes(event.target.value)) return; quality = event.target.value; saveSettings(); applyQuality(); };
  $('mapSelect').onchange = event => {
    if (mode !== 'menu' || !Object.hasOwn(IronMaps.levels, event.target.value)) return;
    selectedMap = event.target.value; saveSettings(); reset();
  };
  $('selectLuchs').onclick = () => selectVehicle('luchs'); $('selectKeiler').onclick = () => selectVehicle('keiler'); $('selectDachs').onclick = () => selectVehicle('dachs');
  $('missionSelect').onchange = event => { if (mode !== 'menu' || !['domination', 'attack', 'defense'].includes(event.target.value)) return; mission = event.target.value; saveSettings(); refreshMapUi(); };
  $('sensitivity').oninput = event => { sensitivity = Number(event.target.value); saveSettings(); };
  $('shake').onchange = event => { shakeEnabled = event.target.checked; saveSettings(); };
  function paintBackground(paint) { return `linear-gradient(135deg, ${paint.colors.map((color, i) => `${color} ${i * 100 / paint.colors.length}%, ${color} ${(i + 1) * 100 / paint.colors.length}%`).join(', ')})`; }
  function refreshCareer() {
    const state = careerStore.state, rank = Career.rank(state.xp), currentPaint = state.paints[player.profile.id];
    $('garageRank').textContent = `${rank.current.name.toUpperCase()} · ${state.xp.toLocaleString('de-DE')} EP`;
    $('careerTitle').textContent = rank.current.name;
    $('careerProgress').textContent = rank.next ? `${state.xp.toLocaleString('de-DE')} EP gesamt · Noch ${(rank.next.xp - state.xp).toLocaleString('de-DE')} EP bis ${rank.next.name}` : `${state.xp.toLocaleString('de-DE')} EP gesamt · Höchster Rang erreicht`;
    $('careerProgressBar').style.width = `${rank.next ? (state.xp - rank.current.xp) / (rank.next.xp - rank.current.xp) * 100 : 100}%`;
    const fields = [['GEFECHTE', state.matches], ['SIEGE', state.wins], ['ABSCHÜSSE', state.kills], ['TREFFER', state.hits], ['VERLUSTE', state.deaths], ['ZIELZEIT', `${Math.floor(state.captureSeconds / 60)} MIN`], ['BESTES GEFECHT', `${state.bestXp} EP`], ['SIEGQUOTE', `${state.matches ? Math.round(state.wins / state.matches * 100) : 0}%`]];
    $('careerAwards').replaceChildren(...Career.awards.map(entry => {
      const item = document.createElement('li'), earned = state.awards.includes(entry.id); item.className = earned ? 'earned' : '';
      const name = document.createElement('b'), text = document.createElement('span'); name.textContent = `${earned ? '★' : '☆'} ${entry.name}`; text.textContent = entry.text; item.append(name, text); return item;
    }));
    $('awardCount').textContent = `${state.awards.length} / ${Career.awards.length}`;
    $('careerStats').innerHTML = fields.map(([label, value]) => `<span>${label}<b>${value}</b></span>`).join('');
    $('paintVehicle').textContent = player.profile.name;
    for (const [container, detailed] of [[$('garagePaints'), false], [$('careerPaints'), true]]) {
      container.replaceChildren();
      for (const paint of Career.paints) {
        const unlocked = Career.paintUnlocked(paint, state), button = document.createElement('button'), requirement = paint.award ? `Auszeichnung „${Career.awards.find(a => a.id === paint.award).name}“` : `ab ${paint.xp} EP`;
        button.type = 'button'; button.disabled = !unlocked; button.dataset.paint = paint.id; button.setAttribute('aria-pressed', String(currentPaint === paint.id));
        button.title = `${paint.name}${unlocked ? '' : ` · ${requirement}`}`; button.setAttribute('aria-label', button.title);
        if (detailed) { const swatch = document.createElement('i'); swatch.style.background = paintBackground(paint); const label = document.createElement('span'); label.textContent = paint.name; const hint = document.createElement('small'); hint.textContent = unlocked ? currentPaint === paint.id ? 'AUSGERÜSTET' : 'VERFÜGBAR' : paint.award ? 'AUSZEICHNUNG' : `${paint.xp} EP`; button.append(swatch, label, hint); }
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
    const saved = careerStore.commit(pendingImport, true); pendingImport = null; $('importPreview').hidden = true; refreshCareer(); applyPaint(); refreshStart();
    $('careerStatus').textContent = saved ? 'Spielstand importiert und lokal gespeichert.' : careerStore.warning;
  });
  window.addEventListener('storage', event => { if (event.key === Career.KEY && !careerStore.protected) { careerStore.read(); refreshCareer(); refreshStart(); if (mode === 'menu') applyPaint(); } });
  async function recordRound() {
    const id = roundId, result = ownResult(), finalStats = { ...stats }, difficultyId = matchDifficulty.id, mapId = level.id;
    $('earnedXp').textContent = 'Erfahrung wird gezählt …'; $('xpBreakdown').textContent = $('unlockNotice').textContent = $('saveStatus').textContent = '';
    try {
      const previousRank = Career.rank(careerStore.state.xp).current.name;
      const reward = await withCareerLock(() => careerStore.award(id, result, finalStats, difficultyId, mapId)); refreshCareer();
      if (roundId !== id || mode !== 'result') return;
      $('earnedXp').textContent = `+${reward.xp} EP`;
      const b = reward.breakdown;
      $('xpBreakdown').textContent = reward.duplicate ? 'Dieses Gefecht wurde bereits verbucht.' : `Gefecht ${b.participation} · Ergebnis ${b.outcome} · Abschüsse ${b.kills} · Treffer ${b.hits} · Zielbeitrag ${b.objective}${b.difficulty ? ` · Ass-Bonus ${b.difficulty}` : ''}`;
      const currentRank = Career.rank(careerStore.state.xp).current.name;
      $('unlockNotice').textContent = [currentRank !== previousRank ? `Neuer Rang: ${currentRank}` : '', ...reward.awards.map(a => `Auszeichnung: ${a.name}`), ...reward.unlocks.map(p => `Freigeschaltet: ${p.name}`), currentRank !== previousRank && currentRank === 'Frontkämpfer' ? 'Dachs jetzt im Gefecht verfügbar' : ''].filter(Boolean).join(' · ');
      $('saveStatus').textContent = reward.saved ? 'Fortschritt lokal gespeichert.' : careerStore.warning;
    } catch (_) { if (roundId === id) { $('earnedXp').textContent = 'Fortschritt nicht verbucht'; $('saveStatus').textContent = 'Der Spielstand konnte nicht aktualisiert werden. Ein Export des bestehenden Profils bleibt möglich.'; } }
  }
  function notify(message, seconds = 3) { $('notice').textContent = message; noticeTime = seconds; }
  // Bright, fast, short-lived sparks at the impact point; ricochets spray along the deflected path.
  function sparks(position, count, along = null) {
    for (let i = 0; i < count && particles.length < 150; i++) {
      const mesh = new T.Mesh(particleGeometry, puffMaterials[4]); mesh.position.copy(position); mesh.scale.setScalar(.05 + random() * .06); scene.add(mesh);
      const velocity = new T.Vector3((random() - .5) * 14, 2 + random() * 8, (random() - .5) * 14);
      if (along) velocity.addScaledVector(along, 18);
      particles.push({ mesh, life: .18 + random() * .25, max: .4, velocity, kind: 4 });
    }
  }
  let markerTimer;
  function hitMarker(kind, text) {
    const marker = $('hitMarker'); marker.className = `hit-marker ${kind}`; marker.dataset.text = text; marker.hidden = false;
    clearTimeout(markerTimer); markerTimer = setTimeout(() => { marker.hidden = true; }, kind === 'kill' ? 1100 : 650);
  }
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
  function deploySmoke(vehicle = player) {
    if (net && !net.host && vehicle === player) {
      if (player.systems.smokeCharges <= 0 || player.systems.smokeCooldown > 0) { notify(player.systems.smokeCharges === 0 ? 'KEINE RAUCHLADUNG MEHR' : 'RAUCH WIRD BEREITGEMACHT', 2); return false; }
      IronOnline.send({ t: 'in', k: 'smoke' }); return true;
    }
    if (!Systems.useSmoke(vehicle.systems)) { if (vehicle === player) notify(player.systems.smokeCharges === 0 ? 'KEINE RAUCHLADUNG MEHR' : 'RAUCH WIRD BEREITGEMACHT', 2); return false; }
    emit({ k: 'smoke', s: vehicle.slot });
    return smokeCloud(vehicle);
  }
  function smokeCloud(vehicle) {
    const group = new T.Group(); group.position.copy(vehicle.root.position); scene.add(group);
    const cloud = { x: group.position.x, y: 2.5, z: group.position.z, radius: 7, life: 10, group, owner: vehicle };
    for (let i = 0; i < 26; i++) {
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: smokeTexture, color: '#bbc1ad', transparent: true, opacity: .78, depthWrite: false }));
      const angle = random() * Math.PI * 2, radius = random() * 5;
      sprite.position.set(Math.cos(angle) * radius, 1 + random() * 4, Math.sin(angle) * radius);
      sprite.scale.setScalar(5 + random() * 3); sprite.material.rotation = random() * Math.PI; group.add(sprite);
    }
    smokeClouds.push(cloud);
    targets.forEach(bot => { bot.visibleToPlayer = false; bot.thinkTimer = 0; });
    if (vehicle === player) notify('RAUCH AKTIV · SICHT FÜR 10 SEKUNDEN VERDECKT\nGeschosse können den Rauch weiterhin durchdringen.', 3);
    return true;
  }
  function updateSmoke(dt) {
    for (let i = smokeClouds.length - 1; i >= 0; i--) {
      const cloud = smokeClouds[i]; cloud.life -= dt; cloud.radius = 7 * Math.min(1, Math.max(0, cloud.life / 2));
      for (const sprite of cloud.group.children) { sprite.material.opacity = .78 * Math.min(1, Math.max(0, cloud.life / 2)); sprite.material.rotation += dt * .02; }
      if (cloud.life <= 0) { scene.remove(cloud.group); cloud.group.children.forEach(sprite => sprite.material.dispose()); smokeClouds.splice(i, 1); }
    }
  }
  const teamColors = { blue: '#637d76', red: '#8e6850' };
  // Who sits in which slot, which team and colour each tank has, and what the labels say.
  function assignSlots() {
    const others = [0, 1, 2, 3, 4, 5].filter(slot => slot !== (net ? net.slot : 0));
    player.slot = net ? net.slot : 0; player.team = slotTeam(player.slot);
    const numbers = { blue: 0, red: 0 };
    targets.forEach((target, i) => {
      target.slot = others[i]; target.team = gameType === 'training' ? (i < 2 ? 'blue' : 'red') : slotTeam(target.slot);
      const seat = net?.seats[target.slot];
      target.remote = seat?.human ?? null;
      target.number = ++numbers[target.team];
      target.callsign = seat?.name ? seat.name.toUpperCase() : `${target.team === player.team ? 'VERBÜNDETER' : 'GEGNER'} ${target.number}`;
      target.label.className = 'vehicle-label' + (target.team === player.team ? ' friendly' : '') + (target.remote ? ' human' : '');
      for (const mesh of target.hullMeshes) mesh.material.color.set(teamColors[target.team]).convertSRGBToLinear();
    });
  }
  function reset() {
    loadMap(selectedMap); refreshMapUi();
    roundId = typeof crypto.randomUUID === 'function' ? crypto.randomUUID() : `${Date.now().toString(36)}-${Math.random().toString(36).slice(2)}`;
    assignSlots();
    const [startX, startZ] = gameType === 'training' ? level.trainingStart : slotSpawn(player.slot); tank.root.position.set(startX, 0, startZ); hullYaw = turretYaw = viewYaw = gameType === 'training' ? 0 : teamYaw(player.team); pitch = -.16; velocity = reload = recoil = hitCount = 0; zoom = false; keys.clear();
    matchMission = gameType === 'battle' ? mission : 'domination';
    match = matchMission === 'domination' ? new IronBattle.Match() : new IronBattle.Breakthrough(matchMission === 'attack' ? 'blue' : 'red');
    btPoints = match.mode === 'breakthrough' ? [level.capture, level.breakthrough[match.defender]] : [];
    stats = freshStats(); damageTime = 0; guards.blue = guards.red = null; events.length = killLog.length = 0; previousOwner = null; previousStage = 0;
    matchDifficulty = IronBattle.difficulties[difficulty];
    teamSkill = { blue: IronBattle.difficulties[skillOverride?.blue || (autopilot || net ? difficulty : 'veteran')], red: IronBattle.difficulties[skillOverride?.red || difficulty] };
    playerSkill = skillOverride?.player ? IronBattle.difficulties[skillOverride.player] : null;
    // Bots: mirrored pairs share a vehicle (blue 1 ↔ red 1, blue 2 ↔ red 2); red 3 mirrors the player.
    if (net) targets.forEach(target => applyProfile(target, net.seats[target.slot].vehicle));
    else if (!autopilot) {
      const [first, second] = gameType === 'battle' && lineup ? lineup : ['luchs', 'keiler'];
      [first, second, first, second, gameType === 'battle' ? selectedVehicle : 'luchs'].forEach((id, i) => applyProfile(targets[i], id));
    }
    Object.assign(player, { hp: 100, alive: true, respawn: 0, shield: 3, yaw: hullYaw, life: 0, systems: Systems.fresh(), lastHit: null }); tank.root.visible = true; steerInput = 0;
    applyProfile(player, selectedVehicle); refreshVehicleUi(); clearSmoke();
    for (const target of targets) {
      [target.x, target.z] = level.training[target.id]; target.ring.position.set(target.x, ground(target.x, target.z) + .09, target.z); target.flagGroup.position.set(target.x, ground(target.x, target.z), target.z);
      target.hits = 0; target.systems = Systems.fresh(); target.ring.material.color.set('#eab577'); target.flagGroup.visible = gameType === 'training'; target.label.hidden = true;
      Object.assign(target, { hp: 100, alive: true, respawn: 0, shield: 3, life: 0, netState: null, reload: 1 + random(), path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, visibleToPlayer: false }, freshTactics(target));
      target.root.visible = true; target.ring.visible = gameType === 'training';
      if (gameType === 'training') { target.root.position.set(target.x, 0, target.z); target.yaw = .3 + target.id * 1.1; }
      else { target.root.position.set(...spawnCoordinates(target)); target.yaw = target.team === 'blue' ? 0 : Math.PI; }
      target.turretYaw = target.yaw; settle(target, target.yaw); target.turret.rotation.y = 0; target.gun.rotation.x = 0;
    }
    zones.forEach(zone => { zone.group.visible = false; });
    if (gameType === 'battle') { placeZone(zones[0], level.capture); if (match.mode === 'breakthrough') placeZone(zones[1], btPoints[1]); }
    layouts.clear(); $('matchHud').hidden = gameType !== 'battle'; $('captureTrack').hidden = gameType !== 'battle'; $('healthTrack').hidden = gameType !== 'battle';
    $('modeLabel').textContent = gameType === 'battle' ? `${match.mode === 'breakthrough' ? matchMission === 'attack' ? 'DURCHBRUCH · ANGRIFF' : 'DURCHBRUCH · VERTEIDIGUNG' : 'VORHERRSCHAFT'} · GEGNER: ${matchDifficulty.name.toUpperCase()}` : 'SCHIESSÜBUNG';
    $('objectiveTitle').textContent = gameType === 'battle' ? objectiveTitle() : 'Erfasse die Übungsziele';
    $('matchLabel').textContent = match.mode === 'breakthrough' ? 'DURCHBRUCH' : 'VORHERRSCHAFT';
    $('result').hidden = $('respawn').hidden = $('damageFlash').hidden = true;
    for (const shell of shells) scene.remove(shell.mesh); shells.length = 0;
    for (const particle of particles) scene.remove(particle.mesh); particles.length = 0;
    updateTank(); scene.updateMatrixWorld(true); updateCamera(1, true);
    $('score').textContent = '0 / 5 ZIELE GETROFFEN';
    updateHud();
  }
  function objectiveTitle() {
    if (match.mode !== 'breakthrough') return 'Erobere Punkt A';
    const letter = 'AB'[Math.min(match.stage, 1)];
    return match.attacker === player.team ? `Erobere Punkt ${letter}` : `Halte Punkt ${letter}`;
  }
  let previousStage = 0, lineup = null;
  // A new random pairing for each battle; the garage keeps a fixed line-up.
  function rollLineup() { const pool = Systems.VEHICLES; lineup = [pool[Math.floor(random() * pool.length)], pool[Math.floor(random() * pool.length)]]; }
  function updateTank() {
    settle(player, hullYaw); tank.turret.rotation.y = turretYaw - hullYaw;
    tank.gun.position.z = player.gunBase + recoil * .24;
  }
  let lockTimer, lockAttempt = 0, fallbackInput = false, lockUnavailable = false;
  let edgeX = 0, edgeY = 0;
  function beginPlaying(fallback = false) {
    clearTimeout(lockTimer); fallbackInput = fallback; edgeX = edgeY = 0;
    mode = 'playing'; keys.clear(); releaseTouch(); $('pause').hidden = true;
    document.body.classList.toggle('pointer-locked', !fallback && !touchMode);
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
    if (touchMode) { beginPlaying(); return; }
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
    mode = 'paused'; keys.clear(); releaseTouch(); zoom = false; $('pause').hidden = false;
    document.body.classList.remove('pointer-locked', 'aim-active');
    if (document.pointerLockElement) document.exitPointerLock();
  }
  start.onclick = () => {
    if (selectedVehicle === 'dachs' && dachsLocked()) return;
    if (olympia) { if (olympiaVersuchWeg()) return olympiaMenue(); IronOnline.olymp(olympia.ticket); return; }
    gameType = 'battle'; rollLineup(); reset(); play(); notify(`${objectiveTitle()} · Blau ist dein Team`, 6); showTutorial(false);
  };
  function olympiaVersuchWeg() { try { return localStorage.getItem(olympia.versuchKey) === '1'; } catch (_) { return false; } }
  function zurOlympiade() { try { sessionStorage.removeItem('iron-horizon-olymp'); } catch (_) {} location.href = olympia.info.z || '/'; }
  // Menü in der Olympiade: feste Auswahl, Hinweis auf die Wertung, ein Versuch
  function olympiaMenue() {
    if (!olympia) return;
    const i = olympia.info, weg = olympiaVersuchWeg();
    for (const id of ['mapSelect', 'missionSelect', 'difficultySelect', 'selectLuchs', 'selectKeiler', 'selectDachs']) $(id).disabled = true;
    $('mapSelect').value = selectedMap; $('missionSelect').value = mission; $('difficultySelect').value = difficulty;
    const card = $('olympCard'); card.hidden = false;
    card.innerHTML = `<b>🏅 ${i.ti || 'Olympiade'} · Disziplin ${i.nr}/${i.von}</b>Online-Gefecht auf ${IronMaps.levels[selectedMap].name} gegen die anderen deiner Gruppe. Die Teams werden verteilt, leere Plätze fahren Bots. Deinen Panzer wählst du frei.`
      + `<small>SIEG 1000 · ABSCHUSS 300 · TREFFER 50 · SEKUNDE AM PUNKT 5 · EIGENER VERLUST −150 · EIN GEFECHT</small>`;
    start.disabled = false; start.firstChild.textContent = 'ZUR OLYMPIA-SCHLACHT ';
    if (weg) {
      start.disabled = false; start.firstChild.textContent = 'ZURÜCK ZUR OLYMPIADE ';
      start.onclick = zurOlympiade;
      card.innerHTML += '<small>DEIN VERSUCH IST SCHON GESPIELT.</small>';
    }
  }
  if (olympia && !olympiaVersuchWeg()) setTimeout(() => IronOnline.olymp(olympia.ticket), 0);
  if (olympia) fetch('/api/olymp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket: olympia.ticket, art: 'da' }) })
    .then(r => r.json()).then(d => { if (d.schonGespielt) { try { localStorage.setItem(olympia.versuchKey, '1'); } catch (_) {} olympiaMenue(); } }).catch(() => {});
  $('trainingButton').onclick = () => { gameType = 'training'; reset(); play(); notify(touchMode ? 'Links fahren · rechts wischen zum Zielen · FEUER' : 'WASD fahren · Maus zielen · Linksklick feuern', 6); showTutorial(false); };
  $('controlsButton').onclick = () => { showTutorial(true); play(); };
  $('resumeButton').onclick = () => play();
  $('retryMouseButton').onclick = () => play(true);
  $('resetButton').onclick = () => { if (gameType === 'battle') rollLineup(); reset(); play(); notify(gameType === 'battle' ? `Neues Gefecht · ${objectiveTitle()}` : 'Neue Übung · 5 Ziele warten auf dich'); };
  $('rematchButton').onclick = () => { if (net) { leaveOnlineBattle(''); return; } rollLineup(); reset(); play(); };
  function garage() {
    mode = 'menu'; clearTimeout(lockTimer); lockAttempt++; keys.clear(); releaseTouch(); edgeX = edgeY = 0; tutorialTime = 0; $('tutorial').hidden = true; lineup = null;
    if (document.pointerLockElement) document.exitPointerLock();
    reset(); $('result').hidden = $('hud').hidden = $('pause').hidden = $('pauseButton').hidden = true; $('menu').hidden = false;
    document.body.classList.remove('playing', 'pointer-locked', 'aim-active'); targets.forEach(t => { t.label.hidden = true; });
  }
  $('menuButton').onclick = () => { if (net) { endOnline(); } garage(); };
  $('garageButton').onclick = () => { if (net) { IronOnline.send({ t: 'leave' }); endOnline(); } garage(); };
  // In der Olympiade kein Neustart und kein Abbruch mitten im Gefecht
  if (olympia) { $('resetButton').hidden = true; $('garageButton').hidden = true; }
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
    viewYaw -= event.movementX * rate; pitch = Math.max(-.48, Math.min(.16, pitch - event.movementY * rate * (invertY ? -1 : 1)));
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
  // Touch controls: one full-screen layer tracks every finger. Left thumb = analog drive stick,
  // right side = drag to aim, buttons for fire/zoom/smoke/repair/brake. Dragging from FEUER keeps aiming.
  const touchLayer = $('touch'), touchPointers = new Map(), stickRadius = 52;
  function setTouchMode(on) {
    if (touchMode === on) return;
    touchMode = on; refreshInputTexts();
  }
  function refreshInputTexts() {
    document.body.classList.toggle('touch-mode', touchMode);
    $('menuInput').textContent = touchMode ? 'TOUCH · QUERFORMAT' : 'MAUS & TASTATUR';
    $('pauseButton').textContent = touchMode ? 'II · PAUSE' : 'ESC · PAUSE';
    $('tutorialBody').innerHTML = touchMode
      ? '<li><b>Linker Daumen</b> Joystick: fahren und lenken</li><li><b>Rechts wischen</b> Turm und Blick drehen</li><li><b>FEUER</b> schießen, weiterwischen zielt nach</li><li><b>ZOOM</b> an/aus · <b>RAUCH</b> nebelt dich ein</li><li><b>REPARATUR</b> halten, während du stillstehst</li><li>Im Stand triffst du genauer. Seite und Heck sind verwundbar.</li>'
      : '<li><b>W / S</b> fahren · <b>A / D</b> lenken · <b>Leertaste</b> bremsen</li><li><b>Maus</b> zielt, der Turm folgt · <b>Linksklick</b> feuert</li><li><b>Rechtsklick halten</b> zoomt</li><li><b>Q</b> Rauch · <b>R halten</b> repariert im Stillstand</li><li>Im Stand triffst du genauer. Seite und Heck sind verwundbar.</li><li><b>Esc</b> pausiert und gibt die Maus frei.</li>';
  }
  let tutorialTime = 0;
  function showTutorial(force) {
    if (!force && introSeen) return;
    $('tutorialGoal').textContent = gameType !== 'battle' ? 'Triff die fünf Übungsziele. Hier schießt niemand zurück.'
      : match.mode === 'breakthrough' ? match.attacker === player.team ? 'Durchbruch: Erobere Punkt A, dann Punkt B. Ohne Verteidiger im Kreis dauert es 10 Sekunden, gegen Verteidiger 30 – dafür müsst ihr doppelt so viele sein. Jeder Punkt bringt 3 Minuten.' : `Durchbruch: Halte die Angreifer auf. Solange ihr im Kreis nicht in doppelter Unterzahl seid, stoppt ihre Eroberung. Sie haben ${IronBattle.Breakthrough.TICKETS} Tickets und nur begrenzt Zeit.`
      : 'Erobere Punkt A: 10 Sekunden allein im Kreis. Solange dein Team ihn hält, verliert der Gegner alle 2 Sekunden ein Ticket.';
    $('tutorialBody').querySelector('.dachs-tip')?.remove();
    if (player.profile.traverse) { const tip = document.createElement('li'); tip.className = 'dachs-tip'; tip.innerHTML = '<b>Dachs</b>: Die Kanone schwenkt nur ±12°. Im Stand dreht sich die Wanne selbst zum Ziel.'; $('tutorialBody').prepend(tip); }
    $('tutorial').hidden = false; tutorialTime = 16; introSeen = true; saveSettings();
  }
  $('closeTutorial').onclick = () => { tutorialTime = 0; $('tutorial').hidden = true; };
  function releaseTouch() {
    touchPointers.clear(); Object.assign(touch, { throttle: 0, steer: 0, brake: false, repair: false });
    touchLayer.querySelectorAll('.held').forEach(element => element.classList.remove('held'));
    $('stickBase').style.left = $('stickBase').style.top = ''; $('stickKnob').style.transform = '';
  }
  function touchButtonAt(x, y) {
    for (const element of touchLayer.querySelectorAll('[data-touch]')) {
      const r = element.getBoundingClientRect();
      if (r.width && x >= r.left - 8 && x <= r.right + 8 && y >= r.top - 8 && y <= r.bottom + 8) return element;
    }
    return null;
  }
  function moveStick(state, x, y) {
    let dx = x - state.cx, dy = y - state.cy; const length = Math.hypot(dx, dy);
    if (length > stickRadius) { dx *= stickRadius / length; dy *= stickRadius / length; }
    $('stickKnob').style.transform = `translate(${dx}px, ${dy}px)`;
    const shape = v => { const a = Math.abs(v); return a < .16 ? 0 : Math.sign(v) * ((a - .16) / .84) ** 1.2; };
    touch.throttle = -shape(dy / stickRadius); touch.steer = -shape(dx / stickRadius);
  }
  touchLayer.addEventListener('pointerdown', event => {
    event.preventDefault();
    if (mode !== 'playing') return;
    const button = touchButtonAt(event.clientX, event.clientY);
    const state = { role: 'look', x: event.clientX, y: event.clientY, button };
    if (button) {
      state.role = button.dataset.touch; button.classList.add('held');
      if (state.role === 'fire') fire();
      else if (state.role === 'zoom') zoom = !zoom;
      else if (state.role === 'smoke') { if (player.alive) deploySmoke(); }
      else if (state.role === 'repair') touch.repair = true;
      else if (state.role === 'brake') touch.brake = true;
    } else if (event.clientX < innerWidth * .45 && ![...touchPointers.values()].some(p => p.role === 'stick')) {
      state.role = 'stick';
      const half = $('stickBase').offsetWidth / 2;
      state.cx = Math.max(half + 8, Math.min(innerWidth * .45, event.clientX)); state.cy = Math.max(half + 70, Math.min(innerHeight - half - 8, event.clientY));
      $('stickBase').style.left = `${state.cx - half}px`; $('stickBase').style.top = `${state.cy - half}px`;
      moveStick(state, event.clientX, event.clientY);
    }
    touchPointers.set(event.pointerId, state);
    try { touchLayer.setPointerCapture(event.pointerId); } catch (_) { /* Older browsers keep implicit touch capture. */ }
  });
  touchLayer.addEventListener('pointermove', event => {
    const state = touchPointers.get(event.pointerId); if (!state || mode !== 'playing') return;
    event.preventDefault();
    if (state.role === 'stick') moveStick(state, event.clientX, event.clientY);
    else if (state.role === 'look' || state.role === 'fire') {
      const rate = .0048 * sensitivity * (zoom ? .45 : 1);
      viewYaw -= (event.clientX - state.x) * rate; pitch = Math.max(-.48, Math.min(.16, pitch - (event.clientY - state.y) * rate * .8 * (invertY ? -1 : 1)));
    }
    state.x = event.clientX; state.y = event.clientY;
  });
  function endTouch(event) {
    const state = touchPointers.get(event.pointerId); if (!state) return;
    touchPointers.delete(event.pointerId); state.button?.classList.remove('held');
    if (state.role === 'stick') { touch.throttle = touch.steer = 0; $('stickKnob').style.transform = ''; $('stickBase').style.left = $('stickBase').style.top = ''; }
    else if (state.role === 'repair') touch.repair = false;
    else if (state.role === 'brake') touch.brake = false;
  }
  touchLayer.addEventListener('pointerup', endTouch); touchLayer.addEventListener('pointercancel', endTouch);
  touchLayer.addEventListener('contextmenu', event => event.preventDefault());
  // Switch input style by the device actually used; a mouse click in the garage returns to desktop mode.
  document.addEventListener('pointerdown', event => {
    if (event.pointerType === 'touch') setTouchMode(true);
    else if (event.pointerType === 'mouse' && mode === 'menu') setTouchMode(false);
  }, true);
  refreshInputTexts();
  function staticBlocked(x, z, radius = 2.8) {
    if (Math.abs(x) > 146 || Math.abs(z) > 146) return true;
    return obstacles.some(o => { const dx = Math.max(Math.abs(x - o.x) - o.w, 0), dz = Math.max(Math.abs(z - o.z) - o.d, 0); return dx * dx + dz * dz < radius * radius; });
  }
  function blocked(x, z, exclude = player) {
    if (staticBlocked(x, z, 2.55)) return true;
    return [player, ...targets].some(v => v !== exclude && v.alive && Math.hypot(x - v.root.position.x, z - v.root.position.z) < 5.6);
  }
  function shortest(a) { return Math.atan2(Math.sin(a), Math.cos(a)); }
  const clamp = (value, low, high) => Math.max(low, Math.min(high, value));
  function ground(x, z) { return IronMaps.height(level, x, z); }
  // Put a vehicle on the ground and tilt it to the slope (pitch front/back, roll left/right).
  function settle(vehicle, yaw) {
    const p = vehicle.root.position; p.y = ground(p.x, p.z);
    if (!level.heightAt) { vehicle.root.rotation.set(0, yaw, 0); return; }
    const fx = -Math.sin(yaw), fz = -Math.cos(yaw), rx = Math.cos(yaw), rz = -Math.sin(yaw);
    const pitchAngle = Math.atan2(ground(p.x + fx * 2.4, p.z + fz * 2.4) - ground(p.x - fx * 2.4, p.z - fz * 2.4), 4.8);
    const rollAngle = Math.atan2(ground(p.x + rx * 1.6, p.z + rz * 1.6) - ground(p.x - rx * 1.6, p.z - rz * 1.6), 3.2);
    vehicle.root.rotation.set(pitchAngle, yaw, rollAngle);
  }
  // Uphill costs speed, downhill gives a little: factor for driving along yaw (direction ±1).
  function slopeFactor(x, z, yaw, forward = 1) {
    if (!level.heightAt) return 1;
    const fx = -Math.sin(yaw) * forward, fz = -Math.cos(yaw) * forward;
    return clamp(1 - (ground(x + fx * 2.4, z + fz * 2.4) - ground(x - fx * 2.4, z - fz * 2.4)) / 4.8 * 1.6, .45, 1.15);
  }
  // First point where a ray meets the ground (march + bisection), or null.
  function groundRay(origin, dir, far) {
    let previous = 0;
    for (let t = 1.5; t <= far + 1.5; t += 1.5) {
      const d = Math.min(t, far);
      if (origin.y + dir.y * d <= ground(origin.x + dir.x * d, origin.z + dir.z * d)) {
        let low = previous, high = d;
        for (let i = 0; i < 8; i++) { const mid = (low + high) / 2; if (origin.y + dir.y * mid <= ground(origin.x + dir.x * mid, origin.z + dir.z * mid)) high = mid; else low = mid; }
        return high;
      }
      previous = d; if (d === far) break;
    }
    return null;
  }
  // Terrain between two points hides them from each other (only relief maps have any).
  function groundBlocks(a, b) {
    if (!level.heightAt) return false;
    const length = a.distanceTo(b), samples = Math.ceil(length / 4);
    for (let i = 1; i < samples; i++) { const t = i / samples; if (a.y + (b.y - a.y) * t < ground(a.x + (b.x - a.x) * t, a.z + (b.z - a.z) * t) + .25) return true; }
    return false;
  }
  const pivot = new T.Vector3(), towards = new T.Vector3(), turretQuaternion = new T.Quaternion();
  // Gun elevation towards a world point, measured in the (possibly tilted) turret frame.
  function elevationTo(vehicle, point) {
    vehicle.gun.getWorldPosition(pivot); towards.copy(point).sub(pivot);
    vehicle.turret.getWorldQuaternion(turretQuaternion); towards.applyQuaternion(turretQuaternion.invert());
    return Math.atan2(towards.y, Math.hypot(towards.x, towards.z));
  }
  function aim(dt) {
    aimRay.setFromCamera(new T.Vector2(0, 0), camera);
    const hits = aimRay.intersectObjects(shotObjects(player), false), groundDistance = groundRay(aimRay.ray.origin, aimRay.ray.direction, 350);
    const distance = Math.min(hits.length ? hits[0].distance : Infinity, groundDistance ?? Infinity, 350);
    aimPoint.copy(aimRay.ray.origin).addScaledVector(aimRay.ray.direction, distance);
    temp.copy(aimPoint).sub(tank.root.position);
    const profile = player.profile, rate = profile.turret * Systems.turretRate(player.systems);
    let wanted = Math.atan2(-temp.x, -temp.z);
    if (profile.traverse) {
      // Turretless: when the target leaves the ±12° arc and the driver is not steering, the hull swings round.
      const outside = shortest(wanted - hullYaw), mobility = Systems.mobility(player.systems);
      if (Math.abs(outside) > profile.traverse && player.alive && !steerInput && !throttleInput && Math.abs(velocity) < 2 && mobility > 0) hullYaw += clamp(outside, -profile.turn * mobility * dt, profile.turn * mobility * dt);
      wanted = hullYaw + clamp(shortest(wanted - hullYaw), -profile.traverse, profile.traverse);
    }
    turretYaw += clamp(shortest(wanted - turretYaw), -rate * dt, rate * dt);
    if (profile.traverse) turretYaw = hullYaw + clamp(shortest(turretYaw - hullYaw), -profile.traverse, profile.traverse);
    updateTank(); tank.root.updateMatrixWorld(true);
    tank.gun.rotation.x = clamp(elevationTo(player, aimPoint), -.19, .35);
  }
  function playerSpread() { return Systems.spread(player.profile, velocity / player.profile.speed, steerInput); }
  function fire() {
    if (reload > 0 || mode !== 'playing' || !player.alive) return;
    reload = player.profile.reload; recoil = 1; scene.updateMatrixWorld(true);
    launchShell(player, playerSpread());
  }
  function launchShell(vehicle, spread = 0) {
    vehicle.shield = 0; vehicle.systems.repair = 0;
    const origin = vehicle.gun.localToWorld(new T.Vector3(0, 0, -3.3));
    direction.set(0, 0, -1).transformDirection(vehicle.gun.matrixWorld);
    // Dispersion: a random offset inside a cone, uniform over the disc.
    if (spread > 0) {
      const angle = random() * Math.PI * 2, radius = spread * Math.sqrt(random());
      const side = temp.set(-direction.z, 0, direction.x).normalize(), up = new T.Vector3().crossVectors(side, direction).normalize();
      direction.addScaledVector(side, Math.cos(angle) * radius).addScaledVector(up, Math.sin(angle) * radius).normalize();
    }
    // Online: a guest only shows its own shot and asks the host to fire it for real.
    if (net && !net.host && vehicle === player) IronOnline.send({ t: 'in', k: 'fire', o: vec3(origin), d: vec3(direction) });
    if (net?.host) emit({ k: 'shot', s: vehicle.slot, o: vec3(origin), d: vec3(direction) });
    spawnShell(vehicle, origin, direction);
  }
  const vec3 = v => [Math.round(v.x * 1000) / 1000, Math.round(v.y * 1000) / 1000, Math.round(v.z * 1000) / 1000];
  function spawnShell(vehicle, origin, dir) {
    const mesh = new T.Mesh(particleGeometry, puffMaterials[3]); mesh.scale.set(.07, .07, .2); mesh.position.copy(origin); scene.add(mesh);
    shells.push({ mesh, velocity: dir.clone().normalize().multiplyScalar(95), life: 5, owner: vehicle });
    puff(origin, vehicle === player ? 13 : 6, 1);
  }
  function impact(hit, shell) {
    puff(hit.point, 17, hit.object.userData.target === undefined ? 0 : 1);
    const targetId = hit.object.userData.target;
    if (gameType === 'training' && targetId !== undefined) {
      const target = targets[targetId];
      if (!target.hits) { hitCount++; target.ring.material.color.set('#a5c596'); }
      sparks(hit.point, 10); hitMarker(target.hits ? 'hit' : 'module', 'TREFFER');
      target.hits++;
      $('score').textContent = `${hitCount} / 5 ZIELE GETROFFEN`;
      notify(hitCount === 5 ? 'ÜBUNG ABGESCHLOSSEN · 5 / 5\nErkunde weiter oder starte im Pausenmenü neu.' : `TREFFER · ZIEL ${targetId + 1}\n${hitCount} von 5 Zielen erfasst`, hitCount === 5 ? 8 : 2.5);
    } else if (gameType === 'battle' && hit.object.userData.vehicle) {
      const victim = hit.object.userData.vehicle, attacker = shell.owner;
      if (!victim.alive || victim.team === attacker.team) return;
      if (net && !net.host) { sparks(hit.point, 6); return; }
      if (victim.shield > 0) { if (attacker === player) notify('ZIEL HAT STARTSCHUTZ', 1); emit({ k: 'shield', a: attacker.slot }); return; }
      const path = shell.velocity.clone().normalize();
      // Angle between the shell path and the struck plate decides between ricochet and penetration.
      const normal = hit.face ? hit.face.normal.clone().transformDirection(hit.object.matrixWorld) : path.clone().negate();
      if (Systems.ricochet(Math.abs(normal.dot(path)))) {
        sparks(hit.point, 7, path.clone().addScaledVector(normal, -2 * normal.dot(path)).normalize());
        if (attacker === player) ownBounce();
        if (victim === player) bouncedOffMe();
        emit({ k: 'bounce', a: attacker.slot, v: victim.slot });
        return;
      }
      const forward = new T.Vector3(-Math.sin(victim.yaw), 0, -Math.cos(victim.yaw));
      const incidence = forward.dot(path.clone().setY(0).normalize().negate()), facing = Systems.side(incidence);
      const moduleHit = Systems.hitModule(victim.systems, victim.root.worldToLocal(hit.point.clone()), victim.profile);
      const damage = Systems.damage(incidence, attacker.profile, victim.profile, moduleHit);
      const where = { front: 'FRONT', side: 'SEITE', rear: 'HECK' }[facing];
      victim.hp = Math.max(0, victim.hp - damage); sparks(hit.point, 10);
      emit({ k: 'hit', a: attacker.slot, v: victim.slot, dmg: damage, w: where, mod: moduleHit, kill: victim.hp === 0 ? 1 : 0 });
      if (attacker === player) ownHit(victim, damage, where, moduleHit);
      if (victim === player) hitMe(attacker, where, moduleHit);
      if ((victim !== player || autopilot) && !victim.remote) {
        victim.threat = 5;
        // Hurt bots sometimes cover their retreat with smoke.
        if (victim.hp > 0 && victim.hp < 60 && victim.systems.smokeCharges > 1 && skillOf(victim).smoke && random() < .5) deploySmoke(victim);
      }
      if (victim.hp === 0) {
        victim.alive = false; victim.respawn = 6; victim.root.visible = false;
        puff(victim.root.position.clone().setY(victim.root.position.y + 1.8), 30, 1); match.lose(victim.team); killLog.push([attacker.profile.id, victim.profile.id, attacker.team]);
        if (victim === player) killedMe(where);
        else { victim.label.hidden = true; victim.ring.visible = false; }
        if (attacker === player) ownKill(victim, where);
      }
    }
  }
  // Feedback for the player's own shots and for hits on the player; used by the host's rules and by
  // guests when the host reports what happened.
  const moduleNames = victim => ({ tracks: 'KETTE BESCHÄDIGT', engine: 'MOTOR BESCHÄDIGT', turret: victim.profile.traverse ? 'RICHTANTRIEB BESCHÄDIGT' : 'TURMANTRIEB BESCHÄDIGT' });
  function ownBounce() { hitMarker('ricochet', 'ABPRALLER'); stats.ricochets++; notify('ABPRALLER · ZU FLACHER WINKEL\nZiele möglichst senkrecht auf die Panzerung.', 2); }
  function bouncedOffMe() { stats.bounced++; notify('ABPRALLER AN DEINER PANZERUNG', 1.6); }
  function ownHit(victim, damage, where, moduleHit) {
    const moduleText = moduleNames(victim)[moduleHit];
    if (victim.hp > 0) hitMarker(moduleHit ? 'module' : 'hit', moduleText || `−${damage}`);
    stats.hits++; notify(`DURCHSCHLAG · ${where} · −${damage}${moduleText ? `\n${moduleText}` : ''}`, 2);
  }
  function hitMe(attacker, where, moduleHit) {
    damageTime = .45; player.lastHit = { by: attacker, where };
    if (moduleHit) notify({ tracks: 'KETTE AUSGEFALLEN · STILLSTEHEN & REPARIEREN\nRauch gibt dir Deckung.', engine: 'MOTOR BESCHÄDIGT · LEISTUNG REDUZIERT\nStillstehen und reparieren.', turret: `${player.profile.traverse ? 'RICHTANTRIEB' : 'TURMANTRIEB'} BESCHÄDIGT · KANONE SCHWENKT LANGSAM\nStillstehen und reparieren.` }[moduleHit], 4);
  }
  function killedMe(where) { stats.deaths++; velocity = 0; zoom = false; events.push({ type: 'death', where }); }
  function ownKill(victim, where) {
    hitMarker('kill', 'AUSGESCHALTET');
    const point = activePoint(), nearPoint = Math.hypot(victim.root.position.x - point.x, victim.root.position.z - point.z) < point.radius + 8;
    const pressure = match.mode === 'breakthrough' ? match.attacker !== player.team || match.contested : match.owner === player.team || !match.owner || match.contested;
    events.push({ type: 'kill', victim: victim.callsign, vehicle: victim.profile.name, where, distance: victim.root.position.distanceTo(tank.root.position), zone: nearPoint && pressure });
    stats.kills++; notify(`FAHRZEUG AUSGESCHALTET · ${victim.callsign}\nGegner verliert 5 Tickets.`, 3);
  }
  function spawnCoordinates(vehicle) {
    if (match.mode === 'breakthrough' && match.stage > 0 && vehicle.team === match.attacker) {
      const [x, z] = layoutFor(Math.min(match.stage, btPoints.length - 1), vehicle.team).spawns[slotIndex(vehicle)];
      return [x, 0, z];
    }
    const [x, z] = slotSpawn(vehicle.slot);
    return [x, 0, z];
  }
  function respawnVehicle(vehicle) {
    const base = spawnCoordinates(vehicle);
    // Fallback spots mirror between the teams as well (sideways turned around on point-symmetric maps).
    const back = vehicle.team === 'blue' ? 1 : -1, side = level.symmetry === 'point' ? back : 1;
    const candidates = [[base[0], base[2]], [base[0] + 7 * side, base[2]], [base[0] - 7 * side, base[2]], [base[0], base[2] + 9 * back]];
    const place = candidates.find(([x, z]) => !blocked(x, z, vehicle));
    if (!place) { vehicle.respawn = .5; return; }
    vehicle.root.position.set(place[0], 0, place[1]); vehicle.root.visible = true; settle(vehicle, vehicle.team === 'blue' ? 0 : Math.PI);
    Object.assign(vehicle, { alive: true, hp: 100, shield: 3, respawn: 0, enemy: null, reload: 1, navigationTimer: 0, thinkTimer: 0, path: [], reaction: 1, systems: Systems.fresh() });
    vehicle.life = (vehicle.life || 0) + 1;
    if (vehicle === player) { velocity = reload = 0; hullYaw = turretYaw = viewYaw = teamYaw(player.team); pitch = -.16; player.lastHit = null; notify('WIEDER IM GEFECHT · 3 SEKUNDEN SCHUTZ', 3); if (autopilot) Object.assign(player, freshTactics(player), { yaw: hullYaw, turretYaw: hullYaw }); }
    else { Object.assign(vehicle, freshTactics(vehicle)); vehicle.yaw = vehicle.turretYaw = vehicle.team === 'blue' ? 0 : Math.PI; settle(vehicle, vehicle.yaw); vehicle.turret.rotation.y = 0; }
  }
  // Per-life tactical state: fast tanks sometimes take a wide flank before joining the fight.
  function freshTactics(bot) {
    const flanks = level.flanks[bot.team], attacking = match.mode !== 'breakthrough' || (match.attacker === bot.team && match.stage === 0);
    return { flank: attacking && skillOf(bot).flank && bot.profile.id === 'luchs' && random() < .55 ? flanks[Math.floor(random() * flanks.length)] : null, threat: 0, lastSeen: null, goalKind: '', goalPoint: null, speedNow: 0 };
  }
  function canSee(from, to) {
    if (!from.alive || !to.alive || from.root.position.distanceTo(to.root.position) > 115) return false;
    const origin = from.root.position.clone(), destination = to.root.position.clone(); origin.y += 2.35; destination.y += 1.45;
    if (Systems.smokeBlocks(origin, destination, smokeClouds) || groundBlocks(origin, destination)) return false;
    const delta = destination.sub(origin); combatRay.set(origin, delta.clone().normalize()); combatRay.far = delta.length() + 1;
    const hits = combatRay.intersectObjects(shotObjects(from), false);
    return hits.length > 0 && hits[0].object.userData.vehicle === to;
  }
  const guards = { blue: null, red: null };
  let btPoints = [];
  const layouts = new Map();
  function activePoint() { return match.mode === 'breakthrough' ? btPoints[Math.min(match.stage, btPoints.length - 1)] : level.capture; }
  // Six fixed slots: blue 0 (centre), 1, 2 · red 3, 4, 5 (centre); mirror pairs 0↔5, 1↔3, 2↔4.
  // Offline the player is slot 0 and targets[i] slot i + 1; online every human gets a slot from the room.
  const slotTeam = slot => slot < 3 ? 'blue' : 'red';
  const slotIndex = vehicle => [2, 0, 1, 0, 1, 2][vehicle.slot];
  const slotSpawn = slot => slot === 0 ? level.playerRespawn : level.spawns[slot - 1];
  const slotGoal = slot => slot === 0 ? [level.capture.x, level.capture.z + 5] : level.goals[slot - 1];
  const teamYaw = team => team === 'blue' ? 0 : Math.PI;
  // The result seen from the player: 'blue' = won, 'red' = lost (career, key moment, Olympiade).
  const ownResult = () => match.result === 'draw' || !match.result ? match.result : match.result === player.team ? 'blue' : 'red';
  // Durchbruch positions are generated around each point and nudged out of obstacles (also on the nav grid).
  // Red gets the exact mirror image of blue's positions, so both sides fight on the same ground.
  function layoutFor(index, team) {
    const key = `${level.id}-${index}-${team}-${match.attacker}`;
    if (!layouts.has(key)) {
      const shift = IronBattle.gridShift(6, 136, level.capture), snap = (value, offset) => Math.round((value - offset + 136) / 6) * 6 - 136 + offset;
      const bad = (x, z) => staticBlocked(x, z, 3.4) || staticBlocked(snap(x, shift.x), snap(z, shift.z), 2.8);
      const point = btPoints[index], mirrored = team === 'red', [px, pz] = mirrored ? IronMaps.mirror(level, point.x, point.z) : [point.x, point.z];
      const raw = IronBattle.pointLayout({ x: px, z: pz }, 1);
      layouts.set(key, Object.fromEntries(Object.entries(raw).map(([name, list]) => [name, list.map(([x, z]) => { const free = IronBattle.freeNear(x, z, bad); return mirrored ? IronMaps.mirror(level, ...free) : free; })])));
    }
    return layouts.get(key);
  }
  const inZone = vehicle => { const point = activePoint(); return vehicle.alive && Math.hypot(vehicle.root.position.x - point.x, vehicle.root.position.z - point.z) < point.radius; };
  // One bot per team stays on a secured point; the others take overwatch positions.
  function isGuard(bot) {
    // A human player is never assigned a role; on autopilot the player's tank is a bot like any other.
    if (bot === player && !autopilot) return false;
    if (bot.team === player.team && inZone(player) && !autopilot) return false;
    let guard = guards[bot.team];
    if (!guard?.alive) {
      const point = activePoint();
      guard = [...(autopilot ? [player] : []), ...targets].filter(t => t.team === bot.team && t.alive && !t.remote).sort((a, b) => Math.hypot(a.root.position.x - point.x, a.root.position.z - point.z) - Math.hypot(b.root.position.x - point.x, b.root.position.z - point.z))[0] || null;
      guards[bot.team] = guard;
    }
    return guard === bot;
  }
  function updateBot(bot, dt) {
    bot.reload = Math.max(0, bot.reload - dt); bot.navigationTimer -= dt; bot.thinkTimer -= dt; bot.threat = Math.max(0, bot.threat - dt);
    // Broken tracks or engine: stop and repair. A damaged turret drive only slows aiming, so the bot
    // keeps fighting while it sees an enemy and repairs once the fight is over.
    const repairing = Systems.damaged(bot.systems) && (Systems.mobility(bot.systems) < 1 || !bot.enemy?.alive);
    Systems.repair(bot.systems, dt, repairing, false);
    if (bot.flank && Math.hypot(bot.root.position.x - bot.flank[0], bot.root.position.z - bot.flank[1]) < 10) bot.flank = null;
    const skill = skillOf(bot), point = activePoint(), threatened = bot.threat > 0;
    let slot, hold, owner = match.owner, progress = match.progress;
    if (match.mode === 'breakthrough') {
      const layout = layoutFor(Math.min(match.stage, btPoints.length - 1), bot.team); slot = layout.slots[slotIndex(bot)]; hold = layout.holds[slotIndex(bot)];
      // Defenders treat an untouched point as "secured"; attackers never do.
      progress = (bot.team === 'blue' ? 1 : -1) * (1 - match.progress);
    } else {
      const holds = level.holds[bot.team];
      slot = slotGoal(bot.slot); hold = holds[slotIndex(bot)];
    }
    // Flanks only pay off against a held point; in the race for a free point the direct way wins.
    const flank = owner && owner !== bot.team ? bot.flank : null;
    const objective = IronBattle.botObjective({ team: bot.team, position: bot.root.position, hp: bot.hp, threatened, guard: isGuard(bot), owner, contested: match.contested, progress, capture: point, slot, hold, flank });
    const goal = { x: objective.point[0], z: objective.point[1] };
    if (bot.goalPoint !== objective.point) { bot.goalPoint = objective.point; bot.goalKind = objective.kind; bot.navigationTimer = 0; }
    if (bot.navigationTimer <= 0) {
      const clearance = (x, z) => staticBlocked(x, z, 3.2), route = IronBattle.findPath(bot.root.position, goal, staticBlocked, 6, 136, level.capture);
      // The grid route ends in the goal's cell; finish on the exact goal, or bots stop up to 4 m short
      // (and, where the goal lies on a cell border, short on one side only).
      if (IronBattle.clearLine(route.length ? route[route.length - 1] : bot.root.position, goal, clearance)) route.push(goal);
      bot.path = IronBattle.smoothPath(bot.root.position, route, clearance);
      bot.navigationTimer = 2.5 + (bot === player ? 1 : bot.id) * .2;
    }
    const nearGoal = Math.hypot(bot.root.position.x - goal.x, bot.root.position.z - goal.z) < 3;
    while (bot.path.length && Math.hypot(bot.path[0].x - bot.root.position.x, bot.path[0].z - bot.root.position.z) < 1.8) bot.path.shift();
    // The heavy tank halts briefly to fire accurately; the light one shoots on the move. A turretless
    // tank must stop early, because it turns its whole hull towards the target before it can fire.
    const halting = bot.profile.id !== 'luchs' && bot.enemy?.alive && bot.reload < (bot.profile.traverse ? 2.5 : .7) && bot.reaction < .4;
    bot.speedNow = 0;
    if (!nearGoal && bot.path.length && !repairing && !halting) {
      const waypoint = bot.path[0], desired = Math.atan2(bot.root.position.x - waypoint.x, bot.root.position.z - waypoint.z);
      const delta = shortest(desired - bot.yaw); bot.yaw += Math.max(-dt * bot.profile.turn, Math.min(dt * bot.profile.turn, delta));
      const pace = (Math.abs(delta) < .4 ? Math.min(7.5, bot.profile.speed * .7) : 2.5) * Systems.mobility(bot.systems) * slopeFactor(bot.root.position.x, bot.root.position.z, bot.yaw);
      const nx = bot.root.position.x - Math.sin(bot.yaw) * pace * dt, nz = bot.root.position.z - Math.cos(bot.yaw) * pace * dt;
      if (!blocked(nx, nz, bot)) {
        bot.root.position.x = nx; bot.root.position.z = nz; bot.stuck = 0; bot.speedNow = pace; for (const wheel of bot.wheels) wheel.rotation.x += pace * dt;
        bot.dust = (bot.dust || 0) + dt;
        if (pace > 5 && bot.dust > .22 && particles.length < 110) { bot.dust = 0; temp.set(nx + Math.sin(bot.yaw) * 2.4, 0, nz + Math.cos(bot.yaw) * 2.4); temp.y = ground(temp.x, temp.z) + .3; puff(temp, 1, 2); }
      }
      else {
        bot.stuck += dt;
        // Back off and re-route around a stopped vehicle instead of pushing forever.
        if (bot.stuck > .8) {
          const reverseX = bot.root.position.x + Math.sin(bot.yaw + .6) * 3 * dt, reverseZ = bot.root.position.z + Math.cos(bot.yaw + .6) * 3 * dt;
          if (!blocked(reverseX, reverseZ, bot)) { bot.root.position.x = reverseX; bot.root.position.z = reverseZ; }
          if (bot.stuck > 2.4) {
            const crowded = (x, z) => staticBlocked(x, z) || [player, ...targets].some(v => v !== bot && v.alive && Math.hypot(x - v.root.position.x, z - v.root.position.z) < 7);
            bot.path = IronBattle.findPath(bot.root.position, goal, crowded, 6, 136, level.capture);
            if (bot.path.length && IronBattle.clearLine(bot.path[bot.path.length - 1], goal, crowded)) bot.path.push(goal);
            bot.navigationTimer = 4; bot.stuck = 0;
          }
        }
      }
    } else if (nearGoal && !repairing) {
      // In position: turn the strong front plate towards the threat or the objective.
      const watch = bot.enemy?.alive ? bot.enemy.root.position : point;
      const dx = watch.x - bot.root.position.x, dz = watch.z - bot.root.position.z;
      if (Math.hypot(dx, dz) > 6) bot.yaw += Math.max(-dt * bot.profile.turn * .6, Math.min(dt * bot.profile.turn * .6, shortest(Math.atan2(-dx, -dz) - bot.yaw)));
    }
    if (bot.thinkTimer <= 0) {
      const previousEnemy = bot.enemy;
      bot.enemy = [player, ...targets].filter(v => v.team !== bot.team && v.alive).sort((a, b) => bot.root.position.distanceToSquared(a.root.position) - bot.root.position.distanceToSquared(b.root.position)).find(v => canSee(bot, v)) || null;
      const [fastest, slowest] = skill.reaction;
      if (bot.enemy !== previousEnemy) bot.reaction = fastest + random() * (slowest - fastest);
      if (bot.enemy) bot.lastSeen = { x: bot.enemy.root.position.x, z: bot.enemy.root.position.z, time: 3 };
      bot.visibleToPlayer = canSee(player, bot); bot.thinkTimer = .3 + random() * .15;
    }
    bot.reaction -= dt;
    if (bot.lastSeen) { bot.lastSeen.time -= dt; if (bot.lastSeen.time <= 0) bot.lastSeen = null; }
    // Turret: current enemy, else the last known position for a few seconds, else the objective when close.
    let desiredYaw = bot.yaw;
    const look = bot.enemy?.alive ? bot.enemy.root.position : bot.lastSeen || (Math.hypot(bot.root.position.x - point.x, bot.root.position.z - point.z) < 45 && !bot.speedNow ? point : null);
    let aimAt = null;
    if (look) {
      const dx = look.x - bot.root.position.x, dz = look.z - bot.root.position.z, distance = Math.hypot(dx, dz);
      if (distance > 4) desiredYaw = Math.atan2(-dx, -dz);
      // Ace bots aim low at tracks and hull sides when the target is not facing them.
      let aimHeight = 1.45;
      if (skill.lowAim && bot.enemy?.alive) { const facing = Math.abs(Math.cos(bot.enemy.yaw - Math.atan2(-dx, -dz))); if (facing < .55) aimHeight = 1.05; }
      aimAt = temp.set(look.x, (look.y ?? ground(look.x, look.z)) + aimHeight + 1.5 * (distance / 95) ** 2, look.z).clone();
    }
    const profile = bot.profile, turretRate = profile.turret * Systems.turretRate(bot.systems);
    let wantedTurret = desiredYaw;
    if (profile.traverse) {
      // Turretless: swing the whole hull when the target is outside the gun's arc and the bot stands.
      const outside = shortest(desiredYaw - bot.yaw), mobility = Systems.mobility(bot.systems);
      if (look && Math.abs(outside) > profile.traverse && !bot.speedNow && mobility > 0) bot.yaw += clamp(outside, -profile.turn * mobility * dt, profile.turn * mobility * dt);
      wantedTurret = bot.yaw + clamp(shortest(desiredYaw - bot.yaw), -profile.traverse, profile.traverse);
    }
    bot.turretYaw += clamp(shortest(wantedTurret - bot.turretYaw), -dt * turretRate, dt * turretRate);
    if (profile.traverse) bot.turretYaw = bot.yaw + clamp(shortest(bot.turretYaw - bot.yaw), -profile.traverse, profile.traverse);
    settle(bot, bot.yaw); bot.turret.rotation.y = bot.turretYaw - bot.yaw;
    // Uses last step's world matrices (updated once per step for the whole scene); one frame of lag is invisible.
    if (aimAt) bot.gun.rotation.x = clamp(elevationTo(bot, aimAt), -.25, .4);
    if (!repairing && bot.enemy?.alive && bot.reload <= 0 && bot.reaction <= 0 && Math.abs(shortest(desiredYaw - bot.turretYaw)) < .05 && canSee(bot, bot.enemy)) {
      bot.root.updateMatrixWorld(true); launchShell(bot, skill.error + Systems.spread(bot.profile, bot.speedNow / bot.profile.speed));
      bot.reload = bot.profile.reload + skill.reload + random();
    }
  }
  function updateBattle(dt) {
    for (const vehicle of [player, ...targets]) {
      vehicle.shield = Math.max(0, vehicle.shield - dt);
      if (!vehicle.alive) { vehicle.respawn -= dt; if (vehicle.respawn <= 0) respawnVehicle(vehicle); }
      else if (vehicle.remote) updateRemote(vehicle, dt);
      else if (vehicle !== player) updateBot(vehicle, dt);
      else if (autopilot) { updateBot(player, dt); hullYaw = player.yaw; turretYaw = player.turretYaw; }
    }
    const inside = [player, ...targets].filter(inZone), alone = inside.length === 1 && inside[0] === player;
    if (inside.includes(player)) stats.captureSeconds += dt;
    match.update(dt, inside.filter(v => v.team === 'blue').length, inside.filter(v => v.team === 'red').length);
    pointEvents(alone);
    if (net?.host) { net.snapTime -= dt; if (net.snapTime <= 0 || match.result) { net.snapTime = 1 / 15; sendSnapshot(); } }
    if (match.result) finishMatch();
  }
  // Stage changes, solo captures and zone colours; the host derives them from its rules, guests from snapshots.
  function pointEvents(alone) {
    const teamColor = { blue: '#79b9d7', red: '#da8365' };
    if (match.mode === 'breakthrough') {
      if (match.stage !== previousStage) {
        const letter = 'AB'[previousStage];
        if (match.attacker === player.team && alone) { events.push({ type: 'capture' }); stats.soloCaptures++; }
        if (!match.result) {
          notify(match.attacker === player.team ? `PUNKT ${letter} EROBERT · +3:00\nWeiter zu Punkt B.` : `PUNKT ${letter} VERLOREN · +3:00 FÜR DEN GEGNER\nZurück zu Punkt B.`, 4);
          guards.blue = guards.red = null; [player, ...targets].forEach(vehicle => { vehicle.navigationTimer = 0; });
          $('objectiveTitle').textContent = objectiveTitle();
        }
        previousStage = match.stage;
      }
      zones.forEach((zone, i) => colorZone(zone, i < match.stage ? teamColor[match.attacker] : i === match.stage ? match.contested ? '#efb36c' : match.progress > .01 ? '#e9d08a' : teamColor[match.defender] : '#8d8a78'));
    } else {
      if (match.owner === player.team && previousOwner !== player.team && alone) { events.push({ type: 'capture' }); stats.soloCaptures++; }
      colorZone(zones[0], match.contested ? '#efb36c' : teamColor[match.owner] || '#dfc18c');
    }
    previousOwner = match.owner;
  }
  function finishMatch() {
    if (mode === 'result') return;
    if (autopilot) { mode = 'result'; return; }
    mode = 'result'; keys.clear(); zoom = false; velocity = 0; document.body.classList.remove('pointer-locked', 'aim-active');
    if (document.pointerLockElement) document.exitPointerLock();
    if (match.mode === 'breakthrough') {
      const attacking = match.attacker === player.team, won = match.result === player.team;
      $('resultTitle').textContent = attacking ? won ? 'Durchbruch geschafft.' : 'Angriff gescheitert.' : won ? 'Stellung gehalten.' : 'Stellung verloren.';
      $('resultReason').textContent = `${match.captured >= match.stages ? 'Punkt B ist gefallen.' : match.tickets[match.attacker] <= 0 ? 'Die Angreifer haben keine Tickets mehr.' : 'Zeit abgelaufen.'} ${match.captured} von ${match.stages} Punkten erobert, ${match.tickets[match.attacker]} Angriffstickets übrig.`;
    } else {
      $('resultTitle').textContent = match.result === player.team ? `${level.name} gesichert.` : match.result === 'draw' ? 'Unentschieden.' : 'Gefecht verloren.';
      $('resultReason').textContent = `${match.time <= 0 ? 'Zeit abgelaufen.' : 'Ein Team hat keine Tickets mehr.'} Blau ${match.tickets.blue} : ${match.tickets.red} Rot.`;
    }
    $('resultStats').innerHTML = `<span>ABSCHÜSSE<b>${stats.kills}</b></span><span>WIRKSAME TREFFER<b>${stats.hits}</b></span><span>EIGENE VERLUSTE<b>${stats.deaths}</b></span><span>SEKUNDEN AM ZIEL<b>${Math.floor(stats.captureSeconds)}</b></span>`;
    const { moment, tip } = IronBattle.keyMoment(events, stats, ownResult());
    $('keyMoment').textContent = moment || 'Kein Abschuss in diesem Gefecht.'; $('keyTip').textContent = tip || ''; $('keyTip').hidden = !tip;
    $('result').hidden = false; $('respawn').hidden = true; targets.forEach(t => { t.label.hidden = true; });
    recordRound();
    if (net) {
      if (net.host) IronOnline.send({ t: 'end', result: match.result, tickets: [ticketOut(match.tickets.blue), ticketOut(match.tickets.red)], captured: match.captured ?? 0 });
      $('rematchButton').firstChild.textContent = 'ZURÜCK ZUR LOBBY ';
    }
    if (olympia && gameType === 'battle') olympiaMelden();
  }
  // Ergebnis an den eigenen Server, der die Punkte rechnet und an die Olympiade meldet
  let olympBox = null;
  async function olympiaMelden() {
    if (!olympBox) { olympBox = document.createElement('div'); olympBox.className = 'olymp-result'; $('rematchButton').before(olympBox); }
    olympBox.innerHTML = '<span class="eyebrow">OLYMPIADE</span><strong>Wird gewertet …</strong>';
    $('rematchButton').firstChild.textContent = 'ZURÜCK ZUR OLYMPIADE '; $('rematchButton').onclick = zurOlympiade; $('menuButton').hidden = true;
    const werte = { result: ownResult(), kills: stats.kills, hits: stats.hits, deaths: stats.deaths, captureSeconds: stats.captureSeconds };
    for (let versuch = 0; versuch < 4; versuch++) {
      try {
        const r = await fetch('/api/olymp', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ ticket: olympia.ticket, art: 'ergebnis', werte }) });
        const d = await r.json();
        olympBox.innerHTML = `<span class="eyebrow">OLYMPIADE</span><strong>${d.punkte != null ? d.punkte.toLocaleString('de-DE') + ' Punkte' : 'Nicht gewertet'}</strong><p>${r.ok ? 'Eingetragen – zurück zur Olympiade, dort siehst du die Wertung.' : d.fehler || ''}</p>`;
        olympia.gemeldet = true;
        return;
      } catch (_) { await new Promise(ok => setTimeout(ok, 2000 * (versuch + 1))); }
    }
    olympBox.innerHTML = '<span class="eyebrow">OLYMPIADE</span><strong>Keine Verbindung</strong><p>Dein Ergebnis konnte nicht gemeldet werden. Sag der Leitung Bescheid.</p>';
  }
  function step(dt) {
    if (fallbackInput) {
      const rate = sensitivity * (zoom ? .45 : 1);
      viewYaw -= edgeX * 1.4 * rate * dt;
      pitch = Math.max(-.48, Math.min(.16, pitch - edgeY * .65 * rate * dt));
    }
    // Keyboard is digital; the touch stick is analog. Whichever is used wins for this step.
    let throttle = (keys.has('KeyW') || keys.has('ArrowUp') ? 1 : 0) - (keys.has('KeyS') || keys.has('ArrowDown') ? 1 : 0);
    let steer = (keys.has('KeyA') || keys.has('ArrowLeft') ? 1 : 0) - (keys.has('KeyD') || keys.has('ArrowRight') ? 1 : 0);
    if (!throttle && !steer) { throttle = touch.throttle; steer = touch.steer; }
    if (!player.alive || autopilot) throttle = steer = 0;
    const braking = keys.has('Space') || touch.brake, repairHeld = keys.has('KeyR') || touch.repair;
    const mobility = Systems.mobility(player.systems) * slopeFactor(tank.root.position.x, tank.root.position.z, hullYaw, velocity < -.2 || (throttle < 0 && velocity < .5) ? -1 : 1), profile = player.profile;
    if (Systems.mobility(player.systems) === 0) velocity = 0;
    else if (braking || (repairHeld && !throttle && !steer && Systems.damaged(player.systems))) velocity *= Math.exp(-7 * dt);
    else if (throttle) {
      const target = throttle * (throttle > 0 ? profile.speed : profile.reverse) * mobility, change = profile.acceleration * mobility * dt * (velocity * target < 0 ? 1.8 : 1);
      velocity += Math.max(-change, Math.min(change, target - velocity));
    } else velocity *= Math.exp(-1.15 * dt);
    velocity = Math.max(-profile.reverse * mobility, Math.min(profile.speed * mobility, velocity));
    if (Math.abs(velocity) < .025) velocity = 0;
    steerInput = steer; throttleInput = throttle;
    hullYaw += steer * profile.turn * mobility * dt * (velocity < -.3 ? -1 : 1) * (1 - Math.abs(velocity) / 30);
    const moving = !!throttle || !!steer || Math.abs(velocity) > .2;
    if (net) { net.repairHeld = repairHeld; net.moving = moving; }
    if (!autopilot && !(net && !net.host) && Systems.repair(player.systems, dt, repairHeld, moving, player.alive)) {
      const underFire = targets.some(t => t.alive && t.team !== player.team && t.enemy === player);
      if (underFire) stats.fieldRepairs++;
      notify(underFire ? 'REPARATUR UNTER BESCHUSS ABGESCHLOSSEN' : 'REPARATUR ABGESCHLOSSEN · FAHRBEREIT', 3);
    }
    const nx = tank.root.position.x - Math.sin(hullYaw) * velocity * dt, nz = tank.root.position.z - Math.cos(hullYaw) * velocity * dt;
    if (autopilot) velocity = 0;
    else if (!blocked(nx, nz)) { tank.root.position.x = nx; tank.root.position.z = nz; obstacleContact = false; }
    else { velocity = 0; obstacleContact = true; }
    updateTank();
    if (!autopilot) aim(dt);
    reload = Math.max(0, reload - dt); recoil *= Math.exp(-7 * dt); updateTank();
    player.yaw = hullYaw;
    for (const wheel of tank.wheels) wheel.rotation.x += velocity * dt * 1.5;
    dustTime += dt;
    if (dustTime > .11 && Math.abs(velocity) > 2) { dustTime = 0; temp.copy(tank.root.position); temp.x += Math.sin(hullYaw) * 2; temp.z += Math.cos(hullYaw) * 2; temp.y = ground(temp.x, temp.z) + .3; puff(temp, 2, 2); }
    scene.updateMatrixWorld(true);
    for (let i = shells.length - 1; i >= 0; i--) {
      const shell = shells[i]; shell.life -= dt; shell.velocity.y -= 3 * dt;
      const distance = shell.velocity.length() * dt; ray.set(shell.mesh.position, direction.copy(shell.velocity).normalize()); ray.far = distance;
      const hits = ray.intersectObjects(shotObjects(shell.owner), false), groundDistance = groundRay(shell.mesh.position, direction, distance);
      if (groundDistance !== null && (!hits.length || groundDistance < hits[0].distance)) { impact({ point: shell.mesh.position.clone().addScaledVector(direction, groundDistance), object: terrain.ground }, shell); shell.life = 0; }
      else if (hits.length) { impact(hits[0], shell); shell.life = 0; } else shell.mesh.position.addScaledVector(shell.velocity, dt);
      if (shell.life <= 0) { scene.remove(shell.mesh); shells.splice(i, 1); }
    }
    for (let i = particles.length - 1; i >= 0; i--) {
      const p = particles[i]; p.life -= dt; p.mesh.position.addScaledVector(p.velocity, dt); p.velocity.multiplyScalar(Math.exp(-2 * dt));
      p.mesh.scale.multiplyScalar(1 + dt * (p.kind === 2 ? 1.3 : .4));
      if (p.life < .2) p.mesh.scale.multiplyScalar(.9);
      if (p.life <= 0) { scene.remove(p.mesh); particles.splice(i, 1); }
    }
    noticeTime -= dt; if (noticeTime <= 0) $('notice').textContent = '';
    if (tutorialTime > 0) { tutorialTime -= dt; if (tutorialTime <= 0) $('tutorial').hidden = true; }
    damageTime = Math.max(0, damageTime - dt);
    updateSmoke(dt);
    if (net && !net.host) updateGuest(dt);
    else if (gameType === 'battle') updateBattle(dt);
  }
  function updateCamera(dt, immediate = false) {
    if (mode === 'menu') {
      const a = .7 + Math.sin(elapsed * .065) * .12;
      const baseY = tank.root.position.y;
      camera.position.set(tank.root.position.x + Math.sin(a) * 17, baseY + 6.7, tank.root.position.z - Math.cos(a) * 17);
      camera.lookAt(tank.root.position.x + 4, baseY + 1.4, tank.root.position.z + 3); camera.fov = 51; camera.updateProjectionMatrix(); return;
    }
    const back = zoom ? 6.4 : 14;
    temp.set(tank.root.position.x + Math.sin(viewYaw) * back, tank.root.position.y + (zoom ? 4.1 : 6.7), tank.root.position.z + Math.cos(viewYaw) * back);
    temp.y = Math.max(temp.y, ground(temp.x, temp.z) + 1.5);
    cameraAnchor.copy(tank.root.position); cameraAnchor.y += 2.9;
    cameraDirection.copy(temp).sub(cameraAnchor);
    cameraRay.set(cameraAnchor, cameraDirection.clone().normalize()); cameraRay.far = cameraDirection.length();
    const cameraHits = cameraRay.intersectObjects(solids, false);
    if (cameraHits.length) temp.copy(cameraAnchor).addScaledVector(cameraRay.ray.direction, Math.max(.7, cameraHits[0].distance - .6));
    camera.position.lerp(temp, immediate ? 1 : 1 - Math.exp(-12 * dt));
    if (shakeEnabled) camera.position.y += recoil * .1;
    direction.set(-Math.sin(viewYaw) * Math.cos(pitch), Math.sin(pitch), -Math.cos(viewYaw) * Math.cos(pitch));
    camera.lookAt(temp.copy(camera.position).addScaledVector(direction, 100));
    camera.fov += ((zoom ? 32 : 58) - camera.fov) * (immediate ? 1 : 1 - Math.exp(-10 * dt)); camera.updateProjectionMatrix(); camera.updateMatrixWorld();
  }
  const map = $('minimap').getContext('2d');
  let reliefImage = null, reliefLevel = null;
  function reliefBackground() {
    if (reliefLevel === level) return reliefImage;
    reliefLevel = level; reliefImage = null;
    if (!level.heightAt) return null;
    const canvas = document.createElement('canvas'); canvas.width = canvas.height = 180; const context = canvas.getContext('2d'), image = context.createImageData(180, 180);
    for (let py = 0; py < 180; py++) for (let px = 0; px < 180; px++) {
      const h = ground((px - 90) / .54, (py - 90) / .54), i = (py * 180 + px) * 4;
      image.data[i] = 29 + h * 7 + (h < -.8 ? 22 : 0); image.data[i + 1] = 43 + h * 6 + (h < -.8 ? 14 : 0); image.data[i + 2] = 35 + h * 4; image.data[i + 3] = 255;
    }
    context.putImageData(image, 0, 0); reliefImage = canvas; return canvas;
  }
  function drawMap() {
    map.fillStyle = '#1d2b23'; map.fillRect(0, 0, 180, 180);
    const relief = reliefBackground(); if (relief) map.drawImage(relief, 0, 0);
    map.strokeStyle = '#ffffff10'; map.lineWidth = 1;
    for (let i = 0; i < 180; i += 30) { map.beginPath(); map.moveTo(i, 0); map.lineTo(i, 180); map.moveTo(0, i); map.lineTo(180, i); map.stroke(); }
    const scale = .54, center = 90;
    map.fillStyle = level.theme === 'quarry' ? '#8a8066' : '#737557';
    for (const [x, z, w, d] of level.roads) map.fillRect(center + (x - w / 2) * scale, center + (z - d / 2) * scale, w * scale, d * scale);
    map.fillStyle = '#889078';
    for (const o of obstacles) if (o.w > 1) map.fillRect(center + (o.x - o.w) * scale, center + (o.z - o.d) * scale, o.w * scale * 2, o.d * scale * 2);
    if (gameType === 'battle') {
      const points = match.mode === 'breakthrough' ? btPoints : [level.capture], light = { blue: '#94c6db', red: '#f2a084' };
      points.forEach((point, i) => {
        const cx = center + point.x * scale, cz = center + point.z * scale;
        map.strokeStyle = match.mode === 'breakthrough' ? i < match.stage ? light[match.attacker] : i === match.stage ? '#efd79a' : '#7d7a6a' : light[match.owner] || '#dfc18c';
        map.lineWidth = match.mode === 'breakthrough' && i === match.stage ? 2 : 1;
        map.beginPath(); map.arc(cx, cz, point.radius * scale, 0, Math.PI * 2); map.stroke(); map.fillStyle = '#eee4c3'; map.fillText('AB'[i], cx - 3, cz + 3);
      });
    }
    targets.forEach(target => {
      if (!target.alive || (gameType === 'battle' && target.team !== player.team && !target.visibleToPlayer)) return;
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
    for (const [id, module, label] of [['trackStatus', 'tracks', 'KETTE'], ['engineStatus', 'engine', 'MOTOR'], ['turretStatus', 'turret', player.profile.traverse ? 'RICHTUNG' : 'TURM']]) {
      const broken = player.systems[module] === 0;
      $(id).textContent = `${label} · ${broken ? 'AUSFALL' : 'OK'}`; $(id).classList.toggle('broken', broken);
      document.querySelectorAll(`[data-module="${module}"]`).forEach(part => part.classList.toggle('broken', broken));
    }
    const spread = mode === 'playing' && player.alive ? playerSpread() : 0;
    $('spreadRing').style.width = $('spreadRing').style.height = `${Math.round(26 + spread * 1500)}px`;
    $('smokeCount').textContent = player.systems.smokeCooldown > 0 ? `${Math.ceil(player.systems.smokeCooldown)} S · ${player.systems.smokeCharges}/2` : `${player.systems.smokeCharges} / 2`;
    $('repairLabel').textContent = !player.alive ? 'FAHRZEUG VERLOREN' : player.systems.repair > 0 ? `REPARATUR · ${(6 - player.systems.repair).toFixed(1)} S` : Systems.damaged(player.systems) ? 'STILLSTEHEN & HALTEN' : 'MODULE INTAKT';
    $('repairBar').style.width = `${player.systems.repair / Systems.REPAIR_TIME * 100}%`;
    $('touchSmoke').textContent = player.systems.smokeCharges; $('touchRepair').style.setProperty('--progress', `${player.systems.repair / Systems.REPAIR_TIME * 360}deg`);
    $('touchFire').classList.toggle('loading', reload > 0); $('touchFire').style.setProperty('--progress', `${(1 - reload / player.profile.reload) * 360}deg`);
    $('touchZoom').classList.toggle('on', zoom);
    const heading = ((-viewYaw * 180 / Math.PI) % 360 + 360) % 360;
    $('bearing').textContent = `${Math.round(heading).toString().padStart(3, '0')}° ${['N','NO','O','SO','S','SW','W','NW'][Math.round(heading / 45) % 8]}`;
    $('range').textContent = `${Math.round(tank.root.position.distanceTo(aimPoint))} M`;
    temp.set(0, 0, -75).applyMatrix4(tank.gun.matrixWorld).project(camera);
    $('gunMarker').style.left = `${(temp.x * .5 + .5) * innerWidth}px`; $('gunMarker').style.top = `${(-temp.y * .5 + .5) * innerHeight}px`;
    $('gunMarker').hidden = temp.z > 1 || Math.abs(temp.x) > 1 || Math.abs(temp.y) > 1; drawMap();
    if (gameType === 'training') $('driveStatus').textContent = obstacleContact ? 'HINDERNIS · ZURÜCKSETZEN' : 'FAHRZEUG EINSATZBEREIT';
    if (gameType === 'battle') {
      const ticketText = value => Number.isFinite(value) ? value : '∞';
      $('blueTickets').textContent = ticketText(match.tickets.blue); $('redTickets').textContent = ticketText(match.tickets.red);
      const seconds = Math.ceil(match.time); $('matchTime').textContent = `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${(seconds % 60).toString().padStart(2, '0')}`;
      if (match.mode === 'breakthrough') {
        const letter = 'AB'[Math.min(match.stage, 1)], percent = Math.round(match.progress * 100);
        $('score').textContent = `PUNKT ${letter} · ${match.contested ? 'UMKÄMPFT' : percent ? `EROBERUNG ${percent}%` : match.attacker === player.team ? 'IN VERTEIDIGERHAND' : 'GEHALTEN'}`;
        $('captureBar').style.width = `${match.progress * 100}%`; $('captureBar').style.background = match.attacker === 'blue' ? '#94c6db' : '#f2a084';
      } else {
        $('score').textContent = match.contested ? 'PUNKT A · UMKÄMPFT' : match.owner === player.team ? 'PUNKT A · DEIN TEAM' : match.owner ? 'PUNKT A · GEGNER' : `PUNKT A · ${Math.abs(match.progress) > .01 ? 'EROBERUNG ' + Math.round(Math.abs(match.progress) * 100) + '%' : 'NEUTRAL'}`;
        $('captureBar').style.width = `${Math.abs(match.progress) * 100}%`; $('captureBar').style.background = match.progress >= 0 ? '#94c6db' : '#f2a084';
      }
      $('healthBar').style.width = `${player.hp}%`; $('healthBar').style.background = player.hp < 35 ? '#f2a084' : '#a1c390';
      $('driveStatus').textContent = !player.alive ? 'FAHRZEUG AUSGESCHALTET' : obstacleContact ? 'HINDERNIS · ZURÜCKSETZEN' : player.shield > 0 ? `STARTSCHUTZ · ${Math.ceil(player.shield)} S` : `STRUKTUR ${player.hp}% · ${stats.kills} ABSCHÜSSE`;
      $('respawn').hidden = player.alive || mode !== 'playing'; $('respawnTime').textContent = Math.max(1, Math.ceil(player.respawn));
      $('respawnCause').textContent = player.lastHit ? `Getroffen von ${player.lastHit.by.callsign} · ${player.lastHit.by.profile.name} · ${player.lastHit.where}` : '';
      $('damageFlash').hidden = damageTime <= 0;
      for (const bot of targets) {
        temp.copy(bot.root.position); temp.y += 4.2; temp.project(camera);
        const visible = (mode === 'playing' || mode === 'paused') && bot.alive && (bot.team === player.team || bot.visibleToPlayer) && temp.z < 1 && Math.abs(temp.x) < 1 && Math.abs(temp.y) < 1;
        bot.label.hidden = !visible;
        if (visible) { bot.label.style.left = `${(temp.x * .5 + .5) * innerWidth}px`; bot.label.style.top = `${(-temp.y * .5 + .5) * innerHeight}px`; bot.label.innerHTML = `${bot.team === player.team ? '◆' : '◇'} ${bot.callsign} · ${bot.profile.name}<i style="width:${bot.hp * .55}px"></i>`; }
      }
    }
  }
  // ---------------- Online ----------------
  // The host's browser runs bots, hits and the match; guests drive their own tank and follow the host.
  function emit(event) { if (net?.host) IronOnline.send({ t: 'ev', ...event }); }
  const ticketOut = value => Number.isFinite(value) ? value : -1, ticketIn = value => value < 0 ? Infinity : value;
  const bySlot = slot => slot === player.slot ? player : targets.find(target => target.slot === slot);
  const round2 = value => Math.round(value * 100) / 100;
  function sendSnapshot() {
    const vehicles = [player, ...targets].sort((a, b) => a.slot - b.slot);
    IronOnline.send({ t: 'snap', m: [round2(match.time), ticketOut(match.tickets.blue), ticketOut(match.tickets.red), match.owner || '', round2(match.progress), match.contested ? 1 : 0, match.stage ?? 0, match.captured ?? 0],
      v: vehicles.map(v => [round2(v.root.position.x), round2(v.root.position.z), round2(v === player ? hullYaw : v.yaw), round2(v === player ? turretYaw : v.turretYaw), round2(v.gun.rotation.x), v.hp, v.alive ? 1 : 0, round2(v.respawn), v.shield > 0 ? 1 : 0,
        (v.systems.tracks ? 0 : 1) | (v.systems.engine ? 0 : 2) | (v.systems.turret ? 0 : 4), v.life || 0, v.systems.smokeCharges, round2(v.systems.repair), round2(v.systems.smokeCooldown)]) });
  }
  // Remote tanks glide towards their last reported pose.
  function followNet(vehicle, dt) {
    const s = vehicle.netState; if (!s) return;
    const k = 1 - Math.exp(-14 * dt), p = vehicle.root.position;
    p.x += (s.x - p.x) * k; p.z += (s.z - p.z) * k;
    vehicle.yaw += shortest(s.yaw - vehicle.yaw) * k; vehicle.turretYaw += shortest(s.turret - vehicle.turretYaw) * k;
    settle(vehicle, vehicle.yaw); vehicle.turret.rotation.y = vehicle.turretYaw - vehicle.yaw; vehicle.gun.rotation.x = s.pitch;
  }
  // Host side: a human guest's tank. Position comes from the guest, modules and repairs from the host.
  function updateRemote(vehicle, dt) {
    followNet(vehicle, dt);
    vehicle.netReload = Math.max(0, (vehicle.netReload || 0) - dt);
    const s = vehicle.netState;
    Systems.repair(vehicle.systems, dt, !!s?.repair, !!s?.moving, vehicle.alive);
  }
  function hostInput(d) {
    if (!net?.host || mode === 'menu' || mode === 'result') return;
    const vehicle = targets.find(target => target.remote === d.from); if (!vehicle) return;
    if (d.k === 'fire') {
      if (!vehicle.alive || vehicle.netReload > 0 || !Array.isArray(d.o) || !Array.isArray(d.d)) return;
      vehicle.netReload = vehicle.profile.reload - .3; vehicle.shield = 0; vehicle.systems.repair = 0;
      const origin = new T.Vector3(...d.o.map(Number)), dir = new T.Vector3(...d.d.map(Number));
      if (origin.distanceTo(vehicle.root.position) > 14 || !(dir.lengthSq() > .5)) return;
      emit({ k: 'shot', s: vehicle.slot, o: d.o, d: d.d }); spawnShell(vehicle, origin, dir);
    } else if (d.k === 'smoke') { if (vehicle.alive) deploySmoke(vehicle); }
    else if (Array.isArray(d.p) && d.l === vehicle.life && vehicle.alive) {
      const [x, z, yaw, turret, pitch] = d.p.map(Number);
      if ([x, z, yaw, turret, pitch].every(Number.isFinite)) vehicle.netState = { x: clamp(x, -146, 146), z: clamp(z, -146, 146), yaw, turret, pitch: clamp(pitch, -.3, .45), repair: !!d.r, moving: !!d.m };
    }
  }
  // Guest side: send the own tank, follow everyone else.
  function updateGuest(dt) {
    net.sendTime -= dt;
    if (net.sendTime <= 0) {
      net.sendTime = .05;
      IronOnline.send({ t: 'in', l: player.life, p: [round2(tank.root.position.x), round2(tank.root.position.z), round2(hullYaw), round2(turretYaw), round2(tank.gun.rotation.x)], r: net.repairHeld ? 1 : 0, m: net.moving ? 1 : 0 });
    }
    for (const target of targets) { if (target.netState) followNet(target, dt); target.shield = Math.max(0, target.shield - dt); }
    player.shield = Math.max(0, player.shield - dt); if (!player.alive) player.respawn = Math.max(0, player.respawn - dt);
    if (inZone(player)) stats.captureSeconds += dt;
    net.seeTime -= dt;
    if (net.seeTime <= 0) { net.seeTime = .3; for (const target of targets) target.visibleToPlayer = target.team !== player.team && canSee(player, target); }
    pointEvents(inZone(player) && [player, ...targets].filter(inZone).length === 1);
  }
  function applySnapshot(d) {
    if (!net || net.host || mode === 'menu' || mode === 'result' || !Array.isArray(d.v)) return;
    const [time, blue, red, owner, progress, contested, stage, captured] = d.m;
    Object.assign(match, { time, owner: owner || null, progress, contested: !!contested }); match.tickets.blue = ticketIn(blue); match.tickets.red = ticketIn(red);
    if (match.mode === 'breakthrough') { match.stage = stage; match.captured = captured; }
    d.v.forEach((row, slot) => {
      const v = bySlot(slot); if (!v) return;
      const [x, z, yaw, turret, pitch, hp, alive, respawn, shield, broken, life, smoke, repair, smokeCooldown] = row;
      const wasDamaged = Systems.damaged(v.systems), wasAlive = v.alive;
      Object.assign(v, { hp, alive: !!alive, respawn, shield: shield ? 1 : 0 });
      Object.assign(v.systems, { tracks: broken & 1 ? 0 : 100, engine: broken & 2 ? 0 : 100, turret: broken & 4 ? 0 : 100, smokeCharges: smoke, repair, smokeCooldown });
      if (v === player) {
        if (wasAlive && !v.alive) { velocity = 0; zoom = false; tank.root.visible = false; }
        if (life !== player.life) {
          player.life = life; tank.root.position.set(x, 0, z); hullYaw = turretYaw = viewYaw = yaw; velocity = reload = 0; pitch = -.16; player.lastHit = null; tank.root.visible = true;
          notify('WIEDER IM GEFECHT · 3 SEKUNDEN SCHUTZ', 3);
        }
        if (wasDamaged && !Systems.damaged(v.systems) && v.alive) notify('REPARATUR ABGESCHLOSSEN · FAHRBEREIT', 3);
      } else {
        v.netState = { x, z, yaw, turret, pitch };
        if (life !== v.life) { v.life = life; v.root.position.set(x, 0, z); v.yaw = v.turretYaw = yaw; settle(v, yaw); }
        v.root.visible = v.alive; if (!v.alive) v.label.hidden = true;
      }
    });
  }
  function applyEvent(e) {
    if (!net || net.host || mode === 'menu' || mode === 'result') return;
    const mine = player.slot, attacker = bySlot(e.a), victim = bySlot(e.v);
    if (e.k === 'shot') { const shooter = bySlot(e.s); if (shooter && e.s !== mine) spawnShell(shooter, new T.Vector3(...e.o), new T.Vector3(...e.d)); }
    else if (e.k === 'smoke') { const owner = bySlot(e.s); if (owner) { smokeCloud(owner); if (owner === player) player.systems.smokeCharges = Math.max(0, player.systems.smokeCharges - 1); } }
    else if (e.k === 'shield') { if (e.a === mine) notify('ZIEL HAT STARTSCHUTZ', 1); }
    else if (e.k === 'bounce') { if (e.a === mine) ownBounce(); if (e.v === mine) bouncedOffMe(); }
    else if (e.k === 'hit' && attacker && victim) {
      victim.hp = Math.max(0, victim.hp - e.dmg);
      if (e.a === mine) ownHit(victim, e.dmg, e.w, e.mod);
      if (e.v === mine) hitMe(attacker, e.w, e.mod);
      if (e.kill) {
        victim.alive = false; puff(victim.root.position.clone().setY(victim.root.position.y + 1.8), 30, 1);
        if (victim === player) { killedMe(e.w); tank.root.visible = false; } else { victim.root.visible = false; victim.label.hidden = true; }
        if (e.a === mine) ownKill(victim, e.w);
      }
    }
  }
  const settingsBeforeOnline = {};
  function startOnline(start) {
    const me = start.slots.find(seat => seat.human === start.you); if (!me || !careerStore) return;
    if (!net) Object.assign(settingsBeforeOnline, { selectedMap, mission, difficulty, selectedVehicle });
    if (olympia) { try { localStorage.setItem(olympia.versuchKey, '1'); } catch (_) {} }
    net = { host: start.host === start.you, slot: me.slot, seats: start.slots, sendTime: 0, snapTime: 0, seeTime: 0 };
    ({ map: selectedMap, mission, difficulty } = start.settings); selectedVehicle = me.vehicle; seed = start.seed >>> 0 || 1;
    IronOnline.hide(); $('careerPanel').hidden = true; gameType = 'battle'; reset(); play();
    $('resetButton').hidden = true;
    notify(`${objectiveTitle()} · ${player.team === 'blue' ? 'Blau' : 'Rot'} ist dein Team${net.host ? '\nDu bist Gastgeber: Lass diesen Tab vorne.' : ''}`, 6); showTutorial(false);
  }
  function endOnline() {
    if (!net) return;
    net = null; ({ selectedMap, mission, difficulty, selectedVehicle } = settingsBeforeOnline);
    $('resetButton').hidden = !!olympia; if (!olympia) $('rematchButton').firstChild.textContent = 'NEUES GEFECHT ';
  }
  function onlineEnd(d) {
    if (!net || net.host || mode === 'menu') return;
    match.result = d.result; if (Array.isArray(d.tickets)) { match.tickets.blue = ticketIn(d.tickets[0]); match.tickets.red = ticketIn(d.tickets[1]); }
    if (match.mode === 'breakthrough') match.captured = d.captured ?? match.captured;
    finishMatch();
  }
  function leaveOnlineBattle(text) { const wasOnline = !!net; endOnline(); if (!wasOnline) return; garage(); IronOnline.show(); if (text) $('lobbyStatus').textContent = text; }
  // Online is optional: if online.js did not load, the game still works alone.
  const IronOnline = window.IronOnline || { init() { $('onlineButton').hidden = true; }, on() {}, send() {}, show() {}, hide() {}, olymp() {} };
  IronOnline.init({ vehicle: () => selectedVehicle, allowed: id => !!olympia || id !== 'dachs' || !dachsLocked() });
  IronOnline.on('start', startOnline); IronOnline.on('snap', applySnapshot); IronOnline.on('ev', applyEvent); IronOnline.on('in', hostInput); IronOnline.on('end', onlineEnd);
  IronOnline.on('closed', d => {
    if (!net) return;
    if (olympia && !olympia.gemeldet && mode !== 'menu' && mode !== 'result') {
      match.result = 'abgebrochen'; finishMatch(); $('resultTitle').textContent = 'Gefecht abgebrochen.'; $('resultReason').textContent = `${d.text} Deine Werte bis hierhin zählen.`;
      endOnline(); return;
    }
    leaveOnlineBattle(d.text);
  });
  IronOnline.on('left', d => {
    const vehicle = targets.find(target => target.remote === d.id); if (!vehicle) return;
    vehicle.remote = null; vehicle.netState = null; vehicle.callsign += ' (BOT)'; vehicle.label.classList.remove('human');
    Object.assign(vehicle, freshTactics(vehicle), { path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, reload: 1 });
    notify(`${vehicle.callsign.replace(' (BOT)', '')} HAT DAS GEFECHT VERLASSEN · EIN BOT ÜBERNIMMT`, 3);
  });
  function resize() { renderer.setSize(innerWidth, innerHeight); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
  window.addEventListener('resize', resize);
  $('world').addEventListener('webglcontextlost', event => { event.preventDefault(); pause(); $('pause').hidden = true; $('menu').hidden = false; $('hud').hidden = true; fail('Die Grafikverbindung wurde unterbrochen. Bitte lade die Seite neu.'); });
  let previous = performance.now(), accumulator = 0, hudTime = 0, fpsFrames = 0, fpsTime = 0;
  // Weak devices: when the frame rate stays below 35 while playing, the graphics step down one level
  // (at most every 8 seconds, never back up). Automated test browsers are left alone.
  let slowFrames = 0, slowTime = 0, lastAutoQuality = -Infinity;
  const autoQuality = !navigator.webdriver;
  function watchFrameRate(raw) {
    if (mode !== 'playing' || quality === 'low' || document.hidden || raw > .5) { slowFrames = slowTime = 0; return; }
    slowFrames++; slowTime += raw;
    if (slowTime < 4) return;
    const fps = slowFrames / slowTime; slowFrames = slowTime = 0;
    if (fps >= 35 || elapsed - lastAutoQuality < 8) return;
    lastAutoQuality = elapsed; quality = quality === 'high' ? 'medium' : 'low'; $('quality').value = quality; saveSettings(); applyQuality();
    notify(`GRAFIK AUTOMATISCH AUF ${quality === 'medium' ? 'MITTEL' : 'NIEDRIG'} GESENKT\nDie Bildrate war zu niedrig (${Math.round(fps)} Bilder pro Sekunde).`, 4);
  }
  function frame(now) {
    requestAnimationFrame(frame); const raw = (now - previous) / 1000, dt = Math.min(raw, .08); previous = now; elapsed += dt;
    if (autoQuality) watchFrameRate(raw);
    if (showFps) { fpsFrames++; fpsTime += raw; if (fpsTime >= .5) { $('fps').textContent = `${Math.round(fpsFrames / fpsTime)} FPS · ${quality === 'high' ? 'HOCH' : quality === 'medium' ? 'MITTEL' : 'NIEDRIG'}`; fpsFrames = fpsTime = 0; } }
    const running = mode === 'playing' || (net && mode === 'paused');
    if (running) { accumulator += dt; while (accumulator >= 1 / 60 && (mode === 'playing' || (net && mode === 'paused'))) { step(1 / 60); accumulator -= 1 / 60; } updateCamera(dt); hudTime += dt; if (hudTime > .06) { updateHud(); hudTime = 0; } }
    else { accumulator = 0; if (mode === 'menu') updateCamera(dt); }
    renderer.render(scene, camera);
  }
  reset(); applyQuality(); updateCamera(1, true); updateHud();
  $('trainingButton').disabled = false; refreshStart();
  // Debug/test helper: advances the fixed simulation step without depending on requestAnimationFrame.
  // The camera follows every step as it does at 60 fps, so aiming uses the current view.
  function sim(seconds) { for (let i = 0; i < Math.round(seconds * 60) && mode === 'playing'; i++) { step(1 / 60); updateCamera(1 / 60); } updateCamera(1, true); updateHud(); return window.ironHorizon.getState(); }
  // Balance tournament: all six tanks are bots (the player's tank on autopilot); no rendering, no career booking.
  // vehicles = [player, blue bot 1, blue bot 2, red bot 1, red bot 2, red bot 3].
  // allies/player: optional separate levels for the blue bots and the autopilot player (e.g. a beginner as 'recruit').
  function balance({ vehicles = ['luchs', 'luchs', 'keiler', 'luchs', 'keiler', 'luchs'], map = 'border', level: botLevel = 'veteran', seed: runSeed = 1, mission: runMission = 'domination', allies = null, player: playerLevel = null } = {}) {
    if (mode !== 'menu') return null;
    const saved = { selectedMap, selectedVehicle, difficulty, gameType, mission };
    seed = runSeed >>> 0 || 1; selectedMap = map; difficulty = botLevel; gameType = 'battle'; selectedVehicle = vehicles[0]; mission = runMission;
    targets.forEach((target, i) => applyProfile(target, vehicles[i + 1]));
    autopilot = true; skillOverride = { blue: allies, red: null, player: playerLevel }; reset();
    Object.assign(player, freshTactics(player), { number: 3, holdIndex: 2, path: [], navigationTimer: 0, thinkTimer: 0, enemy: null, stuck: 0, reaction: 1, reload: 1, turretYaw: 0 });
    mode = 'playing';
    let elapsedMatch = 0;
    for (let i = 0; i < 1000 * 60 && mode === 'playing'; i++) { step(1 / 60); elapsedMatch += 1 / 60; }
    const out = { result: match.result, tickets: { ...match.tickets }, seconds: Math.round(elapsedMatch), captured: match.captured ?? null, kills: killLog.map(k => [...k]) };
    autopilot = false; skillOverride = null; ({ selectedMap, selectedVehicle, difficulty, gameType, mission } = saved);
    targets.forEach((target, i) => applyProfile(target, i === 1 || i === 3 ? 'keiler' : 'luchs'));
    mode = 'menu'; garage();
    return out;
  }
  // Test hook: feeds synthetic frame times into the automatic graphics check.
  function sampleFrames(fps, seconds) { for (let i = 0; i < Math.round(fps * seconds); i++) { elapsed += 1 / fps; watchFrameRate(1 / fps); } return quality; }
  window.ironHorizon = Object.freeze({ sim, balance, sampleFrames, getState: () => ({
    mode, gameType, touchMode, quality, online: net ? { host: net.host, slot: net.slot, team: player.team } : null, team: player.team, difficulty: matchDifficulty.id, mission: matchMission, skills: { blue: teamSkill.blue.id, red: teamSkill.red.id }, dachsLocked: dachsLocked(), gun: (() => { const at = tank.gun.getWorldPosition(new T.Vector3()); let shown = true; for (let node = tank.gun; node; node = node.parent) shown = shown && node.visible; return { x: at.x, y: at.y, z: at.z, pitch: tank.gun.rotation.x, shown, scale: tank.gun.scale.toArray(), children: tank.gun.children.length }; })(), ground: ground(tank.root.position.x, tank.root.position.z), tilt: { pitch: tank.root.rotation.x, roll: tank.root.rotation.z }, awards: [...careerStore.state.awards], invertY, events: events.map(e => ({ ...e })), map: level.id, capture: { ...level.capture }, renderedGeometries: renderer.info.memory.geometries, pointerLocked: document.pointerLockElement === $('world'), vehicle: player.profile.id,
    position: { x: tank.root.position.x, z: tank.root.position.z }, speed: velocity, hullYaw, turretYaw, viewYaw, reload, hitCount,
    hp: player.hp, alive: player.alive, respawn: player.respawn, systems: { ...player.systems }, smokeClouds: smokeClouds.length, ownSmoke: smokeClouds.filter(cloud => cloud.owner === player).length, shells: shells.length, shellOwners: shells.map(shell => shell.owner.slot),
    career: { xp: careerStore.state.xp, matches: careerStore.state.matches, rank: Career.rank(careerStore.state.xp).current.name, paint: careerStore.state.paints[player.profile.id], warning: careerStore.warning },
    match: { mode: match.mode || 'domination', stage: match.stage ?? 0, attacker: match.attacker ?? null, captured: match.captured ?? 0, time: match.time, tickets: { ...match.tickets }, owner: match.owner, contested: match.contested, progress: match.progress, result: match.result }, stats: { ...stats },
    targets: targets.map(t => ({ slot: t.slot, remote: t.remote, callsign: t.callsign, x: t.root.position.x, z: t.root.position.z, hits: t.hits, hp: t.hp, alive: t.alive, team: t.team, vehicle: t.profile.id, systems: { ...t.systems }, visible: t.visibleToPlayer, pathLength: t.path.length, kind: t.goalKind })), renderedFrames: renderer.info.render.frame
  }) });
  requestAnimationFrame(frame);
})();
