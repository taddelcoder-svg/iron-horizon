/* Owns only static map geometry. Switching maps disposes geometry, not shared materials.
   Maps with relief (level.heightAt) get a displaced, vertex-coloured ground mesh; structures sit on the slope. */
window.IronTerrain = {
  build(T, level, { mat, box, cyl }) {
    const group = new T.Group(), solids = [], obstacles = [];
    const heightAt = level.heightAt || (() => 0);
    let seed = level.seed;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    // Wide flat ground; on relief maps it only shows beyond the playable area.
    const ground = new T.Mesh(new T.PlaneGeometry(1800, 1800), mat(level.ground)); ground.rotation.x = -Math.PI / 2; ground.position.y = level.heightAt ? -.05 : 0; ground.receiveShadow = true; group.add(ground);
    if (level.heightAt) {
      const size = 300, segments = 150, geometry = new T.PlaneGeometry(size, size, segments, segments); geometry.rotateX(-Math.PI / 2);
      const position = geometry.attributes.position, colors = new Float32Array(position.count * 3), color = new T.Color();
      const grass = new T.Color(level.ground).convertSRGBToLinear(), sand = new T.Color('#a89a76').convertSRGBToLinear(), wet = new T.Color('#5d6b5a').convertSRGBToLinear();
      const rock = new T.Color('#8c8a70').convertSRGBToLinear(), road = new T.Color(level.road).convertSRGBToLinear(), stone = new T.Color('#aaa28c').convertSRGBToLinear();
      for (let i = 0; i < position.count; i++) {
        const x = position.getX(i), z = position.getZ(i), h = heightAt(x, z); position.setY(i, h);
        color.copy(grass);
        if (h < -.6) color.lerp(Math.abs(z + 10) < 10 && x > -40 ? wet : sand, Math.min(1, (-h - .6) / 1.6));
        if (h > 3) color.lerp(rock, Math.min(.8, (h - 3) / 4));
        for (const [rx, rz, rw, rd] of level.roads) if (Math.abs(x - rx) < rw / 2 && Math.abs(z - rz) < rd / 2) color.lerp(road, .85);
        if (Math.abs(x) < 7.5 && Math.abs(z + 10) < 9) color.copy(stone);
        // Slight noise so large slopes do not look like plastic.
        const n = .94 + ((Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1 + 1) % 1 * .1;
        colors[i * 3] = color.r * n; colors[i * 3 + 1] = color.g * n; colors[i * 3 + 2] = color.b * n;
      }
      geometry.setAttribute('color', new T.BufferAttribute(colors, 3)); geometry.computeVertexNormals();
      const relief = new T.Mesh(geometry, new T.MeshStandardMaterial({ vertexColors: true, roughness: .95, metalness: 0 }));
      relief.receiveShadow = true; group.add(relief);
      // Shallow water in the creek; tanks ford through it.
      const water = new T.Mesh(new T.PlaneGeometry(190, 7), new T.MeshStandardMaterial({ color: new T.Color('#6f8f95').convertSRGBToLinear(), roughness: .25, metalness: .1, transparent: true, opacity: .72 }));
      water.rotation.x = -Math.PI / 2; water.position.set(55, -1.05, -10); group.add(water);
      // Arch faces under the bridge deck.
      for (const side of [-1, 1]) box(15, .7, .6, '#8f8774', group, 0, -.55, -10 + side * 4.2);
    } else level.roads.forEach(([x, z, w, d], i) => box(w, .035, d, level.road, group, x, .02 + i * .004, z));
    // Lowest ground under a footprint, so buildings on a slope never float.
    const footprint = (x, z, w, d) => Math.min(heightAt(x, z), heightAt(x - w / 2, z - d / 2), heightAt(x + w / 2, z - d / 2), heightAt(x - w / 2, z + d / 2), heightAt(x + w / 2, z + d / 2));
    for (const [type, x, z, w, d, h] of level.structures) {
      obstacles.push({ x, z, w: w / 2, d: d / 2 });
      const base = level.heightAt ? footprint(x, z, w, d) - .4 : 0, top = level.heightAt ? heightAt(x, z) : 0, lift = top - base;
      if (type === 'rock') {
        const rock = new T.Mesh(new T.DodecahedronGeometry(1, 0), mat('#8e7b64'));
        rock.scale.set(w * .5, h * .64 + lift * .5, d * .5); rock.position.set(x, top + h * .43 - lift * .2, z); rock.castShadow = rock.receiveShadow = true; group.add(rock); solids.push(rock);
        // A broad base makes the collision footprint visually legible.
        const plinth = box(w, .65 + lift, d, '#a18d70', group, x, base + (.65 + lift) / 2, z); solids.push(plinth);
      } else if (type === 'silo') {
        solids.push(cyl(w / 2, w / 2, h, '#b2aa8f', group, x, top + h / 2, z));
        cyl(0, w / 2 + .3, 3, '#69746b', group, x, top + h + 1.5, z);
        for (const y of [3, h - 3]) cyl(w / 2 + .07, w / 2 + .07, .3, '#777d70', group, x, top + y, z);
      } else if (type === 'crane') {
        solids.push(box(w, 1, d, '#7c7865', group, x, top + .5, z));
        solids.push(box(1.2, h, 1.2, '#a77f43', group, x, top + h / 2, z));
        box(32, 1.1, 1.3, '#b28a4d', group, x - 10, top + h, z); box(3, 2.5, 3, '#525f57', group, x, top + h - 1, z);
        box(.12, 9, .12, '#3c453d', group, x - 22, top + h - 4.5, z);
      } else {
        solids.push(box(w, h + lift, d, level.wall, group, x, base + (h + lift) / 2, z));
        solids.push(box(w + .5, .25, d + .5, type === 'wall' ? '#b9ae92' : level.roof, group, x, top + h + .1, z));
        if (type === 'house') {
          for (let offset = -w / 2 + 1.8; offset < w / 2; offset += 3.2) {
            box(1.05, 1.5, .08, '#35473d', group, x + offset, top + 2.7, z + d / 2 + .05);
            box(1.25, .15, .18, '#cdc4a2', group, x + offset, top + 1.9, z + d / 2 + .1);
          }
          box(1.7, 2.8, .12, '#555740', group, x + w / 2 - 2, top + 1.4, z + d / 2 + .1);
          box(1.1, h + 2, 1.1, '#787d65', group, x - w / 3, top + (h + 2) / 2, z);
        }
      }
    }
    if (level.theme === 'forest' || level.theme === 'valley') {
      // Trees come in mirrored pairs, so both teams find the same cover on the flanks.
      for (let i = 0; i < 78; i++) {
        const x = (random() - .5) * 370, z = level.capture.z + random() * 185, h = 6 + random() * 8;
        if (Math.abs(x) < 68 && Math.abs(z - level.capture.z) < 115) continue;
        if (level.theme === 'forest' && (Math.abs(z - 38) < 16 || Math.abs(x) < 18)) continue;
        for (const [tx, tz] of [[x, z], IronMaps.mirror(level, x, z)]) {
          const y = heightAt(tx, tz);
          if (y < -1) continue;
          solids.push(cyl(.25, .45, h * .6, '#565944', group, tx, y + h * .3, tz, 6));
          cyl(0, h * .29, h * .75, i % 3 ? '#495f47' : '#5d714e', group, tx, y + h * .68, tz, 7);
          cyl(0, h * .22, h * .57, '#526b49', group, tx, y + h, tz, 7);
          if (Math.abs(tx) < 145 && Math.abs(tz) < 145) obstacles.push({ x: tx, z: tz, w: .65, d: .65 });
        }
      }
    } else {
      // Outer quarry benches are scenery; all drivable routes stay at the same height.
      for (let i = 0; i < 24; i++) {
        const a = i / 24 * Math.PI * 2, radius = 195 + random() * 30;
        const x = Math.cos(a) * radius, z = Math.sin(a) * radius, h = 10 + random() * 25;
        box(48, h, 42, i % 2 ? '#a59175' : '#998468', group, x, h / 2 - 2, z);
        box(38, h * .55, 34, '#b19c7b', group, x, h + h * .275 - 2, z);
      }
    }
    for (let i = 0; i < 24; i++) {
      const a = i / 24 * Math.PI * 2, r = 265 + random() * 100;
      const colors = level.theme === 'quarry' ? ['#ad9d83', '#b7a68c'] : level.theme === 'valley' ? ['#7d8c7c', '#8d9a86'] : ['#7c8870', '#8b947b'];
      const mountain = new T.Mesh(new T.ConeGeometry(65 + random() * 55, 60 + random() * 70, 5), mat(colors[i % 2]));
      mountain.position.set(Math.cos(a) * r, 14, Math.sin(a) * r); mountain.rotation.y = random() * 6; group.add(mountain);
    }
    for (let i = -150; i <= 150; i += 15) for (const [x, z] of [[i, -150], [i, 150], [-150, i], [150, i]]) {
      const y = heightAt(x, z);
      box(.4, 1.8, .4, '#c8bea1', group, x, y + .9, z); box(.44, .4, .44, '#ab7148', group, x, y + 1.45, z);
    }
    return { group, ground, solids, obstacles, dispose() { group.traverse(object => { if (object.isMesh) { object.geometry.dispose(); if (object.material.vertexColors || object.material.transparent) object.material.dispose(); } }); } };
  }
};
