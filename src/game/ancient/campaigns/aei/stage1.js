import { TEAMS } from '../../constants';

export const Stage1 = {
    name: 'The Beginning',
    description: 'King Galamar and Valadorn must escape the castle.',
    mapId: 'classic 1 200.aem', // We need to map this to a real map file or data
    // Or we define the map data inline if it's specific
    // For now, let's assume we use a map file that resembles the first stage
    // Actually, AEI Stage 1 is a specific map.
    // I'll use a placeholder map ID for now, and we might need to fetch it.
    // Wait, the user has 'classic 1 200.aem' in the file list.
    
    // Script hooks
    onGameStart: (context) => {
        context.setAlliance(TEAMS.BLUE, 1);
        context.setAlliance(TEAMS.RED, 1); // Wait, usually they are enemies?
        // In AEI Stage 1, Galamar and Valadorn are together (Blue).
        // Enemies are Red.
        // Let's check the Java code: getContext().alliance(1, 1); -> This sets alliance for team 1?
        // Java: alliance(int team, int alliance)
        
        context.setAlliance(TEAMS.BLUE, 1);
        context.setAlliance(TEAMS.RED, 2);

        context.setVar("reinforced", 0);
        
        context.showDialog([
            { speaker: 'Galamar', text: "Brother! The castle is under attack!" },
            { speaker: 'Valadorn', text: "We must flee at once!" },
            { speaker: 'Galamar', text: "But what about the kingdom?" },
            { speaker: 'Valadorn', text: "It is lost! We must survive to fight another day!" },
            { speaker: 'System', text: "Objective: Move Galamar to the safe zone." }
        ]);
    },

    onUnitStandby: (context, unit) => {
        // if (unit.getX() >= 1 && unit.getY() >= 5 && getContext().get("reinforced") == 0)
        if (unit.x >= 1 && unit.y >= 5 && context.getVar("reinforced") === 0) {
            context.setVar("reinforced", 1);
            // context.restore(1); // Restore team 1?
            // context.reinforce(1, 8, 9, new Reinforcement(0, 5, 8));
            
            context.spawnUnit(TEAMS.BLUE, 'soldier', 8, 9);
            
            context.showDialog([
                { speaker: 'Soldier', text: "Your highness! I have come to help!" }
            ]);
        }
    },
    
    onUnitDestroyed: (context, unit) => {
        // if (getContext().count_unit(1) == 0) -> Lose
        if (context.countUnits(TEAMS.BLUE) === 0) {
            context.gameOver(TEAMS.RED); // Red wins
        }
    }
};
