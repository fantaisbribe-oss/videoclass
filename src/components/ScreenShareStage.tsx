import React, { useRef, useState, useEffect } from 'react';
import {
  Monitor,
  Maximize2,
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Sparkles,
  Layers,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';
import { UserRole } from '../types';

interface ScreenShareStageProps {
  screenStream: MediaStream | null;
  presenterName: string;
  isLocalSharing: boolean;
  onStopScreenShare: () => void;
  currentUserRole: UserRole;
}

export const ScreenShareStage: React.FC<ScreenShareStageProps> = ({
  screenStream,
  presenterName,
  isLocalSharing,
  onStopScreenShare,
  currentUserRole,
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [zoomLevel, setZoomLevel] = useState<number>(1);
  const [laserActive, setLaserActive] = useState<boolean>(true);
  const [laserPos, setLaserPos] = useState<{ x: number; y: number } | null>(null);
  const [slideIndex, setSlideIndex] = useState<number>(0);

  const slides = [
    {
      title: "Young's Double-Slit Geometric Fringe Analysis & Snell's Law",
      image: '/src/assets/images/diagram_physics_lesson_1793021698124.jpg',
      caption: 'Figure 1: Wave interference patterns, optical path difference, Snell law angles',
      formula: 'd \\sin(\\theta) = m \\lambda \\implies y_m = \\frac{m\\lambda D}{d}',
    },
    {
      title: 'Instructor Master Overview: Lab Apparatus & Safety Rules',
      image: '/src/assets/images/avatar_teacher_elena_1793021711754.jpg',
      caption: 'Figure 2: Laser safety protocols and class setup with Dr. Elena Vance',
      formula: 'I(\\theta) = 4I_0 \\cos^2\\left(\\frac{\\pi d \\sin(\\theta)}{\\lambda}\\right)',
    },
  ];

  useEffect(() => {
    if (videoRef.current && screenStream) {
      videoRef.current.srcObject = screenStream;
    }
  }, [screenStream]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!laserActive || !containerRef.current) return;
    const rect = containerRef.current.getBoundingClientRect();
    setLaserPos({
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    });
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      containerRef.current.requestFullscreen();
    }
  };

  return (
    <div
      ref={containerRef}
      onMouseMove={handleMouseMove}
      onMouseLeave={() => setLaserPos(null)}
      className="relative flex-1 w-full h-full bg-slate-950 flex flex-col items-center justify-center p-4 overflow-hidden select-none"
    >
      {/* Top Floating Controls Bar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl">
        <div className="flex items-center gap-2 px-3 py-1 text-xs text-slate-300 border-r border-slate-800">
          <Monitor className="w-4 h-4 text-purple-400" />
          <span>
            Sharing: <strong className="text-white">{presenterName}</strong>
          </span>
          <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
            <ShieldCheck className="w-3.5 h-3.5" />
            AES-256 E2EE
          </span>
        </div>

        {/* Zoom Controls */}
        <div className="flex items-center gap-1 px-1 border-r border-slate-800">
          <button
            onClick={() => setZoomLevel((z) => Math.max(0.75, z - 0.25))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Zoom Out"
          >
            <ZoomOut className="w-4 h-4" />
          </button>
          <span className="text-[11px] font-mono text-slate-300 w-12 text-center tabular-nums">
            {Math.round(zoomLevel * 100)}%
          </span>
          <button
            onClick={() => setZoomLevel((z) => Math.min(2.5, z + 0.25))}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Zoom In"
          >
            <ZoomIn className="w-4 h-4" />
          </button>
          <button
            onClick={() => setZoomLevel(1)}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
            title="Reset Zoom"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Laser Pointer Toggle */}
        <button
          onClick={() => setLaserActive(!laserActive)}
          className={`flex items-center gap-1.5 px-2.5 py-1.5 rounded-xl text-xs font-medium transition-colors ${
            laserActive ? 'bg-red-500/20 text-red-400 border border-red-500/30' : 'text-slate-400 hover:text-white'
          }`}
          title="Interactive Laser Pointer"
        >
          <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span>Laser</span>
        </button>

        {/* Fullscreen */}
        <button
          onClick={toggleFullscreen}
          className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 text-xs"
          title="Toggle Fullscreen"
        >
          <Maximize2 className="w-4 h-4" />
        </button>

        {/* Stop Sharing Button if Local */}
        {isLocalSharing && (
          <button
            onClick={onStopScreenShare}
            className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-700 text-white font-medium text-xs ml-1 shadow-md transition-colors"
          >
            Stop Sharing
          </button>
        )}
      </div>

      {/* Screen / Presentation Frame */}
      <div className="relative max-w-6xl w-full h-full max-h-[82vh] rounded-2xl overflow-hidden bg-slate-900 border border-slate-800 shadow-2xl flex items-center justify-center">
        {screenStream ? (
          <div
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
            className="w-full h-full flex items-center justify-center"
          >
            <video ref={videoRef} autoPlay playsInline className="w-full h-full object-contain" />
          </div>
        ) : (
          // Interactive STEM Presentation Deck
          <div
            style={{ transform: `scale(${zoomLevel})`, transition: 'transform 0.15s ease-out' }}
            className="w-full h-full flex flex-col items-center justify-center p-6"
          >
            <div className="relative w-full h-full flex flex-col items-center justify-center">
              <img
                src={slides[slideIndex].image}
                alt={slides[slideIndex].title}
                className="max-h-[64vh] max-w-full object-contain rounded-xl shadow-lg border border-slate-800"
                referrerPolicy="no-referrer"
              />

              <div className="absolute bottom-4 left-6 right-6 bg-slate-950/85 backdrop-blur-md p-3 rounded-xl border border-slate-800 flex items-center justify-between">
                <div>
                  <h4 className="text-sm font-semibold text-white">{slides[slideIndex].title}</h4>
                  <p className="text-xs text-slate-400">{slides[slideIndex].caption}</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs font-mono text-cyan-400 bg-slate-900 px-2 py-1 rounded border border-slate-800">
                    {slides[slideIndex].formula}
                  </span>
                  <div className="flex items-center gap-1 ml-2">
                    <button
                      onClick={() => setSlideIndex((i) => (i > 0 ? i - 1 : slides.length - 1))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-xs font-mono text-slate-400 px-1">
                      {slideIndex + 1}/{slides.length}
                    </span>
                    <button
                      onClick={() => setSlideIndex((i) => (i < slides.length - 1 ? i + 1 : 0))}
                      className="p-1 rounded bg-slate-800 hover:bg-slate-700 text-slate-200"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Laser Pointer Glow Effect */}
        {laserActive && laserPos && (
          <div
            style={{
              left: `${laserPos.x}px`,
              top: `${laserPos.y}px`,
            }}
            className="absolute -translate-x-1/2 -translate-y-1/2 pointer-events-none z-30"
          >
            <div className="w-4 h-4 rounded-full bg-red-500 shadow-[0_0_12px_4px_rgba(239,68,68,0.9)] animate-pulse" />
            <div className="w-1.5 h-1.5 rounded-full bg-white absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
          </div>
        )}
      </div>
    </div>
  );
};
