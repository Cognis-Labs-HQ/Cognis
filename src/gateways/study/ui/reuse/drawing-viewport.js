export function drawingViewport(canvas, columns) {
    const aspect = Math.max(1, columns ?? 1);
    const height = Math.min(canvas.height, canvas.width / aspect);
    const width = height * aspect;
    return {
        x: (canvas.width - width) / 2,
        y: (canvas.height - height) / 2,
        width,
        height,
    };
}
