import React from 'react';
import { btnStyle, screenFontFamily } from './screenStyles';

export interface RunSummary {
    survived: number;
    gold: number;
}

interface RunSummaryOverlayProps {
    summary: RunSummary;
    onReturnToBase: () => void;
}

export const RunSummaryOverlay: React.FC<RunSummaryOverlayProps> = ({ summary, onReturnToBase }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            zIndex: 200,
            color: 'white',
            fontFamily: screenFontFamily,
            padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
            boxSizing: 'border-box',
            textAlign: 'center'
        }}>
            <h1 style={{ color: '#ff0055', fontSize: 'clamp(32px, 8vw, 50px)', textShadow: '0 0 20px red', margin: 0 }}>
                MISSION FAILED
            </h1>
            <div style={{ fontSize: 'clamp(18px, 4.6vw, 24px)', margin: '20px 0', textAlign: 'center' }}>
                <p>TIME SURVIVED: <span style={{ color: '#00ffff' }}>{Math.floor(summary.survived)}s</span></p>
                <p>DARK MATTER COLLECTED: <span style={{ color: '#ffff00' }}>{summary.gold}</span></p>
            </div>

            <button onClick={onReturnToBase} style={btnStyle('#00ffff')}>
                RETURN TO BASE
            </button>
        </div>
    );
};
