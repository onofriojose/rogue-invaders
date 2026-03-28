import { SETTINGS } from '../../constants';
import { Beacon, Enemy, EnemyProjectile, GameState, Gem, Player, Projectile } from '../../types';

export interface CombatSystemContext {
    state: GameState;
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    enemyProjectiles: EnemyProjectile[];
    gems: Gem[];
    beacons: Beacon[];
    rapidFireTimer: number;
    spreadShotTimer: number;
    spawnExplosion: (x: number, y: number, color: string, count?: number) => void;
    spawnDamageText: (x: number, y: number, damage: number | string) => void;
    spawnPowerUp: (x: number, y: number, force?: boolean) => void;
    triggerShake: (amount: number) => void;
    triggerFlash: (color: string, intensity?: number) => void;
    nextSector: () => void;
}

export interface EnemyDefeatOptions {
    spawnPowerUp?: boolean;
    addGem?: boolean;
    addKill?: boolean;
    explosionColor?: string;
    explosionCount?: number;
}

export interface EnemyDamageOptions {
    damageText?: number | string | false;
    hitExplosionColor?: string;
    hitExplosionCount?: number;
    spawnPowerUpOnKill?: boolean;
    addGemOnKill?: boolean;
    addKillOnKill?: boolean;
}

export class CombatSystem {
    private shieldTickTimer: number = 0;

    public handleCombat(ctx: CombatSystemContext, time: number) {
        let fireRate = ctx.state.stats.fireRate;
        if (ctx.rapidFireTimer > 0) fireRate /= 2;

        if (time - ctx.player.lastShotTime < fireRate) return;

        let nearest: Enemy | undefined;
        let minDist = Infinity;

        ctx.enemies.forEach(e => {
            const dx = e.x - ctx.player.x;
            const dy = e.y - ctx.player.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearest = e;
            }
        });

        if (!nearest) return;
        const target = nearest;

        ctx.player.lastShotTime = time;
        const dx = target.x - ctx.player.x;
        const dy = target.y - ctx.player.y;
        const angle = Math.atan2(dy, dx);

        const count = ctx.state.stats.projectileCount;
        const startAngle = angle - (SETTINGS.WEAPON.FAN_ANGLE * (count - 1)) / 2;

