import { Brain, Cpu, Activity, Info } from 'lucide-react';

interface StatusBadgeProps {
  status: 'idle' | 'loading' | 'ready' | 'error';
  device: string;
  progress: number;
}

export function StatusBadge({ status, device, progress }: StatusBadgeProps) {
  const getStatusColor = () => {
    switch (status) {
      case 'ready': return 'bg-emerald-500';
      case 'loading': return 'bg-yellow-500';
      case 'error': return 'bg-red-500';
      default: return 'bg-slate-500';
    }
  };

  return (
    <div className="flex items-center gap-4">
      {status === 'loading' && (
        <div className="flex items-center gap-2">
          <div className="w-32 h-1 bg-slate-800 rounded-full overflow-hidden">
            <div 
              className="h-full bg-blue-500 transition-all duration-300" 
              style={{ width: `${progress}%` }}
            />
          </div>
          <span className="text-[10px] font-mono text-slate-400">{progress}%</span>
        </div>
      )}
      <div className="glass px-3 py-1.5 rounded-full flex items-center gap-2 border border-white/5 text-[10px] uppercase tracking-wider font-medium">
        <span className={`w-1.5 h-1.5 rounded-full ${getStatusColor()} ${status === 'loading' ? 'animate-pulse' : ''}`} />
        <span className="text-slate-300">
          {status === 'loading' ? `Initializing ${device.toUpperCase()}...` : 
           status === 'ready' ? `Engine: ${device.toUpperCase()}` : 
           status === 'error' ? 'Engine Error' : 'Engine Offline'}
        </span>
      </div>
    </div>
  );
}
