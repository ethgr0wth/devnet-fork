import React, { useRef, useCallback, useState } from 'react';
import { X, Minus, Maximize2, Minimize2 } from 'lucide-react';

export interface WindowState {
  id: string;
  appId: string;
  title: string;
  icon: React.ComponentType<{ className?: string; strokeWidth?: number }>;
  gradient: string;
  minimized: boolean;
  maximized: boolean;
  x: number;
  y: number;
  w: number;
  h: number;
  zIndex: number;
}

interface AppWindowProps {
  win: WindowState;
  onClose: (id: string) => void;
  onMinimize: (id: string) => void;
  onMaximize: (id: string) => void;
  onFocus: (id: string) => void;
  onMove: (id: string, x: number, y: number) => void;
  onResize: (id: string, w: number, h: number, x?: number, y?: number) => void;
  children: React.ReactNode;
}

type ResizeEdge = 'n' | 's' | 'e' | 'w' | 'ne' | 'nw' | 'se' | 'sw';

const EDGE_SIZE = 6;

const edgeCursors: Record<ResizeEdge, string> = {
  n: 'cursor-ns-resize', s: 'cursor-ns-resize',
  e: 'cursor-ew-resize', w: 'cursor-ew-resize',
  ne: 'cursor-nesw-resize', sw: 'cursor-nesw-resize',
  nw: 'cursor-nwse-resize', se: 'cursor-nwse-resize',
};

