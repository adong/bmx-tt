/* TT BMX: everything you see. A side-on Three.js world: the dirt track cut away at the front like a side-scroller,
   grass (or sand, snow, city) behind it, scenery, a start gate and the finish arch; the riders are the kit's blocky
   boys (Kit.people) standing on little BMX bikes; Foxy and Froggy wear a fox's and a frog's head. */
(function () {
  'use strict';
  const BMX = window.BMX;
  const T = THREE;
  const G = Kit.gfx;
  const TAU = Math.PI * 2;
  const HALF = 3.4; // the track is 6.8 m wide (z), riders in lanes across it

  const THEMES = {
    park: { sky: ['#47a8ff', '#c6ecff'], fog: '#c6ecff', top: '#c07b42', side: '#8c552b', layer: '#6e3f1f', ground: '#6cc24a', ground2: '#58ad3a', far: ['#8fd06a', '#6fb455', '#4f9a44'], flag: '#ff3d7f', sun: '#fff3b0' },
    desert: { sky: ['#ff8f5a', '#ffe0a8'], fog: '#ffd8a6', top: '#e39a52', side: '#b9692f', layer: '#9a5224', ground: '#f2bd74', ground2: '#e3a65e', far: ['#e08a4e', '#c8703e', '#a85a34'], flag: '#18d4ff', sun: '#fff0c0' },
    snow: { sky: ['#7fbfff', '#eef7ff'], fog: '#eef7ff', top: '#f6faff', side: '#a7bdd6', layer: '#8aa2c0', ground: '#ffffff', ground2: '#e6eff8', far: ['#d8e6f6', '#b9cde6', '#9db6d6'], flag: '#ff4b5c', sun: '#ffffff' },
    night: { sky: ['#070b26', '#2b2a6e'], fog: '#1c1d4e', top: '#8a6aa0', side: '#3f2d58', layer: '#2f2044', ground: '#26355f', ground2: '#1f2c52', far: ['#2a3070', '#22285e', '#1a1f4c'], flag: '#ffd400', moon: true, neon: '#18d4ff' },
  };

  let renderer, scene, world, hemi, sun;
  const views = [];
  const fx = []; // particles: { obj, vx, vy, vz, life, max, spin, grav, fade }

  function init(canvas) {
    renderer = new T.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
    renderer.outputEncoding = T.sRGBEncoding;
    renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
    scene = new T.Scene();
    hemi = new T.HemisphereLight('#ffffff', '#8a7a60', 0.75);
    scene.add(hemi);
    sun = new T.DirectionalLight('#ffffff', 0.9);
    sun.position.set(-20, 40, 30);
    scene.add(sun);
    scene.add(sun.target);
    for (let i = 0; i < 2; i++) views.push({ cam: new T.PerspectiveCamera(38, 1, 0.5, 600), x: 0, y: 0, oy: 0, rect: [0, 0, 1, 1], zoom: 1 });
    return { renderer, scene };
  }

  // ---------- textures ----------
  function noiseCanvas(w, h, base, dots, fn) {
    const [c, g] = G.makeCanvas(w, h);
    g.fillStyle = base;
    g.fillRect(0, 0, w, h);
    for (const [col, n, r0, r1] of dots) {
      g.fillStyle = col;
      for (let i = 0; i < n; i++) { g.beginPath(); g.arc(Math.random() * w, Math.random() * h, r0 + Math.random() * (r1 - r0), 0, TAU); g.fill(); }
    }
    if (fn) fn(g, w, h);
    return c;
  }
  function topTexture(th) {
    const c = noiseCanvas(256, 256, th.top, [[G.shade(th.top, -0.12), 260, 1, 3], [G.shade(th.top, 0.1), 160, 1, 2.5]], (g, w, h) => {
      // tyre tracks running along the track
      g.strokeStyle = G.shade(th.top, -0.18);
      g.lineWidth = 5;
      for (const y of [70, 150, 196]) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.05 + y) * 3); g.stroke(); }
    });
    return G.toTexture(c);
  }
  function sideTexture(th) {
    const c = noiseCanvas(256, 256, th.side, [[G.shade(th.side, -0.15), 120, 2, 6], [G.shade(th.side, 0.12), 60, 2, 5]], (g, w, h) => {
      g.fillStyle = th.layer;
      for (let y = 40; y < h; y += 70) { g.beginPath(); g.moveTo(0, y); for (let x = 0; x <= w; x += 16) g.lineTo(x, y + Math.sin(x * 0.04 + y) * 6); g.lineTo(w, y + 22); g.lineTo(0, y + 22); g.fill(); }
      g.fillStyle = '#d8d0c8';
      for (let i = 0; i < 14; i++) { g.beginPath(); g.ellipse(Math.random() * w, Math.random() * h, 5 + Math.random() * 6, 3 + Math.random() * 4, 0, 0, TAU); g.fill(); }
    });
    return G.toTexture(c);
  }
  function skyTexture(th) {
    const [c, g] = G.makeCanvas(4, 256);
    const gr = g.createLinearGradient(0, 0, 0, 256);
    gr.addColorStop(0, th.sky[0]);
    gr.addColorStop(1, th.sky[1]);
    g.fillStyle = gr;
    g.fillRect(0, 0, 4, 256);
    return G.toTexture(c);
  }

  // ---------- the world for one track ----------
  function setTrack(trk) {
    if (world) { scene.remove(world); world.traverse((o) => { if (o.geometry) o.geometry.dispose(); }); }
    world = new T.Group();
    scene.add(world);
    const th = THEMES[trk.theme];
    scene.background = skyTexture(th);
    scene.fog = new T.Fog(th.fog, 70, 260);
    hemi.intensity = th.moon ? 0.55 : 0.75;
    sun.intensity = th.moon ? 0.45 : 0.9;
    sun.color.set(th.moon ? '#9fb0ff' : '#ffffff');
    const DX = 0.25, n = Math.ceil(trk.len / DX) + 1;
    const xs = [], hs = [];
    for (let i = 0; i < n; i++) { const x = Math.min(trk.len, i * DX); xs.push(x); hs.push(trk.heightAt(x)); }
    // a heavily smoothed profile for the ground behind the track
    const sm = (x) => { let s = 0, k = 0; for (let d = -24; d <= 24; d += 4) { s += trk.heightAt(Math.max(0, Math.min(trk.len, x + d))); k++; } return s / k; };
    const bottom = trk.minY - 16;

    // top of the dirt
    {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i < n; i++) {
        pos.push(xs[i], hs[i], HALF, xs[i], hs[i], -HALF);
        uv.push(xs[i] / 5, 0, xs[i] / 5, 1.36);
      }
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a, a + 2, a + 1, a + 1, a + 2, a + 3); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const tex = topTexture(th);
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      world.add(new T.Mesh(geo, new T.MeshLambertMaterial({ map: tex })));
    }
    // the cut-away front of the dirt
    {
      const pos = [], uv = [], idx = [];
      for (let i = 0; i < n; i++) {
        pos.push(xs[i], hs[i], HALF, xs[i], bottom, HALF);
        uv.push(xs[i] / 6, hs[i] / 6, xs[i] / 6, bottom / 6);
      }
      for (let i = 0; i < n - 1; i++) { const a = i * 2; idx.push(a + 1, a + 3, a, a, a + 3, a + 2); }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('uv', new T.Float32BufferAttribute(uv, 2));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      const tex = sideTexture(th);
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      world.add(new T.Mesh(geo, new T.MeshLambertMaterial({ map: tex })));
      // a lighter lip along the top front edge (neon at night)
      const lp = [], li = [];
      for (let i = 0; i < n; i++) lp.push(xs[i], hs[i] + 0.02, HALF + 0.03, xs[i], hs[i] - 0.16, HALF + 0.03);
      for (let i = 0; i < n - 1; i++) { const a = i * 2; li.push(a + 1, a + 3, a, a, a + 3, a + 2); }
      const lg = new T.BufferGeometry();
      lg.setAttribute('position', new T.Float32BufferAttribute(lp, 3));
      lg.setIndex(li);
      world.add(new T.Mesh(lg, new T.MeshBasicMaterial({ color: th.neon || G.shade(th.top, 0.25), fog: !th.neon })));
    }
    // the ground behind: rows going back and up into hills
    {
      const rows = [[-HALF, -0.3], [-8, -0.4], [-18, 0], [-34, 1.5], [-60, 5], [-100, 12], [-170, 24]];
      const x0 = -80, x1 = trk.len + 80, step = 1;
      const cols = Math.ceil((x1 - x0) / step) + 1;
      const pos = [], col = [], idx = [];
      const c1 = new T.Color(th.ground), c2 = new T.Color(th.ground2), tmp = new T.Color();
      for (let r = 0; r < rows.length; r++) {
        for (let i = 0; i < cols; i++) {
          const x = x0 + i * step, xc = Math.max(0, Math.min(trk.len, x));
          const s = sm(xc);
          let y = r === 0 ? Math.min(trk.heightAt(xc), s) + rows[0][1] : s + rows[r][1] + (r > 2 ? Math.sin(x * 0.05 + r * 2) * r * 0.8 : 0);
          pos.push(x, y, rows[r][0]);
          tmp.copy(c1).lerp(c2, (Math.sin(x * 0.3 + r * 1.7) * 0.5 + 0.5) * 0.8);
          col.push(tmp.r, tmp.g, tmp.b);
        }
      }
      for (let r = 0; r < rows.length - 1; r++) for (let i = 0; i < cols - 1; i++) {
        const a = r * cols + i, b = a + 1, c = a + cols, d = c + 1;
        idx.push(a, b, c, c, b, d);
      }
      const geo = new T.BufferGeometry();
      geo.setAttribute('position', new T.Float32BufferAttribute(pos, 3));
      geo.setAttribute('color', new T.Float32BufferAttribute(col, 3));
      geo.setIndex(idx);
      geo.computeVertexNormals();
      world.add(new T.Mesh(geo, new T.MeshLambertMaterial({ vertexColors: true })));
    }
    // far mountains: flat silhouettes in three bands
    th.far.forEach((c, k) => {
      const shape = new T.Shape();
      const z = -210 - k * 40, span = trk.len + 600;
      shape.moveTo(-300, -60);
      for (let x = -300; x <= span; x += 30) shape.lineTo(x, 20 + k * 6 + Math.abs(Math.sin(x * 0.013 + k * 2.1)) * (30 + k * 10) + Math.sin(x * 0.041) * 8);
      shape.lineTo(span, -60);
      const m = new T.Mesh(new T.ShapeGeometry(shape), new T.MeshBasicMaterial({ color: c, fog: false }));
      m.position.set(0, trk.minY - 10, z);
      world.add(m);
    });
    // sun or moon, clouds or stars
    const disc = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: th.moon ? '#f4f0ff' : th.sun, fog: false, depthWrite: false }));
    disc.scale.set(60, 60, 1);
    disc.userData.sky = { dx: 50, dy: 38, z: -300 };
    world.add(disc);
    world.userData.sky = [disc];
    if (th.moon) {
      const pts = [];
      for (let i = 0; i < 400; i++) pts.push(-200 + Math.random() * (trk.len + 400), trk.minY + 20 + Math.random() * 120, -320 + Math.random() * 40);
      const g = new T.BufferGeometry();
      g.setAttribute('position', new T.Float32BufferAttribute(pts, 3));
      world.add(new T.Points(g, new T.PointsMaterial({ color: '#ffffff', size: 1.4, fog: false })));
    } else {
      const cloudTex = G.radialTexture(64, [[0, 'rgba(255,255,255,0.95)'], [0.6, 'rgba(255,255,255,0.7)'], [1, 'rgba(255,255,255,0)']]);
      for (let x = -100; x < trk.len + 150; x += 40 + Math.random() * 40) {
        const grp = new T.Group();
        for (let j = 0; j < 4; j++) {
          const s = new T.Sprite(new T.SpriteMaterial({ map: cloudTex, fog: false, depthWrite: false }));
          s.position.set(j * 7 - 10, Math.random() * 3, 0);
          s.scale.set(16 + Math.random() * 8, 10 + Math.random() * 4, 1);
          grp.add(s);
        }
        grp.position.set(x, trk.minY + 40 + Math.random() * 40, -180);
        world.add(grp);
      }
    }
    scenery(trk, th, sm);
    gateAndFinish(trk, th);
  }

  // ---------- scenery behind the track ----------
  const lam = (c, o) => new T.MeshLambertMaterial(Object.assign({ color: c }, o));
  function scenery(trk, th, sm) {
    const grp = new T.Group();
    world.add(grp);
    const R = BMX.sim.rng(trk.len * 1000 | 0);
    const groundY = (x, z) => { const s = sm(Math.max(0, Math.min(trk.len, x))); return z > -8 ? Math.min(trk.heightAt(Math.max(0, Math.min(trk.len, x))), s) - 0.35 : z > -18 ? s - 0.3 : s; };
    const put = (o, x, z) => { o.position.set(x, groundY(x, z), z); grp.add(o); return o; };
    const M = {
      trunk: lam('#7a4a26'), leaf: lam('#3f9e3a'), leaf2: lam('#58b84a'), cactus: lam('#3f9a4a'), rock: lam('#b07a50'), rock2: lam('#8e6040'),
      pine: lam('#2f7a4a'), snow: lam('#ffffff'), carrot: lam('#ff8a1f'), coal: lam('#22212a'), hay: lam('#e8c060'), tyre: lam('#22212a'),
      bld: [lam('#2c2f60'), lam('#3a2f66'), lam('#24406a')], lamp: lam('#5a5f80'),
    };
    const box = (w, h, d, m, x, y, z, p) => { const o = new T.Mesh(new T.BoxGeometry(w, h, d), m); o.position.set(x, y, z); p.add(o); return o; };
    const tree = () => {
      const g = new T.Group();
      box(0.5, 2.4, 0.5, M.trunk, 0, 1.2, 0, g);
      const a = new T.Mesh(new T.IcosahedronGeometry(1.8, 0), M.leaf); a.position.y = 3.4; g.add(a);
      const b = new T.Mesh(new T.IcosahedronGeometry(1.3, 0), M.leaf2); b.position.set(0.8, 4.3, 0.3); g.add(b);
      return g;
    };
    const cactus = () => {
      const g = new T.Group();
      const h = 2.5 + R() * 2;
      box(0.6, h, 0.6, M.cactus, 0, h / 2, 0, g);
      for (const s of [-1, 1]) if (R() < 0.8) { const y = h * (0.4 + R() * 0.3); box(0.8, 0.4, 0.4, M.cactus, s * 0.6, y, 0, g); box(0.4, 1.2, 0.4, M.cactus, s * 0.9, y + 0.6, 0, g); }
      return g;
    };
    const pine = () => {
      const g = new T.Group();
      box(0.4, 1.2, 0.4, M.trunk, 0, 0.6, 0, g);
      for (let k = 0; k < 3; k++) {
        const c = new T.Mesh(new T.ConeGeometry(1.8 - k * 0.45, 1.8, 7), M.pine); c.position.y = 1.6 + k * 1.1; g.add(c);
        const s = new T.Mesh(new T.ConeGeometry(0.9 - k * 0.22, 0.7, 7), M.snow); s.position.y = 2.2 + k * 1.1; g.add(s);
      }
      return g;
    };
    const snowman = () => {
      const g = new T.Group();
      for (const [r, y] of [[0.8, 0.7], [0.6, 1.8], [0.42, 2.6]]) { const s = new T.Mesh(new T.IcosahedronGeometry(r, 1), M.snow); s.position.y = y; g.add(s); }
      const n = new T.Mesh(new T.ConeGeometry(0.09, 0.45, 6), M.carrot); n.rotation.x = Math.PI / 2; n.position.set(0, 2.6, 0.5); g.add(n);
      for (const s of [-1, 1]) box(0.08, 0.08, 0.05, M.coal, s * 0.15, 2.72, 0.38, g);
      return g;
    };
    const building = () => {
      const g = new T.Group();
      const w = 6 + R() * 6, h = 8 + R() * 18, d = 6;
      const [c, cx] = G.makeCanvas(64, 128);
      cx.fillStyle = '#1a1c40'; cx.fillRect(0, 0, 64, 128);
      for (let y = 6; y < 124; y += 12) for (let x = 5; x < 60; x += 12) { cx.fillStyle = R() < 0.55 ? ['#ffe27a', '#ffd400', '#7ef2ff', '#ff9ad0'][(R() * 4) | 0] : '#2a2c55'; cx.fillRect(x, y, 7, 7); }
      const tex = G.toTexture(c);
      tex.wrapS = tex.wrapT = T.RepeatWrapping;
      tex.repeat.set(w / 6, h / 12);
      const m = new T.MeshBasicMaterial({ map: tex });
      box(w, h, d, [M.bld[(R() * 3) | 0], M.bld[0], M.bld[0], M.bld[0], m, M.bld[0]], 0, h / 2, 0, g);
      return g;
    };
    const lampPost = () => {
      const g = new T.Group();
      box(0.18, 4, 0.18, M.lamp, 0, 2, 0, g);
      const glow = new T.Sprite(new T.SpriteMaterial({ map: G.glowTexture(), color: '#ffe9a0', depthWrite: false, transparent: true }));
      glow.position.y = 4.1; glow.scale.set(2.4, 2.4, 1); g.add(glow);
      box(0.5, 0.25, 0.5, lam('#fff4c0', { emissive: '#fff0a0' }), 0, 4.05, 0, g);
      return g;
    };
    const rock = () => { const r = new T.Mesh(new T.DodecahedronGeometry(0.6 + R() * 1.4, 0), R() < 0.5 ? M.rock : M.rock2); r.position.y = 0.3; r.rotation.set(R(), R(), R()); const g = new T.Group(); g.add(r); return g; };
    const mesa = () => { const g = new T.Group(); const w = 14 + R() * 20, h = 8 + R() * 10; box(w, h, 10, M.rock, 0, h / 2, 0, g); box(w * 0.8, 2, 8, M.rock2, 0, h + 1, 0, g); return g; };
    for (let x = -40; x < trk.len + 40; x += 4 + R() * 7) {
      const z = -(6 + R() * 22);
      if (th === THEMES.park) put(R() < 0.75 ? tree() : rock(), x, z).scale.setScalar(0.8 + R() * 0.6);
      else if (th === THEMES.desert) put(R() < 0.65 ? cactus() : rock(), x, z);
      else if (th === THEMES.snow) put(R() < 0.8 ? pine() : snowman(), x, z).scale.setScalar(0.8 + R() * 0.5);
      else put(R() < 0.7 ? building() : lampPost(), x, z - (R() < 0.7 ? 10 : 0));
    }
    if (th === THEMES.desert) for (let x = -60; x < trk.len + 60; x += 30 + R() * 40) put(mesa(), x, -70 - R() * 40);
    if (th === THEMES.night) for (let x = -60; x < trk.len + 60; x += 9 + R() * 8) put(building(), x, -50 - R() * 30).scale.setScalar(1.4);
    // little flags on the back edge at every lip, hay bales (or tyres) by the drops
    const flagMat = new T.MeshLambertMaterial({ color: th.flag, side: T.DoubleSide }), pole = lam('#f4f4f4');
    for (const f of trk.feats) {
      if (f.lip == null) continue;
      const x = f.lip, y = trk.heightAt(x);
      const g = new T.Group();
      box(0.08, 1.6, 0.08, pole, 0, 0.8, 0, g);
      const sh = new T.Shape(); sh.moveTo(0, 0); sh.lineTo(0.8, -0.25); sh.lineTo(0, -0.5);
      const fl = new T.Mesh(new T.ShapeGeometry(sh), flagMat); fl.position.set(0.04, 1.6, 0); g.add(fl);
      g.position.set(x, y, -HALF + 0.2);
      grp.add(g);
      if (f.type === 'drop' || f.type === 'double') {
        const hb = new T.Mesh(th === THEMES.night ? new T.CylinderGeometry(0.45, 0.45, 0.35, 12) : new T.BoxGeometry(1.1, 0.6, 0.7), th === THEMES.night ? M.tyre : M.hay);
        hb.position.set(x + 1.2, trk.heightAt(x + 1.2) - 0.1, -HALF - 0.4);
        grp.add(hb);
      }
    }
  }

  // ---------- the start gate (with the game's name on it) and the finish arch ----------
  let gateBar = null;
  function gateAndFinish(trk, th) {
    const steel = lam('#d8dde6'), dark = lam('#2a2c3a');
    const gx = trk.gateX, gy = trk.heightAt(gx);
    // the gate: a striped board that tips forward at GO
    const [c, g] = G.makeCanvas(256, 32);
    for (let i = 0; i < 16; i++) { g.fillStyle = i % 2 ? '#14121f' : '#ffd400'; g.beginPath(); g.moveTo(i * 16, 32); g.lineTo(i * 16 + 16, 32); g.lineTo(i * 16 + 32, 0); g.lineTo(i * 16 + 16, 0); g.fill(); }
    const bar = new T.Group();
    const board = new T.Mesh(new T.BoxGeometry(0.08, 0.6, HALF * 2), [steel, steel, steel, steel, new T.MeshLambertMaterial({ map: G.toTexture(c) }), steel]);
    board.position.y = 0.3;
    bar.add(board);
    bar.position.set(gx, gy, 0);
    world.add(bar);
    gateBar = bar;
    // the frame over the gate with the title
    for (const z of [-HALF - 0.1, HALF + 0.1]) { const p = new T.Mesh(new T.BoxGeometry(0.25, 4.2, 0.25), dark); p.position.set(gx - 1.6, gy + 2.1, z); world.add(p); }
    const [c2, g2] = G.makeCanvas(512, 96);
    g2.fillStyle = '#14121f'; g2.fillRect(0, 0, 512, 96);
    g2.fillStyle = '#ffd400'; g2.fillRect(6, 6, 500, 84);
    g2.fillStyle = '#14121f';
    g2.font = `56px ${G.FONT}`; g2.textAlign = 'center'; g2.textBaseline = 'middle';
    g2.fillText(BMX.TITLE.toUpperCase(), 256, 52); // the game's name stays as it is in both languages
    const banner = new T.Mesh(new T.BoxGeometry(0.2, 1.0, HALF * 2 + 0.6), [dark, dark, dark, dark, new T.MeshBasicMaterial({ map: G.toTexture(c2) }), dark]);
    banner.position.set(gx - 1.6, gy + 4.4, 0);
    banner.rotation.y = 0;
    world.add(banner);
    // the start hill platform's back wall
    const wall = new T.Mesh(new T.BoxGeometry(6, 3, HALF * 2), lam(G.shade(th.side, -0.1)));
    wall.position.set(-2.4, gy - 1.5 + 0.01, 0);
    world.add(wall);
    // the finish: a checkered arch (no words on it, so it needs no translating)
    const fx0 = trk.finishX, fy = trk.heightAt(fx0);
    const [c3, g3] = G.makeCanvas(256, 64);
    for (let y = 0; y < 4; y++) for (let x = 0; x < 16; x++) { g3.fillStyle = (x + y) % 2 ? '#14121f' : '#ffffff'; g3.fillRect(x * 16, y * 16, 16, 16); }
    const chk = new T.MeshBasicMaterial({ map: G.toTexture(c3) });
    for (const z of [-HALF - 0.2, HALF + 0.2]) { const p = new T.Mesh(new T.BoxGeometry(0.3, 4.6, 0.3), lam('#ff3d7f')); p.position.set(fx0, fy + 2.3, z); world.add(p); }
    const top = new T.Mesh(new T.BoxGeometry(0.3, 1.0, HALF * 2 + 0.7), [chk, chk, chk, chk, chk, chk]);
    top.position.set(fx0, fy + 4.6, 0);
    world.add(top);
    const line = new T.Mesh(new T.PlaneGeometry(0.5, HALF * 2), chk);
    line.rotation.x = -Math.PI / 2; line.rotation.z = Math.PI / 2;
    line.position.set(fx0, fy + 0.02, 0);
    world.add(line);
    for (const z of [-HALF - 0.2, HALF + 0.2]) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture('🏁'), depthWrite: false }));
      s.position.set(fx0, fy + 5.6, z); s.scale.set(1.2, 1.2, 1); world.add(s);
    }
  }
  function setGate(open) { if (gateBar) gateBar.rotation.z += ((open ? -Math.PI / 2 : 0) - gateBar.rotation.z) * 0.25; }

  // ---------- riders on bikes ----------
  const LOOKS = {
    foxy: { head: 'human', skin: '#ff8a3c', top: '#2f6bff', bottom: '#1d2a55', shoes: '#14121f', shirt: 'jacket', print: 'star' },
    froggy: { head: 'human', skin: '#69c94e', top: '#ffd400', bottom: '#2f7d4f', shoes: '#14121f', shirt: 'jacket', print: 'bolt' },
  };
  const FRAMES = { teddy: '#e8382f', tommy: '#ff8a1f', foxy: '#2fd0ff', froggy: '#9b6bff' };
  const TAGS = { teddy: '#8cc2ff', tommy: '#ffb02e', foxy: '#ffb27a', froggy: '#a6f08a' };
  const NAMES = { teddy: 'TEDDY', tommy: 'TOMMY', foxy: 'FOXY', froggy: 'FROGGY' };

  // a fox's or a frog's head in place of the boy's (same size, facing -z like the body)
  function animalHead(kind, head) {
    head.children.forEach((c) => { c.visible = false; });
    const fur = G.std(kind === 'foxy' ? '#ff8a3c' : '#69c94e'), dark = G.std('#1b1a22'), white = G.std('#ffffff');
    const box = (w, h, d, m, x, y, z) => G.mesh(new T.BoxGeometry(w, h, d), m, x, y, z, head, false);
    box(0.54, 0.48, 0.48, fur, 0, 0, 0);
    for (const s of [-1, 1]) {
      box(0.08, 0.1, 0.03, dark, s * 0.12, 0.06, -0.25);
      box(0.03, 0.03, 0.02, white, s * 0.1, 0.09, -0.27);
      if (kind === 'foxy') {
        box(0.17, 0.17, 0.07, fur, s * 0.19, 0.27, 0).rotation.z = Math.PI / 4;
        box(0.09, 0.09, 0.02, dark, s * 0.19, 0.27, -0.04).rotation.z = Math.PI / 4;
      } else {
        box(0.17, 0.13, 0.17, fur, s * 0.15, 0.27, -0.06);
        box(0.08, 0.08, 0.03, dark, s * 0.15, 0.29, -0.15);
        box(0.035, 0.035, 0.02, white, s * 0.14, 0.31, -0.17);
      }
    }
    if (kind === 'foxy') {
      box(0.24, 0.16, 0.14, G.std('#fff1e0'), 0, -0.1, -0.29);
      box(0.08, 0.06, 0.04, dark, 0, -0.05, -0.37);
    } else box(0.36, 0.04, 0.02, G.std('#2a6a1f'), 0, -0.12, -0.245);
    // a helmet strap look: a little cap on top
    box(0.58, 0.1, 0.52, G.std('#14121f'), 0, 0.22, 0.02);
  }

  function rod(x1, y1, x2, y2, t, m, z, p) {
    const len = Math.hypot(x2 - x1, y2 - y1);
    const o = new T.Mesh(new T.BoxGeometry(len, t, t), m);
    o.position.set((x1 + x2) / 2, (y1 + y2) / 2, z || 0);
    o.rotation.z = Math.atan2(y2 - y1, x2 - x1);
    p.add(o);
    return o;
  }

  const WR = 0.38, AXR = -0.58, AXF = 0.6;
  function makeBike(color) {
    const bike = new T.Group();
    const fr = G.std(color, { metalness: 0.3, roughness: 0.4 }), blk = G.std('#1b1a22'), chrome = G.std('#e8ecf2', { metalness: 0.6, roughness: 0.3 });
    const wheels = [];
    for (const ax of [AXR, AXF]) {
      const w = new T.Group();
      w.position.set(ax, WR, 0);
      w.add(new T.Mesh(new T.TorusGeometry(WR - 0.05, 0.055, 6, 20), blk));
      w.add(new T.Mesh(new T.TorusGeometry(WR - 0.11, 0.02, 4, 18), chrome));
      for (let k = 0; k < 3; k++) { const s = new T.Mesh(new T.BoxGeometry(0.03, (WR - 0.1) * 2, 0.02), chrome); s.rotation.z = (k * Math.PI) / 3; w.add(s); }
      const hub = new T.Mesh(new T.CylinderGeometry(0.05, 0.05, 0.16, 8), chrome); hub.rotation.x = Math.PI / 2; w.add(hub);
      const peg = new T.Mesh(new T.CylinderGeometry(0.035, 0.035, 0.34, 6), chrome); peg.rotation.x = Math.PI / 2; w.add(peg);
      bike.add(w);
      wheels.push(w);
    }
    const BB = [-0.02, 0.33], S = [-0.24, 0.78], H = [0.42, 0.86], Hb = [0.47, 0.7];
    rod(S[0], S[1], H[0], H[1], 0.07, fr, 0, bike);
    rod(Hb[0], Hb[1], BB[0], BB[1], 0.08, fr, 0, bike);
    rod(BB[0], BB[1], S[0], S[1], 0.07, fr, 0, bike);
    for (const z of [-0.07, 0.07]) { rod(BB[0], BB[1], AXR, WR, 0.045, fr, z, bike); rod(S[0], S[1], AXR, WR, 0.04, fr, z, bike); rod(Hb[0], Hb[1], AXF, WR, 0.045, chrome, z, bike); }
    rod(H[0], H[1], Hb[0], Hb[1], 0.09, fr, 0, bike);
    rod(S[0], S[1], -0.28, 0.9, 0.04, chrome, 0, bike);
    const seat = new T.Mesh(new T.BoxGeometry(0.3, 0.06, 0.14), blk); seat.position.set(-0.28, 0.93, 0); bike.add(seat);
    // bars: stem, cross bar, grips
    rod(H[0], H[1], 0.38, 1.06, 0.05, chrome, 0, bike);
    const bars = new T.Group(); bars.position.set(0.38, 1.06, 0); bike.add(bars);
    const cb = new T.Mesh(new T.BoxGeometry(0.04, 0.04, 0.66), chrome); bars.add(cb);
    for (const z of [-0.3, 0.3]) { const gp = new T.Mesh(new T.BoxGeometry(0.06, 0.06, 0.12), blk); gp.position.z = z; bars.add(gp); }
    // cranks and pedals
    const crank = new T.Group(); crank.position.set(BB[0], BB[1], 0); bike.add(crank);
    const ring = new T.Mesh(new T.CylinderGeometry(0.1, 0.1, 0.03, 12), chrome); ring.rotation.x = Math.PI / 2; ring.position.z = 0.1; crank.add(ring);
    for (const s of [-1, 1]) {
      const arm = new T.Mesh(new T.BoxGeometry(0.04, 0.2, 0.03), chrome); arm.position.set(0, s * 0.1, s * 0.13); crank.add(arm);
      const ped = new T.Mesh(new T.BoxGeometry(0.14, 0.03, 0.12), blk); ped.position.set(0, s * 0.2, s * 0.2); crank.add(ped);
    }
    return { bike, wheels, crank, bars };
  }

  function makeRider(id, o) {
    o = o || {};
    const entry = Kit.roster.get(id) || {};
    const look = LOOKS[id] || entry.look;
    const g = new T.Group();       // on the ground point, turned to the slope / the flight
    const tilt = new T.Group();    // tabletop and tailwhip turn the bike in here
    g.add(tilt);
    const b = makeBike(FRAMES[id] || '#18d4ff');
    tilt.add(b.bike);
    const p = Kit.people.build(Object.assign({}, look, { peace: true }));
    if (LOOKS[id]) animalHead(id, p.head);
    const body = new T.Group(); // the rider stands on the pedals; body moves him for superman / crashes / celebrations
    body.position.set(-0.06, 0.36, 0);
    g.add(body);
    p.root.rotation.y = -Math.PI / 2;
    p.root.scale.setScalar(0.74);
    body.add(p.root);
    // a blob shadow under the bike
    const shadow = new T.Mesh(new T.CircleGeometry(0.9, 16), new T.MeshBasicMaterial({ color: '#000000', transparent: true, opacity: 0.22, depthWrite: false }));
    shadow.rotation.x = -Math.PI / 2;
    shadow.scale.y = 0.45;
    let tag = null;
    if (o.tag !== false) {
      tag = G.nameTag(NAMES[id] || id.toUpperCase(), TAGS[id] || '#ffffff');
      tag.position.set(0, 2.25, 0);
      tag.scale.multiplyScalar(0.6);
      g.add(tag);
    }
    const m = { id, g, tilt, body, p, b, shadow, tag, ph: 0, wheelA: 0, crankA: 0, pitch: 0, spin: 0, scale: o.scale || 1, celebrate: null };
    g.scale.setScalar(m.scale);
    scene.add(g);
    scene.add(shadow);
    return m;
  }
  function removeRider(m) { if (!m) return; scene.remove(m.g); scene.remove(m.shadow); }

  // the riding pose: standing on the pedals, hands on the bars
  function ridePose(m, k, crankA, extra) {
    const p = m.p, e = extra || {};
    const to = (o, prop, v) => { o[prop] += (v - o[prop]) * k; };
    const lean = e.lean != null ? e.lean : -0.55;
    const s = Math.sin(crankA) * (e.pedal ? 0.28 : 0.08);
    to(p.hips.rotation, 'x', lean);
    to(p.hips.rotation, 'y', 0);
    to(p.legL.rotation, 'x', e.legL != null ? e.legL : -lean + 0.35 + s);
    to(p.legR.rotation, 'x', e.legR != null ? e.legR : -lean - 0.25 - s);
    to(p.legL.rotation, 'z', e.legLz || 0);
    to(p.legR.rotation, 'z', 0);
    to(p.armL.rotation, 'x', e.arms != null ? e.arms : 0.72 - lean);
    to(p.armR.rotation, 'x', e.arms != null ? e.arms : 0.72 - lean);
    to(p.armL.rotation, 'z', -(e.armsOut || 0));
    to(p.armR.rotation, 'z', e.armsOut || 0);
    to(p.head.rotation, 'x', e.head != null ? e.head : 0.25);
    p.hips.position.y = p.hipY;
    if (p.fingers) for (const f of p.fingers) f.visible = !!e.peace;
    p.rig.scale.setScalar(1);
  }

  // put a model where the sim says, and animate it. r: the sim rider; z: its lane
  function place(m, r, trk, dt, z) {
    const k = 1 - Math.exp(-14 * dt);
    let x = r.x, y = r.y, pitch;
    if (r.ground || r.crashT > 0) {
      // both wheels on the dirt
      const yr = trk.heightAt(x + AXR), yf = trk.heightAt(x + AXF);
      pitch = Math.atan2(yf - yr, AXF - AXR);
      y = Math.max(r.y, (yr + yf) / 2);
    } else pitch = r.ang;
    // the pitch follows flips exactly in the air, eases on the ground
    if (r.ground && r.crashT <= 0) { let d = pitch - m.pitch; d = Math.atan2(Math.sin(d), Math.cos(d)); m.pitch += d * Math.min(1, 20 * dt); } else m.pitch = pitch;
    m.g.position.set(x, y, z);
    m.g.rotation.z = m.pitch;
    const dist = Math.abs(r.ground ? r.v : r.vx) * dt;
    m.wheelA -= dist / WR;
    for (const w of m.b.wheels) w.rotation.z = m.wheelA;
    if (r.pedal) m.crankA -= dt * Math.max(4, r.v * 1.4);
    m.b.crank.rotation.z = m.crankA;
    // tricks
    const tr = r.trick, tp = tr ? Math.min(1, tr.t / tr.dur) : 0, e = tr ? Math.sin(Math.PI * tp) : 0;
    m.tilt.rotation.set(0, 0, 0);
    m.body.position.set(-0.06, 0.36, 0);
    m.body.rotation.set(0, 0, 0);
    const extra = { pedal: !!r.pedal && r.ground };
    if (r.crashT > 0) {
      // the bike lies down, the rider tumbles off ahead of it
      const c = 1 - r.crashT / 1.4;
      m.tilt.rotation.x = Math.min(1, c * 5) * 1.45;
      m.body.position.set(0.4 + c * 1.6, 0.25 + Math.sin(Math.min(1, c * 2) * Math.PI) * 0.6 - c * 0.15, 0.4);
      m.body.rotation.z = -Math.min(1, c * 1.6) * Math.PI * 1.5;
      Kit.people.pose(m.p, r.crashT * 10, c < 0.7 ? 'roll' : 'fall', k);
    } else {
      if (tr) {
        if (tr.id === 'NO HANDS') { extra.arms = 1.27 + e * 1.6; extra.armsOut = e * 0.7; }
        else if (tr.id === 'SUPERMAN') { m.body.position.x -= e * 0.55; m.body.position.y += e * 0.42; extra.lean = -0.55 - e * 0.7; extra.legL = extra.legR = 0.5 - e * 1.6; extra.arms = 1.27 + e * 0.8; extra.head = 0.25 + e * 0.4; }
        else if (tr.id === 'CAN-CAN') { extra.legLz = -e * 1.0; extra.legL = 0.8 + e * 0.6; }
        else if (tr.id === 'TABLETOP') { m.tilt.rotation.x = -e * 1.2; m.body.rotation.x = -e * 0.35; }
        else if (tr.id === 'TAILWHIP') { m.tilt.rotation.y = tp * TAU; m.body.position.y += e * 0.2; }
      }
      if (r.peace) { extra.arms = 3.0; extra.armsOut = 0.55; extra.peace = true; }
      if (r.highFive) { m.p.armR.rotation.x += (3.0 - m.p.armR.rotation.x) * k; }
      ridePose(m, tr ? 1 - Math.exp(-30 * dt) : k, m.crankA, extra);
      if (r.highFive) { m.p.armR.rotation.x = 3.0; m.p.armR.rotation.z = 0.3; }
    }
    // shadow on the dirt below
    const gy = trk.heightAt(x);
    const hgt = Math.max(0, r.y - gy);
    m.shadow.position.set(x, gy + 0.03, z);
    const ss = Math.max(0.3, 1 - hgt * 0.12) * m.scale;
    m.shadow.scale.set(ss, ss * 0.45, 1);
    m.shadow.material.opacity = 0.22 * Math.max(0.2, 1 - hgt * 0.15);
    m.shadow.rotation.set(-Math.PI / 2, 0, 0);
  }

  // the winner's celebration: off the bike, facing you, doing his move (Teddy: boxing then a jump shot; Tommy: Y)
  function celebrate(m, t, dt, mode) {
    const k = 1 - Math.exp(-14 * dt);
    m.g.rotation.z = 0;
    m.tilt.rotation.set(0, 0, 0);
    m.body.position.set(1.1, 0, 1.0);
    m.body.rotation.set(0, Math.PI / 2 + 0.25, 0); // turn the boy (who faces +x on the bike) to face the camera
    let pose = mode;
    let jump = 0;
    if (mode === 'jumpshot') { const c = (t % 1.4) / 1.4; jump = Math.max(0, Math.sin(c * Math.PI)) * 0.9; }
    m.body.position.y = jump;
    Kit.people.pose(m.p, t * 6, pose, k);
    return jump;
  }

  // ---------- particles ----------
  const dotTex = () => (dotTex.t = dotTex.t || G.dotTexture());
  function puff(x, y, z, color, n, spread) {
    for (let i = 0; i < n; i++) {
      const s = new T.Sprite(new T.SpriteMaterial({ map: dotTex(), color, transparent: true, depthWrite: false, opacity: 0.8 }));
      s.position.set(x + (Math.random() - 0.5) * 0.6, y + 0.15, z + (Math.random() - 0.5) * 1.2);
      const sc = 0.4 + Math.random() * 0.5; s.scale.set(sc, sc, 1);
      scene.add(s);
      fx.push({ obj: s, vx: (Math.random() - 0.5) * (spread || 3), vy: 0.6 + Math.random() * 1.6, vz: (Math.random() - 0.5) * 1.5, life: 0, max: 0.5 + Math.random() * 0.4, grav: 1, grow: 1.8, fade: true });
    }
  }
  function confetti(x, y, z, n) {
    const cols = ['#ffd400', '#ff3d7f', '#18d4ff', '#7dff5a', '#ff8a1f', '#9b6bff', '#ffffff'];
    for (let i = 0; i < n; i++) {
      const s = new T.Mesh(new T.PlaneGeometry(0.16, 0.26), new T.MeshBasicMaterial({ color: cols[i % cols.length], side: T.DoubleSide, transparent: true }));
      s.position.set(x + (Math.random() - 0.5) * 2, y + 1.5, z + (Math.random() - 0.5) * 2);
      scene.add(s);
      fx.push({ obj: s, vx: (Math.random() - 0.5) * 7, vy: 5 + Math.random() * 6, vz: (Math.random() - 0.5) * 5, life: 0, max: 2.6 + Math.random(), grav: 5, spin: [Math.random() * 8, Math.random() * 8], drag: 1.6, fade: true });
    }
  }
  function sprite(emoji, x, y, z, size) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: G.emojiTexture(emoji), depthWrite: false, transparent: true }));
    s.position.set(x, y, z);
    s.scale.set(size, size, 1);
    scene.add(s);
    return s;
  }
  function drop(o) { scene.remove(o); if (o.material) { o.material.dispose(); } if (o.geometry && !(o instanceof T.Sprite)) o.geometry.dispose(); }
  // a thing flying from A to B in an arc (the treat), then gone
  function toss(emoji, from, to, dur, onLand) {
    const s = sprite(emoji, from.x, from.y, from.z, 0.8);
    fx.push({ obj: s, arc: { from, to, dur }, life: 0, max: dur, onLand });
  }
  function streak(x, y, z) {
    const s = new T.Sprite(new T.SpriteMaterial({ map: dotTex(), color: '#fff6a0', transparent: true, depthWrite: false, opacity: 0.9 }));
    s.position.set(x - 0.3 - Math.random() * 0.5, y + 0.3 + Math.random() * 1.4, z + 0.3);
    s.scale.set(1.4, 0.12, 1);
    scene.add(s);
    fx.push({ obj: s, vx: -6, vy: 0, vz: 0, life: 0, max: 0.25, grav: 0, fade: true });
  }
  function updateFx(dt) {
    for (let i = fx.length - 1; i >= 0; i--) {
      const f = fx[i];
      f.life += dt;
      const o = f.obj;
      if (f.arc) {
        const u = Math.min(1, f.life / f.arc.dur), A = f.arc.from, B = typeof f.arc.to === 'function' ? f.arc.to() : f.arc.to;
        o.position.set(A.x + (B.x - A.x) * u, A.y + (B.y - A.y) * u + Math.sin(u * Math.PI) * 1.6, A.z + (B.z - A.z) * u);
        o.material.rotation = u * 6;
      } else {
        if (f.drag) { const d = Math.exp(-f.drag * dt); f.vx *= d; f.vz *= d; if (f.vy < -2) f.vy = Math.max(f.vy, -2.2); }
        f.vy -= (f.grav || 0) * dt;
        o.position.x += f.vx * dt; o.position.y += f.vy * dt; o.position.z += f.vz * dt;
        if (f.spin) { o.rotation.x += f.spin[0] * dt; o.rotation.y += f.spin[1] * dt; }
        if (f.grow) { const s = o.scale.x * (1 + f.grow * dt); o.scale.set(s, s, 1); }
      }
      if (f.fade && o.material) o.material.opacity = Math.max(0, 1 - f.life / f.max) * (o instanceof T.Sprite ? 0.85 : 1);
      if (f.life >= f.max) { if (f.onLand) f.onLand(); drop(o); fx.splice(i, 1); }
    }
  }
  function clearFx() { for (const f of fx) drop(f.obj); fx.length = 0; }

  // ---------- cameras ----------
  // follow a point side-on, a little ahead; wide screens see more track, tall ones step back
  function follow(v, x, y, dt, snap) {
    const W = Math.max(1, v.rect[2]), H = Math.max(1, v.rect[3]);
    const aspect = W / H;
    v.cam.aspect = aspect;
    const halfH = Math.tan((v.cam.fov * Math.PI) / 360);
    // want ~26 m across on wide screens; at least 9 m tall
    let D = Math.max(8 / (2 * halfH), 19 / (2 * halfH * aspect));
    D = Math.min(D, 34) * v.zoom;
    const ahead = Math.min(7, 0.18 * D * halfH * aspect * 2 * 0.5);
    const k = snap ? 1 : 1 - Math.exp(-3.5 * dt);
    v.y += (y - v.y) * k;
    v.x = x;
    v.cam.position.set(v.x + ahead, v.y + 3.4, D);
    v.cam.lookAt(v.x + ahead, v.y + 2.0, 0);
    v.cam.updateProjectionMatrix();
  }

  function render(nViews) {
    const W = renderer.domElement.clientWidth, H = renderer.domElement.clientHeight;
    const sky = world && world.userData.sky;
    renderer.setScissorTest(nViews > 1);
    for (let i = 0; i < nViews; i++) {
      const v = views[i];
      const [x, y, w, h] = v.rect;
      if (sky) for (const s of sky) s.position.set(v.cam.position.x + s.userData.sky.dx, v.cam.position.y + s.userData.sky.dy, s.userData.sky.z);
      renderer.setViewport(x, H - y - h, w, h);
      renderer.setScissor(x, H - y - h, w, h);
      renderer.render(scene, v.cam);
    }
  }
  function resize(w, h) { renderer.setSize(w, h, false); }

  BMX.art = { init, setTrack, setGate, makeRider, removeRider, place, celebrate, ridePose, puff, confetti, sprite, drop, toss, streak, updateFx, clearFx, follow, render, resize, views, THEMES, NAMES, TAGS, get scene() { return scene; }, get renderer() { return renderer; } };
})();
