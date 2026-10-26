import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Send,
  Lock,
  ShieldCheck,
  Paperclip,
  Code2,
  FileCheck,
  Info,
} from 'lucide-react';
import { ChatMessage, UserRole } from '../types';

interface ChatDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  messages: ChatMessage[];
  onSendMessage: (text: string) => void;
  currentUserId: string;
  currentUserRole: UserRole;
}

export const ChatDrawer: React.FC<ChatDrawerProps> = ({
  isOpen,
  onClose,
  messages,
  onSendMessage,
  currentUserId,
  currentUserRole,
}) => {
  const [inputText, setInputText] = useState('');
  const [inspectMessageId, setInspectMessageId] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isOpen) {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  if (!isOpen) return null;

  const handleSend = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) return;
    onSendMessage(inputText.trim());
    setInputText('');
  };

  const handleQuickQuestion = () => {
    onSendMessage('Professor, could you clarify the constructive interference formula on line 3?');
  };

  return (
    <div className="w-80 sm:w-96 h-full flex flex-col bg-slate-900 border-l border-slate-800 shadow-2xl z-20 select-none">
      {/* Drawer Header */}
      <div className="flex items-center justify-between px-4 py-3.5 border-b border-slate-800 bg-slate-900/90 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <div className="w-6 h-6 rounded-md bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-emerald-400">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-white">Classroom Chat</h3>
            <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-mono">
              AES-256-GCM E2EE Active
            </span>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Security Banner */}
      <div className="px-4 py-2 bg-emerald-950/40 border-b border-emerald-900/30 flex items-start gap-2">
        <Lock className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
        <p className="text-[11px] text-emerald-300/90 leading-tight">
          Messages are encrypted on your device. The server only routes raw ciphertext.
        </p>
      </div>

      {/* Chat Messages List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3.5 select-text">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-slate-500">
            <ShieldCheck className="w-10 h-10 text-slate-600 mb-2 stroke-1" />
            <p className="text-xs text-slate-400 font-medium">No messages yet</p>
            <p className="text-[11px] text-slate-500 mt-1">
              All messages sent here are encrypted end-to-end between students and teachers.
            </p>
            <button
              onClick={handleQuickQuestion}
              className="mt-4 px-3 py-1.5 text-xs text-blue-400 bg-blue-950/50 hover:bg-blue-900/50 border border-blue-800/50 rounded-lg transition-colors"
            >
              Ask quick question
            </button>
          </div>
        ) : (
          messages.map((msg) => {
            const isMe = msg.senderId === currentUserId;
            const isInspecting = inspectMessageId === msg.id;

            return (
              <div
                key={msg.id}
                className={`flex flex-col ${isMe ? 'items-end' : 'items-start'} group`}
              >
                <div className="flex items-center gap-1.5 mb-1 px-1 text-[11px]">
                  <span className={`font-semibold ${msg.senderRole === 'teacher' ? 'text-amber-400' : 'text-slate-300'}`}>
                    {msg.senderName}
                  </span>
                  {msg.senderRole === 'teacher' && (
                    <span className="text-[9px] bg-blue-950 border border-blue-800 text-blue-300 px-1 rounded">
                      Teacher
                    </span>
                  )}
                  <span className="text-slate-500 font-mono">
                    {new Date(msg.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>

                <div
                  className={`relative max-w-[85%] rounded-2xl px-3.5 py-2 text-xs shadow-sm ${
                    isMe
                      ? 'bg-blue-600 text-white rounded-tr-sm'
                      : 'bg-slate-800 text-slate-100 rounded-tl-sm border border-slate-700/60'
                  }`}
                >
                  <p className="leading-relaxed whitespace-pre-wrap">{msg.text}</p>

                  <div className="mt-1 flex items-center justify-between gap-2 text-[10px] opacity-75">
                    <span className="flex items-center gap-0.5 text-emerald-300">
                      <Lock className="w-2.5 h-2.5" />
                      E2EE
                    </span>
                    {msg.wireSample && (
                      <button
                        onClick={() => setInspectMessageId(isInspecting ? null : msg.id)}
                        className="hover:underline flex items-center gap-0.5 text-slate-300 font-mono"
                        title="View Raw Ciphertext Packet"
                      >
                        <Code2 className="w-2.5 h-2.5" />
                        {isInspecting ? 'Hide wire' : 'Wire'}
                      </button>
                    )}
                  </div>
                </div>

                {/* Wire Ciphertext Inspector Dropdown */}
                {isInspecting && msg.wireSample && (
                  <div className="mt-1.5 p-2 bg-slate-950 border border-slate-800 rounded-lg text-[10px] font-mono text-slate-400 max-w-full overflow-x-auto shadow-inner">
                    <div className="text-emerald-400 mb-1 font-semibold flex items-center gap-1">
                      <ShieldCheck className="w-3 h-3" />
                      Raw Packet Transmitted to Server:
                    </div>
                    <div>
                      <span className="text-slate-500">IV: </span>
                      <span className="text-cyan-400">{msg.wireSample.iv}</span>
                    </div>
                    <div>
                      <span className="text-slate-500">Ciphertext: </span>
                      <span className="text-purple-400 break-all">{msg.wireSample.ciphertext}</span>
                    </div>
                  </div>
                )}
              </div>
            );
          })
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Message Input Bar */}
      <form onSubmit={handleSend} className="p-3 border-t border-slate-800 bg-slate-900/90">
        <div className="flex items-center gap-1.5 bg-slate-950 border border-slate-800 rounded-xl p-1.5 focus-within:border-blue-500 transition-colors">
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Type encrypted message..."
            className="flex-1 bg-transparent px-2 text-xs text-white placeholder-slate-500 outline-none select-text"
          />
          <button
            type="submit"
            disabled={!inputText.trim()}
            className="p-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-40 disabled:hover:bg-blue-600 text-white rounded-lg transition-colors shadow-sm"
          >
            <Send className="w-3.5 h-3.5" />
          </button>
        </div>
      </form>
    </div>
  );
};
