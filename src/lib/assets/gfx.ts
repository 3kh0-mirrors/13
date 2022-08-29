import {createTexture, getSubTexture, Texture, uploadTexture} from "../graphics/draw2d";
import {toRad} from "../utils/math";
import {PAD_FIRE_RADIUS_0, PAD_FIRE_RADIUS_1, PAD_MOVE_RADIUS_0, PAD_MOVE_RADIUS_1} from "../game/config";

export const enum Img {
    box = 0,
    box_lt,
    box_t,
    box_t2,
    box_l,
    circle_4,
    circle_4_60p,
    circle_4_70p,
    circle_16,

    avatar0,
    avatar1,
    avatar2,
    avatar3,
    avatar4,
    avatar5,
    avatar6,
    // avatar7,
    // avatar8,
    // avatar9,
    // avatar10,
    // avatar11,
    // avatar12,
    // avatar13,
    // avatar14,
    // avatar15,
    // avatar16,
    // avatar17,

    weapon0,
    weapon1,
    weapon2,
    weapon3,
    weapon4,
    weapon5,
    weapon6,
    weapon7,
    weapon8,
    weapon9,
    weapon10,

    barrel0,
    barrel1,
    barrel2,

    item0,
    item1,

    tree0,
    tree1,

    joy0,
    joy1,

    // num_avatars = 18,
    num_avatars = 7,
}

export const img: Texture[] = [];

export function createCanvas(size: number, alpha: boolean) {
    const canvas = document.createElement("canvas");
    canvas.width = canvas.height = size;
    return canvas.getContext("2d", {alpha});
}

