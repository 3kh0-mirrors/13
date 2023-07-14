import {GL} from "./gl.js";
import {cos, PI2, sin} from "../utils/math.js";
import {
    SHADER_A_COLOR_ADD,
    SHADER_A_COLOR_MUL,
    SHADER_A_POSITION,
    SHADER_A_TEX_COORD,
    SHADER_FRAGMENT,
    SHADER_U_AMBIENT_COLOR,
    SHADER_U_MVP,
    SHADER_U_TEX,
    SHADER_U_TEX_1,
    SHADER_VERTEX,
} from "./shader.js";
import {Mat4} from "../utils/mat4.js";
import {stats} from "../utils/fpsMeter.js";
import {hasSettingsFlag, SettingFlag} from "../game/settings.js";
import {createCanvas} from "./utils.js";

export const gl = c.getContext("webgl", {
    antialias: hasSettingsFlag(SettingFlag.Antialiasing),
    // defaults:
    // alpha: true, - don't emulate RGB24
    // depth: true,
    // stencil: false
}) as WebGLRenderingContext;

gl.pixelStorei(GL.UNPACK_PREMULTIPLY_ALPHA_WEBGL, 1);

export const getDPR = () => (hasSettingsFlag(SettingFlag.HighDPI) ? devicePixelRatio : 1.0);
const onResize = () => {
    const dpr = getDPR();
    const width = document.body.clientWidth;
    const height = document.body.clientHeight;
    const w = (width * dpr) | 0;
    const h = (height * dpr) | 0;
    if (c.width !== w || c.height !== h) {
        c.width = w;
        c.height = h;
        c.style.width = width + "px";
        c.style.height = height + "px";
    }
};
onresize = onResize;
setInterval(onResize, 1000);
onResize();

// const batchVertexMax = 65535;
const floatSize = 3 + 2 + 2;
const batchVertexMax = ((1 << 18) / floatSize) | 0;
const byteSize = floatSize * 4;
// maxBatch * byteSize
// const arrayBuffer = new ArrayBuffer(1 << 22/* maxBatch * byteSize */);
// TODO:
// const floatView = new Float32Array(1 << 20);
const vertexF32 = new Float32Array(1 << 18);
const vertexU32 = new Uint32Array(vertexF32.buffer);
const indexData = new Uint16Array(1 << 18);

interface Program {
    program: WebGLProgram;
    u_mvp: WebGLUniformLocation;
    u_ambientColor: WebGLUniformLocation;
    u_tex0: WebGLUniformLocation;
    u_tex1: WebGLUniformLocation;
    a_position: GLint;
    a_texCoord: GLint;
    a_colorMul: GLint;
    a_colorAdd: GLint;
}

const compileShader = (source: string, shader: GLenum | WebGLShader): WebGLShader => {
    shader = gl.createShader(shader as GLenum);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);

    if (process.env.NODE_ENV === "development") {
        if (!gl.getShaderParameter(shader, GL.COMPILE_STATUS)) {
            const error = gl.getShaderInfoLog(shader);
            gl.deleteShader(shader);
            console.error(error);
        }
    }
    return shader;
};

const createBuffer = (type: GLenum, src: ArrayBufferLike, usage: GLenum) => {
    const buffer = gl.createBuffer();
    gl.bindBuffer(type, buffer);
    gl.bufferData(type, src, usage);
    return buffer;
};

const bindAttrib = (name: GLint, size: number, stride: number, offset: number, type: GLenum, norm: boolean) => {
    gl.enableVertexAttribArray(name);
    gl.vertexAttribPointer(name, size, type, norm, stride, offset);
};

const createProgram = (vs: string, fs: string): WebGLProgram => {
    const vertShader = compileShader(vs, GL.VERTEX_SHADER);
    const fragShader = compileShader(fs, GL.FRAGMENT_SHADER);
    const program = gl.createProgram();
    gl.attachShader(program, vertShader);
    gl.attachShader(program, fragShader);
    gl.linkProgram(program);

    if (process.env.NODE_ENV === "development") {
        if (!gl.getProgramParameter(program, GL.LINK_STATUS)) {
            const error = gl.getProgramInfoLog(program);
            gl.deleteProgram(program);
            console.error(error);
        }
    }

    gl.deleteShader(vertShader);
    gl.deleteShader(fragShader);

    return program;
};

