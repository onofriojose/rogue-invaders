export const SETTINGS = {
    PLAYER: {
        BASE_SPEED: 250,
        BASE_HP: 100,
        FRICTION: 0.92,
        BASE_SIZE: 20,
        PICKUP_RANGE: 100
    },
    WEAPON: {
        FIRE_RATE: 0.4,
        PROJECTILE_COUNT: 1,
        DAMAGE: 20,
        PROJECTILE_SPEED: 600,
        FAN_ANGLE: Math.PI / 12
    },
    ENEMY: {
        SPAWN_RATE_START: 1.5,
        SPAWN_RATE_MIN: 0.1,
        BASE_SPEED: 100,
        BASE_HP: 30,
        SIZE: 50
    },
    WORLD: {
        STAR_COUNT: 200,
        VIEW_PADDING: 100
    },
    SECTOR: {
        BOSS_SPAWN_TIME: 60
    },
    COLORS: {
        BG: '#050510',
        PLAYER: '#00ffff',
        ENEMY: '#ff0055',
        GEM: '#00ff00',
        BULLET: '#ffff00'
    }
};
