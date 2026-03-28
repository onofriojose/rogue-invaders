import { EnemyProjectile, Player, Projectile } from '../../types';

export interface ProjectileSystemContext {
    player: Player;
    projectiles: Projectile[];
    enemyProjectiles: EnemyProjectile[];
    width: number;
    height: number;
    cameraZoom: number;
}

export interface ProjectileUpdateResult {
    projectiles: Projectile[];
    enemyProjectiles: EnemyProjectile[];
}

export class ProjectileSystem {
    public updateProjectiles(ctx: ProjectileSystemContext, dt: number): ProjectileUpdateResult {
        ctx.projectiles.forEach(projectile => {
            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;
            projectile.life -= dt;

            if (projectile.life <= 0) {
                projectile.markedForDeletion = true;
            }
        });

        ctx.enemyProjectiles.forEach(projectile => {
            projectile.x += projectile.vx * dt;
            projectile.y += projectile.vy * dt;

            if (!this.isWorldPointNearCamera(ctx, projectile.x, projectile.y, 200)) {
                projectile.markedForDeletion = true;
            }
        });

        return {
            projectiles: ctx.projectiles.filter(projectile => !projectile.markedForDeletion),
            enemyProjectiles: ctx.enemyProjectiles.filter(projectile => !projectile.markedForDeletion)
        };
    }

    private isWorldPointNearCamera(ctx: ProjectileSystemContext, x: number, y: number, padding: number): boolean {
        const visibleW = ctx.width / ctx.cameraZoom;
        const visibleH = ctx.height / ctx.cameraZoom;
        const centerX = visibleW / 2;
        const centerY = visibleH / 2;

        const screenX = x - ctx.player.x + centerX;
        const screenY = y - ctx.player.y + centerY;

        return screenX >= -padding && screenX <= visibleW + padding &&
            screenY >= -padding && screenY <= visibleH + padding;
    }
}
