const canvas = document.getElementById('mandelbrotCanvas');
const ctx = canvas.getContext('2d');
const statusEl = document.getElementById('status');

// UI Elements
const iterationsSlider = document.getElementById('iterations');
const iterationsValue = document.getElementById('iterationsValue');
const resolutionSlider = document.getElementById('resolution');
const resolutionValue = document.getElementById('resolutionValue');
const downloadBtn = document.getElementById('downloadBtn');
const resetBtn = document.getElementById('resetBtn');

// Mandelbrot state
let state = {
    centerX: new Decimal(-0.5),
    centerY: new Decimal(0),
    zoom: new Decimal(4.0)
};

let worker = new Worker('mandelbrot_worker.js');
let isRendering = false;

function requestRender(isDownload = false) {
    if (isRendering) {
        worker.terminate(); // Stop the current render if a new one is requested
        worker = new Worker('mandelbrot_worker.js');
        setupWorkerListener();
    }
    isRendering = true;
    statusEl.textContent = 'Rendering...';
    statusEl.style.color = '#61dafb';

    const resolutionScale = isDownload ? 1 : parseFloat(resolutionSlider.value);
    const renderWidth = Math.floor(canvas.width * resolutionScale);
    const renderHeight = Math.floor(canvas.height * resolutionScale);

    // Dynamically calculate precision based on zoom
    const precision = Math.max(30, Math.ceil(state.zoom.abs().log().neg().div(Math.log(10)).toNumber()) + 15);

    worker.postMessage({
        width: renderWidth,
        height: renderHeight,
        centerX: state.centerX.toString(),
        centerY: state.centerY.toString(),
        zoom: state.zoom.toString(),
        maxIterations: parseInt(iterationsSlider.value),
        precision: precision
    });
}

function setupWorkerListener() {
    worker.onmessage = (e) => {
        const { imageData, width, height } = e.data;

        const offscreenCanvas = new OffscreenCanvas(width, height);
        offscreenCanvas.getContext('2d').putImageData(imageData, 0, 0);

        ctx.imageSmoothingEnabled = false; // Keep it sharp when scaling up
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        ctx.drawImage(offscreenCanvas, 0, 0, canvas.width, canvas.height);

        isRendering = false;
        statusEl.textContent = 'Ready';
        statusEl.style.color = '#999';
    };
}

// --- Event Listeners ---
iterationsSlider.addEventListener('input', () => { iterationsValue.textContent = iterationsSlider.value; });
iterationsSlider.addEventListener('change', () => requestRender());

resolutionSlider.addEventListener('input', () => {
    resolutionValue.textContent = `${parseFloat(resolutionSlider.value).toFixed(2)}x`;
    requestRender();
});

canvas.addEventListener('click', (e) => {
    const rect = canvas.getBoundingClientRect();
    const x = new Decimal(e.clientX - rect.left);
    const y = new Decimal(e.clientY - rect.top);

    state.centerX = state.centerX.plus(x.div(canvas.width).minus(0.5).times(state.zoom));
    state.centerY = state.centerY.plus(y.div(canvas.height).minus(0.5).times(state.zoom));
    state.zoom = state.zoom.times(0.5); // Zoom in by 50%

    requestRender();
});

resetBtn.addEventListener('click', () => {
    state = { centerX: new Decimal(-0.5), centerY: new Decimal(0), zoom: new Decimal(4.0) };
    iterationsSlider.value = 150;
    iterationsValue.textContent = '150';
    resolutionSlider.value = 0.5;
    resolutionValue.textContent = '0.50x';
    requestRender();
});

downloadBtn.addEventListener('click', () => {
    statusEl.textContent = 'Rendering full quality for download...';
    const originalOnMessage = worker.onmessage;

    worker.onmessage = (e) => {
        const { imageData, width, height } = e.data;
        const tempCanvas = new OffscreenCanvas(width, height);
        tempCanvas.getContext('2d').putImageData(imageData, 0, 0);

        tempCanvas.convertToBlob().then(blob => {
            const link = document.createElement('a');
            link.download = `mandelbrot-${Date.now()}.png`;
            link.href = URL.createObjectURL(blob);
            link.click();
            URL.revokeObjectURL(link.href);

            statusEl.textContent = 'Ready';
            worker.onmessage = originalOnMessage; // Restore original listener
            requestRender(); // Re-render at screen resolution
        });
    };

    requestRender(true);
});

// Initial setup
setupWorkerListener();
requestRender();
