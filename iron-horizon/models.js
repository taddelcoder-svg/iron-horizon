/* Procedural tank models: every shape is built from primitives and merged into a handful of meshes per tank
   (vertex colours carry the detail, the hull material carries the camouflage). No assets, no dependencies.
   The collision meshes are still the visible meshes, so the proportions (see LOOKS in game.js) stay the same. */
window.IronModels = (() => {
  'use strict';
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  // Small deterministic generator for textures (never touches the game's own random stream).
  function rng(seed) { let s = seed >>> 0 || 1; return () => { s = (1664525 * s + 1013904223) >>> 0; return s / 4294967296; }; }

  /* ---------- Geometry kit: collect primitives, merge them into one BufferGeometry ---------- */
  class Kit {
    constructor(T) { this.T = T; this.items = []; this.q = new T.Quaternion(); this.e = new T.Euler(); this.s = new T.Vector3(); this.p = new T.Vector3(); }
    matrix(x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = 1, sz = 1) {
      this.e.set(rx, ry, rz); this.q.setFromEuler(this.e);
      return new this.T.Matrix4().compose(this.p.set(x, y, z), this.q, this.s.set(sx, sy, sz));
    }
    // Optional base transform applied to everything added after setBase() (null to clear).
    setBase(matrix) { this.base = matrix; return this; }
    add(geometry, matrix, color) { this.items.push({ g: geometry, m: this.base ? this.base.clone().multiply(matrix) : matrix, c: color }); return this; }
    box(w, h, d, x, y, z, color, rx, ry, rz) { return this.add(new this.T.BoxGeometry(w, h, d), this.matrix(x, y, z, rx, ry, rz), color); }
    // Cylinder along the Y axis (ax 'y'), the X axis ('x') or the Z axis ('z').
    cyl(rt, rb, h, x, y, z, color, sides = 10, ax = 'y', open = false) {
      const m = ax === 'x' ? this.matrix(x, y, z, 0, 0, Math.PI / 2) : ax === 'z' ? this.matrix(x, y, z, Math.PI / 2, 0, 0) : this.matrix(x, y, z);
      return this.add(new this.T.CylinderGeometry(rt, rb, h, sides, 1, open), m, color);
    }
    sph(r, x, y, z, color, sx = 1, sy = 1, sz = 1, w = 8, h = 6) { return this.add(new this.T.SphereGeometry(r, w, h), this.matrix(x, y, z, 0, 0, 0, sx, sy, sz), color); }
    tor(R, r, x, y, z, color, rx = 0, ry = 0, rz = 0) { return this.add(new this.T.TorusGeometry(R, r, 5, 12), this.matrix(x, y, z, rx, ry, rz), color); }
    // Side profile [z, y] extruded across x (width w, centred on x).
    prismZY(points, w, x, color) {
      const shape = new this.T.Shape(points.map(([z, y]) => new this.T.Vector2(-z, y)));
      const g = new this.T.ExtrudeGeometry(shape, { depth: w, bevelEnabled: false, curveSegments: 1 });
      return this.add(g, new this.T.Matrix4().makeTranslation(x - w / 2, 0, 0).multiply(new this.T.Matrix4().makeRotationY(Math.PI / 2)), color);
    }
    // Plan outline [x, z] extruded upwards from y0 by h.
    prismXZ(points, h, y0, color) {
      const shape = new this.T.Shape(points.map(([x, z]) => new this.T.Vector2(x, -z)));
      const g = new this.T.ExtrudeGeometry(shape, { depth: h, bevelEnabled: false, curveSegments: 1 });
      return this.add(g, new this.T.Matrix4().makeTranslation(0, y0, 0).multiply(new this.T.Matrix4().makeRotationX(-Math.PI / 2)), color);
    }
    // Merge everything into one geometry. opts.ao darkens the lower vertices; opts.uv adds box-projected UVs (metres / opts.uv).
    build(opts = {}) {
      const T = this.T, pos = [], nor = [], col = [], uv = [], v = new T.Vector3(), n = new T.Vector3(), nm = new T.Matrix3(), c = new T.Color();
      for (const it of this.items) {
        const g = it.g.index ? it.g.toNonIndexed() : it.g, p = g.attributes.position, nn = g.attributes.normal;
        nm.getNormalMatrix(it.m); c.set(it.c).convertSRGBToLinear();
        for (let i = 0; i < p.count; i++) {
          v.fromBufferAttribute(p, i).applyMatrix4(it.m); n.fromBufferAttribute(nn, i).applyMatrix3(nm).normalize();
          pos.push(v.x, v.y, v.z); nor.push(n.x, n.y, n.z);
          let s = 1;
          if (opts.ao) s = opts.ao.min + (1 - opts.ao.min) * smooth(opts.ao.y0, opts.ao.y1, v.y);
          col.push(c.r * s, c.g * s, c.b * s);
          if (opts.uv) {
            const ax = Math.abs(n.x), ay = Math.abs(n.y), az = Math.abs(n.z), k = 1 / opts.uv;
            if (ay >= ax && ay >= az) uv.push(v.x * k, v.z * k); else if (ax >= az) uv.push(v.z * k, v.y * k); else uv.push(v.x * k, v.y * k);
          }
        }
        if (g !== it.g) g.dispose();
        it.g.dispose();
      }
      const geometry = new T.BufferGeometry();
      geometry.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); geometry.setAttribute('normal', new T.Float32BufferAttribute(nor, 3));
      geometry.setAttribute('color', new T.Float32BufferAttribute(col, 3)); if (opts.uv) geometry.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geometry.computeBoundingSphere(); geometry.computeBoundingBox();
      this.items.length = 0; return geometry;
    }
  }

  /* ---------- Textures: wear for every hull, one camouflage pattern per paint ---------- */
  const textureCache = new Map();
  function canvas(size) { const c = document.createElement('canvas'); c.width = c.height = size; return c; }
  function finish(T, c) { const t = new T.CanvasTexture(c); t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.anisotropy = 4; return t; }
  // Light grey grain with rain streaks and chipped edges; multiplied with the hull colour.
  function wearOverlay(ctx, size, random, strength = 1) {
    for (let i = 0; i < 1800; i++) { ctx.fillStyle = `rgba(${random() < .5 ? '20,16,10' : '255,250,235'},${(.035 + random() * .06) * strength})`; ctx.fillRect(random() * size, random() * size, 1 + random() * 3, 1 + random() * 3); }
    for (let i = 0; i < 46; i++) { const x = random() * size, y = random() * size, l = 20 + random() * 70; const g = ctx.createLinearGradient(0, y, 0, y + l); g.addColorStop(0, `rgba(30,24,14,${.16 * strength})`); g.addColorStop(1, 'rgba(30,24,14,0)'); ctx.fillStyle = g; ctx.fillRect(x, y, 1 + random() * 2, l); }
    for (let i = 0; i < 90; i++) { ctx.fillStyle = `rgba(190,180,160,${.16 * strength})`; ctx.fillRect(random() * size, random() * size, 1 + random() * 2, 1); }
  }
  function wearTexture(T) {
    if (textureCache.has('wear')) return textureCache.get('wear');
    const size = 256, c = canvas(size), ctx = c.getContext('2d'), random = rng(77);
    ctx.fillStyle = '#f2f2ee'; ctx.fillRect(0, 0, size, size); wearOverlay(ctx, size, random);
    const t = finish(T, c); textureCache.set('wear', t); return t;
  }
  function blob(ctx, x, y, r, random) {
    ctx.beginPath(); const n = 9, pts = [];
    for (let i = 0; i < n; i++) { const a = i / n * Math.PI * 2, rr = r * (.55 + random() * .65) * (i % 2 ? 1.15 : .85); pts.push([x + Math.cos(a) * rr * 1.35, y + Math.sin(a) * rr * .85]); }
    ctx.moveTo((pts[0][0] + pts[n - 1][0]) / 2, (pts[0][1] + pts[n - 1][1]) / 2);
    for (let i = 0; i < n; i++) { const a = pts[i], b = pts[(i + 1) % n]; ctx.quadraticCurveTo(a[0], a[1], (a[0] + b[0]) / 2, (a[1] + b[1]) / 2); }
    ctx.closePath(); ctx.fill();
  }
  // One tiling pattern per paint; the hull geometry is box-projected in metres, so a tile covers about 6 m.
  function paintTexture(T, paint) {
    const key = 'paint:' + paint.id; if (textureCache.has(key)) return textureCache.get(key);
    const size = 512, c = canvas(size), ctx = c.getContext('2d'), random = rng(731 + paint.id.length * 17), col = paint.colors;
    ctx.fillStyle = col[0]; ctx.fillRect(0, 0, size, size);
    const wrap = fn => { for (const dx of [-size, 0, size]) for (const dy of [-size, 0, size]) { ctx.save(); ctx.translate(dx, dy); fn(); ctx.restore(); } };
    if (paint.id === 'city') {
      // Hard-edged pixel pattern in three greys.
      const cell = 32; for (let y = 0; y < size; y += cell) for (let x = 0; x < size; x += cell) { const r = random(); if (r < .6) continue; ctx.fillStyle = col[1 + (r > .85 ? 1 : 0)]; ctx.fillRect(x, y, cell * (random() < .3 ? 2 : 1), cell); }
    } else if (paint.id === 'lions') {
      // Navy with sweeping gold bands and cream chevrons.
      ctx.fillStyle = col[1]; for (let i = -2; i < 6; i++) { ctx.beginPath(); ctx.moveTo(i * 120, 0); ctx.lineTo(i * 120 + 60, 0); ctx.lineTo(i * 120 + 210, size); ctx.lineTo(i * 120 + 150, size); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = col[2]; for (let i = 0; i < 4; i++) { const y = 70 + i * 128; ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(size / 2, y + 36); ctx.lineTo(size, y); ctx.lineTo(size, y + 14); ctx.lineTo(size / 2, y + 50); ctx.lineTo(0, y + 14); ctx.closePath(); ctx.fill(); }
    } else if (paint.id === 'winter') {
      // Whitewash roughly brushed over a dark base, streaks running down.
      for (let i = 0; i < 26; i++) { ctx.fillStyle = col[1 + i % (col.length - 1)]; wrap(() => blob(ctx, random() * size, random() * size, 40 + random() * 55, random)); }
      ctx.fillStyle = col[0]; for (let i = 0; i < 90; i++) { const x = random() * size, y = random() * size, l = 40 + random() * 120; wrap(() => ctx.fillRect(x, y, 3 + random() * 9, l)); }
    } else if (paint.id === 'sand') {
      // Two-tone sand with wavy bands.
      ctx.fillStyle = col[1]; for (let i = 0; i < 6; i++) { const y = i * 90 + random() * 30; ctx.beginPath(); ctx.moveTo(0, y); for (let x = 0; x <= size; x += 32) ctx.lineTo(x, y + Math.sin(x / 64 + i) * 18 + random() * 8); for (let x = size; x >= 0; x -= 32) ctx.lineTo(x, y + 36 + Math.sin(x / 50 + i * 2) * 14); ctx.closePath(); ctx.fill(); }
    } else {
      // Woodland: soft three-colour blotches.
      for (let i = 0; i < 34; i++) { ctx.fillStyle = col[1 + i % Math.max(1, col.length - 1)]; wrap(() => blob(ctx, random() * size, random() * size, 36 + random() * 60, random)); }
    }
    wearOverlay(ctx, size, random, 1.25);
    const t = finish(T, c); textureCache.set(key, t); return t;
  }

  /* ---------- Shared materials and per-variant geometry caches ---------- */
  function createModels(T) {
    const detailMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .86, metalness: .18 });
    const glowMaterial = new T.MeshBasicMaterial({ vertexColors: true });
    const ribMaterial = new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: .05 });
    const geo = {};
    const HULL_AO = { y0: .55, y1: 1.7, min: .6 };

    // Wheels: axis along x, so a rotation about x spins them.
    function wheelGeometry(kind) {
      const key = 'wheel' + kind; if (geo[key]) return geo[key];
      const K = new Kit(T), tire = '#23262a', rim = '#686d52', bolt = '#a3a58c';
      if (kind === 'road') {
        for (const sx of [-.1, .1]) { K.cyl(.41, .41, .15, sx, 0, 0, tire, 14, 'x'); K.cyl(.29, .29, .17, sx, 0, 0, rim, 12, 'x'); }
        K.cyl(.14, .14, .34, 0, 0, 0, '#8d8f74', 8, 'x');
        for (let i = 0; i < 6; i++) { const a = i / 6 * Math.PI * 2; for (const sx of [-.2, .2]) K.box(.05, .06, .06, sx, Math.cos(a) * .2, Math.sin(a) * .2, bolt); }
      } else if (kind === 'sprocket') {
        K.cyl(.36, .36, .26, 0, 0, 0, '#5a5e48', 12, 'x'); K.cyl(.15, .15, .34, 0, 0, 0, '#8d8f74', 8, 'x');
        for (let i = 0; i < 10; i++) { const a = i / 10 * Math.PI * 2; K.box(.26, .16, .12, 0, Math.cos(a) * .44, Math.sin(a) * .44, '#2f332c', a, 0, 0); }
      } else {
        K.cyl(.4, .4, .22, 0, 0, 0, tire, 14, 'x'); K.cyl(.28, .28, .26, 0, 0, 0, rim, 12, 'x'); K.cyl(.12, .12, .34, 0, 0, 0, '#8d8f74', 8, 'x');
        K.box(.1, .06, .56, .14, 0, 0, '#3b3f33');
      }
      return geo[key] = K.build({});
    }
    function stadium(zf, zr, yc, R) {
      const pts = [];
      for (let k = 0; k <= 6; k++) { const a = Math.PI / 2 + k * Math.PI / 6; pts.push([zf + Math.cos(a) * R, yc + Math.sin(a) * R]); }
      for (let k = 0; k <= 6; k++) { const a = -Math.PI / 2 + k * Math.PI / 6; pts.push([zr + Math.cos(a) * R, yc + Math.sin(a) * R]); }
      return pts;
    }
    function ribGeometry(upper) {
      const key = 'rib' + upper; if (geo[key]) return geo[key];
      const K = new Kit(T), y = upper ? 1.235 : .22;
      for (let j = -6; j <= 6; j++) K.box(.07, .17, .13, 0, y, j * .385, '#171a16');
      return geo[key] = K.build({});
    }

    // Everything that every vehicle shares: hull, tracks, fenders, stowage, lamps.
    function hullGeometry() {
      if (geo.hull) return geo.hull;
      const H = new Kit(T), D = new Kit(T), G = new Kit(T);
      // Hull shell with sloped glacis.
      H.prismZY([[2.55, .74], [2.55, 1.46], [2.25, 1.62], [-.85, 1.62], [-2.4, 1.22], [-2.63, .96], [-2.3, .74]], 3.1, 0, '#ffffff');
      H.box(2.6, .1, 1.9, 0, 1.68, 1.45, '#f0f0ea');
      H.box(.62, .26, .42, -.62, 1.56, -1.45, '#ffffff', 0, 0, 0);       // driver's visor block
      H.box(1.3, .08, .5, .55, 1.6, -1.1, '#e8e8e2', -.05);              // front hull roof plate
      for (const side of [-1, 1]) {
        // Fenders with sloped mud guards.
        H.box(.95, .1, 4.75, side * 1.78, 1.5, .25, '#f6f6f0');
        H.box(.95, .1, .85, side * 1.78, 1.42, -2.55, '#f6f6f0', .32);
        H.box(.95, .1, .5, side * 1.78, 1.44, 2.78, '#eeeee8', -.25);
        H.box(.07, .2, 4.75, side * 2.22, 1.42, .25, '#e4e4de');
      }
      // Track housings with rounded ends.
      for (const side of [-1, 1]) {
        D.prismZY(stadium(-2.28, 2.28, .72, .58), .78, side * 1.78, '#2a2d27');
        D.box(.9, .06, 4.6, side * 1.78, 1.33, 0, '#33372f');
        for (let j = 0; j < 12; j++) D.box(.82, .05, .17, side * 1.78, 1.36, -2.1 + j * .38, '#3d4036');
      }
      // Engine deck: louvres, fans, hatches.
      for (let i = 0; i < 7; i++) D.box(1.7, .035, .08, 0, 1.74, 1.0 + i * .22, '#23261f');
      D.cyl(.34, .34, .05, -.8, 1.72, 2.0, '#2d3027', 12); D.cyl(.34, .34, .05, .8, 1.72, 2.0, '#2d3027', 12);
      for (const sx of [-.8, .8]) for (let i = 0; i < 4; i++) D.box(.62, .02, .03, sx, 1.76, 1.8 + i * .1, '#3d4036');
      // Driver hatch, visor slit, machine gun in the glacis.
      D.cyl(.26, .26, .08, -.62, 1.74, -1.45, '#6b7054', 10); D.box(.4, .05, .04, -.62, 1.62, -1.68, '#111');
      D.cyl(.1, .12, .16, .7, 1.43, -1.95, '#2b2e28', 8, 'z'); D.cyl(.035, .035, .55, .7, 1.43, -2.24, '#1d1f1b', 6, 'z');
      D.sph(.14, .7, 1.43, -1.85, '#555a49');
      // Tow hooks and cables.
      for (const sx of [-1.1, 1.1]) { D.box(.14, .12, .22, sx, .98, -2.7, '#33372f'); D.tor(.17, .03, sx, 1.1, -2.64, '#25271f', 0, 0, 0); }
      D.tor(.25, .035, 1.35, 1.55, 1.2, '#2a2b25', Math.PI / 2, 0, 0); D.tor(.19, .035, 1.35, 1.55, 1.2, '#2a2b25', Math.PI / 2, 0, 0);
      // Exhausts, stowage: toolbox, shovel, jerry cans, rolled tarp.
      for (const sx of [-1.05, 1.05]) { D.cyl(.1, .12, .5, sx, 1.78, 2.5, '#2a2b27', 8, 'z'); D.cyl(.075, .075, .06, sx, 1.78, 2.78, '#0b0b0a', 8, 'z'); }
      D.box(.8, .3, .9, 1.78, 1.68, 1.55, '#6f6244'); D.box(.84, .05, .94, 1.78, 1.85, 1.55, '#554a33');
      D.box(.07, .06, 1.5, -1.85, 1.6, -.2, '#3b3f33'); D.box(.32, .03, .42, -1.85, 1.6, -1.0, '#5b5e50');
      D.cyl(.19, .19, .8, -1.85, 1.68, 1.0, '#6e6a52', 10, 'x'); D.cyl(.19, .19, .8, -1.85, 1.68, 1.0, '#6e6a52', 10, 'z');
      for (const sx of [-.45, .45]) { D.box(.36, .5, .18, sx, 1.52, 2.64, '#59603f'); D.box(.1, .04, .08, sx, 1.8, 2.64, '#23251f'); D.box(.3, .04, .02, sx, 1.4, 2.74, '#3d4237'); }
      // Hull stripes (recognition marks) and hull number plate.
      D.box(.05, .34, .8, 1.58, 1.18, -.6, '#dbc990'); D.box(.05, .34, .8, -1.58, 1.18, -.6, '#dbc990');
      // Lamps with cages; taillights.
      for (const sx of [-1.2, 1.2]) { G.cyl(.1, .1, .08, sx, 1.4, -2.62, '#fff2c0', 8, 'z'); D.box(.26, .22, .05, sx, 1.4, -2.57, '#2a2d27'); G.box(.14, .08, .03, sx, 1.62, 2.82, '#d73a2a'); }
      // Rear plate and towing eyes.
      D.box(2.4, .5, .06, 0, 1.1, 2.6, '#33372f');
      return geo.hull = { hull: H.build({ ao: HULL_AO, uv: 6 }), detail: D.build({ ao: HULL_AO }), glow: G.build({}) };
    }

    // Turret shell shared by all turreted vehicles.
    function turretGeometry() {
      if (geo.turret) return geo.turret;
      const H = new Kit(T), D = new Kit(T);
      const plan = [[-.72, -1.5], [.72, -1.5], [1.08, -.95], [1.4, -.1], [1.3, .7], [.85, 1.25], [0, 1.4], [-.85, 1.25], [-1.3, .7], [-1.4, -.1], [-1.08, -.95]];
      H.prismXZ(plan, .5, 0, '#f2f2ec');
      const upper = plan.map(([x, z]) => [x * .86, z * .9 - .02]);
      H.prismXZ(upper, .34, .5, '#ffffff');
      H.prismXZ(plan.map(([x, z]) => [x * .72, z * .8 - .04]), .08, .84, '#e8e8e2');
      // Mantlet: a rounded block around the gun, with its own cheeks.
      H.box(1.04, .62, .4, 0, .3, -1.42, '#ffffff'); H.cyl(.38, .38, 1.1, 0, .3, -1.5, '#f2f2ec', 12, 'x');
      // Commander cupola with vision slits, loader hatch, machine gun.
      D.cyl(.4, .43, .26, .52, .98, .15, '#6c7155', 12); D.cyl(.33, .33, .06, .52, 1.14, .15, '#4a4e3d', 12);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; D.box(.1, .07, .05, .52 + Math.sin(a) * .39, 1.04, .15 + Math.cos(a) * .39, '#101210', 0, a, 0); }
      D.cyl(.3, .3, .06, -.5, .95, .55, '#6c7155', 10); D.tor(.3, .03, -.5, .98, .55, '#3b3f33', Math.PI / 2);
      D.box(.12, .1, .5, -.5, 1.12, .3, '#26291f'); D.box(.1, .12, .1, -.5, 1.05, .56, '#26291f');
      // Rear stowage basket, antenna base and whip.
      D.box(1.5, .28, .08, 0, .34, 1.58, '#3b3f33'); D.box(.06, .28, .4, -.74, .34, 1.42, '#3b3f33'); D.box(.06, .28, .4, .74, .34, 1.42, '#3b3f33'); D.box(1.5, .05, .4, 0, .2, 1.4, '#34382f');
      D.cyl(.1, .13, .22, -.85, .96, .55, '#25271f', 8); D.cyl(.014, .028, 2.8, -.85, 2.3, .55, '#171916', 5);
      // Smoke dischargers on both cheeks.
      for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) D.cyl(.07, .07, .26, sx * 1.04, .52, -.7 + i * .16, '#2a2d27', 8, 'z');
      return geo.turret = { hull: H.build({ ao: { y0: -.05, y1: .7, min: .72 }, uv: 6 }), detail: D.build({ ao: { y0: -.05, y1: .7, min: .75 } }) };
    }
    // Tank destroyer superstructure (the Dachs): a one-piece casemate.
    function casemateGeometry() {
      if (geo.casemate) return geo.casemate;
      const H = new Kit(T), D = new Kit(T);
      H.prismZY([[1.5, 1.6], [1.45, 2.5], [.95, 2.64], [-1.35, 2.62], [-2.62, 2.12], [-2.92, 1.82], [-2.35, 1.6]], 2.9, 0, '#ffffff');
      for (const sx of [-1, 1]) { H.box(.16, .78, 3.2, sx * 1.55, 2.0, -.2, '#f0f0ea'); H.box(.2, .1, 3.2, sx * 1.55, 2.42, -.2, '#e4e4de'); }
      D.cyl(.46, .5, .3, .75, 2.74, .45, '#6c7155', 12); D.cyl(.38, .38, .06, .75, 2.92, .45, '#4a4e3d', 12);
      for (let i = 0; i < 8; i++) { const a = i / 8 * Math.PI * 2; D.box(.1, .07, .05, .75 + Math.sin(a) * .46, 2.84, .45 + Math.cos(a) * .46, '#101210', 0, a, 0); }
      D.cyl(.3, .3, .06, -.7, 2.68, .7, '#6c7155', 10); D.box(.9, .035, .06, 0, 2.66, 1.46, '#23261f'); D.box(.9, .035, .06, 0, 2.66, 1.0, '#23261f');
      D.cyl(.014, .028, 2.6, -1.1, 3.7, 1.2, '#171916', 5); D.cyl(.1, .13, .2, -1.1, 2.6, 1.2, '#25271f', 8);
      for (const sx of [-1.4, 1.4]) { D.box(.1, .5, .5, sx, 2.2, -1.2, '#4b4f3f'); D.box(.06, .06, 1.2, sx, 2.5, .5, '#33372f'); }
      // Front plate bolts.
      for (let i = 0; i < 5; i++) for (const sy of [0, 1]) D.cyl(.05, .05, .05, -1.0 + i * .5, 2.05 + sy * .22, -2.64 + sy * -.06 + .15, '#8d8f74', 6, 'z');
      return geo.casemate = { hull: H.build({ ao: { y0: 1.55, y1: 2.5, min: .72 }, uv: 6 }), detail: D.build({}) };
    }
    // The barrel: tapered tube, thermal sleeve, bore evacuator; its length matches the old 3.3 m shell origin.
    function barrelGeometry() {
      if (geo.barrel) return geo.barrel;
      const K = new Kit(T);
      K.cyl(.105, .135, 3.05, 0, 0, -1.45, '#4a5642', 12, 'z'); K.cyl(.08, .105, .5, 0, 0, -3.1, '#3d4838', 10, 'z');
      K.cyl(.17, .17, .26, 0, 0, -.12, '#3b4636', 12, 'z'); K.cyl(.12, .12, .5, 0, 0, -.08, '#2f382b', 10, 'z');
      K.cyl(.158, .158, .06, 0, 0, -3.18, '#1d231c', 10, 'z');
      return geo.barrel = K.build({});
    }

    // Per-vehicle character: armour, stowage, sensors and muzzle brakes. Each returns {hull, turret, gun} kits (hull = hull colour).
    const variantBuilders = {
      luchs() {
        const D = new Kit(T), TU = new Kit(T), TH = new Kit(T), G = new Kit(T);
        // Light recon vehicle: bare, rolled camouflage net, spare fuel and a second tall antenna.
        D.cyl(.2, .2, 1.1, 1.78, 1.9, 0.4, '#6d6a52', 10, 'z'); D.cyl(.2, .2, .8, -1.2, 1.78, 2.35, '#6e6a52', 10, 'x');
        D.box(.4, .5, .22, .7, 1.8, 2.66, '#59603f'); D.box(.4, .5, .22, 1.1, 1.8, 2.66, '#59603f');
        TU.cyl(.014, .028, 3.4, .9, 2.55, .75, '#171916', 5); TU.cyl(.1, .12, .2, .9, .96, .75, '#25271f', 8);
        TH.box(1.1, .42, .5, 0, .6, 1.2, '#f0f0ea');   // rear stowage bin
        G.cyl(.02, .02, .3, 0, 0, 0, '#222', 4);
        return { hull: null, detail: D, turret: TU, turretArmor: TH, gun: G };
      },
      keiler() {
        const HU = new Kit(T), D = new Kit(T), TU = new Kit(T), TH = new Kit(T), G = new Kit(T);
        // Medium tank: bolt-on side skirts, heavy cheek armour and a double-baffle muzzle brake.
        for (const sx of [-1, 1]) for (let i = 0; i < 6; i++) { HU.box(.06, .72, .74, sx * 2.5, .98, -2.1 + i * .84, '#f2f2ec', 0, 0, sx * -.04); D.box(.07, .06, .06, sx * 2.54, 1.32, -2.1 + i * .84, '#8d8f74'); }
        for (const sx of [-1, 1]) { TH.box(.34, .55, 1.0, sx * 1.1, .28, -.9, '#ffffff', 0, sx * .5, 0); TH.box(.3, .52, .9, sx * 1.34, .26, -.05, '#f4f4ee', 0, sx * .12, 0); }
        TH.box(1.7, .5, .72, 0, .52, 1.46, '#f6f6f0'); TU.box(1.4, .06, .5, 0, .8, 1.5, '#2a2d27');
        TU.box(.5, .16, .34, -.55, .88, -.4, '#33372f'); TU.box(.18, .14, .1, -.55, .9, -.62, '#111');   // sight
        TU.box(.14, .14, .5, .95, .88, -.5, '#2b2e28');
        G.cyl(.2, .2, .34, 0, 0, -3.1, '#2a3127', 10, 'z'); for (const z of [-3.0, -3.14, -3.28]) G.cyl(.23, .23, .05, 0, 0, z, '#161a15', 10, 'z');
        G.cyl(.18, .18, .6, 0, 0, -.9, '#38422f', 10, 'z');
        return { hull: HU, detail: D, turret: TU, turretArmor: TH, gun: G };
      },
      wiesel() {
        const D = new Kit(T), TU = new Kit(T), TH = new Kit(T), G = new Kit(T);
        // Scout: sensor mast with radar dish, whip array, spare wheel and a roof light bar.
        TU.cyl(.05, .05, 1.6, .15, 1.5, .5, '#25271f', 6); TU.cyl(.5, .45, .06, .15, 2.35, .5, '#8e9172', 14, 'x'); TU.sph(.09, .15, 2.35, .5, '#d9c27a');
        TU.cyl(.014, .028, 3.2, -.9, 2.4, .75, '#171916', 5); TU.cyl(.014, .028, 2.6, -.7, 2.1, .85, '#171916', 5);
        TU.box(.9, .09, .12, 0, .88, -.7, '#25271f');
        D.cyl(.45, .45, .2, 0, 1.5, 2.72, '#23262a', 14, 'z'); D.cyl(.28, .28, .22, 0, 1.5, 2.72, '#686d52', 12, 'z');
        D.box(.9, .1, .1, 0, 1.2, -2.7, '#2a2d27'); D.box(.1, .26, .08, -.8, 1.5, -2.7, '#2a2d27'); D.box(.1, .26, .08, .8, 1.5, -2.7, '#2a2d27');
        D.cyl(.08, .08, .08, 0, 1.78, -.3, '#e7d88c', 8);
        TH.box(.8, .3, .5, 0, .4, 1.1, '#f6f6f0');
        // Autocannon: perforated sleeve and slim muzzle.
        G.cyl(.14, .14, 1.0, 0, 0, -1.6, '#39432f', 10, 'z'); for (let i = 0; i < 5; i++) G.cyl(.16, .16, .05, 0, 0, -1.2 - i * .2, '#1b211a', 10, 'z');
        G.cyl(.09, .09, .26, 0, 0, -3.15, '#1f241e', 8, 'z');
        return { hull: null, detail: D, turret: TU, turretArmor: TH, gun: G };
      },
      dachs() {
        const HU = new Kit(T), D = new Kit(T), TU = new Kit(T), TH = new Kit(T), G = new Kit(T);
        // Tank destroyer: heavy mantlet, huge double-chamber muzzle brake, camouflage net on the roof, thin skirts.
        for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) HU.box(.05, .6, .9, sx * 2.46, 1.0, -1.9 + i * 1.0, '#f2f2ec', 0, 0, sx * -.05);
        TH.sph(.52, 0, .28, -1.5, '#ffffff', 1.1, .95, .7); TH.box(1.15, .62, .3, 0, .28, -1.35, '#f4f4ee');
        for (let i = 0; i < 9; i++) D.box(.55 + (i % 3) * .2, .05, .7, -.85 + (i % 3) * .85, 2.7 + (i % 2) * .02, -.2 + Math.floor(i / 3) * .5, i % 2 ? '#454d36' : '#5b5f42', 0, i * .5, 0);
        D.box(.9, .1, .5, 1.1, 1.65, 1.6, '#4b4f3f');
        G.cyl(.23, .23, .5, 0, 0, -3.02, '#2b3227', 12, 'z'); for (const z of [-2.86, -3.04, -3.22]) G.cyl(.27, .27, .1, 0, 0, z, '#191d17', 12, 'z');
        G.cyl(.2, .2, .7, 0, 0, -1.1, '#39422f', 12, 'z');
        return { hull: HU, detail: D, turret: TU, turretArmor: TH, gun: G };
      },
      baer() {
        const HU = new Kit(T), D = new Kit(T), TU = new Kit(T), TH = new Kit(T), G = new Kit(T);
        // Heavy tank: thick skirts, bolted-on front armour, wedge cheeks, two searchlights and a massive brake.
        for (const sx of [-1, 1]) for (let i = 0; i < 5; i++) { HU.box(.12, .82, .98, sx * 2.55, .96, -2.0 + i * 1.0, '#f2f2ec'); D.box(.14, .08, .08, sx * 2.62, 1.3, -2.0 + i * 1.0, '#8d8f74'); D.box(.14, .08, .08, sx * 2.62, .64, -2.0 + i * 1.0, '#8d8f74'); }
        HU.box(2.6, .5, .26, 0, 1.2, -2.7, '#ffffff', -.38); HU.box(.7, .4, .3, -.9, 1.5, -2.2, '#f0f0ea', -.35); HU.box(.7, .4, .3, .9, 1.5, -2.2, '#f0f0ea', -.35);
        for (const sx of [-1, 1]) for (let i = 0; i < 3; i++) D.cyl(.06, .06, .06, sx * 1.0 + i * .0, 1.22 + i * .09, -2.88 - i * .09 + 0.1, '#8d8f74', 6, 'x');
        for (const sx of [-1.45, 1.45]) { D.cyl(.12, .12, .22, sx, 1.78, -1.2, '#2a2d27', 8); D.cyl(.1, .1, .04, sx, 1.78, -1.32, '#fff2c0', 8, 'z'); }
        for (const sx of [-1, 1]) { TH.box(.5, .7, 1.2, sx * 1.1, .3, -.9, '#ffffff', 0, sx * .55, 0); TH.box(.36, .6, 1.0, sx * 1.4, .28, -.05, '#f6f6f0'); }
        TH.box(2.0, .62, .9, 0, .56, 1.5, '#f6f6f0'); TH.box(1.2, .22, .6, 0, .98, 1.5, '#ececE6');
        TU.cyl(.34, .38, .18, -.5, .98, .55, '#6c7155', 10); TU.box(.5, .08, .6, 0, .95, 1.5, '#2a2d27');
        TU.box(.46, .2, .3, -.62, .9, -.45, '#33372f'); TU.box(.2, .06, .26, .7, .88, -.5, '#8e9172');
        for (const sx of [-1, 1]) for (let i = 0; i < 4; i++) TU.cyl(.08, .08, .3, sx * 1.1, .55, -.3 + i * .18, '#2a2d27', 8, 'z');
        G.cyl(.3, .3, .6, 0, 0, -2.98, '#2b3227', 12, 'z'); for (const z of [-2.76, -2.94, -3.12, -3.3]) G.cyl(.34, .34, .09, 0, 0, z, '#181c16', 12, 'z');
        G.cyl(.22, .22, .9, 0, 0, -1.0, '#39422f', 12, 'z');
        return { hull: HU, detail: D, turret: TU, turretArmor: TH, gun: G };
      }
    };
    function variantGeometry(id) {
      const key = 'variant' + id; if (geo[key]) return geo[key];
      const v = variantBuilders[id](), build = (kit, opts) => kit && kit.items.length ? kit.build(opts) : null;
      return geo[key] = {
        hull: build(v.hull, { ao: HULL_AO, uv: 6 }), detail: build(v.detail, { ao: HULL_AO }),
        turret: build(v.turret, { ao: { y0: -.05, y1: .7, min: .75 } }), turretArmor: build(v.turretArmor, { ao: { y0: -.05, y1: .7, min: .72 }, uv: 6 }), gun: build(v.gun, {})
      };
    }

    // The loadout of one vehicle: hull, turret, gun and the visible parts of its type.
    function createTank(color) {
      const root = new T.Group(); root.rotation.order = 'YXZ';
      const hullMaterial = new T.MeshStandardMaterial({ vertexColors: true, color: new T.Color(color).convertSRGBToLinear(), map: wearTexture(T), roughness: .8, metalness: .1 });
      const hullMeshes = [], wheels = [];
      const mesh = (parent, geometry, material, { hull = false, shadow = true } = {}) => {
        const m = new T.Mesh(geometry, material); m.castShadow = shadow; m.receiveShadow = true; parent.add(m); if (hull) hullMeshes.push(m); return m;
      };
      const hg = hullGeometry();
      mesh(root, hg.hull, hullMaterial, { hull: true }); mesh(root, hg.detail, detailMaterial);
      const lamps = mesh(root, hg.glow, glowMaterial, { shadow: false }); lamps.userData.noHit = true;
      const ribs = [];
      for (const side of [-1, 1]) for (const upper of [true, false]) {
        const r = mesh(root, ribGeometry(upper), ribMaterial, { shadow: false }); r.position.x = side * 2.17 + side * .03; r.userData.noHit = true; r.userData.upper = upper; ribs.push(r);
      }
      for (const side of [-1, 1]) {
        for (let j = 0; j < 5; j++) { const w = mesh(root, wheelGeometry('road'), detailMaterial); w.position.set(side * 2.2, .72, -1.5 + j * .75); wheels.push(w); }
        const sp = mesh(root, wheelGeometry('sprocket'), detailMaterial); sp.position.set(side * 2.2, .72, -2.32); wheels.push(sp);
        const id = mesh(root, wheelGeometry('idler'), detailMaterial); id.position.set(side * 2.2, .72, 2.3); wheels.push(id);
      }
      const turret = new T.Group(); turret.position.y = 1.75; root.add(turret);
      const tg = turretGeometry(), turretCommon = new T.Group(); turret.add(turretCommon);
      mesh(turretCommon, tg.hull, hullMaterial, { hull: true }); mesh(turretCommon, tg.detail, detailMaterial);
      const cg = casemateGeometry(), casemateGroup = new T.Group(); root.add(casemateGroup);
      mesh(casemateGroup, cg.hull, hullMaterial, { hull: true }); mesh(casemateGroup, cg.detail, detailMaterial);
      const gun = new T.Group(); gun.position.set(0, .3, -1.25); turret.add(gun);
      mesh(gun, barrelGeometry(), detailMaterial);
      // Type-specific parts, one group set per vehicle, shown on demand.
      const looks = {};
      for (const id of Object.keys(variantBuilders)) {
        const vg = variantGeometry(id), set = { root: new T.Group(), turret: new T.Group(), gun: new T.Group() };
        root.add(set.root); turret.add(set.turret); gun.add(set.gun);
        if (vg.hull) mesh(set.root, vg.hull, hullMaterial, { hull: true });
        if (vg.detail) mesh(set.root, vg.detail, detailMaterial);
        if (vg.turretArmor) mesh(set.turret, vg.turretArmor, hullMaterial, { hull: true });
        if (vg.turret) mesh(set.turret, vg.turret, detailMaterial);
        if (vg.gun) mesh(set.gun, vg.gun, detailMaterial);
        for (const g of [set.root, set.turret, set.gun]) g.visible = false;
        looks[id] = set;
      }
      // Track animation: the ribs on the upper run travel with the tank, the lower ones against it.
      let phase = 0;
      const tank = {
        root, turret, gun, wheels, hullMeshes, gunBase: -1.25, hullMaterial,
        setLook(id, casemate) {
          turretCommon.visible = !casemate; casemateGroup.visible = !!casemate;
          for (const key of Object.keys(looks)) for (const g of [looks[key].root, looks[key].turret, looks[key].gun]) g.visible = key === id;
        },
        // Distance in metres driven along the hull (positive = forward).
        spin(distance) {
          for (const w of wheels) w.rotation.x -= distance / .42;
          phase = (phase + distance) % .385;
          for (const r of ribs) r.position.z = r.userData.upper ? -phase : phase;
        }
      };
      return tank;
    }
    return { createTank, detailMaterial, wearTexture: () => wearTexture(T), paintTexture: paint => paintTexture(T, paint) };
  }
  return { create: createModels, Kit, rng };
})();