let baseVertex = 0;
let currentIndex = 0;
let quadTexture: WebGLTexture;
let lightMapTexture: WebGLTexture;
export const ambientColor = new Float32Array([0, 0, 0, 0]);

export const setLightMapTexture = (texture: WebGLTexture) => {
    lightMapTexture = texture;
};

const gl_program = createProgram(SHADER_VERTEX, SHADER_FRAGMENT);
const program: Program = {
    program: gl_program,
    u_mvp: gl.getUniformLocation(gl_program, SHADER_U_MVP),
    u_ambientColor: gl.getUniformLocation(gl_program, SHADER_U_AMBIENT_COLOR),
    u_tex0: gl.getUniformLocation(gl_program, SHADER_U_TEX),
    u_tex1: gl.getUniformLocation(gl_program, SHADER_U_TEX_1),

    a_position: gl.getAttribLocation(gl_program, SHADER_A_POSITION),
    a_texCoord: gl.getAttribLocation(gl_program, SHADER_A_TEX_COORD),
    a_colorMul: gl.getAttribLocation(gl_program, SHADER_A_COLOR_MUL),
    a_colorAdd: gl.getAttribLocation(gl_program, SHADER_A_COLOR_ADD),
};

interface DynamicBuffers {
    vb: WebGLBuffer;
    ib: WebGLBuffer;
}

const createIndexedBuffer = (
    vertexData: ArrayBufferLike,
    indexData: ArrayBufferLike,
    usage: GLint = GL.STREAM_DRAW,
) => ({
    vb: createBuffer(GL.ARRAY_BUFFER, vertexData, usage),
    ib: createBuffer(GL.ELEMENT_ARRAY_BUFFER, indexData, usage),
});

// dynamic buffer
const dynamicBuffers: DynamicBuffers[][] = [
    [createIndexedBuffer(vertexF32, indexData)],
    [createIndexedBuffer(vertexF32, indexData)],
    [createIndexedBuffer(vertexF32, indexData)],
    [createIndexedBuffer(vertexF32, indexData)],
];

let dynamicBufferIndex = 0;
let dynamicBufferFrame = 0;

export const completeFrame = () => {
    dynamicBufferIndex = 0;
    dynamicBufferFrame = (dynamicBufferFrame + 1) & 3;
};

const bindProgramBuffers = (program: Program, buffers: DynamicBuffers) => {
    gl.bindBuffer(GL.ARRAY_BUFFER, buffers.vb);
    gl.bindBuffer(GL.ELEMENT_ARRAY_BUFFER, buffers.ib);
    bindAttrib(program.a_position, 3, byteSize, 0, GL.FLOAT, false);
    bindAttrib(program.a_texCoord, 2, byteSize, 12, GL.FLOAT, false);
    bindAttrib(program.a_colorMul, 4, byteSize, 20, GL.UNSIGNED_BYTE, true);
    bindAttrib(program.a_colorAdd, 4, byteSize, 24, GL.UNSIGNED_BYTE, true);
};

export interface Texture {
    _texture?: WebGLTexture;
    _w: number;
    _h: number;
    // anchor
    _x: number;
    _y: number;
    // uv rect (stpq)
    _u0: number;
    _v0: number;
    _u1: number;
    _v1: number;
    _fbo?: WebGLFramebuffer;
    // mesh support
    _index0?: number;
    _triangles?: number;
    _vertex0?: number;
    _vertexCount?: number;
    _indices?: Uint16Array;
    _vertices?: Float32Array;
}

export const getSubTexture = (
    src: Texture,
    x: number,
    y: number,
    w: number,
    h: number,
    ax = 0.5,
    ay = 0.5,
): Texture => ({
    _texture: src._texture,
    _w: w,
    _h: h,
    _x: ax,
    _y: ay,
    _u0: x / src._w,
    _v0: y / src._h,
    _u1: w / src._w,
    _v1: h / src._h,
});

export const createTexture = (sizeOrWidth: number, height?: number): Texture => ({
    _texture: gl.createTexture(),
    _w: sizeOrWidth,
    _h: height ?? sizeOrWidth,
    _x: 0,
    _y: 0,
    _u0: 0,
    _v0: 0,
    _u1: 1,
    _v1: 1,
});

export const initFramebuffer = (texture: Texture) => {
    texture._fbo = gl.createFramebuffer();
    gl.bindFramebuffer(GL.FRAMEBUFFER, texture._fbo);
    gl.bindTexture(GL.TEXTURE_2D, texture._texture);
    gl.framebufferTexture2D(GL.FRAMEBUFFER, GL.COLOR_ATTACHMENT0, GL.TEXTURE_2D, texture._texture, 0);
};

