export class Tile {
    static TYPE_LAND = 0;
    static TYPE_WATER = 1;
    static TYPE_FOREST = 2;
    static TYPE_MOUNTAIN = 3;

    constructor(defence_bonus, step_cost, type) {
        this.defence_bonus = defence_bonus;
        this.step_cost = step_cost;
        this.type = type;

        this.hp_recovery = 0;
        this.top_tile_index = -1;
        this.mini_map_index = 0;
        this.team = -1;
        this.access_tile_list = null;

        this.can_be_captured = false;
        this.can_be_destroyed = false;
        this.can_be_repaired = false;
        this.is_animated = false;
        this.is_castle = false;
        this.is_village = false;
        this.is_temple = false;

        this.captured_tile_list = null;
        this.destroyed_index = 0;
        this.repaired_index = 0;
        this.animation_tile_index = 0;
    }

    getDefenceBonus() {
        return this.defence_bonus;
    }

    getStepCost() {
        return this.step_cost;
    }

    setHpRecovery(recovery) {
        this.hp_recovery = recovery;
    }

    getHpRecovery() {
        return this.hp_recovery;
    }

    setType(type) {
        this.type = type;
    }

    getType() {
        return this.type;
    }

    setTopTileIndex(index) {
        this.top_tile_index = index;
    }

    getTopTileIndex() {
        return this.top_tile_index;
    }

    setMiniMapIndex(index) {
        this.mini_map_index = index;
    }

    getMiniMapIndex() {
        return this.mini_map_index;
    }

    setTeam(team) {
        this.team = team;
    }

    getTeam() {
        return this.team;
    }

    setAccessTileList(index) {
        this.access_tile_list = index;
    }

    getAccessTileList() {
        return this.access_tile_list;
    }
}
