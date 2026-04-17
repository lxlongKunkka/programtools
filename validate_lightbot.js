const levels = [
  {
    id: 'master-7',
    start: { x: 2, y: 4, dir: 'forward' },
    tiles: [[2, 4, 0, true], [3, 4, 0, true], [4, 4, 0, true], [2, 3, 0, true]],
    demo: {
      main: ['p1', 'p2', 'right', 'p1', 'p2'],
      p1: ['walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, {type:'condition', body:'light', test:'dark-target'}],
      p2: ['left', 'left', {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}]
    }
  },
  {
    id: 'master-8',
    start: { x: 2, y: 2, dir: 'forward' },
    tiles: [[2, 2, 0, true], [3, 2, 0, true], [4, 2, 0, true], [2, 1, 0, true], [1, 2, 0, true], [0, 2, 0, true]],
    demo: {
      main: ['p1', 'p2', 'right', 'p1', 'p2', 'right', 'p1', 'p2'],
      p1: ['walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, {type:'condition', body:'light', test:'dark-target'}],
      p2: ['left', 'left', {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}]
    }
  },
  {
    id: 'master-9',
    start: { x: 2, y: 2, dir: 'forward' },
    tiles: [[2, 2, 0, true], [3, 2, 0, true], [4, 2, 0, true], [2, 1, 0, true], [1, 2, 0, true], [0, 2, 0, true], [2, 3, 0, true]],
    demo: {
      main: ['p1', 'p2', 'right', 'p1', 'p2', 'right', 'p1', 'p2', 'right', 'p1', 'p2'],
      p1: ['walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, {type:'condition', body:'light', test:'dark-target'}],
      p2: ['left', 'left', {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}]
    }
  },
  {
    id: 'master-10',
    start: { x: 2, y: 2, dir: 'forward' },
    tiles: [[2, 2, 0, true], [3, 2, 0, true], [4, 2, 0, true], [2, 1, 0, true], [2, 0, 0, true], [1, 2, 0, true], [0, 2, 0, true], [2, 3, 0, true], [2, 4, 0, true]],
    demo: {
      main: [{type:'repeat', body:'p1', count: 4}],
      p1: ['walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, {type:'condition', body:'light', test:'dark-target'}, 'p2'],
      p2: ['left', 'left', {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}, {type:'condition', body:'walk', test:'forward-clear'}, 'walk', {type:'condition', body:'light', test:'dark-target'}, 'right']
    }
  }
];

function simulate(level) {
  const board = {};
  const targets = new Set();
  level.tiles.forEach(([x, y, z, isTarget]) => {
    board[x+','+y] = { x, y, z: z + 1 };
    if (isTarget) targets.add(x+','+y);
  });

  let bot = { ...level.start };
  let lit = new Set();
  const dirs = { forward: { x: 1, y: 0 }, backward: { x: -1, y: 0 }, left: { x: 0, y: -1 }, right: { x: 0, y: 1 } };
  const turnLeft = { forward: 'left', left: 'backward', backward: 'right', right: 'forward' };
  const turnRight = { forward: 'right', right: 'backward', backward: 'left', left: 'forward' };

  function execute(cmd, depth = 0) {
    if (depth > 2000) return;
    if (typeof cmd === 'string') {
      if (cmd === 'walk') {
        const d = dirs[bot.dir];
        const nextX = bot.x + d.x;
        const nextY = bot.y + d.y;
        const curr = board[bot.x+','+bot.y];
        const next = board[nextX+','+nextY];
        if (next && next.z === curr.z) {
          bot.x = nextX;
          bot.y = nextY;
        }
      } else if (cmd === 'jump') {
        const d = dirs[bot.dir];
        const nextX = bot.x + d.x;
        const nextY = bot.y + d.y;
        const curr = board[bot.x+','+bot.y];
        const next = board[nextX+','+nextY];
        if (next && (next.z === curr.z + 1 || next.z < curr.z)) {
          bot.x = nextX;
          bot.y = nextY;
        }
      } else if (cmd === 'left') {
        bot.dir = turnLeft[bot.dir];
      } else if (cmd === 'right') {
        bot.dir = turnRight[bot.dir];
      } else if (cmd === 'light') {
        if (targets.has(bot.x+','+bot.y)) {
          const key = bot.x+','+bot.y;
          if (lit.has(key)) lit.delete(key); else lit.add(key);
        }
      } else if (cmd === 'p1') {
        level.demo.p1.forEach(c => execute(c, depth + 1));
      } else if (cmd === 'p2') {
        level.demo.p2.forEach(c => execute(c, depth + 1));
      }
    } else if (cmd.type === 'repeat') {
      for (let i = 0; i < cmd.count; i++) {
        execute(cmd.body, depth + 1);
      }
    } else if (cmd.type === 'condition') {
      let testResult = false;
      if (cmd.test === 'dark-target') {
        testResult = targets.has(bot.x+','+bot.y) && !lit.has(bot.x+','+bot.y);
      } else if (cmd.test === 'forward-clear') {
        const d = dirs[bot.dir];
        const nextX = bot.x + d.x;
        const nextY = bot.y + d.y;
        const curr = board[bot.x+','+bot.y];
        const next = board[nextX+','+nextY];
        testResult = !!next && (next.z === curr.z || next.z === curr.z + 1 || next.z < curr.z);
      }
      if (testResult) execute(cmd.body, depth + 1);
    }
  }

  level.demo.main.forEach(c => execute(c));
  const unsolved = [...targets].filter(t => !lit.has(t));
  return { success: unsolved.length === 0, bot, unsolved };
}

levels.forEach(l => {
  const result = simulate(l);
  process.stdout.write('Level ' + l.id + ': ' + (result.success ? 'PASSED' : 'FAILED') + '\n');
  if (!result.success) {
    process.stdout.write('  Bot State: ' + JSON.stringify(result.bot) + '\n');
    process.stdout.write('  Remaining Targets: ' + result.unsolved.join(', ') + '\n');
  }
});
