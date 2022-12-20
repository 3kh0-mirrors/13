import {inputPointers, keyboardState, KeyCode, mousePointer, Pointer} from "../utils/input";
import {drawCircle, drawRing, gl} from "../graphics/draw2d";
import {Actor} from "./types";
import {
    PAD_FIRE_RADIUS_0,
    PAD_FIRE_RADIUS_1,
    PAD_MOVE_RADIUS_0,
    PAD_MOVE_RADIUS_1,
    WORLD_SCALE
} from "../assets/params";
import {getScreenScale} from "./gameState";
import {hypot} from "../utils/math";
import {weapons} from "./data/weapons";
import {drawTextShadowCenter, fnt} from "../graphics/font";

// TODO: positioning of controls
// ToDO: control zone padding should include max radius
// TODO: return mouse control
// TODO: combine pad + keyboard

/*
    First 19 bits
    [ ..... LA-LA-LA-LA-LA-LA-LA MA-MA-MA-MA-MA-MA Sp Dr Sh Ju Ru Mo ]

    Next high 13 bits not used
 */
export const enum ControlsFlag {
    Move = 0x1,
    Run = 0x2,
    Jump = 0x4,
    Fire = 0x8,
    Drop = 0x10,
    Reload = 0x20,
    Swap = 0x40,
    Spawn = 0x80,

    // 5-bits for Move angle (32 directions)
    MoveAngleMax = 0x20,
    MoveAngleBit = 8,
    // 8-bits for Look angle (256 directions)
    LookAngleMax = 0x100,
    LookAngleBit = 13,

    DownEvent_Fire = 1,
    DownEvent_Drop = 2,
    DownEvent_Reload = 4,
    DownEvent_Swap = 8,
}

export const gameCamera: number[] = [0, 0, 1];
export let lookAtX = 0;
export let lookAtY = 0;
export let viewX = 0;
export let viewY = 0;
export let shootButtonDown = false;
export let jumpButtonDown = false;
export let moveX = 0;
export let moveY = 0;
export let moveFast = false;
export let dropButton = false;
export let reloadButton = false;
export let swapButton = false;

export const couldBeReloadedManually = (player: Actor): boolean => {
    const weapon = weapons[player.weapon_];
    return weapon && !player.clipReload_ && weapon.clipSize_ && player.clipAmmo_ < weapon.clipSize_;
}

export const couldSwapWeaponSlot = (player: Actor): boolean => {
    return !!player.weapon2_;
}

export const updateControls = (player: Actor) => {
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;

    const mouse = mousePointer;

    const px = (player.x_) / WORLD_SCALE;
    const py = (player.y_ - player.z_) / WORLD_SCALE - 10;

    if (mouse.x_ >= 0 && mouse.x_ < W && mouse.y_ >= 0 && mouse.y_ < H) {
        lookAtX = (mouse.x_ - W / 2) * gameCamera[2] + gameCamera[0];
        lookAtY = (mouse.y_ - H / 2) * gameCamera[2] + gameCamera[1];
        viewX = lookAtX - px;
        viewY = lookAtY - py;
    } else {
        viewX = 0;
        viewY = 0;
    }

    shootButtonDown = (viewX || viewY) && mouse.active_;

    moveX = (keyboardState[KeyCode.D] | keyboardState[KeyCode.Right])
        - (keyboardState[KeyCode.A] | keyboardState[KeyCode.Left]);
    moveY = (keyboardState[KeyCode.S] | keyboardState[KeyCode.Down])
        - (keyboardState[KeyCode.W] | keyboardState[KeyCode.Up]);

    //if (moveX || moveY) {
    moveFast = !keyboardState[KeyCode.Shift];
    //}

    jumpButtonDown = !!keyboardState[KeyCode.Space];
    dropButton = !!keyboardState[KeyCode.E];
    reloadButton = !!keyboardState[KeyCode.R];
    swapButton = !!keyboardState[KeyCode.Q];

    vpad[3].hidden_ = !couldBeReloadedManually(player);
    vpad[4].hidden_ = !couldSwapWeaponSlot(player);
    if (updateVirtualPad()) {
        const k = gameCamera[2];
        let control = vpad[0];
        let pp = control.pointer_;
        moveX = pp ? (pp.x_ - pp.startX_) * k : 0;
        moveY = pp ? (pp.y_ - pp.startY_) * k : 0;
        let len = hypot(moveX, moveY);
        moveFast = len > control.r1_;
        jumpButtonDown = len > control.r2_;

        control = vpad[1];
        pp = control.pointer_;
        viewX = pp ? (pp.x_ - pp.startX_) * k : 0;
        viewY = pp ? (pp.y_ - pp.startY_) * k : 0;
        len = hypot(viewX, viewY);
        lookAtX = px + viewX * 2;
        lookAtY = py + viewY * 2;
        shootButtonDown = len > control.r2_;

        dropButton = !!vpad[2].pointer_;
        reloadButton = !!vpad[3].pointer_;
        swapButton = !!vpad[4].pointer_;
    }
}

