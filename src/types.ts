export type ViewMode = 'sbs' | 'cross' | 'wiggle' | 'anaglyph';
export type ModelDtype = 'fp32' | 'fp16' | 'q8';
export type ScalingMode = 'full' | 'sq';

export interface DepthData {
  width: number;
  height: number;
  data: Float32Array | Uint8Array;
}
