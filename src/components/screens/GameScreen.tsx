import React from 'react';
import { Joystick } from '../Joystick';
import { DashButton } from '../DashButton';
import { UpgradeModal } from '../UpgradeModal';
import { Upgrade } from '../../types';
import { RunSummary, RunSummaryOverlay } from './RunSummaryOverlay';

interface GameScreenProps {
    canvasRef: React.RefObject<HTMLCanvasElement | null>;
    joystickVisible: boolean;
    joystickPos: { x: number; y: number };
    knobPos: { x: number; y: number };
    onTriggerDash: () => void;
    showUpgrade: boolean;
    upgradeOptions: Upgrade[];
    onSelectUpgrade: (upgrade: Upgrade) => void;
    runSummary: RunSummary | null;
    onReturnToBase: () => void;
}

export const GameScreen: React.FC<GameScreenProps> = ({
    canvasRef,
    joystickVisible,
    joystickPos,
    knobPos,
    onTriggerDash,
    showUpgrade,
    upgradeOptions,
    onSelectUpgrade,
    runSummary,
    onReturnToBase
}) => {
    return (
        <>
            <Joystick visible={joystickVisible} position={joystickPos} knobPosition={knobPos} />
            <DashButton onTrigger={onTriggerDash} />
            {showUpgrade && <UpgradeModal upgrades={upgradeOptions} onSelect={onSelectUpgrade} />}
            {runSummary && <RunSummaryOverlay summary={runSummary} onReturnToBase={onReturnToBase} />}
            <canvas ref={canvasRef as React.RefObject<HTMLCanvasElement>} style={{ display: 'block' }} />
        </>
    );
};
