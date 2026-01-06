export class SaveManager {
    static SAVE_KEY_PREFIX = 'aeii_save_';

    static saveGame(slot, gameCore) {
        try {
            const json = gameCore.toJSON();
            const jsonString = JSON.stringify(json);
            localStorage.setItem(this.SAVE_KEY_PREFIX + slot, jsonString);
            console.log(`Game saved to slot ${slot}`);
            return true;
        } catch (e) {
            console.error('Failed to save game:', e);
            return false;
        }
    }

    static loadGame(slot) {
        try {
            const jsonString = localStorage.getItem(this.SAVE_KEY_PREFIX + slot);
            if (!jsonString) return null;
            return JSON.parse(jsonString);
        } catch (e) {
            console.error('Failed to load game:', e);
            return null;
        }
    }

    static hasSave(slot) {
        return localStorage.getItem(this.SAVE_KEY_PREFIX + slot) !== null;
    }
    
    static listSaves() {
        const saves = [];
        for (let i = 0; i < localStorage.length; i++) {
            const key = localStorage.key(i);
            if (key.startsWith(this.SAVE_KEY_PREFIX)) {
                saves.push(key.replace(this.SAVE_KEY_PREFIX, ''));
            }
        }
        return saves;
    }
}
