/* The keys the ? panel shows. Press ? (Shift + /) in the game, or tap the round ? button.
   The panel and the freeze live in the shared kit: kit/help.js (Kit.help). */
Kit.help.setup({
  title: BMX.TITLE, // the name lives in js/title.js
  cols: ['Player 1', 'Player 2'],
  keys: [
    ['pedal (🐣 Easy pedals by itself)', 'D', '→'],
    ['brake', 'A', '←'],
    ['in the air: lean back · lean forward (flips!)', 'A · D', '← · →'],
    ['jump', 'W or Space', '↑'],
    ['pump (hold it going down a bump: faster)', 'S', '↓'],
    ['trick in the air', 'F', 'L'],
    ['call your brother (2 players: high five)', 'T', 'Enter'],
    ['pause · sound', 'P or Esc · M', ''],
    ['title: race · 2 players · time trial · easy', '1 2 3 E', ''],
  ],
  note: 'In 1 player both sets of keys work, and T or Enter calls your brother as often as you like: a treat, then a boost. Tricks and perfect landings give you a boost too. On 🔥 Normal, land with both wheels on the dirt!',
  touch: '⬆ jumps, ⭐ does a trick in the air, ⬇ pumps. ▶ pedals and ◀ brakes; in the air they lean the bike. Tap your brother\'s face to call him. Two players: each half of the screen has its own buttons.',
});
