import Tile from '../entity/Tile.js';

let tile_list = [];

export default class TileFactory {
    static loadTileData(data) {
        TileFactory.init(data);
    }
    
    static init(data) {
        tile_list = new Array(data.length);
        data.forEach(tileData => {
            const tile = new Tile(tileData.defence_bonus, tileData.step_cost, tileData.type);
            tile.setTopTileIndex(tileData.top_tile_index);
            tile.setHpRecovery(tileData.hp_recovery);
            tile.setTeam(tileData.team);
            
            if (tileData.access_tile_list) {
                 tile.setAccessTileList(tileData.access_tile_list);
            }
            
            tile.setCapturable(tileData.is_capturable);
            if (tileData.is_capturable) {
                 tile.setCapturedTileList(tileData.captured_tile_list);
            }
            
            tile.setDestroyable(tileData.is_destroyable);
            if (tileData.is_destroyable) {
                tile.setDestroyedTileIndex(tileData.destroyed_tile_index);
            }

            tile.setRepairable(tileData.is_repairable);
            if (tileData.is_repairable) {
                tile.setRepairedTileIndex(tileData.repaired_tile_index);
            }

            tile.setAnimated(tileData.is_animated);
            if (tileData.is_animated) {
                tile.setAnimationTileIndex(tileData.animation_tile_index);
            }

            tile.setMiniMapIndex(tileData.mini_map_index);
            tile.setCastle(tileData.is_castle);
            tile.setVillage(tileData.is_village);
            
            if (tileData.is_temple !== undefined) {
                tile.setTemple(tileData.is_temple);
            }
            
            tile_list[tileData.index] = tile;
        });
    }

    static getTile(index) {
        if (index < 0 || index >= tile_list.length) return null;
        return tile_list[index];
    }

    static getTileCount() {
        return tile_list.length;
    }
}
