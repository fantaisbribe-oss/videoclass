import React from 'react';
import { ShieldCheck, Lock, Users, Radio } from 'lucide-react';
import { MainViewMode, UserRole } from '../types';

interface TopBarProps {
  roomName: string;
  roomId: string;
  userRole: UserRole;
  userName: string;
  activeView: MainViewMode;
  onViewChange: (view: MainViewMode) => void;
  onOpenSecurity: () => void;
  onOpenHostTools?: () => void;
  participantCount: number;
  isLocked: boolean;
}

export const TopBar: React.FC<TopBarProps> = ({
  roomName,
  roomId,
  userRole,
  userName,
  activeView,
  onViewChange,
  onOpenSecurity,
  onOpenHostTools,
  participantCount,
  isLocked,
}) => {
  return (
    <header className="flex items-center justify-between gap-8 px-6 py-3.5 bg-slate-900/90 border-b border-slate-800 backdrop-blur-md z-30 select-none">
      {/* Zone 1: Wordmark Brand */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="w-8 h-8 rounded-lg bg-blue-600 flex items-center justify-center shadow-lg shadow-blue-500/20 text-white font-bold text-base">
          C
        </div>
        <div>
          <span className="text-base font-bold tracking-tight text-white whitespace-nowrap block">
            CipherClass
          </span>
          <div className="flex items-center gap-1.5 text-xs text-slate-400">
            <span className="truncate max-w-[200px]">{roomName}</span>
            <span aria-hidden="true">·</span>
            <span className="font-mono text-slate-400">#{roomId}</span>
          </div>
        </div>
      </div>

      {/* Zone 2: Navigation Links / Stage Switchers */}
      <nav className="hidden md:flex items-center gap-1 p-1 bg-slate-950/70 border border-slate-800/80 rounded-xl">
        <button
          onClick={() => onViewChange('stage')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeView === 'stage'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Class Stage
        </button>
        <button
          onClick={() => onViewChange('whiteboard')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeView === 'whiteboard'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Interactive Whiteboard
        </button>
        <button
          onClick={() => onViewChange('document')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeView === 'document'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Lesson Notes
        </button>
        <button
          onClick={() => onViewChange('screenshare')}
          className={`px-3.5 py-1.5 text-xs font-medium rounded-lg transition-colors whitespace-nowrap ${
            activeView === 'screenshare'
              ? 'bg-blue-600 text-white shadow-sm'
              : 'text-slate-300 hover:text-white hover:bg-slate-800/60'
          }`}
        >
          Screen Share
        </button>
      </nav>

      {/* Zone 3: Primary Action & Status */}
      <div className="flex items-center gap-3 shrink-0">
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-300 bg-slate-800/60 px-2.5 py-1.5 rounded-lg border border-slate-700/50">
          <Users className="w-3.5 h-3.5 text-slate-400" />
          <span className="font-mono tabular-nums">{participantCount}</span>
          <span className="text-slate-500">online</span>
          {isLocked && (
            <span className="flex items-center gap-1 text-amber-400 ml-1">
              <Lock className="w-3 h-3" />
              Locked
            </span>
          )}
        </div>

        <button
          onClick={onOpenSecurity}
          className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium text-emerald-300 bg-emerald-950/60 hover:bg-emerald-900/60 border border-emerald-800/60 rounded-lg transition-colors whitespace-nowrap"
          title="Click to inspect AES-256-GCM End-to-End Encryption"
        >
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>E2EE Active</span>
        </button>
      </div>
    </header>
  );
};
