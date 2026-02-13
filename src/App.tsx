import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { InputManager } from './game/InputManager';
import { Upgrade, GameStats } from './types';
import { Joystick } from './components/Joystick';
import { DashButton } from './components/DashButton';
import { UpgradeModal } from './components/UpgradeModal';
import { SHIP_DEFINITIONS, ShipArchetype } from './data/ships';
import { SaveManager, SaveData } from './managers/SaveManager';

// Available Upgrades (Moved inside or kept global - Global is fine for now)
const UPGRADES_LIST: Upgrade[] = [
    {
        id: 'hull',
        title: 'Reinforced Titanium Hull',
        desc: 'Increases Max HP by 20 and heals full health.',
        icon: '🛡️',
        rarity: 'common',
        apply: (stats: GameStats) => {
            stats.maxHp += 20;
        }
    },
    {
        id: 'multi_core',
        title: 'Quantum Multi-Core',
        desc: 'Adds +1 projectile to every shot.',
        icon: '💠',
        rarity: 'legendary',
        apply: (stats: GameStats) => {
            stats.projectileCount += 1;
        }
    },
    {
        id: 'thrusters',
        title: 'Ion Thrusters',
        desc: 'Increases movement speed by 15%.',
        icon: '🚀',
        rarity: 'rare',
        apply: (stats: GameStats) => {
            stats.speed *= 1.15;
        }
    },
    {
        id: 'plasma_field',
        title: 'Plasma Field',
        desc: 'Generates a damaging energy field. Radius increases with upgrades.',
        icon: '⚛️',
        rarity: 'epic',
        apply: (stats: GameStats) => {
            if (stats.shieldRadius === 0) {
                stats.shieldRadius = 80;
                stats.shieldDamage = 30; // DPS
            } else {
                stats.shieldRadius *= 1.2;
                stats.shieldDamage *= 1.1;
                stats.shieldDamage = Math.floor(stats.shieldDamage);
            }
        }
    },
    {
        id: 'overclock',
        title: 'Plasma Overclock',
        desc: 'Reduces delay between shots by 10%.',
        icon: '⚡',
        rarity: 'epic',
        apply: (stats: GameStats) => {
            stats.fireRate *= 0.9;
        }
    }
];

