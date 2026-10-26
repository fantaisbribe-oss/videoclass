import React, { useRef, useState, useEffect } from 'react';
import {
  Pen,
  Highlighter,
  Eraser,
  Square,
  Circle,
  ArrowRight,
  Type,
  RotateCcw,
  Trash2,
  Download,
  Lock,
  Palette,
} from 'lucide-react';
import { WhiteboardElement, WhiteboardTool, UserRole } from '../types';

interface WhiteboardProps {
  elements: WhiteboardElement[];
  onElementsChange: (elements: WhiteboardElement[]) => void;
  currentUserRole: UserRole;
  currentUserId: string;
  allowStudentWhiteboard: boolean;
}

const COLORS = [
  '#0F172A', // Slate 900
  '#FFFFFF', // White
  '#2563EB', // Azure Blue
  '#DC2626', // Coral Red
  '#16A34A', // Emerald Green
  '#D97706', // Amber Yellow
  '#9333EA', // Purple
  '#0EA5E9', // Sky Blue
];

export const Whiteboard: React.FC<WhiteboardProps> = ({
  elements,
  onElementsChange,
  currentUserRole,
  currentUserId,
  allowStudentWhiteboard,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [activeTool, setActiveTool] = useState<WhiteboardTool>('pen');
  const [selectedColor, setSelectedColor] = useState<string>('#2563EB');
  const [strokeWidth, setStrokeWidth] = useState<number>(3);
  const [isDrawing, setIsDrawing] = useState<boolean>(false);
  const [currentPoints, setCurrentPoints] = useState<{ x: number; y: number }[]>([]);
  const [shapeStart, setShapeStart] = useState<{ x: number; y: number } | null>(null);

  const canDraw = currentUserRole === 'teacher' || allowStudentWhiteboard;

  // Redraw canvas whenever elements change or resizing occurs
  const redraw = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Reset and clear background
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    // Subtle coordinate grid background
    ctx.strokeStyle = '#1e293b';
    ctx.lineWidth = 1;
    const gridSize = 40;
    for (let x = 0; x < canvas.width; x += gridSize) {
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x, canvas.height);
      ctx.stroke();
    }
    for (let y = 0; y < canvas.height; y += gridSize) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(canvas.width, y);
      ctx.stroke();
    }

    // Render elements
    elements.forEach((el) => {
      ctx.save();
      ctx.strokeStyle = el.color;
      ctx.fillStyle = el.color;
      ctx.lineWidth = el.strokeWidth;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';

      if (el.tool === 'highlighter') {
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = el.strokeWidth * 3;
      }

      if (el.tool === 'pen' || el.tool === 'highlighter' || el.tool === 'eraser') {
        if (el.tool === 'eraser') {
          ctx.strokeStyle = '#020617'; // Canvas background color
          ctx.lineWidth = el.strokeWidth * 4;
        }

        if (el.points.length > 1) {
          ctx.beginPath();
          ctx.moveTo(el.points[0].x, el.points[0].y);
          for (let i = 1; i < el.points.length; i++) {
            ctx.lineTo(el.points[i].x, el.points[i].y);
          }
          ctx.stroke();
        } else if (el.points.length === 1) {
          ctx.beginPath();
          ctx.arc(el.points[0].x, el.points[0].y, el.strokeWidth / 2, 0, Math.PI * 2);
          ctx.fill();
        }
      } else if (el.tool === 'rectangle' && el.startX !== undefined && el.endX !== undefined) {
        const x = Math.min(el.startX, el.endX);
        const y = Math.min(el.startY || 0, el.endY || 0);
        const w = Math.abs(el.endX - el.startX);
        const h = Math.abs((el.endY || 0) - (el.startY || 0));
        ctx.strokeRect(x, y, w, h);
      } else if (el.tool === 'circle' && el.startX !== undefined && el.endX !== undefined) {
        const radius = Math.hypot(el.endX - el.startX, (el.endY || 0) - (el.startY || 0));
        ctx.beginPath();
        ctx.arc(el.startX, el.startY || 0, radius, 0, Math.PI * 2);
        ctx.stroke();
      } else if (el.tool === 'arrow' && el.startX !== undefined && el.endX !== undefined) {
        const dx = el.endX - el.startX;
        const dy = (el.endY || 0) - (el.startY || 0);
        const angle = Math.atan2(dy, dx);
        const headLength = 14;

        ctx.beginPath();
        ctx.moveTo(el.startX, el.startY || 0);
        ctx.lineTo(el.endX, el.endY || 0);
        ctx.stroke();

        ctx.beginPath();
        ctx.moveTo(el.endX, el.endY || 0);
        ctx.lineTo(
          el.endX - headLength * Math.cos(angle - Math.PI / 6),
          (el.endY || 0) - headLength * Math.sin(angle - Math.PI / 6)
        );
        ctx.lineTo(
          el.endX - headLength * Math.cos(angle + Math.PI / 6),
          (el.endY || 0) - headLength * Math.sin(angle + Math.PI / 6)
        );
        ctx.closePath();
        ctx.fill();
      } else if (el.tool === 'text' && el.text && el.startX !== undefined) {
        ctx.font = '16px "Plus Jakarta Sans", sans-serif';
        ctx.fillText(el.text, el.startX, el.startY || 0);
      }

      ctx.restore();
    });
  };

  // Resize canvas to container
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;

      const rect = container.getBoundingClientRect();
      canvas.width = rect.width;
      canvas.height = rect.height;
      redraw();
    };

    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  useEffect(() => {
    redraw();
  }, [elements]);

  const getCanvasCoordinates = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    return {
      x: e.clientX - rect.left,
      y: e.clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!canDraw) return;
    const { x, y } = getCanvasCoordinates(e);

    if (activeTool === 'text') {
      const text = prompt('Enter text note for whiteboard:');
      if (text && text.trim()) {
        const newEl: WhiteboardElement = {
          id: `wb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          tool: 'text',
          color: selectedColor,
          strokeWidth,
          points: [{ x, y }],
          startX: x,
          startY: y,
          text: text.trim(),
          userId: currentUserId,
          timestamp: Date.now(),
        };
        onElementsChange([...elements, newEl]);
      }
      return;
    }

    setIsDrawing(true);
    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      setCurrentPoints([{ x, y }]);
    } else {
      setShapeStart({ x, y });
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return;
    const { x, y } = getCanvasCoordinates(e);

    if (activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') {
      setCurrentPoints((prev) => {
        const updated = [...prev, { x, y }];
        // Live preview stroke on canvas
        const canvas = canvasRef.current;
        if (canvas) {
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.save();
            ctx.strokeStyle = activeTool === 'eraser' ? '#020617' : selectedColor;
            ctx.lineWidth = activeTool === 'highlighter' ? strokeWidth * 3 : activeTool === 'eraser' ? strokeWidth * 4 : strokeWidth;
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
            if (activeTool === 'highlighter') ctx.globalAlpha = 0.35;

            ctx.beginPath();
            if (prev.length > 0) {
              ctx.moveTo(prev[prev.length - 1].x, prev[prev.length - 1].y);
              ctx.lineTo(x, y);
              ctx.stroke();
            }
            ctx.restore();
          }
        }
        return updated;
      });
    }
  };

  const stopDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !canDraw) return;
    const { x, y } = getCanvasCoordinates(e);
    setIsDrawing(false);

    if ((activeTool === 'pen' || activeTool === 'highlighter' || activeTool === 'eraser') && currentPoints.length > 0) {
      const newEl: WhiteboardElement = {
        id: `wb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tool: activeTool,
        color: selectedColor,
        strokeWidth,
        points: currentPoints,
        userId: currentUserId,
        timestamp: Date.now(),
      };
      onElementsChange([...elements, newEl]);
      setCurrentPoints([]);
    } else if (shapeStart) {
      const newEl: WhiteboardElement = {
        id: `wb-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        tool: activeTool,
        color: selectedColor,
        strokeWidth,
        points: [shapeStart, { x, y }],
        startX: shapeStart.x,
        startY: shapeStart.y,
        endX: x,
        endY: y,
        userId: currentUserId,
        timestamp: Date.now(),
      };
      onElementsChange([...elements, newEl]);
      setShapeStart(null);
    }
  };

  const handleUndo = () => {
    if (elements.length === 0) return;
    onElementsChange(elements.slice(0, -1));
  };

  const handleClear = () => {
    if (elements.length === 0) return;
    if (confirm('Clear the entire classroom whiteboard?')) {
      onElementsChange([]);
    }
  };

  const handleDownload = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const link = document.createElement('a');
    link.download = `cipherclass-whiteboard-${new Date().toISOString().slice(0, 10)}.png`;
    link.href = canvas.toDataURL('image/png');
    link.click();
  };

  return (
    <div className="relative w-full h-full flex flex-col bg-slate-950 overflow-hidden select-none">
      {/* Top Floating Whiteboard Toolbar */}
      <div className="absolute top-4 left-1/2 -translate-x-1/2 z-20 flex items-center gap-2 p-1.5 bg-slate-900/90 backdrop-blur-md border border-slate-800 rounded-2xl shadow-2xl">
        {!canDraw && (
          <div className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/10 border border-amber-500/30 rounded-xl text-amber-400 text-xs font-medium">
            <Lock className="w-3.5 h-3.5" />
            <span>Teacher locked student drawing</span>
          </div>
        )}

        {/* Tools */}
        <div className="flex items-center gap-1 pr-2 border-r border-slate-800">
          <button
            onClick={() => setActiveTool('pen')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'pen'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Pen"
          >
            <Pen className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('highlighter')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'highlighter'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Highlighter"
          >
            <Highlighter className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('eraser')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'eraser'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Eraser"
          >
            <Eraser className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('rectangle')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'rectangle'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Rectangle"
          >
            <Square className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('circle')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'circle'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Circle"
          >
            <Circle className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('arrow')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'arrow'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Arrow"
          >
            <ArrowRight className="w-4 h-4" />
          </button>
          <button
            onClick={() => setActiveTool('text')}
            disabled={!canDraw}
            className={`p-2 rounded-xl text-xs transition-colors ${
              activeTool === 'text'
                ? 'bg-blue-600 text-white shadow-sm'
                : 'text-slate-400 hover:text-white hover:bg-slate-800'
            }`}
            title="Text Note"
          >
            <Type className="w-4 h-4" />
          </button>
        </div>

        {/* Color Palette */}
        <div className="flex items-center gap-1.5 px-2 border-r border-slate-800">
          {COLORS.map((color) => (
            <button
              key={color}
              onClick={() => setSelectedColor(color)}
              disabled={!canDraw}
              className={`w-5 h-5 rounded-full transition-transform ${
                selectedColor === color ? 'scale-125 ring-2 ring-blue-400' : 'hover:scale-110'
              }`}
              style={{ backgroundColor: color }}
              title={color}
            />
          ))}
        </div>

        {/* Stroke Width Slider */}
        <div className="hidden sm:flex items-center gap-2 px-2 border-r border-slate-800">
          <span className="text-[10px] text-slate-400 font-mono">Size</span>
          <input
            type="range"
            min="1"
            max="16"
            value={strokeWidth}
            onChange={(e) => setStrokeWidth(parseInt(e.target.value, 10))}
            className="w-16 h-1 bg-slate-700 rounded-lg cursor-pointer"
            disabled={!canDraw}
          />
          <span className="text-[10px] text-slate-400 font-mono tabular-nums">{strokeWidth}px</span>
        </div>

        {/* Canvas Actions */}
        <div className="flex items-center gap-1 pl-1">
          <button
            onClick={handleUndo}
            disabled={elements.length === 0 || !canDraw}
            className="p-2 rounded-xl text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Undo"
          >
            <RotateCcw className="w-4 h-4" />
          </button>
          <button
            onClick={handleClear}
            disabled={elements.length === 0 || !canDraw}
            className="p-2 rounded-xl text-slate-400 hover:text-red-400 hover:bg-slate-800 disabled:opacity-40 transition-colors"
            title="Clear Whiteboard"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          <button
            onClick={handleDownload}
            className="p-2 rounded-xl text-slate-400 hover:text-blue-400 hover:bg-slate-800 transition-colors"
            title="Export as PNG"
          >
            <Download className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Canvas Drawing Stage */}
      <div ref={containerRef} className="flex-1 w-full h-full cursor-crosshair">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          className="w-full h-full block"
        />
      </div>

      {/* Real-time E2EE Synced Badge */}
      <div className="absolute bottom-4 right-4 bg-slate-900/80 backdrop-blur-md px-3 py-1.5 rounded-xl border border-slate-800 text-xs text-slate-400 flex items-center gap-2 pointer-events-none">
        <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
        <span>Canvas E2E Encrypted</span>
        <span aria-hidden="true">·</span>
        <span className="font-mono tabular-nums">{elements.length} elements</span>
      </div>
    </div>
  );
};
