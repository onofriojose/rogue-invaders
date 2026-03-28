import React from 'react';
import { Upgrade } from '../types';

interface UpgradeModalProps {
    upgrades: Upgrade[];
    onSelect: (upgrade: Upgrade) => void;
}

export const UpgradeModal: React.FC<UpgradeModalProps> = ({ upgrades, onSelect }) => {
    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0, 0, 0, 0.88)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'flex-start',
            alignItems: 'center',
            pointerEvents: 'auto',
            zIndex: 100,
            padding: 'max(16px, env(safe-area-inset-top)) max(16px, env(safe-area-inset-right)) max(24px, env(safe-area-inset-bottom)) max(16px, env(safe-area-inset-left))',
            boxSizing: 'border-box',
            overflowY: 'auto',
            WebkitOverflowScrolling: 'touch'
        }}>
            <div style={{
                fontSize: 'clamp(22px, 5vw, 32px)',
                color: '#ffff00',
                marginTop: '8px',
                marginBottom: '18px',
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                textAlign: 'center',
                fontFamily: "'Courier New', Courier, monospace",
                lineHeight: 1.2
            }}>
                SYSTEM UPGRADE
            </div>

            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 220px), 1fr))',
                gap: '16px',
                width: 'min(100%, 960px)',
                alignItems: 'start',
                paddingBottom: '12px'
            }}>
                {upgrades.map((upgrade, index) => {
                    let borderColor = '#ffffff';
                    let accentColor = '#aaaaaa';

                    if (upgrade.rarity === 'rare') {
                        borderColor = '#00ffff';
                        accentColor = '#00ffff';
                    } else if (upgrade.rarity === 'epic') {
                        borderColor = '#ff00ff';
                        accentColor = '#ff00ff';
                    } else if (upgrade.rarity === 'legendary') {
                        borderColor = '#ffff00';
                        accentColor = '#ffff00';
                    }

                    return (
                        <div
                            key={index}
                            onClick={() => onSelect(upgrade)}
                            className="upgrade-card"
                            style={{
                                background: 'linear-gradient(180deg, rgba(20, 20, 40, 0.95) 0%, rgba(10, 10, 20, 1) 100%)',
                                border: `2px solid ${borderColor}`,
                                borderRadius: '16px',
                                width: '100%',
                                minHeight: '240px',
                                padding: '20px',
                                boxSizing: 'border-box',
                                color: 'white',
                                cursor: 'pointer',
                                transition: 'box-shadow 0.2s, border-color 0.2s',
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'stretch',
                                textAlign: 'left',
                                boxShadow: `0 0 12px ${accentColor}22`,
                                fontFamily: "'Courier New', Courier, monospace",
                                position: 'relative',
                                overflow: 'hidden',
                                alignSelf: 'start'
                            }}
                            onMouseEnter={(event) => {
                                event.currentTarget.style.boxShadow = `0 0 18px ${accentColor}55`;
                            }}
                            onMouseLeave={(event) => {
                                event.currentTarget.style.boxShadow = `0 0 12px ${accentColor}22`;
                            }}
                        >
                            <div style={{
                                fontSize: 'clamp(28px, 6vw, 42px)',
                                marginBottom: '14px',
                                lineHeight: '1',
                                color: accentColor,
                                textAlign: 'center'
                            }}>
                                {upgrade.icon || '[UPG]'}
                            </div>

                            <h3 style={{
                                margin: '0 0 12px 0',
                                color: borderColor,
                                fontSize: 'clamp(16px, 4vw, 18px)',
                                textTransform: 'uppercase',
                                letterSpacing: '0.08em',
                                minHeight: '40px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                textAlign: 'center',
                                lineHeight: 1.25
                            }}>
                                {upgrade.title}
                            </h3>

                            <div style={{
                                width: '100%',
                                height: '1px',
                                background: `linear-gradient(90deg, transparent, ${borderColor}, transparent)`,
                                marginBottom: '12px'
                            }} />

                            <p style={{
                                fontSize: 'clamp(13px, 3.6vw, 14px)',
                                color: '#e0e0e0',
                                lineHeight: '1.45',
                                flex: 1,
                                margin: 0
                            }}>
                                {upgrade.desc}
                            </p>

                            <div style={{
                                fontSize: '12px',
                                color: accentColor,
                                marginTop: '16px',
                                textTransform: 'uppercase',
                                letterSpacing: '0.16em',
                                opacity: 0.8,
                                textAlign: 'center'
                            }}>
                                {upgrade.rarity}
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
