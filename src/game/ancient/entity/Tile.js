export default class Tile {
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

    getType() {
        return this.type;
    }

    getDefenceBonus() {
        return this.defence_bonus;
    }

    getStepCost() {
        return this.step_cost;
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

    setCapturable(b) {
        this.can_be_captured = b;
    }

    isCapturable() {
        return this.can_be_captured;
    }

    setDestroyable(b) {
        this.can_be_destroyed = b;
    }

    isDestroyable() {
        return this.can_be_destroyed;
    }

    setRepairable(b) {
        this.can_be_repaired = b;
    }

    isRepairable() {
        return this.can_be_repaired;
    }

    setAnimated(b) {
        this.is_animated = b;
    }

    isAnimated() {
        return this.is_animated;
    }

    setCastle(b) {
        this.is_castle = b;
        if (this.is_village && this.is_castle) {
            this.is_village = false;
        }
    }

    isCastle() {
        return this.is_castle;
    }

    setVillage(b) {
        this.is_village = b;
        if (this.is_village && this.is_castle) {
            this.is_castle = false;
        }
    }

    isVillage() {
        return this.is_village;
    }

    setTemple(b) {
        this.is_temple = b;
    }

    isTemple() {
        return this.is_temple;
    }

    setCapturedTileList(list) {
        this.captured_tile_list = list;
    }

    getCapturedTileIndex(team) {
        if (!this.captured_tile_list) return 0; // Guard against null
        if (0 <= team && team < 4) {
            return this.captured_tile_list[team];
        } else {
            return this.captured_tile_list[4];
        }
    }

    setDestroyedTileIndex(index) {
        this.destroyed_index = index;
    }

    getDestroyedTileIndex() {
        return this.destroyed_index;
    }

    setRepairedTileIndex(index) {
        this.repaired_index = index;
    }

    getRepairedTileIndex() {
        return this.repaired_index;
    }

    setAnimationTileIndex(index) {
        this.animation_tile_index = index;
    }

    getAnimationTileIndex() {
        return this.animation_tile_index;
    }

    getVerification() {
        let str = "";
        str = str
                + this.defence_bonus
                + this.step_cost
                + this.hp_recovery
                + this.type
                + this.team
                + this.can_be_captured
                + this.can_be_destroyed
                + this.can_be_repaired
                + this.is_castle
                + this.is_village
                + this.destroyed_index
                + this.repaired_index;
        if (this.access_tile_list != null) {
            for (let index of this.access_tile_list) {
                str += index;
            }
        }
        if (this.captured_tile_list != null) {
            for (let index of this.captured_tile_list) {
                str += index;
            }
        }
        return str;
    }
}
