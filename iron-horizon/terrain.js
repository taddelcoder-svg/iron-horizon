/* Owns only static map geometry. Switching maps disposes geometry, not shared materials. */
window.IronTerrain = {
  build(T, level, { mat, box, cyl }) {
    const group = new T.Group(), solids = [], obstacles = [];
    let seed = level.seed;
    const random = () => { seed = (1664525 * seed + 1013904223) >>> 0; return seed / 4294967296; };
    const ground = new T.Mesh(new T.PlaneGeometry(1800, 1800), mat(level.ground)); ground.rotation.x = -Math.PI / 2; ground.receiveShadow = true; group.add(ground); solids.push(ground);
    level.roads.forEach(([x, z, w, d], i) => box(w, .035, d, level.road, group, x, .02 + i * .004, z));
    for (const [type, x, z, w, d, h] of level.structures) {
      obstacles.push({ x, z, w: w / 2, d: d / 2 });
      if (type === 'rock') {
        const rock = new T.Mesh(new T.DodecahedronGeometry(1, 0), mat('#8e7b64'));
        rock.scale.set(w * .5, h * .64, d * .5); rock.position.set(x, h * .43, z); rock.castShadow = rock.receiveShadow = true; group.add(rock); solids.push(rock);
        // A broad base makes the collision footprint visually legible.
        const base = box(w, .65, d, '#a18d70', group, x, .325, z); solids.push(base);
      } else if (type === 'silo') {
        solids.push(cyl(w / 2, w / 2, h, '#b2aa8f', group, x, h / 2, z));
        cyl(0, w / 2 + .3, 3, '#69746b', group, x, h + 1.5, z);
        for (const y of [3, h - 3]) cyl(w / 2 + .07, w / 2 + .07, .3, '#777d70', group, x, y, z);
      } else if (type === 'crane') {
        solids.push(box(w, 1, d, '#7c7865', group, x, .5, z));
        solids.push(box(1.2, h, 1.2, '#a77f43', group, x, h / 2, z));
        box(32, 1.1, 1.3, '#b28a4d', group, x - 10, h, z); box(3, 2.5, 3, '#525f57', group, x, h - 1, z);
        box(.12, 9, .12, '#3c453d', group, x - 22, h - 4.5, z);
      } else {
        solids.push(box(w, h, d, level.wall, group, x, h / 2, z));
        solids.push(box(w + .5, .25, d + .5, type === 'wall' ? '#b9ae92' : level.roof, group, x, h + .1, z));
        if (type === 'house') {
          for (let offset = -w / 2 + 1.8; offset < w / 2; offset += 3.2) {
            box(1.05, 1.5, .08, '#35473d', group, x + offset, 2.7, z + d / 2 + .05);
            box(1.25, .15, .18, '#cdc4a2', group, x + offset, 1.9, z + d / 2 + .1);
          }
          box(1.7, 2.8, .12, '#555740', group, x + w / 2 - 2, 1.4, z + d / 2 + .1);
          box(1.1, h + 2, 1.1, '#787d65', group, x - w / 3, (h + 2) / 2, z);
        }
      }
    }
    if (level.theme === 'forest') {
      for (let i = 0; i < 155; i++) {
        const x = (random() - .5) * 370, z = (random() - .5) * 370;
        if (Math.abs(x) < 68 && z > -110 && z < 105) continue;
        if (Math.abs(z - 38) < 16 || Math.abs(x) < 18) continue;
        const h = 6 + random() * 8;
        solids.push(cyl(.25, .45, h * .6, '#565944', group, x, h * .3, z, 6));
        cyl(0, h * .29, h * .75, i % 3 ? '#495f47' : '#5d714e', group, x, h * .68, z, 7);
        cyl(0, h * .22, h * .57, '#526b49', group, x, h, z, 7);
        if (Math.abs(x) < 145 && Math.abs(z) < 145) obstacles.push({ x, z, w: .65, d: .65 });
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
      const mountain = new T.Mesh(new T.ConeGeometry(65 + random() * 55, 60 + random() * 70, 5), mat(level.theme === 'forest' ? (i % 2 ? '#7c8870' : '#8b947b') : (i % 2 ? '#ad9d83' : '#b7a68c')));
      mountain.position.set(Math.cos(a) * r, 14, Math.sin(a) * r); mountain.rotation.y = random() * 6; group.add(mountain);
    }
    for (let i = -150; i <= 150; i += 15) for (const [x, z] of [[i, -150], [i, 150], [-150, i], [150, i]]) {
      box(.4, 1.8, .4, '#c8bea1', group, x, .9, z); box(.44, .4, .44, '#ab7148', group, x, 1.45, z);
    }
    return { group, ground, solids, obstacles, dispose() { group.traverse(object => { if (object.isMesh) object.geometry.dispose(); }); } };
  }
};
