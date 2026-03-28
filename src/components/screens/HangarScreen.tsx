import React from 'react';
import { ShipArchetype } from '../../data/ships';
import { SaveData } from '../../managers/SaveManager';
import { btnStyle, screenFontFamily } from './screenStyles';

interface HangarScreenProps {
    saveData: SaveData;
    ships: ShipArchetype[];
    onBack: () => void;
    onBuyShip: (ship: ShipArchetype) => void;
    onSelectShip: (ship: ShipArchetype) => void;
}

export const HangarScreen: React.FC<HangarScreenProps> = ({
    saveData,
    ships,
    onBack,
    onBuyShip,
    onSelectShip
}) => {
    return (
        <div style={{
            width: '100%',
            height: '100%',
            background: '#0a0a1a',
            color: 'white',
            fontFamily: screenFontFamily,
            display: 'flex',
            flexDirection: 'column',
            padding: '20px',
            boxSizing: 'border-box'
        }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <button onClick={onBack} style={btnStyle('#ff0055', 'small')}>BACK</button>
                <h2 style={{ margin: 0, color: '#00ffff' }}>HANGAR - {saveData.totalDarkMatter} DM</h2>
            </div>

            <div style={{
                display: 'flex',
                gap: '20px',
                overflowX: 'auto',
                paddingBottom: '20px',
                justifyContent: 'center',
                flexWrap: 'wrap'
            }}>
                {ships.map(ship => {
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
                            display: 'flex',
                            flexDirection: 'column',
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
                                        onClick={() => onSelectShip(ship)}
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
                                        onClick={() => onBuyShip(ship)}
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
