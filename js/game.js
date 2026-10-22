/* TT BMX: the game. Screens (title, pick, race, results), keys and touch, the HUD, the brother who comes when you
   call him (a treat, then a boost), the high five in 2 players, the winner's celebration, and window.game for tests.
   The rules live in js/sim.js and the pictures in js/art.js. */
(function () {
  'use strict';
  const B = window.BMX, A = B.art, SIM = B.sim, K = Kit.sound, L = Kit.lang;
  const $ = (s) => document.querySelector(s), $$ = (s) => Array.from(document.querySelectorAll(s));
  const STORE = 'bmxTT.v1';
  const TREATS = ['🍦', '💧', '🧃', '🍪', '🍉', '🍌'];
  const NAMES = { teddy: 'TEDDY', tommy: 'TOMMY', foxy: 'FOXY', froggy: 'FROGGY' };
  const EMO = { foxy: '🦊', froggy: '🐸' };
  const DOT = { teddy: '#4a86cf', tommy: '#ff8a1f', foxy: '#ff8a3c', froggy: '#69c94e' };
  const DUST = { park: '#d8b088', desert: '#f5d0a0', snow: '#ffffff', night: '#b8a0d0' };
  const ORD = ['1st', '2nd', '3rd', '4th'];
  const MEDAL = ['🥇', '🥈', '🥉', '🎖️'];

  // ---------- saved choices, best times and wins ----------
  const DEF = () => ({ level: 'easy', rider: 'tommy', track: 'park', lv: { teddy: 'easy', tommy: 'easy' }, p1: 'teddy', best: {}, wins: { teddy: 0, tommy: 0 } });
  let save = DEF();
  try { save = Object.assign(DEF(), JSON.parse(localStorage.getItem(STORE) || '{}')); } catch (e) { /* private mode: defaults */ }
  const store = () => { try { localStorage.setItem(STORE, JSON.stringify(save)); } catch (e) { /* no storage */ } };

  const S = {
    screen: 'loading', mode: 'race', race: null, models: [], buddy: null, demo: false, demoN: 0, paused: false,
    celebrate: null, endT: 0, views: 1, held: false, time: 0, lastCount: 0, shownResults: false, track: null, maps: [],
  };
  const fmt = (t) => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };
  const pick = (a) => a[(Math.random() * a.length) | 0];
  const easeOutBack = (u) => { const c = 1.9; return 1 + (c + 1) * Math.pow(u - 1, 3) + c * Math.pow(u - 1, 2); };

  // ---------- input: two players' actions, from keys and touch ----------
  const mkIn = () => ({ fwd: false, back: false, down: false, jump: false, trick: false, coast: false });
  const inputs = [mkIn(), mkIn()];
  const holds = [0, 1].map(() => ({ fwd: new Set(), back: new Set(), down: new Set() }));
  const KEYS = {
    KeyD: [0, 'fwd'], KeyA: [0, 'back'], KeyW: [0, 'jump'], Space: [0, 'jump'], KeyS: [0, 'down'], KeyF: [0, 'trick'], KeyT: [0, 'call'],
    ArrowRight: [1, 'fwd'], ArrowLeft: [1, 'back'], ArrowUp: [1, 'jump'], ArrowDown: [1, 'down'], KeyL: [1, 'trick'], Slash: [1, 'trick'], Enter: [1, 'call'],
  };
  const slotFor = (s) => (S.mode === '2p' ? s : 0);
  function act(slot, a, down, src) {
    const inp = inputs[slot];
    if (a === 'fwd' || a === 'back' || a === 'down') {
      const set = holds[slot][a];
      if (down) set.add(src); else set.delete(src);
      inp[a] = set.size > 0;
    } else if (down) {
      if (a === 'call') callBrother(slot);
      else inp[a] = true;
    }
  }
  function releaseAll() { for (let s = 0; s < 2; s++) { for (const k in holds[s]) holds[s][k].clear(); Object.assign(inputs[s], mkIn()); } $$('.tb.on').forEach((b) => b.classList.remove('on')); }

  let soundOn = false;
  function wake() {
    if (soundOn) return;
    soundOn = true;
    K.init();
    K.music(S.screen === 'race' ? 'play' : 'title');
  }

  addEventListener('keydown', (e) => {
    wake();
    const c = e.code, scr = S.screen;
    if (c === 'KeyM') { K.toggleMute(); return; }
    if (scr === 'race') {
      if (c === 'KeyP' || c === 'Escape') { e.preventDefault(); pause(); return; }
      const k = KEYS[c];
      if (k) { e.preventDefault(); if (!e.repeat) act(slotFor(k[0]), k[1], true, c); }
      return;
    }
    if (e.repeat) return;
    if (scr === 'paused') {
      if (c === 'KeyP' || c === 'Escape' || c === 'Space' || c === 'Enter') { e.preventDefault(); resume(); } else if (c === 'KeyQ') toMenu();
    } else if (scr === 'title') {
      if (c === 'Digit1' || c === 'Enter' || c === 'Space') { e.preventDefault(); choose('race'); }
      else if (c === 'Digit2') choose('2p');
      else if (c === 'Digit3') choose('tt');
      else if (c === 'KeyE') setLevel(save.level === 'easy' ? 'normal' : 'easy');
    } else if (scr === 'select') {
      if (c === 'Enter' || c === 'Space') { e.preventDefault(); go(); }
      else if (c === 'Escape') show('title');
      else if (c === 'ArrowLeft' || c === 'ArrowRight') { const ids = B.TRACKS.map((t) => t.id); save.track = ids[(ids.indexOf(save.track) + (c === 'ArrowLeft' ? -1 : 1) + ids.length) % ids.length]; buildSelect(); }
      else if (c === 'ArrowUp' || c === 'ArrowDown') { const k = S.mode === '2p' ? 'p1' : 'rider'; save[k] = save[k] === 'teddy' ? 'tommy' : 'teddy'; buildSelect(); }
    } else if (scr === 'results' || scr === 'celebrate') {
      if (c === 'Enter' || c === 'Space') { e.preventDefault(); again(); }
      else if (c === 'KeyN') next();
      else if (c === 'Escape') toMenu();
    }
  });
  addEventListener('keyup', (e) => { const k = KEYS[e.code]; if (k) act(slotFor(k[0]), k[1], false, e.code); });
  addEventListener('blur', releaseAll);

  // touch buttons: each half of the screen has its own set in 2 players
  $$('.tpad').forEach((pad, pi) => {
    pad.querySelectorAll('.tb').forEach((btn) => {
      const a = btn.dataset.act;
      const up = (e) => { btn.classList.remove('on'); act(slotFor(pi), a, false, 'p' + e.pointerId); };
      btn.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        wake();
        try { btn.setPointerCapture(e.pointerId); } catch (er) { /* synthetic */ }
        btn.classList.add('on');
        if (S.screen === 'race') act(slotFor(pi), a, true, 'p' + e.pointerId);
      });
      btn.addEventListener('pointerup', up);
      btn.addEventListener('pointercancel', up);
    });
  });
  const isTouch = () => 'ontouchstart' in window || (window.matchMedia && matchMedia('(pointer: coarse)').matches);
  if (isTouch()) document.body.classList.add('touch');
  addEventListener('pointerdown', (e) => { wake(); if (e.pointerType === 'touch') document.body.classList.add('touch'); }, true);

  // ---------- screens ----------
  function show(name) {
    S.screen = name;
    for (const id of ['title', 'select', 'pause', 'results']) $('#' + id).classList.toggle('hidden', id !== (name === 'paused' ? 'pause' : name));
    const racing = name === 'race' || name === 'paused';
    $('#hud').classList.toggle('hidden', !racing);
    $('#touch').classList.toggle('hidden', name !== 'race');
    $('#split').classList.toggle('hidden', !(racing && S.views === 2));
    $('#menuMute').classList.toggle('hidden', racing || name === 'celebrate' || name === 'loading');
    document.body.classList.toggle('racing', racing);
    if (name === 'title') { buildTitle(); if (!S.demo) startDemo(); }
    if (name === 'select') buildSelect();
    if (soundOn) K.music(name === 'race' ? 'play' : name === 'paused' ? 'pause' : name === 'results' || name === 'celebrate' ? 'over' : 'title');
  }

  function buildTitle() {
    $('#logoText').textContent = B.TITLE;
    $('#tagline').textContent = B.TAGLINE;
    $$('[data-level]').forEach((b) => { const on = b.dataset.level === save.level; b.classList.toggle('on', on); b.setAttribute('aria-checked', on); });
  }
  function setLevel(lv) { save.level = lv; store(); buildTitle(); K.click(); }
  function choose(mode) { S.mode = mode; K.click(); show('select'); }
  $$('[data-mode]').forEach((b) => b.addEventListener('click', () => choose(b.dataset.mode)));
  $$('[data-level]').forEach((b) => b.addEventListener('click', () => setLevel(b.dataset.level)));

  let PORTRAIT = {};
  function buildSelect() {
    const two = S.mode === '2p';
    $('#selTitle').textContent = two ? 'WHO IS PLAYER 1?' : 'PICK YOUR RIDER';
    const p1 = two ? save.p1 : save.rider;
    const rows = $('#riders');
    rows.innerHTML = '';
    for (const id of ['teddy', 'tommy']) {
      const b = document.createElement('button');
      b.className = 'card' + (id === p1 ? ' on' : '');
      b.setAttribute('role', 'option');
      b.innerHTML = `<img alt="" src="${PORTRAIT[id] || ''}"><b>${NAMES[id]}</b><small>${id === 'teddy' ? 'boxing and hoops' : 'peace and love'}</small>` + (two ? `<span class="who ${id === p1 ? '' : 'p2'}">${id === p1 ? 'P1' : 'P2'}</span>` : '');
      b.addEventListener('click', () => { if (two) save.p1 = id; else save.rider = id; store(); K.click(); buildSelect(); });
      rows.appendChild(b);
    }
    const lv = $('#lvl2');
    lv.innerHTML = '';
    if (two) {
      for (const id of [p1, Kit.roster.buddyFor(p1)]) {
        const row = document.createElement('div');
        row.className = 'row';
        row.innerHTML = `<span class="h">${NAMES[id]}</span>`;
        for (const l of ['easy', 'normal']) {
          const o = document.createElement('button');
          o.className = 'opt' + (save.lv[id] === l ? ' on' : '');
          o.innerHTML = `<span class="e">${l === 'easy' ? '🐣' : '🔥'}</span><span><b>${l === 'easy' ? 'EASY' : 'NORMAL'}</b></span>`;
          o.addEventListener('click', () => { save.lv[id] = l; store(); K.click(); buildSelect(); });
          row.appendChild(o);
        }
        lv.appendChild(row);
      }
    }
    const tr = $('#tracks');
    tr.innerHTML = '';
    const lvl = two ? save.lv[p1] : save.level;
    for (const t of B.TRACKS) {
      const b = document.createElement('button');
      b.className = 'card' + (t.id === save.track ? ' on' : '');
      b.setAttribute('role', 'option');
      const best = save.best[t.id + '/' + lvl];
      b.innerHTML = `<span class="em">${t.emoji}</span><b>${t.name}</b><span class="best">${best ? '⏱️ ' + fmt(best) : '⏱️ —'}</span>`;
      b.addEventListener('click', () => { if (save.track === t.id) go(); else { save.track = t.id; store(); K.click(); buildSelect(); } });
      tr.appendChild(b);
    }
  }
  function go() { store(); startRace({}); }
  $('#selGo').addEventListener('click', go);
  $('#selBack').addEventListener('click', () => show('title'));

  // ---------- a race ----------
  function clearRace() {
    for (const m of S.models) A.removeRider(m);
    S.models = [];
    if (S.buddy) A.removeRider(S.buddy.m);
    S.buddy = null;
    S.celebrate = null;
    A.clearFx();
    S.race = null;
    S.demo = false;
    releaseAll();
  }
  function useTrack(id) {
    if (S.track !== id) { S.track = id; A.setTrack(B.track.build(B.TRACK_BY_ID[id])); buildMaps(id); }
  }
  function startRace(o) {
    clearRace();
    if (o.mode) S.mode = o.mode;
    const track = o.track || save.track;
    const two = S.mode === '2p';
    const p1 = o.rider || (two ? save.p1 : save.rider), p2 = Kit.roster.buddyFor(p1);
    const level = o.level || save.level;
    const list = [];
    if (two) {
      list.push({ id: p1, human: true, slot: 0, level: (o.levels && o.levels[0]) || save.lv[p1], z: 1.5 });
      list.push({ id: p2, human: true, slot: 1, level: (o.levels && o.levels[1]) || save.lv[p2], z: -0.2 });
    } else {
      list.push({ id: p1, human: true, slot: 0, level, z: 1.6 });
      if (S.mode === 'race') list.push({ id: 'foxy', cpu: 'foxy', level, z: 0.2 }, { id: 'froggy', cpu: 'froggy', level, z: -1.3 });
    }
    S.race = SIM.createRace({ track, riders: list, count: o.count != null ? o.count : 3, seed: o.seed || ((Math.random() * 1e9) | 0) });
    S.race.riders.forEach((r, i) => { r.z = list[i].z; r.highFive = 0; r.hfAt = -9; });
    useTrack(track);
    S.models = S.race.riders.map((r) => A.makeRider(r.id, { tag: S.mode !== 'tt' }));
    S.views = two ? 2 : 1;
    S.endT = 0; S.lastCount = 0; S.shownResults = false;
    $('#hud').classList.toggle('duo', two); $('#hud').classList.toggle('solo', !two);
    $('#touch').classList.toggle('duo', two); $('#touch').classList.toggle('solo', !two);
    setupBuddyButtons();
    for (const el of $$('.msg')) el.className = 'msg';
    show('race');
    resize();
    cameras(0, true);
  }
  function startDemo() {
    clearRace();
    S.demo = true;
    const t = B.TRACKS[S.demoN++ % B.TRACKS.length].id;
    const list = [{ id: 'teddy', level: 'normal', pilot: SIM.PILOTS.pro(), z: 1.4 }, { id: 'tommy', level: 'easy', pilot: SIM.PILOTS.idle(), z: -0.1 }];
    S.race = SIM.createRace({ track: t, riders: list, count: 1, seed: 5 });
    S.race.riders.forEach((r, i) => { r.z = list[i].z; });
    useTrack(t);
    S.models = S.race.riders.map((r) => A.makeRider(r.id, { tag: true }));
    S.views = 1;
    resize();
    cameras(0, true);
  }

  function setupBuddyButtons() {
    const r0 = S.race.riders[0];
    const two = S.mode === '2p';
    $$('.bud').forEach((el, i) => {
      const me = S.race.riders[two ? i : 0];
      const other = Kit.roster.buddyFor(me.id);
      el.querySelector('img').src = PORTRAIT[other] || '';
      el.querySelector('.lbl').firstChild.textContent = two ? 'HIGH FIVE' : 'CALL';
      el.querySelector('.lbl b').textContent = NAMES[other];
      el.querySelector('.k').textContent = two ? (i ? 'ENTER' : 'T') : 'T';
      el.onclick = () => callBrother(i);
    });
    $$('.tpad').forEach((pad, i) => {
      const me = S.race.riders[two ? i : 0] || r0;
      const other = Kit.roster.buddyFor(me.id);
      pad.querySelector('.call img').src = PORTRAIT[other] || '';
      pad.querySelector('.call small').textContent = two ? '✋' : NAMES[other];
    });
  }

  // ---------- the brother: pops in, does his move, tosses a treat, then gives you a boost ----------
  function callBrother(slot) {
    if (S.screen !== 'race' || !S.race || S.race.phase !== 'go') return;
    if (S.mode === '2p') { highFive(slot); return; }
    const r = S.race.riders[0];
    if (r.finished) return;
    const id = Kit.roster.buddyFor(r.id), e = Kit.roster.get(id);
    const b = S.buddy;
    if (b && b.t < 2.35) return; // he's already on his way with a boost
    if (!b) S.buddy = { id, m: A.makeRider(id, { tag: false, scale: e.buddyScale }), sc: e.buddyScale, t: 0, x: r.x + 2.2 };
    else S.buddy.t = 0;
    Object.assign(S.buddy, { treat: pick(TREATS), tossed: false, boosted: false, ball: false, popped: false });
    K.swish();
    toast(0, `${NAMES[id]}!`, 'cool', 'here I come!');
  }
  function updateBuddy(dt) {
    const b = S.buddy;
    if (!b || !S.race) return;
    const r = S.race.riders[0], trk = S.race.trk;
    b.t += dt;
    const t = b.t;
    // just ahead of you while he says hello, then right behind you pushing while the boost lasts
    const want = t < 2.35 ? r.x + 2.2 : t < 4.6 ? r.x - 1.4 : r.x + 1.2;
    b.x += (want - b.x) * Math.min(1, (t < 0.05 ? 60 : 5) * dt);
    const f = b.fake || (b.fake = { ground: true, pedal: 1, crashT: 0, trick: null, ang: 0 });
    f.x = b.x; f.y = trk.heightAt(b.x); f.v = r.ground ? r.v : r.vx; f.vx = f.v;
    const sig = t > 0.35 && t < 1.5;
    f.peace = b.id === 'tommy' && sig;
    A.place(b.m, f, trk, dt, 2.75);
    if (b.id === 'teddy' && sig) {
      // boxing (jab, guard, straight), then a jump shot with the ball
      const mode = t < 1.15 ? 'boxing' : 'jumpshot';
      Kit.people.pose(b.m.p, (t - 0.35) * 8, mode, 1 - Math.exp(-24 * dt));
      if (mode === 'jumpshot' && !b.ball) {
        b.ball = true;
        A.toss('🏀', { x: b.x + 0.2, y: f.y + 2.2, z: 2.75 }, { x: b.x + 4, y: f.y + 4.2, z: 2.2 }, 0.9);
      }
    }
    if (t > 4.6 && t < 5.0) Kit.people.pose(b.m.p, t * 8, 'wave', 1 - Math.exp(-20 * dt));
    const pop = t < 0.35 ? easeOutBack(Math.min(1, t / 0.35)) : t > 4.8 ? Math.max(0, 1 - (t - 4.8) / 0.4) : 1;
    b.m.g.scale.setScalar(b.sc * Math.max(0.001, pop));
    b.m.scale = b.sc * Math.max(0.05, pop);
    if (!b.popped) { b.popped = true; A.puff(b.x, f.y, 2.75, '#ffffff', 10, 4); }
    if (t >= 1.5 && !b.tossed) {
      b.tossed = true;
      const treat = b.treat;
      A.toss(treat, { x: b.x, y: f.y + 1.6, z: 2.75 }, () => ({ x: r.x, y: r.y + 1.5, z: r.z }), 0.45, () => { K.coin(3); toast(0, `${treat} YUM!`, 'good'); });
    }
    if (t >= 2.35 && !b.boosted) {
      b.boosted = true;
      r.boostT = Math.max(r.boostT, 3);
      K.powerup();
      toast(0, `${NAMES[b.id]} SAYS: BOOST!`, 'good', '', 1.3);
    }
    if (t >= 5.2) { A.puff(b.x, f.y, 2.75, '#ffffff', 8, 3); A.removeRider(b.m); S.buddy = null; }
  }
  // 2 players: a high five (both together: a double high five and a little boost for each)
  function highFive(slot) {
    const r = S.race.riders[slot], o = S.race.riders[1 - slot];
    r.highFive = 0.8;
    r.hfAt = S.time;
    if (S.time - o.hfAt < 1.2) {
      for (const q of [r, o]) { if (!q.finished) q.boostT = Math.max(q.boostT, 1.6); A.confetti(q.x, q.y, q.z, 24); }
      r.hfAt = o.hfAt = -9;
      K.powerup();
      toast(0, 'DOUBLE HIGH FIVE!', 'good', 'boost for both!');
      toast(1, 'DOUBLE HIGH FIVE!', 'good', 'boost for both!');
    } else {
      K.click();
      toast(slot, '✋ HIGH FIVE!', 'cool', 'both press it: T + ENTER');
      A.sprite && A.puff(r.x, r.y + 1.6, r.z, '#ffe27a', 5, 2);
    }
  }

  // ---------- messages ----------
  const toastT = [0, 0], toastHold = [0, 0];
  // prio: the brother's "SAYS: BOOST!" stays up a moment even if a landing message comes along
  function toast(v, text, cls, small, prio) {
    const el = $$('.view')[v] && $$('.view')[v].querySelector('.msg');
    if (!el || (!prio && S.time < toastHold[v])) return;
    if (prio) toastHold[v] = S.time + prio;
    el.innerHTML = '';
    el.appendChild(document.createTextNode(text));
    if (small) { const s = document.createElement('small'); s.textContent = small; el.appendChild(s); }
    el.className = 'msg';
    void el.offsetWidth;
    el.className = 'msg show ' + (cls || '');
    toastT[v] = 1.4;
  }
  function trickName(t) { return t.id + (t.n > 1 ? ' ×' + t.n : ''); }

  function handleEvents() {
    const race = S.race;
    for (const r of race.riders) {
      const v = r.human ? (S.mode === '2p' ? r.slot : 0) : -1;
      for (const e of r.events) {
        if (e.type === 'hop') { if (v >= 0) K.jump(); }
        else if (e.type === 'trick') { if (v >= 0) { K.swish(); toast(v, trickName(e) + '!', 'cool'); } }
        else if (e.type === 'land') {
          A.puff(r.x, r.y, r.z, DUST[race.trk.theme], e.hit > 6 ? 8 : 4);
          if (v < 0) continue;
          K.land();
          if (e.tricks.length) {
            K.coin(e.tricks.length + 1);
            toast(v, e.tricks.map(trickName).join(' + ') + '!', 'good', `+${e.pts}` + (e.perfect ? ' · PERFECT!' : '') + ' · BOOST!');
          } else if (e.perfect) toast(v, 'PERFECT!', 'good', 'BOOST!');
          else if (e.wobbly) toast(v, 'WOBBLE!', 'ouch', 'land flat next time');
        } else if (e.type === 'crash') {
          A.puff(r.x, r.y, r.z, DUST[race.trk.theme], 12, 5);
          if (v >= 0) { K.crash(); toast(v, 'OOPS!', 'ouch', 'land with both wheels'); }
        } else if (e.type === 'finish') {
          if (v >= 0) { K.horn(0.4); toast(v, S.mode === 'tt' ? 'FINISH!' : (ORD[r.place - 1] || '4th') + '!', 'good'); }
        }
      }
      r.events.length = 0;
    }
  }

  function countdownUI(dt) {
    const race = S.race, el = $('#count');
    if (race.phase === 'count') {
      const n = Math.ceil(race.count);
      if (n !== S.lastCount && n <= 3 && !S.demo) {
        S.lastCount = n;
        el.textContent = n;
        el.className = 'count';
        void el.offsetWidth;
        el.className = 'count show';
        if (!S.demo) K.tone({ f: 440, dur: 0.14, vol: 0.25, type: 'square' });
      }
    } else if (S.lastCount !== -1) {
      S.lastCount = -1;
      if (!S.demo) {
        el.textContent = 'GO!';
        el.className = 'count';
        void el.offsetWidth;
        el.className = 'count show go';
        K.tone({ f: 880, dur: 0.3, vol: 0.3, type: 'square' });
        S.goT = 0.65;
      }
    }
    A.setGate(race.phase === 'go');
    if (S.goT > 0 && (S.goT -= dt) <= 0) el.className = 'count';
  }

  // ---------- the end: the winner's move, confetti, then the results ----------
  function checkEnd(dt) {
    const hs = S.race.riders.filter((r) => r.human);
    if (!hs.every((r) => r.finished)) return;
    if ((S.endT += dt) > 1.3) startCelebration();
  }
  function startCelebration() {
    const race = S.race;
    const order = race.riders.slice().sort((a, b) => a.place - b.place);
    const win = order[0];
    const m = S.models[race.riders.indexOf(win)];
    const id = win.id;
    const sig = Kit.roster.get(id) ? Kit.roster.get(id).signature : null;
    S.celebrate = { r: win, m, t: 0, x: win.x, y: race.trk.heightAt(win.x), z: win.z, sig: sig || ['wave'], n: 0 };
    if (S.buddy) { A.removeRider(S.buddy.m); S.buddy = null; }
    S.views = 1;
    resize();
    releaseAll();
    recordResults();
    show('celebrate');
    $('#count').className = 'count';
    A.confetti(win.x + 1, S.celebrate.y + 1.5, win.z + 1, 70);
    K.coin(5);
  }
  function updateCelebration(dt) {
    const c = S.celebrate;
    if (!c) return;
    c.t += dt;
    c.m.g.position.set(c.x, c.y, c.z);
    // Teddy: boxing, then the jump shot (with the ball); Tommy: the Y; Foxy and Froggy wave
    const seq = c.sig, per = 1.6;
    const i = Math.floor(c.t / per) % seq.length, mode = seq[i];
    A.celebrate(c.m, c.t, dt, mode);
    if (mode === 'jumpshot' && Math.floor(c.t / per) !== c.n) {
      c.n = Math.floor(c.t / per);
      A.toss('🏀', { x: c.x + 1.1, y: c.y + 2.4, z: c.z + 1 }, { x: c.x + 3.5, y: c.y + 4.6, z: c.z - 1 }, 0.9);
    }
    if (c.t > 1.2 && c.t - dt <= 1.2) A.confetti(c.x + 1, c.y + 1.5, c.z + 1, 50);
    if (c.t > 2.4 && !S.shownResults) { S.shownResults = true; showResults(); }
  }
  function recordResults() {
    const race = S.race, R = (S.results = { rows: [], best: {}, newBest: {} });
    for (const r of race.riders) {
      if (r.human && r.finished) {
        const key = race.trk.id + '/' + r.level;
        const was = save.best[key];
        if (!was || r.time < was) { save.best[key] = +r.time.toFixed(2); R.newBest[r.id] = true; }
        R.best[r.id] = save.best[key];
      }
    }
    const order = race.riders.slice().sort((a, b) => a.place - b.place);
    const win = order[0];
    if (S.mode !== 'tt' && win.human && save.wins[win.id] != null) save.wins[win.id]++;
    store();
  }
  function showResults() {
    const race = S.race, R = S.results;
    const order = race.riders.slice().sort((a, b) => a.place - b.place);
    const win = order[0], me = race.riders[0];
    const title = $('#resTitle');
    title.className = 'big';
    if (S.mode === 'tt') { title.textContent = R.newBest[me.id] ? 'NEW BEST!' : 'FINISHED!'; if (R.newBest[me.id]) title.classList.add('win'); }
    else if (win.human) { title.textContent = `${NAMES[win.id]} WINS!`; title.classList.add('win'); }
    else title.textContent = `${ORD[me.place - 1]} PLACE!`;
    const t = B.TRACK_BY_ID[race.trk.id];
    const lvls = Array.from(new Set(race.riders.filter((r) => r.human).map((r) => r.level)));
    $('#resSub').innerHTML = `${t.emoji} <span>${t.name}</span> · ${lvls.map((l) => (l === 'easy' ? '🐣 <span>EASY</span>' : '🔥 <span>NORMAL</span>')).join(' / ')}` + (S.mode !== 'tt' ? ` · 🏆 <span data-no-lang>TEDDY ${save.wins.teddy} · TOMMY ${save.wins.tommy}</span>` : '');
    const tb = $('#resTable');
    tb.innerHTML = '';
    const head = document.createElement('tr');
    for (const h of ['', 'RIDER', 'TIME', 'TRICKS', 'BEST']) { const th = document.createElement('th'); th.textContent = h; head.appendChild(th); }
    tb.appendChild(head);
    for (const r of order) {
      const tr = document.createElement('tr');
      if (r.human) tr.className = 'me';
      const pic = PORTRAIT[r.id] ? `<img alt="" src="${PORTRAIT[r.id]}">` : `<span style="font-size:22px;margin-right:6px">${EMO[r.id] || ''}</span>`;
      const best = r.human && R.best[r.id] ? (R.newBest[r.id] ? `<span class="new">${fmt(R.best[r.id])} ⭐</span>` : fmt(R.best[r.id])) : '';
      tr.innerHTML = `<td>${MEDAL[r.place - 1] || ''}</td><td class="who">${pic}${NAMES[r.id]}</td><td class="t">${r.finished ? fmt(r.time) : '—'}</td><td>⭐ ${r.pts}</td><td class="t">${best}</td>`;
      tb.appendChild(tr);
    }
    show('results');
  }
  function again() { if (S.race) startRace({ track: S.race.trk.id }); }
  function next() { if (!S.race) return; const ids = B.TRACKS.map((t) => t.id); save.track = ids[(ids.indexOf(S.race.trk.id) + 1) % ids.length]; store(); startRace({ track: save.track }); }
  function toMenu() { clearRace(); show('title'); }
  $('#againBtn').addEventListener('click', again);
  $('#nextBtn').addEventListener('click', next);
  $('#menuBtn').addEventListener('click', toMenu);

  // ---------- pause ----------
  function pause() { if (S.screen !== 'race') return; S.paused = true; releaseAll(); show('paused'); }
  function resume() { if (S.screen !== 'paused') return; S.paused = false; show('race'); }
  $('#pauseBtn').addEventListener('click', pause);
  $('#resumeBtn').addEventListener('click', resume);
  $('#restartBtn').addEventListener('click', () => { S.paused = false; again(); });
  $('#quitBtn').addEventListener('click', () => { S.paused = false; toMenu(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden && window.game.autoPause) pause(); });

  // ---------- sound button ----------
  const muteText = () => { for (const b of $$('.muteBtn')) b.textContent = K.isMuted() ? '🔇' : '🔊'; };
  $$('.muteBtn').forEach((b) => b.addEventListener('click', () => { wake(); K.toggleMute(); }));
  K.onMute(muteText);

  // ---------- the HUD ----------
  function buildMaps(id) {
    const trk = B.track.build(B.TRACK_BY_ID[id]);
    const pts = [];
    const W = 600, H = 92, top = 14, bot = 10, sc = (H - top - bot) / Math.max(1, trk.maxY - trk.minY);
    for (let x = 0; x <= trk.finishX + 6; x += 1) pts.push([(x / (trk.finishX + 6)) * (W - 24) + 12, top + (trk.maxY - trk.heightAt(x)) * sc]);
    S.mapPts = pts;
    S.mapFin = (trk.finishX / (trk.finishX + 6)) * (W - 24) + 12;
    S.mapX = (x) => (Math.min(x, trk.finishX + 6) / (trk.finishX + 6)) * (W - 24) + 12;
    S.mapY = (y) => top + (trk.maxY - y) * sc;
  }
  function drawMap(cv, me) {
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    g.fillStyle = 'rgba(20,18,31,0.55)';
    G2.round(g, 0, 0, cv.width, cv.height, 18);
    g.fill();
    g.lineWidth = 5; g.strokeStyle = '#ffffff'; g.lineJoin = 'round';
    g.beginPath();
    S.mapPts.forEach(([x, y], i) => (i ? g.lineTo(x, y) : g.moveTo(x, y)));
    g.stroke();
    g.font = '30px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif';
    g.textAlign = 'center';
    g.fillText('🏁', S.mapFin, 40);
    const rs = S.race.riders.slice().sort((a, b) => (a === me) - (b === me));
    for (const r of rs) {
      const x = S.mapX(r.x), y = S.mapY(r.y) - 6;
      g.beginPath(); g.arc(x, y, r === me ? 13 : 9, 0, Math.PI * 2);
      g.fillStyle = DOT[r.id] || '#fff'; g.fill();
      g.lineWidth = 4; g.strokeStyle = r === me ? '#ffd400' : '#14121f'; g.stroke();
    }
  }
  const G2 = { round: (g, x, y, w, h, r) => { g.beginPath(); if (g.roundRect) g.roundRect(x, y, w, h, r); else g.rect(x, y, w, h); } };
  function hud(dt) {
    if (!S.race || S.demo || (S.screen !== 'race' && S.screen !== 'paused')) return;
    const race = S.race;
    const views = $$('.view');
    for (let v = 0; v < S.views; v++) {
      const r = race.riders.find((q) => q.human && (S.mode === '2p' ? q.slot === v : true));
      if (!r) continue;
      const el = views[v];
      el.querySelector('.time').textContent = fmt(r.finished ? r.time : race.t);
      const best = save.best[race.trk.id + '/' + r.level];
      el.querySelector('.sub').textContent = `⭐ ${r.pts}` + (S.mode === 'tt' && best ? ` · BEST ${fmt(best)}` : '');
      const pb = el.querySelector('.placebox');
      const ptxt = S.mode === 'tt' ? '' : ORD[r.place - 1] || '4th';
      if (pb.textContent !== ptxt) { pb.textContent = ptxt; pb.className = 'placebox pop' + (r.place === 1 ? ' p1' : ''); }
      el.querySelector('.boost').classList.toggle('on', r.boostT > 0 && race.phase === 'go');
      el.querySelector('.bud').classList.toggle('on', S.mode !== '2p' && !!S.buddy);
      drawMap(el.querySelector('.map'), r);
      if ((toastT[v] -= dt) <= 0 && toastT[v] > -1) { toastT[v] = -9; el.querySelector('.msg').className = 'msg'; }
    }
  }

  // ---------- each frame ----------
  function updateModels(dt) {
    const race = S.race;
    if (!race) return;
    race.riders.forEach((r, i) => {
      const m = S.models[i];
      if (!m || (S.celebrate && S.celebrate.m === m)) return;
      if (r.highFive > 0) r.highFive -= dt;
      A.place(m, r, race.trk, dt, r.z);
      if (r.boostT > 0 && race.phase === 'go' && Math.random() < 0.6) A.streak(r.x, r.y, r.z);
    });
  }
  function cameras(dt, snap) {
    const race = S.race;
    if (!race) return;
    const vs = A.views;
    if (S.celebrate) {
      const c = S.celebrate;
      vs[0].zoom += (0.5 - vs[0].zoom) * Math.min(1, 2.5 * dt);
      A.follow(vs[0], c.x + 0.6, c.y - (S.screen === 'results' ? 2.4 : 1.4), dt, snap);
      return;
    }
    if (S.demo) {
      const [a, b] = race.riders;
      vs[0].zoom = 1;
      A.follow(vs[0], (a.x + b.x) / 2 - 1, Math.max(a.y, b.y) - 0.5, dt, snap);
      return;
    }
    for (let v = 0; v < S.views; v++) {
      const r = race.riders.find((q) => q.human && (S.mode === '2p' ? q.slot === v : true)) || race.riders[0];
      vs[v].zoom = 1;
      A.follow(vs[v], r.x, r.crashT > 0 ? race.trk.heightAt(r.x) : r.y, dt, snap);
    }
  }
  function update(dt) {
    S.time += dt;
    const race = S.race;
    if (race && !S.paused && S.screen !== 'loading') {
      SIM.stepRace(race, dt, inputs);
      handleEvents();
      countdownUI(dt);
      if (S.screen === 'race') checkEnd(dt);
      if (S.demo && race.riders.every((r) => r.finished || race.t > 90) && race.riders.every((r) => r.x > race.trk.finishX + 14 || race.t > 90)) startDemo();
    }
    updateBuddy(dt);
    updateModels(dt);
    updateCelebration(dt);
    A.updateFx(dt);
    cameras(dt);
    hud(dt);
  }
  function draw() { A.render(S.views); }

  function resize() {
    const W = innerWidth, H = innerHeight;
    A.resize(W, H);
    const vs = A.views;
    if (S.views === 2) { const h = Math.floor(H / 2) - 3; vs[0].rect = [0, 0, W, h]; vs[1].rect = [0, H - h, W, h]; }
    else vs[0].rect = [0, 0, W, H];
    $('#split').classList.toggle('hidden', !(S.views === 2 && (S.screen === 'race' || S.screen === 'paused')));
  }
  addEventListener('resize', () => { resize(); cameras(0, true); });

  let last = performance.now();
  function frame(now) {
    requestAnimationFrame(frame);
    const dt = Math.min(0.05, Math.max(0, (now - last) / 1000));
    last = now;
    if (S.held) return;
    update(dt);
    draw();
  }

  // ---------- start ----------
  function boot() {
    A.init($('#game'));
    try { PORTRAIT = Kit.portraits([Kit.roster.get('teddy'), Kit.roster.get('tommy')], { size: 128 }); } catch (e) { PORTRAIT = {}; }
    muteText();
    resize();
    $('#loading').classList.add('hidden');
    show('title');
    requestAnimationFrame(frame);
  }

  // ---------- for tests (and curious dads) ----------
  function info() {
    const race = S.race;
    return {
      screen: S.screen, mode: S.mode, views: S.views, demo: S.demo,
      phase: race && race.phase, t: race ? +race.t.toFixed(2) : 0, track: race && race.trk.id,
      riders: race ? race.riders.map((r) => ({ id: r.id, level: r.level, x: +r.x.toFixed(2), y: +r.y.toFixed(2), v: +(r.ground ? r.v : Math.hypot(r.vx, r.vy)).toFixed(2), ground: r.ground, finished: r.finished, time: +r.time.toFixed(2), place: r.place, crashes: r.crashes, pts: r.pts, boost: +Math.max(0, r.boostT).toFixed(2), below: r.below })) : [],
      buddy: S.buddy ? { id: S.buddy.id, t: +S.buddy.t.toFixed(2) } : null,
      celebrate: S.celebrate ? { id: S.celebrate.r.id, t: +S.celebrate.t.toFixed(2) } : null,
    };
  }
  window.game = {
    autoPause: true,
    start(o) { wake(); startRace(Object.assign({ count: 0 }, o || {})); return info(); },
    // tick the game by `sec` seconds in 1/60 s frames, then draw once
    step(sec, quick) { const n = Math.max(1, Math.round((sec || 0) * 60)); for (let i = 0; i < n; i++) { update(1 / 60); if (!quick && i === n - 1) draw(); } if (quick) draw(); return info(); },
    hold(v) { S.held = v !== false; return S.held; },
    info,
    press(slot, a, down) { act(slotFor(slot || 0), a, down !== false, 'test'); return info(); },
    call(slot) { callBrother(slot || 0); return info(); },
    warp(dx) { for (const r of S.race.riders) if (r.human) { r.x += dx; r.y = S.race.trk.heightAt(r.x); r.ground = true; } return info(); },
    show(name) { if (name === 'select') { show('select'); } else if (name === 'title') toMenu(); else if (name === 'pause') pause(); return S.screen; },
    choose,
    check() { const c = SIM.check(); return { ok: c.ok, runs: c.runs.length, tests: c.tests }; },
    checkFails() { return SIM.checkFails(); },
    get S() { return S; },
  };
  boot();
})();
