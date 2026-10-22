/* TT BMX: the tracks. Each track is a list of pieces (flat dirt, rollers, tabletops, doubles, step-ups, drops) that
   BMX.track.build(def) turns into a side-view height profile sampled every 10 cm. The sim (js/sim.js), the art
   (js/art.js) and the headless check all read the same profile. Pure JavaScript: node runs it too (tools/check.js). */
(function (root) {
  'use strict';
  const BMX = (root.BMX = root.BMX || {});
  const STEP = 0.1;
  const RUNOUT = 45; // flat dirt after the finish line, to coast to a stop

  // [kind, ...sizes in metres]
  //   flat L · hill L dh (a smooth slope up or down) · rollers n L h · table up top down h
  //   double up gap down h (a gap between takeoff and landing) · stepup up h top · drop h L · finish L
  const TRACKS = [
    {
      id: 'park', name: 'DIRT PARK', emoji: '🌳', theme: 'park',
      pieces: [
        ['flat', 7], ['hill', 12, -4.5], ['flat', 12],
        ['rollers', 3, 7, 0.5], ['flat', 7],
        ['table', 4.5, 4, 7, 1.2], ['flat', 9],
        ['rollers', 2, 8, 0.6], ['flat', 8],
        ['double', 4.5, 4.2, 7, 1.3], ['flat', 10],
        ['stepup', 4.5, 1.0, 9], ['drop', 1.0, 8], ['flat', 9],
        ['table', 5, 5, 8, 1.4], ['flat', 9],
        ['rollers', 4, 5.5, 0.35], ['flat', 10],
        ['double', 5, 4.6, 8, 1.4], ['flat', 12],
        ['finish', 6],
      ],
    },
    {
      id: 'desert', name: 'CACTUS CANYON', emoji: '🌵', theme: 'desert',
      pieces: [
        ['flat', 7], ['hill', 14, -5.5], ['flat', 12],
        ['table', 4.5, 5, 8, 1.4], ['flat', 8],
        ['double', 4.5, 4.4, 8, 1.4], ['flat', 9],
        ['rollers', 3, 7, 0.6], ['flat', 8],
        ['drop', 2.0, 10], ['flat', 10],
        ['double', 5, 5.0, 9, 1.6], ['flat', 9],
        ['stepup', 5, 1.4, 10], ['flat', 4],
        ['table', 5.5, 6, 9, 1.7], ['flat', 9],
        ['rollers', 3, 6, 0.5], ['flat', 8],
        ['drop', 1.6, 9], ['flat', 11],
        ['double', 5.5, 5.2, 9, 1.7], ['flat', 12],
        ['finish', 6],
      ],
    },
    {
      id: 'snow', name: 'SNOWY HILLS', emoji: '❄️', theme: 'snow',
      pieces: [
        ['flat', 7], ['hill', 12, -5], ['flat', 12],
        ['rollers', 5, 5.5, 0.4], ['flat', 8],
        ['stepup', 4.5, 1.2, 9], ['stepup', 4.5, 1.2, 9], ['drop', 2.4, 12], ['flat', 10],
        ['double', 4.5, 4.4, 8, 1.4], ['flat', 8],
        ['rollers', 3, 8, 0.7], ['flat', 8],
        ['table', 5.5, 6, 8, 1.6], ['flat', 9],
        ['rollers', 6, 4.5, 0.3], ['flat', 10],
        ['double', 5.5, 5.0, 9, 1.6], ['flat', 12],
        ['finish', 6],
      ],
    },
    {
      id: 'night', name: 'MOON CITY', emoji: '🌙', theme: 'night',
      pieces: [
        ['flat', 7], ['hill', 14, -6], ['flat', 12],
        ['double', 4.5, 4.4, 8, 1.4], ['flat', 8],
        ['rollers', 4, 6, 0.5], ['flat', 8],
        ['stepup', 5, 1.5, 9], ['drop', 1.5, 9], ['flat', 9],
        ['double', 5.5, 5.2, 9, 1.7], ['flat', 9],
        ['table', 5.5, 6, 9, 1.8], ['flat', 8],
        ['rollers', 3, 7, 0.6], ['flat', 9],
        ['stepup', 5, 1.3, 7], ['drop', 2.6, 12], ['flat', 10],
        ['double', 6, 5.4, 10, 1.9], ['flat', 14],
        ['finish', 6],
      ],
    },
  ];
  const BY_ID = {};
  for (const t of TRACKS) BY_ID[t.id] = t;

  // the landing side of a gap: rideable back out at this slope (the check proves you can pedal up it)
  const FACE_UP = 0.6, FACE_DOWN = 1.0;

  function build(def, opt) {
    opt = opt || {};
    const segs = [], feats = [];
    let x = 0, base = 0, finishX = 0;
    const add = (L, f) => { const x0 = x, b = base; segs.push({ x0, L, f: (u) => b + f(u) }); x += L; };
    const takeoff = (up, h) => { add(up, (u) => h * u * u); return x; }; // concave, the lip is the steep end
    const landing = (down, h) => add(down, (u) => (h * (1 + Math.cos(Math.PI * u))) / 2);
    let pieces = def.pieces;
    // sabotage for the check: an unclimbable wall before the finish line (the check must then fail)
    if (opt.wall) pieces = pieces.slice(0, -1).concat([['wall', 6], ['flat', 6]], pieces.slice(-1));
    for (const p of pieces) {
      const [kind, a, b, c, d] = p;
      const x0 = x, b0 = base;
      if (kind === 'flat') add(a, () => 0);
      else if (kind === 'hill') { add(a, (u) => (b * (1 - Math.cos(Math.PI * u))) / 2); base += b; }
      else if (kind === 'rollers') { for (let i = 0; i < a; i++) add(b, (u) => (c * (1 - Math.cos(2 * Math.PI * u))) / 2); feats.push({ type: 'rollers', x0, x1: x, h: c, y: b0 }); }
      else if (kind === 'table') {
        const lip = takeoff(a, d);
        add(b, () => d);
        landing(c, d);
        feats.push({ type: 'table', x0, lip, land: lip + b, x1: x, h: d, y: b0 });
      } else if (kind === 'double') {
        const lip = takeoff(a, d), gap = b, h = d;
        let dep = Math.min(h * 0.75, (gap - 0.4) / (1 / FACE_DOWN + 1 / FACE_UP));
        const a1 = dep / FACE_DOWN, a3 = dep / FACE_UP, mid = gap - a1 - a3;
        add(gap, (u) => {
          const s = u * gap;
          return s < a1 ? h - s * FACE_DOWN : s < a1 + mid ? h - dep : h - dep + (s - a1 - mid) * FACE_UP;
        });
        const peak = x;
        landing(c, h);
        // the bike on EASY always makes it: aim for a little way down the landing
        feats.push({ type: 'double', x0, lip, peak, aim: peak + c * 0.3, x1: x, h, y: b0, depth: dep });
      } else if (kind === 'stepup') {
        const lip = takeoff(a, b);
        base += b;
        add(c, () => 0);
        feats.push({ type: 'stepup', x0, lip, x1: x, h: b, y: b0 });
      } else if (kind === 'drop') {
        const h = a;
        add(b, (u) => -h * (u < 0.1 ? (u / 0.1) * 0.3 : 0.3 + (0.7 * (1 - Math.cos((Math.PI * (u - 0.1)) / 0.9))) / 2));
        base -= h;
        feats.push({ type: 'drop', x0, lip: x0, x1: x, h, y: b0 });
      } else if (kind === 'wall') { add(0.6, (u) => a * u); base += a; }
      else if (kind === 'finish') { finishX = x + 2; add(a, () => 0); }
    }
    add(RUNOUT, () => 0);
    const len = x;
    const n = Math.ceil(len / STEP) + 1;
    const h = new Float32Array(n);
    let si = 0;
    for (let i = 0; i < n; i++) {
      const xi = Math.min(len, i * STEP);
      while (si < segs.length - 1 && xi > segs[si].x0 + segs[si].L) si++;
      const sg = segs[si];
      h[i] = sg.f(Math.max(0, Math.min(1, (xi - sg.x0) / sg.L)));
    }
    // slope over +-0.2 m and curvature over +-0.3 m, so a sharp lip reads as a sharp bend
    const slope = new Float32Array(n), curv = new Float32Array(n);
    let minY = Infinity, maxY = -Infinity;
    for (let i = 0; i < n; i++) {
      const a2 = Math.max(0, i - 2), b2 = Math.min(n - 1, i + 2);
      slope[i] = (h[b2] - h[a2]) / ((b2 - a2) * STEP);
      const a3 = Math.max(0, i - 3), b3 = Math.min(n - 1, i + 3);
      const dd = (h[b3] - 2 * h[i] + h[a3]) / (0.3 * 0.3);
      curv[i] = dd / Math.pow(1 + slope[i] * slope[i], 1.5);
      minY = Math.min(minY, h[i]);
      maxY = Math.max(maxY, h[i]);
    }
    const sample = (arr, xx) => {
      const f = Math.max(0, Math.min(n - 1.001, xx / STEP));
      const i = Math.floor(f), t = f - i;
      return arr[i] + (arr[i + 1] - arr[i]) * t;
    };
    const trk = {
      def, id: def.id, name: def.name, theme: def.theme, step: STEP, n, len, h, slope, curv, minY, maxY, feats,
      gateX: 3.4, finishX,
      heightAt: (xx) => sample(h, xx),
      slopeAt: (xx) => sample(slope, xx),
      curvAt: (xx) => sample(curv, xx),
      backSlopeAt: (xx) => (sample(h, xx) - sample(h, xx - 0.25)) / 0.25,
    };
    return trk;
  }

  BMX.TRACKS = TRACKS;
  BMX.TRACK_BY_ID = BY_ID;
  BMX.track = { build, STEP, FACE_UP };
})(typeof window !== 'undefined' ? window : globalThis);
