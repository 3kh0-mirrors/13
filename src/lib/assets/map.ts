import {rand} from "../utils/rnd";
import {createCanvas} from "./gfx";
import {createTexture, uploadTexture} from "../graphics/draw2d";
import {BOUNDS_SIZE} from "./params";
import {GL, gl} from "../graphics/gl";

export const mapTexture = createTexture(BOUNDS_SIZE);
export let mapFramebuffer = gl.createFramebuffer();
gl.bindFramebuffer(GL.FRAMEBUFFER, mapFramebuffer);
gl.bindTexture(GL.TEXTURE_2D, mapTexture.i);
gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, mapTexture.i, 0);
gl.bindFramebuffer(GL.FRAMEBUFFER, null);

export function generateMapBackground(): void {
    const map = createCanvas(BOUNDS_SIZE, false);
    map.fillStyle = "#060";
    map.fillRect(0, 0, BOUNDS_SIZE, BOUNDS_SIZE);

    map.fillStyle = "#080";
    map.scale(1, .25);
    for (let i = 0; i < 128; ++i) {
        map.beginPath()
        map.arc(rand(BOUNDS_SIZE), rand(BOUNDS_SIZE * 4), 4 + rand(16), 0, 2 * Math.PI);
        map.closePath();
        map.fill();
    }

    ///// LZMA: ~111

    // ctx.resetTransform();
    // ctx.fillStyle = "#AAA";
    // for (let i = 0; i < 32; ++i) {
    //     ctx.beginPath()
    //     ctx.arc(rand(size), rand(size), 2, 0, Math.PI, true);
    //     ctx.closePath();
    //     ctx.fill();
    // }
    //
    // ctx.fillStyle = "#572";
    // for (let i = 0; i < 2048; ++i) {
    //     ctx.fillRect(rand(size), rand(size), 1, 2 + rand(4));
    // }

    ///// LZMA: ~64

    // ctx.font = "5px e";
    // ctx.fillStyle = "#FFF";
    // ctx.scale(1, 0.5);
    // for (let i = 0; i < 128; ++i) {
    //     ctx.fillText("🌼,🌸,🌺,🍀".split(",")[rand(4)], rand(size), rand(size * 2));
    // }
    // ctx.resetTransform();
    //
    // ctx.font = "8px e";
    // for (let i = 0; i < 32; ++i) {
    //     ctx.fillText("🌷,🌻,🥀,🌿".split(",")[rand(4)], rand(size), rand(size));
    // }

    uploadTexture(mapTexture.i, map.canvas);

    ///// LZMA: ~22
    // ctx.canvas.width = ctx.canvas.height = 0;


}
