const { TERRAIN, TERRAIN_SPRITES } = require('./src/game/ancient/constants.js');

// Reverse map: sprite index -> Terrain ID
const spriteToTerrain = {};

Object.entries(TERRAIN_SPRITES).forEach(([terrainId, spriteName]) => {
    if (spriteName.startsWith('t')) {
        const spriteIndex = parseInt(spriteName.substring(1));
        // Prefer specific terrains over generic ones if duplicates exist
        // e.g. MOUNTAIN (2) -> t17, MOUNTAIN_SMALL (119) -> t17.
        // We need to decide which one AEM 17 maps to.
        // Usually the lower ID is the base one.
        
        if (spriteToTerrain[spriteIndex] === undefined) {
            spriteToTerrain[spriteIndex] = parseInt(terrainId);
        } else {
            // Collision handling
            // console.log(`Collision for t${spriteIndex}: existing ${spriteToTerrain[spriteIndex]}, new ${terrainId}`);
            // If the new one is a "base" terrain (0-5), prefer it?
            // Or if the existing one is "base", keep it?
            // Let's see the collisions.
        }
    }
});

console.log("TILE_MAPPING = {");
Object.keys(spriteToTerrain).sort((a,b) => a-b).forEach(k => {
    console.log(`    ${k}: ${spriteToTerrain[k]},`);
});
console.log("}");
