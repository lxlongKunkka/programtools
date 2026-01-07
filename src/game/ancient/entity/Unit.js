import Status from './Status.js';
import UnitFactory from '../utils/UnitFactory.js';

export default class Unit {
    static ATTACK_PHYSICAL = 0;
    static ATTACK_MAGIC = 1;

    static LEVEL_EXPERIENCE = [0, 100, 300, 600];

    constructor(first, second) {
        // Initialize default values
        this.level = 0;
        this.experience = 0;
        this.is_standby = false;
        this.is_static = false;
        this.head = 0;
        this.abilities = [];

        if (first instanceof Unit) {
            // Copy constructor logic (covering Type 2 and 3)
            // first is Unit, second is unit_code (optional)
            const unit = first;
            const unit_code = second !== undefined ? second : unit.getUnitCode();
            
            // From private boolean init logic
            this.index = unit.getIndex();
            this.unit_code = unit_code;
            
            this.level = unit.getLevel();
            this.experience = unit.getTotalExperience();
            this.price = unit.getPrice();
            this.occupancy = unit.getOccupancy();
            this.team = unit.getTeam();
            this.max_hp = unit.getMaxHpRaw(); // Access raw max_hp without level bonus? 
            // Wait, Java: this.max_hp = unit.getMaxHp(); calling logic returns calculated HP?
            // Re-reading Java: 
            // public Unit(Unit unit, String unit_code) {
            //     this.max_hp = unit.getMaxHp();
            // }
            // public int getMaxHp() { return max_hp + getHpGrowth() * getLevel(); }
            // So the new unit's max_hp gets the calculated value (base + growth).
            // BUT if new unit level is > 0, does it apply growth AGAIN?
            // "this.level = unit.getLevel();"
            // "this.max_hp = unit.getMaxHp();"
            // If I request getMaxHp() on the new unit, it will be this.max_hp + growth * level.
            // So it would double count growth?
            // Let's verify Java references.
            // Java: this.max_hp = unit.getMaxHp();
            // If unit.level=1, max_hp=base+growth.
            // New unit level=1. New getMaxHp() = (base+growth) + growth*1 = base + 2*growth.
            // This seems wrong unless "max_hp" field stores the BASE.
            // In Java code: private int max_hp;
            // The method getMaxHp() adds growth.
            // The copy constructor: "this.max_hp = unit.getMaxHp();"
            // It seems it permanently buffs the base hp with the growth?
            // Let's check getHpGrowth().
            // AND "this.hp_growth = unit.getHpGrowth();"
            
            // If the intention is that `max_hp` stores the CURRENT max HP base, then yes.
            // But if `Unit` is meant to be a clone, it should probably copy the raw fields?
            // Wait! The java copy constructor uses getters! 
            // "this.max_hp = unit.getMaxHp();" relies on the public getter.
            // So yes, it bakes the growth into the new base.
            // AND it keeps the level: "this.level = unit.getLevel();"
            // AND it keeps the growth: "this.hp_growth = unit.getHpGrowth();"
            // So next time getMaxHp() is called: (oldBase + oldLevel*growth) + currentLevel*growth.
            // This effectively doubles the level bonus if level is preserved. 
            // UNLESS `unit` (the prototype) is typically Level 0.
            // If copying a level 0 unit, then `getMaxHp()` is just base.
            // If copying a leveled unit, it seems buggy or intended to ratchet stats?
            // However, "level" is copied.
            
            // Let's look at `reset()` logic or similar if it exists? No reset.
            // Maybe `max_hp` field IS the calculated value? No, `getMaxHp` adds to it.
            // The copy constructor might be flawed in Java or I am misinterpreting.
            // OR `unit.getMaxHp()` returns the field?
            // Check Java code:
            // public int getMaxHp() { return max_hp + getHpGrowth() * getLevel(); }
            // So it definitely adds growth.
            
            // I will implement EXACTLY as Java source dictates.
            
            this.max_hp = unit.getMaxHp();
            this.current_hp = unit.getCurrentHp();
            this.attack = unit.getAttack();
            this.attack_type = unit.getAttackType();
            this.physical_defence = unit.getPhysicalDefence();
            this.magic_defence = unit.getMagicDefence();
            this.movement_point = unit.getMovementPoint();
            this.current_movement_point = unit.getCurrentMovementPoint();
            
            this.hp_growth = unit.getHpGrowth();
            this.attack_growth = unit.getAttackGrowth();
            this.physical_defence_growth = unit.getPhysicalDefenceGrowth();
            this.magic_defence_growth = unit.getMagicDefenceGrowth();
            this.movement_growth = unit.getMovementGrowth();
            
            this.x_position = unit.getX();
            this.y_position = unit.getY();
            
            this.max_attack_range = unit.getMaxAttackRange();
            this.min_attack_range = unit.getMinAttackRange();
            
            // Deep copy abilities
            this.abilities = [...unit.getAbilities()];
            
            this.status = unit.getStatus() == null ? null : new Status(unit.getStatus());
            this.is_static = unit.isStatic();
            this.head = unit.getHead();
            
            if (second === undefined) {
                 this.setStandby(unit.isStandby());
            } 

        } else if (typeof first === 'object' && typeof second === 'number') { // UnitDefinition and index
            const definition = first;
            const index = second;
            
            // Private constructor logic merged
            this.index = index;
            this.unit_code = "#";
            
            this.price = definition.price;
            this.occupancy = definition.occupancy;
            this.max_hp = definition.max_hp;
            this.attack = definition.attack;
            this.attack_type = definition.attack_type;
            this.physical_defence = definition.physical_defence;
            this.magic_defence = definition.magic_defence;
            this.movement_point = definition.movement_point;
            
            // In Java: this.abilities = definition.abilities; (assignment)
            // But we treat it as array copy to be safe usually?
            // Java source: definition is just a struct, might share array ref? 
            // "this.abilities = definition.abilities;" 
            // If definition.abilities is an Array, it is shared.
            // If LibGDX Array copy logic isn't used, it is shared.
            // I'll stick to assignment if that's what Java does, but assuming definition comes from JSON loader, it's safer to copy if we modify it.
            // Actually Java: public Unit(UnitDefinition definition, int index)
            // definition.abilities is passed.
            // default_units[index] is new Unit(def).
            // Then copy constructor `this.abilities = new Array<Integer>(unit.getAbilities())` creates NEW array.
            // So default units might share the array from definition, but instances in game use copy constructor which deep copies.
            // So it is fine.
            this.abilities = definition.abilities || [];
            
            this.hp_growth = definition.hp_growth;
            this.attack_growth = definition.attack_growth;
            this.physical_defence_growth = definition.physical_defence_growth;
            this.magic_defence_growth = definition.magic_defence_growth;
            this.movement_growth = definition.movement_growth;
            this.max_attack_range = definition.max_attack_range;
            this.min_attack_range = definition.min_attack_range;
        }
    }

