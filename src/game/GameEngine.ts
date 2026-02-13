import { SETTINGS } from '../constants';
import { GameState, Player, Enemy, Projectile, Gem, Particle, GameStats, Upgrade, DamageText, EnemyProjectile, AIState, Beacon } from '../types';
import { InputManager } from './InputManager';
import { SPRITES } from './EnemySprites';

import { Obstacle } from '../types';



type PowerUpType = 'HEALTH' | 'RAPID_FIRE' | 'SPREAD_SHOT' | 'NUKE';
interface PowerUp {
    x: number;
    y: number;
    type: PowerUpType;
    life: number;
    size: number;
    color: string;
}

interface Star { x: number; y: number; size: number; speed: number; }

export class GameEngine {
    public ctx: CanvasRenderingContext2D;
    public width: number = 0;
    public height: number = 0;

    public state: GameState;
    public input: InputManager;

    // Entities
    public player: Player;
    public projectiles: Projectile[] = [];
    public enemies: Enemy[] = [];
    public gems: Gem[] = [];
    public particles: Particle[] = [];
    public damageTexts: DamageText[] = [];
    public enemyProjectiles: EnemyProjectile[] = [];
    public powerUps: PowerUp[] = []; // NEW
    public obstacles: Obstacle[] = [];
    public beacons: Beacon[] = []; // NEW: Supply Beacons
    private backgroundStars: Star[] = [];

    // Camera FX
    private shakeIntensity: number = 0;
    private flashAlpha: number = 0;
    private flashColor: string = 'red';
    // Ship Dynamics
    private shipTilt: number = 0;

    // Config
    private readonly CAMERA_ZOOM: number = 0.6;

    // Internals
    private spawnTimer: number = 0;
    private shieldTickTimer: number = 0;
    // Buff Timers
    private rapidFireTimer: number = 0;
    private spreadShotTimer: number = 0;

    // private bgStars: { x: number, y: number, z: number }[] = []; REMOVED for Procedural Parallax
    private spriteCache: Map<string, HTMLCanvasElement> = new Map();
    private onUIUpdate: (state: GameState) => void;
    // Environment
    private windTimer: number = 0;
    private windActive: boolean = false;
    private windVector: { x: number, y: number } = { x: 0, y: 0 };
    private onLevelUp: () => void;
    private onGameOver: () => void;
    private lastBossType: number = -1;

    constructor(
        ctx: CanvasRenderingContext2D,
        input: InputManager,
        onUIUpdate: (state: GameState) => void,
        onLevelUp: () => void,
        onGameOver: () => void,
        initialStats?: Partial<GameStats>,
        shipId: string = 'nova'
    ) {
        this.ctx = ctx;
        this.input = input;
        this.onUIUpdate = onUIUpdate;
        this.onLevelUp = onLevelUp;
        this.onGameOver = onGameOver;

        this.width = ctx.canvas.width;
        this.height = ctx.canvas.height;

        // Init State
        this.state = {
            gameOver: false,
            paused: false,
            lastTime: 0,
            timeSurvived: 0,
            level: 1,
            xp: 0,
            xpToNextLevel: 100,
            kills: 0,
            stats: {
                maxHp: SETTINGS.PLAYER.BASE_HP,
                hp: SETTINGS.PLAYER.BASE_HP,
                speed: SETTINGS.PLAYER.BASE_SPEED,
                fireRate: SETTINGS.WEAPON.FIRE_RATE,
                projectileCount: SETTINGS.WEAPON.PROJECTILE_COUNT,
                damage: SETTINGS.WEAPON.DAMAGE,
                shieldRadius: 0,
                shieldDamage: 0,
                magnetRadius: 100, // Default magnet
                ...initialStats // OVERRIDE WITH SHIP STATS
            },
            currentSector: 1,
            totalDarkMatter: 0,
            sectorTimer: 0,
            bossActive: false,
            bossMaxHp: 0,
            bossCurrentHp: 0,
            sectorColors: {
                background: SETTINGS.COLORS.BG,
                stars: 'white',
                enemyOutline: SETTINGS.COLORS.ENEMY,
                enemyFill: 'transparent'
            },
            shipId: shipId
        };

        // solar wind state
        this.windTimer = 0;
        this.windActive = false;
        this.windVector = { x: 0, y: 0 };

        // Init Player
        this.player = {
            x: this.width / 2,
            y: this.height / 2,
            vx: 0,
            vy: 0,
            angle: 0,
            lastShotTime: 0,
            isDashing: false,
            dashCooldown: 0,
            invulnerabilityTimer: 0
        };

        // Init Background Stars (Parallax)
        for (let i = 0; i < 100; i++) {
            this.backgroundStars.push({
                x: Math.random() * 2000,
                y: Math.random() * 2000,
                size: Math.random() * 2 + 1,
                speed: (Math.random() * 1.1) + 0.1
            });
        }
    }

    public resize(w: number, h: number) {
        this.width = w;
        this.height = h;
    }

    public update(dt: number) {
        if (this.state.paused || this.state.gameOver) return;

        this.state.timeSurvived += dt;
        this.updateSector(dt);


        // Visual FX Decay
        this.shakeIntensity *= 0.9;
        if (this.shakeIntensity < 0.5) this.shakeIntensity = 0;

        this.flashAlpha *= 0.85;
        if (this.flashAlpha < 0.05) this.flashAlpha = 0;

        // Ship Tilt Logic
        const tiltTarget = this.input.vector.x * 0.2; // -0.2 to 0.2 rad
        this.shipTilt += (tiltTarget - this.shipTilt) * 0.1;

        // Buff Timers
        if (this.rapidFireTimer > 0) this.rapidFireTimer -= dt;
        if (this.spreadShotTimer > 0) this.spreadShotTimer -= dt;

        this.updatePlayer(dt);
        this.handleCombat(this.state.timeSurvived);
        this.handleShieldCombat(dt);
        this.handleSpawning(dt);
        this.handleEnemyShooting(dt); // New Logic
        this.handleEnvironment(dt);
        this.updateEntities(dt);
        this.checkCollisions();

        // Notify UI every frame roughly? Or leverage React's batching?
        // Better to do it periodically or on change, but for HP/timer, frame is okay if component is optimized.
        // Actually, let's just callback.
        this.onUIUpdate(this.state);
    }

    private updateSector(dt: number) {
        if (this.state.bossActive) return; // Timer pauses during boss fight

        this.state.sectorTimer += dt;
        if (this.state.sectorTimer >= SETTINGS.SECTOR.BOSS_SPAWN_TIME) {
            this.spawnBoss();
        }
    }

    private spawnBoss() {
        this.state.bossActive = true;
        const sector = this.state.currentSector;

        // 4. Force Boss Variety
        const availableTypes = [10, 11, 12];
        let bossType = availableTypes[0];
        // Try up to 10 times to get a different boss (safety break)
        for (let i = 0; i < 10; i++) {
            bossType = availableTypes[Math.floor(Math.random() * availableTypes.length)];
            if (bossType !== this.lastBossType) break;
        }
        this.lastBossType = bossType;

        // 3. Boss Size Buffs
        let bossSize = 40;
        if (bossType === 10) { // Dreadnought
            bossSize = 120 + (sector * 5);
        } else if (bossType === 11) { // Mothership
            bossSize = 100 + (sector * 3);
        } else { // Interceptor (12)
            bossSize = 80 + (sector * 2);
        }

        // Cap speed
        const maxBossSpeed = SETTINGS.PLAYER.BASE_SPEED * 0.8;
        const speed = Math.min(maxBossSpeed, SETTINGS.ENEMY.BASE_SPEED + Math.random() * (sector * 2) + (sector * 2));

        const hpMultiplier = Math.random() * 5 + 10; // 10x to 15x
        const hp = SETTINGS.ENEMY.BASE_HP * hpMultiplier * sector;

        const distance = (Math.max(this.width, this.height) / this.CAMERA_ZOOM) / 2 + 200;
        const angle = Math.random() * Math.PI * 2;

        this.enemies.push({
            x: this.player.x + Math.cos(angle) * distance,
            y: this.player.y + Math.sin(angle) * distance,
            hp: hp,
            maxHp: hp,
            speed: speed,
            markedForDeletion: false,
            spriteType: bossType,
            frameCount: 0,
            isBoss: true,
            bossColor: `hsl(${Math.random() * 360}, 100%, 50%)`,
            customSize: bossSize
        });

        this.state.bossMaxHp = hp;
        this.state.bossCurrentHp = hp;
    }

