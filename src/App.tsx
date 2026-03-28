import { useEffect, useRef, useState } from 'react';
import { GameEngine } from './game/GameEngine';
import { InputManager } from './game/InputManager';
import { GameStats, Upgrade } from './types';
import { SHIP_DEFINITIONS, ShipArchetype } from './data/ships';
import { SaveManager, SaveData } from './managers/SaveManager';
import { UPGRADES_LIST } from './game/data/upgrades';
import { MenuScreen } from './components/screens/MenuScreen';
import { HangarScreen } from './components/screens/HangarScreen';
import { GameScreen } from './components/screens/GameScreen';
import { RunSummary } from './components/screens/RunSummaryOverlay';

type AppState = 'MENU' | 'HANGAR' | 'GAME';

function App() {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const engineRef = useRef<GameEngine | null>(null);
    const inputRef = useRef<InputManager>(new InputManager());
    const requestRef = useRef<number>();

    const [appState, setAppState] = useState<AppState>('MENU');
    const [saveData, setSaveData] = useState<SaveData | null>(null);
    const [selectedShip, setSelectedShip] = useState<ShipArchetype>(SHIP_DEFINITIONS[0]);
    const [showUpgrade, setShowUpgrade] = useState(false);
    const [upgradeOptions, setUpgradeOptions] = useState<Upgrade[]>([]);
    const [runSummary, setRunSummary] = useState<RunSummary | null>(null);
    const [joystickVisible, setJoystickVisible] = useState(false);
    const [joystickPos, setJoystickPos] = useState({ x: 0, y: 0 });
    const [knobPos, setKnobPos] = useState({ x: 0, y: 0 });

    useEffect(() => {
        const data = SaveManager.loadData();
        setSaveData(data);
        const ship = SHIP_DEFINITIONS.find(candidate => candidate.id === data.selectedShipId) || SHIP_DEFINITIONS[0];
        setSelectedShip(ship);
    }, []);

    const handleResize = () => {
        if (canvasRef.current && engineRef.current) {
            canvasRef.current.width = window.innerWidth;
            canvasRef.current.height = window.innerHeight;
            engineRef.current.resize(window.innerWidth, window.innerHeight);
        }
    };

    const startGame = () => {
        setRunSummary(null);
        setShowUpgrade(false);
        setUpgradeOptions([]);
        setAppState('GAME');
    };

    const handleLevelUp = () => {
        if (!engineRef.current) return;

        const state = engineRef.current.state;
        state.level++;
        state.xp = state.xp - state.xpToNextLevel;
        state.xpToNextLevel = Math.floor(state.xpToNextLevel * 1.2);
        if (state.xp < 0) state.xp = 0;
        state.paused = true;

        const shuffled = [...UPGRADES_LIST].sort(() => 0.5 - Math.random());
        setUpgradeOptions(shuffled.slice(0, 3));
        setShowUpgrade(true);
    };

    const handleGameOver = () => {
        if (!engineRef.current) return;

        engineRef.current.state.gameOver = true;

        const earned = Math.floor(engineRef.current.state.totalDarkMatter);
        const survived = engineRef.current.state.timeSurvived;
        const totalDarkMatter = SaveManager.addCurrency(earned);

        setSaveData(prev => prev ? ({ ...prev, totalDarkMatter }) : null);
        setRunSummary({ survived, gold: earned });

        if (requestRef.current) {
            cancelAnimationFrame(requestRef.current);
        }
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

    useEffect(() => {
        if (appState !== 'GAME') return;

        const canvas = canvasRef.current;
        if (!canvas) return;

        inputRef.current.setVisualCallbacks(
            (x, y) => {
                setJoystickVisible(true);
                setJoystickPos({ x, y });
            },
            () => {
                setJoystickVisible(false);
            },
            (x, y) => {
                setKnobPos({ x, y });
            }
        );
        inputRef.current.attach(canvas);

        const ctx = canvas.getContext('2d')!;
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;

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
            () => { },
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
            inputRef.current.detach(canvas);
        };
    }, [appState, selectedShip]);

    const onSelectUpgrade = (upgrade: Upgrade) => {
        if (!engineRef.current) return;

        engineRef.current.applyUpgrade(engineRef.current.state.stats, upgrade);
        engineRef.current.state.paused = false;
        engineRef.current.state.lastTime = performance.now();
        setShowUpgrade(false);
    };

    const buyShip = (ship: ShipArchetype) => {
        if (!saveData) return;

        const success = SaveManager.purchaseShip(ship.id, ship.price);
        if (success) {
            setSaveData(SaveManager.loadData());
        }
    };

    const selectShipInHangar = (ship: ShipArchetype) => {
        SaveManager.selectShip(ship.id);
        setSaveData(SaveManager.loadData());
        setSelectedShip(ship);
    };

    return (
        <div style={{ width: '100vw', height: '100vh', overflow: 'hidden', background: '#000' }}>
            {appState === 'MENU' && (
                <MenuScreen
                    darkMatter={saveData?.totalDarkMatter || 0}
                    onStartRun={startGame}
                    onOpenHangar={() => setAppState('HANGAR')}
                />
            )}

            {appState === 'HANGAR' && saveData && (
                <HangarScreen
                    saveData={saveData}
                    ships={SHIP_DEFINITIONS}
                    onBack={() => setAppState('MENU')}
                    onBuyShip={buyShip}
                    onSelectShip={selectShipInHangar}
                />
            )}

            {appState === 'HANGAR' && !saveData && (
                <div style={{ color: 'white', padding: '24px' }}>Loading...</div>
            )}

            {appState === 'GAME' && (
                <GameScreen
                    canvasRef={canvasRef}
                    joystickVisible={joystickVisible}
                    joystickPos={joystickPos}
                    knobPos={knobPos}
                    onTriggerDash={() => inputRef.current.triggerDash()}
                    showUpgrade={showUpgrade}
                    upgradeOptions={upgradeOptions}
                    onSelectUpgrade={onSelectUpgrade}
                    runSummary={runSummary}
                    onReturnToBase={() => setAppState('MENU')}
                />
            )}
        </div>
    );
}

export default App;
