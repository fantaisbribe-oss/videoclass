import React, { useState } from 'react';
import {
  X,
  ShieldCheck,
  Key,
  Copy,
  Check,
  Lock,
  Terminal,
  ExternalLink,
  Cpu,
  Hash,
} from 'lucide-react';

interface SecurityModalProps {
  isOpen: boolean;
  onClose: () => void;
  safetyNumber: string;
  fingerprint: string;
  roomKeyBase64: string;
  roomId: string;
}

export const SecurityModal: React.FC<SecurityModalProps> = ({
  isOpen,
  onClose,
  safetyNumber,
  fingerprint,
  roomKeyBase64,
  roomId,
}) => {
  const [copiedLink, setCopiedLink] = useState(false);
  const [isVerified, setIsVerified] = useState(false);

  if (!isOpen) return null;

  const getSecureRoomUrl = () => {
    const origin = window.location.origin;
    return `${origin}/?room=${roomId}#key=${roomKeyBase64}`;
  };

  const copyInviteLink = () => {
    navigator.clipboard.writeText(getSecureRoomUrl());
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
      <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-950/80 border border-emerald-700/60 flex items-center justify-center text-emerald-400">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">End-to-End Encryption Verification</h3>
              <p className="text-xs text-emerald-400 font-mono">AES-256-GCM · Zero-Knowledge Proof</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 space-y-5 overflow-y-auto max-h-[75vh]">
          {/* Architecture Guarantee */}
          <div className="p-3.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 space-y-2">
            <div className="flex items-center gap-2 text-white font-medium">
              <Lock className="w-4 h-4 text-emerald-400" />
              <span>Zero-Knowledge Architecture</span>
            </div>
            <p className="text-slate-400 text-[11px] leading-relaxed">
              Your room encryption key is stored solely in client memory and passed through the browser URL hash fragment (<code>#key=...</code>). Because URL hashes are never included in HTTP request headers, <strong>no server or intermediary can decrypt your classroom feeds, messages, or whiteboard.</strong>
            </p>
          </div>

          {/* Safety Number Display */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-slate-200 flex items-center gap-1.5">
                <Hash className="w-3.5 h-3.5 text-blue-400" />
                <span>60-Digit Safety Number</span>
              </label>
              <span className="text-[11px] text-slate-400 font-mono">Match with instructor</span>
            </div>
            <div className="p-4 rounded-xl bg-slate-950 border border-slate-800 font-mono text-sm text-center tracking-wider text-slate-200 select-all leading-loose">
              {safetyNumber}
            </div>
            <p className="mt-1.5 text-[11px] text-slate-500 text-center">
              Compare this number with your teacher or fellow students to verify authenticity against man-in-the-middle attacks.
            </p>
          </div>

          {/* Fingerprint & Cipher Suite */}
          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] mb-1 font-mono">CIPHER SUITE</span>
              <span className="text-slate-200 font-medium">AES-256-GCM (128-bit Tag)</span>
            </div>
            <div className="p-3 rounded-xl bg-slate-950 border border-slate-800">
              <span className="text-slate-500 block text-[10px] mb-1 font-mono">KEY EXCHANGE</span>
              <span className="text-slate-200 font-medium">PBKDF2 / SHA-256 (100k)</span>
            </div>
          </div>

          {/* Key Fingerprint */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              Cryptographic Fingerprint
            </label>
            <div className="p-2.5 rounded-xl bg-slate-950 border border-slate-800 font-mono text-xs text-cyan-400 break-all select-all">
              {fingerprint}
            </div>
          </div>

          {/* Safety Verified Toggle */}
          <div className="flex items-center justify-between p-3 rounded-xl bg-slate-950 border border-slate-800">
            <div>
              <span className="text-xs font-medium text-white block">Safety Numbers Match</span>
              <span className="text-[11px] text-slate-400">Mark session as verified</span>
            </div>
            <button
              onClick={() => setIsVerified(!isVerified)}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                isVerified
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'bg-slate-800 text-slate-400 hover:text-white'
              }`}
            >
              {isVerified ? 'Verified' : 'Verify'}
            </button>
          </div>

          {/* Secure Share Link */}
          <div>
            <label className="text-xs font-semibold text-slate-200 block mb-1.5">
              Secure Classroom Invitation Link
            </label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={getSecureRoomUrl()}
                className="flex-1 px-3 py-2 rounded-xl bg-slate-950 border border-slate-800 text-xs text-slate-300 font-mono outline-none truncate select-all"
              />
              <button
                onClick={copyInviteLink}
                className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-medium transition-colors shrink-0 shadow-md"
              >
                {copiedLink ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedLink ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3.5 border-t border-slate-800 bg-slate-900 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
};
