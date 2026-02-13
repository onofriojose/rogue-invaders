import { Vector2 } from '../types';

export class InputManager {
    public active: boolean = false;
    public vector: Vector2 = { x: 0, y: 0 };
    public dashPressed: boolean = false;

    private startPos: Vector2 = { x: 0, y: 0 };
    private currentPos: Vector2 = { x: 0, y: 0 };
    private keys: { [key: string]: boolean } = {};

    // Callbacks for visual updates
    private onKnobMove: ((x: number, y: number) => void) | null = null;
    private onJoystickShow: ((x: number, y: number) => void) | null = null;
    private onJoystickHide: (() => void) | null = null;

    constructor() {
        this.touchStart = this.touchStart.bind(this);
        this.touchMove = this.touchMove.bind(this);
        this.touchEnd = this.touchEnd.bind(this);
        this.mouseDown = this.mouseDown.bind(this);
        this.mouseMove = this.mouseMove.bind(this);
        this.mouseUp = this.mouseUp.bind(this);
        this.onKeyDown = this.onKeyDown.bind(this);
        this.onKeyUp = this.onKeyUp.bind(this);
    }

    public consumeDash(): boolean {
        if (this.dashPressed) {
            this.dashPressed = false;
            return true;
        }
        return false;
    }

    public triggerDash() {
        this.dashPressed = true;
    }

    public attach(element: HTMLElement) {
        element.addEventListener('touchstart', this.touchStart, { passive: false });
        element.addEventListener('touchmove', this.touchMove, { passive: false });
        element.addEventListener('touchend', this.touchEnd, { passive: false });

        // Mouse fallbacks
        element.addEventListener('mousedown', this.mouseDown);
        window.addEventListener('mousemove', this.mouseMove);
        window.addEventListener('mouseup', this.mouseUp);
        window.addEventListener('keydown', this.onKeyDown);
        window.addEventListener('keyup', this.onKeyUp);
    }

    public detach(element: HTMLElement) {
        element.removeEventListener('touchstart', this.touchStart);
        element.removeEventListener('touchmove', this.touchMove);
        element.removeEventListener('touchend', this.touchEnd);
        element.removeEventListener('mousedown', this.mouseDown);
        window.removeEventListener('mousemove', this.mouseMove);
        window.removeEventListener('mouseup', this.mouseUp);
        window.removeEventListener('keydown', this.onKeyDown);
        window.removeEventListener('keyup', this.onKeyUp);
    }

    public setVisualCallbacks(
        onShow: (x: number, y: number) => void,
        onHide: () => void,
        onMove: (x: number, y: number) => void
    ) {
        this.onJoystickShow = onShow;
        this.onJoystickHide = onHide;
        this.onKnobMove = onMove;
    }

    private touchStart(e: TouchEvent) {
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.startInteraction(touch.clientX, touch.clientY);
    }

    private touchMove(e: TouchEvent) {
        if (!this.active) return;
        e.preventDefault();
        const touch = e.changedTouches[0];
        this.moveInteraction(touch.clientX, touch.clientY);
    }

    private touchEnd(e: TouchEvent) {
        e.preventDefault();
        // Detect Tap for Dash (if duration < 200ms and minimal movement)
        const touch = e.changedTouches[0];
        const dx = touch.clientX - this.startPos.x;
        const dy = touch.clientY - this.startPos.y;
        if (Math.sqrt(dx * dx + dy * dy) < 10) {
            this.dashPressed = true;
        }
        this.endInteraction();
    }

    private mouseDown(e: MouseEvent) {
        this.startInteraction(e.clientX, e.clientY);
    }

    private mouseMove(e: MouseEvent) {
        if (!this.active) return;
        this.moveInteraction(e.clientX, e.clientY);
    }

    private mouseUp(_e: MouseEvent) {
        this.endInteraction();
    }

    private startInteraction(x: number, y: number) {
        this.active = true;
        this.startPos = { x, y };
        this.currentPos = { x, y };
        this.vector = { x: 0, y: 0 };

        if (this.onJoystickShow) this.onJoystickShow(x, y);
        if (this.onKnobMove) this.onKnobMove(0, 0); // Center initially
    }

    private moveInteraction(x: number, y: number) {
        this.currentPos = { x, y };

        // Calculate delta
        let dx = this.currentPos.x - this.startPos.x;
        let dy = this.currentPos.y - this.startPos.y;

        const maxRadius = 40;
        const distance = Math.sqrt(dx * dx + dy * dy);

        // Visual clamping
        let visualDx = dx;
        let visualDy = dy;

        if (distance > maxRadius) {
            const ratio = maxRadius / distance;
            visualDx *= ratio;
            visualDy *= ratio;
        }

        if (this.onKnobMove) this.onKnobMove(visualDx, visualDy);

        // Vector Normalization
        if (distance > 0) {
            this.vector.x = dx / distance;
            this.vector.y = dy / distance;
        }
    }

    private endInteraction() {
        this.active = false;
        this.vector = { x: 0, y: 0 };
        // Check if keys are still pressed to keep active
        this.updateKeyVector();
        if (this.onJoystickHide) this.onJoystickHide();
    }

    private onKeyDown(e: KeyboardEvent) {
        this.keys[e.code] = true;
        if (e.code === 'Space') {
            this.dashPressed = true;
        }
        this.updateKeyVector();
    }

    private onKeyUp(e: KeyboardEvent) {
        this.keys[e.code] = false;
        this.updateKeyVector();
    }

    private updateKeyVector() {
        // If touch/mouse is active, ignore keys for vector (or combine? simpler to prefer touch)
        // But if touch is NOT active, use keys.
        if (this.active && (this.startPos.x !== 0 || this.startPos.y !== 0)) return;

        let dx = 0;
        let dy = 0;

        if (this.keys['KeyW'] || this.keys['ArrowUp']) dy -= 1;
        if (this.keys['KeyS'] || this.keys['ArrowDown']) dy += 1;
        if (this.keys['KeyA'] || this.keys['ArrowLeft']) dx -= 1;
        if (this.keys['KeyD'] || this.keys['ArrowRight']) dx += 1;

        if (dx !== 0 || dy !== 0) {
            // Normalize
            const length = Math.sqrt(dx * dx + dy * dy);
            this.vector = { x: dx / length, y: dy / length };
            this.active = true;
        } else {
            // Only stop if we were using keys (no touch)
            if (this.active && this.startPos.x === 0 && this.startPos.y === 0) {
                this.active = false;
                this.vector = { x: 0, y: 0 };
            }
        }
    }
}