export const uploadTexture = (texture: Texture, source?: TexImageSource, filter: GLint = GL.NEAREST): void => {
    gl.bindTexture(GL.TEXTURE_2D, texture._texture);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MAG_FILTER, filter);
    gl.texParameteri(GL.TEXTURE_2D, GL.TEXTURE_MIN_FILTER, filter);
    if (source) {
        gl.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, GL.RGBA, GL.UNSIGNED_BYTE, source);
    } else {
        gl.texImage2D(GL.TEXTURE_2D, 0, GL.RGBA, texture._w, texture._h, 0, GL.RGBA, GL.UNSIGNED_BYTE, null);
    }
};

export const emptyTexture = createTexture(4);
{
    const emptyC = createCanvas(4);
    emptyC.fillStyle = "#FFF";
    emptyC.fillRect(0, 0, 4, 4);
    uploadTexture(emptyTexture, emptyC.canvas);
}

// set projection and activate 0 texture level
export const setupProjection = (
    posX: number,
    posY: number,
    pivotX: number,
    pivotY: number,
    angle: number,
    scale: number,
    width: number,
    height: number,
) => {
    const x = posX - width * pivotX;
    const y = posY - height * pivotY;

    const c = scale * cos(angle);
    const s = scale * sin(angle);

    const w = 2 / width;
    const h = -2 / height;

    /*
    |   1 |    0| 0| 0|
    |   0 |    1| 0| 0|
    |   0 |    0| 1| 0|
    | at.x| at.y| 0| 1|
    x
    |  c| s| 0| 0|
    | -s| c| 0| 0|
    |  0| 0| 1| 0|
    |  0| 0| 0| 1|
    x
    |     1|     0| 0| 0|
    |     0|     1| 0| 0|
    |     0|     0| 1| 0|
    | -at.x| -at.y| 0| 1|
    x
    |     2/width|           0|        0| 0|
    |           0|   -2/height|        0| 0|
    |           0|           0| -1/depth| 0|
    | -2x/width-1| 2y/height+1|        0| 1|
    */
    const depth = 1e5;
    gl.uniformMatrix4fv(program.u_mvp, false, [
        c * w,
        s * h,
        0,
        0,
        -s * w,
        c * h,
        0,
        0,
        0,
        0,
        -1 / depth,
        0,
        (posX * (1 - c) + posY * s) * w - (2 * x) / width - 1,
        (posY * (1 - c) - posX * s) * h + (2 * y) / height + 1,
        0,
        1,
    ]);

    gl.uniform1i(program.u_tex0, 0);
    gl.uniform1i(program.u_tex1, 1);
    gl.uniform4fv(program.u_ambientColor, ambientColor);
};

export const beginRender = () => {
    gl.enable(GL.BLEND);
    gl.blendFunc(GL.ONE, GL.ONE_MINUS_SRC_ALPHA);
    gl.useProgram(program.program);
};

export const clear = (r: number, g: number, b: number, a: number) => {
    gl.clearColor(r, g, b, a);
    gl.clear(GL.COLOR_BUFFER_BIT);
};

export const beginRenderToTexture = (texture: Texture, scale: number) => {
    beginRender();
    const w = texture._w;
    const h = texture._h;
    setupProjection(0, 0, 0, 1, 0, 1.0 / scale, w, -h);
    gl.bindFramebuffer(GL.FRAMEBUFFER, texture._fbo);
    gl.viewport(0, 0, w, h);
    gl.scissor(0, 0, w, h);
};

export const setMVP = (m: Mat4) => gl.uniformMatrix4fv(program.u_mvp, false, m);

export const beginRenderToMain = (
    x: number,
    y: number,
    px: number,
    py: number,
    angle: number,
    scale: number,
    w = gl.drawingBufferWidth,
    h = gl.drawingBufferHeight,
) => {
    beginRender();
    setupProjection(x, y, px, py, angle, scale, w, h);
    gl.bindFramebuffer(GL.FRAMEBUFFER, null);
    gl.viewport(0, 0, w, h);
    gl.enable(GL.SCISSOR_TEST);
    gl.scissor(0, 0, w, h);
};

