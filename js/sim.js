/* TT BMX: the rules. A rider is a point on the side-view track (js/tracks.js): on the ground he rolls along the dirt
   (gravity, pedalling, pumping, braking), where the dirt bends away faster than gravity can hold him he flies, and in
   the air he can lean (flips) and do style tricks. Landing crooked on NORMAL is a crash (up again in a moment); EASY
   never crashes, pedals by itself and always clears the gaps. Fixed 1/120 s steps, so every frame rate rides the same.
   Pure JavaScript (no Three.js): tools/check.js runs the same rules in node. */
(function (root) {
  'use strict';
  const BMX = (root.BMX = root.BMX || {});
  const G = 9.8, DT = 1 / 120;
  const TAU = Math.PI * 2;

  const LEVELS = {
    // the bike pedals itself, levels itself in the air, never crashes and always makes the gap
    easy: { auto: true, cap: 8.6, tol: Infinity, assist: true, level: 6, forgive: true, clearGaps: true },
    // you pedal; it still levels itself a little, but leaning or a trick that isn't finished can crash you
    normal: { auto: false, cap: 10.8, tol: 0.62, assist: false, level: 3, forgive: false, clearGaps: false },
  };
  // the trick button cycles through these
  const STYLE = [
    { id: 'NO HANDS', pts: 100, dur: 0.55 },
    { id: 'SUPERMAN', pts: 200, dur: 0.7 },
    { id: 'CAN-CAN', pts: 150, dur: 0.6 },
    { id: 'TABLETOP', pts: 200, dur: 0.65 },
    { id: 'TAILWHIP', pts: 300, dur: 0.7 },
  ];
  const CPUS = {
    foxy: { id: 'foxy', name: 'FOXY', emoji: '🦊', mult: { easy: 0.9, normal: 0.965 }, tricky: 0.5 },
    froggy: { id: 'froggy', name: 'FROGGY', emoji: '🐸', mult: { easy: 0.86, normal: 0.95 }, tricky: 0.8 },
  };
  // sabotage switches for the check's "can it fail?" runs: never on in the game
  const sab = (BMX.sabotage = BMX.sabotage || {});

  const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
  const wrap = (a) => Math.atan2(Math.sin(a), Math.cos(a));
  function rng(seed) { // mulberry32
    let s = seed >>> 0;
    return () => {
      s = (s + 0x6d2b79f5) >>> 0;
      let t = s;
      t = Math.imul(t ^ (t >>> 15), t | 1);
      t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
      return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
  }

  function makeRider(o, trk) {
    const x = o.x != null ? o.x : trk.gateX - 0.9;
    return {
      id: o.id, name: o.name || o.id.toUpperCase(), human: !!o.human, slot: o.slot != null ? o.slot : -1, pilot: o.pilot || null,
      level: o.level || 'easy', cpu: o.cpu || null, mult: o.mult || 1, lane: o.lane || 0,
      x, y: trk.heightAt(x), vx: 0, vy: 0, v: 0, ground: true, ang: 0, angV: 0, air: 0, rot: 0, hopped: false,
      trick: null, trickN: 0, airTricks: [], pred: null, predT: 0, jumpBuf: 0, trickBuf: 0, hopCD: 0,
      tricks: 0, pts: 0, crashT: 0, crashes: 0, boostT: 0, finished: false, time: 0, place: 1, pedal: 0,
      below: 0, maxBelow: 0, gapFalls: 0, cleared: 0, stuckT: 0, steps: 0, flips: 0, events: [],
    };
  }

  const ev = (r, type, o) => { r.events.push(Object.assign({ type }, o)); };

  // where a flight comes down (for the levelling help and the CPUs)
  function predictLanding(r, trk) {
    let x = r.x, y = r.y, vx = r.vx, vy = r.vy;
    const h = 1 / 40;
    for (let t = h; t < 4; t += h) {
      vy -= G * h; x += vx * h; y += vy * h;
      if (y <= trk.heightAt(x)) return { x, t: r.air + t, slope: trk.slopeAt(x) };
    }
    return { x, t: r.air + 4, slope: 0 };
  }

  function launch(r, trk, vx, vy, hop, L, inp) {
    // EASY: the bike always makes the gap (a little extra speed off a double's lip, only if it needs it)
    if (L.clearGaps && !hop) {
      for (const f of trk.feats) {
        if (f.type !== 'double' || r.x < f.lip - 0.8 || r.x > f.lip + 0.3) continue;
        const a = Math.atan2(vy, vx), dx = f.aim - r.x, dy = trk.heightAt(f.aim) - r.y;
        const den = 2 * Math.cos(a) * Math.cos(a) * (dx * Math.tan(a) - dy);
        if (den > 0.05) {
          const need = Math.sqrt((G * dx * dx) / den), v = Math.hypot(vx, vy);
          if (v < need) { vx *= need / v; vy *= need / v; }
        }
      }
    }
    r.ground = false; r.vx = vx; r.vy = vy; r.air = 0; r.rot = 0; r.hopped = hop; r.airTricks = [];
    // a pedal or brake key still held from the ground doesn't lean the bike: only a fresh press in the air does
    r.lockFwd = !!inp.fwd; r.lockBack = !!inp.back;
    r.pred = predictLanding(r, trk); r.predT = 0.1;
    if (hop) { r.hopCD = 0.35; ev(r, 'hop'); }
    // a trick asked for just before the lip starts as he leaves
    if (r.trickBuf > 0) startTrick(r);
  }

  function startTrick(r) {
    const s = STYLE[r.trickN++ % STYLE.length];
    r.trick = { id: s.id, pts: s.pts, dur: s.dur, t: 0 };
    r.trickBuf = 0;
    ev(r, 'trick', { id: s.id });
  }

  function crash(r, v) {
    r.crashT = 1.4; r.crashes++; r.v = Math.max(0, v) * 0.35;
    r.trick = null; r.airTricks = []; r.angV = 0; r.boostT = 0; r.ground = true;
    ev(r, 'crash');
  }

  function land(r, trk, x, gy, L) {
    const s = trk.slopeAt(x), th = Math.atan(s), c = Math.cos(th), sn = Math.sin(th);
    const diff = wrap(r.ang - th);
    const flips = Math.floor((Math.abs(r.rot) + 0.9) / TAU);
    let bad = Math.abs(diff) > L.tol;
    if (r.trick && r.trick.t < r.trick.dur * 0.7 && !L.forgive) bad = true;
    const airT = r.air;
    r.x = x; r.y = gy; r.ground = true;
    let v = r.vx * c + r.vy * sn;
    const hit = r.vx * sn - r.vy * c; // speed into the dirt
    // came down in a gap (short of a double's landing)?
    for (const f of trk.feats) if (f.type === 'double' && x > f.lip + 0.3 && x < f.peak - 0.2 && gy < f.y + f.h - 0.25) { r.gapFalls++; ev(r, 'gap'); }
    if (bad) { crash(r, v); return; }
    if (r.trick) { r.airTricks.push(r.trick); r.trick = null; } // EASY: a trick still going finishes as the wheels touch
    const list = r.airTricks.slice();
    if (flips) { list.push({ id: r.rot > 0 ? 'BACKFLIP' : 'FRONTFLIP', pts: 500 * flips, n: flips }); r.flips += flips; }
    const wobbly = Math.abs(diff) > LEVELS.normal.tol; // only possible on EASY
    const perfect = !wobbly && Math.abs(diff) < 0.22 && airT > 0.45;
    if (wobbly) v *= 0.8;
    if (hit > 10) v *= 0.92;
    let pts = 0, boost = 0;
    for (const t of list) { pts += t.pts; boost += t.n ? 1.1 * t.n : 0.6; }
    if (perfect) { pts += 50; boost += 0.4; }
    r.tricks += list.length; r.pts += pts;
    if (boost) r.boostT = Math.min(3.5, Math.max(r.boostT, 0) + boost);
    r.v = v; r.ang = th; r.angV = 0; r.airTricks = [];
    if (airT > 0.35 || list.length) ev(r, 'land', { tricks: list, pts, perfect, wobbly, air: airT, hit });
  }

  function groundStep(r, trk, inp, L, dt) {
    const s = trk.slopeAt(r.x), th = Math.atan(s), c = Math.cos(th), sn = Math.sin(th);
    const cap = L.cap * r.mult + (r.boostT > 0 ? 4.5 : 0);
    const pedal = !inp.back && !inp.coast && (L.auto || inp.fwd) && r.v < cap;
    let a = -G * sn;
    if (pedal) a += 7 * (1 - Math.max(0, r.v) / cap);
    if (r.boostT > 0 && r.v < cap) a += 4;
    if (inp.back) { if (Math.abs(r.v) < 0.4) r.v = 0; else a -= 8 * Math.sign(r.v); }
    if (inp.down && sn < 0) a += -sn * G * 0.5; // pumping the back side of a bump
    a -= 0.005 * r.v * Math.abs(r.v) + (r.v ? 0.1 * Math.sign(r.v) : 0);
    r.v += a * dt;
    r.pedal = pedal ? 1 : 0;
    if (r.jumpBuf > 0 && r.hopCD <= 0) { // bunny hop: a pop away from the dirt
      r.jumpBuf = 0;
      launch(r, trk, r.v * c - sn * 3.8, r.v * sn + c * 3.8, true, L, inp);
      return;
    }
    // leave the ground where it bends away faster than gravity (plus pumping) can keep the wheels on it
    const k = trk.curvAt(r.x);
    const hold = G * c + (inp.down ? 6 : 0) + (L.assist ? 2 : 0);
    if (k < 0 && r.v > 1 && r.v * r.v * -k > hold) {
      const tb = Math.atan(trk.backSlopeAt(r.x));
      launch(r, trk, r.v * Math.cos(tb), r.v * Math.sin(tb), false, L, inp);
      return;
    }
    r.x += r.v * c * dt;
    if (r.x < 0.5) { r.x = 0.5; r.v = Math.max(0, r.v); }
    r.y = trk.heightAt(r.x);
    r.ang = Math.atan(trk.slopeAt(r.x)); r.angV = 0;
  }

  function airStep(r, trk, inp, L, dt) {
    r.air += dt;
    r.vy -= G * dt;
    r.vx -= 0.002 * r.vx * Math.abs(r.vx) * dt;
    if ((r.predT -= dt) <= 0) { r.pred = predictLanding(r, trk); r.predT = 0.1; }
    // lean: back = nose up (a backflip), forward = nose down (a front flip)
    if (!inp.fwd) r.lockFwd = false;
    if (!inp.back) r.lockBack = false;
    const lean = (inp.back && !r.lockBack ? 1 : 0) - (inp.fwd && !r.lockFwd ? 1 : 0);
    if (lean) r.angV = clamp(r.angV + lean * 20 * dt, -8.5, 8.5);
    else {
      // let go and the bike levels itself to the landing (strongly on EASY and for the CPUs)
      const tgt = Math.atan(r.pred.slope);
      const k = r.cpu ? 6 : L.level;
      const want = wrap(tgt - r.ang) * k;
      r.angV += (want - r.angV) * Math.min(1, 8 * dt);
    }
    r.ang += r.angV * dt; r.rot += r.angV * dt;
    if ((inp.trick || r.trickBuf > 0) && !r.trick && r.air > 0.05) startTrick(r);
    inp.trick = false;
    if (r.trick && (r.trick.t += dt) >= r.trick.dur) { r.airTricks.push(r.trick); r.trick = null; }
    const nx = Math.max(0.5, r.x + r.vx * dt), ny = r.y + r.vy * dt;
    // the sabotaged versions the check must catch: no ground at all, or the ground only looked at every 4th step
    if (sab.nofloor || (sab.coarse && r.steps % 4)) { r.x = nx; r.y = ny; return; }
    const gy = trk.heightAt(nx);
    if (ny <= gy) {
      if (r.air < 0.15 && !r.hopped && !r.trick && !r.airTricks.length) { // still rolling off the lip: quietly back on the dirt
        r.x = nx; r.y = gy; r.ground = true;
        const th = Math.atan(trk.slopeAt(nx));
        r.v = r.vx * Math.cos(th) + r.vy * Math.sin(th);
        return;
      }
      land(r, trk, nx, gy, L);
      return;
    }
    r.x = nx; r.y = ny;
  }

  // one fixed step for one rider; inp: { fwd, back, down, jump, trick, coast } (jump and trick are presses)
  function stepRider(r, trk, inp, dt, race) {
    const L = LEVELS[r.level];
    r.steps++;
    r.hopCD -= dt;
    if (inp.jump) { r.jumpBuf = 0.18; inp.jump = false; }
    if (inp.trick && r.ground) { r.trickBuf = 0.3; inp.trick = false; }
    r.jumpBuf -= dt; r.trickBuf -= dt;
    if (r.boostT > 0) r.boostT -= dt;
    if (r.crashT > 0) {
      // sliding to a stop in the dirt, then straight back on the bike
      r.crashT -= dt;
      r.v *= Math.exp(-3 * dt);
      r.x = Math.max(0.5, r.x + r.v * Math.cos(Math.atan(trk.slopeAt(r.x))) * dt);
      r.y = trk.heightAt(r.x);
      if (r.crashT <= 0) { r.v = Math.max(r.v, 2.5); r.ang = Math.atan(trk.slopeAt(r.x)); ev(r, 'up'); }
    } else if (r.ground) groundStep(r, trk, inp, L, dt);
    else airStep(r, trk, inp, L, dt);
    // stuck (rolling back and forth in a gap without pedalling)? only counted, the check reports it
    r.stuckT = Math.abs(r.v) < 0.5 && r.ground ? r.stuckT + dt : 0;
    // the rule the check watches: never below the dirt
    const d = trk.heightAt(r.x) - r.y;
    if (d > 0.02 || !(r.y === r.y)) { r.below++; r.maxBelow = Math.max(r.maxBelow, d || 99); }
    if (!r.finished && r.x >= trk.finishX) { r.finished = true; r.time = race ? race.t : 0; ev(r, 'finish'); }
  }

  // ---------- the computer riders ----------
  function cpuInput(r, race) {
    const inp = r.cpuInp || (r.cpuInp = {});
    const easy = r.level === 'easy';
    let target = (easy ? 7.6 : 10.4) * r.mult;
    let lead = -Infinity;
    inp.back = false;
    for (const q of race.riders) if (q.human) lead = Math.max(lead, q.x);
    if (lead > -Infinity) {
      const gap = r.x - lead;
      // on EASY they wait for the kids when ahead and keep close when behind; on NORMAL only a little
      if (easy) {
        if (gap > -1) target *= gap > 6 ? 0.35 : 0.62; // level with him or ahead: ease off
        else if (gap < -14) target *= 1.08;
        inp.back = r.ground && gap > 9; // well ahead of the kid: wait for him
      }
      else if (gap > 18) target *= 0.9;
      else if (gap < -18) target *= 1.05;
    }
    const s = race.trk.slopeAt(r.x);
    inp.fwd = r.ground && r.v < target; inp.coast = r.v >= target;
    inp.down = !easy && s < -0.05;
    inp.trick = !easy && !r.ground && !r.trick && r.pred && r.pred.t - r.air > 0.85 && r.airTricks.length < 2 && race.rng() < r.cpu.tricky * 0.05;
    return inp;
  }

  function coastInput(r, race) {
    const inp = r.coastInp || (r.coastInp = {});
    inp.fwd = false; inp.coast = true; inp.down = false; inp.trick = false; inp.jump = false;
    inp.back = r.ground && r.x > race.trk.finishX + 10;
    return inp;
  }

  // ---------- a race: riders at the gate, 3-2-1-GO, until everyone's home ----------
  function createRace(o) {
    const trk = BMX.track.build(BMX.TRACK_BY_ID[o.track], { wall: sab.wall });
    const race = { trk, riders: [], t: 0, count: o.count == null ? 3 : o.count, phase: o.count === 0 ? 'go' : 'count', acc: 0, rng: rng(o.seed || 7), events: [] };
    for (const d of o.riders) {
      const r = makeRider(d, trk);
      if (d.cpu) { r.cpu = CPUS[d.cpu]; r.mult = r.cpu.mult[r.level] * (sab.fastCpu ? 1.3 : 1); r.name = r.cpu.name; }
      race.riders.push(r);
    }
    return race;
  }

  const NONE = {};
  function tick(race, inputs) {
    if (race.phase === 'count') {
      race.count -= DT;
      if (race.count > 0) return;
      race.phase = 'go';
    }
    race.t += DT;
    for (const r of race.riders) {
      const inp = r.finished ? coastInput(r, race) : r.pilot ? r.pilot(r, race) : r.human ? inputs[r.slot] || NONE : cpuInput(r, race);
      stepRider(r, race.trk, inp, DT, race);
    }
    // places: finished riders by time, then the rest by how far they've got
    const order = race.riders.slice().sort((a, b) => (a.finished && b.finished ? a.time - b.time : a.finished ? -1 : b.finished ? 1 : b.x - a.x));
    order.forEach((r, i) => { r.place = i + 1; });
  }

  // advance by real seconds (any frame rate): whole fixed steps only, the rest waits for the next frame
  function stepRace(race, sec, inputs) {
    race.acc += Math.min(sec, 0.25);
    while (race.acc >= DT) { race.acc -= DT; tick(race, inputs || []); }
  }

  // ---------- test pilots for the check ----------
  const PILOTS = {
    // EASY, presses nothing at all
    idle: () => () => ({}),
    // EASY, a 5-year-old mashing buttons: hops, tricks, the odd brake, leaning at random in the air
    kid: (seed) => {
      const R = rng(seed), inp = {};
      let t = 0, hold = 0, mode = 0;
      return (r) => {
        t += DT;
        if ((hold -= DT) <= 0) { hold = 0.2 + R() * 1.2; mode = R(); }
        inp.back = mode < 0.06 || (!r.ground && mode > 0.85);
        inp.fwd = !r.ground && mode > 0.7 && mode <= 0.85;
        inp.down = mode > 0.5 && mode < 0.6;
        if (R() < 0.006) inp.jump = true;
        if (R() < 0.01) inp.trick = true;
        return inp;
      };
    },
    // NORMAL, pedals the whole way and lets go in the air
    good: () => () => ({ fwd: true }),
    // NORMAL, pedals, pumps, hops off the lips and does tricks and flips when there's time
    pro: () => {
      const inp = {};
      return (r, race) => {
        const trk = race.trk, s = trk.slopeAt(r.x);
        inp.fwd = r.ground; inp.back = false; inp.down = r.ground && s < -0.05;
        if (r.ground) for (const f of trk.feats) if (f.lip && r.x > f.lip - 0.5 && r.x < f.lip - 0.2 && f.type !== 'drop') inp.jump = true;
        if (!r.ground && r.pred) {
          const left = r.pred.t - r.air;
          if (left > 0.8 && left < 1.05 && !r.trick && r.airTricks.length < 2 && r.rot < 0.3) inp.trick = true;
          // a backflip when the flight is long, levelled by hand for the landing
          const tgt = Math.atan(r.pred.slope), d = wrap(r.ang - tgt);
          if (r.rot > 0.3 && r.rot < TAU - 0.5) inp.back = true;
          else if (left > 1.05 && r.rot < 0.3 && !r.trick) inp.back = true;
          else { inp.back = d < -0.2 && left < 0.45; inp.fwd = d > 0.2 && left < 0.45; }
        }
        return inp;
      };
    },
    // NORMAL, leans at random in the air: crashes a lot, but must still get home
    wild: (seed) => {
      const R = rng(seed), inp = { fwd: true };
      let hold = 0, mode = 0;
      return (r) => {
        if ((hold -= DT) <= 0) { hold = 0.1 + R() * 0.5; mode = R(); }
        inp.fwd = r.ground || mode < 0.3;
        inp.back = !r.ground && mode > 0.65;
        if (R() < 0.01) inp.trick = true;
        return inp;
      };
    },
  };

  // run one rider alone down a track until home (or the limit)
  function solo(track, level, who, limit) {
    const d = { id: 'teddy', level, slot: 0, lane: 0 };
    if (who.cpu) d.cpu = who.cpu; else d.pilot = PILOTS[who.pilot](who.seed || 1);
    const race = createRace({ track, count: 0, riders: [d], seed: who.seed || 3 });
    const r = race.riders[0];
    let minClear = Infinity;
    while (!r.finished && race.t < limit) {
      tick(race, []);
      minClear = Math.min(minClear, r.y - race.trk.heightAt(r.x));
    }
    return { track, level, who: who.cpu || who.pilot + (who.seed ? '#' + who.seed : ''), finished: r.finished, time: r.finished ? r.time : race.t,
      crashes: r.crashes, below: r.below, maxBelow: r.maxBelow, gapFalls: r.gapFalls, tricks: r.tricks, flips: r.flips, minClear, x: r.x, len: race.trk.finishX };
  }

  // The headless check: every track finishable on both levels by every kind of rider, and nobody ever below the dirt.
  function check(opt) {
    opt = opt || {};
    const runs = [];
    const who = {
      easy: [{ pilot: 'idle' }, { pilot: 'kid', seed: 1 }, { pilot: 'kid', seed: 2 }, { pilot: 'kid', seed: 3 }, { cpu: 'foxy' }, { cpu: 'froggy' }],
      normal: [{ pilot: 'good' }, { pilot: 'pro' }, { pilot: 'wild', seed: 1 }, { pilot: 'wild', seed: 2 }, { cpu: 'foxy' }, { cpu: 'froggy' }],
    };
    for (const t of BMX.TRACKS) for (const level of ['easy', 'normal']) for (const w of who[level]) runs.push(solo(t.id, level, w, w.pilot === 'wild' ? 300 : 150));
    const unfinished = runs.filter((r) => !r.finished);
    const under = runs.filter((r) => r.below > 0);
    const easyCrash = runs.filter((r) => r.level === 'easy' && r.crashes);
    const goodCrash = runs.filter((r) => r.who === 'good' && r.crashes);
    // races: a pretend kid (counted as a human, so Foxy and Froggy go easy on him) against both CPUs
    const races = [];
    for (const t of BMX.TRACKS) {
      for (const [level, who] of [['easy', 'idle'], ['easy', 'kid'], ['normal', 'good'], ['normal', 'pro']]) {
        for (const seed of who === 'kid' ? [1, 2, 3] : [1]) {
          const race = createRace({ track: t.id, count: 0, seed, riders: [{ id: 'tommy', human: true, slot: 0, level, pilot: PILOTS[who](seed) }, { id: 'foxy', cpu: 'foxy', level }, { id: 'froggy', cpu: 'froggy', level }] });
          while (race.t < 150 && !race.riders.every((r) => r.finished)) tick(race, []);
          races.push({ track: t.id, level, who: who + (who === 'kid' ? '#' + seed : ''), place: race.riders[0].place, time: race.riders[0].time, cpu: race.riders.slice(1).map((r) => r.time) });
        }
      }
    }
    const easyLost = races.filter((r) => r.level === 'easy' && r.place !== 1);
    const proLost = races.filter((r) => r.who === 'pro' && r.place !== 1);
    const tests = [
      { name: 'finishable', ok: !unfinished.length, detail: unfinished.length ? unfinished.map((r) => `${r.track}/${r.level}/${r.who} stopped at ${r.x.toFixed(0)} of ${r.len.toFixed(0)} m`).join('; ') : `${runs.length} runs home` },
      { name: 'ground', ok: !under.length, detail: under.length ? under.map((r) => `${r.track}/${r.level}/${r.who} ${r.below} steps below, by up to ${r.maxBelow.toFixed(2)} m`).join('; ') : 'never below the dirt' },
      { name: 'easyNoCrash', ok: !easyCrash.length, detail: easyCrash.length ? easyCrash.map((r) => `${r.track}/${r.who} ${r.crashes}`).join('; ') : 'EASY never crashes' },
      { name: 'easyRace', ok: !easyLost.length, detail: easyLost.length ? easyLost.map((r) => `${r.track}/${r.who} came ${r.place}`).join('; ') : `on EASY the pretend kid beats Foxy and Froggy in all ${races.filter((r) => r.level === 'easy').length} races` },
      { name: 'normalRace', ok: !proLost.length, detail: proLost.length ? proLost.map((r) => `${r.track}/pro came ${r.place}`).join('; ') : `on NORMAL pumping, hopping and tricks win; just pedalling places ${races.filter((r) => r.who === 'good').map((r) => r.place).join(',')}` },
      { name: 'goodNoCrash', ok: !goodCrash.length, detail: goodCrash.length ? goodCrash.map((r) => `${r.track} ${r.crashes}`).join('; ') : 'just pedalling on NORMAL never crashes' },
    ];
    return { ok: tests.every((t) => t.ok), tests, runs, races };
  }

  // the check must be able to fail: each sabotage breaks one rule and the check has to notice
  const SABOTAGE = [
    ['wall', 'finishable', 'an unclimbable 6 m wall before every finish line'],
    ['coarse', 'ground', 'the ground looked at only every 4th step'],
    ['nofloor', 'ground', 'no ground under a flying rider'],
    ['fastCpu', 'easyRace', 'Foxy and Froggy 30% faster'],
  ];
  function checkFails() {
    const out = [];
    for (const [k, test, what] of SABOTAGE) {
      sab[k] = true;
      let res;
      try { res = check(); } finally { sab[k] = false; }
      const t = res.tests.find((x) => x.name === test);
      out.push({ sabotage: k, what, test, caught: !t.ok, detail: t.detail.slice(0, 160) });
    }
    return { ok: out.every((o) => o.caught), out };
  }

  BMX.sim = { DT, G, LEVELS, STYLE, CPUS, PILOTS, makeRider, stepRider, createRace, stepRace, tick, predictLanding, check, checkFails, solo, rng, wrap };
})(typeof window !== 'undefined' ? window : globalThis);
