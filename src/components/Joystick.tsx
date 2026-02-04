import React from 'react';

interface JoystickProps {
    // We don't need props for logic, as InputManager handles it directly with DOM events.
    // This component is purely for the visual overlay.
    // However, to make it clean, we could pass the InputManager instance to subscribe to visual events.
    // But for simplicity/performance, InputManager manipulates DOM directly? 
    // No, let's use React state for visuals to be "React-way" or refs for performance.
    // Actually, InputManager was written to call callbacks. Let's expose them here.

    // BETTER APPROACH for this specific architecture:
    // The InputManager handles the logic and "game" side.
    // This component renders the visual feedback based on state updates or direct DOM manipulation.
    // Given the high update rate of a joystick, direct DOM manipulation via InputManager on a ref is best.
    // But wait, InputManager uses `document.getElementById` or similar in my previous code?
    // Let's check InputManager...
    // It takes callbacks: onJoystickShow, onJoystickHide, onKnobMove.

    visible: boolean;
    position: { x: number, y: number };
    knobPosition: { x: number, y: number };
}

export const Joystick: React.FC<JoystickProps> = ({ visible, position, knobPosition }) => {
    if (!visible) return null;

    return (
        <div
            style={{
                position: 'absolute',
                left: position.x,
                top: position.y,
                transform: 'translate(-50%, -50%)',
                width: '120px',
                height: '120px',
                border: '2px dashed rgba(255, 255, 255, 0.2)',
                borderRadius: '50%',
                pointerEvents: 'none',
                zIndex: 50
            }}
        >
            <div
                style={{
                    width: '50px',
                    height: '50px',
                    background: 'rgba(255, 255, 255, 0.5)',
                    borderRadius: '50%',
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    transform: `translate(calc(-50% + ${knobPosition.x}px), calc(-50% + ${knobPosition.y}px))`
                }}
            />
        </div>
    );
};
