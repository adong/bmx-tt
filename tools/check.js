#!/usr/bin/env node
/* The headless check, in node: the same rules the page runs (js/tracks.js + js/sim.js), no browser.
     node tools/check.js              every track finishable on EASY and NORMAL, nobody below the dirt
     node tools/check.js --runs       plus every run's time, crashes, tricks and gap falls
     node tools/check.js --fails      proves the check can fail: each sabotage must be caught
     node tools/check.js --sabotage wall|coarse|nofloor   run the check with one thing broken (it must say FAIL) */
'use strict';
const fs = require('fs');
const path = require('path');
const vm = require('vm');

const ctx = { console, Math, Number, JSON, Object, Array, Float32Array, Infinity, NaN };
ctx.globalThis = ctx;
vm.createContext(ctx);
for (const f of ['js/tracks.js', 'js/sim.js']) vm.runInContext(fs.readFileSync(path.join(__dirname, '..', f), 'utf8'), ctx, { filename: f });
const B = ctx.BMX;
const args = process.argv.slice(2);
const i = args.indexOf('--sabotage');
if (i >= 0) B.sabotage[args[i + 1]] = true;

const t0 = Date.now();
if (args.includes('--fails')) {
  const f = B.sim.checkFails();
  for (const o of f.out) console.log(`${o.caught ? 'caught ' : 'MISSED '} ${o.sabotage} (${o.what}) -> ${o.test}: ${o.detail}`);
  console.log(f.ok ? 'OK: every sabotage was caught' : 'FAIL: a sabotage got through');
  process.exit(f.ok ? 0 : 1);
}
const res = B.sim.check();
if (args.includes('--runs')) {
  for (const r of res.runs) {
    console.log(`${r.track.padEnd(7)} ${r.level.padEnd(6)} ${r.who.padEnd(8)} ${r.finished ? 'home' : 'NOT HOME'} ${r.time.toFixed(1).padStart(6)} s  crashes ${r.crashes}  tricks ${r.tricks}  flips ${r.flips}  gap falls ${r.gapFalls}  below ${r.below}`);
  }
}
for (const t of res.tests) console.log(`${t.ok ? 'ok  ' : 'FAIL'} ${t.name}: ${t.detail}`);
console.log(`${res.ok ? 'OK' : 'FAIL'} (${res.runs.length} runs, ${Date.now() - t0} ms)`);
process.exit(res.ok ? 0 : 1);
