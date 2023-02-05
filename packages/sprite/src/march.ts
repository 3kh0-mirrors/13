import {vec2, Vec2, vec2_eq} from "./vec2";
import {lerp, midLerp} from "./scalar";

export interface BB {
    l: number;
    b: number;
    r: number;
    t: number;
}

type MarchSampleFunc = (point: Vec2, data: ImageData) => number;
type MarchSegmentFunc = (v0: Vec2, v1: Vec2, data: object) => void;

type MarchCellFunc = (
    t: number,
    a: number,
    b: number,
    c: number,
    d: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    segment: MarchSegmentFunc,
    segment_data: object,
) => void;

// TODO should flip this around eventually.
const seg = (v0: Vec2, v1: Vec2, f: MarchSegmentFunc, data: object) => {
    if (!vec2_eq(v0, v1)) f(v1, v0, data);
};

// TODO should flip this around eventually.
const segs = (a: Vec2, b: Vec2, c: Vec2, f: MarchSegmentFunc, data: object) => {
    seg(b, c, f, data);
    seg(a, b, f, data);
};

// The looping and sample caching code is shared between cpMarchHard() and cpMarchSoft().
const marchCells = (
    bb: BB,
    x_samples: number,
    y_samples: number,
    t: number,
    segment: MarchSegmentFunc,
    segment_data: object,
    sample: MarchSampleFunc,
    sample_data: ImageData,
    cell: MarchCellFunc,
) => {
    x_samples = Math.ceil(x_samples);
    y_samples = Math.ceil(y_samples);
    const x_denom = 1.0 / (x_samples - 1);
    const y_denom = 1.0 / (y_samples - 1);

    // TODO range assertions and short circuit for 0 sized windows.

    // Keep a copy of the previous row to avoid double lookups.
    const buffer = new Float32Array(x_samples);
    for (let i = 0; i < x_samples; ++i) buffer[i] = sample(vec2(lerp(bb.l, bb.r, i * x_denom), bb.b), sample_data);

    for (let j = 0; j < y_samples - 1; ++j) {
        const y0 = lerp(bb.b, bb.t, (j + 0) * y_denom);
        const y1 = lerp(bb.b, bb.t, (j + 1) * y_denom);

        let a = 0.0;
        let b = buffer[0];
        let c = 0.0;
        let d = sample(vec2(bb.l, y1), sample_data);
        buffer[0] = d;

        for (let i = 0; i < x_samples - 1; ++i) {
            const x0 = lerp(bb.l, bb.r, (i + 0) * x_denom);
            const x1 = lerp(bb.l, bb.r, (i + 1) * x_denom);

            a = b;
            b = buffer[i + 1];
            c = d;
            d = sample(vec2(x1, y1), sample_data);
            buffer[i + 1] = d;

            cell(t, a, b, c, d, x0, x1, y0, y1, segment, segment_data);
        }
    }
};
const marchCellSoft = (
    t: number,
    a: number,
    b: number,
    c: number,
    d: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    segment: MarchSegmentFunc,
    segment_data: any,
) => {
    // TODO this switch part is super expensive, can it be NEONized?
    switch (
        (((a > t) as any as number) << 0) |
        (((b > t) as any as number) << 1) |
        (((c > t) as any as number) << 2) |
        (((d > t) as any as number) << 3)
    ) {
        case 0x1:
            seg(vec2(x0, midLerp(y0, y1, a, c, t)), vec2(midLerp(x0, x1, a, b, t), y0), segment, segment_data);
            break;
        case 0x2:
            seg(vec2(midLerp(x0, x1, a, b, t), y0), vec2(x1, midLerp(y0, y1, b, d, t)), segment, segment_data);
            break;
        case 0x3:
            seg(vec2(x0, midLerp(y0, y1, a, c, t)), vec2(x1, midLerp(y0, y1, b, d, t)), segment, segment_data);
            break;
        case 0x4:
            seg(vec2(midLerp(x0, x1, c, d, t), y1), vec2(x0, midLerp(y0, y1, a, c, t)), segment, segment_data);
            break;
        case 0x5:
            seg(vec2(midLerp(x0, x1, c, d, t), y1), vec2(midLerp(x0, x1, a, b, t), y0), segment, segment_data);
            break;
        case 0x6:
            seg(vec2(midLerp(x0, x1, a, b, t), y0), vec2(x1, midLerp(y0, y1, b, d, t)), segment, segment_data);
            seg(vec2(midLerp(x0, x1, c, d, t), y1), vec2(x0, midLerp(y0, y1, a, c, t)), segment, segment_data);
            break;
        case 0x7:
            seg(vec2(midLerp(x0, x1, c, d, t), y1), vec2(x1, midLerp(y0, y1, b, d, t)), segment, segment_data);
            break;
        case 0x8:
            seg(vec2(x1, midLerp(y0, y1, b, d, t)), vec2(midLerp(x0, x1, c, d, t), y1), segment, segment_data);
            break;
        case 0x9:
            seg(vec2(x0, midLerp(y0, y1, a, c, t)), vec2(midLerp(x0, x1, a, b, t), y0), segment, segment_data);
            seg(vec2(x1, midLerp(y0, y1, b, d, t)), vec2(midLerp(x0, x1, c, d, t), y1), segment, segment_data);
            break;
        case 0xa:
            seg(vec2(midLerp(x0, x1, a, b, t), y0), vec2(midLerp(x0, x1, c, d, t), y1), segment, segment_data);
            break;
        case 0xb:
            seg(vec2(x0, midLerp(y0, y1, a, c, t)), vec2(midLerp(x0, x1, c, d, t), y1), segment, segment_data);
            break;
        case 0xc:
            seg(vec2(x1, midLerp(y0, y1, b, d, t)), vec2(x0, midLerp(y0, y1, a, c, t)), segment, segment_data);
            break;
        case 0xd:
            seg(vec2(x1, midLerp(y0, y1, b, d, t)), vec2(midLerp(x0, x1, a, b, t), y0), segment, segment_data);
            break;
        case 0xe:
            seg(vec2(midLerp(x0, x1, a, b, t), y0), vec2(x0, midLerp(y0, y1, a, c, t)), segment, segment_data);
            break;
        default:
            break; // 0x0 and 0xF
    }
};

