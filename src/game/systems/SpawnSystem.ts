import { SETTINGS } from '../../constants';
import { AIState, Enemy, GameState, Player } from '../../types';

export interface SpawnSystemContext {
    state: GameState;
    player: Player;
    enemies: Enemy[];
    width: number;
    height: number;
    cameraZoom: number;
    spawnBoss: () => void;
}

export class SpawnSystem {
    private spawnTimer: number = 0;

    public updateSectorProgress(ctx: SpawnSystemContext, dt: number) {
        if (ctx.state.bossActive) return;

        ctx.state.sectorTimer += dt;
        if (ctx.state.sectorTimer >= SETTINGS.SECTOR.BOSS_SPAWN_TIME) {
            ctx.spawnBoss();
        }
    }

    public handleSpawning(ctx: SpawnSystemContext, dt: number) {
        const enemyCap = 20 + (ctx.state.currentSector * 5);
        if (ctx.enemies.length >= enemyCap) return;

        this.spawnTimer -= dt;
        if (this.spawnTimer > 0) return;

        this.spawnTimer = this.getEnemySpawnInterval(ctx);

        const angle = Math.random() * Math.PI * 2;
        const dist = (Math.max(ctx.width, ctx.height) / ctx.cameraZoom) / 2 + SETTINGS.WORLD.VIEW_PADDING;

        let hp = SETTINGS.ENEMY.BASE_HP + (ctx.state.level * 8);
        let speed = SETTINGS.ENEMY.BASE_SPEED + (ctx.state.level * 3);
        let size = 30;
        let color: string | undefined;

        const sector = ctx.state.currentSector;
        const roll = Math.random();

        let isSwarmer = false;
        let isTank = false;

        if (sector === 2) {
            if (roll < 0.20) isSwarmer = true;
        } else if (sector >= 3 && sector < 5) {
            if (roll < 0.20) isSwarmer = true;
            else if (roll < 0.35) isTank = true;
        } else if (sector >= 5) {
            if (roll < 0.30) isSwarmer = true;
            else if (roll < 0.55) isTank = true;
        }

        if (isSwarmer) {
            speed *= 1.6;
            hp *= 0.5;
            size = 20;
            color = '#FFD700';
        } else if (isTank) {
            speed *= 0.6;
            hp *= 2.5;
            size = 45;
            color = Math.random() > 0.5 ? '#800080' : '#006400';
        }

        ctx.enemies.push({
            x: ctx.player.x + Math.cos(angle) * dist,
            y: ctx.player.y + Math.sin(angle) * dist,
            hp,
            maxHp: hp,
            speed,
            markedForDeletion: false,
            spriteType: Math.floor(Math.random() * 3),
            frameCount: 0,
            customSize: size,
            bossColor: color,
            isBoss: false,
            shootCooldown: this.getInitialEnemyShootCooldown(),
            aiState: AIState.CHASING,
            stateTimer: 0,
            chargeTimer: 0
        });
    }

    private getEnemySpawnInterval(ctx: SpawnSystemContext): number {
        const sectorBaseInterval = Math.max(
            SETTINGS.ENEMY.SPAWN_RATE_MIN,
            SETTINGS.ENEMY.SPAWN_RATE_START - ((ctx.state.currentSector - 1) * SETTINGS.ENEMY.SPAWN_RATE_STEP)
        );
        const earlyGameProgress = Math.min(1, ctx.state.timeSurvived / SETTINGS.ENEMY.EARLY_GAME_DURATION);
        const earlyGameDelay = (1 - earlyGameProgress) * SETTINGS.ENEMY.EARLY_GAME_EXTRA_DELAY;

        return sectorBaseInterval + earlyGameDelay;
    }

    private getInitialEnemyShootCooldown(): number {
        return SETTINGS.ENEMY.SHOOT_COOLDOWN_INITIAL_MIN +
            Math.random() * (SETTINGS.ENEMY.SHOOT_COOLDOWN_INITIAL_MAX - SETTINGS.ENEMY.SHOOT_COOLDOWN_INITIAL_MIN);
    }
}