const edgeStyles: Record<ResizeEdge, React.CSSProperties> = {
  n:  { top: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE },
  s:  { bottom: 0, left: EDGE_SIZE, right: EDGE_SIZE, height: EDGE_SIZE },
  e:  { top: EDGE_SIZE, right: 0, bottom: EDGE_SIZE, width: EDGE_SIZE },
  w:  { top: EDGE_SIZE, left: 0, bottom: EDGE_SIZE, width: EDGE_SIZE },
  ne: { top: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
  nw: { top: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
  se: { bottom: 0, right: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
  sw: { bottom: 0, left: 0, width: EDGE_SIZE * 2, height: EDGE_SIZE * 2 },
};

const ALL_EDGES: ResizeEdge[] = ['n', 's', 'e', 'w', 'ne', 'nw', 'se', 'sw'];

const MIN_W = 400;
const MIN_H = 300;

export default function AppWindow({ win, onClose, onMinimize, onMaximize, onFocus, onMove, onResize, children }: AppWindowProps) {
  const windowRef = useRef<HTMLDivElement>(null);
  const dragRef = useRef<{ startX: number; startY: number; origX: number; origY: number } | null>(null);
  const resizeRef = useRef<{
    startX: number; startY: number;
    origX: number; origY: number; origW: number; origH: number;
    edge: ResizeEdge;
  } | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [isResizing, setIsResizing] = useState(false);
  const [tempPos, setTempPos] = useState<{ x: number; y: number } | null>(null);
  const [tempRect, setTempRect] = useState<{ x: number; y: number; w: number; h: number } | null>(null);

  const handleDragStart = useCallback((e: React.PointerEvent) => {
    if (win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.id);
    dragRef.current = { startX: e.clientX, startY: e.clientY, origX: win.x, origY: win.y };
    setIsDragging(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.id, win.x, win.y, win.maximized, onFocus]);

  const handleDragMove = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    setTempPos({ x: Math.max(0, dragRef.current.origX + dx), y: Math.max(0, dragRef.current.origY + dy) });
  }, []);

  const handleDragEnd = useCallback((e: React.PointerEvent) => {
    if (!dragRef.current) return;
    const dx = e.clientX - dragRef.current.startX;
    const dy = e.clientY - dragRef.current.startY;
    const newX = Math.max(0, dragRef.current.origX + dx);
    const newY = Math.max(0, dragRef.current.origY + dy);
    dragRef.current = null;
    setIsDragging(false);
    setTempPos(null);
    onMove(win.id, newX, newY);
  }, [win.id, onMove]);

  const computeResizedRect = useCallback((clientX: number, clientY: number) => {
    const r = resizeRef.current;
    if (!r) return { x: win.x, y: win.y, w: win.w, h: win.h };
    const dx = clientX - r.startX;
    const dy = clientY - r.startY;
    let { origX: nx, origY: ny, origW: nw, origH: nh } = r;

    if (r.edge.includes('e')) nw = Math.max(MIN_W, r.origW + dx);
    if (r.edge.includes('w')) { nw = Math.max(MIN_W, r.origW - dx); nx = r.origX + (r.origW - nw); }
    if (r.edge.includes('s')) nh = Math.max(MIN_H, r.origH + dy);
    if (r.edge.includes('n')) { nh = Math.max(MIN_H, r.origH - dy); ny = r.origY + (r.origH - nh); }

    return { x: Math.max(0, nx), y: Math.max(0, ny), w: nw, h: nh };
  }, [win]);

  const handleEdgeResizeStart = useCallback((edge: ResizeEdge) => (e: React.PointerEvent) => {
    if (win.maximized) return;
    e.preventDefault();
    e.stopPropagation();
    onFocus(win.id);
    resizeRef.current = {
      startX: e.clientX, startY: e.clientY,
      origX: win.x, origY: win.y, origW: win.w, origH: win.h,
      edge,
    };
    setIsResizing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, [win.id, win.x, win.y, win.w, win.h, win.maximized, onFocus]);

  const handleEdgeResizeMove = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    setTempRect(computeResizedRect(e.clientX, e.clientY));
  }, [computeResizedRect]);

  const handleEdgeResizeEnd = useCallback((e: React.PointerEvent) => {
    if (!resizeRef.current) return;
    const rect = computeResizedRect(e.clientX, e.clientY);
    resizeRef.current = null;
    setIsResizing(false);
    setTempRect(null);
    onResize(win.id, rect.w, rect.h, rect.x, rect.y);
  }, [win.id, onResize, computeResizedRect]);

  const displayX = win.maximized ? 0 : (tempRect?.x ?? tempPos?.x ?? win.x);
  const displayY = win.maximized ? 0 : (tempRect?.y ?? tempPos?.y ?? win.y);
  const displayW = win.maximized ? '100%' : (tempRect?.w ?? win.w);
  const displayH = win.maximized ? '100%' : (tempRect?.h ?? win.h);

  const IconComp = win.icon;

  if (win.minimized) return null;

  return (
    <div
      ref={windowRef}
      className={`fixed flex flex-col overflow-hidden ${win.maximized ? 'rounded-none' : 'rounded-xl'} shadow-2xl border border-white/[0.12] bg-[#0c0c10]/[0.97] backdrop-blur-xl`}
      style={{
        left: displayX,
        top: displayY,
        width: displayW,
        height: displayH,
        zIndex: win.zIndex,
        transition: (isDragging || isResizing) ? 'none' : 'left 0.2s ease, top 0.2s ease, width 0.2s ease, height 0.2s ease',
      }}
      onPointerDown={() => onFocus(win.id)}
      data-testid={`window-${win.appId}`}
    >
      <div
        className="flex items-center h-10 px-3 shrink-0 select-none bg-[#1a1a22]/80 border-b border-white/[0.06] cursor-grab active:cursor-grabbing"
        onPointerDown={handleDragStart}
        onPointerMove={handleDragMove}
        onPointerUp={handleDragEnd}
        onDoubleClick={() => onMaximize(win.id)}
        data-testid={`titlebar-${win.appId}`}
      >
        <div className="flex items-center gap-1.5 mr-3">
          <button
            onClick={(e) => { e.stopPropagation(); onClose(win.id); }}
            className="w-3 h-3 rounded-full bg-[#ff5f57] hover:bg-[#ff3b30] transition-colors flex items-center justify-center group"
            data-testid={`close-${win.appId}`}
          >
            <X className="w-2 h-2 text-[#7a0000] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMinimize(win.id); }}
            className="w-3 h-3 rounded-full bg-[#febc2e] hover:bg-[#f5a623] transition-colors flex items-center justify-center group"
            data-testid={`minimize-${win.appId}`}
          >
            <Minus className="w-2 h-2 text-[#7a5600] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
          </button>
          <button
            onClick={(e) => { e.stopPropagation(); onMaximize(win.id); }}
            className="w-3 h-3 rounded-full bg-[#28c840] hover:bg-[#1aab29] transition-colors flex items-center justify-center group"
            data-testid={`maximize-${win.appId}`}
          >
            {win.maximized
              ? <Minimize2 className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
              : <Maximize2 className="w-2 h-2 text-[#006500] opacity-0 group-hover:opacity-100 transition-opacity" strokeWidth={3} />
            }
          </button>
        </div>

        <div className="flex items-center gap-2 flex-1 min-w-0">
          <div className={`w-5 h-5 rounded-md bg-gradient-to-br ${win.gradient} flex items-center justify-center shrink-0`}>
            <IconComp className="w-3 h-3 text-white" strokeWidth={2} />
          </div>
          <span className="text-[11px] font-medium text-white/70 truncate">{win.title}</span>
        </div>
      </div>

      <div className="flex-1 overflow-auto relative bg-[#0a0a0f]">
        {children}
      </div>

      {!win.maximized && ALL_EDGES.map(edge => (
        <div
          key={edge}
          className={`absolute ${edgeCursors[edge]} z-10`}
          style={edgeStyles[edge]}
          onPointerDown={handleEdgeResizeStart(edge)}
          onPointerMove={handleEdgeResizeMove}
          onPointerUp={handleEdgeResizeEnd}
          data-testid={`resize-${edge}-${win.appId}`}
        />
      ))}

      {!win.maximized && (
        <div className="absolute bottom-1 right-1.5 pointer-events-none z-10">
          <svg width="12" height="12" viewBox="0 0 12 12" className="text-white/20">
            <path d="M11 11L11 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
            <path d="M11 11L6 11" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </div>
      )}
    </div>
  );
}