    getIndex() {
        return this.index;
    }

    isCommander() {
        return UnitFactory.isCommander(this.getIndex());
    }

    isCrystal() {
        return UnitFactory.isCrystal(this.getIndex());
    }

    isSkeleton() {
        return UnitFactory.isSkeleton(this.getIndex());
    }

    getPrice() {
        return this.price;
    }

    setPrice(price) {
        this.price = price;
    }

    getOccupancy() {
        return this.occupancy;
    }

    setOccupancy(occupancy) {
        this.occupancy = occupancy;
    }

    getLevel() {
        return this.level;
    }

    setUnitCode(unit_code) {
        this.unit_code = unit_code;
    }

    getUnitCode() {
        return this.unit_code;
    }

    getTeam() {
        return this.team;
    }

    setTeam(team) {
        this.team = team;
    }

    getMaxHp() {
        return this.max_hp + this.getHpGrowth() * this.getLevel();
    }
    
    // Helper to access raw field for copy constructor if needed, 
    // but strict port calls .getMaxHp() so I used that above.
    getMaxHpRaw() { 
        return this.max_hp; 
    }

    getCurrentHp() {
        return this.current_hp;
    }

    setCurrentHp(current_hp) {
        this.current_hp = current_hp;
    }

    changeCurrentHp(change) {
        this.current_hp += change;
    }

    getAttack() {
        return this.attack + this.getAttackGrowth() * this.getLevel();
    }

    getAttackType() {
        return this.attack_type;
    }

    getPhysicalDefence() {
        return this.physical_defence + this.getPhysicalDefenceGrowth() * this.getLevel();
    }

    getMagicDefence() {
        return this.magic_defence + this.getMagicDefenceGrowth() * this.getLevel();
    }

    getMovementPoint() {
        if (this.hasStatus(Status.SLOWED)) {
            return 1;
        } else {
            return this.movement_point + this.getMovementGrowth() * this.getLevel();
        }
    }

