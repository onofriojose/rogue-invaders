import { Enemy, Obstacle, Player, Beacon, Gem, Particle } from '../../types';
import { EnemyDamageOptions } from './CombatSystem';

export interface EnvironmentSystemContext {
    player: Player;
    enemies: Enemy[];
    gems: Gem[];
    particles: Particle[];
    obstacles: Obstacle[];
    beacons: Beacon[];
    width: number;
    height: number;
    cameraZoom: number;
    spawnExplosion: (x: number, y: number, color: string, count?: number) => void;
    spawnDamageText: (x: number, y: number, damage: number | string) => void;
    triggerFlash: (color: string, intensity?: number) => void;
    applyDirectDamageToEnemy: (enemy: Enemy, damage: number, options?: EnemyDamageOptions) => void;
}

export interface EnvironmentUpdateResult {
    obstacles: Obstacle[];
}

export class EnvironmentSystem {
    private windTimer: number = 0;
    private windActive: boolean = false;
    private windVector: { x: number; y: number } = { x: 0, y: 0 };

    public updateEnvironment(ctx: EnvironmentSystemContext, dt: number): EnvironmentUpdateResult {
        this.updateSolarWind(ctx, dt);
        this.spawnObstacles(ctx);
        this.spawnBeacons(ctx, dt);
        this.updateObstacles(ctx, dt);

        return {
            obstacles: ctx.obstacles.filter(obstacle => !obstacle.markedForDeletion)
        };
    }

    private updateSolarWind(ctx: EnvironmentSystemContext, dt: number) {
        this.windTimer += dt;

        if (!this.windActive) {
            if (this.windTimer > 15) {
                this.windActive = true;
                this.windTimer = 0;
                const angle = Math.random() * Math.PI * 2;
                this.windVector = { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
                ctx.triggerFlash('white', 0.2);
                ctx.spawnDamageText(ctx.player.x, ctx.player.y - 100, 0);
            }
        } else if (this.windTimer > 5) {
            this.windActive = false;
            this.windTimer = 0;
        }

        if (!this.windActive) return;

        const windX = this.windVector.x * dt;
        const windY = this.windVector.y * dt;
        ctx.player.x += windX * 0.5;
        ctx.player.y += windY * 0.5;
        ctx.enemies.forEach(enemy => {
            enemy.x += windX;
            enemy.y += windY;
        });
        ctx.gems.forEach(gem => {
            gem.x += windX * 2;
            gem.y += windY * 2;
        });
        ctx.particles.forEach(particle => {
            particle.x += windX * 3;
            particle.y += windY * 3;
        });
    }

    private spawnObstacles(ctx: EnvironmentSystemContext) {
        if (Math.random() >= 0.008) return;

        let angle = Math.random() * Math.PI * 2;
        if (Math.abs(ctx.player.vx) > 0.1 || Math.abs(ctx.player.vy) > 0.1) {
            const moveAngle = Math.atan2(ctx.player.vy, ctx.player.vx);
            angle = moveAngle + (Math.random() - 0.5) * (Math.PI / 2);
        }

        const dist = (Math.max(ctx.width, ctx.height) / ctx.cameraZoom) * 0.8 + 200;
        const vertexCount = Math.floor(Math.random() * 5) + 8;
        const vertices: { x: number; y: number }[] = [];
        const size = 40 + Math.random() * 30;

        for (let i = 0; i < vertexCount; i++) {
            const vertexAngle = (i / vertexCount) * Math.PI * 2;
            const radius = size * (0.7 + Math.random() * 0.6);
            vertices.push({
                x: Math.cos(vertexAngle) * radius,
                y: Math.sin(vertexAngle) * radius
            });
        }

        ctx.obstacles.push({
            x: ctx.player.x + Math.cos(angle) * dist,
            y: ctx.player.y + Math.sin(angle) * dist,
            size,
            color: '#555',
            markedForDeletion: false,
            isExploding: false,
            explodeTimer: 0,
            vertices
        });
    }

    private spawnBeacons(ctx: EnvironmentSystemContext, dt: number) {
        if (ctx.beacons.length >= 1) return;
        if (Math.random() >= 0.005 * dt) return;

        const x = ctx.player.x + (Math.random() - 0.5) * ctx.width;
        const y = ctx.player.y + (Math.random() - 0.5) * ctx.height;

        ctx.beacons.push({
            x,
            y,
            radius: 25,
            active: true
        });
        ctx.spawnDamageText(x, y - 50, 'ANOMALY DETECTED');
    }

    private updateObstacles(ctx: EnvironmentSystemContext, dt: number) {
        ctx.obstacles.forEach(obstacle => {
            if (obstacle.isExploding) {
                obstacle.explodeTimer -= dt;
                obstacle.color = Math.random() > 0.5 ? 'red' : 'orange';

                if (obstacle.explodeTimer <= 0) {
                    obstacle.markedForDeletion = true;
                    ctx.spawnExplosion(obstacle.x, obstacle.y, 'orange', 30);

                    ctx.enemies.forEach(enemy => {
                        const dx = enemy.x - obstacle.x;
                        const dy = enemy.y - obstacle.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 150) {
                            ctx.applyDirectDamageToEnemy(enemy, 100, {
                                damageText: false,
                                spawnPowerUpOnKill: true
                            });
                        }
                    });
                }
            }

            const dx = ctx.player.x - obstacle.x;
            const dy = ctx.player.y - obstacle.y;
            if (Math.sqrt(dx * dx + dy * dy) >= 2500) {
                obstacle.markedForDeletion = true;
            }
        });
    }
}