function createAtlas(): void {
    const tempSize = 512;
    const atlasSize = 512;
    const texture = createTexture(atlasSize);
    const temp = createCanvas(tempSize, true);
    const atlas = createCanvas(atlasSize, true);
    atlas.fillStyle = "#FFF";
    let x = 1;
    let y = 1;
    let x1 = 1;
    let maxHeight = 0;
    let sprWidth = 0;
    let sprHeight = 0;
    const pushSprite = (w: number, h: number) => {
        x = x1;
        x1 = x + w + 1;
        if (x1 + 1 >= atlasSize) {
            y += 1 + maxHeight;
            maxHeight = h;
            x = 1;
            x1 = x + w + 1;
        }
        if (h > maxHeight) maxHeight = h;
        sprWidth = w;
        sprHeight = h;
    };

    const createEmoji2 = (emoji: string, ox: number, oy: number, w: number, h: number, size: number, a: number, sx: number, sy: number, cut: number) => {
        const scaleUp = 8;
        const emojiSize = (size * scaleUp) | 0;
        temp.clearRect(0, 0, tempSize, tempSize);
        temp.font = emojiSize + "px emoji";
        temp.textAlign = "center";
        temp.textBaseline = "middle";
        temp.translate(tempSize / 2, tempSize / 2);
        temp.rotate(toRad(a));
        temp.scale(sx, sy);
        temp.fillText(emoji, 0, 0);
        temp.resetTransform();
        const alphaThreshold = cut;
        const scale = 1 / scaleUp;
        pushSprite(w, h);
        // atlas.imageSmoothingEnabled = false;
        atlas.scale(scale, scale);
        atlas.translate(-ox, -oy);
        atlas.drawImage(temp.canvas, (1 + x) / scale, (1 + y) / scale);
        atlas.resetTransform();
        // atlas.imageSmoothingEnabled = true;
        const bmp = atlas.getImageData(x, y, w, h);
        for (let i = 0; i < bmp.data.length; i += 4) {
            let a = bmp.data[i + 3];
            if (a >= alphaThreshold) {
                bmp.data[i + 3] = 0xFF;
            } else {
                bmp.data[i] = 0;
                bmp.data[i + 1] = 0;
                bmp.data[i + 2] = 0;
                bmp.data[i + 3] = 0;
            }
        }
        atlas.putImageData(bmp, x, y);
        img.push(getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, 0.5));
    }

    const createCircle = (r: number) => {
        const s = r * 2;
        pushSprite(s, s);
        atlas.translate(x + r, y + r);
        atlas.beginPath();
        atlas.arc(0, 0, r * 0.925, 0, Math.PI * 2);
        atlas.closePath();
        atlas.fill();
        atlas.resetTransform();
        img.push(getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, 0.5));
    }
    // BOX
    pushSprite(1, 1);
    atlas.fillRect(x, y, 1, 1);
    img.push(
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, 0.5),
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0, 0),
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, 0),
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, -2),
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0, 0.5),
    );
    // CIRCLE
    createCircle(4);
    img.push(
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0.6, 0.5),
        getSubTexture(texture, x, y, sprWidth, sprHeight, 0.7, 0.5),
    );

    createCircle(16);

    createEmoji2("💀", 198, 166, 17, 19, 16, 0, 1, 1, 128);
    createEmoji2("👹", 192, 166, 19, 18, 16, 0, 1, 1, 128);
    // createEmoji2("😵", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("🌚", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("😷", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    createEmoji2("🤡", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("👨", 203, 166, 16, 19, 16, 0, 1, 1, 128);
    createEmoji2("🤖", 192, 166, 19, 18, 16, 0, 1, 1, 128);
    // createEmoji2("💩", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    createEmoji2("🎃", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("🤓", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("😡", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    // createEmoji2("🤢", 192, 166, 19, 19, 16, 0, 1, 1, 128);
    createEmoji2("🦝", 192, 172, 19, 17, 16, 0, 1, 1, 128);
    createEmoji2("🐙", 192, 166, 19, 18, 16, 0, 1, 1, 128);
    // createEmoji2("🦑", 201, 166, 16, 19, 16, 0, 1, 1, 128);
    // createEmoji2("🍏", 203, 166, 16, 19, 16, 0, 1, 1, 128);
    // createEmoji2("😾", 192, 166, 19, 19, 16, 0, 1, 1, 128);

    // none weapon gfx index
    img.push(undefined);

    createEmoji2("🔪", 180, 234, 19, 7, 12, -50, 1, 1, 128);
    //createEmoji2("🔨", 193, 189, 20, 13, 16, 44.5, -1, 1, 128);
    createEmoji2("🪓", 198, 210, 20, 10, 16, 45, -1, 1, 128);
    createEmoji2("🗡", 156, 204, 24, 12, 16, -45, -1, 1, 128);
    createEmoji2("🔫", 208, 198, 15, 12, 12, 0, -1, 1, 128);
    createEmoji2("🖊️", 157, 211, 24, 8, 16, -45, -1, 1, 128);
    createEmoji2("✏️️", 186, 216, 23, 8, 16, 44.5, -1, 1, 128);
    createEmoji2("🪥", 175, 261, 20, 8, 16, 45, 1, -1, 128);
    createEmoji2("⛏", 196, 216, 21, 17, 16, 135, 1, 1, 128);
    createEmoji2("🔌", 188, 202, 22, 11, 16, 45, -1, 1, 128);
    createEmoji2("🧵", 217, 192, 19, 19, 16, 90, 1, 1, 128);

    createEmoji2("🛢", 203, 144, 16, 23, 20, 0, 1, 1, 128);
    createEmoji2("📦", 193, 144, 18, 22, 20, 0, 1, 1, 128);
    createEmoji2("🪦", 176, 144, 23, 23, 20, 0, 1, 1, 128);
    createEmoji2("💊", 216, 200, 13, 13, 10, 0, 1, 1, 128);
    createEmoji2("❤️", 208, 194, 15, 13, 12, 0, 1, 1, 128);
    createEmoji2("🌳", 156, 99, 28, 31, 28, 0, 1, 1, 136);
    createEmoji2("🌲", 162, 99, 26, 31, 28, 0, 1, 1, 136);

    function renderJoy(r0: number, r1: number, text0: string, text1: string) {
        const s = r1 * 2 + 32;
        pushSprite(s, s);
        atlas.font = "10px monospace";
        atlas.textAlign = "center";
        atlas.lineWidth = 2;
        atlas.fillStyle = "#fff";
        atlas.strokeStyle = "#fff";

        atlas.translate(x + s / 2, y + s / 2);

        atlas.beginPath();
        atlas.arc(0, 0, r0, 0, Math.PI * 2);
        atlas.moveTo(0, 0);
        atlas.arc(0, 0, r1, 0, Math.PI * 2);
        atlas.closePath();
        atlas.stroke();

        atlas.fillText(text0, 0, -r0 - 5);
        atlas.fillText(text1, 0, -r1 - 5);

        atlas.resetTransform();

        img.push(getSubTexture(texture, x, y, sprWidth, sprHeight, 0.5, 0.5));
    }

    renderJoy(PAD_MOVE_RADIUS_0, PAD_MOVE_RADIUS_1, "RUN", "JUMP");
    renderJoy(PAD_FIRE_RADIUS_0, PAD_FIRE_RADIUS_1, "AIM", "FIRE");
    renderJoy(16, 16, "DROP", "");

    uploadTexture(texture.i, atlas.canvas);

    // TODO: dispose
    atlas.canvas.width = atlas.canvas.height = temp.canvas.width = temp.canvas.height = 0;

    // document.body.appendChild(atlas.canvas);
    // atlas.canvas.style.position = "fixed";
    // atlas.canvas.style.top = "0";
    // atlas.canvas.style.left = "0";
}

export function loadAtlas() {
    "💊,💔,🤍,❤️,🖤,💟,💙,💛,🧡,🤎,💜,💗,💖,💕,♡,♥,💕,❤";
    "🩸🧻";
    // 🧱 looks like ammo particle
    // 📏 also good shell alternative yellow color
    "🔥,☁️,☠,🔨,⛏️,🗡,🔪,🔫,🚀,⭐,🌟";
    "★,☆,✢,✥,✦,✧,❂,❉,✯,✰,⋆,✪";


    createAtlas();
    img[Img.weapon1].x = 0.3;
    img[Img.weapon2].x = 0.3;
    img[Img.weapon3].x = 0.3;
    img[Img.weapon4].x = 0.3;
    img[Img.weapon10].x = 0.3;
    img[Img.weapon10].y = 0.4;
    img[Img.barrel0].y = 0.95;
    img[Img.barrel1].y = 0.85;
    img[Img.barrel2].y = 0.95;
    img[Img.tree0].y = 0.95;
    img[Img.tree1].y = 0.95;
}
