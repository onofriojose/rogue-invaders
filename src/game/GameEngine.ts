import { SETTINGS } from '../constants';
import { GameState, Player, Enemy, Projectile, Gem, Particle, GameStats, Upgrade, DamageText, EnemyProjectile, AIState, Beacon, Obstacle } from '../types';
import { InputManager } from './InputManager';
import { BossSystem, BossSystemContext } from './systems/BossSystem';
import { CombatSystem, CombatSystemContext, EnemyDamageOptions, EnemyDefeatOptions } from './systems/CombatSystem';
import { CollisionSystem, CollisionSystemContext } from './systems/CollisionSystem';
import { ProjectileSystem, ProjectileSystemContext } from './systems/ProjectileSystem';
import { SpawnSystem, SpawnSystemContext } from './systems/SpawnSystem';
import { EnvironmentSystem, EnvironmentSystemContext } from './systems/EnvironmentSystem';
import { WorldRenderer, WorldRendererContext } from './render/WorldRenderer';
import { HudRenderer, HudRendererContext } from './render/HudRenderer';



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
    private readonly combatSystem: CombatSystem = new CombatSystem();
    private readonly bossSystem: BossSystem = new BossSystem();
    private readonly collisionSystem: CollisionSystem = new CollisionSystem();
    private readonly projectileSystem: ProjectileSystem = new ProjectileSystem();
    private readonly spawnSystem: SpawnSystem = new SpawnSystem();
    private readonly environmentSystem: EnvironmentSystem = new EnvironmentSystem();
    private readonly worldRenderer: WorldRenderer = new WorldRenderer();
    private readonly hudRenderer: HudRenderer = new HudRenderer();

    // Buff Timers
    private rapidFireTimer: number = 0;
    private spreadShotTimer: number = 0;

    private onUIUpdate: (state: GameState) => void;
    private onLevelUp: () => void;
    private onGameOver: () => void;

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
            shipId: shipId,
            voidMass: 0
        };

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
        this.spawnSystem.updateSectorProgress(this.getSpawnContext(), dt);
    }

    private spawnBoss() {
        this.bossSystem.spawnBoss(this.getBossContext());
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
        this.worldRenderer.clearSpriteCache();

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

    private getCombatContext(): CombatSystemContext {
        return {
            state: this.state,
            player: this.player,
            enemies: this.enemies,
            projectiles: this.projectiles,
            enemyProjectiles: this.enemyProjectiles,
            gems: this.gems,
            beacons: this.beacons,
            rapidFireTimer: this.rapidFireTimer,
            spreadShotTimer: this.spreadShotTimer,
            spawnExplosion: (x, y, color, count) => this.spawnExplosion(x, y, color, count),
            spawnDamageText: (x, y, damage) => this.spawnDamageText(x, y, damage),
            spawnPowerUp: (x, y, force) => this.spawnPowerUp(x, y, force),
            triggerShake: (amount) => this.triggerShake(amount),
            triggerFlash: (color, intensity) => this.triggerFlash(color, intensity),
            nextSector: () => this.nextSector()
        };
    }

    private getBossContext(): BossSystemContext {
        return {
            state: this.state,
            player: this.player,
            enemies: this.enemies,
            enemyProjectiles: this.enemyProjectiles,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM,
            spawnExplosion: (x, y, color, count) => this.spawnExplosion(x, y, color, count)
        };
    }

    private getCollisionContext(): CollisionSystemContext {
        return {
            state: this.state,
            player: this.player,
            enemies: this.enemies,
            projectiles: this.projectiles,
            enemyProjectiles: this.enemyProjectiles,
            obstacles: this.obstacles,
            spawnExplosion: (x, y, color, count) => this.spawnExplosion(x, y, color, count),
            spawnDamageText: (x, y, damage) => this.spawnDamageText(x, y, damage),
            triggerShake: (amount) => this.triggerShake(amount),
            triggerFlash: (color, intensity) => this.triggerFlash(color, intensity),
            onGameOver: () => this.onGameOver(),
            defeatEnemy: (enemy, options) => this.defeatEnemy(enemy, options),
            applyDirectDamageToEnemy: (enemy, damage, options) => this.applyDirectDamageToEnemy(enemy, damage, options)
        };
    }

    private getProjectileContext(): ProjectileSystemContext {
        return {
            player: this.player,
            projectiles: this.projectiles,
            enemyProjectiles: this.enemyProjectiles,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM
        };
    }

    private getSpawnContext(): SpawnSystemContext {
        return {
            state: this.state,
            player: this.player,
            enemies: this.enemies,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM,
            spawnBoss: () => this.spawnBoss()
        };
    }

    private getEnvironmentContext(): EnvironmentSystemContext {
        return {
            player: this.player,
            enemies: this.enemies,
            gems: this.gems,
            particles: this.particles,
            obstacles: this.obstacles,
            beacons: this.beacons,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM,
            spawnExplosion: (x, y, color, count) => this.spawnExplosion(x, y, color, count),
            spawnDamageText: (x, y, damage) => this.spawnDamageText(x, y, damage),
            triggerFlash: (color, intensity) => this.triggerFlash(color, intensity),
            applyDirectDamageToEnemy: (enemy, damage, options) => this.applyDirectDamageToEnemy(enemy, damage, options)
        };
    }

    private getWorldRenderContext(): WorldRendererContext {
        return {
            ctx: this.ctx,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM,
            state: this.state,
            player: this.player,
            inputActive: this.input.active,
            shipTilt: this.shipTilt,
            rapidFireTimer: this.rapidFireTimer,
            spreadShotTimer: this.spreadShotTimer,
            shakeIntensity: this.shakeIntensity,
            backgroundStars: this.backgroundStars,
            obstacles: this.obstacles,
            beacons: this.beacons,
            gems: this.gems,
            powerUps: this.powerUps,
            particles: this.particles,
            enemies: this.enemies,
            projectiles: this.projectiles,
            enemyProjectiles: this.enemyProjectiles,
            damageTexts: this.damageTexts
        };
    }

    private getHudRenderContext(): HudRendererContext {
        return {
            ctx: this.ctx,
            width: this.width,
            height: this.height,
            cameraZoom: this.CAMERA_ZOOM,
            state: this.state,
            player: this.player,
            boss: this.enemies.find(enemy => enemy.isBoss),
            flashAlpha: this.flashAlpha,
            flashColor: this.flashColor
        };
    }

    private defeatEnemy(enemy: Enemy, options: EnemyDefeatOptions = {}) {
        this.combatSystem.defeatEnemy(this.getCombatContext(), enemy, options);
    }

    private applyDirectDamageToEnemy(enemy: Enemy, damage: number, options: EnemyDamageOptions = {}) {
        this.combatSystem.applyDirectDamageToEnemy(this.getCombatContext(), enemy, damage, options);
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
        this.spawnSystem.handleSpawning(this.getSpawnContext(), dt);
    }

    private handleCombat(time: number) {
        this.combatSystem.handleCombat(this.getCombatContext(), time);
    }

    private handleShieldCombat(dt: number) {
        this.combatSystem.handleShieldCombat(this.getCombatContext(), dt);
    }

    private updateEntities(dt: number) {
        const updatedProjectiles = this.projectileSystem.updateProjectiles(this.getProjectileContext(), dt);
        this.projectiles = updatedProjectiles.projectiles;
        this.enemyProjectiles = updatedProjectiles.enemyProjectiles;

        this.enemies.forEach(e => {
            if (e.isBoss) {
                this.updateBossAI(e, dt);
            } else {
                this.updateEnemyAI(e, dt);
            }
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

        // Filter
        this.enemies = this.enemies.filter(e => !e.markedForDeletion);
        this.gems = this.gems.filter(g => !g.markedForDeletion);
        this.particles = this.particles.filter(p => !p.markedForDeletion);
        this.damageTexts = this.damageTexts.filter(t => !t.markedForDeletion);
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


    private updateBossAI(boss: Enemy, dt: number) {
        this.bossSystem.updateBossAI(this.getBossContext(), boss, dt);
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
        this.combatSystem.handleEnemyShooting(this.getCombatContext(), dt);
    }

    private handleEnvironment(dt: number) {
        const environmentUpdate = this.environmentSystem.updateEnvironment(this.getEnvironmentContext(), dt);
        this.obstacles = environmentUpdate.obstacles;
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
        this.collisionSystem.handleCoreCollisions(this.getCollisionContext());
        this.checkPowerUpCollisions();
        this.checkBeaconCollisions();
    }

    private checkPowerUpCollisions() {
        this.powerUps.forEach(powerUp => {
            if (powerUp.life <= 0) return;

            const dx = powerUp.x - this.player.x;
            const dy = powerUp.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= powerUp.size + SETTINGS.PLAYER.BASE_SIZE) return;

            powerUp.life = 0;
            this.spawnExplosion(powerUp.x, powerUp.y, powerUp.color, 10);
            this.spawnDamageText(this.player.x, this.player.y - 50, 0);

            switch (powerUp.type) {
                case 'HEALTH':
                    this.state.stats.hp = Math.min(this.state.stats.hp + 20, this.state.stats.maxHp);
                    this.spawnDamageText(this.player.x, this.player.y - 50, 20);
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
                    this.enemies.forEach(enemy => {
                        if (!enemy.isBoss) {
                            this.defeatEnemy(enemy, {
                                addGem: true,
                                explosionColor: 'red',
                                explosionCount: 10
                            });
                        } else {
                            this.applyDirectDamageToEnemy(enemy, 500, {
                                damageText: 500,
                                spawnPowerUpOnKill: true
                            });
                        }
                    });
                    break;
            }
        });
    }

    private checkBeaconCollisions() {
        this.beacons.forEach(beacon => {
            if (!beacon.active) return;

            const dx = beacon.x - this.player.x;
            const dy = beacon.y - this.player.y;
            const dist = Math.sqrt(dx * dx + dy * dy);

            if (dist >= beacon.radius + SETTINGS.PLAYER.BASE_SIZE) return;

            beacon.active = false;

            if (this.gems.length > 0) {
                this.gems.forEach(gem => {
                    gem.magnetized = true;

                    const gemDx = this.player.x - gem.x;
                    const gemDy = this.player.y - gem.y;
                    const gemDist = Math.sqrt(gemDx * gemDx + gemDy * gemDy);
                    if (gemDist > 0) {
                        gem.x += (gemDx / gemDist) * 2;
                        gem.y += (gemDy / gemDist) * 2;
                    }
                });
            }

            const cost = Math.floor(this.state.stats.hp * 0.30);
            this.state.stats.hp = Math.max(1, this.state.stats.hp - cost);
            this.state.stats.damage *= 1.10;
            this.state.voidMass++;

            this.triggerShake(10);
            this.triggerFlash('purple', 0.3);
            this.spawnExplosion(beacon.x, beacon.y, 'purple', 20);
            this.spawnDamageText(this.player.x, this.player.y - 60, "SINGULARITY ABSORBED");
            this.spawnDamageText(this.player.x, this.player.y - 30, `-${cost} INTEGRITY`);
            this.spawnDamageText(this.player.x, this.player.y, "VOID MASS +1");

            this.beacons = this.beacons.filter(activeBeacon => activeBeacon !== beacon);
        });
    }

    public render() {
        this.worldRenderer.render(this.getWorldRenderContext());
        this.hudRenderer.render(this.getHudRenderContext());
    }


    public applyUpgrade(_startStats: GameStats, upgrade: Upgrade) {
        upgrade.apply(this.state.stats);

        // Handle special cases that need state refresh
        if (upgrade.id === 'hull') {
            this.state.stats.hp = this.state.stats.maxHp;
        }
    }
}