const nextDynamicBuffer = (): DynamicBuffers => {
    const streamBuffers = dynamicBuffers[dynamicBufferFrame];
    let dynamicBuffer = streamBuffers[dynamicBufferIndex++];
    if (!dynamicBuffer) {
        dynamicBuffer = createIndexedBuffer(vertexF32, indexData);
        streamBuffers.push(dynamicBuffer);
    }
    return dynamicBuffer;
};

export const flush = (_indicesCount = currentIndex) => {
    if (_indicesCount) {
        gl.activeTexture(GL.TEXTURE0);
        gl.bindTexture(GL.TEXTURE_2D, quadTexture);
        gl.activeTexture(GL.TEXTURE0 + 1);
        gl.bindTexture(GL.TEXTURE_2D, lightMapTexture);
        const streamBuffers = nextDynamicBuffer();
        bindProgramBuffers(program, streamBuffers);
        gl.bufferSubData(GL.ARRAY_BUFFER, 0, vertexF32.subarray(0, baseVertex * floatSize));
        gl.bufferSubData(GL.ELEMENT_ARRAY_BUFFER, 0, indexData.subarray(0, _indicesCount));
        gl.drawElements(GL.TRIANGLES, _indicesCount, GL.UNSIGNED_SHORT, 0);
        if (process.env.NODE_ENV === "development") {
            const err = gl.getError();
            if (err) {
                console.error("gl error");
            }
        }
        ++stats._frameDrawCalls;
        stats._frameTriangles += _indicesCount / 3;
        stats._frameVertices += baseVertex;
        currentIndex = 0;
        baseVertex = 0;
    }
};

export let drawZ = 0;
export const setDrawZ = (z: number) => (drawZ = z);

export const draw = (
    texture: Texture,
    x: number,
    y: number,
    r = 0,
    sx = 1,
    sy = 1,
    alpha = 1,
    color = 0xffffff,
    additive = 0,
    offset = 0,
) => {
    if (quadTexture != texture._texture || baseVertex + 4 >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }
    let i = baseVertex * floatSize;

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const colorAdd = (((additive * 0xff) << 24) | offset) >>> 0;

    // const anchorX = 0;
    // const anchorY = 0;
    const anchorX = texture._x;
    const anchorY = texture._y;
    const sizeX = texture._w * sx;
    const sizeY = texture._h * sy;
    // const cs = 1;
    const cs = cos(r);
    // const sn = 0;
    const sn = sin(r);
    const x0 = -anchorX * sizeX;
    // const x0 = 0;
    const x1 = x0 + sizeX;
    // const x1 =  sizeX;
    const y0 = -anchorY * sizeY;
    // const y0 = 0;
    const y1 = y0 + sizeY;
    // const y1 = sizeY;
    const u0 = texture._u0;
    const v0 = texture._v0;
    const u1 = u0 + texture._u1;
    const v1 = v0 + texture._v1;

    vertexF32[i++] = x0 * cs - y0 * sn + x;
    vertexF32[i++] = x0 * sn + y0 * cs + y;
    vertexF32[i++] = drawZ;
    vertexF32[i++] = u0;
    vertexF32[i++] = v0;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x1 * cs - y0 * sn + x;
    vertexF32[i++] = x1 * sn + y0 * cs + y;
    vertexF32[i++] = drawZ;
    vertexF32[i++] = u1;
    vertexF32[i++] = v0;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x1 * cs - y1 * sn + x;
    vertexF32[i++] = x1 * sn + y1 * cs + y;
    vertexF32[i++] = drawZ;
    vertexF32[i++] = u1;
    vertexF32[i++] = v1;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x0 * cs - y1 * sn + x;
    vertexF32[i++] = x0 * sn + y1 * cs + y;
    vertexF32[i++] = drawZ;
    vertexF32[i++] = u0;
    vertexF32[i++] = v1;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    indexData[currentIndex++] = baseVertex;
    indexData[currentIndex++] = baseVertex + 1;
    indexData[currentIndex++] = baseVertex + 2;
    indexData[currentIndex++] = baseVertex + 2;
    indexData[currentIndex++] = baseVertex + 3;
    indexData[currentIndex++] = baseVertex;

    baseVertex += 4;
};

