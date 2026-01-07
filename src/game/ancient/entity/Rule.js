import UnitFactory from '../utils/UnitFactory.js';

export default class Rule {
    static CASTLE_INCOME = "CASTLE_INCOME";
    static VILLAGE_INCOME = "VILLAGE_INCOME";
    static COMMANDER_INCOME = "COMMANDER_INCOME";
    static KILL_EXPERIENCE = "KILL_EXPERIENCE";
    static ATTACK_EXPERIENCE = "ATTACK_EXPERIENCE";
    static COUNTER_EXPERIENCE = "COUNTER_EXPERIENCE";
    static COMMANDER_PRICE_STEP = "COMMANDER_PRICE_STEP";
    static UNIT_CAPACITY = "UNIT_CAPACITY";
    static ENEMY_CLEAR = "ENEMY_CLEAR";
    static CASTLE_CLEAR = "CASTLE_CLEAR";
    
    static GOLD_PRESET = [200, 250, 300, 450, 500, 550, 700, 850, 1000, 1500, 2000];
    static POPULATION_PRESET = [15, 20, 25, 30, 35, 40];
    
    static POISON_DAMAGE = 10;
    static HEALER_BASE_HEAL = 40;
    static REFRESH_BASE_HEAL = 10;

    constructor(first) {
        this.values = {};
        this.available_units = [];
        
        if (typeof first === 'object') {
             if (first instanceof Rule) {
                // Copy constructor
                const rule = first;
                this.values = { ...rule.values };
                this.available_units = [ ...rule.available_units ];
             } else {
                 // JSON constructor
                 const json = first;
                 this.setValue(Rule.CASTLE_INCOME, json[Rule.CASTLE_INCOME]);
                 this.setValue(Rule.VILLAGE_INCOME, json[Rule.VILLAGE_INCOME]);
                 this.setValue(Rule.COMMANDER_INCOME, json[Rule.COMMANDER_INCOME]);
                 this.setValue(Rule.KILL_EXPERIENCE, json[Rule.KILL_EXPERIENCE]);
                 this.setValue(Rule.ATTACK_EXPERIENCE, json[Rule.ATTACK_EXPERIENCE]);
                 this.setValue(Rule.COUNTER_EXPERIENCE, json[Rule.COUNTER_EXPERIENCE]);
                 this.setValue(Rule.COMMANDER_PRICE_STEP, json[Rule.COMMANDER_PRICE_STEP]);
                 this.setValue(Rule.UNIT_CAPACITY, json[Rule.UNIT_CAPACITY]);
                 this.setValue(Rule.ENEMY_CLEAR, json[Rule.ENEMY_CLEAR]);
                 this.setValue(Rule.CASTLE_CLEAR, json[Rule.CASTLE_CLEAR]);
                 
                 const available_units = json.available_units || [];
                 for (let i = 0; i < available_units.length; i++) {
                     this.addAvailableUnit(available_units[i]);
                 }
             }
        }
    }
    
    getAvailableUnits() {
        return this.available_units;
    }
    
    setAvailableUnits(list) {
        this.available_units = [...list];
    }
    
    addAvailableUnit(index) {
        this.available_units.push(index);
    }
    
    setValue(entry, value) {
        this.values[entry] = value;
    }
    
    getInteger(entry, default_value = 0) {
        const value = this.values[entry];
        if (typeof value === 'number') {
            return value;
        }
        return default_value;
    }
    
    getBoolean(entry, default_value = false) {
        const value = this.values[entry];
        if (typeof value === 'boolean') {
            return value;
        }
        return default_value;
    }
    
    // getString not used in snippet but good to have
    
    static createDefault() {
        const rule = new Rule();
        
        rule.setValue(Rule.CASTLE_INCOME, 100);
        rule.setValue(Rule.VILLAGE_INCOME, 50);
        rule.setValue(Rule.COMMANDER_INCOME, 50);
        rule.setValue(Rule.KILL_EXPERIENCE, 60);
        rule.setValue(Rule.ATTACK_EXPERIENCE, 30);
        rule.setValue(Rule.COUNTER_EXPERIENCE, 10);
        rule.setValue(Rule.COMMANDER_PRICE_STEP, 100);
        rule.setValue(Rule.UNIT_CAPACITY, Rule.POPULATION_PRESET[0]);
        rule.setValue(Rule.ENEMY_CLEAR, true);
        rule.setValue(Rule.CASTLE_CLEAR, true);
        
        rule.setAvailableUnits(Rule.getDefaultUnits());
        
        return rule;
    }
    
    static getDefaultUnits() {
        const commander = UnitFactory.getCommanderIndex();
        const skeleton = UnitFactory.getSkeletonIndex();
        const crystal = UnitFactory.getCrystalIndex(); // Assuming crystal handled safe
        const unit_list = [];
        
        for (let index = 0; index < UnitFactory.getTileCount(); index++) { // Wait, getUnitCount!
             // TileCount? No, UnitFactory.getUnitCount().
             // My implementation of UnitFactory does not have getUnitCount, but getAllUnits().length.
             // I'll assume getAllUnits().length.
        }
        
        const units = UnitFactory.getAllUnits();
        for (let index = 0; index < units.length; index++) {
            if (index !== commander && index !== skeleton && (UnitFactory.isCrystal ? !UnitFactory.isCrystal(index) : true)) {
                 unit_list.push(index);
            }
        }
        
        // Sort
        unit_list.sort((a, b) => {
            return UnitFactory.getDefaultUnit(a).getPrice() - UnitFactory.getDefaultUnit(b).getPrice();
        });
        
        unit_list.push(commander);
        return unit_list;
    }
    
    toJson() {
        const json = {};
        json[Rule.CASTLE_INCOME] = this.getInteger(Rule.CASTLE_INCOME);
        json[Rule.VILLAGE_INCOME] = this.getInteger(Rule.VILLAGE_INCOME);
        json[Rule.COMMANDER_INCOME] = this.getInteger(Rule.COMMANDER_INCOME);
        json[Rule.KILL_EXPERIENCE] = this.getInteger(Rule.KILL_EXPERIENCE);
        json[Rule.ATTACK_EXPERIENCE] = this.getInteger(Rule.ATTACK_EXPERIENCE);
        json[Rule.COUNTER_EXPERIENCE] = this.getInteger(Rule.COUNTER_EXPERIENCE);
        json[Rule.COMMANDER_PRICE_STEP] = this.getInteger(Rule.COMMANDER_PRICE_STEP);
        json[Rule.UNIT_CAPACITY] = this.getInteger(Rule.UNIT_CAPACITY);
        json[Rule.ENEMY_CLEAR] = this.getBoolean(Rule.ENEMY_CLEAR);
        json[Rule.CASTLE_CLEAR] = this.getBoolean(Rule.CASTLE_CLEAR);
        json.available_units = this.available_units;
        return json;
    }
}
