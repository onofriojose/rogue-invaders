import { SETTINGS } from '../../constants';
import { Enemy, EnemyProjectile, GameState, Obstacle, Player, Projectile } from '../../types';
import { EnemyDamageOptions, EnemyDefeatOptions } from './CombatSystem';

export interface CollisionSystemContext {
    state: GameState;
    player: Player;
    enemies: Enemy[];
    projectiles: Projectile[];
    enemyProjectiles: EnemyProjectile[];
    obstacles: Obstacle[];
    spawnExplosion: (x: number, y: number, color: string, count?: number) => void;
    spawnDamageText: (x: number, y: number, damage: number | string) => void;
    triggerShake: (amount: number) => void;
    triggerFlash: (color: string, intensity?: number) => void;
    onGameOver: () => void;
    defeatEnemy: (enemy: Enemy, options?: EnemyDefeatOptions) => void;
    applyDirectDamageToEnemy: (enemy: Enemy, damage: number, options?: EnemyDamageOptions) => void;
}

export function getEnemyRenderSize(enemy: Enemy): number {
    return enemy.customSize ?? SETTINGS.ENEMY.SIZE;
}

export function getEnemyCollisionRadius(enemy: Enemy): number {
    return getEnemyRenderSize(enemy);
}

export class CollisionSystem {
    public handleCoreCollisions(ctx: CollisionSystemContext) {
        this.handleProjectileObstacleCollisions(ctx);
        this.handlePlayerObstacleCollisions(ctx);
        this.handleProjectileEnemyCollisions(ctx);
        this.handleEnemyPlayerCollisions(ctx);
        this.handleEnemyProjectilePlayerCollisions(ctx);
    }

    private handleProjectileObstacleCollisions(ctx: CollisionSystemContext) {
        ctx.projectiles.forEach(projectile => {
            if (projectile.markedForDeletion) return;

            ctx.obstacles.forEach(obstacle => {
                if (obstacle.markedForDeletion || projectile.markedForDeletion) return;

                const dx = projectile.x - obstacle.x;
                const dy = projectile.y - obstacle.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist >= obstacle.size + projectile.size) return;

                projectile.markedForDeletion = true;

                if (!obstacle.isExploding) {
                    obstacle.isExploding = true;
                    obstacle.explodeTimer = 0.1;
                    ctx.spawnExplosion(obstacle.x, obstacle.y, 'orange', 15);
                    ctx.triggerShake(2);
                }
            });
        });
    }

    private handlePlayerObstacleCollisions(ctx: CollisionSystemContext) {
        ctx.obstacles.forEach(obstacle => {
            if (obstacle.markedForDeletion) return;

            const dx = ctx.player.x - obstacle.x;
            const dy = ctx.player.y - obstacle.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= obstacle.size + SETTINGS.PLAYER.BASE_SIZE) return;

            if (ctx.player.isDashing) {
                obstacle.isExploding = true;
                obstacle.explodeTimer = 0.5;
                ctx.spawnExplosion(obstacle.x, obstacle.y, 'orange', 20);
                ctx.triggerShake(5);
                return;
            }

            const angle = Math.atan2(dy, dx);
            const pushDist = obstacle.size + SETTINGS.PLAYER.BASE_SIZE - dist + 2;
            ctx.player.x += Math.cos(angle) * pushDist;
            ctx.player.y += Math.sin(angle) * pushDist;
            ctx.player.vx *= -0.5;
            ctx.player.vy *= -0.5;

            ctx.state.stats.hp = Math.max(0, ctx.state.stats.hp - 1);
            ctx.triggerShake(5);

            if (ctx.state.stats.hp <= 0) {
                ctx.onGameOver();
            }
        });
    }

    private handleProjectileEnemyCollisions(ctx: CollisionSystemContext) {
        ctx.projectiles.forEach(projectile => {
            ctx.enemies.forEach(enemy => {
                if (enemy.markedForDeletion || projectile.markedForDeletion) return;

                const dx = projectile.x - enemy.x;
                const dy = projectile.y - enemy.y;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const hitRadius = getEnemyCollisionRadius(enemy);

                if (dist >= hitRadius) return;

                projectile.markedForDeletion = true;

                if (enemy.shield && enemy.shield > 0) {
                    enemy.shield = Math.max(0, enemy.shield - ctx.state.stats.damage);
                    ctx.spawnExplosion(enemy.x, enemy.y, 'cyan', 5);
                    ctx.spawnDamageText(enemy.x, enemy.y, 'SHIELD');
                    return;
                }

                ctx.applyDirectDamageToEnemy(enemy, ctx.state.stats.damage, {
                    damageText: ctx.state.stats.damage,
                    hitExplosionColor: SETTINGS.COLORS.BULLET,
                    hitExplosionCount: 3,
                    spawnPowerUpOnKill: true,
                    addGemOnKill: true,
                    addKillOnKill: true
                });
            });
        });
    }

    private handleEnemyPlayerCollisions(ctx: CollisionSystemContext) {
        ctx.enemies.forEach(enemy => {
            const dx = enemy.x - ctx.player.x;
            const dy = enemy.y - ctx.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const enemyRadius = getEnemyCollisionRadius(enemy);

            if (dist >= SETTINGS.PLAYER.BASE_SIZE + enemyRadius - 5) return;

            if (ctx.player.isDashing && !enemy.isBoss) {
                ctx.defeatEnemy(enemy, {
                    addGem: true,
                    addKill: true,
                    explosionColor: 'cyan',
                    explosionCount: 20
                });
                ctx.triggerShake(5);
                return;
            }

            if (ctx.player.invulnerabilityTimer > 0) return;

            ctx.state.stats.hp -= 0.5;
            ctx.triggerShake(10);
            ctx.triggerFlash('red', 0.5);

            if (ctx.state.stats.hp <= 0) {
                ctx.onGameOver();
            }
        });
    }

    private handleEnemyProjectilePlayerCollisions(ctx: CollisionSystemContext) {
        for (let i = ctx.enemyProjectiles.length - 1; i >= 0; i--) {
            const projectile = ctx.enemyProjectiles[i];
            const dx = projectile.x - ctx.player.x;
            const dy = projectile.y - ctx.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= 25) continue;

            ctx.enemyProjectiles.splice(i, 1);

            if (ctx.player.isDashing && ctx.player.invulnerabilityTimer > 0) {
                ctx.spawnExplosion(ctx.player.x, ctx.player.y, 'cyan', 5);
                continue;
            }

            if (ctx.player.invulnerabilityTimer > 0) continue;

            const damage = projectile.damage || 10;
            ctx.state.stats.hp -= damage;
            ctx.spawnDamageText(ctx.player.x, ctx.player.y, `-${damage}`);
            ctx.spawnExplosion(ctx.player.x, ctx.player.y, 'red', 10);
            ctx.triggerShake(5);
            ctx.triggerFlash('red', 0.2);

            if (ctx.state.stats.hp <= 0) {
                ctx.onGameOver();
            }
        }
    }
}
