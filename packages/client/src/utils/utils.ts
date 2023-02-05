export const getOrCreate = <K, T>(map: Map<K, T>, key: K, fn: (key: K) => T): T => {
    if (!map.has(key)) {
        map.set(key, fn(key));
    }
    return map.get(key);
};

/* @__PURE__ */
export const RGB = (r: number, g: number, b: number) => (r << 16) | (g << 8) | b;

/* @__PURE__ */
export const getLumaColor32 = (luma: number): number => RGB(luma, luma, luma);

/* @__PURE__ */
export const parseRGB = (color: string): number => {
    const len = color.length;
    if (len) {
        if (color.charAt(0) === "#") {
            if (color.length === 4) {
                return RGB(
                    parseInt(color.charAt(1), 16) * 0x11,
                    parseInt(color.charAt(2), 16) * 0x11,
                    parseInt(color.charAt(3), 16) * 0x11,
                );
            } else if (color.length === 7) {
                return RGB(
                    parseInt(color.slice(1, 3), 16),
                    parseInt(color.slice(3, 5), 16),
                    parseInt(color.slice(5, 7), 16),
                );
            }
        }
    }
    return 0;
};

/* @__PURE__ */
export const rgb_scale = (rgb: number, factor: number) =>
    RGB(factor * ((rgb >>> 16) & 0xff), factor * ((rgb >>> 8) & 0xff), factor * (rgb & 0xff));
