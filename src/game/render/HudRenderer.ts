import { Enemy, GameState, Player } from '../../types';

export interface HudRendererContext {
    ctx: CanvasRenderingContext2D;
    width: number;
    height: number;
    cameraZoom: number;
    state: GameState;
    player: Player;
    boss?: Enemy;
    flashAlpha: number;
    flashColor: string;
}

export class HudRenderer {
    public render(ctx: HudRendererContext) {
        ctx.ctx.save();
        try {
            this.resetHudState(ctx.ctx);
            ctx.ctx.setTransform(1, 0, 0, 1, 0, 0);

            this.renderFlashOverlay(ctx);
            this.resetHudState(ctx.ctx);
            this.renderBossRadar(ctx);
            this.resetHudState(ctx.ctx);
            this.renderHud(ctx);
        } finally {
            ctx.ctx.restore();
        }
    }

    private resetHudState(ctx: CanvasRenderingContext2D) {
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

    private renderFlashOverlay(ctx: HudRendererContext) {
        if (ctx.flashAlpha <= 0) return;

        ctx.ctx.save();
        try {
            this.resetHudState(ctx.ctx);
            ctx.ctx.fillStyle = ctx.flashColor;
            ctx.ctx.globalAlpha = ctx.flashAlpha;
            ctx.ctx.fillRect(0, 0, ctx.width, ctx.height);
        } finally {
            ctx.ctx.restore();
        }
    }

    private renderBossRadar(ctx: HudRendererContext) {
        if (!ctx.state.bossActive || !ctx.boss) return;
        if (this.isEntityOnScreen(ctx, ctx.boss)) return;

        const angle = Math.atan2(ctx.boss.y - ctx.player.y, ctx.boss.x - ctx.player.x);
        const screenCenterX = ctx.width / 2;
        const screenCenterY = ctx.height / 2;
        const radius = Math.min(ctx.width, ctx.height) / 2 - 60;
        const arrowX = screenCenterX + Math.cos(angle) * radius;
        const arrowY = screenCenterY + Math.sin(angle) * radius;
        const pulse = 1 + Math.sin(ctx.state.timeSurvived * 10) * 0.2;

        ctx.ctx.save();
        try {
            this.resetHudState(ctx.ctx);
            ctx.ctx.translate(arrowX, arrowY);
            ctx.ctx.rotate(angle);
            ctx.ctx.scale(pulse, pulse);

            ctx.ctx.beginPath();
            ctx.ctx.moveTo(15, 0);
            ctx.ctx.lineTo(-10, 10);
            ctx.ctx.lineTo(-5, 0);
            ctx.ctx.lineTo(-10, -10);
            ctx.ctx.closePath();
            ctx.ctx.fillStyle = 'rgba(255, 0, 0, 0.9)';
            ctx.ctx.fill();

            ctx.ctx.rotate(-angle);
            ctx.ctx.fillStyle = 'white';
            ctx.ctx.font = 'bold 12px "Courier New"';
            ctx.ctx.textAlign = 'center';
            ctx.ctx.fillText('BOSS', 0, -20);
        } finally {
            ctx.ctx.restore();
        }
    }

    private renderHud(ctx: HudRendererContext) {
        const canvas = ctx.ctx;
        const xpPercent = Math.max(0, Math.min(1, ctx.state.xp / ctx.state.xpToNextLevel));
        const hpPercent = Math.max(0, ctx.state.stats.hp / ctx.state.stats.maxHp);
        const barX = 20;
        const barY = 20;
        const barW = 220;
        const barH = 12;

        canvas.fillStyle = '#333';
        canvas.fillRect(0, 0, ctx.width, 10);

        const xpGrad = canvas.createLinearGradient(0, 0, ctx.width, 0);
        xpGrad.addColorStop(0, '#ff00ff');
        xpGrad.addColorStop(1, '#00ffff');
        canvas.fillStyle = xpGrad;
        canvas.fillRect(0, 0, ctx.width * xpPercent, 10);

        canvas.fillStyle = '#222';
        canvas.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        canvas.fillStyle = hpPercent < 0.3 ? '#ff0055' : 'cyan';
        canvas.fillRect(barX, barY, barW * hpPercent, barH);

        canvas.fillStyle = 'white';
        canvas.font = 'bold 16px "Courier New", monospace';
        canvas.textAlign = 'left';
        canvas.fillText(`HP: ${Math.floor(ctx.state.stats.hp)} / ${ctx.state.stats.maxHp}`, barX, barY + 30);

        canvas.fillStyle = 'yellow';
        canvas.fillText(`LVL ${ctx.state.level}`, barX, barY + 50);

        if (ctx.state.voidMass > 0) {
            const pctIncrease = Math.round((Math.pow(1.10, ctx.state.voidMass) - 1) * 100);
            canvas.fillStyle = '#b19cd9';
            canvas.fillText(`VOID MASS: ${ctx.state.voidMass} (DMG +${pctIncrease}%)`, barX, barY + 70);
        }

        canvas.textAlign = 'right';
        canvas.fillStyle = 'cyan';
        canvas.font = 'bold 20px "Courier New", monospace';
        canvas.fillText(`SECTOR ${ctx.state.currentSector}`, ctx.width - 20, 30);

        canvas.fillStyle = '#aaa';
        canvas.font = '14px "Courier New", monospace';
        canvas.fillText(`DARK MATTER: ${Math.floor(ctx.state.totalDarkMatter)}`, ctx.width - 20, 55);

        if (ctx.state.bossActive) {
            const bossW = ctx.width * 0.6;
            const bossH = 15;
            const bossX = (ctx.width - bossW) / 2;
            const bossY = 80;
            const bossPercent = Math.max(0, ctx.state.bossCurrentHp / ctx.state.bossMaxHp);

            canvas.fillStyle = '#330000';
            canvas.fillRect(bossX, bossY, bossW, bossH);
            canvas.fillStyle = 'red';
            canvas.fillRect(bossX, bossY, bossW * bossPercent, bossH);
            canvas.strokeStyle = 'white';
            canvas.strokeRect(bossX, bossY, bossW, bossH);

            canvas.fillStyle = 'white';
            canvas.textAlign = 'center';
            canvas.fillText('BOSS DETECTED', ctx.width / 2, bossY - 5);
        }
    }

    private isEntityOnScreen(ctx: HudRendererContext, entity: { x: number; y: number }): boolean {
        const visibleW = ctx.width / ctx.cameraZoom;
        const visibleH = ctx.height / ctx.cameraZoom;
        const centerX = visibleW / 2;
        const centerY = visibleH / 2;
        const screenX = entity.x - ctx.player.x + centerX;
        const screenY = entity.y - ctx.player.y + centerY;

        return screenX >= -100 && screenX <= visibleW + 100 &&
            screenY >= -100 && screenY <= visibleH + 100;
    }
}
