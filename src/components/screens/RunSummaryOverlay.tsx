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
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.9)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            zIndex: 200,
            color: 'white',
            fontFamily: screenFontFamily
        }}>
            <h1 style={{ color: '#ff0055', fontSize: '50px', textShadow: '0 0 20px red' }}>MISSION FAILED</h1>
            <div style={{ fontSize: '24px', margin: '20px 0', textAlign: 'center' }}>
                <p>TIME SURVIVED: <span style={{ color: '#00ffff' }}>{Math.floor(summary.survived)}s</span></p>
                <p>DARK MATTER COLLECTED: <span style={{ color: '#ffff00' }}>{summary.gold}</span></p>
            </div>

            <button onClick={onReturnToBase} style={btnStyle('#00ffff')}>
                RETURN TO BASE
            </button>
        </div>
    );
};