export const drawBillboard = (
    texture: Texture,
    x: number,
    y: number,
    z: number,
    r = 0,
    sx = 1,
    sy = 1,
    alpha = 1,
    color = 0xffffff,
    additive = 0,
    offset = 0,
) => {
    if (quadTexture != texture._texture || baseVertex + 4 >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }
    let i = baseVertex * floatSize;

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const colorAdd = (((additive * 0xff) << 24) | offset) >>> 0;

    const anchorX = texture._x;
    const anchorY = texture._y;
    const sizeX = texture._w * sx;
    const sizeY = texture._h * sy;
    const cs = cos(r);
    const sn = sin(r);
    const x0 = -anchorX * sizeX;
    const x1 = x0 + sizeX;
    const y0 = -anchorY * sizeY;
    const y1 = y0 + sizeY;
    const u0 = texture._u0;
    const v0 = texture._v0;
    const u1 = u0 + texture._u1;
    const v1 = v0 + texture._v1;

    vertexF32[i++] = x0 * cs - y0 * sn + x;
    vertexF32[i++] = y;
    vertexF32[i++] = z - (x0 * sn + y0 * cs);
    // vertexF32[i++] = z - 10 * y0;
    //console.info(y0, y1, sizeY, texture.h_);
    vertexF32[i++] = u0;
    vertexF32[i++] = v0;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x1 * cs - y0 * sn + x;
    vertexF32[i++] = y;
    vertexF32[i++] = z - (x1 * sn + y0 * cs);
    // vertexF32[i++] = z - 10 * y0;
    vertexF32[i++] = u1;
    vertexF32[i++] = v0;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x1 * cs - y1 * sn + x;
    vertexF32[i++] = y;
    vertexF32[i++] = z - (x1 * sn + y1 * cs);
    // vertexF32[i++] = z - y1;
    vertexF32[i++] = u1;
    vertexF32[i++] = v1;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    vertexF32[i++] = x0 * cs - y1 * sn + x;
    vertexF32[i++] = y;
    vertexF32[i++] = z - (x0 * sn + y1 * cs);
    // vertexF32[i++] = z - y1;
    vertexF32[i++] = u0;
    vertexF32[i++] = v1;
    vertexU32[i++] = colorMul;
    vertexU32[i++] = colorAdd;

    indexData[currentIndex++] = baseVertex;
    indexData[currentIndex++] = baseVertex + 1;
    indexData[currentIndex++] = baseVertex + 2;
    indexData[currentIndex++] = baseVertex + 2;
    indexData[currentIndex++] = baseVertex + 3;
    indexData[currentIndex++] = baseVertex;

    baseVertex += 4;
};

