import React from 'react';
import { btnStyle, screenFontFamily } from './screenStyles';

interface MenuScreenProps {
    darkMatter: number;
    onStartRun: () => void;
    onOpenHangar: () => void;
}

export const MenuScreen: React.FC<MenuScreenProps> = ({ darkMatter, onStartRun, onOpenHangar }) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            background: 'linear-gradient(135deg, #050510 0%, #1a0b2e 100%)',
            color: 'white',
            fontFamily: screenFontFamily
        }}>
            <h1 style={{
                fontSize: '60px',
                margin: '0 0 40px 0',
                color: '#00ffff',
                textShadow: '0 0 20px #00ffff',
                textAlign: 'center'
            }}>
                SPACE SURVIVOR<br />
                <span style={{ fontSize: '30px', color: '#ff00ff' }}>NOVA STARSHIP</span>
            </h1>

            <button onClick={onStartRun} style={btnStyle('#00ff00')}>
                START RUN
            </button>

            <button onClick={onOpenHangar} style={{ ...btnStyle('#00ffff'), marginTop: '20px' }}>
                HANGAR / SHOP
            </button>

            <div style={{ marginTop: '40px', color: '#aaaaaa' }}>
                DARK MATTER: {darkMatter}
            </div>
        </div>
    );
};