        for (let i = 0; i < count; i++) {
            const finalAngle = startAngle + i * SETTINGS.WEAPON.FAN_ANGLE;
            ctx.projectiles.push({
                x: ctx.player.x,
                y: ctx.player.y,
                vx: Math.cos(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                vy: Math.sin(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                size: 10,
                life: 1.5,
                markedForDeletion: false
            });
        }

        if (ctx.spreadShotTimer > 0) {
            [-0.26, 0.26].forEach(offset => {
                const finalAngle = angle + offset;
                ctx.projectiles.push({
                    x: ctx.player.x,
                    y: ctx.player.y,
                    vx: Math.cos(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                    vy: Math.sin(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                    size: 10,
                    life: 1.5,
                    markedForDeletion: false
                });
            });
        }
    }

    public handleShieldCombat(ctx: CombatSystemContext, dt: number) {
        if (ctx.state.stats.shieldRadius <= 0) return;

        this.shieldTickTimer += dt;
        if (this.shieldTickTimer < 0.1) return;

        const dmgPerTick = ctx.state.stats.shieldDamage * 0.1;

        ctx.enemies.forEach(enemy => {
            if (enemy.markedForDeletion) return;

            const dx = enemy.x - ctx.player.x;
            const dy = enemy.y - ctx.player.y;
            const distSq = dx * dx + dy * dy;
            const radiusSq = ctx.state.stats.shieldRadius * ctx.state.stats.shieldRadius;

            if (distSq >= radiusSq) return;

            this.applyDirectDamageToEnemy(ctx, enemy, dmgPerTick, {
                damageText: false,
                addGemOnKill: true,
                addKillOnKill: true
            });

            if (Math.random() > 0.7) {
                ctx.spawnExplosion(enemy.x, enemy.y, SETTINGS.COLORS.PLAYER, 2);
            }
        });

        this.shieldTickTimer = 0;
    }

    public handleEnemyShooting(ctx: CombatSystemContext, dt: number) {
        ctx.enemies.forEach(enemy => {
            if (enemy.markedForDeletion) return;
            if (enemy.isBoss) return;
            if (enemy.customSize && enemy.customSize <= 25) return;
            if (enemy.spriteType === 2) return; // Turret archetype already has its own firing pattern.

            if (enemy.shootCooldown === undefined) return;

            enemy.shootCooldown -= dt;
            if (enemy.shootCooldown > 0) return;

            const dx = ctx.player.x - enemy.x;
            const dy = ctx.player.y - enemy.y;
            const angle = Math.atan2(dy, dx);
            const speed = 250;

            ctx.enemyProjectiles.push({
                x: enemy.x,
                y: enemy.y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                size: 8,
                color: enemy.bossColor && (enemy.bossColor === '#800080' || enemy.bossColor === '#006400') ? 'orange' : 'red'
            });

            enemy.shootCooldown = SETTINGS.ENEMY.SHOOT_COOLDOWN_REPEAT_MIN +
                Math.random() * (SETTINGS.ENEMY.SHOOT_COOLDOWN_REPEAT_MAX - SETTINGS.ENEMY.SHOOT_COOLDOWN_REPEAT_MIN);
        });
    }

    public defeatEnemy(ctx: CombatSystemContext, enemy: Enemy, options: EnemyDefeatOptions = {}) {
        if (enemy.markedForDeletion) return;

        enemy.markedForDeletion = true;
        this.syncBossState(ctx, enemy);

        ctx.spawnExplosion(
            enemy.x,
            enemy.y,
            options.explosionColor || this.getEnemyDeathColor(ctx, enemy),
            options.explosionCount ?? (enemy.isBoss ? 50 : 15)
        );

        if (options.spawnPowerUp) {
            ctx.spawnPowerUp(enemy.x, enemy.y, enemy.isBoss);
        }

        if (enemy.isBoss) {
            this.addBossBeacon(ctx, enemy.x, enemy.y);
            ctx.triggerShake(15);
            ctx.triggerFlash('white', 0.7);
            ctx.nextSector();
            return;
        }

        if (options.addGem) {
            this.addGemDrop(ctx, enemy.x, enemy.y);
        }

        if (options.addKill) {
            ctx.state.kills++;
        }
    }

    public applyDirectDamageToEnemy(
        ctx: CombatSystemContext,
        enemy: Enemy,
        damage: number,
        options: EnemyDamageOptions = {}
    ) {
        if (enemy.markedForDeletion) return;

        enemy.hp -= damage;

        if (options.hitExplosionColor) {
            ctx.spawnExplosion(enemy.x, enemy.y, options.hitExplosionColor, options.hitExplosionCount ?? 3);
        }

        if (options.damageText !== false) {
            ctx.spawnDamageText(enemy.x, enemy.y, options.damageText ?? damage);
        }

        this.syncBossState(ctx, enemy);

        if (enemy.hp <= 0) {
            this.defeatEnemy(ctx, enemy, {
                spawnPowerUp: options.spawnPowerUpOnKill,
                addGem: options.addGemOnKill,
                addKill: options.addKillOnKill
            });
        }
    }

    private addGemDrop(ctx: CombatSystemContext, x: number, y: number, value: number = 10) {
        ctx.gems.push({
            x,
            y,
            value,
            markedForDeletion: false,
            magnetized: false
        });
    }

    private addBossBeacon(ctx: CombatSystemContext, x: number, y: number) {
        ctx.beacons.push({
            x,
            y,
            radius: 30,
            active: true
        });
    }

    private syncBossState(ctx: CombatSystemContext, enemy: Enemy) {
        if (enemy.isBoss) {
            ctx.state.bossCurrentHp = Math.max(0, enemy.hp);
        }
    }

    private getEnemyDeathColor(ctx: CombatSystemContext, enemy: Enemy): string {
        return enemy.isBoss ? (enemy.bossColor || SETTINGS.COLORS.ENEMY) : ctx.state.sectorColors.enemyOutline;
    }
}