export const drawMeshSpriteUp = (
    texture: Texture,
    x: number,
    y: number,
    z: number,
    r = 0,
    sx = 1,
    sy = 1,
    alpha = 1,
    color = 0xffffff,
    additive = 0,
    offset = 0,
) => {
    if (quadTexture != texture._texture || baseVertex + texture._vertexCount >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const colorAdd = (((additive * 0xff) << 24) | offset) >>> 0;

    const cs = cos(r);
    const sn = sin(r);
    const u0 = texture._u0;
    const v0 = texture._v0;
    const u1 = texture._u1;
    const v1 = texture._v1;

    const offsetX = -texture._x * texture._w;
    const offsetY = -texture._y * texture._h;
    let vi = texture._vertex0 * 2;
    let i = baseVertex * floatSize;
    for (let j = 0; j < texture._vertexCount; ++j) {
        const vx = texture._vertices[vi++];
        const vy = texture._vertices[vi++];
        const px = offsetX + vx;
        const py = offsetY + vy;
        vertexF32[i++] = x + (sx * px * cs - sy * py * sn);
        vertexF32[i++] = y;
        vertexF32[i++] = z - (sx * px * sn + sy * py * cs);
        vertexF32[i++] = u0 + (u1 * vx) / texture._w;
        vertexF32[i++] = v0 + (v1 * vy) / texture._h;
        vertexU32[i++] = colorMul;
        vertexU32[i++] = colorAdd;
    }

    let index = texture._index0;
    for (let i = 0; i < texture._triangles; ++i) {
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
    }

    baseVertex += texture._vertexCount;
};

export const drawMeshSprite = (
    texture: Texture,
    x: number,
    y: number,
    r = 0,
    sx = 1,
    sy = 1,
    alpha = 1,
    color = 0xffffff,
    additive = 0,
    offset = 0,
) => {
    if (quadTexture != texture._texture || baseVertex + texture._vertexCount >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const colorAdd = (((additive * 0xff) << 24) | offset) >>> 0;

    const cs = cos(r);
    const sn = sin(r);
    const u0 = texture._u0;
    const v0 = texture._v0;
    const u1 = texture._u1;
    const v1 = texture._v1;

    const offsetX = texture._x * texture._w;
    const offsetY = texture._y * texture._h;
    let vi = texture._vertex0 * 2;
    let i = baseVertex * floatSize;
    for (let j = 0; j < texture._vertexCount; ++j) {
        const vx = texture._vertices[vi++];
        const vy = texture._vertices[vi++];
        const px = vx - offsetX;
        const py = vy - offsetY;
        vertexF32[i++] = x + (sx * px * cs - sy * py * sn);
        vertexF32[i++] = y + (sx * px * sn + sy * py * cs);
        vertexF32[i++] = drawZ;
        vertexF32[i++] = u0 + (u1 * vx) / texture._w;
        vertexF32[i++] = v0 + (v1 * vy) / texture._h;
        vertexU32[i++] = colorMul;
        vertexU32[i++] = colorAdd;
    }

    let index = texture._index0;
    for (let i = 0; i < texture._triangles; ++i) {
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
        indexData[currentIndex++] = baseVertex + texture._indices[index++];
    }

    baseVertex += texture._vertexCount;
};

export const strokeCircle = (
    texture: Texture,
    x: number,
    y: number,
    r: number,
    dr: number,
    segments: number,
    sx: number,
    sy: number,
    alpha = 1,
    color = 0xffffff,
) => {
    if (quadTexture !== texture._texture || baseVertex + segments * 2 >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const u = texture._u0;
    const v = texture._v0;

    let i = baseVertex * floatSize;
    let a = 0;
    const da = PI2 / segments;
    for (let j = 0; j < segments; ++j) {
        const cs = sx * cos(a);
        const sn = sy * sin(a);

        vertexF32[i++] = x + (r + dr) * cs;
        vertexF32[i++] = y + (r + dr) * sn;
        vertexF32[i++] = drawZ;
        vertexF32[i++] = u;
        vertexF32[i++] = v;
        vertexU32[i++] = colorMul;
        vertexU32[i++] = 0;

        vertexF32[i++] = x + r * cs;
        vertexF32[i++] = y + r * sn;
        vertexF32[i++] = drawZ;
        vertexF32[i++] = u;
        vertexF32[i++] = v;
        vertexU32[i++] = colorMul;
        vertexU32[i++] = 0;

        a += da;
    }

    let index = baseVertex;
    for (let i = 1; i < segments; ++i) {
        indexData[currentIndex++] = index;
        indexData[currentIndex++] = index + 2;
        indexData[currentIndex++] = index + 3;
        indexData[currentIndex++] = index + 3;
        indexData[currentIndex++] = index + 1;
        indexData[currentIndex++] = index;
        index += 2;
    }
    indexData[currentIndex++] = index;
    indexData[currentIndex++] = baseVertex;
    indexData[currentIndex++] = baseVertex + 1;
    indexData[currentIndex++] = baseVertex + 1;
    indexData[currentIndex++] = index + 1;
    indexData[currentIndex++] = index;

    baseVertex += segments * 2;
};

export const fillCircle = (
    texture: Texture,
    x: number,
    y: number,
    r: number,
    segments: number,
    sx: number,
    sy: number,
    alpha = 1,
    color = 0xffffff,
) => {
    if (quadTexture !== texture._texture || baseVertex + segments >= batchVertexMax) {
        flush();
        quadTexture = texture._texture;
    }

    const colorMul = (((alpha * 0xff) << 24) | color) >>> 0;
    const u = texture._u0;
    const v = texture._v0;

    let i = baseVertex * floatSize;
    let a = 0;
    const da = PI2 / segments;
    for (let j = 0; j < segments; ++j) {
        const cs = sx * cos(a);
        const sn = sy * sin(a);
        vertexF32[i++] = x + r * cs;
        vertexF32[i++] = y + r * sn;
        vertexF32[i++] = drawZ;
        vertexF32[i++] = u;
        vertexF32[i++] = v;
        vertexU32[i++] = colorMul;
        vertexU32[i++] = 0;
        a += da;
    }

    let index = baseVertex + 1;
    for (let i = 2; i < segments; ++i) {
        indexData[currentIndex++] = baseVertex;
        indexData[currentIndex++] = index++;
        indexData[currentIndex++] = index;
    }
    baseVertex += segments;
};
