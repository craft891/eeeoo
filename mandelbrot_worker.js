importScripts('https://cdn.jsdelivr.net/npm/decimal.js/decimal.min.js');

self.onmessage = (e) => {
    const { width, height, centerX, centerY, zoom, maxIterations, precision } = e.data;

    Decimal.set({ precision: precision });

    const imageData = new ImageData(width, height);
    const zoomD = new Decimal(zoom);
    const centerXD = new Decimal(centerX);
    const centerYD = new Decimal(centerY);

    for (let px = 0; px < width; px++) {
        for (let py = 0; py < height; py++) {
            const real = centerXD.plus(new Decimal(px / width - 0.5).times(zoomD));
            const imag = centerYD.plus(new Decimal(py / height - 0.5).times(zoomD));

            let zReal = new Decimal(0);
            let zImag = new Decimal(0);
            let n = 0;

            while (n < maxIterations) {
                const zReal2 = zReal.times(zReal);
                const zImag2 = zImag.times(zImag);

                if (zReal2.plus(zImag2).greaterThan(4)) break;

                const newZReal = zReal2.minus(zImag2).plus(real);
                zImag = zReal.times(zImag).times(2).plus(imag);
                zReal = newZReal;
                n++;
            }

            const i = (py * width + px) * 4;
            const color = n === maxIterations ? [0, 0, 0] : hslToRgb(Math.sqrt(n / maxIterations), 1, 0.5);

            imageData.data[i] = color[0];
            imageData.data[i + 1] = color[1];
            imageData.data[i + 2] = color[2];
            imageData.data[i + 3] = 255;
        }
    }
    self.postMessage({ imageData, width, height }, [imageData.data.buffer]);
};

function hslToRgb(h, s, l) {
    let r, g, b;
    if (s === 0) {
        r = g = b = l;
    } else {
        const hue2rgb = (p, q, t) => {
            if (t < 0) t += 1;
            if (t > 1) t -= 1;
            if (t < 1 / 6) return p + (q - p) * 6 * t;
            if (t < 1 / 2) return q;
            if (t < 2 / 3) return p + (q - p) * (2 / 3 - t) * 6;
            return p;
        };
        const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
        const p = 2 * l - q;
        r = hue2rgb(p, q, h + 1 / 3);
        g = hue2rgb(p, q, h);
        b = hue2rgb(p, q, h - 1 / 3);
    }
    return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}
