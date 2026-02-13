import React, { useState } from 'react';

interface DashButtonProps {
    onTrigger: () => void;
}

export const DashButton: React.FC<DashButtonProps> = ({ onTrigger }) => {
    const [active, setActive] = useState(false);

    const handlePress = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(true);
        onTrigger();
    };

    const handleRelease = (e: React.TouchEvent | React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setActive(false);
    };

    const size = 80;

    return (
        <div
            onTouchStart={handlePress}
            onTouchEnd={handleRelease}
            onMouseDown={handlePress}
            onMouseUp={handleRelease}
            onMouseLeave={handleRelease}
            style={{
                position: 'absolute',
                bottom: '40px',
                right: '40px',
                width: `${size}px`,
                height: `${size}px`,
                borderRadius: '50%',
                border: `4px solid ${active ? '#ffffff' : '#00ffff'}`,
                background: active ? 'rgba(0, 255, 255, 0.3)' : 'rgba(0, 0, 0, 0.2)',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                cursor: 'pointer',
                zIndex: 100,
                boxShadow: `0 0 ${active ? '20px' : '10px'} #00ffff`,
                transition: 'all 0.1s ease-in-out',
                userSelect: 'none',
                touchAction: 'none'
            }}
        >
            <span style={{
                fontSize: '40px',
                color: active ? '#ffffff' : '#00ffff',
                textShadow: `0 0 10px ${active ? '#ffffff' : '#00ffff'}`,
                pointerEvents: 'none' // Ensure clicks go through to div
            }}>
                ⚡
            </span>
        </div>
    );
};
