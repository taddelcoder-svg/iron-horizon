/* Owns only static map geometry. Switching maps disposes geometry, not shared materials.
   Maps with relief (level.heightAt) get a displaced, vertex-coloured ground mesh; structures sit on the slope.
   Everything is procedural: canvas textures for ground, plaster, tiles, stone and water, and merged vertex-coloured
   meshes for trees, bushes, rocks, houses and mountains (a handful of draw calls instead of hundreds).
   Collision-relevant objects (level.structures, tree trunks, rocks) keep their original footprints and solids. */
window.IronTerrain = {
  build(T, level, { mat, box, cyl }) {
    const Kit = IronModels.Kit;
    const group = new T.Group(), solids = [], obstacles = [], owned = [], fine = new T.Group();
    group.add(fine);
    const grass = new T.Group(); group.add(grass);   // grass tufts: high quality only
    const heightAt = level.heightAt || (() => 0);
    // The game's own stream: placement of trees, mountains and benches must stay exactly as before (obstacles depend on it).
    let seed = level.seed;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    // Decoration stream: purely visual extras draw from here.
    let dseed = (level.seed * 2654435761 + 12345) >>> 0;
    const deco = (a = 0, b = 1) => { dseed = (1664525 * dseed + 1013904223) >>> 0; return a + dseed / 4294967296 * (b - a); };
    const lerp = (a, b, t) => a + (b - a) * t;
    const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };
    const hash = (x, y) => { const s = Math.sin(x * 127.1 + y * 311.7 + level.seed * .137) * 43758.5453; return s - Math.floor(s); };
    const vnoise = (x, y) => { const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, u = xf * xf * (3 - 2 * xf), v = yf * yf * (3 - 2 * yf); return lerp(lerp(hash(xi, yi), hash(xi + 1, yi), u), lerp(hash(xi, yi + 1), hash(xi + 1, yi + 1), u), v); };
    const fbm = (x, y) => .55 * vnoise(x, y) + .3 * vnoise(x * 2.1, y * 2.1) + .15 * vnoise(x * 4.3, y * 4.3);
    const lin = hexColor => new T.Color(hexColor).convertSRGBToLinear();
    const quarry = level.theme === 'quarry', hills = !!level.heightAt;

    /* ---------- Textures (small canvases, tiled) ---------- */
    const canvas = (w, h = w) => { const c = document.createElement('canvas'); c.width = w; c.height = h; return c; };
    const texture = (c, rx = 1, ry = 1, srgb = true) => { const t = new T.CanvasTexture(c); if (srgb) t.encoding = T.sRGBEncoding; t.wrapS = t.wrapT = T.RepeatWrapping; t.repeat.set(rx, ry); t.anisotropy = 4; owned.push(t); return t; };
    let tseed = 4242; const tr = () => { tseed = (1664525 * tseed + 1013904223) >>> 0; return tseed / 4294967296; };
    function groundTexture() {
      const c = canvas(256), x = c.getContext('2d'); x.fillStyle = '#d9d8cf'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 26; i++) { const px = tr() * 256, py = tr() * 256, r = 14 + tr() * 30, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${tr() < .5 ? '60,55,35' : '255,255,235'},${.08 + tr() * .08})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
      for (let i = 0; i < 2600; i++) { x.fillStyle = `rgba(${tr() < .55 ? '40,45,20' : '255,255,225'},${.06 + tr() * .12})`; x.fillRect(tr() * 256, tr() * 256, 1 + tr() * 2, 1 + tr() * 2); }
      if (!quarry) for (let i = 0; i < 520; i++) { const px = tr() * 256, py = tr() * 256, l = 2 + tr() * 5; x.strokeStyle = `rgba(${tr() < .5 ? '40,60,25' : '255,255,200'},${.12 + tr() * .1})`; x.lineWidth = 1; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (tr() - .5) * 2, py - l); x.stroke(); }
      else for (let i = 0; i < 90; i++) { const px = tr() * 256, py = tr() * 256; x.strokeStyle = 'rgba(70,55,35,.2)'; x.beginPath(); x.moveTo(px, py); x.lineTo(px + (tr() - .5) * 24, py + (tr() - .5) * 24); x.stroke(); }
      return c;
    }
    function plasterTexture() {
      const c = canvas(256), x = c.getContext('2d'); x.fillStyle = '#ecebe2'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 40; i++) { const px = tr() * 256, py = tr() * 256, r = 20 + tr() * 40, g = x.createRadialGradient(px, py, 0, px, py, r); g.addColorStop(0, `rgba(${tr() < .5 ? '90,80,60' : '255,255,245'},${.06 + tr() * .07})`); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 256); }
      for (let i = 0; i < 1400; i++) { x.fillStyle = `rgba(60,50,35,${.03 + tr() * .06})`; x.fillRect(tr() * 256, tr() * 256, 1 + tr() * 2, 1 + tr() * 2); }
      for (let i = 0; i < 18; i++) { const px = tr() * 256, l = 30 + tr() * 90, g = x.createLinearGradient(0, 256 - l, 0, 256); g.addColorStop(0, 'rgba(70,60,40,0)'); g.addColorStop(1, 'rgba(70,60,40,.16)'); x.fillStyle = g; x.fillRect(px, 256 - l, 2 + tr() * 5, l); }
      x.fillStyle = 'rgba(70,62,45,.18)'; x.fillRect(0, 232, 256, 24);
      return c;
    }
    function tilesTexture() {
      const c = canvas(128), x = c.getContext('2d'); x.fillStyle = '#d5d2c8'; x.fillRect(0, 0, 128, 128);
      for (let row = 0; row < 8; row++) for (let col = -1; col < 9; col++) {
        const px = col * 16 + (row % 2) * 8, py = row * 16, v = 190 + tr() * 55; x.fillStyle = `rgb(${v},${v - 4},${v - 10})`; x.fillRect(px + 1, py + 1, 14, 14);
        x.fillStyle = 'rgba(0,0,0,.28)'; x.fillRect(px, py + 14, 16, 2); x.fillRect(px, py, 1, 16);
      }
      return c;
    }
    function stoneTexture() {
      const c = canvas(256), x = c.getContext('2d'); x.fillStyle = '#6f6a5e'; x.fillRect(0, 0, 256, 256);
      for (let row = 0; row < 8; row++) { let px = -tr() * 20; while (px < 256) { const w = 22 + tr() * 36, v = 168 + tr() * 70; x.fillStyle = `rgb(${v},${v - 6},${v - 18})`; x.fillRect(px + 1.5, row * 32 + 1.5, w - 3, 29); px += w; } }
      for (let i = 0; i < 1200; i++) { x.fillStyle = `rgba(30,25,15,${.05 + tr() * .08})`; x.fillRect(tr() * 256, tr() * 256, 1 + tr() * 2, 1 + tr() * 2); }
      return c;
    }
    function roadTexture() {
      const c = canvas(256), x = c.getContext('2d'); x.fillStyle = '#e0dbc8'; x.fillRect(0, 0, 256, 256);
      for (let i = 0; i < 3200; i++) { x.fillStyle = `rgba(${tr() < .5 ? '60,52,38' : '255,250,230'},${.08 + tr() * .16})`; x.fillRect(tr() * 256, tr() * 256, 1 + tr() * 2.4, 1 + tr() * 2); }
      for (let i = 0; i < 60; i++) { const px = tr() * 256, py = tr() * 256; x.fillStyle = 'rgba(90,80,60,.12)'; x.beginPath(); x.ellipse(px, py, 6 + tr() * 14, 2 + tr() * 3, tr() * 3, 0, 6.3); x.fill(); }
      return c;
    }
    function strataTexture() {
      const c = canvas(256), x = c.getContext('2d'); let y = 0;
      while (y < 256) { const h = 6 + tr() * 22, v = 175 + tr() * 70; x.fillStyle = `rgb(${v},${v - 8},${v - 24})`; x.fillRect(0, y, 256, h); x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, y + h - 1.5, 256, 1.5); y += h; }
      for (let i = 0; i < 1600; i++) { x.fillStyle = `rgba(40,30,20,${.05 + tr() * .08})`; x.fillRect(tr() * 256, tr() * 256, 1 + tr() * 3, 1 + tr() * 2); }
      for (let i = 0; i < 24; i++) { const px = tr() * 256; x.strokeStyle = 'rgba(40,30,20,.16)'; x.beginPath(); x.moveTo(px, 0); x.lineTo(px + (tr() - .5) * 20, 256); x.stroke(); }
      return c;
    }
    function metalTexture() {
      const c = canvas(64, 64), x = c.getContext('2d'); for (let i = 0; i < 16; i++) { const g = x.createLinearGradient(i * 4, 0, i * 4 + 4, 0); g.addColorStop(0, '#f2f2ee'); g.addColorStop(.5, '#d8d8d2'); g.addColorStop(1, '#9d9d98'); x.fillStyle = g; x.fillRect(i * 4, 0, 4, 64); }
      for (let i = 0; i < 20; i++) { x.fillStyle = 'rgba(90,60,30,.12)'; x.fillRect(tr() * 64, tr() * 64, 1 + tr() * 2, 8 + tr() * 30); }
      return c;
    }
    function tuftTexture() {
      const c = canvas(64), x = c.getContext('2d');
      for (let i = 0; i < 18; i++) { const bx = 8 + tr() * 48, h = 24 + tr() * 36, lean = (tr() - .5) * 18; x.strokeStyle = `rgb(${200 + tr() * 55},${215 + tr() * 40},${170 + tr() * 50})`; x.lineWidth = 1.6 + tr() * 1.4; x.beginPath(); x.moveTo(bx, 64); x.quadraticCurveTo(bx + lean * .3, 64 - h * .55, bx + lean, 64 - h); x.stroke(); }
      return c;
    }
    function waterTexture() {
      const c = canvas(128), x = c.getContext('2d'); x.fillStyle = '#ffffff'; x.fillRect(0, 0, 128, 128);
      for (let i = 0; i < 70; i++) { const px = tr() * 128, py = 14 + tr() * 100, l = 10 + tr() * 26; x.strokeStyle = `rgba(160,200,215,${.25 + tr() * .35})`; x.lineWidth = 1 + tr(); x.beginPath(); x.moveTo(px, py); x.quadraticCurveTo(px + l / 2, py + (tr() - .5) * 5, px + l, py); x.stroke(); }
      for (let i = 0; i < 8; i++) { x.strokeStyle = 'rgba(255,255,255,.55)'; x.beginPath(); const px = tr() * 128, py = 14 + tr() * 100; x.moveTo(px, py); x.lineTo(px + 8 + tr() * 14, py); x.stroke(); }
      // Soft shore: transparent towards both banks.
      const img = x.getImageData(0, 0, 128, 128), d = img.data;
      for (let yy = 0; yy < 128; yy++) { const edge = smooth(0, .22, Math.min(yy, 127 - yy) / 128); for (let xx = 0; xx < 128; xx++) d[(yy * 128 + xx) * 4 + 3] = Math.round(255 * edge * (.86 + (d[(yy * 128 + xx) * 4] / 255) * .14)); }
      x.putImageData(img, 0, 0); return c;
    }
    const groundTex = texture(groundTexture(), hills ? 75 : 75, hills ? 75 : 75), plasterTex = texture(plasterTexture()), tilesTex = texture(tilesTexture()), stoneTex = texture(stoneTexture()), roadTex = texture(roadTexture()), strataTex = texture(strataTexture()), tuftTex = texture(tuftTexture());
    const own = m => { owned.push(m); return m; };
    const vcMaterial = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: .93, metalness: 0 }));
    const flatVc = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0, flatShading: true }));
    const mapped = (map, color = '#ffffff', extra = {}) => own(new T.MeshStandardMaterial({ map, color: lin(color), roughness: .95, metalness: 0, ...extra }));

    const meshOf = (geometry, material, { cast = true, receive = true, parent = group } = {}) => { const m = new T.Mesh(geometry, material); m.castShadow = cast; m.receiveShadow = receive; parent.add(m); return m; };
    // Scale a box's UVs to metres so tiled textures keep their size on any wall.
    const boxUV = (g, w, h, d, tile) => {
      const uv = g.attributes.uv, dims = [[d, h], [d, h], [w, d], [w, d], [w, h], [w, h]];
      for (let f = 0; f < 6; f++) for (let k = 0; k < 4; k++) { const i = f * 4 + k; uv.setXY(i, uv.getX(i) * dims[f][0] / tile, uv.getY(i) * dims[f][1] / tile); }
      return g;
    };
    const texturedBox = (w, h, d, material, x, y, z, tile = 4, parent = group) => { const m = meshOf(boxUV(new T.BoxGeometry(w, h, d), w, h, d, tile), material, { parent }); m.position.set(x, y, z); return m; };

    /* ---------- Layout helpers ---------- */
    const onRoad = (x, z, margin = 0) => level.roads.some(([rx, rz, rw, rd]) => Math.abs(x - rx) < rw / 2 + margin && Math.abs(z - rz) < rd / 2 + margin);
    const nearStructure = (x, z, margin = 0) => level.structures.some(([, sx, sz, w, d]) => Math.abs(x - sx) < w / 2 + margin && Math.abs(z - sz) < d / 2 + margin);
    const points = [level.capture, level.breakthrough?.blue, level.breakthrough?.red].filter(Boolean);
    const nearPoint = (x, z, extra = 3) => points.some(p => Math.hypot(x - p.x, z - p.z) < p.radius + extra);

    /* ---------- Ground ---------- */
    const farMaterial = mapped(texture(groundTexture(), 450, 450), level.ground);
    const ground = new T.Mesh(new T.PlaneGeometry(1800, 1800), farMaterial); ground.rotation.x = -Math.PI / 2; ground.position.y = hills ? -.05 : -.04; ground.receiveShadow = true; group.add(ground);
    {
      const size = 300, segments = hills ? 150 : 100, geometry = new T.PlaneGeometry(size, size, segments, segments); geometry.rotateX(-Math.PI / 2);
      const position = geometry.attributes.position, colors = new Float32Array(position.count * 3), color = new T.Color();
      const grass = lin(level.ground), dry = lin(quarry ? '#bfae88' : '#9d9a62'), lush = lin(quarry ? '#9a8660' : '#516d3e'), sand = lin('#a89a76'), wet = lin('#5d6b5a');
      const rock = lin('#8c8a70'), road = lin(level.road), stone = lin('#aaa28c'), verge = lin(quarry ? '#a8946f' : '#8f8861'), dirt = lin(quarry ? '#8a7656' : '#74684a');
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i), h = heightAt(x, z); position.setY(i, h);
        color.copy(grass);
        // Large soft patches of dry and lush ground, plus fine speckle.
        const n1 = fbm(x / 34, z / 34), n2 = fbm(x / 13 + 40, z / 13), n3 = vnoise(x / 4.2, z / 4.2);
        color.lerp(dry, smooth(.5, .78, n1) * .75); color.lerp(lush, smooth(.5, .8, fbm(x / 26 + 90, z / 26)) * .6);
        if (quarry) color.lerp(dirt, smooth(.55, .8, n2) * .55);
        if (h < -.6) color.lerp(Math.abs(z + 10) < 10 && x > -40 ? wet : sand, Math.min(1, (-h - .6) / 1.6));
        if (h > 3) color.lerp(rock, Math.min(.8, (h - 3) / 4));
        if (hills) { for (const [rx, rz, rw, rd] of level.roads) if (Math.abs(x - rx) < rw / 2 && Math.abs(z - rz) < rd / 2) color.lerp(road, .85); if (Math.abs(x) < 7.5 && Math.abs(z + 10) < 9) color.copy(stone); }
        else for (const [rx, rz, rw, rd] of level.roads) { const dx = Math.max(Math.abs(x - rx) - rw / 2, 0), dz = Math.max(Math.abs(z - rz) - rd / 2, 0), dist = Math.hypot(dx, dz); if (dist < 5) color.lerp(verge, (1 - smooth(0, 5, dist)) * .75 * (.55 + n3 * .6)); }
        // Worn ground around buildings and walls.
        for (const [, sx, sz, w, d] of level.structures) { const dist = Math.hypot(Math.max(Math.abs(x - sx) - w / 2, 0), Math.max(Math.abs(z - sz) - d / 2, 0)); if (dist < 4) color.lerp(dirt, (1 - dist / 4) * .5); }
        const n = .9 + n3 * .2 + (hash(x, z) - .5) * .05;
        colors[i * 3] = color.r * n; colors[i * 3 + 1] = color.g * n; colors[i * 3 + 2] = color.b * n;
      }
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
      if (hills) {
        // Steep faces look like exposed rock and take a little shade.
        const normal = geometry.attributes.normal;
        for (let i = 0; i < position.count; i++) { const steep = smooth(.78, .5, normal.getY(i)); if (steep > 0) { const r = colors[i * 3], g = colors[i * 3 + 1], b = colors[i * 3 + 2]; colors[i * 3] = lerp(r, rock.r * .85, steep * .65); colors[i * 3 + 1] = lerp(g, rock.g * .85, steep * .65); colors[i * 3 + 2] = lerp(b, rock.b * .85, steep * .65); } }
      }
      const material = own(new T.MeshStandardMaterial({ vertexColors: true, map: groundTex, roughness: .97, metalness: 0 }));
      const relief = new T.Mesh(geometry, material); relief.position.y = hills ? 0 : -.012; relief.receiveShadow = true; group.add(relief);
    }
    let water = null, waterTexture_ = null;
    if (hills) {
      // Shallow creek with ripples; tanks ford through it.
      waterTexture_ = texture(waterTexture(), 24, 1); waterTexture_.wrapT = T.ClampToEdgeWrapping;
      water = new T.Mesh(new T.PlaneGeometry(190, 7), own(new T.MeshStandardMaterial({ map: waterTexture_, color: lin('#5f8c97'), roughness: .12, metalness: .05, transparent: true, opacity: .8, emissive: lin('#17323a'), emissiveIntensity: .6 })));
      water.rotation.x = -Math.PI / 2; water.position.set(55, -1.05, -10); water.receiveShadow = true; group.add(water);
      // Arch faces under the bridge deck.
      for (const side of [-1, 1]) texturedBox(15, .7, .6, mapped(stoneTex, '#a79f8a'), 0, -.55, -10 + side * 4.2, 4);
    } else {
      // Flat maps: road slabs over a worn verge, gravel texture sized in metres.
      const roadMaterial = mapped(roadTex, level.road), verge = mapped(roadTex, quarry ? '#a8946f' : '#9a9068');
      level.roads.forEach(([x, z, w, d], i) => {
        const slab = new T.BoxGeometry(w, .035, d); boxUV(slab, w, .035, d, 6); const mesh = meshOf(slab, roadMaterial, { cast: false }); mesh.position.set(x, .03 + i * .012, z);
        const edge = new T.BoxGeometry(w + (d > w ? 2.4 : 0), .03, d + (d > w ? 0 : 2.4)); boxUV(edge, w + 2, .03, d + 2, 6); const e = meshOf(edge, verge, { cast: false }); e.position.set(x, .012 + i * .012, z);
      });
    }

    /* ---------- Structures ---------- */
    // Lowest ground under a footprint, so buildings on a slope never float.
    const footprint = (x, z, w, d) => Math.min(heightAt(x, z), heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z + d / 2));
    const wallMaterial = mapped(plasterTex, level.wall), stoneMaterial = mapped(stoneTex, '#b8b09c'), rockMaterial = own(new T.MeshStandardMaterial({ vertexColors: true, roughness: .96, flatShading: true }));
    const roofMaterial = own(new T.MeshStandardMaterial({ map: tilesTex, color: lin(level.roof), vertexColors: true, roughness: .9 }));
    const decor = new Kit(T), roofs = [], metalMaterial = mapped(texture(metalTexture(), 10, 1), '#a9b0a0', { metalness: .25, roughness: .7 });
    // One window: frame, dark glass with cross bars, sill and two shutters, built in a local frame facing +z.
    const windowAt = (K, x, y, z, ry, w = 1.05, h = 1.5) => {
      K.setBase(new T.Matrix4().makeTranslation(x, y, z).multiply(new T.Matrix4().makeRotationY(ry)));
      K.box(w + .22, h + .22, .1, 0, 0, .04, '#d8d0b6'); K.box(w, h, .12, 0, 0, .06, '#2a3a42'); K.box(.06, h, .14, 0, 0, .07, '#cfc7ac'); K.box(w, .06, .14, 0, .1, .07, '#cfc7ac');
      K.box(w + .5, .12, .3, 0, -h / 2 - .14, .12, '#c8bf9f');
      for (const s of [-1, 1]) K.box(.5, h + .1, .08, s * (w / 2 + .42), 0, .06, '#475a45', 0, s * -.12, 0);
      K.setBase(null);
    };
    for (const [type, x, z, w, d, h] of level.structures) {
      obstacles.push({ x, z, w: w / 2, d: d / 2 });
      const base = hills ? footprint(x, z, w, d) - .4 : 0, top = hills ? heightAt(x, z) : 0, lift = top - base;
      if (type === 'rock') {
        // A jittered boulder: this exact mesh is also the collision solid, as before.
        const geometry = new T.IcosahedronGeometry(1, 1), pos = geometry.attributes.position, colors = new Float32Array(pos.count * 3), c = new T.Color(), v = new T.Vector3();
        const base1 = lin(quarry ? '#a38b6c' : '#8e8470'), light = lin(quarry ? '#c4ae8a' : '#a9a28c'), moss = lin('#6c7a52');
        for (let i = 0; i < pos.count; i++) {
          v.fromBufferAttribute(pos, i).normalize(); const j = 1 + (vnoise(v.x * 2.2 + x, v.z * 2.2 + v.y * 2) - .5) * .34 + (hash(Math.round(v.x * 40) + x, Math.round(v.y * 40) + z) - .5) * .06;
          v.multiplyScalar(j); pos.setXYZ(i, v.x, v.y, v.z);
          c.copy(base1).lerp(light, smooth(-.3, .9, v.y) * .7); if (!quarry) c.lerp(moss, smooth(.5, .95, v.y) * .35 * hash(i, x)); const s = .88 + hash(i, z) * .2; colors[i * 3] = c.r * s; colors[i * 3 + 1] = c.g * s; colors[i * 3 + 2] = c.b * s;
        }
        geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); const flat = geometry.toNonIndexed(); flat.computeVertexNormals(); geometry.dispose();
        const rockMesh = new T.Mesh(flat, rockMaterial);
        rockMesh.scale.set(w * .5, h * .64 + lift * .5, d * .5); rockMesh.position.set(x, top + h * .43 - lift * .2, z); rockMesh.rotation.y = hash(x, z) * 6; rockMesh.castShadow = rockMesh.receiveShadow = true; group.add(rockMesh); solids.push(rockMesh);
        // A broad base makes the collision footprint visually legible: a low scree slab with rubble.
        const plinth = texturedBox(w, .65 + lift, d, mapped(strataTex, quarry ? '#a89472' : '#9a917c'), x, base + (.65 + lift) / 2, z, 3); solids.push(plinth);
        for (let i = 0; i < 9; i++) { const a = deco(0, 6.28), rr = deco(.4, .8), px = x + Math.cos(a) * w * .5 * rr * 1.2, pz = z + Math.sin(a) * d * .5 * rr * 1.2, s = deco(.3, .8); decor.add(new T.DodecahedronGeometry(1, 0), decor.matrix(px, heightAt(px, pz) + s * .25, pz, deco(0, 3), deco(0, 3), 0, s, s * .7, s), ['#8a8270', '#9c9380', '#756d5e'][i % 3]); }
      } else if (type === 'silo') {
        const body = new T.Mesh(new T.CylinderGeometry(w / 2, w / 2, h, 16), metalMaterial); body.position.set(x, top + h / 2, z); body.castShadow = body.receiveShadow = true; group.add(body); solids.push(body);
        decor.cyl(0, w / 2 + .35, 3.2, x, top + h + 1.6, z, '#5f6b63', 16); decor.cyl(.12, .12, 1.2, x, top + h + 3.8, z, '#3a3f38', 6); decor.sph(.22, x, top + h + 4.5, z, '#8a8e80');
        for (const y of [2.5, h * .5, h - 2.2]) decor.cyl(w / 2 + .1, w / 2 + .1, .3, x, top + y, z, '#6a7066', 16);
        for (let k = 0; k <= h - 3; k += .7) decor.box(.7, .06, .14, x + w / 2 + .1, top + 1 + k, z + .1, '#4a4d44');   // ladder rungs
        decor.box(.08, h, .08, x + w / 2 + .04, top + h / 2, z - .25, '#4a4d44'); decor.box(.08, h, .08, x + w / 2 + .04, top + h / 2, z + .45, '#4a4d44');
        decor.box(.2, 2.2, 1.3, x - w / 2 - .05, top + 1.2, z, '#3d4239'); decor.cyl(.2, .2, w * .9, x, top + .5, z - w / 2 - 1.2, '#55594e', 8, 'z');
      } else if (type === 'crane') {
        solids.push(box(w, 1, d, '#7c7865', group, x, top + .5, z));
        const mast = box(1.2, h, 1.2, '#a77f43', group, x, top + h / 2, z); solids.push(mast);
        // Lattice mast, jib with diagonals, cab, counterweight, hook and cable (visual only).
        for (let k = 1; k < h; k += 1.6) { decor.box(1.5, .1, .1, x, top + k, z + .65, '#8d6a35'); decor.box(1.5, .1, .1, x, top + k, z - .65, '#8d6a35'); decor.box(.1, .1, 1.5, x + .65, top + k, z, '#8d6a35'); decor.box(.1, .1, 1.5, x - .65, top + k, z, '#8d6a35'); decor.box(.08, 1.8, .08, x + .66, top + k + .8, z + .66, '#8d6a35', 0, 0, .7); }
        decor.box(32, 1.1, 1.3, x - 10, top + h, z, '#b28a4d'); for (let k = -24; k < 6; k += 2) { decor.box(.1, 1.2, .1, x + k - 10 + 16, top + h + .85, z - .6, '#c79a56'); decor.box(2.2, .08, .08, x + k - 10 + 16, top + h + 1.5, z - .6, '#c79a56', 0, 0, .55); }
        decor.box(3, 2.5, 3, x, top + h - 1, z, '#525f57'); decor.box(1.7, 1.2, .1, x, top + h - .6, z + 1.55, '#223038'); decor.box(3.4, .2, 3.4, x, top + h + .3, z, '#3d4a43');
        decor.box(3, 2.2, 2.2, x + 5, top + h + 1, z, '#5d6a62'); decor.box(1.3, 1.4, 1.3, x + 6.4, top + h + .6, z, '#7c7865');
        decor.box(.12, 9, .12, x - 22, top + h - 4.5, z, '#3c453d'); decor.box(.7, .5, .7, x - 22, top + h - 9.2, z, '#26292a'); decor.tor(.3, .06, x - 22, top + h - 9.7, z, '#26292a', Math.PI / 2);
        for (let k = 0; k < 4; k++) decor.box(.5, .5, .08, x + 2 + k * 2.6 - 10, top + h + .1, z + .65, k % 2 ? '#d83a2a' : '#f0eadb');
      } else {
        const wallBox = texturedBox(w, h + lift, d, type === 'wall' ? stoneMaterial : wallMaterial, x, base + (h + lift) / 2, z, type === 'wall' ? 3 : 4);
        solids.push(wallBox);
        if (type === 'wall') {
          decor.box(w + .5, .25, d + .5, x, top + h + .12, z, '#b9ae92');
          const long = w > d; for (let k = -(long ? w : d) / 2 + .5; k <= (long ? w : d) / 2 - .4; k += 3) decor.box(long ? .5 : d + .5, .9, long ? d + .5 : .5, long ? x + k : x, top + h * .5, long ? z : z + k, '#a89f86');
          decor.box(w + .2, .4, d + .2, x, base + .3, z, '#8f8774');
        } else {
          // Plinth, windows on all sides, door, chimney, gabled roof.
          decor.box(w + .3, .55, d + .3, x, top + .22, z, '#8b8575');
          const rows = h >= 6 ? [2.7, h - 1.6] : [2.7];
          for (const sy of rows) {
            for (let o = -w / 2 + 1.8; o < w / 2; o += 3.2) { if (sy === 2.7 && Math.abs(o - (w / 2 - 2)) < 1.6) continue; windowAt(decor, x + o, top + sy, z + d / 2 + .02, 0); }
            for (let o = -w / 2 + 1.8; o < w / 2; o += 3.2) windowAt(decor, x + o, top + sy, z - d / 2 - .02, Math.PI);
            for (let o = -d / 2 + 2.2; o < d / 2 - .5; o += 3.8) { windowAt(decor, x + w / 2 + .02, top + sy, z + o, Math.PI / 2); windowAt(decor, x - w / 2 - .02, top + sy, z + o, -Math.PI / 2); }
          }
          const dx = x + w / 2 - 2; decor.box(1.9, 2.9, .14, dx, top + 1.5, z + d / 2 + .06, '#d2caa8'); decor.box(1.5, 2.6, .18, dx, top + 1.35, z + d / 2 + .1, '#4a3a2a'); decor.box(.12, .12, .1, dx + .5, top + 1.3, z + d / 2 + .22, '#d6b34a'); decor.box(2.4, .22, 1.0, dx, top + .12, z + d / 2 + .6, '#9a927d'); decor.box(2.6, .14, 1.2, dx, top + 3.1, z + d / 2 + .6, '#5a4a38');
          // Chimney and cap.
          const cx = x - w / 3; decor.box(1.1, h + 2.6, 1.1, cx, top + (h + 2.6) / 2 + .2, z, '#8a6e5a'); decor.box(1.4, .25, 1.4, cx, top + h + 2.7, z, '#5c5148'); decor.box(.7, .5, .7, cx, top + h + 3.1, z, '#2a2b27');
          // Roof (ridge along the longer side), built in a local frame and turned to the footprint.
          roofs.push({ x, z, y: top + h, w, d });
        }
      }
    }
    // Gable roofs, one merged mesh with tiled texture.
    {
      const R = new Kit(T);
      for (const r of roofs) {
        const long = Math.max(r.w, r.d) + 1.2, span = Math.min(r.w, r.d) / 2 + .6, rise = Math.min(2.8, span * .5);
        R.setBase(new T.Matrix4().makeTranslation(r.x, r.y, r.z).multiply(new T.Matrix4().makeRotationY(r.d > r.w ? Math.PI / 2 : 0)));
        R.prismZY([[-span, 0], [span, 0], [0, rise]], long, 0, '#ffffff'); R.box(long + .1, .16, .34, 0, rise, 0, '#d8d4c8');
        R.box(long + .2, .12, .08, 0, .02, span, '#cfcabd'); R.box(long + .2, .12, .08, 0, .02, -span, '#cfcabd'); R.setBase(null);
      }
      if (roofs.length) meshOf(R.build({ uv: 4 }), roofMaterial);
    }

    /* ---------- Vegetation, rocks and tufts ---------- */
    const chunkKey = (x, z) => `${Math.floor(x / 60)},${Math.floor(z / 60)}`;
    const trunkChunks = new Map(), crownChunks = new Map(), bushChunks = new Map(), rockChunks = new Map();
    const kitFor = (map, key) => { let k = map.get(key); if (!k) map.set(key, k = new Kit(T)); return k; };
    const conifer = (K, x, y, z, h, tint, tall) => {
      const tiers = tall ? 5 : 4, dark = new T.Color(tint).multiplyScalar(.82), c = new T.Color();
      for (let t = 0; t < tiers; t++) {
        const f = t / tiers, r = h * (tall ? .2 : .27) * (1 - f * .78), th = h * (.42 - f * .12);
        c.copy(dark).lerp(new T.Color(tint).multiplyScalar(1.25), f); K.add(new T.ConeGeometry(r, th, 8, 1, true), K.matrix(x, y + h * (.3 + f * .62), z, 0, deco(0, 6), 0), '#' + c.getHexString());
      }
      K.add(new T.ConeGeometry(h * .02, h * .12, 5), K.matrix(x, y + h * 1.0, z), '#' + new T.Color(tint).multiplyScalar(1.3).getHexString());
    };
    const broadleaf = (K, x, y, z, h, tint) => {
      const c = new T.Color(tint);
      for (let i = 0; i < 4; i++) { const r = h * deco(.17, .26), a = deco(0, 6.28), rr = i ? h * .14 : 0, light = c.clone().multiplyScalar(.85 + i * .1); K.add(new T.IcosahedronGeometry(1, 1), K.matrix(x + Math.cos(a) * rr, y + h * (.68 + i * .06), z + Math.sin(a) * rr, deco(0, 3), deco(0, 3), 0, r, r * .85, r), '#' + light.getHexString()); }
    };
    if (level.theme === 'forest' || level.theme === 'valley') {
      // Trees come in mirrored pairs, so both teams find the same cover on the flanks.
      for (let i = 0; i < 78; i++) {
        const x = (random() - .5) * 370, z = level.capture.z + random() * 185, h = 6 + random() * 8;
        if (Math.abs(x) < 68 && Math.abs(z - level.capture.z) < 115) continue;
        if (level.theme === 'forest' && (Math.abs(z - 38) < 16 || Math.abs(x) < 18)) continue;
        for (const [tx, tz] of [[x, z], IronMaps.mirror(level, x, z)]) {
          const y = heightAt(tx, tz);
          if (y < -1) continue;
          const key = chunkKey(tx, tz), trunk = kitFor(trunkChunks, key), crown = kitFor(crownChunks, key);
          trunk.cyl(.25, .45, h * .6, tx, y + h * .3, tz, i % 3 ? '#5a4a38' : '#6a5a46', 6);
          const kind = hash(tx, tz), tints = ['#3f5d3d', '#4a6a45', '#35553b', '#56703f'];
          if ((level.theme === 'valley' ? kind < .45 : kind < .22)) { trunk.cyl(.12, .2, h * .4, tx, y + h * .75, tz, '#6a5a46', 5); broadleaf(crown, tx, y, tz, h * 1.05, ['#5f8040', '#6d8a3f', '#7a8f3a', '#5a7a43'][Math.floor(hash(tz, tx) * 4)]); }
          else conifer(crown, tx, y, tz, h, tints[Math.floor(hash(tz, tx + 3) * 4)], kind > .8);
          if (Math.abs(tx) < 145 && Math.abs(tz) < 145) obstacles.push({ x: tx, z: tz, w: .65, d: .65 });
        }
      }
      for (const [key, K] of trunkChunks) { const m = meshOf(K.build({}), flatVc); solids.push(m); }
      for (const K of crownChunks.values()) meshOf(K.build({}), flatVc);
    } else {
      // Outer quarry benches are scenery; all drivable routes stay at the same height.
      const B = new Kit(T);
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, radius = 195 + random() * 30;
        const x = Math.cos(a) * radius, z = Math.sin(a) * radius, h = 10 + random() * 25;
        B.box(48, h, 42, x, h / 2 - 2, z, i % 2 ? '#a59175' : '#998468', 0, 0, 0);
        B.box(38, h * .55, 34, x, h + h * .275 - 2, z, '#b19c7b', 0, 0, 0);
        B.box(26, h * .3, 22, x + (i % 3 - 1) * 4, h * 1.55 + h * .15 - 2, z, '#bda887', 0, .15 * (i % 5 - 2), 0);
      }
      meshOf(B.build({ uv: 12 }), own(new T.MeshStandardMaterial({ map: strataTex, vertexColors: true, roughness: .96 })));
    }
    // Mountains: jittered cones with a rock-and-snow gradient; positions come from the original stream.
    {
      const M = [], palettes = quarry ? [['#ad9d83', '#c9b99d', '#e7dcc4'], ['#b7a68c', '#d1c0a4', '#ebe1ca']] : level.theme === 'valley' ? [['#566f58', '#868e82', '#eef1ee'], ['#607a5c', '#8e9688', '#f2f5f2']] : [['#506848', '#7c8472', '#e9ece7'], ['#5a7450', '#868e7a', '#eef0ea']];
      const pos = [], col = [], c = new T.Color();
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, r = 265 + random() * 100, radius = 65 + random() * 55, height = 60 + random() * 70, rot = random() * 6;
        const pal = palettes[i % 2].map(lin), rings = 6, segs = 10, mx = Math.cos(a) * r, mz = Math.sin(a) * r;
        const ringPoint = (ring, s) => {
          const f = ring / rings, ang = rot + s / segs * Math.PI * 2, jr = 1 + (hash(i * 7 + s, ring * 3) - .5) * .35, rr = radius * Math.pow(1 - f, .85) * jr, yy = f === 1 ? height : height * f * (1 + (hash(i + s * 5, ring) - .5) * .1);
          return [mx + Math.cos(ang) * rr, -12 + yy * 1.1, mz + Math.sin(ang) * rr, f];
        };
        const color = f => { const k = f < .5 ? 0 : 1; c.copy(pal[0]).lerp(pal[1], smooth(.12, .55, f)); if (!quarry) c.lerp(pal[2], smooth(.8, .95, f)); return c; };
        const push = (p, shade) => { pos.push(p[0], p[1], p[2]); const k = color(p[3]); col.push(k.r * shade, k.g * shade, k.b * shade); };
        for (let ring = 0; ring < rings; ring++) for (let s = 0; s < segs; s++) {
          const a0 = ringPoint(ring, s), a1 = ringPoint(ring, s + 1), b0 = ringPoint(ring + 1, s), b1 = ringPoint(ring + 1, s + 1), sh = .85 + hash(i * 3 + s, ring) * .3;
          push(a0, sh); push(b0, sh); push(a1, sh); if (ring < rings - 1) { push(a1, sh); push(b0, sh); push(b1, sh); }
        }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3)); g.computeVertexNormals();
      meshOf(g, own(new T.MeshStandardMaterial({ vertexColors: true, roughness: 1, flatShading: true, side: T.DoubleSide })), { cast: false });
    }
    // Bushes, boulders and loose stones scattered on free ground (visual only, small enough to drive over).
    {
      const place = (count, margin, fn, tries = 8) => { for (let i = 0; i < count; i++) for (let t = 0; t < tries; t++) { const x = deco(-145, 145), z = deco(-145, 145); if (onRoad(x, z, 2) || nearStructure(x, z, margin) || nearPoint(x, z) || heightAt(x, z) < -.9) continue; fn(x, z, heightAt(x, z)); break; } };
      if (!quarry) place(hills ? 120 : 150, 2, (x, z, y) => { const K = kitFor(bushChunks, chunkKey(x, z)), s = deco(.45, .95), c = ['#4b6a3a', '#5a7840', '#40603a', '#6b7c3a'][Math.floor(deco(0, 4))]; for (let k = 0; k < 3; k++) { const rr = s * deco(.6, 1), ox = deco(-.5, .5) * s, oz = deco(-.5, .5) * s; K.add(new T.IcosahedronGeometry(1, 0), K.matrix(x + ox, y + rr * .45, z + oz, deco(0, 3), deco(0, 3), 0, rr, rr * .75, rr), '#' + new T.Color(c).multiplyScalar(.85 + k * .12).getHexString()); } });
      else place(60, 2, (x, z, y) => { const K = kitFor(bushChunks, chunkKey(x, z)), s = deco(.35, .7); for (let k = 0; k < 2; k++) K.add(new T.IcosahedronGeometry(1, 0), K.matrix(x + deco(-.4, .4), y + s * .35, z + deco(-.4, .4), deco(0, 3), 0, 0, s, s * .6, s), k ? '#8d8a52' : '#7b7a48'); });
      place(quarry ? 70 : 46, 1.5, (x, z, y) => { const K = kitFor(rockChunks, chunkKey(x, z)), s = deco(.35, quarry ? 1.5 : 1.1); K.add(new T.DodecahedronGeometry(1, 0), K.matrix(x, y + s * .3, z, deco(0, 3), deco(0, 3), 0, s * deco(.8, 1.3), s * .7, s * deco(.8, 1.3)), ['#8a8270', '#9c9380', '#756d5e', '#a79e88'][Math.floor(deco(0, 4))]); });
      place(quarry ? 90 : 60, 1, (x, z, y) => { const K = kitFor(rockChunks, chunkKey(x, z)); for (let k = 0; k < 4; k++) { const s = deco(.12, .28); K.add(new T.DodecahedronGeometry(1, 0), K.matrix(x + deco(-.8, .8), y + s * .3, z + deco(-.8, .8), deco(0, 3), deco(0, 3), 0, s, s * .7, s), ['#8a8270', '#a79e88', '#756d5e'][k % 3]); } });
      for (const K of bushChunks.values()) meshOf(K.build({}), flatVc, { parent: fine });
      for (const K of rockChunks.values()) meshOf(K.build({}), flatVc, { parent: fine });
    }
    {
      // Grass tufts (crossed quads with an alpha-tested blade texture) and a few wildflowers.
      const tufts = quarry ? 600 : 1700, pos = [], nor = [], uv = [], col = [], c = new T.Color(), tint = lin(level.ground), dryTint = lin(quarry ? '#a89a60' : '#a2a05a');
      for (let i = 0, made = 0; made < tufts && i < tufts * 3; i++) {
        const x = deco(-148, 148), z = deco(-148, 148); if (onRoad(x, z, 1.2) || nearStructure(x, z, 1) || heightAt(x, z) < -.7) continue; made++;
        const y = heightAt(x, z), s = deco(.55, 1.15) * (quarry ? .7 : 1), a = deco(0, 3.14), k = fbm(x / 20, z / 20);
        c.copy(tint).lerp(dryTint, smooth(.45, .75, k)).multiplyScalar(deco(1.05, 1.5));
        for (let q = 0; q < 2; q++) {
          const ang = a + q * Math.PI / 2, dx = Math.cos(ang) * s * .5, dz = Math.sin(ang) * s * .5, h = s * .9;
          const v = [[x - dx, y, z - dz, 0, 0], [x + dx, y, z + dz, 1, 0], [x + dx, y + h, z + dz, 1, 1], [x - dx, y, z - dz, 0, 0], [x + dx, y + h, z + dz, 1, 1], [x - dx, y + h, z - dz, 0, 1]];
          for (const p of v) { pos.push(p[0], p[1], p[2]); nor.push(0, 1, 0); uv.push(p[3], p[4]); const dark = .72 + p[4] * .4; col.push(c.r * dark, c.g * dark, c.b * dark); }
        }
      }
      const g = new T.BufferGeometry(); g.setAttribute('position', new T.Float32BufferAttribute(pos, 3)); g.setAttribute('normal', new T.Float32BufferAttribute(nor, 3)); g.setAttribute('uv', new T.Float32BufferAttribute(uv, 2)); g.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      const tuftMaterial = own(new T.MeshStandardMaterial({ map: tuftTex, vertexColors: true, alphaTest: .5, side: T.DoubleSide, roughness: 1 }));
      // Both sides take the same (upward) normal, so the blades are lit like the ground and never go dark from behind.
      tuftMaterial.onBeforeCompile = shader => { shader.fragmentShader = shader.fragmentShader.replace(/gl_FrontFacing\s*\?\s*1\.0\s*:\s*-\s*1\.0/g, '1.0'); };
      meshOf(g, tuftMaterial, { cast: false, parent: grass });
      if (!quarry) {
        const F = new Kit(T);
        for (let i = 0, made = 0; made < 260 && i < 900; i++) { const x = deco(-146, 146), z = deco(-146, 146); if (onRoad(x, z, 1.5) || nearStructure(x, z, 1) || heightAt(x, z) < -.5 || fbm(x / 9 + 7, z / 9) < .52) continue; made++; const y = heightAt(x, z); F.add(new T.OctahedronGeometry(1, 0), F.matrix(x, y + .38, z, 0, 0, 0, .06, .06, .06), ['#f1e07a', '#f4f0e6', '#d9534a', '#c78be0'][made % 4]); F.cyl(.008, .008, .36, x, y + .18, z, '#4f7a38', 3); }
        meshOf(F.build({}), flatVc, { cast: false, parent: fine });
      }
    }
    // The border: posts with a wire rail.
    {
      const P = new Kit(T);
      for (let i = -150; i <= 150; i += 15) for (const [x, z] of [[i, -150], [i, 150], [-150, i], [150, i]]) {
        const y = heightAt(x, z); P.box(.4, 1.8, .4, x, y + .9, z, '#c8bea1'); P.box(.44, .4, .44, x, y + 1.45, z, '#ab7148');
        P.box(.12, .12, .12, x, y + 1.78, z, '#7a6a54');
        const horizontal = Math.abs(z) === 150, next = horizontal ? [x + 15, z] : [x, z + 15];
        if (i < 150) { const ny = heightAt(next[0], next[1]); for (const dy of [.55, 1.15]) P.box(horizontal ? 15 : .06, .06, horizontal ? .06 : 15, (x + next[0]) / 2, (y + ny) / 2 + dy, (z + next[1]) / 2, '#8a7b60'); }
      }
      meshOf(P.build({}), vcMaterial);
    }
    if (decor.items.length) meshOf(decor.build({}), vcMaterial);

    group.userData.fineDetail = fine;
    return {
      group, ground, solids, obstacles,
      setQuality(q) { fine.visible = q !== 'low'; grass.visible = q === 'high'; },
      update(t) { if (waterTexture_) { waterTexture_.offset.x = t * .012; } },
      dispose() { group.traverse(object => { if (object.isMesh || object.isPoints) object.geometry.dispose(); }); for (const item of owned) item.dispose(); }
    };
  }
};