type AppState = 'MENU' | 'HANGAR' | 'GAME';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const inputRef = useRef<InputManager>(new InputManager());
    const requestRef = useRef<number>();

    // GLOBAL APP STATE
    const [appState, setAppState] = useState<AppState>('MENU');
    const [saveData, setSaveData] = useState<SaveData | null>(null);
    const [selectedShip, setSelectedShip] = useState<ShipArchetype>(SHIP_DEFINITIONS[0]);

    // GAME UI States
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);

    // GAME OVER SUMMARY
    const [runSummary, setRunSummary] = useState<{ survived: number, gold: number } | null>(null);

    // Joystick Visual State
    const [joystickVisible, setJoystickVisible] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    // INITIAL LOAD
    useEffect(() => {
        const data = SaveManager.loadData();
        setSaveData(data);
        const ship = SHIP_DEFINITIONS.find(s => s.id === data.selectedShipId) || SHIP_DEFINITIONS[0];
        setSelectedShip(ship);
    }, []);

    const handleResize = () => {
        if (canvasRef.current && engineRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            engineRef.current.resize(window.innerWidth, window.innerHeight);
        }
    };

    // --- GAME LOGIC ---

    const startGame = () => {
        setAppState('GAME');
        setRunSummary(null);
        // Canvas setup happens in useEffect dependency on appState or separately?
        // Let's us a specific effect for starting the game loop
    };

    const handleLevelUp = () => {
        if (!engineRef.current) return;
        const state = engineRef.current.state;
        state.level++;
        state.xp = state.xp - state.xpToNextLevel;
        state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.2);
        if (state.xp < 0) state.xp = 0;
        engineRef.current.state.paused = true;

        const shuffled = [...UPGRADES_LIST].sort(() => 0.5 - Math.random());
        setUpgradeOptions(shuffled.slice(0, 3));
        setShowUpgrade(true);
    };

    const handleGameOver = () => {
        if (!engineRef.current) return;
        engineRef.current.state.gameOver = true;

        // Calculate Currency
        const earned = Math.floor(engineRef.current.state.totalDarkMatter);
        const time = engineRef.current.state.timeSurvived;

        // Save
        const total = SaveManager.addCurrency(earned);
        setSaveData(prev => prev ? ({ ...prev, totalDarkMatter: total }) : null);

        setRunSummary({
            survived: time,
            gold: earned
        });

        // Stop Loop
        if (requestRef.current) cancelAnimationFrame(requestRef.current);
        requestRef.current = undefined;
    };

    const loop = (time: number) => {
        if (engineRef.current && appState === 'GAME') {
            const dt = (time - engineRef.current.state.lastTime) / 1000;
            engineRef.current.state.lastTime = time;
            if (dt < 0.1) {
                engineRef.current.update(dt);
            }
            engineRef.current.render();
            requestRef.current = requestAnimationFrame(loop);
        }
    };

    // START/STOP ENGINE EFFECT
    useEffect(() => {
        if (appState !== 'GAME') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        // Reset Input Visuals
        inputRef.current.setVisualCallbacks(
            (x, y) => { setJoystickVisible(true); setJoystickPos({ x, y }); },
            () => { setJoystickVisible(false); },
            (x, y) => { setKnobPos({ x, y }); }
        );
        inputRef.current.attach(canvas);

        const ctx = canvas.getContext('2d')!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

        // Initialize Engine with Selected Ship Stats
        // IMPORTANT: We need to merge stats properly
        const initialStats: Partial<GameStats> = {
            hp: selectedShip.baseStats.hp,
            maxHp: selectedShip.baseStats.hp,
            speed: selectedShip.baseStats.speed,
            damage: selectedShip.baseStats.damage,
            magnetRadius: selectedShip.baseStats.magnet || 100
        };

        engineRef.current = new GameEngine(
            ctx,
            inputRef.current,
            () => { }, // No UI updates needed on React side anymore
            handleLevelUp,
            handleGameOver,
            initialStats,
            selectedShip.id
        );
        engineRef.current.state.lastTime = performance.now();

        window.addEventListener('resize', handleResize);
        requestRef.current = requestAnimationFrame(loop);

        return () => {
            window.removeEventListener('resize', handleResize);
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
            if (canvas) inputRef.current.detach(canvas);
        };
    }, [appState]); // Re-run when entering GAME state

    const onSelectUpgrade = (u: Upgrade) => {
        if (engineRef.current) {
            engineRef.current.applyUpgrade(engineRef.current.state.stats, u);
            engineRef.current.state.paused = false;
            engineRef.current.state.lastTime = performance.now();
            setShowUpgrade(false);
        }
    };

    // --- HANGAR LOGIC ---
    const buyShip = (ship: ShipArchetype) => {
        if (!saveData) return;
        const success = SaveManager.purchaseShip(ship.id, ship.price);
        if (success) {
            setSaveData(SaveManager.loadData()); // Refresh
        }
    };

    const selectShipInHangar = (ship: ShipArchetype) => {
        SaveManager.selectShip(ship.id);
        setSaveData(SaveManager.loadData());
        setSelectedShip(ship);
    };

    // --- RENDERERS ---

    const renderMenu = () => (
        <div style={{
            width: '100%', height: '100%',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center',
            background: 'linear-gradient(135deg, #050510 0%, #1a0b2e 100%)',
            color: 'white', fontFamily: "'Courier New', Courier, monospace"
        }}>
            <h1 style={{
                fontSize: '60px', margin: '0 0 40px 0',
                color: '#00ffff', textShadow: '0 0 20px #00ffff',
                textAlign: 'center'
            }}>
                SPACE SURVIVOR<br />
                <span style={{ fontSize: '30px', color: '#ff00ff' }}>NOVA STARSHIP</span>
            </h1>

            <button
                onClick={startGame}
                style={btnStyle('#00ff00')}
            >
                START RUN
            </button>

            <button
                onClick={() => setAppState('HANGAR')}
                style={{ ...btnStyle('#00ffff'), marginTop: '20px' }}
            >
                HANGAR / SHOP
            </button>

            <div style={{ marginTop: '40px', color: '#aaaaaa' }}>
                DARK MATTER: {saveData?.totalDarkMatter || 0}
            </div>
        </div>
    );

    const renderHangar = () => {
        if (!saveData) return <div>Loading...</div>;

        return (
            <div style={{
                width: '100%', height: '100%',
                background: '#0a0a1a', color: 'white',
                fontFamily: "'Courier New', Courier, monospace",
                display: 'flex', flexDirection: 'column',
                padding: '20px', boxSizing: 'border-box'
            }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <button onClick={() => setAppState('MENU')} style={btnStyle('#ff0055', 'small')}>BACK</button>
                    <h2 style={{ margin: 0, color: '#00ffff' }}>HANGAR - {saveData.totalDarkMatter} DM</h2>
                </div>

                <div style={{
                    display: 'flex', gap: '20px', overflowX: 'auto', paddingBottom: '20px',
                    justifyContent: 'center', flexWrap: 'wrap'
                }}>
                    {SHIP_DEFINITIONS.map(ship => {
                        const isUnlocked = saveData.unlockedShips.includes(ship.id);
                        const isSelected = saveData.selectedShipId === ship.id;
                        const canAfford = saveData.totalDarkMatter >= ship.price;

                        return (
                            <div key={ship.id} style={{
                                width: '300px',
                                background: isSelected ? 'rgba(0, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.05)',
                                border: `2px solid ${isSelected ? '#00ffff' : '#333'}`,
                                borderRadius: '10px',
                                padding: '20px',
                                display: 'flex', flexDirection: 'column',
                                opacity: isUnlocked ? 1 : 0.7
                            }}>
                                <h3 style={{ margin: '0 0 10px 0', color: isUnlocked ? 'white' : '#888' }}>{ship.name}</h3>
                                <p style={{ fontSize: '14px', color: '#ccc', height: '40px' }}>{ship.description}</p>

                                <div style={{ margin: '15px 0', fontSize: '14px', lineHeight: '1.5' }}>
                                    <div style={{ color: '#ff5555' }}>HP: {ship.baseStats.hp}</div>
                                    <div style={{ color: '#55ff55' }}>SPEED: {ship.baseStats.speed}</div>
                                    <div style={{ color: '#5555ff' }}>DMG: {ship.baseStats.damage}</div>
                                    <div style={{ color: '#ffff55' }}>MAG: {ship.baseStats.magnet}</div>
                                </div>

                                <div style={{ marginTop: 'auto' }}>
                                    {isUnlocked ? (
                                        <button
                                            onClick={() => selectShipInHangar(ship)}
                                            disabled={isSelected}
                                            style={{
                                                ...btnStyle(isSelected ? '#333' : '#00ff00', 'small'),
                                                width: '100%',
                                                cursor: isSelected ? 'default' : 'pointer'
                                            }}
                                        >
                                            {isSelected ? 'EQUIPPED' : 'EQUIP'}
                                        </button>
                                    ) : (
                                        <button
                                            onClick={() => buyShip(ship)}
                                            disabled={!canAfford}
                                            style={{
                                                ...btnStyle(canAfford ? '#ffff00' : '#555', 'small'),
                                                width: '100%',
                                                cursor: canAfford ? 'pointer' : 'not-allowed'
                                            }}
                                        >
                                            BUY ({ship.price} DM)
                                        </button>
                                    )}
                                </div>
                            </div>
                        );
                    })}
                </div>
            </div>
        );
    };

    const renderRunSummary = () => (
        <div style={{
            position: 'absolute', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex', flexDirection: 'column',
            justifyContent: 'center', alignItems: 'center', pointerEvents: 'auto', zIndex: 200,
            color: 'white', fontFamily: "'Courier New', Courier, monospace"
        }}>
            <h1 style={{ color: '#ff0055', fontSize: '50px', textShadow: '0 0 20px red' }}>MISSION FAILED</h1>
            <div style={{ fontSize: '24px', margin: '20px 0', textAlign: 'center' }}>
                <p>TIME SURVIVED: <span style={{ color: '#00ffff' }}>{Math.floor(runSummary!.survived)}s</span></p>
                <p>DARK MATTER COLLECTED: <span style={{ color: '#ffff00' }}>{runSummary!.gold}</span></p>
            </div>

            <button
                onClick={() => setAppState('MENU')}
                style={btnStyle('#00ffff')}
            >
                RETURN TO BASE
            </button>
        </div>
    );

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>

            {appState === 'MENU' && renderMenu()}
            {appState === 'HANGAR' && renderHangar()}

            {appState === 'GAME' && (
                <>
                    {/* HUD Removed - Rendered in GameEngine now */}

                    {/* JOYSTICK */}
                    <Joystick visible={joystickVisible} position={joystickPos} knobPosition={knobPos} />

                    {/* DASH BUTTON */}
                    <DashButton onTrigger={() => inputRef.current.triggerDash()} />

                    {/* UPGRADE MODAL */}
                    {showUpgrade && <UpgradeModal upgrades={upgradeOptions} onSelect={onSelectUpgrade} />}

                    {/* RUN SUMMARY / GAME OVER */}
                    {runSummary && renderRunSummary()}

                    <canvas ref={canvasRef} style={{ display: 'block' }} />
                </>
            )}
        </div>
    );
}

// Helpers
const btnStyle = (color: string, size: 'small' | 'large' = 'large') => ({
    background: 'transparent',
    color: color,
    border: `2px solid ${color}`,
    padding: size === 'large' ? '15px 40px' : '10px 20px',
    fontSize: size === 'large' ? '24px' : '16px',
    fontWeight: 'bold' as 'bold',
    cursor: 'pointer',
    boxShadow: `0 0 10px ${color}`,
    borderRadius: '8px',
    fontFamily: "'Courier New', Courier, monospace",
    textShadow: `0 0 5px ${color}`,
    transition: 'all 0.2s',
    textTransform: 'uppercase' as 'uppercase'
});

export default App;
