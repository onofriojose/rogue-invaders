import { SETTINGS } from '../../constants';
import { AIState, Enemy, EnemyProjectile, GameState, Player } from '../../types';

export interface BossSystemContext {
    state: GameState;
    player: Player;
    enemies: Enemy[];
    enemyProjectiles: EnemyProjectile[];
    width: number;
    height: number;
    cameraZoom: number;
    spawnExplosion: (x: number, y: number, color: string, count?: number) => void;
}

export class BossSystem {
    public spawnBoss(ctx: BossSystemContext) {
        ctx.state.bossActive = true;
        const sector = ctx.state.currentSector;
        const bossOrder = [11, 12, 10];
        const typeIndex = (ctx.state.currentSector - 1) % bossOrder.length;
        const bossType = bossOrder[typeIndex];

        let bossSize = 40;
        if (bossType === 10) {
            bossSize = 120 + (sector * 5);
        } else if (bossType === 11) {
            bossSize = 100 + (sector * 3);
        } else {
            bossSize = 80 + (sector * 2);
        }

        const maxBossSpeed = SETTINGS.PLAYER.BASE_SPEED * 0.8;
        const speed = Math.min(maxBossSpeed, SETTINGS.ENEMY.BASE_SPEED + Math.random() * (sector * 2) + (sector * 2));
        const hpMultiplier = Math.random() * 5 + 30;
        const hp = SETTINGS.ENEMY.BASE_HP * hpMultiplier * sector;
        const distance = (Math.max(ctx.width, ctx.height) / ctx.cameraZoom) / 2 + 200;
        const angle = Math.random() * Math.PI * 2;

        const bossX = ctx.player.x + Math.cos(angle) * distance;
        const bossY = ctx.player.y + Math.sin(angle) * distance;

        ctx.enemies.push({
            x: bossX,
            y: bossY,
            hp,
            maxHp: hp,
            shield: hp * 0.5,
            maxShield: hp * 0.5,
            speed,
            markedForDeletion: false,
            spriteType: bossType,
            frameCount: 0,
            isBoss: true,
            bossColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
            customSize: bossSize,
            angleOffset: 0,
            attackTimer: 0,
            attackState: 0
        });

        const eliteCount = 2 + sector;
        const guardRadius = 150;

        for (let i = 0; i < eliteCount; i++) {
            const guardAngle = (i / eliteCount) * Math.PI * 2;
            const gx = bossX + Math.cos(guardAngle) * guardRadius;
            const gy = bossY + Math.sin(guardAngle) * guardRadius;
            const eliteSpeed = SETTINGS.PLAYER.BASE_SPEED * 0.9;
            const spriteType = Math.random() > 0.5 ? 0 : 12;

            ctx.enemies.push({
                x: gx,
                y: gy,
                hp: (SETTINGS.ENEMY.BASE_HP + (ctx.state.level * 5)) * 5,
                maxHp: (SETTINGS.ENEMY.BASE_HP + (ctx.state.level * 5)) * 5,
                speed: eliteSpeed,
                markedForDeletion: false,
                spriteType,
                frameCount: 0,
                customSize: 45,
                bossColor: '#FF4500',
                isBoss: false,
                shootCooldown: Math.random() * 2,
                aiState: AIState.CHASING
            });
        }

        ctx.state.bossMaxHp = hp;
        ctx.state.bossCurrentHp = hp;
    }

