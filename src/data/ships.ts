export interface ShipArchetype {
    id: string;
    name: string;
    description: string;
    price: number;
    unlockCondition: string;
    baseStats: {
        hp: number;
        speed: number;
        magnet: number;
        damage: number;
    };
}

export const SHIP_DEFINITIONS: ShipArchetype[] = [
    {
        id: 'nova',
        name: 'Nova-01',
        description: 'Standard issue scout ship. Balanced systems.',
        price: 0,
        unlockCondition: 'Unlocked by default',
        baseStats: {
            hp: 100,
            speed: 440, // Doubled from 220
            magnet: 150,
            damage: 20  // Doubled from 10
        }
    },
    {
        id: 'titan',
        name: 'Titan Hull',
        description: 'Heavy plating. Slow movement, but massive durability.',
        price: 500,
        unlockCondition: 'Cost: 500 Dark Matter',
        baseStats: {
            hp: 200,
            speed: 300, // Doubled from 150
            magnet: 200,
            damage: 24  // Doubled from 12
        }
    },
    {
        id: 'viper',
        name: 'Viper Sniper',
        description: 'Glass cannon. High DPS, fast, but fragile.',
        price: 1000,
        unlockCondition: 'Cost: 1000 Dark Matter',
        baseStats: {
            hp: 60,
            speed: 600, // Doubled from 300
            magnet: 120,
            damage: 40  // Doubled from 20
        }
    }
];
