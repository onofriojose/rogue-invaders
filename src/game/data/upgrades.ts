import { GameStats, Upgrade } from '../../types';

export const UPGRADES_LIST: Upgrade[] = [
    {
        id: 'hull',
        title: 'Reinforced Titanium Hull',
        desc: 'Increases Max HP by 20 and heals full health.',
        icon: '[HP]',
        rarity: 'common',
        apply: (stats: GameStats) => {
            stats.maxHp += 20;
        }
    },
    {
        id: 'multi_core',
        title: 'Quantum Multi-Core',
        desc: 'Adds +1 projectile to every shot.',
        icon: '[+++]',
        rarity: 'legendary',
        apply: (stats: GameStats) => {
            stats.projectileCount += 1;
        }
    },
    {
        id: 'thrusters',
        title: 'Ion Thrusters',
        desc: 'Increases movement speed by 15%.',
        icon: '[SPD]',
        rarity: 'rare',
        apply: (stats: GameStats) => {
            stats.speed *= 1.15;
        }
    },
    {
        id: 'plasma_field',
        title: 'Plasma Field',
        desc: 'Generates a damaging energy field. Radius increases with upgrades.',
        icon: '[FLD]',
        rarity: 'epic',
        apply: (stats: GameStats) => {
            if (stats.shieldRadius === 0) {
                stats.shieldRadius = 80;
                stats.shieldDamage = 30;
            } else {
                stats.shieldRadius *= 1.2;
                stats.shieldDamage *= 1.1;
                stats.shieldDamage = Math.floor(stats.shieldDamage);
            }
        }
    },
    {
        id: 'overclock',
        title: 'Plasma Overclock',
        desc: 'Reduces delay between shots by 10%.',
        icon: '[ROF]',
        rarity: 'epic',
        apply: (stats: GameStats) => {
            stats.fireRate *= 0.9;
        }
    }
];
