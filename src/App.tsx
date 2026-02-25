import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Brain, Download, Activity, ChevronUp, ChevronDown } from 'lucide-react';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { Preview } from './components/Preview';
import { useDepthEstimation } from './hooks/useDepthEstimation';
import { ViewMode, ModelDtype, ScalingMode, DepthData } from './types';

export default function App() {
  const [activeTab, setActiveTab] = useState<'sbs' | 'depth'>('sbs');
  const [hasFile, setHasFile] = useState(false);
  const [isVideo, setIsVideo] = useState(false);
  const [viewMode, setViewMode] = useState<ViewMode>('sbs');
  const [dtype, setDtype] = useState<ModelDtype>('fp32');
  const [strength, setStrength] = useState(20);
  const [scalingMode, setScalingMode] = useState<ScalingMode>('full');
  const [isProcessing, setIsProcessing] = useState(false);
  const [aiActive, setAiActive] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [batchProgress, setBatchProgress] = useState(0);
  const [isBatchProcessing, setIsBatchProcessing] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const bufferVideoRef = useRef<HTMLVideoElement>(null);
  const depthDataRef = useRef<DepthData | null>(null);
  const depthBufferRef = useRef<Map<string, DepthData>>(new Map());
  const isBufferingRef = useRef(false);
  
  // Reusable canvases for rendering performance
  const lCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const rCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const tempCanvasRef = useRef<HTMLCanvasElement | null>(null);
  
  const originalImageRef = useRef<HTMLImageElement | null>(null);
  const snapshotCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const wiggleFrameRef = useRef(0);
  const requestRef = useRef<number>(null);

  const [isMiniPreviewCollapsed, setIsMiniPreviewCollapsed] = useState(false);
  const miniDepthCanvasRef = useRef<HTMLCanvasElement>(null);

  const { run, status, progress, device, init } = useDepthEstimation();

  useEffect(() => {
    init(dtype);
  }, [dtype, init]);

  const handleFileUpload = (file: File) => {
    const isVid = file.type.startsWith('video/');
    
    // Reset all processing and playback states
    setIsVideo(isVid);
    setHasFile(true);
    setAiActive(false);
    setIsProcessing(false);
    setIsPlaying(false);
    setCurrentTime(0);
    setBatchProgress(0);
    setIsBatchProcessing(false);
    setIsMuted(true);
    depthBufferRef.current.clear();
    isBufferingRef.current = false;
    
    depthDataRef.current = null;
    wiggleFrameRef.current = 0;

    if (isVid) {
      if (videoRef.current) {
        videoRef.current.pause();
        const url = URL.createObjectURL(file);
        videoRef.current.src = url;
        videoRef.current.currentTime = 0;
        if (bufferVideoRef.current) {
          bufferVideoRef.current.src = url;
          bufferVideoRef.current.currentTime = 0;
        }
      }
    } else {
      const reader = new FileReader();
      reader.onload = (e) => {
        const img = new Image();
        img.onload = () => {
          originalImageRef.current = img;
          render();
        };
        img.src = e.target?.result as string;
      };
      reader.readAsDataURL(file);
    }
  };

  const getNeuralProxy = async (useBuffer = false) => {
    const source = useBuffer ? bufferVideoRef.current : (isVideo ? videoRef.current : originalImageRef.current);
    if (!source) return null;

    let sw, sh;
    if (useBuffer || (isVideo && source instanceof HTMLVideoElement)) {
      sw = (source as HTMLVideoElement).videoWidth;
      sh = (source as HTMLVideoElement).videoHeight;
    } else {
      sw = (source as HTMLImageElement).width;
      sh = (source as HTMLImageElement).height;
    }
    
    if (sw === 0) return null;
    
    if (!snapshotCanvasRef.current) {
      snapshotCanvasRef.current = document.createElement('canvas');
    }
    
    const scale = Math.min(1, 320 / sw);
    const width = Math.round(sw * scale);
    const height = Math.round(sh * scale);
    
    snapshotCanvasRef.current.width = width;
    snapshotCanvasRef.current.height = height;
    
    const ctx = snapshotCanvasRef.current.getContext('2d', { willReadFrequently: true });
    if (!ctx) return null;
    
    ctx.drawImage(source, 0, 0, width, height);
    return snapshotCanvasRef.current;
  };

  const renderDepthToMini = (depth: DepthData) => {
    if (!miniDepthCanvasRef.current) return;
    const canvas = miniDepthCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    canvas.width = depth.width;
    canvas.height = depth.height;
    const idata = ctx.createImageData(canvas.width, canvas.height);
    for (let i = 0; i < depth.data.length; ++i) {
      const val = depth.data[i];
      idata.data[i*4] = idata.data[i*4+1] = idata.data[i*4+2] = val;
      idata.data[i*4+3] = 255;
    }
    ctx.putImageData(idata, 0, 0);
  };

  const performAnalysis = async () => {
    if (status !== 'ready') return;
    setIsProcessing(true);
    try {
      const proxyCanvas = await getNeuralProxy();
      if (proxyCanvas) {
        const result = await run(proxyCanvas);
        if (result) {
          depthDataRef.current = result.depth as DepthData;
          renderDepthToMini(depthDataRef.current);
          render();
        }
      }
    } catch (err) {
      console.error('Analysis failed:', err);
    } finally {
      setIsProcessing(false);
    }
  };

  const toggleAi = () => {
    if (isVideo) {
      setAiActive(!aiActive);
    } else {
      performAnalysis();
    }
  };

  const render = useCallback(() => {
    const source = isVideo ? videoRef.current : originalImageRef.current;
    if (!source || !canvasRef.current) return;

    const sw = isVideo ? (source as HTMLVideoElement).videoWidth : (source as HTMLImageElement).width;
    const sh = isVideo ? (source as HTMLVideoElement).videoHeight : (source as HTMLImageElement).height;
    if (sw === 0) return;

    const previewScale = isBatchProcessing ? 1 : Math.min(1, 640 / sh);
    const w = Math.round(sw * previewScale);
    const h = Math.round(sh * previewScale);

    // Reuse or create Left Canvas
    if (!lCanvasRef.current) lCanvasRef.current = document.createElement('canvas');
    const lCanvas = lCanvasRef.current;
    if (lCanvas.width !== w || lCanvas.height !== h) {
      lCanvas.width = w; lCanvas.height = h;
    }
    const lCtx = lCanvas.getContext('2d', { willReadFrequently: true });
    if (!lCtx) return;
    lCtx.drawImage(source, 0, 0, w, h);

    // Reuse or create Right Canvas
    if (!rCanvasRef.current) rCanvasRef.current = document.createElement('canvas');
    const rCanvas = rCanvasRef.current;
    if (rCanvas.width !== w || rCanvas.height !== h) {
      rCanvas.width = w; rCanvas.height = h;
    }
    const rCtx = rCanvas.getContext('2d', { willReadFrequently: true });
    if (!rCtx) return;

    // Try to get depth from buffer first if video
    let currentDepth = depthDataRef.current;
    if (isVideo && videoRef.current) {
      const currentTime = videoRef.current.currentTime;
      const key = currentTime.toFixed(1);
      const buffered = depthBufferRef.current.get(key);
      
      if (buffered) {
        currentDepth = buffered;
      } else {
        // Find closest
        let minDiff = 0.5;
        for (const [tStr, data] of depthBufferRef.current) {
          const diff = Math.abs(parseFloat(tStr) - currentTime);
          if (diff < minDiff) {
            minDiff = diff;
            currentDepth = data;
          }
        }
      }
    }

    if (!currentDepth) {
      lCtx.drawImage(source, (strength * previewScale * 0.5), 0, w, h);
      rCtx.drawImage(source, -(strength * previewScale * 0.5), 0, w, h);
    } else {
      const srcData = lCtx.getImageData(0, 0, w, h);
      const outDataL = lCtx.createImageData(w, h);
      const outDataR = rCtx.createImageData(w, h);
      
      const depth = currentDepth.data;
      const dw = currentDepth.width;
      const dh = currentDepth.height;

      const yRatio = dh / h;
      const xRatio = dw / w;
      const src32 = new Uint32Array(srcData.data.buffer);
      const out32L = new Uint32Array(outDataL.data.buffer);
      const out32R = new Uint32Array(outDataR.data.buffer);
      
      out32L.set(src32);
      out32R.set(src32);
      
      // Total strength is split between both eyes
      const scaleFactor = strength * previewScale * 0.00392; // 1/255

      for (let y = 0; y < h; y++) {
        const dyOffset = Math.floor(y * yRatio) * dw;
        const rowOffset = y * w;
        for (let x = 0; x < w; x++) {
          const dx = (x * xRatio) | 0;
          const dVal = depth[dyOffset + dx];
          
          const totalShift = dVal * scaleFactor;
          const shiftL = (totalShift * 0.5) | 0;
          const shiftR = -(totalShift * 0.5) | 0;

          // Left eye warp
          let sxL = x + shiftL;
          if (sxL >= 0 && sxL < w) {
            out32L[rowOffset + x] = src32[rowOffset + sxL];
          }
          
          // Right eye warp
          let sxR = x + shiftR;
          if (sxR >= 0 && sxR < w) {
            out32R[rowOffset + x] = src32[rowOffset + sxR];
          }
        }
      }
      lCtx.putImageData(outDataL, 0, 0);
      rCtx.putImageData(outDataR, 0, 0);
    }

    const ctx = canvasRef.current.getContext('2d', { alpha: false });
    if (!ctx) return;

    if (viewMode === 'sbs' || viewMode === 'cross') {
      const drawL = (viewMode === 'sbs') ? lCanvas : rCanvas;
      const drawR = (viewMode === 'sbs') ? rCanvas : lCanvas;
      
      if (scalingMode === 'full') {
        canvasRef.current.width = w * 2; canvasRef.current.height = h;
        ctx.drawImage(drawL, 0, 0);
        ctx.drawImage(drawR, w, 0);
      } else {
        canvasRef.current.width = w; canvasRef.current.height = h;
        ctx.drawImage(drawL, 0, 0, w/2, h);
        ctx.drawImage(drawR, w/2, 0, w/2, h);
      }
    } else if (viewMode === 'wiggle') {
      canvasRef.current.width = w; canvasRef.current.height = h;
      wiggleFrameRef.current++;
      ctx.drawImage((wiggleFrameRef.current % 20 < 10) ? lCanvas : rCanvas, 0, 0);
    } else if (viewMode === 'anaglyph') {
      canvasRef.current.width = w; canvasRef.current.height = h;
      ctx.drawImage(lCanvas, 0, 0);
      ctx.globalCompositeOperation = "multiply"; 
      ctx.fillStyle = "red"; ctx.fillRect(0,0,w,h);
      ctx.globalCompositeOperation = "screen";
      
      if (!tempCanvasRef.current) tempCanvasRef.current = document.createElement('canvas');
      const temp = tempCanvasRef.current;
      if (temp.width !== w || temp.height !== h) {
        temp.width = w; temp.height = h;
      }
      const tCtx = temp.getContext('2d');
      if (tCtx) {
        tCtx.clearRect(0, 0, w, h);
        tCtx.drawImage(rCanvas, 0, 0); 
        tCtx.globalCompositeOperation = "multiply"; 
        tCtx.fillStyle = "cyan"; tCtx.fillRect(0,0,w,h);
        ctx.drawImage(temp, 0, 0);
      }
      ctx.globalCompositeOperation = "source-over";
    }
  }, [viewMode, strength, scalingMode, isVideo, isBatchProcessing]);

  // Separate buffer loop to avoid blocking the UI thread
  const bufferLoop = useCallback(async () => {
    if (!isVideo || !aiActive || status !== 'ready' || isBufferingRef.current || !videoRef.current) {
      return;
    }

    const currentTime = videoRef.current.currentTime;
    const bufferWindow = 5; 
    const step = 0.2; 
    const duration = videoRef.current.duration;
    
    let nextTime = -1;
    for (let t = currentTime; t < Math.min(currentTime + bufferWindow, duration); t += step) {
      if (!depthBufferRef.current.has(t.toFixed(1))) {
        nextTime = t;
        break;
      }
    }

    if (nextTime !== -1 && bufferVideoRef.current) {
      isBufferingRef.current = true;
      setIsProcessing(true);
      try {
        const bVideo = bufferVideoRef.current;
        await new Promise<void>((resolve) => {
          const onSeeked = () => {
            bVideo.removeEventListener('seeked', onSeeked);
            resolve();
          };
          bVideo.addEventListener('seeked', onSeeked);
          bVideo.currentTime = nextTime;
        });

        const proxyCanvas = await getNeuralProxy(true);
        if (proxyCanvas) {
          const res = await run(proxyCanvas);
          if (res) {
            const depthData = res.depth as DepthData;
            depthBufferRef.current.set(nextTime.toFixed(1), depthData);
            renderDepthToMini(depthData);
          }
        }
        
        // Cleanup old buffer entries
        if (depthBufferRef.current.size > 100) {
          for (const [key] of depthBufferRef.current) {
            if (parseFloat(key) < currentTime - 1) {
              depthBufferRef.current.delete(key);
            }
          }
        }
      } catch(e) {
        console.error('Buffering error:', e);
      } finally {
        isBufferingRef.current = false;
        setIsProcessing(false);
      }
    }
  }, [isVideo, aiActive, status, run]);

  const animate = useCallback(() => {
    if (isVideo || viewMode === 'wiggle') {
      render();
    }
    
    if (videoRef.current) {
      setCurrentTime(videoRef.current.currentTime);
    }
    
    requestRef.current = requestAnimationFrame(animate);
  }, [isVideo, viewMode, render]);

  useEffect(() => {
    requestRef.current = requestAnimationFrame(animate);
    return () => {
      if (requestRef.current) cancelAnimationFrame(requestRef.current);
    };
  }, [animate]);

  // Run buffer loop in the background
  useEffect(() => {
    let active = true;
    const runBuffer = async () => {
      while (active) {
        await bufferLoop();
        // Small delay to prevent tight loop when nothing to buffer
        await new Promise(r => setTimeout(r, 50));
      }
    };
    runBuffer();
    return () => { active = false; };
  }, [bufferLoop]);

  const startBatchExport = async () => {
    if (status !== 'ready' || !videoRef.current || isBatchProcessing) return;
    setIsBatchProcessing(true);
    setBatchProgress(0);
    
    const video = videoRef.current;
    video.pause();
    video.currentTime = 0;
    
    const total = video.duration;
    const fps = 24;
    const step = 1 / fps;
    const chunks: BlobPart[] = [];
    
    const canvas = canvasRef.current;
    if (!canvas) return;
    
    const stream = canvas.captureStream(fps);
    const mediaRecorder = new MediaRecorder(stream, { 
      mimeType: 'video/webm;codecs=vp9', 
      videoBitsPerSecond: 15000000 
    });
    
    mediaRecorder.ondataavailable = (e) => chunks.push(e.data);
    mediaRecorder.onstop = () => {
      const b = new Blob(chunks, { type: 'video/webm' });
      const a = document.createElement('a');
      a.href = URL.createObjectURL(b);
      a.download = `sbs_pro_export_${Date.now()}.webm`;
      a.click();
      setIsBatchProcessing(false);
    };
    
    mediaRecorder.start();
    
    while (video.currentTime < total) {
      await new Promise(resolve => {
        video.onseeked = resolve;
        video.currentTime = Math.min(total, video.currentTime + step);
      });
      
      const proxyCanvas = await getNeuralProxy();
      if (proxyCanvas) {
        const res = await run(proxyCanvas);
        if (res) {
          depthDataRef.current = res.depth as DepthData;
          renderDepthToMini(depthDataRef.current);
          render();
        }
      }
      
      setBatchProgress(Math.round((video.currentTime / total) * 100));
    }
    
    mediaRecorder.stop();
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-50 p-4 md:p-8 font-sans selection:bg-blue-500/30">
      <div className="max-w-7xl mx-auto space-y-8">
        <Header 
          activeTab={activeTab} 
          setActiveTab={setActiveTab} 
          status={status}
          device={device}
          progress={progress}
        />

        <main>
          {activeTab === 'sbs' ? (
            <div className="flex flex-col lg:flex-row gap-8">
              <Sidebar 
                onFileUpload={handleFileUpload}
                onProcess={toggleAi}
                onBatchExport={startBatchExport}
                viewMode={viewMode}
                setViewMode={setViewMode}
                dtype={dtype}
                setDtype={setDtype}
                strength={strength}
                setStrength={setStrength}
                scalingMode={scalingMode}
                setScalingMode={setScalingMode}
                isProcessing={isProcessing}
                isVideo={isVideo}
                aiActive={aiActive}
                hasFile={hasFile}
              >
                {hasFile && (
                  <div className="pt-4 border-t border-white/5">
                    <button 
                      onClick={() => setIsMiniPreviewCollapsed(!isMiniPreviewCollapsed)}
                      className="w-full flex justify-between items-center group mb-2"
                    >
                      <label className="text-[10px] uppercase font-bold text-purple-400 cursor-pointer group-hover:text-purple-300 tracking-tight">Neural Map Preview</label>
                      {isMiniPreviewCollapsed ? <ChevronDown className="w-3 h-3 text-purple-400" /> : <ChevronUp className="w-3 h-3 text-purple-400" />}
                    </button>
                    
                    <AnimatePresence>
                      {!isMiniPreviewCollapsed && (
                        <motion.div 
                          initial={{ height: 0, opacity: 0 }}
                          animate={{ height: 'auto', opacity: 1 }}
                          exit={{ height: 0, opacity: 0 }}
                          className="overflow-hidden"
                        >
                          <div className="glass p-1 rounded-lg bg-black/40 overflow-hidden border border-white/5 relative group">
                            <canvas ref={miniDepthCanvasRef} className="w-full h-auto opacity-80 block" />
                            {isProcessing && (
                              <div className="absolute inset-0 flex items-center justify-center bg-purple-500/10 backdrop-blur-[1px]">
                                <div className="flex items-center gap-2 px-2 py-1 bg-black/60 rounded-full border border-purple-500/30">
                                  <div className="w-1.5 h-1.5 bg-purple-500 rounded-full animate-pulse" />
                                  <span className="text-[8px] font-bold text-purple-400 uppercase tracking-tighter">Neural Buffering</span>
                                </div>
                              </div>
                            )}
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </div>
                )}
              </Sidebar>
              <Preview 
                canvasRef={canvasRef}
                videoRef={videoRef}
                isVideo={isVideo}
                isPlaying={isPlaying}
                togglePlay={() => {
                  if (videoRef.current) {
                    if (videoRef.current.paused) videoRef.current.play();
                    else videoRef.current.pause();
                    setIsPlaying(!videoRef.current.paused);
                  }
                }}
                currentTime={currentTime}
                duration={duration}
                hasFile={hasFile}
                isBatchProcessing={isBatchProcessing}
                batchProgress={batchProgress}
                aiActive={aiActive}
                isMuted={isMuted}
                toggleMute={() => {
                  if (videoRef.current) {
                    videoRef.current.muted = !videoRef.current.muted;
                    setIsMuted(videoRef.current.muted);
                  }
                }}
              />
            </div>
          ) : (
            <DepthInspector 
              depthData={depthDataRef.current}
              source={isVideo ? videoRef.current : originalImageRef.current}
              isVideo={isVideo}
            />
          )}
        </main>
      </div>

      <video 
        ref={videoRef}
        className="hidden"
        loop
        muted={isMuted}
        playsInline
        crossOrigin="anonymous"
        onLoadedMetadata={() => setDuration(videoRef.current?.duration || 0)}
      />

      <video 
        ref={bufferVideoRef}
        className="hidden"
        muted
        playsInline
        crossOrigin="anonymous"
      />
    </div>
  );
}

function DepthInspector({ depthData, source, isVideo }: { depthData: DepthData | null, source: any, isVideo: boolean }) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    if (depthData && canvasRef.current) {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      canvas.width = depthData.width;
      canvas.height = depthData.height;
      const idata = ctx.createImageData(canvas.width, canvas.height);
      for (let i = 0; i < depthData.data.length; ++i) {
        const val = depthData.data[i];
        idata.data[i*4] = idata.data[i*4+1] = idata.data[i*4+2] = val;
        idata.data[i*4+3] = 255;
      }
      ctx.putImageData(idata, 0, 0);
    }
  }, [depthData]);

  return (
    <div className="glass rounded-3xl p-8 max-w-5xl mx-auto border border-white/5 bg-slate-900/30">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold mb-2">Neural Map Inspector</h2>
        <p className="text-slate-400 text-sm">Grayscale depth mapping for technical calibration.</p>
      </div>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
        <div className="space-y-4">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Reference Frame</label>
          <div className="glass p-2 rounded-2xl relative bg-black/20 overflow-hidden border border-white/5">
            {isVideo ? (
              <video src={source?.src} className="w-full h-auto block" muted />
            ) : (
              <img src={source?.src} className="w-full h-auto block" />
            )}
          </div>
        </div>
        <div className="space-y-4">
          <label className="text-[10px] uppercase font-bold text-slate-500 tracking-widest">Depth Map Result</label>
          <div className="glass p-2 rounded-2xl relative bg-black/40 overflow-hidden border border-white/5">
            <canvas ref={canvasRef} className="w-full h-auto block" />
            {depthData && (
              <button 
                onClick={() => {
                  const a = document.createElement('a');
                  a.download = `depth_map_${Date.now()}.png`;
                  a.href = canvasRef.current?.toDataURL() || '';
                  a.click();
                }}
                className="absolute bottom-4 right-4 bg-slate-800/80 hover:bg-slate-700 p-2 rounded-xl border border-white/10 transition-colors"
              >
                <Download className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
