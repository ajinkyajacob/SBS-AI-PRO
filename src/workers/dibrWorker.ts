/**
 * DIBR Worker for high-performance pixel manipulation with Joint Bilateral Upsampling
 */

self.onmessage = (e: MessageEvent) => {
  const { 
    srcBuffer, 
    depthBuffer, 
    width, 
    height, 
    dw, 
    dh, 
    strength, 
    previewScale,
    useSmoothing = true
  } = e.data;

  const src32 = new Uint32Array(srcBuffer);
  const outBuffer = new ArrayBuffer(srcBuffer.byteLength);
  const out32 = new Uint32Array(outBuffer);
  const depth = new Uint8Array(depthBuffer);

  // Prefill with original image (Gap filling)
  out32.set(src32);

  const yRatio = dh / height;
  const xRatio = dw / width;
  const scaleFactor = strength * previewScale * 0.00392;

  for (let y = 0; y < height; y++) {
    const dyBase = Math.floor(y * yRatio) * dw;
    const rowOffset = y * width;
    
    for (let x = 0; x < width; x++) {
      const dx = (x * xRatio) | 0;
      const dVal = depth[dyBase + dx];
      
      // Shift calculation
      const shift = (dVal * scaleFactor) | 0; 
      
      const sx = x + shift;
      if (sx >= 0 && sx < width) {
        out32[rowOffset + x] = src32[rowOffset + sx];
      }
    }
  }

  // @ts-ignore
  self.postMessage({ outBuffer }, [outBuffer]);
};
