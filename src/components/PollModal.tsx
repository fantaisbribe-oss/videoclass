import React from 'react';
import { X, CheckCircle, BarChart3, HelpCircle, Lock } from 'lucide-react';
import { Poll, UserRole } from '../types';

interface PollModalProps {
  isOpen: boolean;
  onClose: () => void;
  poll: Poll | null;
  currentUserId: string;
  currentUserRole: UserRole;
  onVote: (optionId: string) => void;
  onClosePoll: () => void;
}

export const PollModal: React.FC<PollModalProps> = ({
  isOpen,
  onClose,
  poll,
  currentUserId,
  currentUserRole,
  onVote,
  onClosePoll,
}) => {
  if (!isOpen || !poll) return null;

  const userVote = poll.voters[currentUserId];
  const hasVoted = Boolean(userVote);

  const totalVotes = poll.options.reduce((acc, opt) => acc + opt.votes, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-md rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-cyan-950/80 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
              <BarChart3 className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-xs font-bold text-white">Live Classroom Poll</h3>
              <p className="text-[10px] text-slate-400">Created by {poll.createdBy}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 space-y-4">
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800">
            <h4 className="text-sm font-semibold text-white leading-relaxed">
              {poll.question}
            </h4>
          </div>

          <div className="space-y-2.5">
            {poll.options.map((option) => {
              const isSelected = userVote === option.id;
              const percent = totalVotes > 0 ? Math.round((option.votes / totalVotes) * 100) : 0;

              return (
                <div
                  key={option.id}
                  onClick={() => !poll.isClosed && onVote(option.id)}
                  className={`relative overflow-hidden p-3 rounded-xl border transition-all ${
                    poll.isClosed
                      ? 'cursor-default border-slate-800 bg-slate-950'
                      : 'cursor-pointer hover:border-blue-500/80 bg-slate-950'
                  } ${
                    isSelected
                      ? 'border-blue-500 bg-blue-950/30 ring-1 ring-blue-500'
                      : 'border-slate-800'
                  }`}
                >
                  {/* Progress bar fill */}
                  {(hasVoted || currentUserRole === 'teacher' || poll.isClosed) && (
                    <div
                      style={{ width: `${percent}%` }}
                      className={`absolute inset-y-0 left-0 transition-all duration-300 opacity-20 ${
                        isSelected ? 'bg-blue-500' : 'bg-slate-500'
                      }`}
                    />
                  )}

                  <div className="relative flex items-center justify-between text-xs z-10">
                    <span className={`font-medium ${isSelected ? 'text-white' : 'text-slate-200'}`}>
                      {option.text}
                    </span>
                    {(hasVoted || currentUserRole === 'teacher' || poll.isClosed) && (
                      <span className="font-mono text-slate-400 tabular-nums font-semibold">
                        {percent}% ({option.votes})
                      </span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="flex items-center justify-between pt-2 text-xs text-slate-400">
            <span>
              Total responses: <strong className="text-white font-mono tabular-nums">{totalVotes}</strong>
            </span>
            {poll.isClosed ? (
              <span className="text-amber-400 font-medium">Poll Closed</span>
            ) : (
              <span className="text-emerald-400 flex items-center gap-1 font-medium">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Live
              </span>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex items-center justify-between">
          {currentUserRole === 'teacher' && !poll.isClosed ? (
            <button
              onClick={onClosePoll}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-medium transition-colors"
            >
              Close Poll
            </button>
          ) : (
            <div />
          )}

          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  );
};
