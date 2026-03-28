import { SETTINGS } from '../../constants';
import { AIState, Beacon, DamageText, Enemy, EnemyProjectile, GameState, Gem, Obstacle, Particle, Player, Projectile } from '../../types';
import { SPRITES } from '../EnemySprites';
import { getEnemyRenderSize } from '../systems/CollisionSystem';

interface BackgroundStar {
    x: number;
    y: number;
    size: number;
    speed: number;
}

interface RenderablePowerUp {
    x: number;
    y: number;
    size: number;
    color: string;
}

export interface WorldRendererContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    cameraZoom: number;
    state: GameState;
    player: Player;
    inputActive: boolean;
    shipTilt: number;
    rapidFireTimer: number;
    spreadShotTimer: number;
    shakeIntensity: number;
    backgroundStars: BackgroundStar[];
    obstacles: Obstacle[];
    beacons: Beacon[];
    gems: Gem[];
    powerUps: RenderablePowerUp[];
    particles: Particle[];
    enemies: Enemy[];
    projectiles: Projectile[];
    enemyProjectiles: EnemyProjectile[];
    damageTexts: DamageText[];
}

export class WorldRenderer {
    private spriteCache: Map<string, HTMLCanvasElement> = new Map();

    public clearSpriteCache() {
        this.spriteCache.clear();
    }

    public render(ctx: WorldRendererContext) {
        ctx.ctx.save();
        try {
            this.resetCanvasState(ctx.ctx);
            this.renderBackground(ctx);

            ctx.ctx.save();
            try {
                ctx.ctx.scale(ctx.cameraZoom, ctx.cameraZoom);
                if (ctx.shakeIntensity > 0) {
                    const dx = (Math.random() - 0.5) * ctx.shakeIntensity;
                    const dy = (Math.random() - 0.5) * ctx.shakeIntensity;
                    ctx.ctx.translate(dx, dy);
                }

                this.renderWorld(ctx);
            } finally {
                ctx.ctx.restore();
            }
        } finally {
            ctx.ctx.restore();
        }
    }

    private resetCanvasState(ctx: CanvasRenderingContext2D) {
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
        ctx.shadowColor = 'transparent';
        ctx.strokeStyle = '#000';
        ctx.fillStyle = '#000';
        ctx.lineWidth = 1;
        ctx.textAlign = 'left';
        ctx.textBaseline = 'alphabetic';
        ctx.filter = 'none';
    }

    private renderBackground(ctx: WorldRendererContext) {
        const canvas = ctx.ctx;
        canvas.fillStyle = '#050505';
        canvas.fillRect(0, 0, ctx.width, ctx.height);

        canvas.fillStyle = 'rgba(255, 255, 255, 0.6)';
        ctx.backgroundStars.forEach(star => {
            let screenX = (star.x - ctx.player.x * star.speed) % ctx.width;
            let screenY = (star.y - ctx.player.y * star.speed) % ctx.height;

            if (screenX < 0) screenX += ctx.width;
            if (screenY < 0) screenY += ctx.height;

            const size = star.speed > 0.8 ? star.size * 2 : star.size;
            canvas.fillRect(screenX, screenY, size, size);
        });
    }

    private renderWorld(ctx: WorldRendererContext) {
        const canvas = ctx.ctx;

        canvas.save();
        try {
            canvas.shadowBlur = 15;
            canvas.shadowColor = ctx.state.sectorColors.enemyOutline;

            this.renderGrid(ctx);
            this.renderObstacles(ctx);
            this.renderBeacons(ctx);
            this.renderGems(ctx);
            this.renderPowerUps(ctx);
            this.renderParticles(ctx);
            this.renderEnemies(ctx);
            this.renderProjectiles(ctx);
            this.renderEnemyProjectiles(ctx);
            this.renderDamageTexts(ctx);
            this.renderPlayer(ctx);
        } finally {
            canvas.restore();
        }
    }

    private renderGrid(ctx: WorldRendererContext) {
        const canvas = ctx.ctx;
        const gridSize = 100;
        const offsetX = -ctx.player.x % gridSize;
        const offsetY = -ctx.player.y % gridSize;

        canvas.save();
        try {
            canvas.strokeStyle = 'rgba(255, 255, 255, 0.05)';
            canvas.lineWidth = 1;
            canvas.beginPath();
            for (let x = offsetX; x < ctx.width; x += gridSize) {
                canvas.moveTo(x, 0);
                canvas.lineTo(x, ctx.height);
            }
            for (let y = offsetY; y < ctx.height; y += gridSize) {
                canvas.moveTo(0, y);
                canvas.lineTo(ctx.width, y);
            }
            canvas.stroke();
        } finally {
            canvas.restore();
        }
    }