interface VPadControl {
    l_: number;
    t_: number;
    r_: number;
    b_: number;
    isButton_?: number;
    pointer_?: Pointer | undefined;
    hidden_?: boolean;
    // any len > undefined = false (undefined is NaN)
    r1_?: number | undefined;
    r2_?: number | undefined;
    text1?: string;
    text2?: string;
}

const vpad: VPadControl[] = [
    {l_: 0, t_: 0.5, r_: 0.5, b_: 1, r1_: PAD_MOVE_RADIUS_0, r2_: PAD_MOVE_RADIUS_1, text1: "RUN", text2: "JUMP"},
    {l_: 0.5, t_: 0.5, r_: 1, b_: 1, r1_: PAD_FIRE_RADIUS_0, r2_: PAD_FIRE_RADIUS_1, text1: "AIM", text2: "FIRE"},
    {l_: 0.5, t_: 0.25, r_: 0.66, b_: 0.5, isButton_: 1, r1_: 16, text1: "DROP"},
    {l_: 0.66, t_: 0.25, r_: 0.82, b_: 0.5, isButton_: 1, r1_: 16, text1: "RELOAD"},
    {l_: 0.82, t_: 0.25, r_: 1, b_: 0.5, isButton_: 1, r1_: 16, text1: "SWAP"},
];
let touchPadActive = false;

const checkPointerIsAvailableForCapturing = (pointer: Pointer) =>
    !vpad.some(c => c.pointer_ == pointer);

const testZone = (control: VPadControl, rx: number, ry: number) =>
    rx > control.l_ && rx < control.r_ && ry > control.t_ && ry < control.b_;

const updateVirtualPad = () => {
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
            if (control.isButton_) {
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

    if (mousePointer.downEvent_) {
        touchPadActive = [...inputPointers.values()].some(p => p.active_);
        // [...a.values()].some(p=>p.b);
        // for(let [,p] of a) r|=p.v;
    }
    return touchPadActive;
}

export const drawVirtualPad = () => {
    if (!touchPadActive) {
        return;
    }
    const boxTexture = fnt[0].textureBox;
    const W = gl.drawingBufferWidth;
    const H = gl.drawingBufferHeight;
    const k = 1 / getScreenScale();
    const segments = 16;
    for (const control of vpad) {
        if (!control.hidden_) {
            const w_ = W * (control.r_ - control.l_);
            const h_ = H * (control.b_ - control.t_);
            let cx = k * (W * control.l_ + w_ / 2);
            let cy = k * (H * control.t_ + h_ / 2);
            const pp = control.pointer_;
            if (!control.isButton_ && pp) {
                cx = pp.startX_ * k;
                cy = pp.startY_ * k;
                drawCircle(boxTexture, pp.x_ * k, pp.y_ * k, 16, segments, 1, 1, 0.5);
            }
            if (control.r1_ !== undefined) {
                drawTextShadowCenter(fnt[0], control.text1, 8, cx, cy - control.r1_ - 4, pp ? 0xFFFFFF : 0x777777);
                drawRing(boxTexture, cx, cy, control.r1_ - 2, 4, segments, 1, 1, 0.5, pp ? 0xFFFFFF : 0);
            }
            if (control.r2_ !== undefined) {
                drawTextShadowCenter(fnt[0], control.text2, 8, cx, cy - control.r2_ - 4, pp ? 0xFFFFFF : 0x777777);
                drawRing(boxTexture, cx, cy, control.r2_ - 2, 4, segments, 1, 1, 0.5, pp ? 0xFFFFFF : 0);
            }
        }
    }
}