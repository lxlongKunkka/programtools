export default class Ability {
    static CONQUEROR = 0;
    static FIGHTER_OF_THE_SEA = 1;
    static FIGHTER_OF_THE_FOREST = 2;
    static FIGHTER_OF_THE_MOUNTAIN = 3;
    static DESTROYER = 4;
    static AIR_FORCE = 5;
    static NECROMANCER = 6;
    static HEALER = 7;
    static CHARGER = 8;
    static POISONER = 9;
    static REPAIRER = 10;
    static UNDEAD = 11;
    static MARKSMAN = 12;
    static SON_OF_THE_SEA = 13;
    static SON_OF_THE_FOREST = 14;
    static SON_OF_THE_MOUNTAIN = 15;
    static CRAWLER = 16;
    static SLOWING_AURA = 17;
    static COMMANDER = 18;
    static HEAVY_MACHINE = 19;
    static ATTACK_AURA = 20;
    static BLOODTHIRSTY = 21;
    static GUARDIAN = 22;
    static REFRESH_AURA = 23;
    static LORD_OF_TERROR = 24;
    static COUNTER_MADNESS = 25;
    static BLINDER = 26;
    static REHABILITATION = 27;
    static HARD_SKIN = 28;

    static getAllAbilities() {
        const abilities = [];
        for (let i = 0; i < 29; i++) {
            abilities.push(i);
        }
        return abilities;
    }
}
