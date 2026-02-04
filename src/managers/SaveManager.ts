export interface SaveData {
    totalDarkMatter: number;
    unlockedShips: string[];
    selectedShipId: string;
}

const DEFAULT_SAVE: SaveData = {
    totalDarkMatter: 0, // Reset to 0 as requested
    unlockedShips: ['nova'],
    selectedShipId: 'nova'
};

const SAVE_KEY = 'space_survivor_save_v2'; // Changed key to force reset

export class SaveManager {
    static loadData(): SaveData {
        const raw = localStorage.getItem(SAVE_KEY);
        if (!raw) {
            // First time load, save defaults immediately
            this.saveData(DEFAULT_SAVE);
            return DEFAULT_SAVE;
        }
        try {
            const parsed = JSON.parse(raw);
            return { ...DEFAULT_SAVE, ...parsed }; // Merge to ensure new fields (if any)
        } catch (e) {
            console.error('Failed to parse save data', e);
            return DEFAULT_SAVE;
        }
    }

    static saveData(data: SaveData) {
        localStorage.setItem(SAVE_KEY, JSON.stringify(data));
    }

    static addCurrency(amount: number) {
        const data = this.loadData();
        data.totalDarkMatter += amount;
        this.saveData(data);
        return data.totalDarkMatter;
    }

    static unlockShip(shipId: string): boolean {
        const data = this.loadData();
        if (data.unlockedShips.includes(shipId)) return false;

        data.unlockedShips.push(shipId);
        this.saveData(data);
        return true;
    }

    static selectShip(shipId: string) {
        const data = this.loadData();
        data.selectedShipId = shipId;
        this.saveData(data);
    }

    static purchaseShip(shipId: string, cost: number): boolean {
        const data = this.loadData();
        if (data.totalDarkMatter >= cost) {
            data.totalDarkMatter -= cost;
            data.unlockedShips.push(shipId);
            this.saveData(data);
            return true;
        }
        return false;
    }
}
