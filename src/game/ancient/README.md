# Ancient Empire II - JS Port

This directory contains the JavaScript port of the original Ancient Empire II Java codebase.

## Directory Structure

The structure mirrors the original Java package `net.toyknight.aeii`:

- `animation/`: Animation logic.
- `campaign/`: Campaign data and logic.
- `concurrent/`: Concurrency utilities (if needed).
- `entity/`: Core game entities (`Map`, `Tile`, `Unit`, `Player`, etc.).
- `manager/`: Game state managers (`SoundManager`, etc.).
- `network/`: Networking logic.
- `record/`: Game recording/replay logic.
- `renderer/`: Rendering logic (Canvas-based, replacing LibGDX).
- `robot/`: AI logic.
- `screen/`: UI screens (`MainMenu`, `GameScreen`, etc.).
- `utils/`: Utility classes.

## Progress

- [x] Directory structure created.
- [x] `entity/Position.js` ported.
- [x] `entity/Tile.js` ported.
- [x] `entity/Tomb.js` ported.
- [x] `entity/Unit.js` moved and updated.
- [x] `entity/Map.js` partially ported (basic structure).

## Next Steps

1.  Complete `Map.js` logic (Unit/Tomb loading).
2.  Port `GameCore.js` (or `GameContext`).
3.  Port `renderer/` classes to use HTML5 Canvas.
4.  Port `screen/` classes.
