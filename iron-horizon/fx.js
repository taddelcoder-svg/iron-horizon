/* Effects and atmosphere: soft particles (dust, smoke, fire, sparks) drawn as two GPU point layers, flying debris
   (instanced), a short-lived light for flashes, and the sky (gradient dome, sun glow, clouds, drifting dust).
   Effects use their own random numbers and never touch the game simulation. */
window.IronFx = (() => {
  'use strict';
  const rand = (a = 0, b = 1) => a + Math.random() * (b - a);
  const hex = c => [parseInt(c.slice(1, 3), 16) / 255, parseInt(c.slice(3, 5), 16) / 255, parseInt(c.slice(5, 7), 16) / 255];
  const lerp = (a, b, t) => a + (b - a) * t;
  const smooth = (a, b, x) => { const t = Math.max(0, Math.min(1, (x - a) / (b - a))); return t * t * (3 - 2 * t); };

  function puffTexture(T, kind) {
    const c = document.createElement('canvas'); c.width = c.height = 64; const x = c.getContext('2d');
    if (kind === 'dot') {
      const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(.25, 'rgba(255,255,255,.7)'); g.addColorStop(1, 'rgba(255,255,255,0)');
      x.fillStyle = g; x.fillRect(0, 0, 64, 64);
    } else {
      // Lumpy cloud puff: a few overlapping soft blobs.
      let s = 12345; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      for (let i = 0; i < 9; i++) {
        const px = 32 + (r() - .5) * 24, py = 32 + (r() - .5) * 24, pr = 12 + r() * 12, g = x.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(255,255,255,.28)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64);
      }
      // Fade to nothing at the sprite edge so rotated quads never show a seam.
      const edge = x.createRadialGradient(32, 32, 20, 32, 32, 32); edge.addColorStop(0, 'rgba(0,0,0,0)'); edge.addColorStop(1, 'rgba(0,0,0,1)');
      x.globalCompositeOperation = 'destination-out'; x.fillStyle = edge; x.fillRect(0, 0, 64, 64);
    }
    const t = new T.CanvasTexture(c); return t;
  }

  /* ---------- One layer of points: ring of particles, uploaded once per frame ---------- */
  class Layer {
    constructor(T, scene, capacity, additive, texture, camera, renderer) {
      this.T = T; this.n = capacity; this.camera = camera; this.renderer = renderer; this.additive = additive;
      const f = k => new Float32Array(capacity * k);
      this.pos = f(3); this.vel = f(3); this.life = f(1); this.max = f(1); this.s0 = f(1); this.s1 = f(1); this.a0 = f(1); this.rot = f(1); this.spin = f(1); this.drag = f(1); this.grav = f(1); this.c0 = f(3); this.c1 = f(3);
      this.aSize = f(1); this.aAlpha = f(1); this.aColor = f(3); this.aRot = f(1);
      this.alive = new Uint8Array(capacity); this.free = []; for (let i = capacity - 1; i >= 0; i--) this.free.push(i);
      this.top = 0;
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.BufferAttribute(this.pos, 3).setUsage(T.DynamicDrawUsage));
      g.setAttribute('aSize', new T.BufferAttribute(this.aSize, 1).setUsage(T.DynamicDrawUsage)); g.setAttribute('aAlpha', new T.BufferAttribute(this.aAlpha, 1).setUsage(T.DynamicDrawUsage));
      g.setAttribute('aColor', new T.BufferAttribute(this.aColor, 3).setUsage(T.DynamicDrawUsage)); g.setAttribute('aRot', new T.BufferAttribute(this.aRot, 1).setUsage(T.DynamicDrawUsage));
      this.geometry = g;
      this.uniforms = { map: { value: texture }, uScale: { value: 600 }, fogColor: { value: new T.Color('#abb6a6') }, fogDensity: { value: .0033 }, uAdd: { value: additive ? 1 : 0 } };
      this.material = new T.ShaderMaterial({
        uniforms: this.uniforms, transparent: true, depthWrite: false, fog: false,
        blending: additive ? T.AdditiveBlending : T.NormalBlending,
        vertexShader: `attribute float aSize; attribute float aAlpha; attribute vec3 aColor; attribute float aRot; uniform float uScale;
          varying vec3 vColor; varying float vAlpha; varying float vRot; varying float vDepth;
          void main(){ vec4 mv = modelViewMatrix * vec4(position,1.); vColor = aColor; vAlpha = aAlpha; vRot = aRot; vDepth = -mv.z;
            gl_PointSize = min(aSize * uScale / max(.5, -mv.z), 220.); gl_Position = projectionMatrix * mv; }`,
        fragmentShader: `uniform sampler2D map; uniform vec3 fogColor; uniform float fogDensity; uniform float uAdd;
          varying vec3 vColor; varying float vAlpha; varying float vRot; varying float vDepth;
          void main(){ vec2 p = gl_PointCoord - .5; float c = cos(vRot), s = sin(vRot); p = vec2(c*p.x - s*p.y, s*p.x + c*p.y) + .5;
            float a = texture2D(map, p).a * vAlpha; if (a < .004) discard;
            float f = 1. - exp(-fogDensity*fogDensity*vDepth*vDepth);
            if (uAdd > .5) gl_FragColor = vec4(vColor * (1. - f * .9), a); else gl_FragColor = vec4(mix(vColor, fogColor, f * .85), a); }`
      });
      this.points = new T.Points(g, this.material); this.points.frustumCulled = false; this.points.renderOrder = additive ? 11 : 10; scene.add(this.points);
    }
    spawn(o) {
      if (!this.free.length) return -1;
      const i = this.free.pop(); this.alive[i] = 1; if (i >= this.top) this.top = i + 1;
      this.pos[i * 3] = o.x; this.pos[i * 3 + 1] = o.y; this.pos[i * 3 + 2] = o.z;
      this.vel[i * 3] = o.vx || 0; this.vel[i * 3 + 1] = o.vy || 0; this.vel[i * 3 + 2] = o.vz || 0;
      this.life[i] = this.max[i] = o.life; this.s0[i] = o.s0; this.s1[i] = o.s1 ?? o.s0; this.a0[i] = o.a ?? 1; this.rot[i] = o.rot ?? rand(0, 6.28); this.spin[i] = o.spin ?? rand(-.8, .8);
      this.drag[i] = o.drag ?? 1.5; this.grav[i] = o.grav ?? 0;
      const c0 = o.c0, c1 = o.c1 || o.c0; this.c0.set(c0, i * 3); this.c1.set(c1, i * 3);
      return i;
    }
    update(dt) {
      let top = 0;
      for (let i = 0; i < this.top; i++) {
        if (!this.alive[i]) continue;
        const l = this.life[i] -= dt;
        if (l <= 0) { this.alive[i] = 0; this.free.push(i); this.aAlpha[i] = 0; this.aSize[i] = 0; continue; }
        top = i + 1;
        const k = Math.exp(-this.drag[i] * dt), p = i * 3;
        this.vel[p] *= k; this.vel[p + 1] = this.vel[p + 1] * k + this.grav[i] * dt; this.vel[p + 2] *= k;
        this.pos[p] += this.vel[p] * dt; this.pos[p + 1] += this.vel[p + 1] * dt; this.pos[p + 2] += this.vel[p + 2] * dt;
        const t = 1 - l / this.max[i];
        this.aSize[i] = lerp(this.s0[i], this.s1[i], Math.sqrt(t));
        this.aAlpha[i] = this.a0[i] * smooth(0, .08, t) * Math.pow(1 - t, this.additive ? 1.3 : 1.15);
        this.rot[i] += this.spin[i] * dt; this.aRot[i] = this.rot[i];
        for (let c = 0; c < 3; c++) this.aColor[p + c] = lerp(this.c0[p + c], this.c1[p + c], Math.min(1, t * 1.6));
      }
      this.top = top;
    }
    flush(count) {
      const g = this.geometry; g.setDrawRange(0, this.top);
      for (const name of ['position', 'aSize', 'aAlpha', 'aColor', 'aRot']) g.attributes[name].needsUpdate = true;
    }
    clear() { for (let i = 0; i < this.top; i++) if (this.alive[i]) { this.alive[i] = 0; this.aAlpha[i] = 0; this.aSize[i] = 0; this.free.push(i); } this.top = 0; }
  }

  function create(T, scene, camera, renderer, groundHeight) {
    const dot = puffTexture(T, 'dot'), puff = puffTexture(T, 'puff');
    const smoke = new Layer(T, scene, 480, false, puff, camera, renderer), glow = new Layer(T, scene, 420, true, dot, camera, renderer), flame = new Layer(T, scene, 160, true, puff, camera, renderer);
    const layers = [smoke, glow, flame];
    let amount = 1, enabled = true;
    const emitters = [];

    // Debris: lit boxes thrown by explosions and impacts, bouncing once on the ground.
    const DEBRIS = 70, debrisGeometry = new T.BoxGeometry(1, 1, 1), debrisMaterial = new T.MeshStandardMaterial({ roughness: .9, metalness: .15 });
    const debris = new T.InstancedMesh(debrisGeometry, debrisMaterial, DEBRIS); debris.frustumCulled = false; debris.castShadow = false; debris.receiveShadow = false;
    debris.instanceColor = new T.InstancedBufferAttribute(new Float32Array(DEBRIS * 3).fill(1), 3); debris.count = 0; scene.add(debris);
    const chunks = Array.from({ length: DEBRIS }, () => ({ on: false, x: 0, y: 0, z: 0, vx: 0, vy: 0, vz: 0, rx: 0, ry: 0, rz: 0, wx: 0, wy: 0, wz: 0, s: .2, sy: .2, sz: .2, life: 0, smoke: 0 }));
    const m4 = new T.Matrix4(), q4 = new T.Quaternion(), e4 = new T.Euler(), v3 = new T.Vector3(), s3 = new T.Vector3(), c3 = new T.Color();
    let debrisTop = 0;

    const light = new T.PointLight('#ffa65a', 0, 55, 2); light.castShadow = false; light.position.set(0, 5, 0); scene.add(light);
    let lightLevel = 0, lightDecay = 8;

    const sp = (layer, o) => layer.spawn(o);
    const n = k => Math.max(1, Math.round(k * amount));

    const api = {
      setQuality(q) { amount = q === 'high' ? 1 : q === 'medium' ? .65 : .4; light.visible = q === 'high'; },
      setFog(color, density) { for (const l of layers) { l.uniforms.fogColor.value.set(color); l.uniforms.fogDensity.value = density; } },
      get enabled() { return enabled; }, set enabled(v) { enabled = v; },
      clear() { for (const l of layers) l.clear(); for (const c of chunks) c.on = false; debrisTop = 0; debris.count = 0; emitters.length = 0; lightLevel = 0; light.intensity = 0; },

      // Muzzle blast: white-hot core, forward sparks, powder smoke.
      muzzleFlash(origin, dir, scale = 1) {
        if (!enabled) return;
        const x = origin.x, y = origin.y, z = origin.z;
        sp(glow, { x, y, z, life: .09, s0: 2.6 * scale, s1: 3.6 * scale, a: 1.2, c0: [1.6, 1.25, .7], c1: [1.2, .55, .18], drag: 0, spin: 0 });
        sp(glow, { x: x + dir.x * 1.1 * scale, y: y + dir.y * 1.1 * scale, z: z + dir.z * 1.1 * scale, life: .07, s0: 1.4 * scale, s1: 2.4 * scale, a: 1, c0: [1.8, 1.5, .9], c1: [1.3, .7, .2], drag: 0 });
        for (let i = 0; i < n(7); i++) { const sd = rand(14, 34); sp(glow, { x, y, z, vx: dir.x * sd + rand(-3, 3), vy: dir.y * sd + rand(-2, 3), vz: dir.z * sd + rand(-3, 3), life: rand(.12, .26), s0: .32 * scale, s1: .08, a: 1, c0: [1.7, 1.3, .6], c1: [1, .3, .08], drag: 3, grav: -6 }); }
        for (let i = 0; i < n(5); i++) sp(smoke, { x: x + dir.x * rand(0, 1.5), y, z: z + dir.z * rand(0, 1.5), vx: dir.x * rand(1, 6) + rand(-1.2, 1.2), vy: rand(.4, 1.8), vz: dir.z * rand(1, 6) + rand(-1.2, 1.2), life: rand(1, 1.8), s0: .5 * scale, s1: rand(2, 3.4) * scale, a: .5, c0: [.82, .8, .74], c1: [.55, .55, .52], drag: 1.7 });
        api.flash(x, y, z, 2.2 * scale);
      },
      flash(x, y, z, strength) { light.position.set(x, y + .5, z); lightLevel = Math.max(lightLevel, strength); lightDecay = 9; },
      // Tracer glow along a shell's path.
      trail(x, y, z) { if (enabled) sp(glow, { x, y, z, life: .16, s0: .5, s1: .18, a: .85, c0: [1.5, 1.1, .5], c1: [1, .35, .1], drag: 0, spin: 0 }); },
      // Explosion of a destroyed vehicle.
      explosion(p, scale = 1, color = '#5b6040') {
        if (!enabled) return;
        const x = p.x, y = p.y, z = p.z;
        sp(glow, { x, y, z, life: .22, s0: 6.5 * scale, s1: 9 * scale, a: 1.1, c0: [1.8, 1.5, .9], c1: [1.3, .6, .2], drag: 0, spin: 0 });
        for (let i = 0; i < n(14); i++) sp(flame, { x: x + rand(-1, 1), y: y + rand(-.3, 1.2), z: z + rand(-1, 1), vx: rand(-4, 4), vy: rand(1, 6), vz: rand(-4, 4), life: rand(.6, 1.2), s0: rand(1.2, 2.2) * scale, s1: rand(3, 5.5) * scale, a: .85, c0: [1.5, .95, .35], c1: [.45, .09, .02], drag: 2.2 });
        for (let i = 0; i < n(12); i++) sp(smoke, { x: x + rand(-1.2, 1.2), y: y + rand(0, 1.5), z: z + rand(-1.2, 1.2), vx: rand(-3, 3), vy: rand(2.5, 6.5), vz: rand(-3, 3), life: rand(2.6, 4.4), s0: 1.4 * scale, s1: rand(4.5, 7.5) * scale, a: .85, c0: [.1, .1, .1], c1: [.32, .32, .3], drag: .9 });
        for (let i = 0; i < n(26); i++) { const a = rand(0, 6.28), sd = rand(6, 22); sp(glow, { x, y, z, vx: Math.cos(a) * sd, vy: rand(4, 18), vz: Math.sin(a) * sd, life: rand(.5, 1.2), s0: rand(.22, .45), s1: .06, a: 1, c0: [1.7, 1.3, .5], c1: [1, .3, .05], drag: .5, grav: -16 }); }
        api.dustRing(x, y - p.y + (groundHeight ? groundHeight(x, z) : 0) + .3, z, 5 * scale, '#b5a98a', n(14));
        api.debris(p, n(14), [color, '#2a2c26', '#454a38', '#6b5a3c'], 12 * scale, .5 * scale);
        api.flash(x, y + 1, z, 7 * scale);
        emitters.push({ x, y: y - 1, z, life: 7, t: 0, kind: 'wreck', scale });
      },
      dustRing(x, y, z, radius, color, count = 12) {
        const c = hex(color);
        for (let i = 0; i < count; i++) { const a = i / count * 6.28 + rand(-.2, .2), sd = radius * rand(.8, 1.4); sp(smoke, { x: x + Math.cos(a) * 1.2, y, z: z + Math.sin(a) * 1.2, vx: Math.cos(a) * sd, vy: rand(.2, 1.2), vz: Math.sin(a) * sd, life: rand(.9, 1.7), s0: .9, s1: rand(2.4, 3.6), a: .5, c0: c, c1: c.map(v => v * .85), drag: 2.2 }); }
      },
      // Shell hits the ground or a structure.
      impactGround(p, color = '#9a8a68', stone = false) {
        if (!enabled) return;
        const c = hex(color), light = c.map(v => Math.min(1, v * 1.15 + .06)), dark = c.map(v => v * .7);
        sp(glow, { x: p.x, y: p.y + .3, z: p.z, life: .09, s0: 1.9, s1: 2.8, a: 1, c0: [1.6, 1.2, .6], c1: [1.2, .6, .2], drag: 0, spin: 0 });
        for (let i = 0; i < n(7); i++) sp(smoke, { x: p.x + rand(-.4, .4), y: p.y + .2, z: p.z + rand(-.4, .4), vx: rand(-2.6, 2.6), vy: rand(2.5, 6.5), vz: rand(-2.6, 2.6), life: rand(1, 2), s0: .8, s1: rand(2.4, 4), a: .75, c0: light, c1: dark, drag: 1.4 });
        for (let i = 0; i < n(5); i++) sp(glow, { x: p.x, y: p.y + .2, z: p.z, vx: rand(-9, 9), vy: rand(4, 11), vz: rand(-9, 9), life: rand(.25, .55), s0: .16, s1: .04, a: 1, c0: [1.6, 1.2, .5], c1: [1, .35, .1], drag: .8, grav: -20 });
        api.dustRing(p.x, p.y + .15, p.z, 3.4, color, n(6));
        api.debris(p, n(5), stone ? ['#8e8a7c', '#6d6a60', '#a09c8c'] : [color, '#5a4a34', '#3e3426'], 8, .22);
        api.flash(p.x, p.y, p.z, 1.6);
      },
      // Shell strikes armour without a kill: sparks, a flash and a small cloud.
      impactArmour(p, big = false) {
        if (!enabled) return;
        sp(glow, { x: p.x, y: p.y, z: p.z, life: .1, s0: big ? 2.6 : 1.7, s1: 3, a: 1, c0: [1.8, 1.4, .8], c1: [1.3, .6, .2], drag: 0, spin: 0 });
        for (let i = 0; i < n(big ? 14 : 8); i++) sp(glow, { x: p.x, y: p.y, z: p.z, vx: rand(-12, 12), vy: rand(1, 12), vz: rand(-12, 12), life: rand(.2, .55), s0: .2, s1: .05, a: 1, c0: [1.7, 1.3, .6], c1: [1, .35, .08], drag: 1, grav: -22 });
        for (let i = 0; i < n(3); i++) sp(smoke, { x: p.x, y: p.y, z: p.z, vx: rand(-1.5, 1.5), vy: rand(1, 3), vz: rand(-1.5, 1.5), life: rand(.8, 1.5), s0: .5, s1: rand(1.6, 2.6), a: .6, c0: [.3, .3, .28], c1: [.5, .5, .48], drag: 1.2 });
        api.debris(p, n(2), ['#3b4033', '#6a6f55'], 6, .14);
        api.flash(p.x, p.y, p.z, 2.4);
      },
      ricochet(p, dir) {
        if (!enabled) return;
        sp(glow, { x: p.x, y: p.y, z: p.z, life: .07, s0: 1.2, s1: 1.8, a: 1, c0: [1.7, 1.5, 1], c1: [1.2, .8, .3], drag: 0, spin: 0 });
        for (let i = 0; i < n(10); i++) { const sd = rand(14, 30); sp(glow, { x: p.x, y: p.y, z: p.z, vx: dir.x * sd + rand(-3, 3), vy: dir.y * sd + rand(0, 5), vz: dir.z * sd + rand(-3, 3), life: rand(.18, .45), s0: .17, s1: .04, a: 1, c0: [1.8, 1.5, .8], c1: [1.1, .45, .1], drag: .7, grav: -18 }); }
        api.flash(p.x, p.y, p.z, 1.2);
      },
      // Track and wheel dust.
      dust(p, color = '#b7a98a', speed = 1) {
        if (!enabled) return; const c = hex(color);
        sp(smoke, { x: p.x + rand(-.4, .4), y: p.y, z: p.z + rand(-.4, .4), vx: rand(-.6, .6), vy: rand(.6, 1.6), vz: rand(-.6, .6), life: rand(.9, 1.6), s0: .5, s1: rand(1.6, 2.6) * Math.min(1.4, .6 + speed * .05), a: .34, c0: c, c1: c.map(v => v * .9), drag: 1.3 });
      },
      // Smoke and flames from a damaged vehicle.
      damage(p, severity) {
        if (!enabled) return;
        sp(smoke, { x: p.x + rand(-.3, .3), y: p.y, z: p.z + rand(-.3, .3), vx: rand(-.4, .4), vy: rand(1.4, 2.6), vz: rand(-.4, .4), life: rand(1.6, 2.6), s0: .5, s1: rand(1.6, 2.6), a: .55 + severity * .3, c0: [.12, .12, .12], c1: [.4, .4, .38], drag: .6 });
        if (severity > .6) sp(flame, { x: p.x + rand(-.25, .25), y: p.y - .1, z: p.z + rand(-.25, .25), vx: rand(-.3, .3), vy: rand(1, 2.2), vz: rand(-.3, .3), life: rand(.35, .6), s0: .6, s1: rand(1, 1.5), a: .8, c0: [1.5, .8, .25], c1: [.5, .1, .02], drag: 1 });
      },
      // Flying chunks. colors: array of hex strings; speed in m/s.
      debris(p, count, colors, speed = 8, size = .3) {
        if (!enabled) return;
        for (let k = 0; k < count; k++) {
          const i = chunks.findIndex(c => !c.on); if (i < 0) return;
          const c = chunks[i], a = rand(0, 6.28), sd = rand(.35, 1) * speed;
          Object.assign(c, { on: true, x: p.x, y: p.y + .2, z: p.z, vx: Math.cos(a) * sd, vy: rand(.5, 1) * speed * .9, vz: Math.sin(a) * sd, rx: rand(0, 6), ry: rand(0, 6), rz: rand(0, 6), wx: rand(-9, 9), wy: rand(-9, 9), wz: rand(-9, 9), life: rand(2.2, 3.4), s: size * rand(.5, 1.4), sy: size * rand(.35, 1), sz: size * rand(.5, 1.3), smoke: size > .4 ? .12 : 0 });
          c3.set(colors[Math.floor(Math.random() * colors.length)]); debris.setColorAt(i, c3);
          if (i >= debrisTop) debrisTop = i + 1;
        }
        if (debris.instanceColor) debris.instanceColor.needsUpdate = true;
      },
      update(dt) {
        if (!enabled) return;
        for (const l of layers) l.update(dt);
        for (let i = emitters.length - 1; i >= 0; i--) {
          const e = emitters[i]; e.life -= dt; e.t -= dt;
          if (e.life <= 0) { emitters.splice(i, 1); continue; }
          if (e.t <= 0) {
            e.t = .07 + (1 - e.life / 7) * .18;
            sp(smoke, { x: e.x + rand(-.5, .5), y: e.y, z: e.z + rand(-.5, .5), vx: rand(-.5, .5), vy: rand(2, 4), vz: rand(-.5, .5), life: rand(2.2, 3.6), s0: 1.1 * e.scale, s1: rand(3.2, 5) * e.scale, a: .7 * Math.min(1, e.life / 3), c0: [.09, .09, .09], c1: [.3, .3, .29], drag: .5 });
            if (e.life > 3.5 && Math.random() < .8) sp(flame, { x: e.x + rand(-.6, .6), y: e.y - .3, z: e.z + rand(-.6, .6), vy: rand(1.5, 3), life: rand(.4, .8), s0: 1.1, s1: rand(1.8, 2.8), a: .8, c0: [1.4, .75, .25], c1: [.4, .08, .02], drag: 1 });
          }
        }
        for (let i = 0; i < debrisTop; i++) {
          const c = chunks[i]; if (!c.on) continue;
          c.life -= dt; if (c.life <= 0) { c.on = false; continue; }
          c.vy -= 17 * dt; c.x += c.vx * dt; c.y += c.vy * dt; c.z += c.vz * dt; c.rx += c.wx * dt; c.ry += c.wy * dt; c.rz += c.wz * dt;
          const gy = (groundHeight ? groundHeight(c.x, c.z) : 0) + c.sy * .4;
          if (c.y < gy) { c.y = gy; if (Math.abs(c.vy) > 2) { c.vy *= -.32; c.vx *= .55; c.vz *= .55; c.wx *= .5; c.wy *= .5; c.wz *= .5; } else { c.vy = 0; c.vx *= .6; c.vz *= .6; c.wx = c.wy = c.wz = 0; } }
          if (c.smoke && Math.random() < c.smoke) sp(smoke, { x: c.x, y: c.y, z: c.z, vy: .8, life: .9, s0: .35, s1: 1.1, a: .4, c0: [.2, .2, .2], c1: [.4, .4, .4], drag: 1 });
        }
        lightLevel = Math.max(0, lightLevel - lightDecay * dt * Math.max(1, lightLevel * .35)); light.intensity = lightLevel;
      },
      // Called once per rendered frame: upload particle data and update the debris instances.
      flush() {
        const scale = renderer.domElement.height / (2 * Math.tan(camera.fov * Math.PI / 360));
        for (const l of layers) { l.uniforms.uScale.value = scale; l.flush(); }
        let top = 0;
        for (let i = 0; i < debrisTop; i++) {
          const c = chunks[i];
          if (!c.on) { m4.makeScale(0, 0, 0); debris.setMatrixAt(i, m4); continue; }
          top = i + 1; const fade = Math.min(1, c.life / .6);
          e4.set(c.rx, c.ry, c.rz); q4.setFromEuler(e4); m4.compose(v3.set(c.x, c.y, c.z), q4, s3.set(c.s * fade, c.sy * fade, c.sz * fade)); debris.setMatrixAt(i, m4);
        }
        debrisTop = top; debris.count = top; debris.instanceMatrix.needsUpdate = true;
      }
    };
    return api;
  }

  /* ---------- Sky: gradient dome, sun glow, clouds; follows the camera ---------- */
  function createSky(T, scene, sunDirection) {
    const group = new T.Group(); scene.add(group);
    const dome = new T.Mesh(new T.SphereGeometry(800, 28, 16), new T.MeshBasicMaterial({ vertexColors: true, side: T.BackSide, fog: false, depthWrite: false, toneMapped: false }));
    dome.renderOrder = -1000; dome.frustumCulled = false; group.add(dome);
    const glowTexture = puffTexture(T, 'dot');
    const glow = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: '#ffd9a0', blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: .7 }));
    glow.scale.setScalar(520); glow.position.copy(sunDirection).multiplyScalar(700); glow.renderOrder = -900; group.add(glow);
    const core = new T.Sprite(new T.SpriteMaterial({ map: glowTexture, color: '#fff6dc', blending: T.AdditiveBlending, transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: 1 }));
    core.scale.setScalar(80); core.position.copy(sunDirection).multiplyScalar(699); core.renderOrder = -899; group.add(core);
    // Clouds: flat sprites on a ring, slowly drifting.
    const cloudCanvas = document.createElement('canvas'); cloudCanvas.width = 256; cloudCanvas.height = 96;
    { const x = cloudCanvas.getContext('2d'); let s = 99; const r = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
      for (let i = 0; i < 22; i++) { const px = 40 + r() * 176, py = 40 + r() * 20 - Math.abs(px - 128) * .12, pr = 16 + r() * 22; const g = x.createRadialGradient(px, py, 0, px, py, pr);
        g.addColorStop(0, 'rgba(255,255,255,.55)'); g.addColorStop(.6, 'rgba(250,250,252,.3)'); g.addColorStop(1, 'rgba(250,250,252,0)'); x.fillStyle = g; x.fillRect(0, 0, 256, 96); }
      // Shaded underside.
      x.globalCompositeOperation = 'source-atop'; const u = x.createLinearGradient(0, 30, 0, 80); u.addColorStop(0, 'rgba(255,255,255,0)'); u.addColorStop(1, 'rgba(140,150,172,.55)'); x.fillStyle = u; x.fillRect(0, 0, 256, 96); }
    const cloudTexture = new T.CanvasTexture(cloudCanvas), clouds = new T.Group(); group.add(clouds); const cloudSprites = [];
    for (let i = 0; i < 16; i++) {
      const sprite = new T.Sprite(new T.SpriteMaterial({ map: cloudTexture, color: '#ffffff', transparent: true, depthWrite: false, fog: false, toneMapped: false, opacity: rand(.55, .9) }));
      const a = i / 16 * Math.PI * 2 + rand(-.2, .2), elevation = rand(.1, .42), r = 640; sprite.position.set(Math.cos(a) * r * Math.cos(elevation), r * Math.sin(elevation) + 20, Math.sin(a) * r * Math.cos(elevation));
      const w = rand(220, 420); sprite.scale.set(w, w * .38, 1); sprite.renderOrder = -800; clouds.add(sprite); cloudSprites.push(sprite);
    }
    const mix = (a, b, t) => a.clone().lerp(b, t);
    return {
      group, clouds,
      // Horizon colour equals the fog colour, so the dome melts into distant terrain.
      setLevel(level) {
        const T_ = T, horizon = new T_.Color(level.sky), zenith = mix(new T_.Color(level.sky), new T_.Color(level.theme === 'quarry' ? '#6f95c4' : '#4f7fbf'), .72), warm = new T_.Color('#ffe2b0');
        const g = dome.geometry, pos = g.attributes.position, colors = g.attributes.color ? g.attributes.color.array : new Float32Array(pos.count * 3), c = new T_.Color(), d = new T_.Vector3();
        for (let i = 0; i < pos.count; i++) {
          d.fromBufferAttribute(pos, i).normalize();
          const h = Math.max(0, d.y); c.copy(horizon).lerp(zenith, Math.pow(h, .55));
          c.lerp(warm, Math.pow(Math.max(0, d.dot(sunDirection)), 6) * .38 * (1 - h * .6));
          c.convertSRGBToLinear(); colors.set([c.r, c.g, c.b], i * 3);
        }
        if (g.attributes.color) g.attributes.color.needsUpdate = true; else g.setAttribute('color', new T_.BufferAttribute(colors, 3));
        for (const sprite of cloudSprites) sprite.material.color.set('#ffffff').lerp(horizon, .22);
      },
      update(cameraPosition, dt, visible = true) {
        group.visible = visible; group.position.copy(cameraPosition); clouds.rotation.y += dt * .004;
      }
    };
  }

  /* ---------- Floating dust motes that drift through the air around the camera ---------- */
  function createMotes(T, scene) {
    const count = 140, positions = new Float32Array(count * 3), base = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) base[i] = Math.random();
    const geometry = new T.BufferGeometry(); geometry.setAttribute('position', new T.BufferAttribute(positions, 3));
    const points = new T.Points(geometry, new T.PointsMaterial({ map: puffTexture(T, 'dot'), color: '#fff0d0', size: .22, transparent: true, opacity: .42, depthWrite: false, sizeAttenuation: true, blending: T.AdditiveBlending })); points.frustumCulled = false; scene.add(points);
    let time = 0;
    return {
      points,
      update(cameraPosition, dt, visible) {
        points.visible = visible; if (!visible) return; time += dt;
        const wrap = (v, size) => ((v % size) + size) % size - size / 2;
        for (let i = 0; i < count; i++) {
          positions[i * 3] = cameraPosition.x + wrap(base[i * 3] * 44 + time * 1.1 - cameraPosition.x + Math.sin(time * .3 + i) * .6, 44);
          positions[i * 3 + 1] = cameraPosition.y - 5 + ((base[i * 3 + 1] * 16 + time * .12) % 16);
          positions[i * 3 + 2] = cameraPosition.z + wrap(base[i * 3 + 2] * 44 + time * .35 - cameraPosition.z, 44);
        }
        geometry.attributes.position.needsUpdate = true;
      }
    };
  }
  return { create, createSky, createMotes };
})();
