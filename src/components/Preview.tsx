import { Play, Pause, Clock, Cpu, Layers, Volume2, VolumeX, Maximize2 } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { RefObject } from 'react';
import { formatTime } from '../utils';

interface PreviewProps {
  canvasRef: RefObject<HTMLCanvasElement | null>;
  videoRef: RefObject<HTMLVideoElement | null>;
  isVideo: boolean;
  isPlaying: boolean;
  togglePlay: () => void;
  currentTime: number;
  duration: number;
  hasFile: boolean;
  isBatchProcessing: boolean;
  batchProgress: number;
  aiActive: boolean;
  isMuted: boolean;
  toggleMute: () => void;
}

export function Preview({
  canvasRef,
  videoRef,
  isVideo,
  isPlaying,
  togglePlay,
  currentTime,
  duration,
  hasFile,
  isBatchProcessing,
  batchProgress,
  aiActive,
  isMuted,
  toggleMute
}: PreviewProps) {
  const handleFullScreen = () => {
    if (canvasRef.current) {
      if (canvasRef.current.requestFullscreen) {
        canvasRef.current.requestFullscreen();
      }
    }
  };

  return (
    <div className="flex-1 space-y-6 min-w-0">
      <div className="glass rounded-3xl p-4 min-h-[500px] flex flex-col items-center justify-center relative overflow-hidden border border-white/5 bg-slate-950/50">
        <AnimatePresence>
          {isBatchProcessing && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 flex flex-col items-center justify-center bg-slate-950/90 backdrop-blur-md px-12 text-center"
            >
              <div className="w-12 h-12 border-4 border-blue-500/20 border-t-blue-500 rounded-full animate-spin mb-6" />
              <h3 className="text-xl font-bold mb-2 text-white">Batch Export Active</h3>
              <div className="w-full max-w-md space-y-2">
                <div className="flex justify-between text-xs text-blue-400 font-bold uppercase tracking-wider">
                  <span>Rendering Frames</span>
                  <span>{batchProgress}%</span>
                </div>
                <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
                  <div 
                    className="h-full bg-blue-500 transition-all duration-300" 
                    style={{ width: `${batchProgress}%` }}
                  />
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {aiActive && (
          <div className="absolute top-8 right-8 z-20 flex items-center gap-2 bg-purple-500/20 text-purple-400 border border-purple-500/40 backdrop-blur-md px-3 py-1.5 rounded-full shadow-lg animate-pulse">
            <Cpu className="w-3 h-3" />
            <span className="text-[10px] font-bold uppercase tracking-tighter">Neural Processing</span>
          </div>
        )}

        {hasFile && (
          <button 
            onClick={handleFullScreen}
            className="absolute top-8 left-8 z-20 p-2 rounded-xl bg-slate-900/50 hover:bg-slate-800 text-slate-400 border border-white/5 transition-all"
            title="Full Screen"
          >
            <Maximize2 className="w-4 h-4" />
          </button>
        )}

        {!hasFile ? (
          <div className="text-slate-600 italic text-sm flex flex-col items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-900 flex items-center justify-center border border-white/5">
              <Layers className="w-8 h-8 text-slate-700" />
            </div>
            <span>Waiting for source media...</span>
          </div>
        ) : (
          <canvas 
            ref={canvasRef}
            id="preview-canvas"
            className="max-w-full max-h-[70vh] object-contain rounded-2xl shadow-2xl shadow-black/50"
          />
        )}
        
        {isVideo && hasFile && (
          <div className="absolute bottom-6 left-6 right-6 flex items-center gap-4 glass p-3 rounded-2xl border border-white/10 bg-slate-900/80 backdrop-blur-md">
            <button 
              onClick={togglePlay}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-blue-600 hover:bg-blue-500 text-white transition-all shadow-lg shadow-blue-500/20"
            >
              {isPlaying ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 fill-current" />}
            </button>

            <button 
              onClick={toggleMute}
              className="w-10 h-10 flex items-center justify-center rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-all border border-white/5"
            >
              {isMuted ? <VolumeX className="w-5 h-5" /> : <Volume2 className="w-5 h-5" />}
            </button>

            <div className="flex-1 space-y-1">
              <div className="h-1 bg-slate-800 rounded-full overflow-hidden">
                <div 
                  className="h-full bg-blue-500" 
                  style={{ width: `${(currentTime / duration) * 100}%` }}
                />
              </div>
              <div className="flex justify-between text-[10px] font-mono text-slate-400">
                <span>{formatTime(currentTime)}</span>
                <span>{formatTime(duration)}</span>
              </div>
            </div>
          </div>
        )}
      </div>
      
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard label="Source Resolution" value={hasFile ? `${videoRef.current?.videoWidth || 0}x${videoRef.current?.videoHeight || 0} px` : '-'} />
        <StatCard label="Output Resolution" value={hasFile ? 'Dynamic' : '-'} />
        <StatCard label="Process Mode" value={aiActive ? 'Neural DIBR' : 'Parallel Shift'} />
        <StatCard label="Engine Status" value={aiActive ? 'Active' : 'Standby'} />
      </div>
    </div>
  );
}

function StatCard({ label, value }: { label: string, value: string }) {
  return (
    <div className="glass p-4 rounded-2xl border border-white/5 space-y-1">
      <p className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">{label}</p>
      <p className="text-sm font-mono text-slate-200">{value}</p>
    </div>
  );
}