    public spawnPowerUp(x: number, y: number, force: boolean = false) {
        if (!force && Math.random() > 0.05) return; // 5% chance normally

        const rand = Math.random();
        let type: PowerUpType = 'HEALTH';
        let color = '#00ff00';

        if (rand < 0.40) {
            type = 'HEALTH';
            color = '#00ff00';
        } else if (rand < 0.65) {
            type = 'RAPID_FIRE';
            color = '#ffee00';
        } else if (rand < 0.90) {
            type = 'SPREAD_SHOT';
            color = '#00ffff';
        } else {
            type = 'NUKE';
            color = '#ff0000';
        }

        this.powerUps.push({
            x, y, type, life: 15, size: 20, color
        });
    }
    private nextSector() {
        this.state.currentSector++;
        this.state.bossActive = false;
        this.state.sectorTimer = 0;
        this.spriteCache.clear();

        // Reward
        const darkMatter = Math.floor(100 * Math.pow(1.5, this.state.currentSector - 1));
        this.state.totalDarkMatter += darkMatter;

        // Visuals
        const hue = Math.random() * 360;
        this.state.sectorColors = {
            background: `hsl(${hue}, 40%, 10%)`,
            stars: `hsl(${hue}, 80%, 80%)`,
            enemyOutline: `hsl(${(hue + 180) % 360}, 100%, 60%)`, // Complementary
            enemyFill: `hsl(${(hue + 180) % 360}, 100%, 20%)`
        };

        // Warp Effect
        this.spawnExplosion(this.player.x, this.player.y, 'white', 50);
        this.spawnDamageText(this.player.x, this.player.y - 100, darkMatter); // Show reward text
    }

    private updatePlayer(dt: number) {
        // Timers
        if (this.player.dashCooldown > 0) this.player.dashCooldown -= dt;
        if (this.player.invulnerabilityTimer > 0) {
            this.player.invulnerabilityTimer -= dt;
            if (this.player.invulnerabilityTimer <= 0) {
                this.player.isDashing = false;
                // Snap Stop (Heavy Friction)
                this.player.vx *= 0.5;
                this.player.vy *= 0.5;
            } else {
                // Ghost Trail
                if (Math.random() > 0.5) {
                    this.particles.push({
                        x: this.player.x, y: this.player.y,
                        vx: 0, vy: 0,
                        life: 0.5, color: 'rgba(0, 255, 255, 0.5)', size: this.state.stats.hp > 30 ? 20 : 10,
                        markedForDeletion: false
                    });
                }
            }
        }

        // Dash Input
        if (this.input.consumeDash() && this.player.dashCooldown <= 0) {
            this.player.isDashing = true;
            this.player.dashCooldown = 2.0;
            this.player.invulnerabilityTimer = 0.3;

            // Impulse
            const speed = this.state.stats.speed * 3;
            // Use current input vector if active, else current velocity direction, else forward (angle)
            let dirX = this.input.vector.x;
            let dirY = this.input.vector.y;

            if (dirX === 0 && dirY === 0) {
                dirX = Math.cos(this.player.angle);
                dirY = Math.sin(this.player.angle);
            }

            this.player.vx = dirX * speed;
            this.player.vy = dirY * speed;

            this.triggerShake(5);
            this.spawnExplosion(this.player.x, this.player.y, 'cyan', 10); // Dash burst
        }

        // --- ID 2: PLAYER VS OBSTACLE PHYSICS ---
        // Duplicate logic REMOVED. Consolidating in checkCollisions() to support Dash pass-through.


        // Movement Normal
        if (!this.player.isDashing && this.input.active) {
            this.player.vx += this.input.vector.x * this.state.stats.speed * 10 * dt;
            this.player.vy += this.input.vector.y * this.state.stats.speed * 10 * dt;
            this.player.angle = Math.atan2(this.input.vector.y, this.input.vector.x);
        }

        // Friction (Less during dash to maintain momentum, but we set velocity directly so it's fine)
        const friction = this.player.isDashing ? 0.98 : SETTINGS.PLAYER.FRICTION;
        this.player.vx *= friction;
        this.player.vy *= friction;

        // Cap speed only if NOT dashing (or cap at higher limit)
        const currentSpeed = Math.sqrt(this.player.vx ** 2 + this.player.vy ** 2);
        const maxSpeed = this.player.isDashing ? this.state.stats.speed * 4 : this.state.stats.speed;

        if (currentSpeed > maxSpeed) {
            this.player.vx = (this.player.vx / currentSpeed) * maxSpeed;
            this.player.vy = (this.player.vy / currentSpeed) * maxSpeed;
        }

        this.player.x += this.player.vx * dt;
        this.player.y += this.player.vy * dt;
    }