    public updateBossAI(ctx: BossSystemContext, boss: Enemy, dt: number) {
        if (!boss.isBoss) return;

        if (boss.attackTimer === undefined) boss.attackTimer = 0;
        if (boss.angleOffset === undefined) boss.angleOffset = 0;
        if (boss.attackState === undefined) boss.attackState = 0;

        const dist = Math.sqrt(Math.pow(ctx.player.x - boss.x, 2) + Math.pow(ctx.player.y - boss.y, 2));
        const angleToPlayer = Math.atan2(ctx.player.y - boss.y, ctx.player.x - boss.x);

        if (boss.spriteType === 10) {
            boss.x += Math.cos(angleToPlayer) * boss.speed * 0.5 * dt;
            boss.y += Math.sin(angleToPlayer) * boss.speed * 0.5 * dt;

            boss.attackTimer += dt;
            const fireRate = boss.hp < boss.maxHp! * 0.5 ? 0.04 : 0.08;

            if (boss.attackTimer > fireRate) {
                boss.attackTimer = 0;
                boss.angleOffset += 15 * (Math.PI / 180);

                ctx.enemyProjectiles.push({
                    x: boss.x,
                    y: boss.y,
                    vx: Math.cos(boss.angleOffset) * 200,
                    vy: Math.sin(boss.angleOffset) * 200,
                    size: 10,
                    color: 'red',
                    damage: 25
                });

                if (boss.hp < boss.maxHp! * 0.5) {
                    ctx.enemyProjectiles.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(boss.angleOffset + Math.PI) * 200,
                        vy: Math.sin(boss.angleOffset + Math.PI) * 200,
                        size: 10,
                        color: 'orange',
                        damage: 25
                    });
                }
            }
        } else if (boss.spriteType === 11) {
            const kiteDist = 400;
            if (dist < kiteDist) {
                boss.x -= Math.cos(angleToPlayer) * boss.speed * dt;
                boss.y -= Math.sin(angleToPlayer) * boss.speed * dt;
            } else if (dist > kiteDist + 100) {
                boss.x += Math.cos(angleToPlayer) * boss.speed * dt;
                boss.y += Math.sin(angleToPlayer) * boss.speed * dt;
            }

            boss.attackTimer += dt;
            if (boss.attackTimer > 3.0) {
                boss.attackTimer = 0;

                if (ctx.enemies.length < 30) {
                    for (let i = 0; i < 2; i++) {
                        const spawnAngle = Math.random() * Math.PI * 2;
                        ctx.enemies.push({
                            x: boss.x + Math.cos(spawnAngle) * 50,
                            y: boss.y + Math.sin(spawnAngle) * 50,
                            hp: 10 + (ctx.state.level * 2),
                            speed: 100,
                            spriteType: 0,
                            frameCount: 0,
                            markedForDeletion: false,
                            customSize: 20
                        });
                        ctx.spawnExplosion(boss.x, boss.y, 'purple', 5);
                    }
                }
            }

            if (boss.shootCooldown === undefined) boss.shootCooldown = 0;
            boss.shootCooldown -= dt;
            if (boss.shootCooldown <= 0) {
                boss.shootCooldown = 1.5;
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * Math.PI * 2;
                    ctx.enemyProjectiles.push({
                        x: boss.x,
                        y: boss.y,
                        vx: Math.cos(angle) * 200,
                        vy: Math.sin(angle) * 200,
                        size: 10,
                        color: 'purple',
                        damage: 25
                    });
                }
            }
        } else if (boss.spriteType === 12) {
            if (boss.attackState === 0) {
                const strafeAngle = angleToPlayer + Math.PI / 2;
                boss.x += Math.cos(strafeAngle) * boss.speed * 1.5 * dt;
                boss.y += Math.sin(strafeAngle) * boss.speed * 1.5 * dt;

                if (dist > 300) {
                    boss.x += Math.cos(angleToPlayer) * boss.speed * 0.5 * dt;
                    boss.y += Math.sin(angleToPlayer) * boss.speed * 0.5 * dt;
                }

                boss.attackTimer += dt;
                if (boss.attackTimer > 2.0) {
                    boss.attackState = 1;
                    boss.attackTimer = 0;
                }
            } else if (boss.attackState === 1) {
                boss.bossColor = (Math.floor(Date.now() / 50) % 2 === 0) ? 'red' : 'white';

                boss.attackTimer += dt;
                if (boss.attackTimer > 0.5) {
                    boss.attackState = 2;
                    boss.attackTimer = 0;
                    boss.bossColor = undefined;

                    const dashAngle = angleToPlayer;
                    boss.vx = Math.cos(dashAngle) * 1000;
                    boss.vy = Math.sin(dashAngle) * 1000;
                }
            } else if (boss.attackState === 2) {
                boss.x += (boss.vx || 0) * dt;
                boss.y += (boss.vy || 0) * dt;
                ctx.spawnExplosion(boss.x, boss.y, 'cyan', 2);

                boss.attackTimer += dt;
                if (boss.attackTimer > 0.3) {
                    boss.attackState = 3;
                    boss.attackTimer = 0;
                    boss.vx = 0;
                    boss.vy = 0;
                }
            } else if (boss.attackState === 3) {
                if (boss.attackTimer === 0) {
                    [-0.3, 0, 0.3].forEach(offset => {
                        ctx.enemyProjectiles.push({
                            x: boss.x,
                            y: boss.y,
                            vx: Math.cos(angleToPlayer + offset) * 300,
                            vy: Math.sin(angleToPlayer + offset) * 300,
                            size: 12,
                            color: 'cyan',
                            damage: 25
                        });
                    });
                }

                boss.attackTimer += dt;
                if (boss.attackTimer > 0.5) {
                    boss.attackState = 0;
                    boss.attackTimer = 0;
                }
            }
        }

        if (!boss.reinforceTimer) boss.reinforceTimer = 0;
        boss.reinforceTimer += dt;

        if (boss.reinforceTimer > 4.0) {
            boss.reinforceTimer = 0;

            const activeElites = ctx.enemies.filter(e => !e.isBoss && e.customSize && e.customSize >= 40).length;
            const maxElites = 2 + ctx.state.currentSector;

            if (activeElites < maxElites) {
                const angle = Math.random() * Math.PI * 2;
                const spawnDist = 100;
                const eliteSpeed = SETTINGS.PLAYER.BASE_SPEED * 0.9;

                ctx.enemies.push({
                    x: boss.x + Math.cos(angle) * spawnDist,
                    y: boss.y + Math.sin(angle) * spawnDist,
                    hp: (SETTINGS.ENEMY.BASE_HP + (ctx.state.level * 5)) * 4,
                    maxHp: (SETTINGS.ENEMY.BASE_HP + (ctx.state.level * 5)) * 4,
                    speed: eliteSpeed,
                    spriteType: Math.random() > 0.5 ? 0 : 12,
                    frameCount: 0,
                    isBoss: false,
                    bossColor: '#FF4500',
                    customSize: 45,
                    markedForDeletion: false,
                    aiState: AIState.CHASING
                });

                ctx.spawnExplosion(boss.x, boss.y, '#FF4500', 5);
            }
        }
    }
}
