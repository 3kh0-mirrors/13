import {gl} from "../graphics/gl";
import {inputPointers, keyboardState, mousePointer, Pointer} from "../utils/input";
import {camera, draw} from "../graphics/draw2d";
import {Actor} from "./types";
import {img, Img} from "../assets/gfx";

// TODO: positioning of controls
// ToDO: control zone padding should include max radius
// TODO: return mouse control
// TODO: combine pad + keyboard

export const enum ControlsFlag {
    Move = 0x100,
    Run = 0x200,
    Jump = 0x400,
    Shooting = 0x800,
    Drop = 0x1000,
}

export let lookAtX = 0;
export let lookAtY = 0;
export let viewX = 0;
export let viewY = 0;
export let shootButtonDown = 0;
export let jumpButtonDown = 0;
export let moveX = 0;
export let moveY = 0;
export let moveFast = 0;
export let dropButton = 0;

export function updateControls(player: Actor) {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    const mouse = mousePointer;

    const px = player.x;
    const py = player.y - player.z - 10;

    if (mouse.x_ >= 0 && mouse.x_ < W && mouse.y_ >= 0 && mouse.y_ < H) {
        lookAtX = (mouse.x_ - W * camera.toX_) / camera.scale_ + camera.atX_;
        lookAtY = (mouse.y_ - H * camera.toY_) / camera.scale_ + camera.atY_;
        viewX = lookAtX - px;
        viewY = lookAtY - py;
    } else {
        viewX = 0;
        viewY = 0;
    }

    shootButtonDown = +((viewX || viewY) && mouse.active_);

    moveX = (keyboardState.has("KeyD") || keyboardState.has("ArrowRight")) as any
        - ((keyboardState.has("KeyA") || keyboardState.has("ArrowLeft")) as any);
    moveY = (keyboardState.has("KeyS") || keyboardState.has("ArrowDown")) as any
        - ((keyboardState.has("KeyW") || keyboardState.has("ArrowUp")) as any);

    if (moveX || moveY) {
        moveFast = +!(keyboardState.has("ShiftLeft") || keyboardState.has("ShiftRight"));
    }

    jumpButtonDown = +keyboardState.has("Space");
    dropButton = +keyboardState.has("KeyE");


    {
        updateVirtualPad();
        const k = 1.0 / camera.scale_;
        if (touchPadActive) {
            {
                const control = vpad[0];
                let dx = 0;
                let dy = 0;
                const pp = control.pointer_;
                if (pp) {
                    dx = (pp.x_ - pp.startX_) * k;
                    dy = (pp.y_ - pp.startY_) * k;
                }
                const len = Math.hypot(dx, dy);
                moveX = dx;
                moveY = dy;
                moveFast = +(len > control.r1_);
                jumpButtonDown = +(len > control.r2_);
            }
            {
                const control = vpad[1];
                let dx = 0;
                let dy = 0;
                const pp = control.pointer_;
                if (pp) {
                    dx = (pp.x_ - pp.startX_) * k;
                    dy = (pp.y_ - pp.startY_) * k;
                }
                const len = Math.hypot(dx, dy);
                viewX = dx;
                viewY = dy;
                lookAtX = px + dx * 3;
                lookAtY = py + dy * 3;
                shootButtonDown = +(len > control.r2_);
            }
            dropButton = vpad[2].pointer_ ? 1 : 0;
        }
    }

    if (mousePointer.downEvent_ && touchPadActive) {
        touchPadActive = false;
        for (const [, p] of inputPointers) {
            touchPadActive ||= p.active_;
        }
    }
}

interface VPadControl {
    l_: number;
    t_: number;
    r_: number;
    b_: number;
    flags_?: number;
    pointer_?: Pointer | undefined;
    // any len > undefined = false (undefined is NaN)
    r1_?: number | undefined;
    r2_?: number | undefined;
}

const vpad: VPadControl[] = [
    {l_: 0, t_: 0.5, r_: 0.5, b_: 1, r1_: 16, r2_: 48},
    {l_: 0.5, t_: 0.5, r_: 1, b_: 1, r1_: 8, r2_: 24},
    {l_: 0.5, t_: 0, r_: 1, b_: 0.5, flags_: 1},
];
let touchPadActive = false;

function checkPointerIsAvailableForCapturing(pointer: Pointer) {
    for (const control of vpad) {
        if (control.pointer_ === pointer) {
            return false;
        }
    }
    return true;
}

function testZone(control: VPadControl, rx: number, ry: number) {
    return rx > control.l_ && rx < control.r_ && ry > control.t_ && ry < control.b_;
}

function updateVirtualPad() {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    for (const control of vpad) {
        // if not captured
        if (!control.pointer_) {
            // capture
            for (const [, p] of inputPointers) {
                if (p.downEvent_ &&
                    testZone(control, p.startX_ / W, p.startY_ / H) &&
                    checkPointerIsAvailableForCapturing(p)) {
                    control.pointer_ = p;
                }
            }
        }
        // if captured
        if (control.pointer_) {
            const p = control.pointer_;
            let release = !p.active_;
            // out-of-zone mode
            if (control.flags_ & 1) {
                release ||= !testZone(control, p.x_ / W, p.y_ / H);
            }
            if (release) {
                // release
                control.pointer_ = undefined;
            } else {
                touchPadActive = true;
            }
        }
    }
}

export function drawVirtualPad() {
    if (!touchPadActive) {
        return;
    }
    const k = 1.0 / camera.scale_;
    const W = gl.drawingBufferWidth * k;
    const H = gl.drawingBufferHeight * k;
    for (const control of vpad) {
        const w_ = W * (control.r_ - control.l_);
        const h_ = H * (control.b_ - control.t_);
        const cx = W * control.l_ + w_ / 2;
        const cy = H * control.t_ + h_ / 2;
        draw(img[Img.box], cx, cy, 0, w_, h_, 0.1, 0);
        const pp = control.pointer_;
        if (pp) {
            if (control.flags_ & 1) {
                draw(img[Img.box], cx, cy, 0, w_, h_, 0.1, pp ? 0xFFFFFF : 0);
            } else {
                const r1 = (control.r1_ / 16);
                const r2 = (control.r2_ / 16);
                draw(img[Img.circle_16], pp.startX_ * k, pp.startY_ * k, 0, r1, r1, 0.5);
                draw(img[Img.circle_16], pp.startX_ * k, pp.startY_ * k, 0, r2, r2, 0.5);
                draw(img[Img.circle_16], pp.x_ * k, pp.y_ * k, 0, 1, 1, 0.5);
            }
        }
    }
}