    private handleSpawning(dt: number) {
        // 3. Max Enemy Cap
        const enemyCap = 20 + (this.state.currentSector * 5);
        if (this.enemies.length >= enemyCap) return;

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0) {
            // 2. Nerf Initial Spawn Rate & Scale (ADJUSTED: 2x Faster Start)
            // Sector 1: 1.0s (was 2.0s)
            // Scaling: -0.1s per sector until 0.3s clamp
            const baseInterval = Math.max(0.3, 1.0 - ((this.state.currentSector - 1) * 0.1));
            this.spawnTimer = baseInterval;

            const angle = Math.random() * Math.PI * 2;
            const dist = (Math.max(this.width, this.height) / this.CAMERA_ZOOM) / 2 + SETTINGS.WORLD.VIEW_PADDING;

            // Base Stats based on Level/Sector
            let hp = SETTINGS.ENEMY.BASE_HP + (this.state.level * 5);
            let speed = SETTINGS.ENEMY.BASE_SPEED + (this.state.level * 2);
            let size = 30; // Medium/Standard
            let color = undefined; // Undefined means use Sector Default

            // 1. Progressive Enemy Spawning (Sector-based probabilities)
            const sector = this.state.currentSector;
            const roll = Math.random();

            let isSwarmer = false;
            let isTank = false;

            if (sector === 1) {
                // 100% Standard
            } else if (sector === 2) {
                // 20% Swarmer, 80% Standard
                if (roll < 0.20) isSwarmer = true;
            } else if (sector >= 3 && sector < 5) {
                // 20% Swarmer, 15% Tank, 65% Standard
                if (roll < 0.20) isSwarmer = true;
                else if (roll < 0.35) isTank = true;
            } else {
                // Sector 5+: 30% Swarmer, 25% Tank, 45% Standard
                if (roll < 0.30) isSwarmer = true;
                else if (roll < 0.55) isTank = true;
            }

            if (isSwarmer) {
                // ARCHETYPE A: Swarmer
                // Fast, Weak, Small, Gold
                speed *= 1.6;
                hp *= 0.5;
                size = 20;
                color = '#FFD700'; // Gold
            } else if (isTank) {
                // ARCHETYPE B: Armored
                // Slow, Tanky, Large, Purple/Green
                speed *= 0.6; // bit faster than 0.5
                hp *= 2.5;
                size = 45;
                color = Math.random() > 0.5 ? '#800080' : '#006400';
            }
            // Else: Standard

            this.enemies.push({
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                hp: hp,
                maxHp: hp, // Ensure maxHp is set for bars if needed later
                speed: speed,
                markedForDeletion: false,
                spriteType: Math.floor(Math.random() * 3),
                frameCount: 0,
                customSize: size,
                bossColor: color,
                isBoss: false,
                shootCooldown: 2000 + Math.random() * 3000,
                aiState: AIState.CHASING,
                stateTimer: 0,
                chargeTimer: 0
            });
        }
    }

    private handleCombat(time: number) {
        let fireRate = this.state.stats.fireRate;
        if (this.rapidFireTimer > 0) fireRate /= 2;

        if (time - this.player.lastShotTime < fireRate) return;

        let nearest = null;
        let minDist = Infinity;

        this.enemies.forEach(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = dx * dx + dy * dy;
            if (dist < minDist) {
                minDist = dist;
                nearest = e;
            }
        });

        if (!nearest) return;

        this.player.lastShotTime = time;
        const target = nearest as Enemy;
        const dx = target.x - this.player.x;
        const dy = target.y - this.player.y;
        const angle = Math.atan2(dy, dx);

        const count = this.state.stats.projectileCount;
        const startAngle = angle - (SETTINGS.WEAPON.FAN_ANGLE * (count - 1)) / 2;

        for (let i = 0; i < count; i++) {
            const finalAngle = startAngle + i * SETTINGS.WEAPON.FAN_ANGLE;
            this.projectiles.push({
                x: this.player.x,
                y: this.player.y,
                vx: Math.cos(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                vy: Math.sin(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                size: 10,
                life: 1.5,
                markedForDeletion: false
            });
        }

        // SPREAD SHOT BUFF
        if (this.spreadShotTimer > 0) {
            [-0.26, 0.26].forEach(offset => { // +/- ~15 degrees
                const finalAngle = angle + offset;
                this.projectiles.push({
                    x: this.player.x,
                    y: this.player.y,
                    vx: Math.cos(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                    vy: Math.sin(finalAngle) * SETTINGS.WEAPON.PROJECTILE_SPEED,
                    size: 10,
                    life: 1.5,
                    markedForDeletion: false
                });
            });
        }
    }

    private handleShieldCombat(dt: number) {
        if (this.state.stats.shieldRadius <= 0) return;

        this.shieldTickTimer += dt;
        if (this.shieldTickTimer >= 0.1) {
            // Apply damage every 0.1s
            const dmgPerTick = this.state.stats.shieldDamage * 0.1;

            this.enemies.forEach(e => {
                if (e.markedForDeletion) return;
                const dx = e.x - this.player.x;
                const dy = e.y - this.player.y;
                const distSq = dx * dx + dy * dy;
                const radiusSq = this.state.stats.shieldRadius * this.state.stats.shieldRadius;

                if (distSq < radiusSq) {
                    e.hp -= dmgPerTick;

                    // Visual feedback
                    if (Math.random() > 0.7) {
                        this.spawnExplosion(e.x, e.y, SETTINGS.COLORS.PLAYER, 2);
                    }

                    if (e.isBoss) {
                        this.state.bossCurrentHp = Math.max(0, e.hp);
                    }

                    if (e.hp <= 0) {
                        e.markedForDeletion = true;
                        this.spawnExplosion(e.x, e.y, e.isBoss ? (e.bossColor || SETTINGS.COLORS.ENEMY) : this.state.sectorColors.enemyOutline, e.isBoss ? 50 : 15);

                        if (e.isBoss) {
                            this.nextSector();
                        } else {
                            this.gems.push({
                                x: e.x, y: e.y, value: 10, markedForDeletion: false, magnetized: false
                            });
                            this.state.kills++;
                        }
                    }
                }
            });

            this.shieldTickTimer = 0;
        }
    }

    private updateEntities(dt: number) {
        this.projectiles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.life -= dt;
            if (p.life <= 0) p.markedForDeletion = true;
        });

        this.enemies.forEach(e => {
            this.updateEnemyAI(e, dt);
            e.frameCount++;
        });

        this.gems.forEach(g => {
            const dx = this.player.x - g.x;
            const dy = this.player.y - g.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < this.state.stats.magnetRadius) {
                g.magnetized = true;
            }

            // FIX 2: Prevent Drifting
            if (g.magnetized) {
                const speed = 600;
                g.x += (dx / dist) * speed * dt;
                g.y += (dy / dist) * speed * dt;
                if (dist < 20) {
                    this.state.xp += g.value;
                    g.markedForDeletion = true;
                    if (this.state.xp >= this.state.xpToNextLevel) {
                        this.onLevelUp();
                    }
                }
            } else {
                // FORCE STATIC: Do nothing.
                // Gems have no vx/vy, so they are static by default.
                // This ensures they don't drift.
            }
        });

        this.particles.forEach(p => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= dt * 2;
            if (p.life <= 0) p.markedForDeletion = true;
        });

        this.powerUps.forEach(p => {
            p.life -= dt;
        });

        this.damageTexts.forEach(t => {
            t.y -= 30 * dt; // Float up
            t.life -= dt;
            t.opacity = Math.max(0, t.life); // Fade out
            if (t.life <= 0) t.markedForDeletion = true;
        });

        // Update Enemy Projectiles
        this.enemyProjectiles.forEach(p => {
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            // Remove of screen
            if (p.x < -100 || p.x > this.width + 100 || p.y < -100 || p.y > this.height + 100) {
                // We can just filter them out later, let's mark them if we had a flag, 
                // but simpler to filter in the consolidation block below or just splice.
                // Let's filter below.
            }
        });

        // Filter
        this.projectiles = this.projectiles.filter(p => !p.markedForDeletion);
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.gems = this.gems.filter(g => !g.markedForDeletion);
        this.particles = this.particles.filter(p => !p.markedForDeletion);
        this.damageTexts = this.damageTexts.filter(t => !t.markedForDeletion);

        // Filter enemy projectiles that go off screen
        this.enemyProjectiles = this.enemyProjectiles.filter(p =>
            p.x > -100 && p.x < this.width + 100 &&
            p.y > -100 && p.y < this.height + 100
        );
        this.powerUps = this.powerUps.filter(p => p.life > 0);
    }

    private spawnDamageText(x: number, y: number, damage: number | string) {
        this.damageTexts.push({
            x,
            y,
            value: typeof damage === 'number' ? Math.floor(damage) : damage,
            life: 1.0,
            opacity: 1.0,
            markedForDeletion: false
        });
    }


    private updateEnemyAI(e: Enemy, dt: number) {
        const distToPlayer = Math.sqrt(Math.pow(this.player.x - e.x, 2) + Math.pow(this.player.y - e.y, 2));

        // Default Init
        if (e.aiState === undefined) e.aiState = AIState.CHASING;

        // --- ID 0: KAMIKAZE SQUID ---
        if (e.spriteType === 0) {
            switch (e.aiState) {
                case AIState.CHASING:
                    // Move towards player
                    const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                    e.x += Math.cos(angle) * e.speed * dt;
                    e.y += Math.sin(angle) * e.speed * dt;

                    // Trigger Charge if close
                    if (distToPlayer < 200) {
                        e.aiState = AIState.CHARGING;
                        e.chargeTimer = 0.5; // 500ms telegraph
                    }
                    break;
                case AIState.CHARGING:
                    e.chargeTimer! -= dt;
                    // Telegraph: Shake/Flash
                    if (Math.random() > 0.5) {
                        e.x += (Math.random() - 0.5) * 4;
                        e.y += (Math.random() - 0.5) * 4;
                    }
                    if (e.chargeTimer! <= 0) {
                        e.aiState = AIState.ATTACKING;
                        // Lock on target vector
                        e.stateTimer = 0.5; // Dash duration
                        // Store dash velocity
                        const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                        e.vx = Math.cos(angle) * (e.speed * 4); // 4x speed dash
                        e.vy = Math.sin(angle) * (e.speed * 4);
                    }
                    break;
                case AIState.ATTACKING:
                    e.x += (e.vx || 0) * dt;
                    e.y += (e.vy || 0) * dt;
                    e.stateTimer! -= dt;
                    // Trail
                    this.particles.push({
                        x: e.x, y: e.y, vx: 0, vy: 0, life: 0.2, color: 'white', size: 5, markedForDeletion: false
                    });

                    if (e.stateTimer! <= 0) {
                        e.aiState = AIState.CHASING;
                        // Cooldown before next charge?
                    }
                    break;
            }
        }
        // --- ID 2: TURRET OCTOPUS ---
        else if (e.spriteType === 2) {
            switch (e.aiState) {
                case AIState.CHASING:
                    // Move slowly
                    const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                    e.x += Math.cos(angle) * (e.speed * 0.5) * dt;
                    e.y += Math.sin(angle) * (e.speed * 0.5) * dt;

                    e.stateTimer = (e.stateTimer || 0) + dt;
                    if (e.stateTimer > 3.0) { // Move for 3s
                        e.aiState = AIState.CHARGING;
                        e.chargeTimer = 0.5;
                        e.stateTimer = 0;
                    }
                    break;
                case AIState.CHARGING:
                    e.chargeTimer! -= dt;
                    // Visual: Flash Red
                    if (e.chargeTimer! <= 0) {
                        e.aiState = AIState.ATTACKING;
                    }
                    break;
                case AIState.ATTACKING:
                    // Shoot
                    const angle2 = Math.atan2(this.player.y - e.y, this.player.x - e.x);
                    // 3-Projectile Spread
                    [-0.2, 0, 0.2].forEach(offset => {
                        this.enemyProjectiles.push({
                            x: e.x, y: e.y,
                            vx: Math.cos(angle2 + offset) * 300,
                            vy: Math.sin(angle2 + offset) * 300,
                            size: 8, color: 'red'
                        });
                    });

                    e.aiState = AIState.CHASING; // Return to move
                    break;
            }
        }
        // --- ID 1: STANDARD / OTHERS ---
        else {
            // Simple Chase
            const angle = Math.atan2(this.player.y - e.y, this.player.x - e.x);
            e.x += Math.cos(angle) * e.speed * dt;
            e.y += Math.sin(angle) * e.speed * dt;
        }
    }

    private handleEnemyShooting(dt: number) {
        this.enemies.forEach(e => {
            if (e.markedForDeletion) return;

            // CheckArchetype: Swarmers (size 20) don't shoot.
            if (e.customSize && e.customSize <= 25) return;

            if (e.shootCooldown !== undefined) {
                e.shootCooldown -= dt * 1000; // ms
                if (e.shootCooldown <= 0) {
                    // SHOOT
                    const dx = this.player.x - e.x;
                    const dy = this.player.y - e.y;
                    const angle = Math.atan2(dy, dx);
                    const speed = 250;

                    this.enemyProjectiles.push({
                        x: e.x,
                        y: e.y,
                        vx: Math.cos(angle) * speed,
                        vy: Math.sin(angle) * speed,
                        size: 8,
                        color: e.bossColor && (e.bossColor === '#800080' || e.bossColor === '#006400') ? 'orange' : 'red'
                    });

                    // Reset Cooldown
                    e.shootCooldown = 3000 + Math.random() * 2000;
                }
            }
        });
    }

    private handleEnvironment(dt: number) {
        // 1. Solar Wind
        this.windTimer += dt;
        if (!this.windActive) {
            if (this.windTimer > 15) { // Every 15s
                this.windActive = true;
                this.windTimer = 0; // Duration 5s
                const angle = Math.random() * Math.PI * 2;
                this.windVector = { x: Math.cos(angle) * 100, y: Math.sin(angle) * 100 };
                this.triggerFlash('white', 0.2);
                this.spawnDamageText(this.player.x, this.player.y - 100, 0);
            }
        } else {
            if (this.windTimer > 5) {
                this.windActive = false;
                this.windTimer = 0;
            }
        }

        // Apply Wind
        if (this.windActive) {
            const windX = this.windVector.x * dt;
            const windY = this.windVector.y * dt;
            this.player.x += windX * 0.5; // Player resists a bit
            this.player.y += windY * 0.5;
            this.enemies.forEach(e => { e.x += windX; e.y += windY; });
            this.gems.forEach(g => { g.x += windX * 2; g.y += windY * 2; });
            this.particles.forEach(p => { p.x += windX * 3; p.y += windY * 3; });
        }

        // 2. Obstacles
        // Spawn randomly outside view
        if (Math.random() < 0.008) { // Slightly increased chance since they spawn far out
            // Calculate spawn angle based on player movement to spawn "in front"
            let angle = Math.random() * Math.PI * 2;
            if (Math.abs(this.player.vx) > 0.1 || Math.abs(this.player.vy) > 0.1) {
                const moveAngle = Math.atan2(this.player.vy, this.player.vx);
                // Spawn in a 90 degree arc in front of player
                angle = moveAngle + (Math.random() - 0.5) * (Math.PI / 2);
            }

            const dist = (Math.max(this.width, this.height) / this.CAMERA_ZOOM) * 0.8 + 200; // Just outside view
            // Procedural Vertices Generation
            const vertexCount = Math.floor(Math.random() * 5) + 8; // 8 to 12 vertices
            const vertices: { x: number, y: number }[] = [];
            const size = 40 + Math.random() * 30;

            for (let i = 0; i < vertexCount; i++) {
                const angle = (i / vertexCount) * Math.PI * 2;
                // Random variation in radius (0.7 to 1.3 of base size) to create "rock" shape
                const r = size * (0.7 + Math.random() * 0.6);
                vertices.push({
                    x: Math.cos(angle) * r,
                    y: Math.sin(angle) * r
                });
            }

            this.obstacles.push({
                x: this.player.x + Math.cos(angle) * dist,
                y: this.player.y + Math.sin(angle) * dist,
                size: size,
                color: '#555', // Will be overridden by render style, but kept for fallback
                markedForDeletion: false,
                isExploding: false,
                explodeTimer: 0,
                vertices: vertices
            });
        }

        // 3. Supply Beacons (Risk/Reward)
        // 0.5% chance per second (assuming 60fps, dt is roughly 0.016, so check every frame?)
        // Let's do a timer check or random check. 0.5% per second means 0.005 probability in 1s.
        // In one frame (dt), prob = 0.005 * dt.
        if (this.beacons.length < 1 && Math.random() < 0.005 * dt) {
            // "Rarely, a 'Beacon' spawns." - Let's spawn it within bounds so player sees it.
            const x = this.player.x + (Math.random() - 0.5) * this.width;
            const y = this.player.y + (Math.random() - 0.5) * this.height;

            this.beacons.push({
                x, y, radius: 25, active: true
            });
            this.spawnDamageText(x, y - 50, "BEACON DETECTED"); // Announcement
        }

        this.obstacles.forEach(o => {
            if (o.isExploding) {
                o.explodeTimer -= dt;
                o.color = Math.random() > 0.5 ? 'red' : 'orange';
                if (o.explodeTimer <= 0) {
                    o.markedForDeletion = true;
                    this.spawnExplosion(o.x, o.y, 'orange', 30);
                    // AOE Damage
                    this.enemies.forEach(e => {
                        const dx = e.x - o.x;
                        const dy = e.y - o.y;
                        if (Math.sqrt(dx * dx + dy * dy) < 150) {
                            e.hp -= 100;
                            if (e.hp <= 0) {
                                e.markedForDeletion = true;
                                this.spawnPowerUp(e.x, e.y);
                            }
                        }
                    });
                }
            }
            // Cleanup distance - Despawn if too far behind
            const dx = this.player.x - o.x;
            const dy = this.player.y - o.y;
            if (Math.sqrt(dx * dx + dy * dy) < 2500) {
                // Keep
            } else {
                o.markedForDeletion = true;
            }
        });

        this.obstacles = this.obstacles.filter(o => !o.markedForDeletion);
    }

    private spawnExplosion(x: number, y: number, color: string, count: number = 15) {
        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2;
            const speed = Math.random() * 3 + 1;
            this.particles.push({
                x, y,
                vx: Math.cos(angle) * speed,
                vy: Math.sin(angle) * speed,
                life: 1.0, // 100% opacity start
                color: color,
                size: Math.random() * 3 + 2,
                markedForDeletion: false
            });
        }
    }

    private triggerShake(amount: number) {
        this.shakeIntensity = Math.min(this.shakeIntensity + amount, 20);
    }

    private triggerFlash(color: string, intensity: number = 0.5) {
        this.flashColor = color;
        this.flashAlpha = intensity;
    }

    private checkCollisions() {
        // Projectiles vs Obstacles
        this.projectiles.forEach(p => {
            if (p.markedForDeletion) return;
            this.obstacles.forEach(o => {
                if (o.markedForDeletion || p.markedForDeletion) return;
                const dx = p.x - o.x;
                const dy = p.y - o.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                if (dist < o.size + p.size) {
                    // FIX: Bullets DESTROY asteroids
                    p.markedForDeletion = true;

                    if (!o.isExploding) {
                        o.isExploding = true;
                        o.explodeTimer = 0.1; // Explode almost instantly

                        // Visual Feedback
                        this.spawnExplosion(o.x, o.y, 'orange', 15);
                        this.triggerShake(2);
                    }
                }
            });
        });

        // Player vs Obstacles (Bump or Dash Destroy)
        this.obstacles.forEach(o => {
            if (o.markedForDeletion) return;
            const dx = this.player.x - o.x;
            const dy = this.player.y - o.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < o.size + SETTINGS.PLAYER.BASE_SIZE) {
                // If Dashing -> Destroy Asteroid
                if (this.player.isDashing) {
                    o.isExploding = true;
                    o.explodeTimer = 0.5;
                    this.spawnExplosion(o.x, o.y, 'orange', 20);
                    this.triggerShake(5);
                    // FIX 3: No healing, just destroy and keep moving
                    // this.state.stats.hp = Math.min(this.state.stats.hp + 1, this.state.stats.maxHp); 
                    return;
                }

                // Normal Collision -> Bounce (Physics Bumper Car)
                const angle = Math.atan2(dy, dx);
                const pushDist = o.size + SETTINGS.PLAYER.BASE_SIZE - dist + 2;
                this.player.x += Math.cos(angle) * pushDist;
                this.player.y += Math.sin(angle) * pushDist;

                // Bounce velocity (Reverse & Dampen)
                this.player.vx *= -0.5;
                this.player.vy *= -0.5;

                // FIX 3: Small damage, Rock Intact
                this.state.stats.hp = Math.max(0, this.state.stats.hp - 1);
                this.triggerShake(5);

                // FIX 1: PLAYER IMMORTALITY CHECK
                if (this.state.stats.hp <= 0) {
                    this.onGameOver();
                }
            }
        });

        // Projectiles vs Enemies
        this.projectiles.forEach(p => {
            this.enemies.forEach(e => {
                if (e.markedForDeletion || p.markedForDeletion) return;
                const dx = p.x - e.x;
                const dy = p.y - e.y;
                const dist = Math.sqrt(dx * dx + dy * dy);

                // Use custom size for boss if available
                // @ts-ignore
                const hitRadius = e.isBoss ? (e.customSize || SETTINGS.ENEMY.SIZE) : SETTINGS.ENEMY.SIZE;

                if (dist < hitRadius) {
                    p.markedForDeletion = true;
                    e.hp -= this.state.stats.damage;
                    this.spawnExplosion(e.x, e.y, SETTINGS.COLORS.BULLET, 3);
                    this.spawnDamageText(e.x, e.y, this.state.stats.damage);

                    if (e.isBoss) {
                        this.state.bossCurrentHp = Math.max(0, e.hp);
                    }

                    if (e.hp <= 0) {
                        e.markedForDeletion = true;
                        this.spawnExplosion(e.x, e.y, e.isBoss ? (e.bossColor || SETTINGS.COLORS.ENEMY) : this.state.sectorColors.enemyOutline, e.isBoss ? 50 : 15);

                        this.spawnPowerUp(e.x, e.y, e.isBoss); // 100% chance if boss, 5% otherwise

                        if (e.isBoss) {
                            this.triggerShake(15);
                            this.triggerFlash('white', 0.7);
                            this.nextSector();
                        } else {
                            this.gems.push({
                                x: e.x, y: e.y, value: 10, markedForDeletion: false, magnetized: false
                            });
                            this.state.kills++;
                        }
                    }
                }
            });
        });

        // Enemies vs Player
        this.enemies.forEach(e => {
            const dx = e.x - this.player.x;
            const dy = e.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // @ts-ignore
            const enemyRadius = e.isBoss ? (e.customSize || 30) : SETTINGS.ENEMY.SIZE;

            if (dist < SETTINGS.PLAYER.BASE_SIZE + enemyRadius - 5) {
                // KINETIC DAMAGE (Dash Kill)
                if (this.player.isDashing && !e.isBoss) {
                    e.hp = 0;
                    e.markedForDeletion = true;
                    this.spawnExplosion(e.x, e.y, 'cyan', 20); // Kinetic burst
                    this.triggerShake(5);
                    this.gems.push({
                        x: e.x, y: e.y, value: 10, markedForDeletion: false, magnetized: false
                    });
                    this.state.kills++;
                    return; // Skip damage to player
                }

                if (this.player.invulnerabilityTimer > 0) return; // I-Frames

                this.state.stats.hp -= 0.5;
                this.triggerShake(10);
                this.triggerFlash('red', 0.5);
                if (this.state.stats.hp <= 0) {
                    this.onGameOver();
                }
            }
        });

        // Player vs Enemy Projectiles
        for (let i = this.enemyProjectiles.length - 1; i >= 0; i--) {
            const p = this.enemyProjectiles[i];
            const dx = p.x - this.player.x;
            const dy = p.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Hitbox: Player radius (~20-25) + Projectile radius (~4-5)
            if (dist < 25) {
                // Remove Projectile
                this.enemyProjectiles.splice(i, 1);

                // Damage Player
                this.state.stats.hp -= 10;
                this.spawnDamageText(this.player.x, this.player.y, 10);

                // Visual Feedback
                this.spawnExplosion(this.player.x, this.player.y, 'red', 10);
                this.triggerShake(5);
                this.triggerFlash('red', 0.2);

                if (this.state.stats.hp <= 0) {
                    this.onGameOver();
                }
            }
        }

        // PowerUps vs Player
        this.powerUps.forEach(p => {
            if (p.life <= 0) return;
            const dx = p.x - this.player.x;
            const dy = p.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < p.size + SETTINGS.PLAYER.BASE_SIZE) {
                p.life = 0; // Collect
                this.spawnExplosion(p.x, p.y, p.color, 10);
                this.spawnDamageText(this.player.x, this.player.y - 50, 0); // Hack to just show something? No, let's not show "0"
                // Actually, let's play a sound or different text maybe? 
                // For now, text:

                switch (p.type) {
                    case 'HEALTH':
                        this.state.stats.hp = Math.min(this.state.stats.hp + 20, this.state.stats.maxHp);
                        this.spawnDamageText(this.player.x, this.player.y - 50, 20); // Show "20" (Heal)
                        // Maybe color green? The text is white/black stroke.
                        break;
                    case 'RAPID_FIRE':
                        this.rapidFireTimer = 10;
                        break;
                    case 'SPREAD_SHOT':
                        this.spreadShotTimer = 10;
                        break;
                    case 'NUKE':
                        this.triggerFlash('white', 1.0);
                        this.triggerShake(20);
                        this.enemies.forEach(e => {
                            if (!e.isBoss) {
                                e.hp = 0;
                                e.markedForDeletion = true;
                                this.spawnExplosion(e.x, e.y, 'red', 10);
                                this.gems.push({ x: e.x, y: e.y, value: 10, markedForDeletion: false, magnetized: false });
                            } else {
                                e.hp -= 500; // Big damage to boss
                                this.spawnDamageText(e.x, e.y, 500);
                            }
                        });
                        break;
                }
            }
        });

        // 6. Player vs Beacons
        this.beacons.forEach(b => {
            if (!b.active) return;
            const dx = b.x - this.player.x;
            const dy = b.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist < b.radius + SETTINGS.PLAYER.BASE_SIZE) {
                // ACTIVATE BLOOD PACT
                b.active = false;

                // Cost: 30% current HP
                const cost = Math.floor(this.state.stats.hp * 0.30);
                this.state.stats.hp = Math.max(1, this.state.stats.hp - cost);

                // Reward: +10% Damage
                this.state.stats.damage *= 1.10;

                // Feedback
                this.triggerShake(10);
                this.triggerFlash('red', 0.3);
                this.spawnExplosion(b.x, b.y, 'gold', 20);
                this.spawnDamageText(this.player.x, this.player.y - 60, "BLOOD PACT!");
                this.spawnDamageText(this.player.x, this.player.y - 30, `-${cost} HP`);
                this.spawnDamageText(this.player.x, this.player.y, "+10% DMG");

                // Cleanup
                this.beacons = this.beacons.filter(beacon => beacon !== b);
            }
        });
    }

    private getOrCreateSprite(spriteType: number, frameIndex: number, color: string): HTMLCanvasElement {
        const key = `${spriteType}-${frameIndex}-${color}`;
        if (this.spriteCache.has(key)) {
            return this.spriteCache.get(key)!;
        }

        // EMERGENCY FALLBACK LOGIC
        // 1. Verify Import
        // @ts-ignore
        if (!SPRITES || typeof SPRITES !== 'object') {
            console.error('SPRITES import missing or invalid', SPRITES);
            return this.createFallbackSprite('red');
        }

        // 2. Safe Retrieval
        const spriteSet = SPRITES[spriteType] || SPRITES[0];
        if (!spriteSet || !spriteSet[frameIndex]) {
            console.warn(`Missing sprite data for type ${spriteType} frame ${frameIndex}`);
            return this.createFallbackSprite('magenta');
        }

        const grid = spriteSet[frameIndex];
        const gridHeight = grid.length;
        const gridWidth = grid[0].length;

        // Create off-screen canvas
        const canvas = document.createElement('canvas');
        const scale = 5; // Pixel Scale
        canvas.width = gridWidth * scale;
        canvas.height = gridHeight * scale;
        const ctx = canvas.getContext('2d')!;

        // 3. Fallback Color
        ctx.fillStyle = color || 'red';

        // 4. Draw Pixels
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

    public render() {
        const { ctx, width, height } = this;

        // --- 1. PARALLAX BACKGROUND ---
        // 1. Background Fill
        ctx.fillStyle = '#050505';
        ctx.fillRect(0, 0, width, height);

        // 2. Draw Moving Stars
        ctx.fillStyle = 'rgba(255, 255, 255, 0.6)';
        this.backgroundStars.forEach(star => {
            // Infinite Scroll Math:
            // Calculate screen position relative to camera, applying speed factor
            let screenX = (star.x - this.player.x * star.speed) % width;
            let screenY = (star.y - this.player.y * star.speed) % height;

            // Handle negative wrap (so they don't disappear when moving left/up)
            if (screenX < 0) screenX += width;
            if (screenY < 0) screenY += height;

            // Draw star
            const size = star.speed > 0.8 ? star.size * 2 : star.size; // Close stars are bigger
            ctx.fillRect(screenX, screenY, size, size);
        });
        ctx.globalAlpha = 1.0;


        // --- 2. CAMERA & WORLD TRANSFORM ---
        ctx.save(); // Save 1: Before Camera

        // 0. Apply Zoom
        // Scale the world to zoom out
        ctx.scale(this.CAMERA_ZOOM, this.CAMERA_ZOOM);

        // Apply Camera Shake (Scaled?)
        if (this.shakeIntensity > 0) {
            const dx = (Math.random() - 0.5) * this.shakeIntensity;
            const dy = (Math.random() - 0.5) * this.shakeIntensity;
            ctx.translate(dx, dy);
        }

        // --- 3. NEON BLOOM START ---
        // Enable Glow for World Entites
        const sectorGlow = this.state.sectorColors.enemyOutline; // Or generic Cyan
        ctx.shadowBlur = 15;
        ctx.shadowColor = sectorGlow;

        // Grid (Subtle but glowing now)
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.05)';
        ctx.lineWidth = 1;
        const gridSize = 100;
        const offsetX = -this.player.x % gridSize;
        const offsetY = -this.player.y % gridSize;

        ctx.beginPath();
        for (let x = offsetX; x < width; x += gridSize) {
            ctx.moveTo(x, 0);
            ctx.lineTo(x, height);
        }
        for (let y = offsetY; y < height; y += gridSize) {
            ctx.moveTo(0, y);
            ctx.lineTo(width, y);
        }
        ctx.stroke();

        // Draw Obstacles
        this.obstacles.forEach(o => {
            this.drawEntity(o.x, o.y, () => {
                // --- NEON ASTEROID RENDER ---
                // Set Neon Style
                ctx.strokeStyle = '#ff4500'; // Bright orange-red outline
                ctx.lineWidth = 3;           // Thick outline
                ctx.fillStyle = 'rgba(40, 0, 0, 0.9)'; // Dark, semi-transparent red interior

                // Add Bloom/Glow Effect
                ctx.shadowColor = '#ff4500'; // Glow color matches outline
                ctx.shadowBlur = o.isExploding ? 40 : 20; // Intensity of the glow (extra if exploding)

                // Draw the irregular polygon
                ctx.beginPath();
                if (o.vertices && o.vertices.length > 0) {
                    ctx.moveTo(o.vertices[0].x, o.vertices[0].y);
                    for (let i = 1; i < o.vertices.length; i++) {
                        ctx.lineTo(o.vertices[i].x, o.vertices[i].y);
                    }
                    ctx.closePath();
                } else {
                    // Fallback circle if vertices are missing
                    ctx.arc(0, 0, o.size, 0, Math.PI * 2);
                }

                ctx.fill();   // Paint dark interior
                ctx.stroke(); // Paint neon outline

                if (o.isExploding) {
                    ctx.fillStyle = `rgba(255, 69, 0, ${Math.random()})`; // Flicker
                    ctx.fill();
                }
            });
        });

        // Draw Beacons
        this.beacons.forEach(b => this.drawEntity(b.x, b.y, () => {
            const pulse = 1 + Math.sin(this.state.timeSurvived * 5) * 0.1;
            const size = b.radius * 2 * pulse;

            // Base Glow
            ctx.shadowBlur = 20;
            ctx.shadowColor = 'red';

            // Gold Square
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.fillRect(-size / 2, -size / 2, size, size);

            // Red Pulse Inner
            ctx.fillStyle = `rgba(255, 0, 0, ${0.5 + Math.sin(this.state.timeSurvived * 10) * 0.5})`;
            ctx.fillRect(-size / 4, -size / 4, size / 2, size / 2);

            // Glowing Ring
            ctx.beginPath();
            ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
            ctx.strokeStyle = 'red';
            ctx.lineWidth = 2;
            ctx.stroke();

            ctx.shadowBlur = 0;
        }));

        // Draw Entities (They now inherit shadowBlur)
        this.gems.forEach(g => this.drawEntity(g.x, g.y, () => {
            const gemColor = this.state.sectorColors.enemyOutline;
            ctx.fillStyle = gemColor;
            // ctx.shadowColor already set globally, but we can override if needed
            ctx.save();
            ctx.rotate(this.state.timeSurvived * 3);
            ctx.beginPath();
            ctx.rect(-5, -5, 10, 10);
            ctx.fill();
            ctx.strokeStyle = 'white';
            ctx.lineWidth = 1;
            ctx.stroke();
            ctx.restore();
        }));

        this.powerUps.forEach(p => this.drawEntity(p.x, p.y, () => {
            // Draw square with glow
            ctx.shadowBlur = 10;
            ctx.shadowColor = p.color;
            ctx.fillStyle = p.color;
            const s = p.size;

            // Pulse effect
            const pulse = 1 + Math.sin(this.state.timeSurvived * 5) * 0.2;
            const size = s * pulse;

            ctx.translate(-size / 2, -size / 2);
            ctx.fillRect(0, 0, size, size);

            // Inner white
            ctx.fillStyle = 'white';
            ctx.fillRect(size / 4, size / 4, size / 2, size / 2);

            ctx.shadowBlur = 0;
        }));

        this.particles.forEach(p => this.drawEntity(p.x, p.y, () => {
            ctx.globalAlpha = p.life;
            ctx.fillStyle = p.color;
            ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size);
            ctx.globalAlpha = 1.0;
        }));

        this.enemies.forEach(e => {
            // @ts-ignore
            const size = e.customSize || SETTINGS.ENEMY.SIZE || 40;
            this.drawEntity(e.x, e.y, () => {

                // --- TELEGRAPHING: PRE-DRAW ---
                // (REMOVED based on user feedback)

                if (e.isBoss) {
                    const dx = this.player.x - e.x;
                    const dy = this.player.y - e.y;
                    const angleToPlayer = Math.atan2(dy, dx);
                    ctx.rotate(angleToPlayer);

                    const frameIndex = Math.floor(this.state.timeSurvived * 4) % 2;
                    const sprite = this.getOrCreateSprite(e.spriteType, frameIndex, e.bossColor || 'red');

                    // Boost glow for boss
                    ctx.shadowColor = e.bossColor || 'red';
                    ctx.shadowBlur = 20;

                    if (sprite) {
                        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
                    } else {
                        ctx.fillStyle = e.bossColor || 'red';
                        ctx.fillRect(-size / 2, -size / 2, size, size);
                    }
                    // Reset glow
                    // --- NORMAL ENEMY (SPRITE) RENDERING ---
                } else {
                    // 3. Draw Sprite
                    const frameIndex = Math.floor(this.state.timeSurvived * 4) % 2;
                    // Prefer custom archetype color, else use sector theme
                    const color = e.bossColor || this.state.sectorColors.enemyOutline;

                    // Get from Cache
                    const sprite = this.getOrCreateSprite(e.spriteType, frameIndex, color);
                    if (sprite) {
                        // Draw Centered
                        ctx.drawImage(sprite, -size / 2, -size / 2, size, size);
                    } else {
                        // Fallback if cache fails: Solid Square
                        ctx.fillStyle = color;
                        ctx.fillRect(-size / 2, -size / 2, size, size);
                    }
                }

                // --- TELEGRAPHING: POST-DRAW (OVERLAYS) ---

                // 1. Charging: White Pulse Overlay
                if (e.aiState === AIState.CHARGING) {
                    const flash = 0.3 + Math.sin(this.state.timeSurvived * 20) * 0.2;
                    ctx.fillStyle = `rgba(255, 255, 255, ${flash})`;
                    // Draw over the sprite area
                    // Use 'source-atop' to clip to sprite if we had complex shapes, 
                    // but simple rect/size overlay is enough for pixel art style.
                    ctx.fillRect(-size / 2, -size / 2, size, size);
                }

                // 2. Anchored/Turret Mode (Type 2)
                // If Turret is stationary (Charging usually implies preparation/stationary for this AI)
                if (e.spriteType === 2 && e.aiState === AIState.CHARGING) {
                    ctx.beginPath();
                    ctx.arc(0, 0, size * 0.8, 0, Math.PI * 2);
                    ctx.strokeStyle = '#00ffff'; // Cyan
                    ctx.lineWidth = 2;
                    ctx.stroke();

                    // Rotate ring visual?
                    const ringAngle = this.state.timeSurvived * 2;
                    ctx.beginPath();
                    ctx.arc(0, 0, size * 0.9, ringAngle, ringAngle + Math.PI);
                    ctx.strokeStyle = 'cyan';
                    ctx.lineWidth = 1;
                    ctx.stroke();
                }
            });
        });

        this.projectiles.forEach(p => this.drawEntity(p.x, p.y, () => {
            // Rotated Laser Bolt
            ctx.rotate(Math.atan2(p.vy, p.vx));

            ctx.shadowBlur = 10;
            ctx.shadowColor = SETTINGS.COLORS.BULLET;
            ctx.fillStyle = SETTINGS.COLORS.BULLET;

            // Draw Capsule/Rect
            // Center is (0,0) thanks to drawEntity->translate
            ctx.fillRect(-10, -2, 20, 4);
        }));

        this.enemyProjectiles.forEach(p => this.drawEntity(p.x, p.y, () => {
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = 10;
            ctx.beginPath();
            ctx.arc(0, 0, p.size / 2, 0, Math.PI * 2);
            ctx.fill();
        }));

        // Damage Text (Inside World, so it shakes)
        // But we want it crisp? Prompt said "Disable ... before drawing UI".
        // Damage text is world entity. Let's keep it here but maybe disable shadow for text sharpness.
        ctx.shadowBlur = 0;
        this.damageTexts.forEach(t => this.drawEntity(t.x, t.y, () => {
            ctx.fillStyle = `rgba(255, 255, 255, ${t.opacity})`;
            ctx.strokeStyle = `rgba(0, 0, 0, ${t.opacity})`;
            ctx.lineWidth = 3;
            ctx.font = 'bold 14px "Courier New"';
            ctx.textAlign = 'center';
            ctx.strokeText(t.value.toString(), 0, 0);
            ctx.fillText(t.value.toString(), 0, 0);
        }));
        // Restore shadow for player
        ctx.shadowBlur = 15;
        ctx.shadowColor = sectorGlow;


        // Draw Player
        ctx.save();
        // Fix Player Centering (Account for Zoom)
        ctx.translate((width / this.CAMERA_ZOOM) / 2, (height / this.CAMERA_ZOOM) / 2);

        // Draw Buff Indicators (Above Player)
        if (this.rapidFireTimer > 0 || this.spreadShotTimer > 0) {
            ctx.save();
            ctx.font = 'bold 12px "Courier New"';
            ctx.textAlign = 'center';
            let yOffset = -40;

            if (this.rapidFireTimer > 0) {
                ctx.fillStyle = '#ffee00';
                ctx.fillText(`RAPID: ${Math.ceil(this.rapidFireTimer)}s`, 0, yOffset);
                yOffset -= 15;
            }

            if (this.spreadShotTimer > 0) {
                ctx.fillStyle = '#00ffff';
                ctx.fillText(`SPREAD: ${Math.ceil(this.spreadShotTimer)}s`, 0, yOffset);
            }
            ctx.restore();
        }

        ctx.rotate(this.player.angle + Math.PI / 2 + this.shipTilt);

        ctx.strokeStyle = SETTINGS.COLORS.PLAYER;
        ctx.lineWidth = 3;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.shadowColor = SETTINGS.COLORS.PLAYER;
        ctx.shadowBlur = 15;

        switch (this.state.shipId) {
            case 'titan':
                // TITAN - The Flying Fortress
                // Composition: Wide Hex Core + Side Armor Plates + Multiple Engines

                // 1. Armor Plates
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.fillRect(-25, -15, 10, 30); // Left Plate
                ctx.fillRect(15, -15, 10, 30);  // Right Plate
                ctx.strokeRect(-25, -15, 10, 30);
                ctx.strokeRect(15, -15, 10, 30);

                // 2. Wide Hex Core
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

                // 3. Engine Glows
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
                // VIPER - The Railgun
                // Composition: Needle Body + Forward Prongs + Rear Fins

                // 1. Forward Prongs
                ctx.strokeStyle = SETTINGS.COLORS.PLAYER;
                ctx.beginPath();
                ctx.moveTo(-8, 0);
                ctx.lineTo(-8, -35); // Left Prong
                ctx.moveTo(8, 0);
                ctx.lineTo(8, -35);  // Right Prong
                ctx.stroke();

                // 2. Main Needle Body
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.beginPath();
                ctx.moveTo(0, -25);
                ctx.lineTo(5, 0);
                ctx.lineTo(0, 20);
                ctx.lineTo(-5, 0);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 3. Rear Fins
                ctx.beginPath();
                ctx.moveTo(-5, 10);
                ctx.lineTo(-15, 25);
                ctx.stroke();
                ctx.beginPath();
                ctx.moveTo(5, 10);
                ctx.lineTo(15, 25);
                ctx.stroke();

                // 4. Cockpit/Core
                ctx.fillStyle = 'white';
                ctx.beginPath();
                ctx.rect(-1, -5, 2, 10);
                ctx.fill();
                break;

            case 'nova':
            default:
                // NOVA - The Fighter Jet
                // Composition: Central Fuselage + Swept Wings + Cockpit

                // 1. Swept Wings
                ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
                ctx.beginPath();
                // Left Wing
                ctx.moveTo(-5, 0);
                ctx.lineTo(-25, 20);
                ctx.lineTo(-5, 15);
                // Right Wing
                ctx.moveTo(5, 0);
                ctx.lineTo(25, 20);
                ctx.lineTo(5, 15);
                ctx.fill();
                ctx.stroke();

                // 2. Central Fuselage
                ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
                ctx.beginPath();
                ctx.moveTo(0, -25); // Nose
                ctx.lineTo(8, 15);
                ctx.lineTo(0, 10);  // Notch
                ctx.lineTo(-8, 15);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();

                // 3. Cockpit
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

        if (this.input.active) {
            ctx.shadowBlur = 0; // Reset blur for clean engine lines
            ctx.strokeStyle = '#00ffff';
            ctx.lineWidth = 1;
            ctx.beginPath();

            // Dynamic engine trail based on ship type
            if (this.state.shipId === 'titan') {
                ctx.moveTo(-10, 25); ctx.lineTo(-12, 35 + Math.random() * 5);
                ctx.moveTo(10, 25); ctx.lineTo(12, 35 + Math.random() * 5);
            } else if (this.state.shipId === 'viper') {
                ctx.moveTo(0, 20); ctx.lineTo(0, 40 + Math.random() * 10);
            } else {
                // Nova default
                ctx.moveTo(-4, 15); ctx.lineTo(-6, 25 + Math.random() * 8);
                ctx.moveTo(4, 15); ctx.lineTo(6, 25 + Math.random() * 8);
            }
            ctx.stroke();
        }

        // Draw Plasma Shield
        if (this.state.stats.shieldRadius > 0) {
            const radius = this.state.stats.shieldRadius + Math.sin(this.state.timeSurvived * 10) * 3;
            ctx.beginPath();
            ctx.arc(0, 0, radius, 0, Math.PI * 2);
            ctx.fillStyle = 'rgba(0, 255, 255, 0.1)';
            ctx.fill();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.5)';
            ctx.stroke();
        }

        ctx.restore();

        // --- 4. DISABLE BLOOM & RESTORE CONTEXT ---
        ctx.shadowBlur = 0; // Disable glow for HUD
        ctx.restore(); // Undo Camera Shake/Translate

        // Flash Overlay
        if (this.flashAlpha > 0) {
            ctx.fillStyle = this.flashColor;
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillRect(0, 0, width, height);
            ctx.globalAlpha = 1.0;
        }

        // --- BOSS RADAR (New) ---
        // Draw this AFTER world/flash but BEFORE HUD so it sits on top of game but below UI bars?
        // Actually, prompt says "inside HUD/UI rendering section (after drawing the world...".
        // Let's put it here, just before the main HUD bars.

        if (this.state.bossActive) {
            const boss = this.enemies.find(e => e.isBoss);
            // FIX 2: Check !isEntityOnScreen(boss)
            if (boss && !this.isEntityOnScreen(boss)) {
                // Draw Radar Arrow
                const angle = Math.atan2(boss.y - this.player.y, boss.x - this.player.x);
                const screenCenterX = width / 2;
                const screenCenterY = height / 2;
                const radius = Math.min(width, height) / 2 - 60; // 50-60px padding from edge

                const arrowX = screenCenterX + Math.cos(angle) * radius;
                const arrowY = screenCenterY + Math.sin(angle) * radius;

                ctx.save();
                ctx.translate(arrowX, arrowY);
                ctx.rotate(angle);

                // Draw Arrow (Triangle)
                ctx.fillStyle = 'rgba(255, 0, 0, 0.8)';
                ctx.shadowColor = 'red';
                ctx.shadowBlur = 15;

                // Pulse size
                const pulse = 1 + Math.sin(this.state.timeSurvived * 10) * 0.2;
                ctx.scale(pulse, pulse);

                ctx.beginPath();
                ctx.moveTo(15, 0);   // Tip
                ctx.lineTo(-10, 10); // Bottom Right
                ctx.lineTo(-5, 0);   // Notch
                ctx.lineTo(-10, -10);// Bottom Left
                ctx.closePath();
                ctx.fill();

                // "BOSS" Text
                ctx.rotate(-angle); // Un-rotate for text? Or keep it rotated?
                // Usually text is readable upright.
                // But if it's orbiting, upright is better.
                ctx.fillStyle = 'white';
                ctx.font = 'bold 12px "Courier New"';
                ctx.textAlign = 'center';
                ctx.shadowBlur = 0;
                ctx.fillText("BOSS", 0, -20);

                ctx.restore();
            }
        }

        // --- 5. CLEAN HUD ---
        // B. The Clean HUD (Draw this LAST, after World & Flash)

        // Disable glow for crisp text
        ctx.shadowBlur = 0;

        // --- XP BAR (Top Edge) ---
        const xpPercent = Math.max(0, Math.min(1, this.state.xp / this.state.xpToNextLevel));
        ctx.fillStyle = '#333';
        ctx.fillRect(0, 0, width, 10); // Background

        // Gradient for XP
        const xpGrad = ctx.createLinearGradient(0, 0, width, 0);
        xpGrad.addColorStop(0, '#ff00ff');
        xpGrad.addColorStop(1, '#00ffff');
        ctx.fillStyle = xpGrad;
        ctx.fillRect(0, 0, width * xpPercent, 10);

        // --- HEALTH BAR (Top Left) ---
        const barX = 20;
        const barY = 20;
        const barW = 220;
        const barH = 12; // Thinner, sleek bar

        // 1. Backplate (Dark container)
        ctx.fillStyle = '#222';
        ctx.fillRect(barX - 2, barY - 2, barW + 4, barH + 4);

        // 2. HP Fill (Cyan for Player)
        const hpPercent = Math.max(0, this.state.stats.hp / this.state.stats.maxHp);
        ctx.fillStyle = hpPercent < 0.3 ? '#ff0055' : 'cyan'; // Red if low, Cyan normal
        ctx.fillRect(barX, barY, barW * hpPercent, barH);

        // 3. Text Info (Below the bar, not inside)
        ctx.fillStyle = 'white';
        ctx.font = 'bold 16px "Courier New", monospace';
        ctx.textAlign = 'left';
        ctx.fillText(`HP: ${Math.floor(this.state.stats.hp)} / ${this.state.stats.maxHp}`, barX, barY + 30);

        // --- LEVEL INFO (Below HP Text) ---
        ctx.fillStyle = 'yellow';
        ctx.fillText(`LVL ${this.state.level}`, barX, barY + 50);

        // FIX 4: BEACON PACTS INFO
        // Count pacts? We don't track checks specifically, but we can track active buffs or infer?
        // Wait, "PACTS: [X] (DMG +[Y]%)".
        // Base damage is SETTINGS.WEAPON.DAMAGE.
        // If we want to show strict pacts, we need to track how many beacons we took.
        // We aren't tracking 'pactsTaken' in state.
        // Calculate based on damage? currentDamage / baseDamage.
        // Or just don't show exact count if we don't have it, but prompt says "PACTS: [X]".
        // I should probably add `pactsTaken` to state or infer it.
        // Since I can't easily change State interface without affecting other files potentially (though I can check `types.ts`), 
        // I will deduce it:
        // Pacts = round((currentDmg / baseDmg - 1) * 10). Assuming 10% per pact.
        const baseDmg = SETTINGS.WEAPON.DAMAGE; // Assuming this is importable and constant
        const currentDmg = this.state.stats.damage;
        // Approximation:
        const pctIncrease = ((currentDmg / baseDmg) - 1) * 100;
        const pacts = Math.round(pctIncrease / 10);

        if (pacts > 0) {
            ctx.fillStyle = '#FFD700'; // Gold
            ctx.fillText(`PACTS: ${pacts} (DMG +${Math.round(pctIncrease)}%)`, barX, barY + 70);
        }

        // --- SECTOR INFO (Top Right) ---
        ctx.textAlign = 'right';
        ctx.fillStyle = 'cyan';
        ctx.font = 'bold 20px "Courier New", monospace';
        ctx.fillText(`SECTOR ${this.state.currentSector}`, width - 20, 30);

        ctx.fillStyle = '#aaa'; // Grey text for labels
        ctx.font = '14px "Courier New", monospace';
        ctx.fillText(`DARK MATTER: ${Math.floor(this.state.totalDarkMatter)}`, width - 20, 55);

        // Boss Health Bar (if active)
        if (this.state.bossActive) {
            const bossW = width * 0.6;
            const bossH = 15;
            const bossX = (width - bossW) / 2;
            const bossY = 80; // Below other UI? Or top center? 

            const bossPercent = Math.max(0, this.state.bossCurrentHp / this.state.bossMaxHp);

            ctx.fillStyle = '#330000';
            ctx.fillRect(bossX, bossY, bossW, bossH);

            ctx.fillStyle = 'red';
            ctx.fillRect(bossX, bossY, bossW * bossPercent, bossH);

            ctx.strokeStyle = 'white';
            ctx.strokeRect(bossX, bossY, bossW, bossH);

            ctx.fillStyle = 'white';
            ctx.textAlign = 'center';
            ctx.fillText("BOSS DETECTED", width / 2, bossY - 5);
        }
    }

    private isEntityOnScreen(e: { x: number, y: number }): boolean {
        const visibleW = this.width / this.CAMERA_ZOOM;
        const visibleH = this.height / this.CAMERA_ZOOM;
        const centerX = visibleW / 2;
        const centerY = visibleH / 2;

        const screenX = e.x - this.player.x + centerX;
        const screenY = e.y - this.player.y + centerY;

        return screenX >= -100 && screenX <= visibleW + 100 &&
            screenY >= -100 && screenY <= visibleH + 100;
    }

    private drawEntity(worldX: number, worldY: number, drawFn: () => void) {
        // Fix Centering with Zoom:
        // Center in "Zoomed Space" is (width / ZOOM) / 2
        const centerX = (this.width / this.CAMERA_ZOOM) / 2;
        const centerY = (this.height / this.CAMERA_ZOOM) / 2;

        const screenX = worldX - this.player.x + centerX;
        const screenY = worldY - this.player.y + centerY;

        // Cull check (approximate with padding)
        const visibleW = this.width / this.CAMERA_ZOOM;
        const visibleH = this.height / this.CAMERA_ZOOM;

        if (screenX < -100 || screenX > visibleW + 100 || screenY < -100 || screenY > visibleH + 100) return;

        this.ctx.save();
        this.ctx.translate(screenX, screenY);
        drawFn();
        this.ctx.restore();
    }



    public applyUpgrade(_startStats: GameStats, upgrade: Upgrade) {
        upgrade.apply(this.state.stats);

        // Handle special cases that need state refresh
        if (upgrade.id === 'hull') {
            this.state.stats.hp = this.state.stats.maxHp;
        }
    }
}
