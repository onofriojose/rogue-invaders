export interface Vector2 {
    x: number;
    y: number;
}

export interface Player {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    lastShotTime: number;
}

export interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    markedForDeletion: boolean;
}

export interface Enemy {
    x: number;
    y: number;
    hp: number;
    maxHp?: number;
    speed: number;
    spriteType: number;
    frameCount: number;
    markedForDeletion: boolean;
    isBoss?: boolean;
    bossColor?: string;
    customSize?: number;
    shootCooldown?: number; // Time until next shot
}

export interface EnemyProjectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
}

export interface Gem {
    x: number;
    y: number;
    value: number;
    markedForDeletion: boolean;
    magnetized: boolean;
}

export interface Particle {
    x: number;
    y: number;
    vx: number;
    vy: number;
    life: number;
    color: string;
    size: number;
    markedForDeletion: boolean;
}

export interface DamageText {
    x: number;
    y: number;
    value: number;
    life: number;
    opacity: number;
    markedForDeletion: boolean;
}

export interface GameStats {
    maxHp: number;
    hp: number;
    speed: number;
    fireRate: number;
    projectileCount: number;
    damage: number;
    shieldRadius: number;
    shieldDamage: number;
    magnetRadius: number;

}

export interface SectorColors {
    background: string;
    stars: string;
    enemyOutline: string;
    enemyFill: string;
}

export interface GameState {
    gameOver: boolean;
    paused: boolean;
    lastTime: number;
    timeSurvived: number;
    level: number;
    xp: number;
    xpToNextLevel: number;
    kills: number;
    stats: GameStats;
    currentSector: number;
    totalDarkMatter: number;
    sectorTimer: number;
    bossActive: boolean;
    bossMaxHp: number;
    bossCurrentHp: number;
    sectorColors: SectorColors;
    shipId: string;
}

export interface Upgrade {
    id: string;
    title: string;
    desc: string;
    icon?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    apply: (stats: GameStats) => void;
}
