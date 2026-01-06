import { GameState } from './src/game/ancient/GameState.js';
import { Grid } from './src/game/ancient/Grid.js';
import { Unit } from './src/game/ancient/entity/Unit.js';
import { UNIT_TYPES, TEAMS, TERRAIN } from './src/game/ancient/constants.js';

// Mock Map Data (10x10)
const mapData = Array(10).fill(0).map(() => Array(10).fill(TERRAIN.PLAIN));
mapData[1][1] = TERRAIN.CASTLE;

const grid = new Grid(10, 10, mapData);

const levelData = {
    buildings: [{ x: 1, y: 1, team: TEAMS.BLUE, type: 'castle' }]
};

const gameState = new GameState(grid, levelData);

// Add King on Castle
const king = new Unit(UNIT_TYPES.KING, TEAMS.BLUE, 1, 1);
gameState.addUnit(king);

// Add Soldier
const soldier = new Unit(UNIT_TYPES.SOLDIER, TEAMS.BLUE, 2, 2);
gameState.addUnit(soldier);

console.log('--- Initial Selection ---');
let result = await gameState.selectTile(1, 1);
console.log('Result 1:', result);

console.log('--- Move Soldier ---');
await gameState.selectTile(2, 2);
await gameState.selectTile(2, 3); // Move
gameState.waitUnit(2, 3); // Wait

console.log('--- Select King After Move ---');
result = await gameState.selectTile(1, 1);
console.log('Result 2:', result);
console.log('Reachable Tiles:', gameState.reachableTiles.length);