    private renderObstacles(ctx: WorldRendererContext) {
        ctx.obstacles.forEach(obstacle => this.drawWorldEntity(ctx, obstacle.x, obstacle.y, drawCtx => {
            drawCtx.strokeStyle = '#ff4500';
            drawCtx.lineWidth = 3;
            drawCtx.fillStyle = 'rgba(40, 0, 0, 0.9)';
            drawCtx.shadowColor = '#ff4500';
            drawCtx.shadowBlur = obstacle.isExploding ? 40 : 20;

            drawCtx.beginPath();
            if (obstacle.vertices && obstacle.vertices.length > 0) {
                drawCtx.moveTo(obstacle.vertices[0].x, obstacle.vertices[0].y);
                for (let i = 1; i < obstacle.vertices.length; i++) {
                    drawCtx.lineTo(obstacle.vertices[i].x, obstacle.vertices[i].y);
                }
                drawCtx.closePath();
            } else {
                drawCtx.arc(0, 0, obstacle.size, 0, Math.PI * 2);
            }

            drawCtx.fill();
            drawCtx.stroke();

            if (obstacle.isExploding) {
                drawCtx.fillStyle = `rgba(255, 69, 0, ${Math.random()})`;
                drawCtx.fill();
            }
        }));
    }

    private renderBeacons(ctx: WorldRendererContext) {
        ctx.beacons.forEach(beacon => this.drawWorldEntity(ctx, beacon.x, beacon.y, drawCtx => {
            const pulse = 1 + Math.sin(ctx.state.timeSurvived * 5) * 0.1;
            const size = beacon.radius * 2 * pulse;

            drawCtx.shadowBlur = 20;
            drawCtx.shadowColor = 'red';
            drawCtx.fillStyle = '#FFD700';
            drawCtx.fillRect(-size / 2, -size / 2, size, size);

            drawCtx.fillStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(ctx.state.timeSurvived * 10) * 0.5})`;
            drawCtx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

            drawCtx.beginPath();
            drawCtx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            drawCtx.strokeStyle = 'red';
            drawCtx.lineWidth = 2;
            drawCtx.stroke();
        }));
    }

    private renderGems(ctx: WorldRendererContext) {
        ctx.gems.forEach(gem => this.drawWorldEntity(ctx, gem.x, gem.y, drawCtx => {
            drawCtx.fillStyle = ctx.state.sectorColors.enemyOutline;
            drawCtx.save();
            drawCtx.rotate(ctx.state.timeSurvived * 3);
            drawCtx.beginPath();
            drawCtx.rect(-5, -5, 10, 10);
            drawCtx.fill();
            drawCtx.strokeStyle = 'white';
            drawCtx.lineWidth = 1;
            drawCtx.stroke();
            drawCtx.restore();
        }));
    }

    private renderPowerUps(ctx: WorldRendererContext) {
        ctx.powerUps.forEach(powerUp => this.drawWorldEntity(ctx, powerUp.x, powerUp.y, drawCtx => {
            drawCtx.shadowBlur = 10;
            drawCtx.shadowColor = powerUp.color;
            drawCtx.fillStyle = powerUp.color;

            const pulse = 1 + Math.sin(ctx.state.timeSurvived * 5) * 0.2;
            const size = powerUp.size * pulse;

            drawCtx.translate(-size / 2, -size / 2);
            drawCtx.fillRect(0, 0, size, size);
            drawCtx.fillStyle = 'white';
            drawCtx.fillRect(size / 4, size / 4, size / 2, size / 2);
        }));
    }

    private renderParticles(ctx: WorldRendererContext) {
        ctx.particles.forEach(particle => this.drawWorldEntity(ctx, particle.x, particle.y, drawCtx => {
            drawCtx.globalAlpha = particle.life;
            drawCtx.fillStyle = particle.color;
            drawCtx.fillRect(-particle.size / 2, -particle.size / 2, particle.size, particle.size);
        }));
    }

    private renderEnemies(ctx: WorldRendererContext) {
        ctx.enemies.forEach(enemy => {
            const size = getEnemyRenderSize(enemy);
            this.drawWorldEntity(ctx, enemy.x, enemy.y, drawCtx => {
                if (enemy.isBoss) {
                    this.renderBoss(drawCtx, ctx, enemy, size);
                } else {
                    this.renderEnemySprite(drawCtx, ctx, enemy, size);
                }

                if (enemy.aiState === AIState.CHARGING) {
                    const flash = 0.3 + Math.sin(ctx.state.timeSurvived * 20) * 0.2;
                    drawCtx.fillStyle = `rgba(255, 255, 255, ${flash})`;
                    drawCtx.fillRect(-size / 2, -size / 2, size, size);
                }

                if (enemy.spriteType === 2 && enemy.aiState === AIState.CHARGING) {
                    drawCtx.beginPath();
                    drawCtx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
                    drawCtx.strokeStyle = '#00ffff';
                    drawCtx.lineWidth = 2;
                    drawCtx.stroke();

                    const ringAngle = ctx.state.timeSurvived * 2;
                    drawCtx.beginPath();
                    drawCtx.arc(0, 0, size * 0.9, ringAngle, ringAngle + Math.PI);
                    drawCtx.strokeStyle = 'cyan';
                    drawCtx.lineWidth = 1;
                    drawCtx.stroke();
                }
            });
        });
    }

    private renderBoss(drawCtx: CanvasRenderingContext2D, ctx: WorldRendererContext, enemy: Enemy, size: number) {
        const dx = ctx.player.x - enemy.x;
        const dy = ctx.player.y - enemy.y;
        const angleToPlayer = Math.atan2(dy, dx);

        if (enemy.shield && enemy.shield > 0) {
            drawCtx.save();
            drawCtx.shadowColor = 'cyan';
            drawCtx.shadowBlur = 10;
            drawCtx.beginPath();
            drawCtx.arc(0, 0, (enemy.customSize || 40) * 0.7, 0, Math.PI * 2);
            drawCtx.strokeStyle = `rgba(0, 255, 255, ${0.5 + Math.sin(ctx.state.timeSurvived * 10) * 0.5})`;
            drawCtx.lineWidth = 3;
            drawCtx.stroke();
            drawCtx.restore();

            const barWidth = 60;
            const barHeight = 6;
            const shieldPct = enemy.shield / (enemy.maxShield || 1);

            drawCtx.fillStyle = 'rgba(0, 0, 0, 0.5)';
            drawCtx.fillRect(-barWidth / 2, -50, barWidth, barHeight);
            drawCtx.fillStyle = 'cyan';
            drawCtx.fillRect(-barWidth / 2, -50, barWidth * shieldPct, barHeight);
        }

        drawCtx.rotate(angleToPlayer);

        const frameIndex = Math.floor(ctx.state.timeSurvived * 4) % 2;
        const sprite = this.getOrCreateSprite(enemy.spriteType, frameIndex, enemy.bossColor || 'red');
        drawCtx.shadowColor = enemy.bossColor || 'red';
        drawCtx.shadowBlur = 20;

        if (sprite) {
            drawCtx.drawImage(sprite, -size / 2, -size / 2, size, size);
        } else {
            drawCtx.fillStyle = enemy.bossColor || 'red';
            drawCtx.fillRect(-size / 2, -size / 2, size, size);
        }
    }

    private renderEnemySprite(drawCtx: CanvasRenderingContext2D, ctx: WorldRendererContext, enemy: Enemy, size: number) {
        const frameIndex = Math.floor(ctx.state.timeSurvived * 4) % 2;
        const color = enemy.bossColor || ctx.state.sectorColors.enemyOutline;
        const sprite = this.getOrCreateSprite(enemy.spriteType, frameIndex, color);

        if (sprite) {
            drawCtx.drawImage(sprite, -size / 2, -size / 2, size, size);
        } else {
            drawCtx.fillStyle = color;
            drawCtx.fillRect(-size / 2, -size / 2, size, size);
        }
    }

    private renderProjectiles(ctx: WorldRendererContext) {
        ctx.projectiles.forEach(projectile => this.drawWorldEntity(ctx, projectile.x, projectile.y, drawCtx => {
            drawCtx.rotate(Math.atan2(projectile.vy, projectile.vx));
            drawCtx.shadowBlur = 10;
            drawCtx.shadowColor = SETTINGS.COLORS.BULLET;
            drawCtx.fillStyle = SETTINGS.COLORS.BULLET;
            drawCtx.fillRect(-10, -2, 20, 4);
        }));
    }

    private renderEnemyProjectiles(ctx: WorldRendererContext) {
        ctx.enemyProjectiles.forEach(projectile => this.drawWorldEntity(ctx, projectile.x, projectile.y, drawCtx => {
            drawCtx.fillStyle = projectile.color;
            drawCtx.shadowColor = projectile.color;
            drawCtx.shadowBlur = 10;
            drawCtx.beginPath();
            drawCtx.arc(0, 0, projectile.size / 2, 0, Math.PI * 2);
            drawCtx.fill();
        }));
    }

    private renderDamageTexts(ctx: WorldRendererContext) {
        ctx.damageTexts.forEach(text => this.drawWorldEntity(ctx, text.x, text.y, drawCtx => {
            drawCtx.shadowBlur = 0;
            drawCtx.fillStyle = `rgba(255, 255, 255, ${text.opacity})`;
            drawCtx.strokeStyle = `rgba(0, 0, 0, ${text.opacity})`;
            drawCtx.lineWidth = 3;
            drawCtx.font = 'bold 14px "Courier New"';
            drawCtx.textAlign = 'center';
            drawCtx.strokeText(text.value.toString(), 0, 0);
            drawCtx.fillText(text.value.toString(), 0, 0);
        }));
    }

    private renderPlayer(ctx: WorldRendererContext) {
        const canvas = ctx.ctx;

        canvas.save();
        try {
            canvas.translate((ctx.width / ctx.cameraZoom) / 2, (ctx.height / ctx.cameraZoom) / 2);

            if (ctx.rapidFireTimer > 0 || ctx.spreadShotTimer > 0) {
                canvas.save();
                try {
                    canvas.shadowBlur = 0;
                    canvas.font = 'bold 12px "Courier New"';
                    canvas.textAlign = 'center';
                    let yOffset = -40;

                    if (ctx.rapidFireTimer > 0) {
                        canvas.fillStyle = '#ffee00';
                        canvas.fillText(`RAPID: ${Math.ceil(ctx.rapidFireTimer)}s`, 0, yOffset);
                        yOffset -= 15;
                    }

                    if (ctx.spreadShotTimer > 0) {
                        canvas.fillStyle = '#00ffff';
                        canvas.fillText(`SPREAD: ${Math.ceil(ctx.spreadShotTimer)}s`, 0, yOffset);
                    }
                } finally {
                    canvas.restore();
                }
            }

            canvas.rotate(ctx.player.angle + Math.PI / 2 + ctx.shipTilt);
            canvas.strokeStyle = SETTINGS.COLORS.PLAYER;
            canvas.lineWidth = 3;
            canvas.lineCap = 'round';
            canvas.lineJoin = 'round';
            canvas.shadowColor = SETTINGS.COLORS.PLAYER;
            canvas.shadowBlur = 15;

            this.renderPlayerShip(canvas, ctx.state.shipId);

            if (ctx.inputActive) {
                canvas.save();
                try {
                    canvas.shadowBlur = 0;
                    canvas.strokeStyle = '#00ffff';
                    canvas.lineWidth = 1;
                    canvas.beginPath();

                    if (ctx.state.shipId === 'titan') {
                        canvas.moveTo(-10, 25); canvas.lineTo(-12, 35 + Math.random() * 5);
                        canvas.moveTo(10, 25); canvas.lineTo(12, 35 + Math.random() * 5);
                    } else if (ctx.state.shipId === 'viper') {
                        canvas.moveTo(0, 20); canvas.lineTo(0, 40 + Math.random() * 10);
                    } else {
                        canvas.moveTo(-4, 15); canvas.lineTo(-6, 25 + Math.random() * 8);
                        canvas.moveTo(4, 15); canvas.lineTo(6, 25 + Math.random() * 8);
                    }
                    canvas.stroke();
                } finally {
                    canvas.restore();
                }
            }

            if (ctx.state.stats.shieldRadius > 0) {
                const radius = ctx.state.stats.shieldRadius + Math.sin(ctx.state.timeSurvived * 10) * 3;
                canvas.save();
                try {
                    canvas.beginPath();
                    canvas.arc(0, 0, radius, 0, Math.PI * 2);
                    canvas.fillStyle = 'rgba(0, 255, 255, 0.1)';
                    canvas.fill();
                    canvas.strokeStyle = 'rgba(0, 255, 255, 0.5)';
                    canvas.stroke();
                } finally {
                    canvas.restore();
                }
            }
        } finally {
            canvas.restore();
        }
    }

    private renderPlayerShip(ctx: CanvasRenderingContext2D, shipId: string) {
        switch (shipId) {
            case 'titan':
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(-25, -15, 10, 30);
                ctx.fillRect(15, -15, 10, 30);
                ctx.strokeRect(-25, -15, 10, 30);
                ctx.strokeRect(15, -15, 10, 30);

                ctx.beginPath();
                ctx.moveTo(-15, -10);
                ctx.lineTo(0, -20);
                ctx.lineTo(15, -10);
                ctx.lineTo(15, 15);
                ctx.lineTo(0, 25);
                ctx.lineTo(-15, 15);
                ctx.closePath();
                ctx.fillStyle = 'rgba(0, 0, 0, 0.8)';
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.shadowColor = 'cyan';
                ctx.shadowBlur = 10;
                [-10, -5, 5, 10].forEach(x => {
                    ctx.beginPath();
                    ctx.arc(x, 22, 2, 0, Math.PI * 2);
                    ctx.fill();
                });
                break;

            case 'viper':
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(-8, -35);
                ctx.moveTo(8, 0);
                ctx.lineTo(8, -35);
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(5, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.beginPath();
                ctx.moveTo(-5, 10);
                ctx.lineTo(-15, 25);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(5, 10);
                ctx.lineTo(15, 25);
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.rect(-1, -5, 2, 10);
                ctx.fill();
                break;

            case 'nova':
            default:
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.beginPath();
                ctx.moveTo(-5, 0);
                ctx.lineTo(-25, 20);
                ctx.lineTo(-5, 15);
                ctx.moveTo(5, 0);
                ctx.lineTo(25, 20);
                ctx.lineTo(5, 15);
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(8, 15);
                ctx.lineTo(0, 10);
                ctx.lineTo(-8, 15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                ctx.fillStyle = 'white';
                ctx.shadowColor = 'white';
                ctx.shadowBlur = 10;
                ctx.beginPath();
                ctx.moveTo(0, -10);
                ctx.lineTo(3, -2);
                ctx.lineTo(0, 2);
                ctx.lineTo(-3, -2);
                ctx.closePath();
                ctx.fill();
                break;
        }
    }

    private drawWorldEntity(ctx: WorldRendererContext, worldX: number, worldY: number, drawFn: (ctx: CanvasRenderingContext2D) => void) {
        const centerX = (ctx.width / ctx.cameraZoom) / 2;
        const centerY = (ctx.height / ctx.cameraZoom) / 2;
        const screenX = worldX - ctx.player.x + centerX;
        const screenY = worldY - ctx.player.y + centerY;
        const visibleW = ctx.width / ctx.cameraZoom;
        const visibleH = ctx.height / ctx.cameraZoom;

        if (screenX < -100 || screenX > visibleW + 100 || screenY < -100 || screenY > visibleH + 100) {
            return;
        }

        ctx.ctx.save();
        try {
            ctx.ctx.translate(screenX, screenY);
            drawFn(ctx.ctx);
        } finally {
            ctx.ctx.restore();
        }
    }

    private getOrCreateSprite(spriteType: number, frameIndex: number, color: string): HTMLCanvasElement {
        const key = `${spriteType}-${frameIndex}-${color}`;
        if (this.spriteCache.has(key)) {
            return this.spriteCache.get(key)!;
        }

        if (!SPRITES || typeof SPRITES !== 'object') {
            return this.createFallbackSprite('red');
        }

        const spriteSet = SPRITES[spriteType] || SPRITES[0];
        if (!spriteSet || !spriteSet[frameIndex]) {
            return this.createFallbackSprite('magenta');
        }

        const grid = spriteSet[frameIndex];
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;
        const canvas = document.createElement('canvas');
        const scale = 5;

        canvas.width = gridWidth * scale;
        canvas.height = gridHeight * scale;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = color || 'red';

        for (let r = 0; r < gridHeight; r++) {
            const row = grid[r];
            for (let c = 0; c < gridWidth; c++) {
                if (row[c] === '1') {
                    ctx.fillRect(c * scale, r * scale, scale, scale);
                }
            }
        }

        this.spriteCache.set(key, canvas);
        return canvas;
    }

    private createFallbackSprite(color: string): HTMLCanvasElement {
        const canvas = document.createElement('canvas');
        canvas.width = 30;
        canvas.height = 30;
        const ctx = canvas.getContext('2d')!;
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, 30, 30);
        return canvas;
    }
}