const marchCellHard = (
    t: number,
    a: number,
    b: number,
    c: number,
    d: number,
    x0: number,
    x1: number,
    y0: number,
    y1: number,
    segment: MarchSegmentFunc,
    segment_data: object,
) => {
    // midpoints
    const xm = lerp(x0, x1, 0.5);
    const ym = lerp(y0, y1, 0.5);

    switch (
        (((a > t) as unknown as number) << 0) |
        (((b > t) as unknown as number) << 1) |
        (((c > t) as unknown as number) << 2) |
        (((d > t) as unknown as number) << 3)
    ) {
        case 0x1:
            segs(vec2(x0, ym), vec2(xm, ym), vec2(xm, y0), segment, segment_data);
            break;
        case 0x2:
            segs(vec2(xm, y0), vec2(xm, ym), vec2(x1, ym), segment, segment_data);
            break;
        case 0x3:
            seg(vec2(x0, ym), vec2(x1, ym), segment, segment_data);
            break;
        case 0x4:
            segs(vec2(xm, y1), vec2(xm, ym), vec2(x0, ym), segment, segment_data);
            break;
        case 0x5:
            seg(vec2(xm, y1), vec2(xm, y0), segment, segment_data);
            break;
        case 0x6:
            segs(vec2(xm, y0), vec2(xm, ym), vec2(x0, ym), segment, segment_data);
            segs(vec2(xm, y1), vec2(xm, ym), vec2(x1, ym), segment, segment_data);
            break;
        case 0x7:
            segs(vec2(xm, y1), vec2(xm, ym), vec2(x1, ym), segment, segment_data);
            break;
        case 0x8:
            segs(vec2(x1, ym), vec2(xm, ym), vec2(xm, y1), segment, segment_data);
            break;
        case 0x9:
            segs(vec2(x1, ym), vec2(xm, ym), vec2(xm, y0), segment, segment_data);
            segs(vec2(x0, ym), vec2(xm, ym), vec2(xm, y1), segment, segment_data);
            break;
        case 0xa:
            seg(vec2(xm, y0), vec2(xm, y1), segment, segment_data);
            break;
        case 0xb:
            segs(vec2(x0, ym), vec2(xm, ym), vec2(xm, y1), segment, segment_data);
            break;
        case 0xc:
            seg(vec2(x1, ym), vec2(x0, ym), segment, segment_data);
            break;
        case 0xd:
            segs(vec2(x1, ym), vec2(xm, ym), vec2(xm, y0), segment, segment_data);
            break;
        case 0xe:
            segs(vec2(xm, y0), vec2(xm, ym), vec2(x0, ym), segment, segment_data);
            break;
        default:
            break; // 0x0 and 0xF
    }
};

export const marchSoft = (
    bb: BB,
    x_samples: number,
    y_samples: number,
    t: number,
    segment: MarchSegmentFunc,
    segment_data: object,
    sample: MarchSampleFunc,
    sample_data: ImageData,
) => {
    marchCells(bb, x_samples, y_samples, t, segment, segment_data, sample, sample_data, marchCellSoft);
};

export const marchHard = (
    bb: BB,
    x_samples: number,
    y_samples: number,
    t: number,
    segment: MarchSegmentFunc,
    segment_data: object,
    sample: MarchSampleFunc,
    sample_data: ImageData,
) => {
    marchCells(bb, x_samples, y_samples, t, segment, segment_data, sample, sample_data, marchCellHard);
};
