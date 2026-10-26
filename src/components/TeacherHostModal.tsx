import React, { useState } from 'react';
import {
  X,
  SlidersHorizontal,
  VolumeX,
  Lock,
  Unlock,
  Monitor,
  PenTool,
  Hand,
  Users,
  Download,
  Plus,
  HelpCircle,
  CheckCircle2,
} from 'lucide-react';
import { Participant, AttendanceRecord } from '../types';

interface TeacherHostModalProps {
  isOpen: boolean;
  onClose: () => void;
  isLocked: boolean;
  allowStudentScreenshare: boolean;
  allowStudentWhiteboard: boolean;
  participants: Participant[];
  attendanceLog: AttendanceRecord[];
  onMuteAll: () => void;
  onToggleLock: (locked: boolean) => void;
  onToggleStudentScreen: (allowed: boolean) => void;
  onToggleStudentWhiteboard: (allowed: boolean) => void;
  onLowerHand: (studentId: string) => void;
  onSpotlightStudent: (studentId: string) => void;
  onCreatePoll: (question: string, options: string[]) => void;
}

export const TeacherHostModal: React.FC<TeacherHostModalProps> = ({
  isOpen,
  onClose,
  isLocked,
  allowStudentScreenshare,
  allowStudentWhiteboard,
  participants,
  attendanceLog,
  onMuteAll,
  onToggleLock,
  onToggleStudentScreen,
  onToggleStudentWhiteboard,
  onLowerHand,
  onSpotlightStudent,
  onCreatePoll,
}) => {
  const [activeTab, setActiveTab] = useState<'controls' | 'hands' | 'roster' | 'newpoll'>('controls');

  // New poll form state
  const [pollQuestion, setPollQuestion] = useState('');
  const [pollOptions, setPollOptions] = useState(['', '', '']);

  if (!isOpen) return null;

  const raisedHands = participants.filter((p) => p.handRaised);

  const exportAttendanceCsv = () => {
    let csv = 'ID,Name,Role,Joined At,Status\n';
    attendanceLog.forEach((item) => {
      const joinStr = new Date(item.joinedAt).toLocaleTimeString();
      const status = item.leftAt ? `Left at ${new Date(item.leftAt).toLocaleTimeString()}` : 'Present';
      csv += `"${item.id}","${item.name}","${item.role}","${joinStr}","${status}"\n`;
    });

    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `cipherclass-attendance-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleLaunchPoll = (e: React.FormEvent) => {
    e.preventDefault();
    const validOptions = pollOptions.filter((o) => o.trim().length > 0);
    if (!pollQuestion.trim() || validOptions.length < 2) {
      alert('Please enter a question and at least 2 options.');
      return;
    }
    onCreatePoll(pollQuestion.trim(), validOptions);
    setPollQuestion('');
    setPollOptions(['', '', '']);
    setActiveTab('controls');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-xl rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-950/80 border border-blue-700/60 flex items-center justify-center text-blue-400">
              <SlidersHorizontal className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Teacher Host Controls</h3>
              <p className="text-xs text-slate-400">Manage classroom policies & student participation</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Navigation */}
        <div className="flex items-center gap-2 px-6 pt-3 border-b border-slate-800 bg-slate-900/50">
          <button
            onClick={() => setActiveTab('controls')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'controls'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Classroom Policies
          </button>
          <button
            onClick={() => setActiveTab('hands')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 flex items-center gap-1.5 transition-colors ${
              activeTab === 'hands'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            <span>Hand Queue</span>
            {raisedHands.length > 0 && (
              <span className="bg-amber-500 text-slate-950 text-[10px] font-bold px-1.5 rounded-full">
                {raisedHands.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('roster')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'roster'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Attendance Roster
          </button>
          <button
            onClick={() => setActiveTab('newpoll')}
            className={`pb-2.5 px-2 text-xs font-medium border-b-2 transition-colors ${
              activeTab === 'newpoll'
                ? 'border-blue-500 text-blue-400 font-semibold'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Create Quick Poll
          </button>
        </div>

        {/* Tab Contents */}
        <div className="p-6 overflow-y-auto flex-1">
          {activeTab === 'controls' && (
            <div className="space-y-4">
              {/* Mute All Action */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <VolumeX className="w-4 h-4 text-red-400" />
                    <span>Mute All Students</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Immediately silences all student microphones across the classroom.
                  </p>
                </div>
                <button
                  onClick={onMuteAll}
                  className="px-3.5 py-1.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs transition-colors shrink-0 shadow-md"
                >
                  Mute All
                </button>
              </div>

              {/* Lock Room Toggle */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    {isLocked ? <Lock className="w-4 h-4 text-amber-400" /> : <Unlock className="w-4 h-4 text-slate-400" />}
                    <span>Lock Classroom</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    {isLocked ? 'Classroom is locked. No new students can enter.' : 'Classroom is unlocked for scheduled students.'}
                  </p>
                </div>
                <button
                  onClick={() => onToggleLock(!isLocked)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-colors shrink-0 ${
                    isLocked
                      ? 'bg-amber-500 hover:bg-amber-600 text-slate-950 font-bold'
                      : 'bg-slate-800 hover:bg-slate-700 text-white'
                  }`}
                >
                  {isLocked ? 'Unlock' : 'Lock Room'}
                </button>
              </div>

              {/* Student Screen Sharing Policy */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <Monitor className="w-4 h-4 text-purple-400" />
                    <span>Student Screen Sharing</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Allow students to present their screen or homework assignments.
                  </p>
                </div>
                <button
                  onClick={() => onToggleStudentScreen(!allowStudentScreenshare)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-colors shrink-0 ${
                    allowStudentScreenshare
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {allowStudentScreenshare ? 'Allowed' : 'Blocked'}
                </button>
              </div>

              {/* Student Whiteboard Drawing Policy */}
              <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-white flex items-center gap-1.5">
                    <PenTool className="w-4 h-4 text-blue-400" />
                    <span>Student Whiteboard Interaction</span>
                  </h4>
                  <p className="text-[11px] text-slate-400 mt-0.5">
                    Permit students to draw and write equations on the interactive whiteboard.
                  </p>
                </div>
                <button
                  onClick={() => onToggleStudentWhiteboard(!allowStudentWhiteboard)}
                  className={`px-3.5 py-1.5 rounded-xl font-medium text-xs transition-colors shrink-0 ${
                    allowStudentWhiteboard
                      ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                      : 'bg-slate-800 hover:bg-slate-700 text-slate-400'
                  }`}
                >
                  {allowStudentWhiteboard ? 'Allowed' : 'Teacher Only'}
                </button>
              </div>
            </div>
          )}

          {activeTab === 'hands' && (
            <div className="space-y-3">
              {raisedHands.length === 0 ? (
                <div className="py-8 text-center text-slate-500">
                  <Hand className="w-8 h-8 text-slate-600 mx-auto mb-2 opacity-50" />
                  <p className="text-xs">No hands raised currently</p>
                </div>
              ) : (
                raisedHands.map((student) => (
                  <div
                    key={student.id}
                    className="p-3 rounded-xl bg-slate-950 border border-amber-500/30 flex items-center justify-between"
                  >
                    <div className="flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold text-xs">
                        <Hand className="w-4 h-4" />
                      </div>
                      <div>
                        <span className="text-xs font-semibold text-white block">{student.name}</span>
                        <span className="text-[10px] text-amber-400">Waiting to ask question</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onSpotlightStudent(student.id)}
                        className="px-2.5 py-1 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors"
                      >
                        Call On
                      </button>
                      <button
                        onClick={() => onLowerHand(student.id)}
                        className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs transition-colors"
                      >
                        Lower Hand
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {activeTab === 'roster' && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs text-slate-400">
                  Total participants recorded: <strong className="text-white">{attendanceLog.length}</strong>
                </span>
                <button
                  onClick={exportAttendanceCsv}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shadow-sm"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Export CSV</span>
                </button>
              </div>

              <div className="rounded-xl border border-slate-800 overflow-hidden">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-950 text-slate-400 border-b border-slate-800">
                    <tr>
                      <th className="p-2.5 font-medium">Student / Participant</th>
                      <th className="p-2.5 font-medium">Role</th>
                      <th className="p-2.5 font-medium">Joined</th>
                      <th className="p-2.5 font-medium text-right">Status</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800 bg-slate-900/60">
                    {attendanceLog.map((log, idx) => (
                      <tr key={idx} className="hover:bg-slate-800/40">
                        <td className="p-2.5 font-medium text-white">{log.name}</td>
                        <td className="p-2.5 text-slate-400 capitalize">{log.role}</td>
                        <td className="p-2.5 font-mono text-slate-400">
                          {new Date(log.joinedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </td>
                        <td className="p-2.5 text-right">
                          {log.leftAt ? (
                            <span className="text-slate-500">Left</span>
                          ) : (
                            <span className="text-emerald-400 font-medium">Present</span>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'newpoll' && (
            <form onSubmit={handleLaunchPoll} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-slate-200 block mb-1.5">
                  Quiz / Poll Question
                </label>
                <input
                  type="text"
                  value={pollQuestion}
                  onChange={(e) => setPollQuestion(e.target.value)}
                  placeholder="e.g., What happens to fringe spacing if wavelength is halved?"
                  className="w-full px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                />
              </div>

              <div className="space-y-2">
                <label className="text-xs font-semibold text-slate-200 block">
                  Answer Options
                </label>
                {pollOptions.map((opt, i) => (
                  <input
                    key={i}
                    type="text"
                    value={opt}
                    onChange={(e) => {
                      const updated = [...pollOptions];
                      updated[i] = e.target.value;
                      setPollOptions(updated);
                    }}
                    placeholder={`Option ${i + 1}`}
                    className="w-full px-3 py-1.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500"
                  />
                ))}
                <button
                  type="button"
                  onClick={() => setPollOptions([...pollOptions, ''])}
                  className="text-xs text-blue-400 hover:text-blue-300 flex items-center gap-1 mt-1"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Add another option</span>
                </button>
              </div>

              <div className="pt-2">
                <button
                  type="submit"
                  className="w-full py-2.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs transition-colors shadow-md"
                >
                  Launch Poll to Classroom
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
};
