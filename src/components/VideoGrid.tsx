import React, { useEffect, useRef } from 'react';
import { Mic, MicOff, VideoOff, Hand, Star, Shield, MoreVertical } from 'lucide-react';
import { Participant, UserRole } from '../types';

interface VideoGridProps {
  localStream: MediaStream | null;
  localParticipant: Participant;
  participants: Participant[];
  spotlightId: string | null;
  currentUserRole: UserRole;
  onToggleSpotlight: (id: string | null) => void;
  onLowerHand?: (id: string) => void;
  onMuteParticipant?: (id: string) => void;
}

export const VideoGrid: React.FC<VideoGridProps> = ({
  localStream,
  localParticipant,
  participants,
  spotlightId,
  currentUserRole,
  onToggleSpotlight,
  onLowerHand,
  onMuteParticipant,
}) => {
  const localVideoRef = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    if (localVideoRef.current && localStream) {
      localVideoRef.current.srcObject = localStream;
    }
  }, [localStream, localParticipant.isCameraOff]);

  // Combine local participant with remote participants
  const allParticipants = [
    localParticipant,
    ...participants.filter((p) => p.id !== localParticipant.id),
  ];

  const spotlightParticipant = spotlightId
    ? allParticipants.find((p) => p.id === spotlightId) || null
    : null;

  // Grid styling based on participant count
  const count = allParticipants.length;
  let gridColsClass = 'grid-cols-1';
  if (!spotlightParticipant) {
    if (count === 2) gridColsClass = 'grid-cols-1 md:grid-cols-2';
    else if (count >= 3 && count <= 4) gridColsClass = 'grid-cols-1 sm:grid-cols-2';
    else if (count >= 5 && count <= 6) gridColsClass = 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3';
    else if (count >= 7) gridColsClass = 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4';
  }

  return (
    <div className="flex-1 w-full h-full p-4 overflow-hidden flex flex-col justify-center items-center">
      {spotlightParticipant ? (
        // Spotlight Layout
        <div className="w-full h-full flex flex-col lg:flex-row gap-4 items-stretch">
          {/* Main Hero Spotlight Frame */}
          <div className="flex-1 relative rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
            {spotlightParticipant.id === localParticipant.id && !localParticipant.isCameraOff && localStream ? (
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover -scale-x-100"
              />
            ) : spotlightParticipant.avatar ? (
              <img
                src={spotlightParticipant.avatar}
                alt={spotlightParticipant.name}
                className="w-full h-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-b from-slate-800 to-slate-900">
                <div className="w-24 h-24 rounded-full bg-blue-600/30 border border-blue-500/50 flex items-center justify-center text-3xl font-bold text-blue-200">
                  {spotlightParticipant.name.charAt(0)}
                </div>
                <span className="mt-4 text-base font-medium text-slate-300">
                  Camera is turned off
                </span>
              </div>
            )}

            {/* Overlays */}
            <div className="absolute top-4 left-4 flex items-center gap-2">
              <span className="bg-slate-950/80 backdrop-blur-md px-3 py-1 rounded-lg text-xs font-medium text-amber-300 border border-amber-500/30 flex items-center gap-1.5">
                <Star className="w-3.5 h-3.5 fill-amber-400" />
                Spotlight Speaker
              </span>
              {spotlightParticipant.role === 'teacher' && (
                <span className="bg-blue-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg text-xs font-semibold text-blue-300 border border-blue-500/30">
                  Instructor
                </span>
              )}
            </div>

            <div className="absolute bottom-4 left-4 right-4 flex items-center justify-between pointer-events-none">
              <div className="bg-slate-950/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 flex items-center gap-2 pointer-events-auto">
                <span className="text-sm font-semibold text-white">
                  {spotlightParticipant.name} {spotlightParticipant.id === localParticipant.id ? '(You)' : ''}
                </span>
                {spotlightParticipant.isMuted ? (
                  <MicOff className="w-4 h-4 text-red-400" />
                ) : (
                  <Mic className="w-4 h-4 text-emerald-400" />
                )}
              </div>

              {currentUserRole === 'teacher' && (
                <button
                  onClick={() => onToggleSpotlight(null)}
                  className="bg-slate-900/90 hover:bg-slate-800 text-xs text-slate-300 px-3 py-1.5 rounded-lg border border-slate-700 pointer-events-auto transition-colors"
                >
                  Exit Spotlight
                </button>
              )}
            </div>
          </div>

          {/* Side Filmstrip of other participants */}
          <div className="w-full lg:w-72 flex lg:flex-col gap-3 overflow-x-auto lg:overflow-y-auto shrink-0 py-1">
            {allParticipants.map((p) => (
              <div
                key={p.id}
                onClick={() => currentUserRole === 'teacher' && onToggleSpotlight(p.id)}
                className={`relative w-48 lg:w-full h-32 rounded-xl overflow-hidden bg-slate-900 border transition-all cursor-pointer ${
                  p.id === spotlightId
                    ? 'border-blue-500 ring-2 ring-blue-500/30'
                    : 'border-slate-800 hover:border-slate-700'
                }`}
              >
                {p.id === localParticipant.id && !localParticipant.isCameraOff && localStream ? (
                  <video
                    autoPlay
                    playsInline
                    muted
                    ref={(el) => {
                      if (el && localStream) el.srcObject = localStream;
                    }}
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-slate-800">
                    <span className="text-xl font-bold text-slate-400">
                      {p.name.charAt(0)}
                    </span>
                  </div>
                )}
                <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between text-xs bg-slate-950/70 backdrop-blur-sm px-2 py-1 rounded-md">
                  <span className="truncate max-w-[120px] text-slate-200">{p.name}</span>
                  {p.isMuted ? (
                    <MicOff className="w-3 h-3 text-red-400 shrink-0" />
                  ) : (
                    <Mic className="w-3 h-3 text-emerald-400 shrink-0" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        // Standard Gallery Grid
        <div className={`w-full h-full grid ${gridColsClass} gap-4 auto-rows-fr max-w-7xl`}>
          {allParticipants.map((p) => {
            const isLocal = p.id === localParticipant.id;
            return (
              <div
                key={p.id}
                className={`group relative rounded-2xl overflow-hidden bg-slate-900 border flex items-center justify-center shadow-lg transition-all ${
                  p.handRaised
                    ? 'border-amber-500/80 ring-2 ring-amber-500/40'
                    : 'border-slate-800/80 hover:border-slate-700'
                }`}
              >
                {/* Video / Avatar Canvas */}
                {isLocal && !localParticipant.isCameraOff && localStream ? (
                  <video
                    ref={localVideoRef}
                    autoPlay
                    playsInline
                    muted
                    className="w-full h-full object-cover -scale-x-100"
                  />
                ) : p.avatar ? (
                  <img
                    src={p.avatar}
                    alt={p.name}
                    className="w-full h-full object-cover"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-full h-full flex flex-col items-center justify-center bg-gradient-to-br from-slate-800 via-slate-900 to-slate-950">
                    <div className="w-20 h-20 rounded-2xl bg-blue-600/20 border border-blue-500/30 flex items-center justify-center text-3xl font-bold text-blue-300">
                      {p.name.charAt(0)}
                    </div>
                    {p.isCameraOff && (
                      <span className="mt-2 text-xs text-slate-400 flex items-center gap-1">
                        <VideoOff className="w-3 h-3" />
                        Camera off
                      </span>
                    )}
                  </div>
                )}

                {/* Top Badges */}
                <div className="absolute top-3 left-3 flex items-center gap-1.5 z-10">
                  {p.role === 'teacher' && (
                    <span className="bg-blue-600/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                      Teacher
                    </span>
                  )}
                  {p.handRaised && (
                    <span className="bg-amber-500 text-slate-950 text-[11px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-md animate-bounce">
                      <Hand className="w-3 h-3" />
                      Hand Raised
                    </span>
                  )}
                  {p.isScreenSharing && (
                    <span className="bg-purple-600/90 text-white text-[11px] font-semibold px-2 py-0.5 rounded-md shadow-sm">
                      Sharing Screen
                    </span>
                  )}
                </div>

                {/* Instructor Quick Actions on Card Hover */}
                {currentUserRole === 'teacher' && !isLocal && (
                  <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 z-10">
                    <button
                      onClick={() => onToggleSpotlight(p.id)}
                      className="p-1.5 rounded-lg bg-slate-950/80 hover:bg-slate-800 text-slate-200 border border-slate-700/60 text-xs flex items-center gap-1"
                      title="Spotlight speaker for class"
                    >
                      <Star className="w-3.5 h-3.5 text-amber-400" />
                    </button>
                    {p.handRaised && onLowerHand && (
                      <button
                        onClick={() => onLowerHand(p.id)}
                        className="px-2 py-1 rounded-lg bg-amber-500/90 hover:bg-amber-600 text-slate-950 font-semibold text-[11px]"
                        title="Lower student hand"
                      >
                        Lower
                      </button>
                    )}
                  </div>
                )}

                {/* Bottom User Label Bar */}
                <div className="absolute bottom-3 left-3 right-3 flex items-center justify-between z-10 pointer-events-none">
                  <div className="bg-slate-950/80 backdrop-blur-md px-2.5 py-1 rounded-lg border border-slate-800 flex items-center gap-2 pointer-events-auto">
                    <span className="text-xs font-medium text-white truncate max-w-[140px]">
                      {p.name} {isLocal ? '(You)' : ''}
                    </span>
                    {p.isMuted ? (
                      <MicOff className="w-3.5 h-3.5 text-red-400 shrink-0" />
                    ) : (
                      <div className="flex items-center gap-0.5">
                        <Mic className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                        <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                      </div>
                    )}
                  </div>

                  <div className="flex items-center gap-1 pointer-events-auto">
                    <div
                      className="w-5 h-5 rounded-md bg-emerald-950/80 border border-emerald-800/80 flex items-center justify-center text-[10px] text-emerald-400"
                      title="AES-256 E2EE Verified Peer"
                    >
                      <Shield className="w-3 h-3" />
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
