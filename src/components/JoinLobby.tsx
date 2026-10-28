import React, { useState, useEffect, useRef } from 'react';
import {
  ShieldCheck,
  Video,
  VideoOff,
  Mic,
  MicOff,
  Lock,
  GraduationCap,
  Sparkles,
  Key,
  Users,
  ArrowRight,
  Github,
  CheckCircle2,
  ExternalLink,
  Copy,
  Check,
  X,
  Code,
} from 'lucide-react';
import { UserRole } from '../types';
import { auth, googleProvider, signInWithPopup, User as FirebaseUser } from '../lib/firebase';

interface GitHubUser {
  id: string;
  login: string;
  name: string;
  avatar_url: string;
}

interface JoinLobbyProps {
  onJoin: (config: {
    name: string;
    role: UserRole;
    roomId: string;
    roomName: string;
    passphrase?: string;
    isMuted: boolean;
    isCameraOff: boolean;
    avatar?: string;
  }) => void;
  defaultRoomId?: string;
  defaultKeyHash?: string;
  defaultRole?: UserRole;
  defaultName?: string;
}

export const JoinLobby: React.FC<JoinLobbyProps> = ({
  onJoin,
  defaultRoomId = 'optics-301',
  defaultKeyHash,
  defaultRole = 'teacher',
  defaultName,
}) => {
  const [name, setName] = useState(defaultName || (defaultRole === 'teacher' ? 'Dr. Elena Vance' : 'Guest Student'));
  const [role, setRole] = useState<UserRole>(defaultRole);
  const [roomId, setRoomId] = useState(defaultRoomId);
  const [roomName, setRoomName] = useState('Physics 301 - Wave Optics & Quantum Mechanics');
  const [passphrase, setPassphrase] = useState('quantum-laser-2026');
  const [isMuted, setIsMuted] = useState(false);
  const [isCameraOff, setIsCameraOff] = useState(false);

  // GitHub user profile state
  const [githubUser, setGithubUser] = useState<GitHubUser | null>(null);
  const [githubModalOpen, setGithubModalOpen] = useState(false);
  const [githubConfig, setGithubConfig] = useState<{ isConfigured: boolean; callbackUrl: string } | null>(null);
  const [copiedCallback, setCopiedCallback] = useState(false);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);

  const handleGoogleSignIn = async () => {
    try {
      const res = await signInWithPopup(auth, googleProvider);
      if (res.user) {
        setFirebaseUser(res.user);
        setName(res.user.displayName || 'Authenticated User');
      }
    } catch (err) {
      console.warn('Google sign-in popup error:', err);
    }
  };

  const videoRef = useRef<HTMLVideoElement>(null);
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null);
  const [micLevel, setMicLevel] = useState<number>(0);
  const animationFrameRef = useRef<number | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  // Quick switch role preset
  const handleRoleChange = (newRole: UserRole) => {
    setRole(newRole);
    if (!githubUser) {
      if (newRole === 'teacher') {
        setName('Dr. Elena Vance');
      } else {
        setName('Sarah Chen');
      }
    }
  };

  // Setup media stream preview
  useEffect(() => {
    let localStream: MediaStream | null = null;

    async function initPreview() {
      try {
        if (!navigator.mediaDevices?.getUserMedia) return;
        localStream = await navigator.mediaDevices.getUserMedia({
          video: { width: { ideal: 1280 }, height: { ideal: 720 } },
          audio: true,
        });
        setMediaStream(localStream);
        if (videoRef.current) {
          videoRef.current.srcObject = localStream;
        }

        // Setup audio level analyser
        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioCtx) {
          const ctx = new AudioCtx();
          audioContextRef.current = ctx;
          const source = ctx.createMediaStreamSource(localStream);
          const analyser = ctx.createAnalyser();
          analyser.fftSize = 256;
          source.connect(analyser);

          const dataArray = new Uint8Array(analyser.frequencyBinCount);
          const checkVolume = () => {
            analyser.getByteFrequencyData(dataArray);
            let sum = 0;
            for (let i = 0; i < dataArray.length; i++) {
              sum += dataArray[i];
            }
            const average = sum / dataArray.length;
            setMicLevel(Math.min(100, Math.round((average / 128) * 100)));
            animationFrameRef.current = requestAnimationFrame(checkVolume);
          };
          checkVolume();
        }
      } catch (err) {
        console.warn('Camera/mic preview permission not granted or device not found:', err);
      }
    }

    initPreview();

    return () => {
      if (localStream) {
        localStream.getTracks().forEach((t) => t.stop());
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
      }
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  // Listen for OAuth postMessage
  useEffect(() => {
    const handleOAuthMessage = (event: MessageEvent) => {
      const origin = event.origin;
      if (!origin.endsWith('.run.app') && !origin.includes('localhost')) {
        return;
      }

      if (event.data?.type === 'OAUTH_AUTH_SUCCESS' && event.data?.provider === 'github') {
        const user = event.data.user as GitHubUser;
        setGithubUser(user);
        setName(user.name || user.login);
        setGithubModalOpen(false);
      }
    };

    window.addEventListener('message', handleOAuthMessage);
    return () => window.removeEventListener('message', handleOAuthMessage);
  }, []);

  // Handle GitHub Sign-In click
  const handleGithubClick = async () => {
    try {
      const res = await fetch('/api/auth/github/url');
      const data = await res.json();
      setGithubConfig(data);

      if (data.isConfigured && data.url) {
        const authWindow = window.open(data.url, 'github_oauth_popup', 'width=600,height=700');
        if (!authWindow) {
          alert('Please allow popups to sign in with GitHub.');
        }
      } else {
        // If not configured with CLIENT_ID, open modal with instructions & demo mode
        setGithubModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to get GitHub auth URL:', err);
      setGithubModalOpen(true);
    }
  };

  const handleDemoGithubLogin = (profile: 'octocat' | 'student') => {
    const demoUser: GitHubUser =
      profile === 'octocat'
        ? {
            id: '583231',
            login: 'octocat',
            name: 'The Octocat (GitHub)',
            avatar_url: 'https://avatars.githubusercontent.com/u/583231?v=4',
          }
        : {
            id: '991283',
            login: 'alex-dev',
            name: 'Alex Rivers (Student Dev)',
            avatar_url: 'https://avatars.githubusercontent.com/u/9919?v=4',
          };

    setGithubUser(demoUser);
    setName(demoUser.name);
    setGithubModalOpen(false);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (mediaStream) {
      mediaStream.getTracks().forEach((t) => t.stop());
    }

    onJoin({
      name: name.trim(),
      role,
      roomId: roomId.trim() || 'optics-301',
      roomName: roomName.trim() || 'Virtual Classroom',
      passphrase: passphrase.trim(),
      isMuted,
      isCameraOff,
      avatar: firebaseUser?.photoURL || githubUser?.avatar_url,
    });
  };

  return (
    <div className="min-h-screen w-full bg-slate-950 flex flex-col items-center justify-center p-4 sm:p-8 select-none">
      {/* Top Banner */}
      <div className="w-full max-w-4xl mb-6 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-blue-600 flex items-center justify-center font-bold text-white shadow-lg shadow-blue-500/20 text-lg">
            C
          </div>
          <div>
            <h1 className="text-lg font-bold text-white tracking-tight">CipherClass</h1>
            <p className="text-xs text-slate-400">End-to-End Encrypted Virtual Classroom with GitHub</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {githubUser ? (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-900 border border-slate-700 text-xs text-white">
              <img
                src={githubUser.avatar_url}
                alt={githubUser.login}
                className="w-4 h-4 rounded-full"
                referrerPolicy="no-referrer"
              />
              <span className="font-mono">@{githubUser.login}</span>
              <span className="text-emerald-400 font-semibold text-[10px] ml-1">Verified</span>
            </div>
          ) : (
            <button
              type="button"
              onClick={handleGithubClick}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 border border-slate-700 text-slate-200 text-xs font-medium transition-colors"
            >
              <Github className="w-4 h-4" />
              <span>Connect GitHub</span>
            </button>
          )}

          <div className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-400 text-xs font-medium">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>AES-256 E2EE</span>
          </div>
        </div>
      </div>

      {/* Main Card */}
      <div className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden grid grid-cols-1 lg:grid-cols-12">
        {/* Left: Device & Camera Preview (5 cols) */}
        <div className="lg:col-span-5 p-6 bg-slate-950/60 border-b lg:border-b-0 lg:border-r border-slate-800 flex flex-col justify-between">
          <div>
            <div className="flex items-center justify-between mb-3">
              <span className="text-xs font-semibold text-slate-300">AV Hardware Check</span>
              <span className="text-[11px] text-slate-500">Live preview</span>
            </div>

            {/* Video preview container */}
            <div className="relative aspect-video rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 flex items-center justify-center shadow-inner">
              {mediaStream && !isCameraOff ? (
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="w-full h-full object-cover -scale-x-100"
                />
              ) : githubUser?.avatar_url ? (
                <div className="flex flex-col items-center justify-center">
                  <img
                    src={githubUser.avatar_url}
                    alt={githubUser.login}
                    className="w-20 h-20 rounded-full border-2 border-blue-500/50 mb-2 shadow-lg"
                    referrerPolicy="no-referrer"
                  />
                  <span className="text-xs text-slate-300 font-mono">@{githubUser.login}</span>
                </div>
              ) : (
                <div className="flex flex-col items-center justify-center text-slate-500">
                  <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 font-bold text-xl mb-2">
                    {name.charAt(0) || 'U'}
                  </div>
                  <span className="text-xs">{isCameraOff ? 'Camera muted' : 'Camera ready'}</span>
                </div>
              )}

              {/* Bottom in-video toggle bar */}
              <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`p-2.5 rounded-xl text-xs backdrop-blur-md transition-colors ${
                    isMuted
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                  }`}
                  title={isMuted ? 'Unmute' : 'Mute'}
                >
                  {isMuted ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4 text-emerald-400" />}
                </button>
                <button
                  type="button"
                  onClick={() => setIsCameraOff(!isCameraOff)}
                  className={`p-2.5 rounded-xl text-xs backdrop-blur-md transition-colors ${
                    isCameraOff
                      ? 'bg-red-600 text-white shadow-md'
                      : 'bg-slate-900/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60'
                  }`}
                  title={isCameraOff ? 'Start Video' : 'Stop Video'}
                >
                  {isCameraOff ? <VideoOff className="w-4 h-4" /> : <Video className="w-4 h-4 text-blue-400" />}
                </button>
              </div>
            </div>

            {/* Mic Level Indicator */}
            <div className="mt-4 p-3 rounded-xl bg-slate-900/80 border border-slate-800">
              <div className="flex items-center justify-between text-xs mb-1.5">
                <span className="text-slate-400 flex items-center gap-1.5">
                  <Mic className="w-3.5 h-3.5 text-slate-400" />
                  Microphone Input Level
                </span>
                <span className="font-mono text-slate-300 tabular-nums text-[11px]">
                  {isMuted ? '0%' : `${micLevel}%`}
                </span>
              </div>
              <div className="w-full h-1.5 rounded-full bg-slate-800 overflow-hidden">
                <div
                  style={{ width: isMuted ? '0%' : `${micLevel}%` }}
                  className="h-full bg-gradient-to-r from-emerald-500 to-cyan-400 transition-all duration-75"
                />
              </div>
            </div>
          </div>

          <div className="mt-4 p-3 rounded-xl bg-blue-950/30 border border-blue-900/40 text-[11px] text-blue-300 space-y-1">
            <span className="font-semibold block text-white flex items-center gap-1">
              <Lock className="w-3.5 h-3.5 text-blue-400" />
              Cryptographic Key Safeguard
            </span>
            <span>
              Classroom media and documents are encrypted client-side using AES-256-GCM.
            </span>
          </div>
        </div>

        {/* Right: Join Configuration Form (7 cols) */}
        <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <h2 className="text-base font-bold text-white mb-1">Enter Classroom</h2>
              <p className="text-xs text-slate-400 mb-2">Configure your identity, role, and encryption room key</p>
              
              {/* 1-Click Quick Fill Presets */}
              <div className="flex flex-wrap items-center gap-1.5 p-2 bg-slate-950/80 rounded-xl border border-slate-800">
                <span className="text-[11px] text-slate-400 font-medium mr-1">Quick Fill:</span>
                <button
                  type="button"
                  onClick={() => {
                    setName('Dr. Elena Vance');
                    setRole('teacher');
                    setRoomId('optics-301');
                    setRoomName('Physics 301 - Wave Optics & Quantum Mechanics');
                    setPassphrase('quantum-laser-2026');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-blue-950/80 hover:bg-blue-900 border border-blue-700/50 text-[11px] text-blue-300 font-medium transition-colors"
                >
                  Dr. Vance (Teacher)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName('Alex Rivers');
                    setRole('student');
                    setRoomId('optics-301');
                    setRoomName('Physics 301 - Wave Optics & Quantum Mechanics');
                    setPassphrase('quantum-laser-2026');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 font-medium transition-colors"
                >
                  Alex (Student)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setName('Sarah Chen');
                    setRole('student');
                    setRoomId('optics-301');
                    setRoomName('Physics 301 - Wave Optics & Quantum Mechanics');
                    setPassphrase('quantum-laser-2026');
                  }}
                  className="px-2.5 py-1 rounded-lg bg-slate-800 hover:bg-slate-700 border border-slate-700 text-[11px] text-slate-200 font-medium transition-colors"
                >
                  Sarah (Student)
                </button>
              </div>
            </div>

            {/* GitHub Fast Connect Prompt */}
            {!githubUser && (
              <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-slate-900 border border-slate-700 flex items-center justify-center text-white">
                    <Github className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="text-xs font-semibold text-white block">Sign in with GitHub</span>
                    <span className="text-[11px] text-slate-400">Sync verified student or teacher profile</span>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={handleGithubClick}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium transition-colors"
                >
                  Connect
                </button>
              </div>
            )}

            {/* Role Segmented Switcher */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Select Role</label>
              <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
                <button
                  type="button"
                  onClick={() => handleRoleChange('teacher')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    role === 'teacher'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <GraduationCap className="w-4 h-4" />
                  <span>Teacher / Instructor</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleRoleChange('student')}
                  className={`py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors ${
                    role === 'student'
                      ? 'bg-blue-600 text-white shadow-md'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>Student</span>
                </button>
              </div>
            </div>

            {/* Display Name */}
            <div>
              <label className="text-xs font-semibold text-slate-300 block mb-1.5">Your Name</label>
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Dr. Elena Vance"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white placeholder-slate-500 outline-none focus:border-blue-500 transition-colors"
              />
            </div>

            {/* Classroom Name & ID */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Class Subject</label>
                <input
                  type="text"
                  required
                  value={roomName}
                  onChange={(e) => setRoomName(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white outline-none focus:border-blue-500 transition-colors"
                />
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-300 block mb-1.5">Room ID</label>
                <input
                  type="text"
                  required
                  value={roomId}
                  onChange={(e) => setRoomId(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-white font-mono outline-none focus:border-blue-500 transition-colors"
                />
              </div>
            </div>

            {/* End-to-End Encryption Passphrase */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                  <Key className="w-3.5 h-3.5 text-emerald-400" />
                  <span>E2EE Room Passkey</span>
                </label>
                <span className="text-[11px] text-emerald-400 font-mono">PBKDF2-SHA256</span>
              </div>
              <input
                type="text"
                required
                value={passphrase}
                onChange={(e) => setPassphrase(e.target.value)}
                placeholder="Enter shared encryption passkey"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 text-xs text-emerald-300 font-mono outline-none focus:border-emerald-500 transition-colors"
              />
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                className="w-full py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-lg shadow-blue-600/30 transition-all hover:scale-[1.01]"
              >
                <span>Join Secure Classroom</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>
          </form>
        </div>
      </div>

      {/* GitHub OAuth Setup / Demo Modal */}
      {githubModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-in fade-in duration-150 select-none">
          <div className="relative w-full max-w-lg rounded-2xl bg-slate-900 border border-slate-800 shadow-2xl overflow-hidden flex flex-col">
            <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 bg-slate-900/90">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-slate-800 border border-slate-700 flex items-center justify-center text-white">
                  <Github className="w-4 h-4" />
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">GitHub Integration</h3>
                  <p className="text-xs text-slate-400">Authenticate students & teachers via GitHub</p>
                </div>
              </div>
              <button
                onClick={() => setGithubModalOpen(false)}
                className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="p-6 space-y-4 text-xs text-slate-300 overflow-y-auto max-h-[70vh]">
              {/* Quick One-Click Demo Mode */}
              <div className="p-4 rounded-xl bg-blue-950/40 border border-blue-800/40 space-y-2">
                <h4 className="font-semibold text-white flex items-center gap-1.5">
                  <Sparkles className="w-4 h-4 text-cyan-400" />
                  <span>Instant Demo Connection</span>
                </h4>
                <p className="text-[11px] text-blue-200">
                  Test the complete GitHub-authenticated profile flow right away:
                </p>
                <div className="flex items-center gap-2 pt-1">
                  <button
                    onClick={() => handleDemoGithubLogin('octocat')}
                    className="flex-1 py-2 px-3 rounded-lg bg-blue-600 hover:bg-blue-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Github className="w-3.5 h-3.5" />
                    <span>Connect @octocat</span>
                  </button>
                  <button
                    onClick={() => handleDemoGithubLogin('student')}
                    className="flex-1 py-2 px-3 rounded-lg bg-slate-800 hover:bg-slate-700 text-white font-medium text-xs transition-colors flex items-center justify-center gap-1.5"
                  >
                    <Users className="w-3.5 h-3.5" />
                    <span>Connect @alex-dev (Student)</span>
                  </button>
                </div>
              </div>

              {/* Real OAuth Credentials Setup Instructions */}
              <div className="space-y-3 pt-2">
                <h4 className="font-semibold text-white">Real GitHub OAuth App Setup</h4>
                <p className="text-[11px] text-slate-400 leading-relaxed">
                  To connect your real GitHub account in production, register an OAuth App in your GitHub developer settings with these callback URLs:
                </p>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 space-y-2 font-mono text-[11px]">
                  <div>
                    <span className="text-slate-500 block text-[10px]">DEVELOPMENT CALLBACK URL:</span>
                    <span className="text-emerald-400 break-all select-all">
                      https://ais-dev-pjt3i2ehwk6vpxnoxzbbnc-127082696976.europe-west1.run.app/auth/github/callback
                    </span>
                  </div>
                  <div>
                    <span className="text-slate-500 block text-[10px]">SHARED APP CALLBACK URL:</span>
                    <span className="text-cyan-400 break-all select-all">
                      https://ais-pre-pjt3i2ehwk6vpxnoxzbbnc-127082696976.europe-west1.run.app/auth/github/callback
                    </span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-slate-950 border border-slate-800 text-[11px] text-slate-400">
                  <span>Then set these environment variables in your AI Studio Secrets:</span>
                  <ul className="list-disc list-inside mt-1 space-y-0.5 text-slate-300 font-mono text-[10px]">
                    <li><code>GITHUB_CLIENT_ID</code></li>
                    <li><code>GITHUB_CLIENT_SECRET</code></li>
                  </ul>
                </div>
              </div>
            </div>

            <div className="px-6 py-3 border-t border-slate-800 bg-slate-900 flex justify-end">
              <button
                onClick={() => setGithubModalOpen(false)}
                className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-white text-xs font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
