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
        SPAWN_RATE_MIN: 0.55,
        SPAWN_RATE_STEP: 0.12,
        EARLY_GAME_DURATION: 60,
        EARLY_GAME_EXTRA_DELAY: 0.75,
        SHOOT_COOLDOWN_INITIAL_MIN: 5.5,
        SHOOT_COOLDOWN_INITIAL_MAX: 7.5,
        SHOOT_COOLDOWN_REPEAT_MIN: 4.5,
        SHOOT_COOLDOWN_REPEAT_MAX: 6.5,
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
