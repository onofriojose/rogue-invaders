export interface Vector2 {
    x: number;
    y: number;
}

export enum AIState {
    IDLE = 0,
    CHASING = 1,
    CHARGING = 2,
    ATTACKING = 3
}

export interface Player {
    x: number;
    y: number;
    vx: number;
    vy: number;
    angle: number;
    lastShotTime: number;
    isDashing: boolean;
    dashCooldown: number;
    invulnerabilityTimer: number;
}

export interface Projectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    life: number;
    markedForDeletion: boolean;
}

export interface Enemy {
    x: number;
    y: number;
    hp: number;
    vx?: number;
    vy?: number;
    maxHp?: number;
    speed: number;
    spriteType: number;
    frameCount: number;
    markedForDeletion: boolean;
    isBoss?: boolean;
    bossColor?: string;
    customSize?: number;
    shootCooldown?: number; // Seconds until next shot
    aiState?: AIState;
    stateTimer?: number;
    chargeTimer?: number;
    attackTimer?: number;
    attackState?: number;
    angleOffset?: number;
    minionsSpawned?: number;
    reinforceTimer?: number;
    shield?: number;
    maxShield?: number;
}

export interface EnemyProjectile {
    x: number;
    y: number;
    vx: number;
    vy: number;
    size: number;
    color: string;
    damage?: number;
    markedForDeletion?: boolean;
}

export interface Gem {
    x: number;
    y: number;
    value: number;
    markedForDeletion: boolean;
    magnetized: boolean;
}

export interface Obstacle {
    x: number;
    y: number;
    size: number;
    color: string;
    markedForDeletion: boolean;
    isExploding: boolean; // Flashing phase
    explodeTimer: number;
    vertices?: { x: number, y: number }[];
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

export interface Beacon {
    x: number;
    y: number;
    radius: number;
    active: boolean;
}

export interface DamageText {
    x: number;
    y: number;
    value: number | string;
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
    voidMass: number;
}

export interface Upgrade {
    id: string;
    title: string;
    desc: string;
    icon?: string;
    rarity: 'common' | 'rare' | 'epic' | 'legendary';
    apply: (stats: GameStats) => void;
}
