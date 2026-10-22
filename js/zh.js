/* 中文 for TT BMX: every word on the page, the race messages and the ? panel (Kit.lang, from kit/lang.js). Page text
   translates by itself; js/game.js asks Kit.lang.t() for the words it builds into messages and tables.
   Stays in English on purpose: the game's name (Alan names his games), the riders' names (TEDDY, TOMMY, FOXY,
   FROGGY), key labels (T, ENTER) and the name on the start gate's banner. */
(function () {
  'use strict';
  const L = Kit.lang;
  const NAMES = ['TEDDY', 'TOMMY', 'FOXY', 'FROGGY'];
  L.keep([BMX.TITLE, BMX.TITLE.toUpperCase(), 'Claude Code', ...NAMES, 'Teddy', 'Tommy', 'T', 'ENTER', 'Esc', 'TT', 'P1', 'P2', 'BMX']);

  const TRICKS = {
    'NO HANDS': '放开双手', SUPERMAN: '超人飞', 'CAN-CAN': '踢腿', TABLETOP: '平板车', TAILWHIP: '甩车尾', BACKFLIP: '后空翻', FRONTFLIP: '前空翻',
  };
  L.add(TRICKS);
  L.add({
    // title
    "Teddy & Tommy's bike jumps": 'Teddy 和 Tommy 的小轮车跳台',
    '🏁 RACE': '🏁 比赛', 'race Foxy and Froggy': '和 Foxy、Froggy 比赛',
    '👫 2 PLAYERS': '👫 双人', 'Teddy against Tommy': 'Teddy 对 Tommy',
    '⏱️ TIME TRIAL': '⏱️ 计时赛', 'beat your best time': '打破你的最好成绩',
    LEVEL: '难度', Difficulty: '难度',
    'the bike pedals · always lands · makes every jump': '自动骑 · 总能落地 · 每个跳台都飞得过',
    'you pedal · land straight · flips!': '自己骑 · 要平稳落地 · 能翻跟头！',
    'PLAYER 1': '玩家 1', 'PLAYER 2': '玩家 2',
    'pedal · brake (in the air: lean)': '骑车 · 刹车（在空中：倾斜）', 'jump · pump': '跳 · 压车',
    'trick in the air': '空中技巧', 'call your brother': '叫兄弟来',
    "⬆ jumps, ⭐ does a trick in the air. ▶ pedals and ◀ brakes; in the air they lean the bike for flips. Tap your brother's face to call him!":
      '⬆ 跳起来，⭐ 在空中做技巧。▶ 骑车，◀ 刹车；在空中它们让车倾斜，可以翻跟头。点兄弟的头像叫他来！',
    'built with': '制作工具：',
    'LOADING…': '加载中…', '↻ Turn sideways to see more track!': '↻ 横过来，看到更多赛道！',
    // pick
    'PICK YOUR RIDER': '选你的车手', 'WHO IS PLAYER 1?': '谁是玩家 1？', Riders: '车手', Tracks: '赛道',
    'PICK A TRACK': '选一条赛道', 'boxing and hoops': '拳击和篮球', 'peace and love': '和平与爱',
    'DIRT PARK': '泥土公园', 'CACTUS CANYON': '仙人掌峡谷', 'SNOWY HILLS': '雪山', 'MOON CITY': '月亮城',
    '◀ BACK': '◀ 返回', 'GO! 🏁': '出发！🏁', '← → track · Enter: go · Esc: back': '← → 选赛道 · 回车：出发 · Esc：返回',
    EASY: '简单', NORMAL: '普通',
    // the race
    'GO!': '出发！', CALL: '叫', 'HIGH FIVE': '击掌', 'BOOST!': '加速！', BEST: '最好',
    '1st': '第1', '2nd': '第2', '3rd': '第3', '4th': '第4',
    'PERFECT!': '完美落地！', 'WOBBLE!': '摇摇晃晃！', 'land flat next time': '下次落地放平一点',
    'OOPS!': '哎呀！', 'land with both wheels': '两个轮子一起落地', 'FINISH!': '到终点啦！',
    'here I come!': '我来啦！', 'YUM!': '好吃！', 'SAYS: BOOST!': '说：加速！',
    'HIGH FIVE!': '击掌！', 'DOUBLE HIGH FIVE!': '双人击掌！', 'boost for both!': '两个人都加速！', 'both press it:': '一起按：',
    Pause: '暂停', 'Pause (P)': '暂停（P）', 'Sound (M)': '声音（M）', 'Sound on or off': '声音开关', 'Sound on / off (M)': '声音开关（M）',
    'Brake, lean back': '刹车，向后倾', 'Pedal, lean forward': '骑车，向前倾', 'Call your brother': '叫兄弟来', 'High five': '击掌',
    Pump: '压车', Trick: '技巧', Jump: '跳',
    BRAKE: '刹车', PEDAL: '骑', PUMP: '压车', TRICK: '技巧', JUMP: '跳',
    // pause, results
    PAUSED: '暂停', '▶ RESUME': '▶ 继续', '↻ RESTART': '↻ 重来', MENU: '菜单',
    'P · Esc to resume · Q for the menu · M sound': 'P · Esc 继续 · Q 回菜单 · M 声音',
    'NEW BEST!': '新纪录！', 'FINISHED!': '完成啦！', 'WINS!': '赢啦！', 'PLACE!': '名！',
    RIDER: '车手', TIME: '时间', TRICKS: '技巧', '↻ PLAY AGAIN': '↻ 再玩一次', 'NEXT TRACK ▶': '下一条赛道 ▶',
    'Enter: play again · N: next track · Esc: menu': '回车：再玩一次 · N：下一条赛道 · Esc：菜单',
    // the ? panel
    'Player 1': '玩家 1', 'Player 2': '玩家 2',
    'pedal (🐣 Easy pedals by itself)': '骑车（🐣 简单：自动骑）', brake: '刹车',
    'in the air: lean back · lean forward (flips!)': '在空中：向后倾 · 向前倾（翻跟头！）', jump: '跳',
    'pump (hold it going down a bump: faster)': '压车（下坡时按住：更快）',
    'call your brother (2 players: high five)': '叫兄弟来（双人：击掌）',
    'title: race · 2 players · time trial · easy': '标题：比赛 · 双人 · 计时赛 · 简单',
    'In 1 player both sets of keys work, and T or Enter calls your brother as often as you like: a treat, then a boost. Tricks and perfect landings give you a boost too. On 🔥 Normal, land with both wheels on the dirt!':
      '单人时两套按键都能用，T 或回车随时叫兄弟来，想叫几次都行：先送零食，再帮你加速。做技巧和完美落地也能加速。🔥 普通难度要两个轮子一起落地！',
    "⬆ jumps, ⭐ does a trick in the air, ⬇ pumps. ▶ pedals and ◀ brakes; in the air they lean the bike. Tap your brother's face to call him. Two players: each half of the screen has its own buttons.":
      '⬆ 跳起来，⭐ 在空中做技巧，⬇ 压车。▶ 骑车，◀ 刹车；在空中它们让车倾斜。点兄弟的头像叫他来。双人时，屏幕上下两半各有一套按钮。',
  });
  // words built with names or numbers in them
  L.rule(/^(TEDDY|TOMMY|FOXY|FROGGY)!$/, '$1！');
})();
