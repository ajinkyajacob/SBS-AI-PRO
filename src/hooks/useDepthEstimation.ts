import { useState, useCallback, useRef } from 'react';
import { pipeline, env, RawImage, type DepthEstimationPipeline } from '@huggingface/transformers';

// Configure transformers.js to match original working setup
env.allowLocalModels = false;
env.backends.onnx.wasm.proxy = true; 
env.backends.onnx.wasm.numThreads = 1;

export function useDepthEstimation() {
  const pipeRef = useRef<DepthEstimationPipeline | null>(null);
  const [status, setStatus] = useState<'idle' | 'loading' | 'ready' | 'error'>('idle');
  const [progress, setProgress] = useState(0);
  const [device, setDevice] = useState('wasm');

  const init = useCallback(async (dtype: string = 'fp32') => {
    setStatus('loading');
    setProgress(0);
    try {
      let currentDevice = 'wasm';
      if ('gpu' in navigator) {
        try {
          const adapter = await (navigator.gpu as any).requestAdapter();
          if (adapter) currentDevice = 'webgpu';
        } catch (e) {}
      }
      setDevice(currentDevice);

      const newPipe = await pipeline('depth-estimation', 'onnx-community/depth-anything-v2-small', {
        device: currentDevice as any,
        dtype: dtype as any,
        progress_callback: (p: any) => {
          if (p.status === 'progress') {
            setProgress(Math.round(p.progress));
          }
        }
      });

      pipeRef.current = newPipe;
      setStatus('ready');
    } catch (err) {
      console.error('Failed to initialize depth pipeline:', err);
      setStatus('error');
    }
  }, []);

  const run = useCallback(async (canvas: HTMLCanvasElement) => {
    if (!pipeRef.current) return null;
    try {
      // Use RawImage.fromCanvas as in the original code
      const rawImg = await RawImage.fromCanvas(canvas);
      return await pipeRef.current(rawImg);
    } catch (err) {
      console.error('Inference error:', err);
      return null;
    }
  }, []);

  return { run, status, progress, device, init };
}
