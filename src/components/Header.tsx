import { Cpu, Layers, Info } from 'lucide-react';
import { StatusBadge } from './StatusBadge';

interface HeaderProps {
  activeTab: 'sbs' | 'depth';
  setActiveTab: (tab: 'sbs' | 'depth') => void;
  status: 'idle' | 'loading' | 'ready' | 'error';
  device: string;
  progress: number;
  latency?: number;
}

export function Header({ activeTab, setActiveTab, status, device, progress, latency }: HeaderProps) {
  return (
    <header className="flex flex-col md:flex-row justify-between items-center gap-6 border-b border-white/10 pb-6">
      <div className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20">
          <Cpu className="w-7 h-7 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-white flex items-center gap-2">
            SBS <span className="text-blue-500">AI</span> PRO
          </h1>
          <div className="flex items-center gap-2">
            <p className="text-slate-500 text-[10px] uppercase tracking-[0.2em] font-bold">
              Stereoscopic Engineering Suite <span className="text-blue-900 ml-2">v5.0</span>
            </p>
            {latency !== undefined && latency > 0 && (
              <span className="text-[10px] font-mono text-emerald-500 bg-emerald-500/10 px-1.5 py-0.5 rounded border border-emerald-500/20">
                {latency}ms
              </span>
            )}
          </div>
        </div>
      </div>

      <nav className="flex gap-1 glass p-1 rounded-2xl border border-white/5 bg-slate-900/50">
        <button 
          onClick={() => setActiveTab('sbs')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'sbs' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
        >
          SBS Generator
        </button>
        <button 
          onClick={() => setActiveTab('depth')}
          className={`px-6 py-2 rounded-xl text-xs font-bold transition-all ${activeTab === 'depth' ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20' : 'text-slate-400 hover:text-slate-200'}`}
        >
          AI Depth Viewer
        </button>
      </nav>

      <StatusBadge status={status} device={device} progress={progress} />
    </header>
  );
}
