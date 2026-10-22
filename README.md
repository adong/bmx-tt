# TT BMX

[![TT BMX title screen](docs/screenshot.jpg)](https://adong.github.io/bmx-tt/)

Press **?** any time (or tap the round **?** button on the left edge) to see the keys. The game waits while you look.
Tap the language button under it (the A文 icon) to switch between English and 中文; the dashboard and every game remember the choice.

**中文：** 小轮车：从起跑门冲下去，飞过跳台，压过小土包，在空中做技巧、翻跟头，第一个冲过终点！可以和 Foxy、Froggy 比赛，可以自己计时，也可以兄弟俩上下分屏一起比。

Side-view BMX racing for Teddy and Tommy. Roll out of the start gate, pump the rollers, fly the tabletops and doubles, pull a SUPERMAN or a backflip in the air and land it for a boost. **Race** Foxy 🦊 and Froggy 🐸, ride a **time trial** against your best time, or race each other on a split screen. Four tracks, two levels, and the other brother always ready to ride in with a treat and a push.

It's built with Claude Code from plain JavaScript and Three.js, in the same style as Metro Surfer and the other Teddy & Tommy games. There are no image, model or audio files: the dirt, jumps, trees, cacti and city are boxes and canvas textures, the bikes are tubes and rings, Teddy and Tommy come from the shared kit (`kit/`), and every sound is synthesised.

## Play

- **Double-click `index.html`.** It works offline, because Three.js and the kit are copied into `kit/`. Without internet the logo falls back from the Bungee font to Arial Black.
- **Send one file:** `dist/bmx-tt.html` is the whole game in one file. AirDrop or email it, then open it in a browser.
- **Rebuild that file** after any edit: `python3 kit/tools/bundle.py . --name bmx-tt`
- **Get kit updates** from `~/claude-games/kit`: `python3 ../kit/tools/sync.py .`, then rebuild.
- **On the title** pick 🏁 RACE, 👫 2 PLAYERS or ⏱️ TIME TRIAL and 🐣 EASY or 🔥 NORMAL; then your rider (2 players: who is player 1, and each brother's own level) and a track. Behind the title Teddy and Tommy ride the tracks round and round.
- **Each race** starts behind the gate with 3, 2, 1, GO! The gate drops, the clock starts and the start hill gives you speed. A race takes about half a minute.
- **The end:** the winner hops off his bike and does his move facing you (Teddy's boxing, then his 🏀 jump shot; Tommy's Y with peace fingers ✌️) while confetti flies, then the results: 🥇 🥈 🥉, everyone's time and trick stars, the best time with ⭐ when it's new, and the brothers' 🏆 wins. ↻ PLAY AGAIN, NEXT TRACK ▶ or MENU.
- **Saved per browser:** the level, the rider, the track, each brother's 2-player level, the best time on every track at each level, and each brother's wins. `index.html` and `dist/bmx-tt.html` each keep their own, because they're different ways of opening the game.

### The tracks

| Track | Where | What's on it |
|---|---|---|
| 🌳 DIRT PARK | trees and hills | rollers, two tabletops, two doubles, a step-up and a drop |
| 🌵 CACTUS CANYON | sunset desert, mesas | bigger tables and doubles, two drops into the canyon |
| ❄️ SNOWY HILLS | snow, pines, snowmen | lots of rollers, two step-ups and a big drop |
| 🌙 MOON CITY | night, lit windows, neon edge | the biggest double, step-ups and drops |

### Jumps, pumps and tricks

- **Jumps:** where the dirt bends away faster than gravity can hold the wheels on it, you fly: off every lip, and off the tops of rollers when you're fast. ⬆ hops (a bunny hop): hop off a lip for big air.
- **Doubles** have a gap between the takeoff and the landing. Too slow on NORMAL and you drop into it; pedal up the far side (the check proves you always can).
- **Pumping:** hold ⬇ going down the back of a bump to speed up, and it keeps your wheels on the dirt over the rollers.
- **Tricks:** the trick button does NO HANDS, SUPERMAN, CAN-CAN, TABLETOP and TAILWHIP in turn. In the air ◀ and ▶ lean the bike: lean all the way round for a BACKFLIP or FRONTFLIP. A key you were already holding before the jump doesn't lean you, so just holding PEDAL is safe.
- **Landing:** tricks and flips you land give stars and a **BOOST!**, and so does a PERFECT! landing (both wheels along the dirt).

### Levels

- **🐣 EASY (Tommy, 5):** the bike pedals itself, levels itself in the air, makes every gap and never crashes (a crooked landing is just a WOBBLE!). A trick still going when you land finishes by itself. Foxy and Froggy ease off when they're level with you or ahead, so a race is close but Tommy wins it.
- **🔥 NORMAL (Teddy, 8):** you pedal. The bike still levels itself when you let go, so just pedalling never crashes; lean the wrong way or land in the middle of a trick and you tumble off (OOPS!) and are back on the bike a moment later. Foxy and Froggy ride well: pumping, hopping and tricks beat them, just pedalling is a coin toss.

### Race, time trial and 2 players

- **Race:** you against Foxy 🦊 and Froggy 🐸, one lane each; the place shows top right.
- **Time trial:** you alone, with your best time for that track and level in the corner.
- **2 players:** Teddy against Tommy, top and bottom halves of the screen, each with his own keys (or touch buttons), his own level and his own view.

## Controls

| | Player 1 | Player 2 |
|---|---|---|
| pedal (🐣 Easy pedals by itself) | D | → |
| brake | A | ← |
| in the air: lean back · lean forward | A · D | ← · → |
| jump | W or Space | ↑ |
| pump | S | ↓ |
| trick in the air | F | L |
| call your brother (2 players: high five) | T | Enter |
| pause · sound | P or Esc · M | |
| title: race · 2 players · time trial · easy | 1 2 3 E | |

In 1 player both sets of keys work. On a touch screen: ◀ BRAKE and ▶ PEDAL on the left, ⬆ JUMP, ⭐ TRICK, ⬇ PUMP and your brother's face on the right; in 2 players each half of the screen has its own set.

## Companion

- **Call your brother** with T (or Enter, or his face button) any time in a race, as often as you like. Teddy calls Tommy and Tommy calls Teddy.
- He pops in on his own little BMX (at his buddy size) riding beside you, does his move (Tommy: the Y with peace fingers; Teddy: boxing, then a jump shot with a 🏀), tosses you a treat (🍦 💧 🧃 🍪 🍉 🍌, "🍪 YUM!"), then **TOMMY SAYS: BOOST!** (or TEDDY SAYS): three seconds of extra speed while he rides behind you pushing. Then he waves and pops off. Call again as soon as the boost starts.
- **2 players:** T and Enter are a high five ✋. Both press within a second: DOUBLE HIGH FIVE!, confetti and a little boost for both.

## How it was checked

- **`node tools/check.js`** (about a second), the same check as `game.check()` in the page ([js/sim.js](js/sim.js)). Pretend riders ride every track on both levels: on EASY one who presses nothing and three button-mashing 5-year-olds (hops, tricks, random braking and leaning); on NORMAL one who only pedals, a "pro" who pumps, hops off lips and does tricks and backflips by hand, two who lean at random in the air, and Foxy and Froggy.
  - **finishable:** all 48 runs get home (the slowest, a random leaner who crashes a dozen times, in under a minute).
  - **ground:** after every 1/120 s step of every run, nobody is ever below the dirt.
  - **easyNoCrash / goodNoCrash:** EASY never crashes; just pedalling on NORMAL never crashes.
  - **easyRace / normalRace:** in 16 EASY races the pretend kid beats Foxy and Froggy every time; on NORMAL the pro wins on every track, just pedalling places 1st, 1st, 3rd, 3rd.
  - **It can fail:** `node tools/check.js --fails` breaks the rules on purpose and the check must notice each one: an unclimbable wall before every finish line (finishable fails), the ground looked at only every 4th step (riders end up inside the dirt: ground fails), no ground under a flying rider (ground fails), Foxy and Froggy 30% faster (easyRace fails). All four are caught. `game.checkFails()` runs the same in the page.
- **In the browser** (muted): every mode and track through `game.step()`, real key events (title keys, pick, pedal, T, pause, M), the brother's visit (move, treat, boost), the high five, a crash, the finish, celebration and results, the ? panel. 中文: every screen visited with `Kit.lang.untranslated()` returning [], and the message rules checked one by one in node. English: no Chinese on the page except the kit's language button tooltip. No console errors.
- **Layouts** in headless Chrome with touch (`node tools/shoot.js <steps.json> <dir> <width> <height> 1`): phone portrait 390x844, phone landscape 740x360 and iPad 1024x768, 1 player and 2. `docs/screenshot.jpg` is the title screen at 1200x750 (`node tools/shoot.js tools/shots.json docs 1200 750`). `index.html` and `dist/bmx-tt.html` both boot from file:// and play a race to the results with no page errors.

## Files

- [index.html](index.html): the page, its styles, the menus, the HUD and the touch buttons.
- [js/title.js](js/title.js): the name.
- [js/tracks.js](js/tracks.js): the four tracks as lists of pieces (rollers, tables, doubles, step-ups, drops) and the height profile they make.
- [js/sim.js](js/sim.js): the rules with no drawing: rolling, pedalling, pumping, flying, leaning, tricks, landings and crashes, Foxy and Froggy, the pretend riders and the check.
- [tools/check.js](tools/check.js): the check in node.
- [js/art.js](js/art.js): the 3D world (dirt cut away at the front, ground, scenery, sky, start gate, finish), the bikes and riders, tricks, the celebration, dust and confetti, the cameras.
- [js/game.js](js/game.js): screens, keys and touch, races, the brother's visit, the high five, messages, the HUD and mini-map, results, `window.game` for tests.
- [js/keys.js](js/keys.js), [js/zh.js](js/zh.js): the ? panel and the 中文 words.
- [tools/shoot.js](tools/shoot.js): screenshots with headless Chrome.

## Not verified

- **Sound:** every test ran muted, so none of it has been heard; the sounds are checked in code only.
- **Real touch devices:** an iPhone or iPad, iOS Safari, two kids pressing buttons at once on one iPad, and the iPad's frame rate in 2 players (it draws the track twice).
- **Real kids:** whether EASY is fun enough for Tommy, whether NORMAL's landings are fair for Teddy, and whether the flips are too hard to land by hand.
- **The iPad home-screen icon** (🚲 on green) and double-click from Finder.