    getCurrentMovementPoint() {
        return this.current_movement_point;
    }

    setCurrentMovementPoint(current_movement_point) {
        this.current_movement_point = current_movement_point;
    }

    resetMovementPoint() {
        this.current_movement_point = this.getMovementPoint();
    }

    hasAbility(ability) {
        return this.abilities.indexOf(ability) >= 0;
    }

    getAbilities() {
        return this.abilities;
    }

    setAbilities(abilities) {
        this.abilities = abilities;
    }

    clearStatus() {
        this.status = null;
    }

    getStatus() {
        return this.status;
    }

    hasStatus(type) {
        return this.getStatus() != null && this.getStatus().getType() === type;
    }

    getHpGrowth() {
        return this.hp_growth;
    }

    getAttackGrowth() {
        return this.attack_growth;
    }

    getPhysicalDefenceGrowth() {
        return this.physical_defence_growth;
    }

    getMagicDefenceGrowth() {
        return this.magic_defence_growth;
    }

    getMovementGrowth() {
        return this.movement_growth;
    }

    getX() {
        return this.x_position;
    }

    setX(x_position) {
        this.x_position = x_position;
    }

    getY() {
        return this.y_position;
    }

    setY(y_position) {
        this.y_position = y_position;
    }

    getMaxAttackRange() {
        if (this.hasStatus(Status.BLINDED)) {
            return 0;
        } else {
            return this.max_attack_range;
        }
    }

    getMinAttackRange() {
        if (this.hasStatus(Status.BLINDED)) {
            return 0;
        } else {
            return this.min_attack_range;
        }
    }

    setStandby(b) {
        this.is_standby = b;
    }
    
    isStandby() {
        return this.is_standby;
    }
    
    isStatic() {
        return this.is_static;
    }
    
    getHead() {
        return this.head;
    }

    isAt(xOrPos, y) {
        if (typeof xOrPos === 'object') {
            return this.x_position === xOrPos.x && this.y_position === xOrPos.y;
        } else {
            return this.x_position === xOrPos && this.y_position === y;
        }
    }

    gainExperience(experience) {
        if (this.level < 3) {
            const old_level = this.getLevel();
            const total_experience = this.getTotalExperience();
            this.setTotalExperience(total_experience + experience);
            const level_advance = this.getLevel() - old_level;
            this.current_hp += this.getHpGrowth() * level_advance;
            this.current_movement_point += this.movement_growth * level_advance;
            return level_advance > 0;
        } else {
            return false;
        }
    }

    setTotalExperience(experience) {
        this.experience = experience;
        for (this.level = 0; this.level <= 3; this.level++) {
            if (Unit.LEVEL_EXPERIENCE[this.level] === undefined) break; // Safety
            if (experience < Unit.LEVEL_EXPERIENCE[this.level]) {
                this.level--;
                break;
            }
        }
        if (this.level > 3) {
            this.level = 3;
        }
    }

    setStatic(b) {
        this.is_static = b;
    }

    setStatus(status) {
        this.status = status;
    }

    setHead(head) {
        this.head = head;
    }

    static restoreFromJson(json) {
        const index = json.index;
        const team = json.team;
        const unit_code = json.unit_code;
        
        const unit = UnitFactory.createUnit(index, team, unit_code);
        if (!unit) return null;
        
        unit.setPrice(json.price);
        unit.gainExperience(json.experience);
        unit.setCurrentHp(json.current_hp);
        unit.setCurrentMovementPoint(json.current_movement_point);
        unit.setX(json.x_position);
        unit.setY(json.y_position);
        unit.setStandby(json.standby);
        unit.setStatic(json.static);
        unit.setHead(json.head !== undefined ? json.head : 0); // Check undefined for primitive int default
        
        if (json.status) {
            unit.setStatus(new Status(json.status));
        }
        return unit;
    }

    getTotalExperience() {
        return this.experience;
    }


    toJson() {
        const json = {
            index: this.getIndex(),
            price: this.getPrice(),
            experience: this.getTotalExperience(),
            unit_code: this.getUnitCode(),
            team: this.getTeam(),
            current_hp: this.getCurrentHp(),
            current_movement_point: this.getCurrentMovementPoint(),
            x_position: this.getX(),
            y_position: this.getY(),
            standby: this.isStandby(),
            static: this.isStatic(),
            head: this.getHead()
        };
        if (this.getStatus() != null) {
            json.status = this.getStatus().toJson();
        }
        return json;
    }

}
