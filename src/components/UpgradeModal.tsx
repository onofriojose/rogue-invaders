import React from 'react';
import { Upgrade } from '../types';

interface UpgradeModalProps {
    upgrades: Upgrade[];
    onSelect: (upgrade: Upgrade) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ upgrades, onSelect }) => {
    return (
        <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: '100%',
            height: '100%',
            background: 'rgba(0, 0, 0, 0.85)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            pointerEvents: 'auto',
            backdropFilter: 'blur(5px)',
            zIndex: 100
        }}>
            <div style={{
                fontSize: '32px',
                color: '#ffff00',
                marginBottom: '30px',
                textShadow: '0 0 15px #ffff00',
                textTransform: 'uppercase',
                letterSpacing: '4px',
                textAlign: 'center',
                fontFamily: "'Courier New', Courier, monospace"
            }}>
                SYSTEM UPGRADE
            </div>

            <div style={{
                display: 'flex',
                gap: '20px',
                flexWrap: 'wrap',
                justifyContent: 'center',
                width: '100%',
                padding: '20px'
            }}>
                {upgrades.map((u, i) => {
                    let borderColor = '#ffffff';
                    let shadowColor = '#ffffff';

                    if (u.rarity === 'common') { borderColor = '#ffffff'; shadowColor = '#aaaaaa'; } // Default/White
                    if (u.rarity === 'rare') { borderColor = '#00ffff'; shadowColor = '#00ffff'; }
                    if (u.rarity === 'epic') { borderColor = '#ff00ff'; shadowColor = '#ff00ff'; }
                    if (u.rarity === 'legendary') { borderColor = '#ffff00'; shadowColor = '#ffff00'; }

                    return (
                        <div
                            key={i}
                            onClick={() => onSelect(u)}
                            className="upgrade-card"
                            style={{
                                background: 'linear-gradient(180deg, rgba(20, 20, 40, 0.95) 0%, rgba(10, 10, 20, 1) 100%)',
                                border: `2px solid ${borderColor}`,
                                borderRadius: '16px',
                                width: '220px',
                                height: '320px',
                                padding: '24px',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'transform 0.2s, box-shadow 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                textAlign: 'center',
                                boxShadow: `0 0 15px ${shadowColor}40`, // Low opacity base glow
                                fontFamily: "'Courier New', Courier, monospace",
                                position: 'relative',
                                overflow: 'hidden'
                            }}
                            onMouseEnter={(e) => {
                                e.currentTarget.style.transform = 'translateY(-8px)';
                                e.currentTarget.style.boxShadow = `0 0 25px ${shadowColor}`;
                            }}
                            onMouseLeave={(e) => {
                                e.currentTarget.style.transform = 'translateY(0)';
                                e.currentTarget.style.boxShadow = `0 0 15px ${shadowColor}40`;
                            }}
                        >
                            {/* Icon Container */}
                            <div style={{
                                fontSize: '64px',
                                marginBottom: '20px',
                                filter: `drop-shadow(0 0 10px ${shadowColor})`,
                                lineHeight: '1'
                            }}>
                                {u.icon || '📦'}
                            </div>

                            <h3 style={{
                                margin: '0 0 15px 0',
                                color: borderColor,
                                fontSize: '18px',
                                textTransform: 'uppercase',
                                letterSpacing: '1px',
                                minHeight: '44px', // Fixed height for 2 lines title
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                {u.title}
                            </h3>

                            <div style={{
                                width: '100%',
                                height: '1px',
                                background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
                                marginBottom: '15px'
                            }} />

                            <p style={{
                                fontSize: '14px',
                                color: '#e0e0e0',
                                lineHeight: '1.5',
                                flex: 1 // Fill remaining space
                            }}>
                                {u.desc}
                            </p>

                            <div style={{
                                fontSize: '12px',
                                color: shadowColor,
                                marginTop: 'auto',
                                textTransform: 'uppercase',
                                letterSpacing: '2px',
                                opacity: 0.8
                            }}>
                                {u.rarity}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
