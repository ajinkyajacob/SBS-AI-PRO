import { Upload, Brain, Download, Layers, Maximize, Minimize, Film } from 'lucide-react';
import { ViewMode, ModelDtype, ScalingMode } from '../types';
import { ReactNode } from 'react';

interface SidebarProps {
  onFileUpload: (file: File) => void;
  onProcess: () => void;
  onBatchExport: () => void;
  viewMode: ViewMode;
  setViewMode: (mode: ViewMode) => void;
  dtype: ModelDtype;
  setDtype: (dtype: ModelDtype) => void;
  strength: number;
  setStrength: (val: number) => void;
  scalingMode: ScalingMode;
  setScalingMode: (mode: ScalingMode) => void;
  isProcessing: boolean;
  isVideo: boolean;
  aiActive: boolean;
  hasFile: boolean;
  children?: ReactNode;
}

export function Sidebar({
  onFileUpload,
  onProcess,
  onBatchExport,
  viewMode,
  setViewMode,
  dtype,
  setDtype,
  strength,
  setStrength,
  scalingMode,
  setScalingMode,
  isProcessing,
  isVideo,
  aiActive,
  hasFile,
  children
}: SidebarProps) {
  return (
    <aside className="w-full lg:w-80 space-y-4 shrink-0">
      <div className="glass rounded-2xl p-5 space-y-6 border border-white/5">
        <div 
          onClick={() => document.getElementById('file-input')?.click()}
          className="border-2 border-dashed border-slate-700 rounded-xl p-6 text-center cursor-pointer hover:border-blue-500 hover:bg-white/5 transition-all group"
        >
          <input 
            type="file" 
            id="file-input" 
            className="hidden" 
            accept="image/*,video/*"
            onChange={(e) => e.target.files?.[0] && onFileUpload(e.target.files[0])}
          />
          <Upload className="w-8 h-8 text-slate-500 mb-2 mx-auto group-hover:text-blue-400 transition-colors" />
          <p className="text-xs text-slate-400 font-medium">Select Source Media</p>
        </div>

        {hasFile && (
          <div className="space-y-5 animate-in fade-in slide-in-from-top-4 duration-500">
            <button 
              onClick={onProcess}
              disabled={isProcessing}
              className="w-full btn-ai py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 shadow-lg shadow-blue-500/20 bg-blue-600 hover:bg-blue-500 disabled:opacity-50 transition-all"
            >
              {isProcessing ? (
                <div className="w-4 h-4 border-2 border-white/20 border-t-white rounded-full animate-spin" />
              ) : (
                <Brain className="w-4 h-4" />
              )}
              <span>{isVideo ? (aiActive ? 'Stop AI Analysis' : 'Analyze Depth') : 'Analyze Depth'}</span>
            </button>

            <div className="space-y-4 pt-4 border-t border-white/5">
              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Output Format</label>
                <select 
                  value={viewMode}
                  onChange={(e) => setViewMode(e.target.value as ViewMode)}
                  className="w-full bg-slate-900/50 text-slate-200 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none cursor-pointer focus:border-blue-500/50 transition-colors"
                >
                  <option value="sbs">Side-by-Side (Parallel)</option>
                  <option value="cross">Cross-Eye (L/R Swap)</option>
                  <option value="wiggle">Wiggle 3D (Anim)</option>
                  <option value="anaglyph">Anaglyph (Red/Cyan)</option>
                </select>
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Model Precision</label>
                <select 
                  value={dtype}
                  onChange={(e) => setDtype(e.target.value as ModelDtype)}
                  className="w-full bg-slate-900/50 text-slate-200 border border-white/10 rounded-lg px-3 py-2 text-xs outline-none cursor-pointer focus:border-blue-500/50 transition-colors"
                >
                  <option value="fp32">FP32 (High Quality)</option>
                  <option value="fp16">FP16 (Fast/WebGPU)</option>
                  <option value="q8">Q8 (Low Memory)</option>
                </select>
              </div>

              <div className="space-y-2">
                <div className="flex justify-between text-[10px] uppercase font-bold text-slate-500 tracking-wider">
                  <label>Depth Strength</label>
                  <span className="text-blue-400">{strength}px</span>
                </div>
                <input 
                  type="range" 
                  min="-50" 
                  max="50" 
                  value={strength}
                  onChange={(e) => setStrength(parseInt(e.target.value))}
                  className="w-full accent-blue-500 h-1 bg-slate-800 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-2">
                <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Process Mode</label>
                <div className="flex bg-slate-900/50 p-1 rounded-xl border border-white/5">
                  <button 
                    onClick={() => setScalingMode('full')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scalingMode === 'full' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Full Aspect
                  </button>
                  <button 
                    onClick={() => setScalingMode('sq')}
                    className={`flex-1 py-1.5 rounded-lg text-[10px] font-bold transition-all ${scalingMode === 'sq' ? 'bg-blue-600 text-white shadow-sm' : 'text-slate-500 hover:text-slate-300'}`}
                  >
                    Squeezed
                  </button>
                </div>
              </div>
            </div>

            {children}

            <div className="space-y-2 pt-4 border-t border-white/5">
              <button 
                onClick={() => {
                  const canvas = document.getElementById('preview-canvas') as HTMLCanvasElement;
                  if (canvas) {
                    const a = document.createElement('a');
                    a.download = `sbs_render_${Date.now()}.png`;
                    a.href = canvas.toDataURL();
                    a.click();
                  }
                }}
                className="w-full bg-slate-800 hover:bg-slate-700 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-white/5"
              >
                <Download className="w-4 h-4" />
                <span>Save Result</span>
              </button>
              
              {isVideo && (
                <button 
                  onClick={onBatchExport}
                  className="w-full bg-emerald-900/50 hover:bg-emerald-800/50 text-emerald-400 py-3 rounded-xl text-xs font-bold flex items-center justify-center gap-2 transition-all border border-emerald-500/20"
                >
                  <Film className="w-4 h-4" />
                  <span>Start Batch Render</span>
                </button>
              )}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
}
