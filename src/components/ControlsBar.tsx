import React, { useState } from 'react';
import {
  Mic,
  MicOff,
  Video,
  VideoOff,
  Monitor,
  Hand,
  MessageSquare,
  Smile,
  ShieldCheck,
  Settings,
  PhoneOff,
  LayoutGrid,
  FileText,
  Edit3,
  SlidersHorizontal,
} from 'lucide-react';
import { MainViewMode, UserRole } from '../types';

interface ControlsBarProps {
  isMuted: boolean;
  isCameraOff: boolean;
  isScreenSharing: boolean;
  handRaised: boolean;
  userRole: UserRole;
  activeView: MainViewMode;
  chatOpen: boolean;
  unreadCount: number;
  raisedHandsCount: number;
  onToggleMic: () => void;
  onToggleCamera: () => void;
  onToggleScreenShare: () => void;
  onToggleHand: () => void;
  onToggleChat: () => void;
  onViewChange: (view: MainViewMode) => void;
  onOpenSecurity: () => void;
  onOpenHostTools?: () => void;
  onOpenPoll?: () => void;
  onSendReaction: (emoji: string) => void;
  onLeaveCall: () => void;
}

export const ControlsBar: React.FC<ControlsBarProps> = ({
  isMuted,
  isCameraOff,
  isScreenSharing,
  handRaised,
  userRole,
  activeView,
  chatOpen,
  unreadCount,
  raisedHandsCount,
  onToggleMic,
  onToggleCamera,
  onToggleScreenShare,
  onToggleHand,
  onToggleChat,
  onViewChange,
  onOpenSecurity,
  onOpenHostTools,
  onOpenPoll,
  onSendReaction,
  onLeaveCall,
}) => {
  const [showReactions, setShowReactions] = useState(false);
  const emojis = ['👍', '👏', '💡', '❤️', '🙋‍♂️', '🔥', '✨'];

  return (
    <div className="relative flex items-center justify-center py-3 px-6 bg-slate-900/95 border-t border-slate-800/80 backdrop-blur-xl z-20 select-none">
      {/* Reaction Popover */}
      {showReactions && (
        <div className="absolute -top-14 left-1/2 -translate-x-1/2 flex items-center gap-1.5 p-2 bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl backdrop-blur-md animate-in fade-in slide-in-from-bottom-2 duration-150">
          {emojis.map((emoji) => (
            <button
              key={emoji}
              onClick={() => {
                onSendReaction(emoji);
                setShowReactions(false);
              }}
              className="text-xl p-1.5 hover:scale-125 transition-transform rounded-xl hover:bg-slate-800"
            >
              {emoji}
            </button>
          ))}
        </div>
      )}

      {/* Main Glass Control Dock */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Audio Mic Toggle */}
        <button
          onClick={onToggleMic}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            isMuted
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
          }`}
          title={isMuted ? 'Unmute Microphone' : 'Mute Microphone'}
        >
          {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
          <span className="hidden md:inline">{isMuted ? 'Muted' : 'Mute'}</span>
        </button>

        {/* Video Camera Toggle */}
        <button
          onClick={onToggleCamera}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            isCameraOff
              ? 'bg-red-500/20 text-red-400 border border-red-500/40 hover:bg-red-500/30'
              : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
          }`}
          title={isCameraOff ? 'Turn On Camera' : 'Turn Off Camera'}
        >
          {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-blue-400" />}
          <span className="hidden md:inline">{isCameraOff ? 'Start Video' : 'Stop Video'}</span>
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        {/* Screen Share Toggle */}
        <button
          onClick={onToggleScreenShare}
          className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            isScreenSharing
              ? 'bg-purple-600 text-white shadow-lg shadow-purple-500/20'
              : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Share Screen"
        >
          <Monitor className="w-4 h-4" />
          <span className="hidden md:inline">{isScreenSharing ? 'Sharing' : 'Share'}</span>
        </button>

        {/* Raise Hand (Student) or Hand Queue (Teacher) */}
        {userRole === 'student' ? (
          <button
            onClick={onToggleHand}
            className={`flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              handRaised
                ? 'bg-amber-500 text-slate-950 font-bold shadow-lg shadow-amber-500/20'
                : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
            }`}
            title="Raise Hand to Ask Question"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden md:inline">{handRaised ? 'Hand Raised' : 'Raise Hand'}</span>
          </button>
        ) : (
          <button
            onClick={onOpenHostTools}
            className={`relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
              raisedHandsCount > 0
                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 hover:bg-amber-500/30'
                : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
            }`}
            title="Review Hand Raising Queue"
          >
            <Hand className="w-4 h-4" />
            <span className="hidden md:inline">Hand Queue</span>
            {raisedHandsCount > 0 && (
              <span className="bg-amber-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full text-[10px] tabular-nums">
                {raisedHandsCount}
              </span>
            )}
          </button>
        )}

        {/* Quick Reactions */}
        <button
          onClick={() => setShowReactions(!showReactions)}
          className="p-2.5 rounded-xl bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700 text-xs transition-colors"
          title="Send Reaction"
        >
          <Smile className="w-4 h-4 text-amber-400" />
        </button>

        <div className="h-6 w-px bg-slate-800 mx-1" />

        {/* Teacher Host Control Panel */}
        {userRole === 'teacher' && onOpenHostTools && (
          <button
            onClick={onOpenHostTools}
            className="flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl bg-blue-950/80 hover:bg-blue-900/80 text-blue-300 border border-blue-700/60 text-xs font-semibold transition-colors"
            title="Instructor Host Controls"
          >
            <SlidersHorizontal className="w-4 h-4" />
            <span className="hidden lg:inline">Host Controls</span>
          </button>
        )}

        {/* Quick Poll / Quiz */}
        {onOpenPoll && (
          <button
            onClick={onOpenPoll}
            className="flex items-center gap-1.5 px-3 py-2.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 border border-slate-700/60 text-xs font-medium transition-colors"
            title="Classroom Polls & Quizzes"
          >
            <span className="w-2 h-2 rounded-full bg-cyan-400" />
            <span className="hidden sm:inline">Poll</span>
          </button>
        )}

        {/* Encrypted Chat Button */}
        <button
          onClick={onToggleChat}
          className={`relative flex items-center gap-1.5 px-3.5 py-2.5 rounded-xl font-medium text-xs transition-all ${
            chatOpen
              ? 'bg-blue-600 text-white'
              : 'bg-slate-800 text-slate-100 border border-slate-700/60 hover:bg-slate-700'
          }`}
          title="Encrypted Classroom Chat"
        >
          <MessageSquare className="w-4 h-4" />
          <span className="hidden sm:inline">Chat</span>
          {unreadCount > 0 && !chatOpen && (
            <span className="absolute -top-1 -right-1 bg-blue-500 text-white font-bold px-1.5 py-0.2 rounded-full text-[10px] tabular-nums">
              {unreadCount}
            </span>
          )}
        </button>

        {/* End Call / Leave Button */}
        <button
          onClick={onLeaveCall}
          className="flex items-center gap-1.5 px-4 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-semibold shadow-lg shadow-red-600/30 transition-colors ml-2"
          title="Leave Virtual Classroom"
        >
          <PhoneOff className="w-4 h-4" />
          <span className="hidden sm:inline">Leave</span>
        </button>
      </div>
    </div>
  );
};
